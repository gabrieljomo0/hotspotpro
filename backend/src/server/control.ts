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
import { accessGuardCommand, accessLockEnsureCommand, checkInBody } from "./routeros";

export const SWITCH_COMMENT = "HotspotPro internet off";
const ACCESS_LOCK = "HotspotPro access lock";
type Row = { ip: string; name: string; disconnected?: boolean; paused?: boolean; provisioningToken?: string; hotspotEnabled?: boolean; wanAddress?: string | null; loginMode?: "cloud" | "local" };

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
  return `:do { /tool fetch url="${origin}/api/provision/${token}/${page}" dst-path=${file}${tls} } on-error={ }`;
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
  const local = router.loginMode === "local" || process.env.HOTSPOTPRO_RADIUS === "off";
  const lines = [
    `# HotspotPro: ${oneLine(router.name)} is ${off ? "DISCONNECTED (internet cut)" : "CONNECTED"}`,
    `# HotspotPro access: ${access.locked ? "locked" : "open"}`,
    `# HotspotPro login: ${local ? "local" : "cloud"}`,
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
      `:do { /ip hotspot profile set [find where name=hotspotpro] trial-uptime-limit=0s use-radius=${local ? "no" : "yes"} } on-error={ }`,
    );
    if (origin) {
      lines.push(
        `:global hpLockState`,
        `:if ($hpLockState != "open") do={ ${pageFetch(origin, token, "login.html", "hotspot/login.html")}; ${pageFetch(origin, token, "login.html", "flash/hotspot/login.html")}; :set hpLockState "open" }`,
      );
    }
    if (local) lines.push(...localUserLines(token, router.ip));
    else {
      forgetLocalUsers(token);
      lines.push(`:do { /ip hotspot user remove [find where comment="HotspotPro"] } on-error={ }`);
    }
  }
  // Commands the owner queued on the site (Advanced). Each is downloaded and run once, and the router reports whether it worked.
  if (origin) {
    const tls = origin.startsWith("https://") ? " check-certificate=no" : "";
    for (const job of takeQueuedJobs(token)) {
      const base = `${origin}/api/provision/${token}/job/${job.id}`;
      lines.push(
        `:do { :local hpOk 1; /tool fetch url="${base}" dst-path=hotspotpro-job.rsc${tls}; :delay 1s; :do { /import hotspotpro-job.rsc } on-error={ :set hpOk 0 }; /tool fetch url=("${base}/result?ok=" . $hpOk) keep-result=no${tls} } on-error={ }`,
      );
    }
  }
  if (origin) {
    const source = checkInBody(origin, token).replace(/\\/g, "\\\\").replace(/"/g, '\\"').replace(/\$/g, "\\$");
    // The copy already on the router may not send CPU and memory. Replace it so the next check-in does.
    lines.push(`:do { /system script set [find where name=hotspotpro-control] source="${source}" } on-error={ }`);
  }
  return lines.join("\n") + "\n";
}

/** Save the CPU, memory and uptime the router just reported, and fill a blank WinBox address. */
export function recordRouterStats(token: string, stats: { cpu: number | null; memory: number | null; uptime?: string | null; version?: string | null; architecture?: string | null; cpuCount?: string | null; clients?: number | null; users?: string[] | null }) {
  const value = getState("routers")?.value;
  if (!Array.isArray(value)) return;
  let changed = false;
  const next = (value as Record<string, unknown>[]).map((row) => {
    if (!row || row.provisioningToken !== token) return row;
    changed = true;
    const updated: Record<string, unknown> = { ...row, lastSeen: "Just now", status: "Online" };
    if (stats.cpu !== null) updated.cpu = stats.cpu;
    if (stats.memory !== null) updated.memory = stats.memory;
    if (stats.uptime) updated.uptime = stats.uptime;
    if (stats.version) updated.routerOSVersion = stats.version;
    if (stats.architecture) updated.architecture = stats.architecture;
    if (stats.cpuCount) updated.cpuCount = stats.cpuCount;
    if (stats.clients !== null && stats.clients !== undefined) updated.clients = stats.clients;
    if (stats.users) updated.liveUsers = stats.users;
    if (!row.winboxAddress) {
      updated.winboxAddress = "192.168.88.1";
      updated.remoteAccessEnabled = true;
    }
    return updated;
  });
  if (changed) setState("routers", next, "router");
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
  return {
    disconnected: !!router.disconnected,
    hasToken: !!token,
    hotspot: router.hotspotEnabled !== false,
    lastCheckInAt: last,
    enforced: quietFor !== null && quietFor < SILENT_MS,
    lostSignal: quietFor !== null && quietFor >= SILENT_MS,
    outage: token ? outageOf(token) : null,
    setupPath: token ? `/api/provision/${token}/control-setup` : null,
  };
}

/** Every router at once, keyed by ip (the lists poll this). */
export function allControlStatus(): Record<string, ControlStatus> {
  const list = rows();
  const out: Record<string, ControlStatus> = {};
  for (const r of list) {
    const status = controlStatus(r.ip, list);
    if (status) out[r.ip] = status;
  }
  return out;
}
