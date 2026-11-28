// Disconnect / Reconnect for a whole router (cut and restore its internet).
//
// The switch is the router's `disconnected` flag (saved with the router list; the
// Disconnect / Reconnect actions set it).
// It is enforced in two places:
//   1. On the router: the setup script puts three firewall rules named
//      "HotspotPro internet off" in the RAW table (disabled), and a scheduler
//      that every ~10 seconds downloads /api/provision/<token>/control — a tiny
//      script that ENABLES those rules when the router is disconnected (and signs
//      everyone out), or DISABLES them when it is connected. That download is also
//      the router's "I'm alive" signal: if it stops, the router has lost its
//      internet or power, and the app shows that in red.
//   2. At login: while a router is disconnected, RADIUS refuses new logins from it.
//
// If the server can't be reached, the router keeps whatever state it had last.

import { walledGardenHostLine } from "./hotspotEnsure";
import { SILENT_MS, beatOf, getState, setState, takeQueuedJobs, nasKeyOf, outageOf, recordBeat, usageSnapshot } from "./store";
import { routerForNas } from "./routerUsage";
import { accessDecision } from "./accessGate";
import { forgetLocalUsers, localUserLines, packageProfileLines, portalPushCodes, portalPushLines } from "./localUsers";
import { findPackageByName, findVoucher, list, noteLiveVouchers, packageSeconds } from "./packages";
import { applyHtmlDirectoryRos, stampComment } from "./hotspotPages";
import { autoLoginFetchLines, latestTicketForToken } from "./portalLogin";
import { CHECKIN_INTERVAL, SETUP_MARK, SETUP_VERSION, guardOptionalMenus, setupVersionMarkLines, accessGuardCommand, accessLockEnsureCommand, checkInBody, dnsNameApplyLines, hotspotReauthEnsureLines, loginDnsFromName, remoteWinboxLines } from "./routeros";
import { primaryWanInterface } from "./primaryWan";
import { type IspLink, multiWanLines } from "./multiWan";
import { bridgeWifiLines, ensureHotspotServerLines, ensureWifiOnHotspotBridgeLines, freeWifiEnsureLines, openSystemCaptivePortalLines, sealCaptivePortalLeakLines, ssidForRouter, wifiApplyLines } from "./wifiApply";
import { portalOrigin } from "./provision";
import { radiusCloudEnabled, radiusPorts, radiusPublicHost, radiusSecret } from "./radius";
import { winboxRelayAddress } from "./winboxRelay";

export const SWITCH_COMMENT = "HotspotPro internet off";
const ACCESS_LOCK = "HotspotPro access lock";
type Row = {
  ip: string;
  name: string;
  disconnected?: boolean;
  paused?: boolean;
  provisioningToken?: string;
  hotspotEnabled?: boolean;
  /** Everyone on the hotspot bridge gets internet without a voucher. */
  freeWifiEnabled?: boolean;
  /** Epoch ms when free WiFi auto-turns off (optional timed free). */
  freeWifiUntilMs?: number | null;
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

function freeWifiActive(router: Row, now = Date.now()): boolean {
  if (!router.freeWifiEnabled) return false;
  if (typeof router.freeWifiUntilMs === "number" && router.freeWifiUntilMs > 0 && now >= router.freeWifiUntilMs) {
    return false;
  }
  return true;
}

/** Expire timed free WiFi on the saved router row when the clock runs out. */
function expireFreeWifiIfNeeded(token: string, router: Row, now = Date.now()) {
  if (!router.freeWifiEnabled) return router;
  if (typeof router.freeWifiUntilMs !== "number" || router.freeWifiUntilMs <= 0 || now < router.freeWifiUntilMs) {
    return router;
  }
  const value = getState("routers")?.value;
  if (!Array.isArray(value)) return { ...router, freeWifiEnabled: false, freeWifiUntilMs: null };
  let nextRow = router;
  const next = (value as Row[]).map((row) => {
    if (!row || row.provisioningToken !== token) return row;
    nextRow = { ...row, freeWifiEnabled: false, freeWifiUntilMs: null };
    return nextRow;
  });
  setState("routers", next, "router");
  return nextRow;
}

function hotspotLines(router: Row, freeWifi = false): string[] {
  if (router.hotspotEnabled === false) {
    return [`:do { /ip hotspot disable [find where name=hotspotpro] } on-error={ }`];
  }
  const free = freeWifi;
  const name = loginDnsFromName(router.name, router.dnsName);
  const lines = [
    // If Servers is empty, create hotspotpro here — enable alone does nothing.
    ...ensureHotspotServerLines(name),
    // Bypass bindings skip the voucher page — clear them unless Free WiFi mode is on.
    free
      ? `:do { /ip hotspot ip-binding remove [find where type=bypassed && comment!="HotspotPro free wifi"] } on-error={ }`
      : `:do { /ip hotspot ip-binding remove [find where type=bypassed] } on-error={ }`,
    // html-directory must match where HotspotPro login.html lives, or phones get MikroTik's default page.
    `:do { ${applyHtmlDirectoryRos()} } on-error={ }`,
    // applyHtmlDirectoryRos already disables non-hotspotpro servers and enables hotspotpro.
    // A phone that uses 8.8.8.8 never hits the login page. Keep every customer DNS query on this router.
    `:do { :local a ""; :do { :set a [/ip address get [find where interface=hotspotpro-bridge comment="HotspotPro"] address] } on-error={ }; :if ([:len $a] > 0) do={ :local g [:pick $a 0 [:find $a "/"]]; /ip dhcp-server network set [find where comment="HotspotPro"] dns-server=$g gateway=$g } } on-error={ }`,
    // Close factory NAT / DHCP / IPv6 leaks and keep DNS hijack + hotspot on our bridge.
    ...sealCaptivePortalLeakLines(),
    // OS probes must hit Hotspot so Android/iOS/Windows open the system captive sheet.
    ...openSystemCaptivePortalLines({ keepFreeWifi: free }),
    // Full radio re-bind once per setup version, then a cheap every-check-in verify
    // (phones otherwise join Wi‑Fi with free internet / no captive portal).
    `:global hpBridged`,
    `:if ($hpBridged != "${SETUP_VERSION}") do={ ${bridgeWifiLines().join("; ")}; :set hpBridged "${SETUP_VERSION}" }`,
    ...ensureWifiOnHotspotBridgeLines(),
    // Free WiFi for all APs/ports on hotspotpro-bridge (or restore voucher mode).
    // Ensure-only: the Free WiFi Off button job is what signs people out, never the check-in.
    ...freeWifiEnsureLines(free),
  ];
  if (/^[a-z0-9][a-z0-9.-]{0,48}$/.test(name)) {
    lines.push(...dnsNameApplyLines(router.name, router.dnsName));
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

/** Set /system identity to the dashboard name, only when it differs. */
function identityLines(name: string): string[] {
  const clean = oneLine(name || "").trim().slice(0, 64);
  if (!clean) return [];
  return [`:do { :if ([/system identity get name] != "${clean}") do={ /system identity set name="${clean}" } } on-error={ }`];
}

function pageFetch(origin: string, token: string, page: string, file: string) {
  const tls = origin.startsWith("https://") ? " check-certificate=no" : "";
  // A file left by reset-html is MikroTik's own page. Fetch will not overwrite it.
  return `:do { /file remove [find where name="${file}"] } on-error={ }; :do { /tool fetch url="${origin}/api/provision/${token}/${page}" dst-path=${file}${tls} } on-error={ }`;
}

const PORTAL_FILES = ["login.html", "rlogin.html", "alogin.html", "error.html", "logout.html", "redirect.html", "status.html", "md5.js", "hotspotpro.css"];

/**
 * Keep HotspotPro's portal pages on the router without ever leaving a gap.
 * - Up to date = login.html AND rlogin.html carry this version's stamp (it is inside the file, so it
 *   survives reboots — the old global-variable stamp was lost on every power cut and made the router
 *   wipe and re-download all pages, serving MikroTik's default page meanwhile).
 * - Out of date: download over the old files first (no delete, so the portal never disappears);
 *   only if that did not take, delete and download again.
 */
function portalPagesLines(origin: string, token: string): string[] {
  const tls = origin.startsWith("https://") ? " check-certificate=no" : "";
  const stamp = stampComment(token);
  const fetchAll = (removeFirst: boolean) =>
    PORTAL_FILES.flatMap((page) =>
      ["hotspot", "flash/hotspot"].map((dir) => {
        const file = page === "hotspotpro.css" ? `${dir}/css/${page}` : `${dir}/${page}`;
        const fetch = `:do { /tool fetch url="${origin}/api/provision/${token}/${page}" dst-path="${file}"${tls} } on-error={ }`;
        return removeFirst ? `:do { /file remove [find where name="${file}"] } on-error={ }; ${fetch}` : fetch;
      }),
    ).join("; ");
  const read = (name: string, file: string) => `:set ${name} ""; :do { :set ${name} [/file get [find where name="${file}"] contents] } on-error={ }`;
  const check = [
    read("hpA", "hotspot/login.html"),
    read("hpB", "hotspot/rlogin.html"),
    read("hpC", "flash/hotspot/login.html"),
    read("hpD", "flash/hotspot/rlogin.html"),
    `:set hpOk false`,
    `:local hpHot false; :local hpFl false; :local hpFlashHas false`,
    `:if ([:typeof [:find $hpA $hpSt]] = "num" && [:typeof [:find $hpB $hpSt]] = "num") do={ :set hpHot true }`,
    `:if ([:typeof [:find $hpC $hpSt]] = "num" && [:typeof [:find $hpD $hpSt]] = "num") do={ :set hpFl true }`,
    `:if ([:len [/file find where name="flash/hotspot/login.html"]] > 0) do={ :set hpFlashHas true }`,
    // A factory login.html left in flash would win, so flash must be ours too when it exists.
    `:if (($hpHot || $hpFl) && (!$hpFlashHas || $hpFl)) do={ :set hpOk true }`,
  ].join("; ");
  return [
    `:global hpLockState; :set hpLockState "open"`,
    `:do { :local hpSt "${stamp}"; :local hpOk false; :local hpA ""; :local hpB ""; :local hpC ""; :local hpD ""; :do { ${check} } on-error={ }; :if (!$hpOk) do={ :put "HotspotPro: updating the portal pages"; ${fetchAll(false)}; :delay 1s; :do { ${check} } on-error={ }; :if (!$hpOk) do={ ${fetchAll(true)}; :delay 1s }; ${applyHtmlDirectoryRos()} } } on-error={ :log warning "HotspotPro: portal page check failed" }`,
  ];
}

/** What a router downloads every 30 seconds. null = unknown token. */
export function controlScript(token: string, origin?: string): string | null {
  let router = routerByToken(token);
  if (!router) return null;
  recordBeat(token);
  router = expireFreeWifiIfNeeded(token, router);
  const off = !!router.disconnected;
  const paused = !!router.paused && !off;
  const free = freeWifiActive(router) && !off && !paused;
  const access = accessDecision();
  // MikroTik RADIUS docs (help.mikrotik.com …/RADIUS + HotSpot captive portal):
  //   1) Local /ip hotspot user is checked FIRST.
  //   2) RADIUS is consulted only when no local user matches.
  //   3) use-radius=yes + /radius service=hotspot for cloud AAA / accounting.
  // So the solid path is ALWAYS sync User Profiles + local voucher users, and ALSO
  // point /radius at HotspotPro when loginMode=cloud and RADIUS is enabled.
  if (router.loginMode === "cloud" && !radiusCloudEnabled()) {
    const value = getState("routers")?.value;
    if (Array.isArray(value)) {
      const row = (value as Row[]).find((r) => r.provisioningToken === token);
      if (row && row.loginMode !== "local") {
        row.loginMode = "local";
        setState("routers", value, "router");
        forgetLocalUsers(token);
      }
    }
  }
  const useRadius = radiusCloudEnabled() && router.loginMode === "cloud";
  const lines = [
    `# HotspotPro: ${oneLine(router.name)} is ${off ? "DISCONNECTED (internet cut)" : "CONNECTED"}`,
    `# HotspotPro access: ${access.locked ? "locked" : "open"}`,
    `# HotspotPro free wifi: ${free ? "ON" : "off"}`,
    `# HotspotPro login: ${useRadius ? "cloud+local (MikroTik local-first then RADIUS)" : "local"}`,
    `:do { /ip firewall raw ${off ? "enable" : "disable"} [find where comment="${SWITCH_COMMENT}"] } on-error={ }`,
    // Dashboard rename → router identity (also the RADIUS NAS-Identifier, matched by name).
    ...identityLines(router.name),
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
      // http-pap is required for site-portal Connect (plain password). Keep http-chap too so
      // hp-go.html can CHAP-hash when the profile still advertises a challenge.
      // use-radius + accounting per MikroTik HotSpot docs. interim=received so Acct-Interim-Interval from Access-Accept is used.
      `:do { /ip hotspot profile set [find where name=hotspotpro] trial-uptime-limit=0s use-radius=${useRadius ? "yes" : "no"}${useRadius ? " radius-accounting=yes radius-interim-update=received" : ""} } on-error={ }`,
      // Login By + DNS Name alone every check-in (WinBox Server Profiles).
      ...dnsNameApplyLines(router.name, router.dnsName),
      ...(useRadius ? cloudRadiusEnsureLines(origin) : []),
      ...hotspotReauthEnsureLines(),
      `:do { /ip hotspot user profile set [find where name=default] shared-users=1 session-timeout=0s idle-timeout=none keepalive-timeout=none mac-cookie-timeout=1d } on-error={ }`,
      `:do { /ip hotspot user profile set [find where name=default] on-logout=hotspotpro-logout } on-error={ }`,
      `:do { /system clock set time-zone-name=Africa/Accra } on-error={ }`,
      `:do { :if ([:len [/ip firewall mangle find where comment="HotspotPro tethering"]] = 0) do={ /ip firewall mangle add chain=postrouting action=change-ttl new-ttl=set:1 passthrough=yes out-interface=hotspotpro-bridge comment="HotspotPro tethering" } } on-error={ }`,
    );
    // Portal pages: only re-download when the router's copy is missing or out of date (see portalPagesLines).
    if (origin) lines.push(...portalPagesLines(origin, token));
    const wan = primaryWanInterface(router);
    lines.push(
      `:do { :if ([:len [/ip firewall nat find where comment="HotspotPro NAT"]] = 0) do={ /ip firewall nat add chain=srcnat out-interface=${wan} action=masquerade comment="HotspotPro NAT" } } on-error={ }`,
      `:do { /ip dns set allow-remote-requests=yes } on-error={ }`,
      `:do { /ip hotspot set [find where name=hotspotpro] addresses-per-mac=1 } on-error={ }`,
      ...hotspotLines(router, free),
      ...managementLines(token),
      ...remoteWinboxLines(router.remoteAccessHold !== true, origin ?? "", token, router.adminFromWan !== false, wan),
      ...multiWanLines(router.multiWanMode, router.ispLinks, router.managementPort || ""),
      ...wifiApplyLines(ssidForRouter(router)),
      // Last word on radius after hotspot/wifi ensure (create-only defaults to no).
      `:do { /ip hotspot profile set [find where name=hotspotpro] use-radius=${useRadius ? "yes" : "no"}${useRadius ? " radius-accounting=yes radius-interim-update=received" : ""} } on-error={ }`,
    );
    // Packages → User Profiles EARLY — before heavy page fetches — so a mid-script failure
    // cannot leave WinBox with only the default profile.
    lines.push(...packageProfileLines(router.ip));
    // Keep API + HotspotPro portal hosts reachable before login (phones open /portal directly).
    if (origin) {
      const hosts = new Set<string>();
      for (const value of [origin, portalOrigin(origin), process.env.HOTSPOTPRO_PUBLIC_URL || "", process.env.HOTSPOTPRO_PORTAL_URL || "", process.env.HOTSPOTPRO_SITE_URL || "", "https://hotspotpro-mu.vercel.app"]) {
        try {
          const host = new URL(value).hostname;
          if (host && host !== "localhost" && !/^\d+\.\d+\.\d+\.\d+$/.test(host)) hosts.add(host);
        } catch {
          /* ignore */
        }
      }
      for (const host of hosts) {
        lines.push(
          walledGardenHostLine(host),
        );
      }
    }
    // Portal Connect upsert (local user + soft hp-go).
    lines.push(...portalPushLines(token, router.ip, origin));
    // MikroTik local-first: ALWAYS keep voucher users on the router. RADIUS is the fallback
    // when a code is not in /ip hotspot user yet (docs: RADIUS consulted only if no local match).
    const resync = (getState("routerResync")?.value as Record<string, string> | undefined) ?? {};
    if (resync[token] !== SETUP_VERSION) {
      forgetLocalUsers(token);
      setState("routerResync", { ...resync, [token]: SETUP_VERSION }, "server");
    }
    lines.push(...localUserLines(token, router.ip));
    if (useRadius) {
      const ticket = latestTicketForToken(token);
      if (origin && ticket) lines.push(...autoLoginFetchLines(origin, token, ticket.id, false));
      noteCloudRadiusOnRouter(token, origin);
    }
  }
  // Commands the owner queued on the site (Advanced). Each is downloaded and run once, and the router reports whether it worked.
  const queued = origin ? takeQueuedJobs(token) : [];
  const portalPending = portalPushCodes(token).length > 0 || !!latestTicketForToken(token);
  if (origin) {
    const tls = origin.startsWith("https://") ? " check-certificate=no" : "";
    // When the setup version changes, every connected router downloads and runs the latest setup by itself.
    // The version the router last completed is kept in a small stored script (SETUP_MARK), because
    // globals are wiped on reboot — the old global-only check re-ran the whole setup after every
    // power cut. A router that still has the current version in its global just gets the mark.
    // The setup is imported directly: `:execute script={/import file-name=$hpFile}` cannot see the
    // local $hpFile, so the old update imported nothing and still marked the router as updated.
    lines.push(
      `:global hpSetup; :global hpSetupBusy`,
      `:do { :local hpMark ""; :do { :set hpMark [/system script get [find where name=${SETUP_MARK}] source] } on-error={ }; :if ($hpMark != "${SETUP_VERSION}" && $hpSetup = "${SETUP_VERSION}") do={ ${setupVersionMarkLines().join("; ")}; :set hpMark "${SETUP_VERSION}" }; :if ($hpMark != "${SETUP_VERSION}" && $hpSetupBusy != "1") do={ :set hpSetupBusy "1"; :do { :put "HotspotPro: applying the latest setup (people online stay connected)..."; :do { /file remove [find where name=hotspotpro-setup.rsc] } on-error={ }; :do { /file remove [find where name="flash/hotspotpro-setup.rsc"] } on-error={ }; /tool fetch url="${origin}/api/provision/${token}?wireless=yes&ssid=${encodeURIComponent(ssidForRouter(router))}" dst-path=hotspotpro-setup.rsc${tls}; :delay 2s; :local hpFile "hotspotpro-setup.rsc"; :if ([:len [/file find where name=("flash/" . $hpFile)]] > 0) do={ :set hpFile ("flash/" . $hpFile) }; /import file-name=$hpFile; :set hpSetup "${SETUP_VERSION}"; :global hpWifiSsid; :set hpWifiSsid ""; :put "HotspotPro: router is updated." } on-error={ :put "HotspotPro: setup update will try again on the next check-in." }; :set hpSetupBusy "0" } } on-error={ :set hpSetupBusy "0" }`,
    );
    for (const job of queued) {
      const base = `${origin}/api/provision/${token}/job/${job.id}`;
      // Run the site command, capture :put/print output, upload it for Open in browser.
      // Always resolve flash/… — boards that only have flash store fetches there, and a bare
      // import name fails so packages/vouchers never land (job still looked "ok").
      // Do NOT put $vars inside :execute script={...} — that scope often does not see them.
      lines.push(
        `:do { :local hpOk 1; :do { /file remove [find where name=hotspotpro-job-body.rsc] } on-error={ }; :do { /file remove [find where name="flash/hotspotpro-job-body.rsc"] } on-error={ }; :do { /file remove [find where name=hotspotpro-job-out.txt] } on-error={ }; :do { /file remove [find where name="flash/hotspotpro-job-out.txt"] } on-error={ }; /tool fetch url="${base}" dst-path=hotspotpro-job-body.rsc${tls}; :delay 1s; :if ([:len [/file find where name="flash/hotspotpro-job-body.rsc"]] > 0) do={ :do { /import file-name=flash/hotspotpro-job-body.rsc } on-error={ :set hpOk 0 } } else={ :do { /import file-name=hotspotpro-job-body.rsc } on-error={ :set hpOk 0 } }; :do { /tool fetch url=("${base}/result?ok=" . $hpOk) src-path=hotspotpro-job-out.txt upload=yes http-method=post keep-result=no${tls} } on-error={ :do { /tool fetch url=("${base}/result?ok=" . $hpOk) src-path=flash/hotspotpro-job-out.txt upload=yes http-method=post keep-result=no${tls} } on-error={ /tool fetch url=("${base}/result?ok=" . $hpOk) keep-result=no${tls} } } } on-error={ }`,
      );
    }
  }
  // Speed up while a portal Connect push or site job is waiting.
  // Portal Connect needs the next check-in immediately so the voucher + hp-go.html land.
  // 3s, not 1s: the check-in is a ~50 KB script, and at 1s the runs overlapped on small boards.
  const interval = queued.length > 0 || portalPending ? "3s" : CHECKIN_INTERVAL;
  lines.push(`:do { /system scheduler set [find where name=hotspotpro-control] interval=${interval} } on-error={ }`);
  if (origin) {
    const source = checkInBody(origin, token).replace(/\\/g, "\\\\").replace(/"/g, '\\"').replace(/\$/g, "\\$");
    // Stamp includes API host so moving from Render → Fly rewrites the check-in URL
    // (status/CPU) without waiting for a manual paste when the router can still reach us.
    let originHost = "api";
    try {
      originHost = new URL(origin).host.replace(/[^A-Za-z0-9.-]/g, "") || "api";
    } catch {
      /* ignore */
    }
    const ctlStamp = `${SETUP_VERSION}@${originHost}`;
    lines.push(
      `:global hpCtlVer`,
      `:if ($hpCtlVer != "${ctlStamp}") do={ :do { /system script set [find where name=hotspotpro-control] source="${source}" } on-error={ }; :set hpCtlVer "${ctlStamp}" }`,
    );
  }
  // Any line still touching a menu this router may not have is parsed at run time, so it can no
  // longer stop the rest of the check-in (packages, vouchers, jobs) — see guardOptionalMenus.
  return guardOptionalMenus(lines.join("\n")) + "\n";
}

const IPV4_ADDR = /^(?:\d{1,3}\.){3}\d{1,3}$/;

/** Keep MikroTik /radius pointed at HotspotPro so cloud vouchers authenticate on Connect. */
function cloudRadiusEnsureLines(origin?: string): string[] {
  if (!radiusCloudEnabled()) return [];
  let fallback = "";
  try {
    if (origin) fallback = new URL(origin).hostname;
  } catch {
    /* ignore */
  }
  const host = radiusPublicHost(fallback).replace(/[^0-9A-Za-z.:-]/g, "");
  if (!host) return [];
  const secret = radiusSecret().replace(/"/g, "");
  const { authPort, acctPort } = radiusPorts();
  const ports = `authentication-port=${authPort} accounting-port=${acctPort}`;
  // MikroTik /radius client: service=hotspot, longer timeout for Africa→cloud RTT,
  // require-message-auth=no so older/edge cases do not mark good Accepts as bad-replies
  // (we still send Message-Authenticator from the server for ROS that require it).
  const lines = [
    `:do { /radius remove [find where comment="HotspotPro"] } on-error={ }`,
  ];
  if (IPV4_ADDR.test(host)) {
    lines.push(`:do { /radius add service=hotspot address=${host} secret="${secret}" ${ports} timeout=5s comment="HotspotPro" } on-error={ }`);
  } else {
    lines.push(`:local hpRad ""`);
    lines.push(`:do { :set hpRad [/resolve "${host}"] } on-error={ }`);
    lines.push(`:if ([:len $hpRad] > 0) do={ :do { /radius add service=hotspot address=$hpRad secret="${secret}" ${ports} timeout=5s comment="HotspotPro" } on-error={ } }`);
  }
  lines.push(`:do { /radius set [find where comment="HotspotPro"] require-message-auth=no } on-error={ }`);
  lines.push(`:do { :put ("HotspotPro: RADIUS hotspot → " . "${host}" . ":" . "${authPort}") } on-error={ }`);
  return lines;
}

/** Mirror RADIUS details onto the saved router so the dashboard shows the live cloud target. */
function noteCloudRadiusOnRouter(token: string, origin?: string) {
  const value = getState("routers")?.value;
  if (!Array.isArray(value)) return;
  let fallback = "";
  try {
    if (origin) fallback = new URL(origin).hostname;
  } catch {
    /* ignore */
  }
  const host = radiusPublicHost(fallback);
  if (!host) return;
  const { authPort, acctPort } = radiusPorts();
  let changed = false;
  const next = (value as Row[]).map((row) => {
    if (row.provisioningToken !== token) return row;
    const cur = row as Row & { radiusAddress?: string | null; radiusAuthPort?: number; radiusAccountingPort?: number };
    if (cur.radiusAddress === host && cur.radiusAuthPort === authPort && cur.radiusAccountingPort === acctPort) return row;
    changed = true;
    return { ...row, radiusAddress: host, radiusAuthPort: authPort, radiusAccountingPort: acctPort };
  });
  if (changed) setState("routers", next, "router");
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

type ActiveDashRow = Record<string, unknown> & { voucherUsername?: string; routerIp?: string; status?: string; lastSeenMs?: number };

/** Keep Active Users in step with hotspot users reported on each router check-in (local + cloud). */
function syncActiveUsersFromRouter(routerIp: string, users: string[] | null | undefined) {
  if (users === null || users === undefined) return;
  const now = Date.now();
  const live = new Set(users.map((name) => name.toLowerCase()));
  const rows = list<ActiveDashRow>("activeUsers");
  const kept = rows.filter((row) => {
    if (row.routerIp !== routerIp) return true;
    const name = String(row.voucherUsername || "").toLowerCase();
    return name && live.has(name);
  });
  const next: ActiveDashRow[] = [...kept];
  for (const username of users) {
    const existing = next.findIndex(
      (row) => row.routerIp === routerIp && String(row.voucherUsername || "").toLowerCase() === username.toLowerCase(),
    );
    const voucher = findVoucher(username);
    const pkg = voucher ? findPackageByName(voucher.packageName) : null;
    const base: ActiveDashRow = {
      phone: voucher?.redeemerPhone ?? "—",
      package: voucher?.packageName ?? "Unknown",
      accessType: "Hotspot",
      voucherUsername: username,
      voucherPassword: voucher?.password ?? "",
      duration: pkg ? `${Math.round(packageSeconds(pkg) / 60)}m` : "—",
      timeSpent: "—",
      timeLeft: voucher?.expiresAtMs ? `${Math.max(0, Math.floor((voucher.expiresAtMs - now) / 60000))}m` : "—",
      dataUsed: "—",
      dataLeft: "—",
      expiresAt: voucher?.expiresAtMs ? new Date(voucher.expiresAtMs).toISOString().slice(0, 16).replace("T", " ") : "—",
      status: "Active",
      macAddress: voucher?.boundMac ?? "",
      routerIp,
      lastSeenMs: now,
      source: "check-in",
    };
    if (existing >= 0) next[existing] = { ...next[existing], ...base, status: "Active", lastSeenMs: now };
    else next.unshift(base);
  }
  setState("activeUsers", next, "server");
}

export function recordRouterStats(token: string, stats: { cpu: number | null; memory: number | null; uptime?: string | null; version?: string | null; architecture?: string | null; cpuCount?: string | null; board?: string | null; identity?: string | null; channel?: string | null; clients?: number | null; users?: string[] | null; dns?: string | null; pub?: string | null; wan?: string | null; serial?: string | null; softwareId?: string | null }) {
  if (stats.users?.length) noteLiveVouchers(stats.users);
  const value = getState("routers")?.value;
  if (!Array.isArray(value)) return;
  let changed = false;
  let routerIp = "";
  const next = (value as Record<string, unknown>[]).map((row) => {
    if (!row || row.provisioningToken !== token) return row;
    changed = true;
    routerIp = typeof row.ip === "string" ? row.ip : "";
    const nowMs = Date.now();
    const checked = new Date(nowMs).toLocaleString("en-GB", { day: "2-digit", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit", second: "2-digit" });
    // A live check-in means the router is online — clear stale provision errors so the UI shows Online, not "error".
    const updated: Record<string, unknown> = {
      ...row,
      lastSeen: "Just now",
      lastConnectedAt: checked,
      status: "Online",
      health: "ok",
      lastError: null,
      provisioningStatus: row.provisioningStatus === "Pending" || row.provisioningStatus === "Not Started" ? "Provisioned" : row.provisioningStatus,
    };
    if (stats.cpu !== null) updated.cpu = stats.cpu;
    if (stats.memory !== null) updated.memory = stats.memory;
    if (stats.uptime) updated.uptime = stats.uptime;
    if (stats.version) updated.routerOSVersion = stats.channel ? `${stats.version} (${stats.channel})` : stats.version;
    if (stats.architecture) updated.architecture = stats.architecture;
    if (stats.cpuCount) updated.cpuCount = stats.cpuCount;
    if (stats.board) updated.hardwareModel = stats.board;
    if (stats.serial) updated.hardwareSerial = stats.serial;
    if (stats.softwareId) updated.softwareId = stats.softwareId;
    // The dashboard name is the source of truth (the check-in pushes it to the router). Keep what the
    // router reports separately — copying it into `name` reverted every rename within one check-in.
    if (stats.identity) updated.routerIdentity = stats.identity;
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
        // Public path — laptop WinBox does not need the Back To Home tunnel IP.
        if (!row.wireguardConfig) updated.wireguardTunnelIp = null;
      } else if (row.winboxRelay && typeof row.winboxAddress === "string" && row.winboxAddress && !String(row.winboxAddress).startsWith("192.168.216.")) {
        // Cloud WinBox relay already published a public host:port — keep it.
        updated.winboxReach = "direct";
        updated.winboxAddress = row.winboxAddress;
        updated.wireguardTunnelIp = null;
        updated.winboxRelay = true;
      } else if (wanIp || name || ipv4(stats.pub) || row.wireguardConfig || row.winboxReach === "relay") {
        // NAT / CGNAT — prefer cloud relay address when configured; else legacy tunnel IP.
        const relay = winboxRelayAddress();
        if (relay && row.wireguardConfig) {
          updated.winboxReach = "direct";
          updated.winboxAddress = relay.includes(":") ? relay : `${relay}:8291`;
          updated.wireguardTunnelIp = null;
          updated.winboxRelay = true;
        } else {
          updated.winboxReach = "relay";
          updated.winboxAddress = "192.168.216.1";
          updated.wireguardTunnelIp = "192.168.216.1";
        }
      } else {
        // Remote on but WAN not reported yet — still reserve the tunnel IP so the UI is not blank.
        updated.winboxReach = "relay";
        updated.winboxAddress = "192.168.216.1";
        updated.wireguardTunnelIp = "192.168.216.1";
      }
    }
    return updated;
  });
  if (changed) setState("routers", next, "router");
  if (changed && routerIp) syncActiveUsersFromRouter(routerIp, stats.users ?? []);
}

/** Pull a WireGuard client conf out of raw / multipart /tool fetch upload bodies. */
function extractWireguardConf(raw: string) {
  const text = raw.replace(/\0/g, "").trim();
  if (!text) return "";
  const start = text.indexOf("[Interface]");
  if (start < 0) return "";
  let conf = text.slice(start);
  // Multipart uploads sometimes append a boundary after the conf.
  const boundary = conf.search(/\r?\n------/);
  if (boundary > 0) conf = conf.slice(0, boundary);
  conf = conf.trim();
  if (conf.length < 20 || conf.length > 8000) return "";
  if (!conf.includes("PrivateKey") || !conf.includes("[Peer]")) return "";
  return conf;
}

/** The router posts its Back to Home WireGuard file once remote access is on. */
export function saveWireguardConfig(token: string, body: string) {
  const conf = extractWireguardConf(body);
  if (!conf) return false;
  const value = getState("routers")?.value;
  if (!Array.isArray(value)) return false;
  let changed = false;
  const next = (value as Record<string, unknown>[]).map((row) => {
    if (!row || row.provisioningToken !== token || row.remoteAccessHold === true) return row;
    changed = true;
    return {
      ...row,
      wireguardConfig: conf,
      wireguardTunnelIp: "192.168.216.1",
      winboxReach: "relay",
      winboxAddress: "192.168.216.1",
      remoteAccessEnabled: true,
    };
  });
  if (changed) {
    setState("routers", next, "router");
    // Cloud relay holds the WireGuard side so the admin PC only needs WinBox.
    void import("./winboxRelay").then(({ armWinboxRelay }) => armWinboxRelay(token, conf)).catch(() => {});
  }
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
