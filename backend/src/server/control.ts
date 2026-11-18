// Disconnect / Reconnect for a whole router (cut and restore its internet).
//
// The switch is the router's `disconnected` flag (saved with the router list; the
// Disconnect / Reconnect actions set it).
// It is enforced in two places:
//   1. On the router: the setup script puts three firewall rules named
//      "HotspotPro internet off" in the RAW table (disabled), and a scheduler
//      that every 30 seconds downloads /api/provision/<token>/control — a tiny
//      script that ENABLES those rules when the router is disconnected (and signs
//      everyone out), or DISABLES them when it is connected. That download is also
//      the router's "I'm alive" signal: if it stops, the router has lost its
//      internet or power, and the app shows that in red.
//   2. At login: while a router is disconnected, RADIUS refuses new logins from it.
//
// If the server can't be reached, the router keeps whatever state it had last.

import { SILENT_MS, beatOf, getState, setState, takeQueuedJobs, nasKeyOf, outageOf, recordBeat, usageSnapshot } from "./store";
import { routerForNas } from "./routerUsage";
import { accessDecision } from "./accessGate";
import { forgetLocalUsers, localUserLines } from "./localUsers";
import { noteLiveVouchers } from "./packages";
import { loginPageStamp } from "./hotspotPages";
import { CHECKIN_INTERVAL, SETUP_VERSION, accessGuardCommand, accessLockEnsureCommand, checkInBody, hotspotReauthEnsureLines, loginDnsFromName, remoteWinboxLines } from "./routeros";
import { primaryWanInterface } from "./primaryWan";
import { type IspLink, multiWanLines } from "./multiWan";
import { bridgeWifiLines, ensureHotspotServerLines, sealCaptivePortalLeakLines, ssidForRouter, wifiApplyLines } from "./wifiApply";
import { portalOrigin } from "./provision";

export const SWITCH_COMMENT = "HotspotPro internet off";
const ACCESS_LOCK = "HotspotPro access lock";
type Row = {
  ip: string;
  name: string;
  disconnected?: boolean;
  paused?: boolean;
  provisioningToken?: string;
  hotspotEnabled?: boolean;
  wanAddress?: string | null;
  wanInterface?: string;
  loginMode?: "cloud" | "local";
  remoteAccessEnabled?: boolean;
  remoteAccessHold?: boolean;
  adminFromWan?: boolean;
  dnsName?: string;
  hotspotDnsServers?: string;
  multiWanMode?: string;
  ispLinks?: IspLink[];
  managementPort?: string;
  siteId?: string | null;
  provisioningStatus?: string;
};

function managementLines(token: string): string[] {
  const value = getState("routers")?.value;
  if (!Array.isArray(value)) return [];
  const row = (value as Record<string, unknown>[]).find((item) => item?.provisioningToken === token);
  if (!row) return [];
  let password = typeof row.apiPassword === "string" && /^[A-Za-z0-9]{12,32}$/.test(row.apiPassword) ? row.apiPassword : "";
  if (!password) {
    const alphabet = "ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz23456789";
    password = "";
    for (let i = 0; i < 16; i++) password += alphabet[Math.floor(Math.random() * alphabet.length)];
    row.apiUsername = "hotspotpro";
    row.apiPassword = password;
    row.port = 8728;
    setState("routers", value, "router");
  }
  return [
    `:do { :if ([:len [/user find where name=hotspotpro]] = 0) do={ /user add name=hotspotpro group=full password="${password}" comment="HotspotPro" } } on-error={ }`,
    `:do { /ip service set api port=8728 available-from=192.168.88.0/24 disabled=no } on-error={ }`,
  ];
}

function hotspotLines(router: Row): string[] {
  if (router.hotspotEnabled === false) {
    return [`:do { /ip hotspot disable [find where name=hotspotpro] } on-error={ }`];
  }
  const name = loginDnsFromName(router.name, router.dnsName);
  const lines = [
    // If Servers is empty, create hotspotpro here — enable alone does nothing.
    ...ensureHotspotServerLines(name),
    // Bypass bindings skip the voucher page — keep them cleared.
    `:do { /ip hotspot ip-binding remove [find where type=bypassed] } on-error={ }`,
    // html-directory must match where HotspotPro login.html lives, or phones get MikroTik's default page.
    `:do { :local hpDir "hotspot"; :if ([:len [/file find where name="flash/hotspot/login.html"]] > 0) do={ :set hpDir "flash/hotspot" }; /ip hotspot profile set [find where name=hotspotpro] html-directory=$hpDir; :do { /ip hotspot profile set [find where name=hotspotpro] html-directory-override=$hpDir } on-error={ } } on-error={ }`,
    // Only HotspotPro's server should answer — a leftover factory hotspot serves MikroTik HTML.
    `:do { /ip hotspot disable [find where name!="hotspotpro"] } on-error={ }`,
    `:do { /ip hotspot enable [find where name=hotspotpro] } on-error={ }`,
    // A phone that uses 8.8.8.8 never hits the login page. Keep every customer DNS query on this router.
    `:do { :local a ""; :do { :set a [/ip address get [find where interface=hotspotpro-bridge comment="HotspotPro"] address] } on-error={ }; :if ([:len $a] > 0) do={ :local g [:pick $a 0 [:find $a "/"]]; /ip dhcp-server network set [find where comment="HotspotPro"] dns-server=$g gateway=$g } } on-error={ }`,
    // Close factory NAT / DHCP / IPv6 leaks and keep DNS hijack + hotspot on our bridge.
    ...sealCaptivePortalLeakLines(),
    // Radios must sit on hotspotpro-bridge every check-in (wifi / wifiwave2 / wireless).
    ...bridgeWifiLines(),
  ];
  if (/^[a-z0-9][a-z0-9.-]{0,48}$/.test(name)) {
    lines.push(`:do { /ip hotspot profile set [find where name=hotspotpro] dns-name="${name}" } on-error={ }`);
    lines.push(`:do { :local a ""; :do { :set a [/ip address get [find where interface=hotspotpro-bridge comment="HotspotPro"] address] } on-error={ }; :if ([:len $a] > 0) do={ :local g [:pick $a 0 [:find $a "/"]]; /ip dns static remove [find where comment="HotspotPro login"]; /ip dns static add name="${name}" address=$g comment="HotspotPro login" } } on-error={ }`);
  }
  const dns = (router.hotspotDnsServers || "").replace(/\s/g, "");
  if (/^(?:\d{1,3}\.){3}\d{1,3}(?:,(?:\d{1,3}\.){3}\d{1,3}){0,2}$/.test(dns)) {
    lines.push(`:do { /ip dns set allow-remote-requests=yes servers=${dns} } on-error={ }`);
  }
  return lines;
}

function rows(): Row[] {
  const value = getState("routers")?.value;
  return Array.isArray(value) ? (value as Row[]).filter((r) => r && typeof r.ip === "string") : [];
}

export function routerByToken(token: string): Row | null {
  return rows().find((r) => r.provisioningToken === token) ?? null;
}

/** The router (if any) that a RADIUS packet came from, when that router has been disconnected. */
export function switchedOffRouter(source: string, identifier: string | undefined, nasIp: string | undefined): Row | null {
  const list = rows();
  const { nasLinks } = usageSnapshot();
  const ip = routerForNas(nasKeyOf(source, identifier), { source, identifier, ip: nasIp, lastSeen: "" }, nasLinks, list);
  const router = ip ? list.find((r) => r.ip === ip) : undefined;
  return router?.disconnected ? router : null;
}

const oneLine = (s: string) => s.replace(/[\r\n]/g, " ").replace(/[\\"$]/g, "");

function pageFetch(origin: string, token: string, page: string, file: string) {
  const tls = origin.startsWith("https://") ? " check-certificate=no" : "";
  // A file left by reset-html is MikroTik's own page. Fetch will not overwrite it.
  return `:do { /file remove [find where name="${file}"] } on-error={ }; :do { /tool fetch url="${origin}/api/provision/${token}/${page}" dst-path=${file}${tls} } on-error={ }`;
}

/** What a router downloads every 30 seconds. null = unknown token. */
export function controlScript(token: string, origin?: string): string | null {
  const router = routerByToken(token);
  if (!router) return null;
  recordBeat(token);
  const off = !!router.disconnected;
  const paused = !!router.paused && !off;
  const access = accessDecision();
  // With no RADIUS server, vouchers have to live on the router or a paid login can never get online.
  const local = router.loginMode !== "cloud" || process.env.HOTSPOTPRO_RADIUS === "off";
  const lines = [
    `# HotspotPro: ${oneLine(router.name)} is ${off ? "DISCONNECTED (internet cut)" : "CONNECTED"}`,
    `# HotspotPro access: ${access.locked ? "locked" : "open"}`,
    `# HotspotPro login: ${router.loginMode === "cloud" ? "cloud" : "local"}`,
    `:do { /ip firewall raw ${off ? "enable" : "disable"} [find where comment="${SWITCH_COMMENT}"] } on-error={ }`,
    `:do { :if ([:len [/ip firewall raw find where comment="HotspotPro paused"]] = 0) do={ /ip firewall raw add chain=prerouting in-interface=hotspotpro-bridge action=accept dst-address-type=local comment="HotspotPro paused" disabled=yes; /ip firewall raw add chain=prerouting in-interface=hotspotpro-bridge action=accept dst-address-type=broadcast comment="HotspotPro paused" disabled=yes; /ip firewall raw add chain=prerouting in-interface=hotspotpro-bridge action=drop comment="HotspotPro paused" disabled=yes } } on-error={ }`,
    `:do { /ip firewall raw ${paused ? "enable" : "disable"} [find where comment="HotspotPro paused"] } on-error={ }`,
    // Plant the lock rules and the offline timer, including on routers set up before this existed.
    `:do { ${accessLockEnsureCommand()} } on-error={ }`,
    `:do { ${accessGuardCommand()} } on-error={ }`,
  ];
  // Sign everyone out so their sessions end properly (and their usage is recorded) instead of hanging on.
  if (off) lines.push(`:do { /ip hotspot active remove [find] } on-error={ }`);
  if (access.locked) {
    // Paid period and grace are over. Cut customer traffic and show the locked page instead of the portal.
    lines.push(
      `:global hpMiss 72`,
      `:do { /ip firewall raw enable [find where comment="${ACCESS_LOCK}"] } on-error={ }`,
      `:do { /ip hotspot active remove [find] } on-error={ }`,
    );
    if (origin) {
      lines.push(
        `:global hpLockState`,
        `:if ($hpLockState != "locked") do={ ${pageFetch(origin, token, "locked.html", "hotspot/login.html")}; ${pageFetch(origin, token, "locked.html", "flash/hotspot/login.html")}; :set hpLockState "locked" }`,
      );
    }
  } else {
    lines.push(
      `:global hpMiss 0`,
      `:do { /ip firewall raw disable [find where comment="${ACCESS_LOCK}"] } on-error={ }`,
      // No open free session. The chosen mode is the only way a voucher gets online.
      // http-pap first so a plain form still works; http-chap works when the login page sends CHAP MD5.
      // http-pap must stay on: the HotspotPro web portal POSTs plaintext username/password to /login.
      `:do { /ip hotspot profile set [find where name=hotspotpro] login-by=http-pap,mac-cookie trial-uptime-limit=0s use-radius=${local ? "no" : "yes"} } on-error={ }`,
      ...hotspotReauthEnsureLines(),
      `:do { /ip hotspot user profile set [find where name=default] shared-users=1 session-timeout=0s idle-timeout=none keepalive-timeout=none mac-cookie-timeout=1d on-logout=hotspotpro-logout } on-error={ }`,
      `:do { /system clock set time-zone-name=Africa/Accra } on-error={ }`,
      `:do { :if ([:len [/ip firewall mangle find where comment="HotspotPro tethering"]] = 0) do={ /ip firewall mangle add chain=postrouting action=change-ttl new-ttl=set:1 passthrough=yes out-interface=hotspotpro-bridge comment="HotspotPro tethering" } } on-error={ }`,
    );
    if (origin) {
      const pages = ["login.html", "rlogin.html", "alogin.html", "error.html", "logout.html", "redirect.html", "status.html", "md5.js"];
      const fetches = [
        ...pages.flatMap((page) => [pageFetch(origin, token, page, `hotspot/${page}`), pageFetch(origin, token, page, `flash/hotspot/${page}`)]),
        pageFetch(origin, token, "hotspotpro.css", "hotspot/css/hotspotpro.css"),
        pageFetch(origin, token, "hotspotpro.css", "flash/hotspot/css/hotspotpro.css"),
      ].join("; ");
      lines.push(
        `:global hpLockState`,
        `:if ($hpLockState != "open") do={ ${pageFetch(origin, token, "login.html", "hotspot/login.html")}; ${pageFetch(origin, token, "login.html", "flash/hotspot/login.html")}; :set hpLockState "open" }`,
        // Never call reset-html — it prompts y/N. Detect HotspotPro pages by our marker (MikroTik defaults also have link-login-only).
        `:global hpPages; :local hpBody ""; :local hpRelogin ""; :do { :set hpBody [/file get [find where name="hotspot/login.html"] contents] } on-error={ }; :do { :set hpRelogin [/file get [find where name="hotspot/rlogin.html"] contents] } on-error={ }; :do { :if ([:typeof [:find $hpBody "HotspotPro portal"]] != "num") do={ :set hpBody [/file get [find where name="flash/hotspot/login.html"] contents] } } on-error={ }; :do { :if ([:typeof [:find $hpRelogin "HotspotPro portal"]] != "num") do={ :set hpRelogin [/file get [find where name="flash/hotspot/rlogin.html"] contents] } } on-error={ }; :if ($hpPages != "${loginPageStamp(token)}" || [:typeof [:find $hpBody "HotspotPro portal"]] != "num" || [:typeof [:find $hpRelogin "HotspotPro portal"]] != "num") do={ ${fetches}; :set hpBody ""; :set hpRelogin ""; :do { :set hpBody [/file get [find where name="hotspot/login.html"] contents] } on-error={ }; :do { :set hpRelogin [/file get [find where name="hotspot/rlogin.html"] contents] } on-error={ }; :do { :if ([:typeof [:find $hpBody "HotspotPro portal"]] != "num") do={ :set hpBody [/file get [find where name="flash/hotspot/login.html"] contents] } } on-error={ }; :do { :if ([:typeof [:find $hpRelogin "HotspotPro portal"]] != "num") do={ :set hpRelogin [/file get [find where name="flash/hotspot/rlogin.html"] contents] } } on-error={ }; :if ([:typeof [:find $hpBody "HotspotPro portal"]] = "num" && [:typeof [:find $hpRelogin "HotspotPro portal"]] = "num") do={ :set hpPages "${loginPageStamp(token)}" }; :local hpDir "hotspot"; :if ([:len [/file find where name="flash/hotspot/login.html"]] > 0) do={ :set hpDir "flash/hotspot" }; :do { /ip hotspot profile set [find where name=hotspotpro] html-directory=$hpDir } on-error={ }; :do { /ip hotspot profile set [find where name=hotspotpro] html-directory-override=$hpDir } on-error={ } }`,
      );
    }
    const wan = primaryWanInterface(router);
    lines.push(
      `:do { :if ([:len [/ip firewall nat find where comment="HotspotPro NAT"]] = 0) do={ /ip firewall nat add chain=srcnat out-interface=${wan} action=masquerade comment="HotspotPro NAT" } } on-error={ }`,
      `:do { /ip dns set allow-remote-requests=yes } on-error={ }`,
      `:do { /ip hotspot set [find where name=hotspotpro] addresses-per-mac=1 } on-error={ }`,
      ...hotspotLines(router),
      ...managementLines(token),
      ...remoteWinboxLines(router.remoteAccessHold !== true, origin ?? "", token, router.adminFromWan !== false, wan),
      ...multiWanLines(router.multiWanMode, router.ispLinks, router.managementPort || ""),
      ...wifiApplyLines(ssidForRouter(router)),
    );
    // Keep API + HotspotPro portal hosts reachable before login (phones open /portal directly).
    if (origin) {
      const hosts = new Set<string>();
      for (const value of [origin, portalOrigin(origin), process.env.HOTSPOTPRO_PUBLIC_URL || ""]) {
        try {
          const host = new URL(value).hostname;
          if (host && host !== "localhost" && !/^\d+\.\d+\.\d+\.\d+$/.test(host)) hosts.add(host);
        } catch {
          /* ignore */
        }
      }
      for (const host of hosts) {
        lines.push(
          `:do { :if ([:len [/ip hotspot walled-garden find where dst-host="${host}" comment="HotspotPro"]] = 0) do={ /ip hotspot walled-garden add dst-host="${host}" comment="HotspotPro" } } on-error={ }`,
        );
      }
    }
    if (local) lines.push(...localUserLines(token, router.ip));
    else {
      forgetLocalUsers(token);
      // Cloud mode: drop idle local copies only. Never remove a user who is online right now.
      lines.push(
        `:do { :foreach u in=[/ip hotspot user find where comment="HotspotPro"] do={ :local n [/ip hotspot user get $u name]; :if ([:len [/ip hotspot active find where user=$n]] = 0) do={ :do { /ip hotspot user remove $u } on-error={ } } } } on-error={ }`,
      );
    }
  }
  // Commands the owner queued on the site (Advanced). Each is downloaded and run once, and the router reports whether it worked.
  const queued = origin ? takeQueuedJobs(token) : [];
  if (origin) {
    const tls = origin.startsWith("https://") ? " check-certificate=no" : "";
    // When the setup version changes, every connected router downloads and runs the latest setup by itself.
    lines.push(
      `:global hpSetup; :global hpSetupBusy`,
      `:if ($hpSetup != "${SETUP_VERSION}" && $hpSetupBusy != "1") do={ :set hpSetupBusy "1"; :do { :put "HotspotPro: applying the latest setup (people online stay connected)..."; :do { /file remove [find where name=hotspotpro-setup.rsc] } on-error={ }; :do { /file remove [find where name="flash/hotspotpro-setup.rsc"] } on-error={ }; /tool fetch url="${origin}/api/provision/${token}?wireless=yes" dst-path=hotspotpro-setup.rsc${tls}; :do { :delay 2s } on-error={ }; :local hpFile "hotspotpro-setup.rsc"; :if ([:len [/file find where name=("flash/" . $hpFile)]] > 0) do={ :set hpFile ("flash/" . $hpFile) }; /import file-name=$hpFile; :set hpSetup "${SETUP_VERSION}"; :global hpWifiSsid; :set hpWifiSsid ""; :put "HotspotPro: router is updated." } on-error={ :put "HotspotPro: setup update will try again on the next check-in." }; :set hpSetupBusy "0" }`,
    );
    for (const job of queued) {
      const base = `${origin}/api/provision/${token}/job/${job.id}`;
      lines.push(
        `:do { :local hpOk 1; /tool fetch url="${base}" dst-path=hotspotpro-job.rsc${tls}; :delay 1s; :do { /import hotspotpro-job.rsc } on-error={ :set hpOk 0 }; /tool fetch url=("${base}/result?ok=" . $hpOk) keep-result=no${tls} } on-error={ }`,
      );
    }
  }
  // Lightweight check-ins for many routers on African links. Speed up briefly when a job was just delivered.
  const interval = queued.length > 0 ? "5s" : CHECKIN_INTERVAL;
  lines.push(`:do { /system scheduler set [find where name=hotspotpro-control] interval=${interval} } on-error={ }`);
  if (origin) {
    const source = checkInBody(origin, token).replace(/\\/g, "\\\\").replace(/"/g, '\\"').replace(/\$/g, "\\$");
    // Rewrite the on-router check-in script only when the setup version changes (not every poll).
    lines.push(
      `:global hpCtlVer`,
      `:if ($hpCtlVer != "${SETUP_VERSION}") do={ :do { /system script set [find where name=hotspotpro-control] source="${source}" } on-error={ }; :set hpCtlVer "${SETUP_VERSION}" }`,
    );
  }
  return lines.join("\n") + "\n";
}

function ipv4(value: string | null | undefined) {
  return value && /^(?:25[0-5]|2[0-4]\d|1?\d?\d)(?:\.(?:25[0-5]|2[0-4]\d|1?\d?\d)){3}$/.test(value) ? value : "";
}

function isPrivate(ip: string) {
  const [a, b] = ip.split(".").map(Number);
  if (a === 10 || a === 127) return true;
  if (a === 192 && b === 168) return true;
  if (a === 172 && b >= 16 && b <= 31) return true;
  if (a === 100 && b >= 64 && b <= 127) return true;
  return false;
}

/** Save the CPU, memory and uptime the router just reported, and where WinBox can be reached. */
function hourKey(ms: number) {
  return new Date(ms).toISOString().slice(0, 13);
}

function uptimePercent(hours: string[], days: number, nowMs: number) {
  if (!hours.length) return null;
  const start = nowMs - days * 86400000;
  const seen = hours.filter((hour) => {
    const at = Date.parse(`${hour}:00:00.000Z`);
    return Number.isFinite(at) && at >= start;
  });
  const first = Date.parse(`${hours[0]}:00:00.000Z`);
  const windowStart = Math.max(start, Number.isFinite(first) ? first : nowMs);
  const possible = Math.max(1, Math.round((nowMs - windowStart) / 3600000));
  return Math.max(0, Math.min(100, Math.round((100 * new Set(seen).size) / possible)));
}

export function recordRouterStats(token: string, stats: { cpu: number | null; memory: number | null; uptime?: string | null; version?: string | null; architecture?: string | null; cpuCount?: string | null; board?: string | null; identity?: string | null; channel?: string | null; clients?: number | null; users?: string[] | null; dns?: string | null; pub?: string | null; wan?: string | null }) {
  if (stats.users?.length) noteLiveVouchers(stats.users);
  const value = getState("routers")?.value;
  if (!Array.isArray(value)) return;
  let changed = false;
  const next = (value as Record<string, unknown>[]).map((row) => {
    if (!row || row.provisioningToken !== token) return row;
    changed = true;
    const nowMs = Date.now();
    const checked = new Date(nowMs).toLocaleString("en-GB", { day: "2-digit", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit", second: "2-digit" });
    const updated: Record<string, unknown> = { ...row, lastSeen: "Just now", lastConnectedAt: checked, status: "Online", health: "ok" };
    if (stats.cpu !== null) updated.cpu = stats.cpu;
    if (stats.memory !== null) updated.memory = stats.memory;
    if (stats.uptime) updated.uptime = stats.uptime;
    if (stats.version) updated.routerOSVersion = stats.channel ? `${stats.version} (${stats.channel})` : stats.version;
    if (stats.architecture) updated.architecture = stats.architecture;
    if (stats.cpuCount) updated.cpuCount = stats.cpuCount;
    if (stats.board) updated.hardwareModel = stats.board;
    if (stats.identity) updated.name = stats.identity;
    if (stats.wan) updated.wanAddress = stats.wan;
    const seen = Array.isArray(row.seenHours) ? row.seenHours.filter((hour): hour is string => typeof hour === "string") : [];
    const hour = hourKey(nowMs);
    const seenHours = [...new Set([...seen, hour])].filter((item) => Date.parse(`${item}:00:00.000Z`) >= nowMs - 31 * 86400000).slice(-800);
    updated.seenHours = seenHours;
    updated.uptime7Day = uptimePercent(seenHours, 7, nowMs);
    updated.uptime30Day = uptimePercent(seenHours, 30, nowMs);
    if (stats.clients !== null && stats.clients !== undefined) updated.clients = stats.clients;
    if (stats.users) updated.liveUsers = stats.users;
    const remoteOn = row.remoteAccessHold !== true;
    if (!remoteOn) {
      updated.winboxAddress = "192.168.88.1";
      updated.winboxReach = "lan";
      updated.wireguardConfig = null;
      updated.wireguardTunnelIp = null;
      updated.remoteAccessEnabled = false;
    } else {
      updated.remoteAccessEnabled = true;
      const wanIp = ipv4(stats.wan);
      const name = stats.dns && /^[A-Za-z0-9.-]{1,80}$/.test(stats.dns) ? stats.dns : "";
      if (wanIp && !isPrivate(wanIp)) {
        updated.winboxReach = "direct";
        updated.winboxAddress = `${name || wanIp}:8291`;
      } else if (wanIp || name || ipv4(stats.pub)) {
        updated.winboxReach = "relay";
        updated.winboxAddress = "192.168.216.1";
      } else if (!row.winboxAddress) updated.winboxAddress = "192.168.88.1";
    }
    return updated;
  });
  if (changed) setState("routers", next, "router");
}

/** The router posts its Back to Home WireGuard file once remote access is on. */
export function saveWireguardConfig(token: string, body: string) {
  const text = body.replace(/\0/g, "").trim();
  if (text.length < 20 || text.length > 8000 || !text.includes("[Interface]") || !text.includes("PrivateKey")) return false;
  const value = getState("routers")?.value;
  if (!Array.isArray(value)) return false;
  let changed = false;
  const next = (value as Record<string, unknown>[]).map((row) => {
    if (!row || row.provisioningToken !== token || row.remoteAccessHold === true) return row;
    changed = true;
    return { ...row, wireguardConfig: text, wireguardTunnelIp: "192.168.216.1" };
  });
  if (changed) setState("routers", next, "router");
  return changed;
}

export type ControlStatus = {
  disconnected: boolean;
  hasToken: boolean;
  hotspot: boolean;
  lastCheckInAt: string | null;
  /** The router is asking for instructions, so it will follow Disconnect / Reconnect. */
  enforced: boolean;
  /** It used to ask every 30 s and has now been quiet for 2+ minutes: it lost its internet or power. */
  lostSignal: boolean;
  /** The last time it went quiet and then came back. */
  outage: { from: string; to: string } | null;
  setupPath: string | null;
};

export function controlStatus(routerIp: string, list: Row[] = rows()): ControlStatus | null {
  const router = list.find((r) => r.ip === routerIp);
  if (!router) return null;
  const token = router.provisioningToken ?? null;
  const last = token ? beatOf(token) : null;
  const quietFor = last ? Date.now() - Date.parse(last) : null;
  // Provisioned but never checked in counts as offline for the dashboard.
  const neverHeard = !!token && !last && router.provisioningStatus === "Provisioned";
  return {
    disconnected: !!router.disconnected,
    hasToken: !!token,
    hotspot: router.hotspotEnabled !== false,
    lastCheckInAt: last,
    enforced: quietFor !== null && quietFor < SILENT_MS,
    lostSignal: neverHeard || (quietFor !== null && quietFor >= SILENT_MS),
    outage: token ? outageOf(token) : null,
    setupPath: token ? `/api/provision/${token}/control-setup` : null,
  };
}

/**
 * When a router stops asking for instructions (power/internet gone), mark it Offline
 * on the saved router row so every status badge shows Offline — not stuck on Online.
 * Admin Disconnect already sets Offline; check-in sets Online again when contact returns.
 */
export function syncRouterPresenceFromBeats(): void {
  const value = getState("routers")?.value;
  if (!Array.isArray(value)) return;
  let changed = false;
  const now = Date.now();
  const next = (value as Record<string, unknown>[]).map((row) => {
    if (!row || typeof row.provisioningToken !== "string" || !row.provisioningToken) return row;
    if (row.disconnected === true) {
      // Admin cut internet — stay Offline even while the router still checks in.
      if (row.status !== "Offline") {
        changed = true;
        return { ...row, status: "Offline", health: "offline" };
      }
      return row;
    }
    const last = beatOf(row.provisioningToken);
    const provisioned = row.provisioningStatus === "Provisioned";
    if (!last) {
      if (provisioned && row.status === "Online") {
        changed = true;
        return { ...row, status: "Offline", health: "offline", lastSeen: "No contact yet" };
      }
      return row;
    }
    const quiet = now - Date.parse(last);
    if (!Number.isFinite(quiet)) return row;
    if (quiet >= SILENT_MS) {
      const minutes = Math.max(1, Math.round(quiet / 60000));
      const lastSeen = `Offline · no contact for ${minutes}m`;
      if (row.status !== "Offline" || row.health !== "offline" || row.lastSeen !== lastSeen) {
        changed = true;
        return { ...row, status: "Offline", health: "offline", lastSeen };
      }
      return row;
    }
    // In contact again — restore Online unless something else already did.
    if (row.status === "Offline" && row.health === "offline") {
      changed = true;
      return { ...row, status: "Online", health: "ok", lastSeen: "Just now" };
    }
    return row;
  });
  if (changed) setState("routers", next, "router");
}

/** Every router at once, keyed by ip (the lists poll this). */
export function allControlStatus(): Record<string, ControlStatus> {
  syncRouterPresenceFromBeats();
  const list = rows();
  const out: Record<string, ControlStatus> = {};
  for (const r of list) {
    const status = controlStatus(r.ip, list);
    if (status) out[r.ip] = status;
  }
  return out;
}
