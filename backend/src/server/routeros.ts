// Builds the RouterOS (MikroTik) script a router downloads from
//   /api/provision/<token>
// WAN DHCP, hotspot LAN, DHCP server, hotspot service, walled garden, the
// captive-portal pages, and optional WiFi. Safe to run again: existing HotspotPro
// pieces are updated in place so people already online are not kicked offline.

import dns from "node:dns";
import { PORTAL_MARKER } from "./hotspotPages";

/** Bump this when the setup script changes. Connected routers download the new setup on the next check-in. */
export const SETUP_VERSION = "v30";

/** Default check-in spacing. Sub-second polls flood weak African links when an account has many routers. */
export const CHECKIN_INTERVAL = "15s";

/** Hotspot login DNS name (MikroTik profile dns-name). Prefer a manually typed value. */
export function loginDnsFromName(routerName: string, given?: string): string {
  const clean = (value: string) =>
    value
      .toLowerCase()
      .replace(/[^a-z0-9.-]/g, "")
      .replace(/^\.+|\.+$/g, "")
      .replace(/\.{2,}/g, ".")
      .slice(0, 48);
  const typed = clean(given || "");
  if (typed.length > 0) return typed;
  const fromName = routerName.toLowerCase().replace(/[^a-z]/g, "").slice(0, 4);
  return fromName || "wifi";
}

export type ProvisionRouter = {
  name: string;
  hotspotEnabled?: boolean;
  hotspotNetwork?: string;
  hotspotGatewayIp?: string;
  hotspotDnsServers?: string;
  dnsName?: string;
  routerType?: string;
  hasWireless?: boolean;
  /** The port the internet (ISP) cable goes into. Always ether1 unless the owner says otherwise. */
  wanInterface?: string;
  /** The port the owner's computer (the one running HotspotPro) is plugged into. It stays OUT of the hotspot, so the connection is never lost. */
  managementPort?: string;
  /** When true, the script counts the ethernet ports and keeps the last one out of the hotspot. */
  lastPortFree?: boolean;
  /** Let WinBox reach the router from the PRIVATE network on the ISP port (e.g. the Starlink router's WiFi), which the factory firewall blocks. */
  adminFromWan?: boolean;
  pppoeEnabled?: boolean;
  pppoeNetwork?: string;
  /** One at a time: cloud asks this server for every login; local keeps the vouchers on the router. */
  loginMode?: "cloud" | "local";
};

function ipToInt(ip: string) {
  const p = ip.split(".").map(Number);
  if (p.length !== 4 || p.some((n) => !Number.isInteger(n) || n < 0 || n > 255)) return null;
  return ((p[0] << 24) | (p[1] << 16) | (p[2] << 8) | p[3]) >>> 0;
}
function intToIp(n: number) {
  return [n >>> 24, (n >>> 16) & 255, (n >>> 8) & 255, n & 255].join(".");
}

/** "10.10.0.0/16" + "10.10.0.1" -> pool range and the gateway/prefix to assign. */
export function planNetwork(network: string | undefined, gateway: string | undefined) {
  const [base, prefixText] = (network || "10.10.0.0/16").split("/");
  const prefix = Math.min(30, Math.max(8, Number(prefixText) || 16));
  const baseInt = ipToInt(base) ?? ipToInt("10.10.0.0")!;
  const mask = prefix === 0 ? 0 : (0xffffffff << (32 - prefix)) >>> 0;
  const net = (baseInt & mask) >>> 0;
  const broadcast = (net | (~mask >>> 0)) >>> 0;
  const gw = (gateway && ipToInt(gateway)) || net + 1;
  const poolStart = (net + 2) >>> 0;
  // A /16 would ask a small board for about 65,000 DHCP leases and it will fail or stall.
  // Keep the subnet the owner chose, but hand out at most ~1,000 addresses, ending on .254.
  const poolCap = (net + 1022) >>> 0;
  let poolEnd = (Math.min(broadcast - 1, poolCap)) >>> 0;
  if (poolEnd < poolStart) poolEnd = poolStart;
  return {
    gateway: intToIp(gw as number),
    prefix,
    network: `${intToIp(net)}/${prefix}`,
    poolFrom: intToIp(poolStart),
    poolTo: intToIp(poolEnd),
  };
}

/** The admin port (your computer's cable): empty/invalid = none, and it can never be the ISP port. */
export function mgmtOf(router: ProvisionRouter): string {
  const name = (router.managementPort ?? "").trim();
  if (!/^ether[0-9]+$/.test(name)) return "";
  return name === wanOf(router) ? "" : name;
}

/** The ISP port: ether1 unless a valid other name was given. */
export function wanOf(router: ProvisionRouter): string {
  const name = (router.wanInterface ?? "").trim();
  return /^(ether|sfp|sfp-sfpplus|sfpplus|lte|wlan|wifi|vlan|pppoe-out)[A-Za-z0-9._-]*$/.test(name) ? name : "ether1";
}

// RouterOS strings: escape the characters that would break out of "...".
function q(value: string) {
  return `"${value.replace(/[\\"$\n\r]/g, "")}"`;
}

const IPV4 = /^(?:\d{1,3}\.){3}\d{1,3}$/;
const LOOPBACK = /^(localhost|127\.|0\.0\.0\.0|\[::1\])/;

type LookupSync = (hostname: string, options: { family: number; all: true }) => { address: string }[];

/** IPv4 addresses for a host. An address is returned as itself; a name is resolved on this server. */
function ipv4sOf(host: string): string[] {
  if (IPV4.test(host)) return [host];
  const lookupSync = (dns as unknown as { lookupSync?: LookupSync }).lookupSync;
  if (!lookupSync) return [];
  try {
    return [...new Set(lookupSync(host, { family: 4, all: true }).map((item) => item.address).filter((ip) => IPV4.test(ip)))];
  } catch {
    return [];
  }
}

/** MikroTik's /radius address field accepts an IP, not a name, on most versions. */
function radiusTarget(host: string): { ip: string | null; name: string | null } {
  const clean = host.replace(/[^0-9A-Za-z.:-]/g, "");
  if (IPV4.test(clean)) return { ip: clean, name: null };
  const resolved = ipv4sOf(clean)[0];
  if (resolved) return { ip: resolved, name: null };
  return { ip: null, name: clean };
}


const SWITCH_COMMENT = "HotspotPro internet off";
const ACCESS_LOCK = "HotspotPro access lock";

/** Script stored on the router. Every hour with no "still paid" check-in counts; after 3 days it locks the portal by itself. */
function guardSource() {
  return ':global hpMiss; :if ([:typeof $hpMiss] = "nothing") do={ :set hpMiss 0 }; :set hpMiss ($hpMiss + 1); :if ($hpMiss >= 72) do={ :do { /ip firewall raw enable [find where comment="HotspotPro access lock"] } on-error={ }; :do { /ip hotspot active remove [find] } on-error={ } }';
}

/** When a voucher ends: clear cookies only. Do NOT kick WiFi (that removes signal bars). Phone stays on the saved network and the local login page opens again fast. */
function logoutSource() {
  return ':local mac $"mac-address"; :local user $"user"; :if ([:len $mac] > 0) do={ :do { /ip hotspot cookie remove [find where mac-address=$mac] } on-error={ } }; :if ([:len $user] > 0) do={ :do { /ip hotspot cookie remove [find where user=$user] } on-error={ } }';
}

/**
 * Drop hotspot cookies for anyone who is not currently online.
 * Stale cookies after a failed/expired login make phones skip the captive portal until "Forget WiFi".
 */
function reauthCleanSource() {
  return ':foreach c in=[/ip hotspot cookie find] do={ :local mac [/ip hotspot cookie get $c mac-address]; :local u [/ip hotspot cookie get $c user]; :local keep false; :if ([:len $mac] > 0 && [:len [/ip hotspot active find where mac-address=$mac]] > 0) do={ :set keep true }; :if ([:len $u] > 0 && [:len [/ip hotspot active find where user=$u]] > 0) do={ :set keep true }; :if (!$keep) do={ :do { /ip hotspot cookie remove $c } on-error={ } } }';
}

function rosQuoted(source: string) {
  return `"${source.replace(/\\/g, "\\\\").replace(/"/g, '\\"').replace(/\$/g, "\\$")}"`;
}

/** Install logout + reauth helpers so expired vouchers reopen the captive portal on the saved WiFi. */
export function hotspotReauthEnsureLines(): string[] {
  return [
    `:do { /system script remove [find where name=hotspotpro-logout] } on-error={ }`,
    `:do { /system script add name=hotspotpro-logout source=${rosQuoted(logoutSource())} policy=read,write,policy,test comment="HotspotPro" } on-error={ }`,
    `:do { /ip hotspot user profile set [find] on-logout=hotspotpro-logout } on-error={ }`,
    `:do { /system script remove [find where name=hotspotpro-reauth] } on-error={ }`,
    `:do { /system script add name=hotspotpro-reauth source=${rosQuoted(reauthCleanSource())} policy=read,write,policy,test comment="HotspotPro" } on-error={ }`,
    `:do { /system scheduler remove [find where name=hotspotpro-reauth] } on-error={ }`,
    `:do { /system scheduler add name=hotspotpro-reauth interval=5s start-time=startup on-event=hotspotpro-reauth policy=read,write,policy,test comment="HotspotPro" } on-error={ }`,
  ];
}

/** Install the offline lock once. Safe to include on every check-in and in the setup script. */
export function accessGuardCommand() {
  return `:if ([:len [/system scheduler find where name=hotspotpro-guard]] = 0) do={ /system script remove [find where name=hotspotpro-guard]; /system script add name=hotspotpro-guard source=${rosQuoted(guardSource())} policy=ftp,reboot,read,write,policy,test comment="HotspotPro"; /system scheduler add name=hotspotpro-guard interval=1h start-time=startup on-event=hotspotpro-guard policy=ftp,reboot,read,write,policy,test comment="HotspotPro" }`;
}

export function accessLockEnsureCommand() {
  const rule = (extra: string) => `/ip firewall raw add chain=prerouting in-interface=hotspotpro-bridge ${extra} comment="${ACCESS_LOCK}" disabled=yes`;
  return `:if ([:len [/ip firewall raw find where comment="${ACCESS_LOCK}"]] = 0) do={ ${rule("action=accept dst-address-type=local")}; ${rule("action=accept dst-address-type=broadcast")}; ${rule("action=drop")} }`;
}

/**
 * The router side of Disconnect / Reconnect: three firewall rules in the RAW table (all disabled until
 * the server says "off") plus a scheduler that asks the server what to do every 30 seconds.
 * Raw rules run before everything else, so when enabled they cut ALL customer traffic, existing connections
 * included, while still letting devices reach the router itself (DHCP, DNS, its login page).
 */
/** What the router runs every 30 seconds. It sends CPU and memory, then downloads the latest instructions. */
export function checkInBody(origin: string, token: string): string {
  const tls = origin.startsWith("https:") ? " check-certificate=no" : "";
  const url = `${origin}/api/provision/${token}/control`;
  // wanip: prefer Multi-WAN DHCP clients (comment HotspotPro WAN), then the original single-WAN client.
  return `:local hpCpu 0; :local hpFree 0; :local hpTotal 1; :local hpUp ""; :local hpVer ""; :local hpArch ""; :local hpCpuN ""; :local hpActive 0; :local hpUsers ""; :local hpCount 0; :local hpDns ""; :local hpPub ""; :local hpWan ""; :local hpBoard ""; :local hpName ""; :local hpCh ""; :do { :set hpCpu [/system resource get cpu-load] } on-error={ }; :do { :set hpFree [/system resource get free-memory] } on-error={ }; :do { :set hpTotal [/system resource get total-memory] } on-error={ }; :do { :set hpUp [/system resource get uptime] } on-error={ }; :do { :set hpVer [/system resource get version]; :set hpVer [:pick $hpVer 0 [:find $hpVer " "]] } on-error={ }; :do { :set hpArch [/system resource get architecture-name] } on-error={ }; :do { :set hpCpuN [/system resource get cpu-count] } on-error={ }; :do { :set hpBoard [/system resource get board-name]; :while ([:typeof [:find $hpBoard " "]] = "num") do={ :local p [:find $hpBoard " "]; :set hpBoard ([:pick $hpBoard 0 $p] . "+" . [:pick $hpBoard ($p + 1) [:len $hpBoard]]) } } on-error={ }; :do { :set hpName [/system identity get name]; :while ([:typeof [:find $hpName " "]] = "num") do={ :local p [:find $hpName " "]; :set hpName ([:pick $hpName 0 $p] . "+" . [:pick $hpName ($p + 1) [:len $hpName]]) } } on-error={ }; :do { :set hpCh [/system package update get channel] } on-error={ }; :do { :set hpActive [:len [/ip hotspot active find]] } on-error={ }; :do { :foreach i in=[/ip hotspot active find] do={ :if ($hpCount < 12) do={ :set hpUsers ($hpUsers . "," . [/ip hotspot active get $i user]); :set hpCount ($hpCount + 1) } } } on-error={ }; :do { :set hpDns [/ip cloud get dns-name] } on-error={ }; :do { :set hpPub [/ip cloud get public-address] } on-error={ }; :do { :local hpIds [/ip dhcp-client find where comment="HotspotPro WAN"]; :if ([:len $hpIds] > 0) do={ :set hpWan [/ip dhcp-client get [:pick $hpIds 0] address] } } on-error={ }; :do { :if ([:len $hpWan] = 0) do={ :set hpWan [/ip dhcp-client get [find where comment="HotspotPro WAN DHCP Client"] address] } } on-error={ }; :do { :if ([:find $hpWan "/"] >= 0) do={ :set hpWan [:pick $hpWan 0 [:find $hpWan "/"]] } } on-error={ }; :local hpUrl "${url}"; :set hpUrl ($hpUrl . "?cpu=" . $hpCpu . "&free=" . $hpFree . "&total=" . $hpTotal . "&up=" . $hpUp . "&ver=" . $hpVer . "&arch=" . $hpArch . "&cpus=" . $hpCpuN . "&board=" . $hpBoard . "&id=" . $hpName . "&ch=" . $hpCh . "&active=" . $hpActive . "&users=" . $hpUsers . "&dns=" . $hpDns . "&pub=" . $hpPub . "&wanip=" . $hpWan); :do { /tool fetch url=$hpUrl dst-path=hotspotpro-control.rsc${tls}; :delay 2s; /import file-name=hotspotpro-control.rsc } on-error={ }`;
}

/** Open or close WinBox from outside the shop. Off keeps it on the admin port only. */
export function remoteWinboxLines(enabled: boolean, origin: string, token: string, sameNetwork = false, wan = "ether1"): string[] {
  const port = /^(ether|sfp|sfp-sfpplus|sfpplus|lte|wlan|wifi|vlan|pppoe-out)[A-Za-z0-9._-]*$/.test(wan) ? wan : "ether1";
  if (!enabled) {
    const lines = [
      `:do { /ip firewall filter remove [find where comment="HotspotPro remote WinBox"] } on-error={ }`,
      `:do { /ip firewall filter remove [find where comment="HotspotPro remote WebFig"] } on-error={ }`,
      `:do { /ip firewall filter remove [find where comment="HotspotPro remote API"] } on-error={ }`,
      `:do { /ip service set api available-from=192.168.88.0/24 disabled=no } on-error={ }`,
      `:do { /ip service set www available-from=192.168.88.0/24 disabled=no } on-error={ }`,
      `:do { :if ([/ip cloud get back-to-home-vpn] = "enabled") do={ /ip cloud set back-to-home-vpn=revoked-and-disabled } } on-error={ }`,
    ];
    if (sameNetwork) {
      lines.push(
        `:do { /ip service set winbox available-from=192.168.0.0/16,10.0.0.0/8,172.16.0.0/12 disabled=no } on-error={ }`,
        `:do { :if ([:len [/ip firewall address-list find where list=hotspotpro-private address=192.168.0.0/16]] = 0) do={ /ip firewall address-list add list=hotspotpro-private address=192.168.0.0/16 } } on-error={ }`,
        `:do { :if ([:len [/ip firewall address-list find where list=hotspotpro-private address=10.0.0.0/8]] = 0) do={ /ip firewall address-list add list=hotspotpro-private address=10.0.0.0/8 } } on-error={ }`,
        `:do { :if ([:len [/ip firewall address-list find where list=hotspotpro-private address=172.16.0.0/12]] = 0) do={ /ip firewall address-list add list=hotspotpro-private address=172.16.0.0/12 } } on-error={ }`,
        `:do { :if ([:len [/ip firewall filter find where comment="HotspotPro block WinBox from customers"]] = 0) do={ /ip firewall filter add chain=input action=drop in-interface=hotspotpro-bridge protocol=tcp dst-port=8291 comment="HotspotPro block WinBox from customers" place-before=0 } } on-error={ }`,
        `:do { :if ([:len [/ip firewall filter find where comment="HotspotPro WinBox from ISP network"]] = 0) do={ /ip firewall filter add chain=input action=accept in-interface=${port} src-address-list=hotspotpro-private protocol=tcp dst-port=8291 comment="HotspotPro WinBox from ISP network" place-before=0 } } on-error={ }`,
      );
    } else {
      lines.push(`:do { /ip service set winbox available-from=192.168.88.0/24 disabled=no } on-error={ }`);
    }
    return lines;
  }
  const lines = [
    // Public WinBox + WebFig: cloud DDNS when the ISP gives a real address, Back To Home VPN when it does not.
    `:do { /ip cloud set ddns-enabled=yes update-time=yes } on-error={ }`,
    `:do { :if ([/ip cloud get back-to-home-vpn] != "enabled") do={ /ip cloud set back-to-home-vpn=enabled } } on-error={ }`,
    `:do { /ip service set winbox available-from=0.0.0.0/0 disabled=no } on-error={ }`,
    // WebFig so the owner can open the router in a browser without installing WinBox.
    `:do { /ip service set www available-from=0.0.0.0/0 disabled=no } on-error={ }`,
    `:do { /ip service set api port=8728 available-from=192.168.88.0/24,192.168.216.0/24 disabled=no } on-error={ }`,
    `:do { /ip firewall filter remove [find where comment="HotspotPro remote WinBox"] } on-error={ }`,
    `:do { /ip firewall filter remove [find where comment="HotspotPro remote WebFig"] } on-error={ }`,
    `:do { /ip firewall filter remove [find where comment="HotspotPro remote API"] } on-error={ }`,
    `:do { /ip firewall filter add chain=input action=accept protocol=tcp dst-port=8291 comment="HotspotPro remote WinBox" place-before=0 } on-error={ }`,
    `:do { /ip firewall filter add chain=input action=accept protocol=tcp dst-port=8291 in-interface=${port} comment="HotspotPro remote WinBox" place-before=0 } on-error={ }`,
    `:do { /ip firewall filter add chain=input action=accept protocol=tcp dst-port=80 comment="HotspotPro remote WebFig" place-before=0 } on-error={ }`,
    `:do { /ip firewall filter add chain=input action=accept protocol=tcp dst-port=8728 src-address=192.168.216.0/24 comment="HotspotPro remote API" place-before=0 } on-error={ }`,
  ];
  if (origin) {
    const tls = origin.startsWith("https:") ? " check-certificate=no" : "";
    const post = `${origin}/api/provision/${token}/winbox`;
    // Back To Home tunnel is part of setup: create it once and keep it on the site so remote
    // enable does not need a fresh WireGuard download every time.
    lines.push(`:do { :local hpWg ""; :local hpTry 0; :global hpWgSent; :while ($hpTry < 12) do={ :do { :set hpWg [/ip cloud get vpn-wireguard-client-config] } on-error={ }; :if ([:len $hpWg] > 20) do={ :set hpTry 12 } else={ :delay 2s; :set hpTry ($hpTry + 1) } }; :if ([:len $hpWg] > 20) do={ :if ($hpWgSent != $hpWg) do={ :do { /file remove [find where name=hotspotpro-wg.conf] } on-error={ }; :do { /file add name=hotspotpro-wg.conf contents=$hpWg } on-error={ }; :do { /tool fetch url="${post}" src-path=hotspotpro-wg.conf upload=yes http-method=post keep-result=no${tls}; :set hpWgSent $hpWg } on-error={ } } } } on-error={ }`);
  }
  lines.push(`:do { :if ([:len [/ip firewall filter find where comment="HotspotPro block WinBox from customers"]] = 0) do={ /ip firewall filter add chain=input action=drop in-interface=hotspotpro-bridge protocol=tcp dst-port=8291 comment="HotspotPro block WinBox from customers" place-before=0 } } on-error={ }`);
  return lines;
}

export function internetSwitchCommands(origin: string, token: string): string[] {
  const source = checkInBody(origin, token).replace(/\\/g, "\\\\").replace(/"/g, '\\"').replace(/\$/g, "\\$");
  const rule = (extra: string) => `/ip firewall raw add chain=prerouting in-interface=hotspotpro-bridge ${extra} comment="${SWITCH_COMMENT}" disabled=yes`;
  return [
    `/ip firewall raw remove [find where comment="${SWITCH_COMMENT}"]`,
    rule("action=accept dst-address-type=local"),
    rule("action=accept dst-address-type=broadcast"),
    rule("action=drop"),
    `/system script remove [find where name=hotspotpro-control]`,
    // Without policy the scheduler is not allowed to download, so the router would never check in.
    `/system script add name=hotspotpro-control source="${source}" policy=ftp,reboot,read,write,policy,test comment="HotspotPro"`,
    `/system scheduler remove [find where name=hotspotpro-control]`,
    `/system scheduler add name=hotspotpro-control interval=${CHECKIN_INTERVAL} start-time=startup on-event=hotspotpro-control policy=ftp,reboot,read,write,policy,test comment="HotspotPro"`,
    `/ip firewall raw remove [find where comment="${ACCESS_LOCK}"]`,
    `/ip firewall raw add chain=prerouting in-interface=hotspotpro-bridge action=accept dst-address-type=local comment="${ACCESS_LOCK}" disabled=yes`,
    `/ip firewall raw add chain=prerouting in-interface=hotspotpro-bridge action=accept dst-address-type=broadcast comment="${ACCESS_LOCK}" disabled=yes`,
    `/ip firewall raw add chain=prerouting in-interface=hotspotpro-bridge action=drop comment="${ACCESS_LOCK}" disabled=yes`,
    accessGuardCommand(),
  ];
}

/** A small stand-alone script that adds just the internet switch to a router that was set up before it existed. */
export function buildInternetSwitchSetup(input: { router: ProvisionRouter; origin: string; token: string }): string {
  const { router, origin, token } = input;
  const lines = [
    `# HotspotPro: add Disconnect / Reconnect support to ${router.name.replace(/[\r\n]/g, " ")}`,
    `# Generated ${new Date().toISOString()} — safe to run again.`,
  ];
  if (router.hotspotEnabled === false) {
    lines.push(`:log warning "HotspotPro: this router has no hotspot, so Disconnect / Reconnect does not apply."`);
    return lines.join("\n") + "\n";
  }
  for (const command of internetSwitchCommands(origin, token)) {
    const quiet = command.includes(" remove ");
    const label = command.replace(/[\\"$]/g, "").slice(0, 60);
    lines.push(quiet ? `:do { ${command} } on-error={ }` : `:do { ${command} } on-error={ :log warning "HotspotPro disconnect-switch step failed: ${label}" }`);
  }
  lines.push(`:do { /system script run hotspotpro-control } on-error={ }`);
  lines.push(`:log info "HotspotPro disconnect-switch installed"`);
  return lines.join("\n") + "\n";
}

export function buildProvisionScript(input: {
  router: ProvisionRouter;
  origin: string;
  token: string;
  wireless?: boolean;
  ssid?: string;
  existing: boolean;
  /** Where customers' phones open the portal page (the website, not the backend). Defaults to origin. */
  portalOrigin?: string;
  /** Login the site shows under General Information. Created on the router after the hotspot exists. */
  apiPassword?: string;
  radius?: { host: string; secret: string; authPort: number; acctPort: number };
}): string {
  const { router, origin, token, ssid, radius } = input;
  const portalBase = input.portalOrigin || origin;
  const host = (() => {
    try {
      return new URL(origin).hostname;
    } catch {
      return "";
    }
  })();
  const lines: string[] = [];
  const add = (line: string) => lines.push(line);
  const plain = (message: string) => message.replace(/[\r\n"\\$]/g, " ").replace(/\s+/g, " ").trim().slice(0, 180);
  // Printed in the WinBox terminal so the person pasting the command can watch each step.
  const say = (message: string) => {
    const text = plain(message);
    if (text) add(`:put "${text}"`);
  };
  // Every step is allowed to fail without stopping the script (a step that was
  // already done, or a feature this model doesn't have), but each failure is
  // counted and logged on the router, and the count is reported to HotspotPro
  // at the end so a half-configured router is not shown as healthy.
  const safe = (command: string, quiet = false, done?: string) => {
    const label = command.replace(/[\\"$]/g, "").slice(0, 60);
    const ok = done ? `; :put "${plain(done)}"` : "";
    add(
      quiet
        ? `:do { ${command}${ok} } on-error={ }`
        : `:do { ${command}${ok} } on-error={ :set hpFails ($hpFails + 1); :log warning "HotspotPro step failed: ${label}"; :put "HotspotPro: one step had a problem and was skipped. Setup continues." }`,
    );
  };

  add(`# HotspotPro provisioning script for ${router.name.replace(/[\r\n]/g, " ")}`);
  add(`# HotspotPro login: ${router.loginMode === "local" ? "local" : "cloud"}`);
  add(`# Generated ${new Date().toISOString()} — safe to run again.`);
  add(`:local hpFails 0`);
  add(`:local hpDm ""`);
  add(`:local hpWan ""`);
  add(`:local hpNet ""`);
  add(`:local hpDir "hotspot"`);
  add(`:local hpLast ""`);
  add(`:global hpKeep ""`);
  say("==========================================");
  say("HotspotPro setup is starting...");
  say("==========================================");
  add(`:do { :local v [/system resource get version]; :put ("RouterOS version check passed: " . $v) } on-error={ :put "RouterOS version could not be read. Setup continues." }`);
  // Device mode is a separate short command. Calling it here asks for a restart before the hotspot exists.
  // The port this WinBox is using must stay where it is. Moving it drops the
  // terminal, and a dropped terminal stops the import, so the command has to be pasted again.
  add(`:do { :local hpMe ""; :local hpMac ""; :local hpId ""; :foreach u in=[/user active find] do={ :local v [/user active get $u via]; :if ($v = "winbox" || $v = "mac-winbox" || $v = "telnet" || $v = "ssh") do={ :set hpMe [/user active get $u address] } }; :if ([:len $hpMe] > 0) do={ :if ([:typeof [:find $hpMe "."]] = "num") do={ :do { :set hpMac [/ip arp get [find where address=$hpMe] mac-address] } on-error={ } } else={ :set hpMac $hpMe } }; :if ([:len $hpMac] > 0) do={ :do { :set hpId [/interface bridge host find where mac-address=$hpMac]; :if ([:len $hpId] > 0) do={ :do { :set hpKeep [/interface bridge host get $hpId interface] } on-error={ }; :if ([:len $hpKeep] = 0) do={ :do { :set hpKeep [/interface bridge host get $hpId on-interface] } on-error={ } } } } on-error={ } }; :if ([:len $hpKeep] > 0) do={ :put ("HotspotPro: WinBox is on " . $hpKeep . ". That port stays where it is, so this window stays connected.") } else={ :put "HotspotPro: the admin port stays connected." } } on-error={ }`);
  const wan = wanOf(router);
  const mgmt = mgmtOf(router);
  const keepPort = (port: string) => {
    const name = port.replace(/[^A-Za-z0-9._-]/g, "");
    if (!name) return;
    add(`:do { :if ($hpKeep != "${name}") do={ /interface bridge port remove [find where interface=${name}]; /interface bridge port add bridge=hotspotpro-bridge interface=${name} comment="HotspotPro" } else={ :put "HotspotPro: ${name} is left alone so WinBox stays connected." } } on-error={ }`);
  };

  // MikroTik sends this name as NAS-Identifier on every RADIUS packet. Accounting and Disconnect match the router by it.
  say("Setting the router name...");
  safe(`/system identity set name=${q(router.name)}`, false, "Router name set");

  // WAN
  // The ISP port gets its address by DHCP (ether1 unless the owner chose another port).
  // A new MikroTik keeps that port inside the factory bridge, and a DHCP client on a bridge port never gets an address.
  say(`Setting the internet port ${wan}...`);
  if (!input.existing) add(`:do { :if ($hpKeep != "${wan}") do={ /interface bridge port remove [find where interface=${wan}]; :put "Internet port ${wan} can take an address from the ISP." } else={ :put "HotspotPro: WinBox is using ${wan}, so that cable stays as it is." } } on-error={ }`);
  safe(`/ip dhcp-client add interface=${wan} disabled=no use-peer-dns=yes use-peer-ntp=yes add-default-route=yes comment="HotspotPro WAN DHCP Client"`, true, `DHCP client added on ${wan}`);
  safe(`/ip dhcp-client set [find where interface=${wan}] disabled=no use-peer-dns=yes use-peer-ntp=yes add-default-route=yes`, false, `DHCP client is on ${wan}`);
  say("Configuring DNS...");
  safe(`/ip dns set allow-remote-requests=yes servers=8.8.8.8,1.1.1.1`, false, "DNS configured");
  say("Configuring API and services...");
  safe(`/ip service set telnet disabled=yes`, true);
  safe(`/ip service set ftp disabled=yes`, true);
  safe(`/ip service set api-ssl disabled=yes`, true);
  safe(`/ip service set api port=8728 available-from=192.168.88.0/24 disabled=no`, true, "API service is on port 8728");
  say("Security settings configured");
  // Voucher time limits depend on the router's clock.
  say("Setting the clock...");
  safe(`/system ntp client set enabled=yes`, true);
  safe(`/system ntp client servers add address=pool.ntp.org`, true, "Clock service turned on");
  safe(`/system clock set time-zone-name=Africa/Accra`, false, "Timezone set to Africa/Accra");
  // The login pages and the "I'm finished" call need this port to have an address first.
  if (!input.existing) {
    say(`Waiting for the internet cable on ${wan}...`);
    add(`:do { :local hpWait 0; :while ($hpWait < 8 && [/ip dhcp-client get [find where interface=${wan}] status] != "bound") do={ :delay 2s; :set hpWait ($hpWait + 1) } } on-error={ }`);
    say("Internet port checked.");
  }

  if (router.adminFromWan !== false) {
    // The factory firewall only lets the LAN talk to the router. This opens WinBox (port 8291) for PRIVATE addresses only
    // (192.168.x.x, 10.x.x.x, 172.16-31.x.x) arriving on the ISP port, and lets WinBox find the router by name/MAC on that network.
    // It stays password-protected; nothing is opened to the public internet.
    add(`# --- WinBox from the private network on ${wan}`);
    say(`Opening WinBox for the private network on ${wan}...`);
    for (const cidr of ["192.168.0.0/16", "10.0.0.0/8", "172.16.0.0/12"]) {
      safe(`/ip firewall address-list remove [find where list=hotspotpro-private address=${cidr}]`, true);
      safe(`/ip firewall address-list add list=hotspotpro-private address=${cidr}`, true);
    }
    safe(`/ip firewall filter remove [find where comment="HotspotPro WinBox from ISP network"]`, true);
    safe(`/ip firewall filter add chain=input action=accept in-interface=${wan} src-address-list=hotspotpro-private protocol=tcp dst-port=8291 comment="HotspotPro WinBox from ISP network" place-before=0`, true);
    safe(`/ip service set winbox available-from=192.168.0.0/16,10.0.0.0/8,172.16.0.0/12 disabled=no`, true, "WinBox is open on this network");
    add(`:do { :if ([:len [/ip firewall filter find where comment="HotspotPro WinBox from ISP network"]] = 0) do={ /ip firewall filter add chain=input action=accept in-interface=${wan} src-address-list=hotspotpro-private protocol=tcp dst-port=8291 comment="HotspotPro WinBox from ISP network" } } on-error={ :set hpFails ($hpFails + 1); :log warning "HotspotPro step failed: WinBox firewall rule" }`);
    safe(`/interface list add name=hotspotpro-admin include=LAN`, true);
    safe(`/interface list member add list=hotspotpro-admin interface=${wan}`, true);
    safe(`/tool mac-server set allowed-interface-list=hotspotpro-admin`, true);
    safe(`/tool mac-server mac-winbox set allowed-interface-list=hotspotpro-admin`, true);
    safe(`/ip neighbor discovery-settings set discover-interface-list=hotspotpro-admin`, true);
    say("WinBox access from the private network is set.");
  }
  // Remote WinBox + Back To Home WireGuard are part of the default setup script (not optional).
  // The tunnel file is uploaded to HotspotPro once; later remote enable reuses it.
  for (const line of remoteWinboxLines(true, origin, token, false, wan)) add(line);
  say("Remote WinBox and the WireGuard tunnel are part of this setup. The site stores the tunnel so you do not set it up again.");
  add(`:do { :delay 2s } on-error={ }`);

  let hotspotNetwork = "";
  let hotspotGateway = "";
  if (router.hotspotEnabled !== false) {
    let plan = planNetwork(router.hotspotNetwork, router.hotspotGatewayIp);
    // The hotspot network must not contain the server's own address, or the router could never reach the server again.
    const serverIp = /^\d+\.\d+\.\d+\.\d+$/.test(host) ? ipToInt(host) : null;
    const inside = (p: typeof plan) => {
      const [base, pf] = p.network.split("/");
      const mask = (0xffffffff << (32 - Number(pf))) >>> 0;
      return serverIp !== null && ((serverIp & mask) >>> 0) === ((ipToInt(base) ?? 0) & mask) >>> 0;
    };
    if (inside(plan) || (mgmt && plan.network.startsWith("192.168.88."))) {
      const alt = planNetwork("10.77.0.0/16", undefined);
      add(`# NOTE: ${plan.network} contains the server address ${host}, so ${alt.network} is used for the hotspot instead.`);
      plan = alt;
    }
    hotspotNetwork = plan.network;
    hotspotGateway = plan.gateway;
    // Routers with a "flash" folder keep their files there; the hotspot pages go with them.
    add(`:do { :if ([:len [/file find where name="flash"]] > 0) do={ :set hpDir "flash/hotspot" } } on-error={ }`);
    const autoLast = router.lastPortFree === true && !input.existing;
    if (autoLast) {
      add(`:do { :local hpCount 0; :local hpMax 0; :set hpLast ""; :foreach p in=[/interface ethernet find] do={ :set hpCount ($hpCount + 1); :local n [/interface ethernet get $p name]; :if ([:pick $n 0 5] = "ether") do={ :local num [:tonum [:pick $n 5 [:len $n]]]; :if ($num > $hpMax) do={ :set hpMax $num; :set hpLast $n } } }; :if ($hpLast = "${wan}" || [:len $hpLast] = 0) do={ :set hpLast ""; :put ("This router has " . $hpCount . " ethernet ports. Internet uses ${wan}. The last port joins the hotspot.") } else={ :put ("This router has " . $hpCount . " ethernet ports. Internet uses ${wan}. The last port " . $hpLast . " stays free.") } } on-error={ :put "Could not count the ethernet ports. Setup continues." }`);
      add(`:do { :if ([:len $hpLast] > 0 && $hpKeep != $hpLast) do={ :if ([:len [/ip address find where address="192.168.88.1/24"]] = 0) do={ /interface bridge add name=hotspotpro-admin comment="HotspotPro admin"; /interface bridge port remove [find where interface=$hpLast]; /interface bridge port add bridge=hotspotpro-admin interface=$hpLast comment="HotspotPro admin"; /ip address add address=192.168.88.1/24 interface=hotspotpro-admin comment="HotspotPro admin"; /ip pool add name=hotspotpro-admin-pool ranges=192.168.88.10-192.168.88.60; /ip dhcp-server network add address=192.168.88.0/24 gateway=192.168.88.1 dns-server=192.168.88.1 comment="HotspotPro admin"; /ip dhcp-server add name=hotspotpro-admin-dhcp interface=hotspotpro-admin address-pool=hotspotpro-admin-pool disabled=no; /interface list member add list=LAN interface=hotspotpro-admin comment="HotspotPro admin"; :put ("The last port " . $hpLast . " is free for your computer.") } else={ :put ("The last port " . $hpLast . " stays free.") } } else={ :if ([:len $hpLast] > 0) do={ :put ("WinBox is on " . $hpLast . ", so that port stays where it is.") } } } on-error={ :set hpFails ($hpFails + 1); :put "HotspotPro: the free port step had a problem and was skipped. Setup continues." }`);
    }
    if (mgmt && !input.existing && !autoLast) {
      // Your computer keeps its own small network, outside the hotspot. A factory-default router already has one
      // (192.168.88.1/24); a blank router gets one now. Either way this port is never touched, so you never lose the connection.
      add(`# --- Admin port ${mgmt}: stays outside the hotspot (your computer)`);
      say(`Keeping ${mgmt} as the admin port for your computer...`);
      add(`:do { :if ([:len [/ip address find where address="192.168.88.1/24"]] = 0 && $hpKeep != "${mgmt}") do={ /interface bridge add name=hotspotpro-admin comment="HotspotPro admin"; /interface bridge port remove [find where interface=${mgmt}]; /interface bridge port add bridge=hotspotpro-admin interface=${mgmt} comment="HotspotPro admin"; /ip address add address=192.168.88.1/24 interface=hotspotpro-admin comment="HotspotPro admin"; /ip pool add name=hotspotpro-admin-pool ranges=192.168.88.10-192.168.88.60; /ip dhcp-server network add address=192.168.88.0/24 gateway=192.168.88.1 dns-server=192.168.88.1 comment="HotspotPro admin"; /ip dhcp-server add name=hotspotpro-admin-dhcp interface=hotspotpro-admin address-pool=hotspotpro-admin-pool disabled=no; /interface list member add list=LAN interface=hotspotpro-admin comment="HotspotPro admin"; :put "Admin port ${mgmt} is ready." } else={ :put "Admin port ${mgmt} stays connected." } } on-error={ :set hpFails ($hpFails + 1); :log warning "HotspotPro step failed: admin port setup"; :put "HotspotPro: the admin port step had a problem and was skipped. Setup continues." }`);
    }
    add(`# --- Hotspot network ${plan.network}`);
    say(`Preparing the hotspot network ${plan.network}...`);
    // Soft update when HotspotPro is already live: never tear down the bridge, DHCP, hotspot
    // server, or gateway — that would drop people already online. Only create missing pieces.
    add(`:global hpLive 0`);
    add(`:do { :if ([:len [/ip hotspot find where name=hotspotpro]] > 0) do={ :set hpLive 1; :put "HotspotPro: updating in place — people already on WiFi stay connected." } } on-error={ }`);
    add(`:do { :if ($hpLive = 0) do={ :do { /ip dhcp-server remove [find where name=hotspotpro-dhcp] } on-error={ }; :do { /ip dhcp-server network remove [find where comment="HotspotPro"] } on-error={ }; :do { /ip pool remove [find where name=hotspotpro-pool] } on-error={ }; :do { /ip address remove [find where comment="HotspotPro" interface=hotspotpro-bridge] } on-error={ }; :do { /ip firewall nat remove [find where comment="HotspotPro NAT"] } on-error={ }; :do { /radius remove [find where comment="HotspotPro"] } on-error={ }; :do { /ip hotspot walled-garden ip remove [find where comment="HotspotPro"] } on-error={ }; :do { /ip hotspot walled-garden remove [find where comment="HotspotPro"] } on-error={ } } } on-error={ }`);
    add(`:do { :if ([:len [/interface bridge find where name=hotspotpro-bridge]] > 0) do={ :put "Bridge may already exist, continuing..." } } on-error={ }`);
    safe(`/interface bridge add name=hotspotpro-bridge comment="HotspotPro"`, true);
    if (router.adminFromWan !== false) {
      safe(`/ip firewall filter remove [find where comment="HotspotPro block WinBox from customers"]`, true);
      safe(`/ip firewall filter add chain=input action=drop in-interface=hotspotpro-bridge protocol=tcp dst-port=8291 comment="HotspotPro block WinBox from customers" place-before=0`, true, "Customers cannot open WinBox");
    }
    if (!input.existing) {
      // A new MikroTik ships with its ethernet ports already inside the factory bridge. A port can only
      // be in one bridge, so take each one out, then add it to ours. The internet port and the free
      // last port stay out. The count is whatever this router actually has.
      if (!autoLast) {
        for (const port of ["ether1", "ether2", "ether3", "ether4", "ether5"].filter((p) => p !== wan && p !== mgmt)) keepPort(port);
      }
      const skipWan = wan.replace(/[^A-Za-z0-9._-]/g, "") || "ether1";
      const skipMgmt = !autoLast && mgmt ? ` && $n != "${mgmt.replace(/[^A-Za-z0-9._-]/g, "")}"` : "";
      add(`:do { :foreach p in=[/interface ethernet find] do={ :local n [/interface ethernet get $p name]; :if ($n != "${skipWan}"${skipMgmt} && $n != $hpLast && $n != $hpKeep) do={ :do { /interface bridge port remove [find where interface=$n] } on-error={ }; :do { /interface bridge port add bridge=hotspotpro-bridge interface=$n comment="HotspotPro" } on-error={ } } } } on-error={ }`);
      say("Ethernet ports added to the hotspot bridge.");
    }
    // The factory firewall only lets "LAN" interfaces talk to the router (DHCP, DNS, login page).
    safe(`/interface list member add list=LAN interface=hotspotpro-bridge`, true);
    say(`Assigning gateway ${plan.gateway}...`);
    safe(`/ip address add address=${plan.gateway}/${plan.prefix} interface=hotspotpro-bridge comment="HotspotPro"`, true);
    safe(`/ip address set [find where comment="HotspotPro" interface=hotspotpro-bridge] address=${plan.gateway}/${plan.prefix}`, false, "Gateway IP assigned");
    say("Creating the address pool...");
    add(`:do { :if ([:len [/ip pool find where name=hotspotpro-pool]] = 0) do={ /ip pool add name=hotspotpro-pool ranges=${plan.poolFrom}-${plan.poolTo}; :put "Address pool created" } else={ /ip pool set [find where name=hotspotpro-pool] ranges=${plan.poolFrom}-${plan.poolTo}; :put "Address pool kept" } } on-error={ :set hpFails ($hpFails + 1); :put "HotspotPro: address pool step skipped" }`);
    say("Creating the DHCP server...");
    // Phones must use this router for DNS. A public DNS address lets them reach the internet check and the login page never opens.
    add(`:do { :if ([:len [/ip dhcp-server network find where comment="HotspotPro"]] = 0) do={ /ip dhcp-server network add address=${plan.network} gateway=${plan.gateway} dns-server=${plan.gateway} comment="HotspotPro"; :put "DHCP network created" } else={ /ip dhcp-server network set [find where comment="HotspotPro"] address=${plan.network} gateway=${plan.gateway} dns-server=${plan.gateway}; :put "DHCP network kept" } } on-error={ :set hpFails ($hpFails + 1); :put "HotspotPro: DHCP network step skipped" }`);
    add(`:do { :if ([:len [/ip dhcp-server find where name=hotspotpro-dhcp]] = 0) do={ /ip dhcp-server add name=hotspotpro-dhcp interface=hotspotpro-bridge address-pool=hotspotpro-pool disabled=no; :put "DHCP server created" } else={ /ip dhcp-server set [find where name=hotspotpro-dhcp] interface=hotspotpro-bridge address-pool=hotspotpro-pool disabled=no; :put "DHCP server kept" } } on-error={ :set hpFails ($hpFails + 1); :put "HotspotPro: DHCP server step skipped" }`);
    say("Adding the internet sharing rule...");
    add(`:do { :if ([:len [/ip firewall nat find where comment="HotspotPro NAT"]] = 0) do={ /ip firewall nat add chain=srcnat out-interface=${wan} action=masquerade comment="HotspotPro NAT"; :put "Internet sharing rule added" } else={ /ip firewall nat set [find where comment="HotspotPro NAT"] out-interface=${wan} action=masquerade; :put "Internet sharing rule kept" } } on-error={ :set hpFails ($hpFails + 1); :put "HotspotPro: NAT step skipped" }`);
    // One mode at a time. Cloud asks RADIUS. Local does not, and the check-in copies vouchers onto the router instead.
    const useCloud = router.loginMode === "cloud" && !!radius;
    say("Creating the hotspot server...");
    const loginName = loginDnsFromName(router.name, router.dnsName);
    // Upsert profile + server. Never remove a live hotspot — that signs everyone out.
    add(
      `:do { :if ([:len [/ip hotspot profile find where name=hotspotpro]] = 0) do={ /ip hotspot profile add name=hotspotpro hotspot-address=${plan.gateway} trial-uptime-limit=0s ${useCloud ? "use-radius=yes radius-accounting=yes radius-interim-update=1m" : "use-radius=no"}; :put "Hotspot profile created" } else={ /ip hotspot profile set [find where name=hotspotpro] hotspot-address=${plan.gateway} trial-uptime-limit=0s ${useCloud ? "use-radius=yes radius-accounting=yes radius-interim-update=1m" : "use-radius=no"}; :put "Hotspot profile updated" } } on-error={ :set hpFails ($hpFails + 1); :log warning "HotspotPro step failed: hotspot profile"; :put "HotspotPro: could not create the hotspot profile" }`,
    );
    safe(`/ip hotspot profile set [find where name=hotspotpro] dns-name=${q(loginName)} login-by=http-pap,mac-cookie`, true);
    add(
      `:do { :if ([:len [/ip hotspot find where name=hotspotpro]] = 0) do={ /ip hotspot add name=hotspotpro interface=hotspotpro-bridge address-pool=hotspotpro-pool profile=hotspotpro disabled=no; :put "Hotspot server created" } else={ /ip hotspot set [find where name=hotspotpro] interface=hotspotpro-bridge address-pool=hotspotpro-pool profile=hotspotpro disabled=no; :put "Hotspot server kept online" } } on-error={ :set hpFails ($hpFails + 1); :log warning "HotspotPro step failed: hotspot server"; :put "HotspotPro: CRITICAL — hotspot server was not created. Captive portal will not open until IP → Hotspot → Servers shows hotspotpro." }`,
    );
    add(
      `:do { :if ([:len [/ip hotspot find where name=hotspotpro]] = 0) do={ :set hpFails ($hpFails + 1); :put "HotspotPro: CRITICAL — IP → Hotspot → Servers is still empty" } else={ :put "HotspotPro: hotspot server is ready (Servers shows hotspotpro)" } } on-error={ }`,
    );
    // One phone per MAC. Shared users stay at 1 unless a package on the site says more.
    safe(`/ip hotspot set [find where name=hotspotpro] disabled=no addresses-per-mac=1`, true);
    // Bypass bindings let phones skip the voucher page — clear them on every setup / reprovision.
    safe(`/ip hotspot ip-binding remove [find where type=bypassed]`, true, "Removed hotspot bypass bindings");
    // Never kick people already online: no active/cookie wipe on reprovision.
    say("Keeping customers who are already online...");
    safe(`/ip dns static remove [find where comment="HotspotPro login"]`, true);
    safe(`/ip dns static add name=${q(loginName)} address=${plan.gateway} comment="HotspotPro login"`, true, "Login name points at this router");
    safe(`/ip firewall nat remove [find where comment="HotspotPro DNS"]`, true);
    safe(`/ip firewall nat add chain=dstnat in-interface=hotspotpro-bridge protocol=udp dst-port=53 action=redirect to-ports=53 comment="HotspotPro DNS"`, false, "Customer DNS stays on this router");
    safe(`/ip firewall nat add chain=dstnat in-interface=hotspotpro-bridge protocol=tcp dst-port=53 action=redirect to-ports=53 comment="HotspotPro DNS"`, true);
    say("Creating hotspot user profiles...");
    // When time/data ends: clear cookie + drop WiFi so tapping the saved network opens the portal again.
    for (const line of hotspotReauthEnsureLines()) add(line);
    safe(`/ip hotspot user profile set [find where name=default] shared-users=1 session-timeout=0s idle-timeout=none keepalive-timeout=none mac-cookie-timeout=1d on-logout=hotspotpro-logout`, false, "Default profile allows one device");
    if (radius) {
      say("Configuring RADIUS login...");
      // RouterOS asks this server whether each voucher may get online (time, data and speed limits come back in the answer).
      const target = radiusTarget(radius.host);
      const secret = q(radius.secret);
      const ports = `authentication-port=${radius.authPort} accounting-port=${radius.acctPort}`;
      if (target.ip) {
        safe(`/radius add service=hotspot address=${target.ip} secret=${secret} ${ports} timeout=3s comment="HotspotPro"`, false, "RADIUS server added");
      } else if (target.name) {
        add(`:local hpRad ""`);
        add(`:do { :set hpRad [/resolve ${q(target.name)}] } on-error={ :set hpFails ($hpFails + 1); :log warning "HotspotPro step failed: could not resolve the RADIUS server"; :put "HotspotPro could not find the RADIUS server name. Setup continues." }`);
        safe(`/radius add service=hotspot address=$hpRad secret=${secret} ${ports} timeout=3s comment="HotspotPro"`, false, "RADIUS server added");
      }
    } else if (router.loginMode === "cloud") {
      say("Vouchers stay in HotspotPro and are sent to this router.");
    } else {
      say("Vouchers are stored on this router.");
    }
    // Login pages go on the router either way. Cloud and local both send the phone to the same portal.
    // Do NOT run /ip hotspot reset-html — it asks "Current html pages will be lost? [y/N]" in the
    // terminal and stops a pasted setup. We clear old pages and download HotspotPro's captive portal instead.
    const tls = origin.startsWith("https:") ? " check-certificate=no" : "";
    say("Installing the HotspotPro captive portal...");
    // Do not set html-directory yet — pointing at flash/hotspot before HotspotPro pages land serves MikroTik's factory portal.
    // Remove MikroTik defaults (and any previous HotspotPro pages) so fetch can write ours.
    for (const page of ["login.html", "rlogin.html", "alogin.html", "error.html", "logout.html", "redirect.html", "status.html", "md5.js", "css/hotspotpro.css"]) {
      safe(`/file remove [find where name=($hpDir . "/${page}")]`, true);
      safe(`/file remove [find where name="hotspot/${page}"]`, true);
      safe(`/file remove [find where name="flash/hotspot/${page}"]`, true);
    }
    say("Downloading the captive portal pages...");
    const pull = (page: string, dest: string, quiet: boolean, done?: string) => {
      safe(`/file remove [find where name=${dest}]`, true);
      safe(`/tool fetch url="${origin}/api/provision/${token}/${page}" dst-path=${dest}${tls}`, quiet, done);
    };
    for (const page of ["login.html", "rlogin.html", "alogin.html", "error.html", "logout.html", "redirect.html", "status.html", "md5.js"]) {
      pull(page, `($hpDir . "/${page}")`, false, `Downloaded ${page}`);
      pull(page, `("hotspot/${page}")`, true);
      pull(page, `("flash/hotspot/${page}")`, true);
    }
    pull("hotspotpro.css", `($hpDir . "/css/hotspotpro.css")`, true, "Downloaded the skin stylesheet");
    pull("hotspotpro.css", `("hotspot/css/hotspotpro.css")`, true);
    pull("hotspotpro.css", `("flash/hotspot/css/hotspotpro.css")`, true);
    const loginUrl = `${origin}/api/provision/${token}/login.html`;
    const rloginUrl = `${origin}/api/provision/${token}/rlogin.html`;
    // Require the HotspotPro marker — MikroTik's factory login.html also has link-login-only.
    add(`:do { :local hpTry 0; :local hpBody ""; :while ($hpTry < 4) do={ :do { :set hpBody [/file get [find where name=($hpDir . "/login.html")] contents] } on-error={ }; :if ([:typeof [:find $hpBody "${PORTAL_MARKER}"]] = "num") do={ :set hpTry 4; :put "Your HotspotPro login page is on the router." } else={ :do { /file remove [find where name=($hpDir . "/login.html")] } on-error={ }; :do { /file remove [find where name="hotspot/login.html"] } on-error={ }; :do { /file remove [find where name="flash/hotspot/login.html"] } on-error={ }; :do { /tool fetch url="${loginUrl}" dst-path=($hpDir . "/login.html")${tls} } on-error={ }; :do { /tool fetch url="${loginUrl}" dst-path="hotspot/login.html"${tls} } on-error={ }; :do { /tool fetch url="${loginUrl}" dst-path="flash/hotspot/login.html"${tls} } on-error={ }; :set hpTry ($hpTry + 1); :delay 4s; :put "HotspotPro is downloading your login page again..." } } } on-error={ }`);
    add(`:do { :local hpTry 0; :local hpBody ""; :while ($hpTry < 4) do={ :do { :set hpBody [/file get [find where name=($hpDir . "/rlogin.html")] contents] } on-error={ }; :if ([:typeof [:find $hpBody "${PORTAL_MARKER}"]] = "num") do={ :set hpTry 4; :put "Downloaded HotspotPro rlogin.html" } else={ :do { /file remove [find where name=($hpDir . "/rlogin.html")] } on-error={ }; :do { /file remove [find where name="hotspot/rlogin.html"] } on-error={ }; :do { /file remove [find where name="flash/hotspot/rlogin.html"] } on-error={ }; :do { /tool fetch url="${rloginUrl}" dst-path=($hpDir . "/rlogin.html")${tls} } on-error={ }; :do { /tool fetch url="${rloginUrl}" dst-path="hotspot/rlogin.html"${tls} } on-error={ }; :do { /tool fetch url="${rloginUrl}" dst-path="flash/hotspot/rlogin.html"${tls} } on-error={ }; :set hpTry ($hpTry + 1); :delay 4s; :put "HotspotPro is downloading your login page again..." } } } on-error={ }`);
    // Point the profile again after pages land, and turn off any other hotspot that would serve MikroTik defaults.
    // Prefer flash only when that login.html is HotspotPro's — existence alone can be MikroTik factory HTML.
    add(`:do { :local hpPick "hotspot"; :local hpFlash ""; :do { :set hpFlash [/file get [find where name="flash/hotspot/login.html"] contents] } on-error={ }; :if ([:typeof [:find $hpFlash "${PORTAL_MARKER}"]] = "num") do={ :set hpPick "flash/hotspot" }; :set hpDir $hpPick; /ip hotspot profile set [find where name=hotspotpro] html-directory=$hpDir; :do { /ip hotspot profile set [find where name=hotspotpro] html-directory-override=$hpDir } on-error={ } } on-error={ }`);
    add(`:do { /ip hotspot disable [find where name!="hotspotpro"] } on-error={ }`);
    add(`:do { /ip hotspot enable [find where name=hotspotpro] } on-error={ }`);
    say("The HotspotPro captive portal is in the hotspot folder. Open Files in WinBox to see it.");
    if (input.apiPassword && /^[A-Za-z0-9]{12,32}$/.test(input.apiPassword)) {
      const secret = q(input.apiPassword);
      say("Creating the management login...");
      add(`:do { :if ([:len [/user find where name=hotspotpro]] = 0) do={ /user add name=hotspotpro group=full password=${secret} comment="HotspotPro" } else={ /user set [find where name=hotspotpro] password=${secret} }; /ip service set api port=8728 available-from=192.168.88.0/24 disabled=no; :put "API user created: hotspotpro" } on-error={ :put "HotspotPro: the management login step had a problem and was skipped. Setup continues." }`);
    }
    // Disconnect / Reconnect support for the whole router (see internetSwitchCommands).
    for (const command of internetSwitchCommands(origin, token)) safe(command, command.includes(" remove "));
    // Before a customer has logged in, the router blocks everything except the portal. An IP rule covers
    // HTTPS (the name-only walled garden is HTTP). The name rule covers the case where the address changes.
    const seenGarden = new Set<string>();
    const garden = (name: string) => {
      if (!name || LOOPBACK.test(name) || seenGarden.has(name)) return;
      seenGarden.add(name);
      for (const ip of ipv4sOf(name)) {
        if (LOOPBACK.test(ip) || seenGarden.has(`ip:${ip}`)) continue;
        seenGarden.add(`ip:${ip}`);
        safe(`/ip hotspot walled-garden ip add action=accept dst-address=${ip} comment="HotspotPro"`);
      }
      if (!IPV4.test(name)) safe(`/ip hotspot walled-garden add dst-host=${q(name)} comment="HotspotPro"`);
    };
    say("Allowing the login page before a customer has paid...");
    garden(host);
    try { garden(new URL(portalBase).hostname); } catch { /* portal address was not a URL */ }
    say("Configuring firewall rules...");
    say("Configuring tethering protection...");
    safe(`/ip firewall mangle remove [find where comment="HotspotPro tethering"]`, true);
    safe(`/ip firewall mangle add chain=postrouting action=change-ttl new-ttl=set:1 passthrough=yes out-interface=hotspotpro-bridge comment="HotspotPro tethering"`, false, "Tethering protection enabled");
    say("Login page access is set.");
    say("The check-in is scheduled.");
    say("Final check, turning the services on...");
    safe(`/ip dhcp-server enable [find where name=hotspotpro-dhcp]`, true, "DHCP server enabled");
    safe(`/ip hotspot enable [find where name=hotspotpro]`, true, "Hotspot server enabled");
  }

  if (router.pppoeEnabled) {
    const pppoe = planNetwork(router.pppoeNetwork || "192.168.91.0/24", undefined);
    add(`# --- PPPoE network ${pppoe.network}`);
    say("Configuring PPPoE...");
    safe(`/ip pool remove [find where name=hotspotpro-pppoe-pool]`, true);
    safe(`/ppp profile remove [find where name=hotspotpro-pppoe]`, true);
    safe(`/interface pppoe-server server remove [find where service-name=hotspotpro]`, true);
    safe(`/ip pool add name=hotspotpro-pppoe-pool ranges=${pppoe.poolFrom}-${pppoe.poolTo}`, false, "PPPoE address pool created");
    safe(`/ppp profile add name=hotspotpro-pppoe local-address=${pppoe.gateway} remote-address=hotspotpro-pppoe-pool dns-server=${pppoe.gateway} change-tcp-mss=yes only-one=yes`, false, "PPPoE profile created");
    safe(`/ppp aaa set use-radius=${router.loginMode === "cloud" && !!radius ? "yes" : "no"}`, true);
    safe(`/interface pppoe-server server add service-name=hotspotpro interface=hotspotpro-bridge default-profile=hotspotpro-pppoe authentication=pap,chap,mschap2 one-session-per-host=yes disabled=no`, false, "PPPoE server started");
  }

  // Always attach WiFi to the hotspot bridge when wireless is on — including Existing Router
  // reprovision — otherwise joining the SSID never shows the voucher portal.
  // Run inline (not :execute) so datapath.bridge is set before the paste finishes.
  if (input.wireless) {
    const wifiName = (ssid && ssid.trim()) || loginDnsFromName(router.name) || "HotspotPro";
    add(`# --- WiFi`);
    say("Configuring wireless interfaces for the captive portal...");
    const band = wifiName.replace(/\s+5G$/i, "").slice(0, 29);
    const ssid24 = q(band.slice(0, 32));
    const ssid5 = q(`${band} 5G`.slice(0, 32));
    add(`:do { :local hpWifi 0; :do { :set hpWifi [:len [/interface wifi find]] } on-error={ }; :if ($hpWifi > 0) do={ :put "Found RouterOS 7 wifi interfaces, configuring..."; :do { /interface wifi configuration set [find] ssid=${ssid24} mode=ap } on-error={ }; :do { /interface wifi set [find where name=wifi1] disabled=no configuration.ssid=${ssid24} configuration.mode=ap security.authentication-types="" datapath.bridge=hotspotpro-bridge } on-error={ }; :do { /interface wifi set [find where name=wifi2] disabled=no configuration.ssid=${ssid5} configuration.mode=ap security.authentication-types="" datapath.bridge=hotspotpro-bridge } on-error={ }; :do { :foreach p in=[/interface wifi find] do={ :local n [/interface wifi get $p name]; :if ($n != "wifi1" && $n != "wifi2" && $n != $hpKeep) do={ /interface wifi set $p disabled=no configuration.ssid=${ssid24} configuration.mode=ap security.authentication-types="" datapath.bridge=hotspotpro-bridge } } } on-error={ } } } on-error={ }`);
    add(`:do { :foreach p in=[/interface wifiwave2 find] do={ :do { /interface wifiwave2 set $p disabled=no configuration.ssid=${ssid24} configuration.mode=ap security.authentication-types="" datapath.bridge=hotspotpro-bridge } on-error={ } } } on-error={ }`);
    add(`:do { /interface wireless security-profiles set [find default=yes] mode=none } on-error={ }`);
    add(`:do { /interface wireless set [find where name=wlan1] disabled=no ssid=${ssid24} mode=ap-bridge security-profile=default } on-error={ }`);
    add(`:do { /interface wireless set [find where name=wlan2] disabled=no ssid=${ssid5} mode=ap-bridge security-profile=default } on-error={ }`);
    // ROS7 wifi: datapath.bridge only. Also remove factory bridge ports so WiFi is not free internet.
    add(`:do { :foreach p in=[/interface wifi find] do={ :local n [/interface wifi get $p name]; :if ($n != $hpKeep) do={ :do { /interface bridge port remove [find where interface=$n] } on-error={ } } } } on-error={ }`);
    add(`:do { :foreach p in=[/interface wifiwave2 find] do={ :local n [/interface wifiwave2 get $p name]; :if ($n != $hpKeep) do={ :do { /interface bridge port remove [find where interface=$n] } on-error={ } } } } on-error={ }`);
    add(`:do { :foreach p in=[/interface wireless find] do={ :local n [/interface wireless get $p name]; :if ($n != $hpKeep) do={ :do { /interface bridge port remove [find where interface=$n] } on-error={ }; :do { /interface bridge port add bridge=hotspotpro-bridge interface=$n comment="HotspotPro" } on-error={ } } } } on-error={ }`);
    add(`:do { /interface wifi enable [find] } on-error={ }`);
    add(`:do { /interface wifiwave2 enable [find] } on-error={ }`);
    add(`:do { /interface wireless enable [find] } on-error={ }`);
    for (const name of ["wifi1", "wifi2", "wlan1", "wlan2"]) keepPort(name);
    say("WiFi is set. Customers log in on the portal page.");
  } else if (!input.wireless) {
    say("Wireless setup skipped. This router is using its LAN ports.");
  }

  if (router.hotspotEnabled !== false) {
    // Close factory NAT / DHCP / IPv6 leaks that otherwise give free internet past the hotspot.
    say("Closing free-internet paths past the captive portal...");
    safe(`/ip hotspot set [find where name=hotspotpro] interface=hotspotpro-bridge disabled=no addresses-per-mac=1`, true);
    // Only disable defconf/empty-comment masquerade — keep HotspotPro* NAT (including Multi-WAN).
    safe(`/ip firewall nat disable [find where chain=srcnat action=masquerade comment=""]`, true);
    safe(`/ip firewall nat disable [find where chain=srcnat action=masquerade comment~"defconf"]`, true, "Factory NAT disabled so only hotspot shares internet");
    safe(`/ip firewall nat enable [find where comment~"HotspotPro"]`, true);
    safe(`/ip dhcp-server disable [find where name!="hotspotpro-dhcp" && name!="hotspotpro-admin-dhcp"]`, true, "Factory DHCP disabled");
    safe(`/ip dhcp-server enable [find where name="hotspotpro-dhcp"]`, true);
    add(`:do { /ipv6 settings set disable-ipv6=yes; :put "IPv6 disabled so phones cannot bypass the voucher page" } on-error={ }`);
    add(`:do { :if ([:len [/ipv6 firewall filter find where comment="HotspotPro no IPv6"]] = 0) do={ /ipv6 firewall filter add chain=forward action=drop in-interface=hotspotpro-bridge comment="HotspotPro no IPv6" } } on-error={ }`);
  }

  add(`# --- Self-check: is the ISP port working?`);
  say("Checking the internet...");
  add(`:do { :local n 0; :while ($n < 10 && [/ip dhcp-client get [find where interface=${wan}] status] != "bound") do={ :delay 2s; :set n ($n + 1) }; :if ([/ip dhcp-client get [find where interface=${wan}] status] != "bound") do={ :set hpWan "down"; :put "The internet cable on ${wan} has no address from your ISP yet. Check the cable and modem."; :log warning "HotspotPro: the ISP port ${wan} has no address from your ISP yet. Check the cable and modem on ${wan}." } else={ :put "Internet port ${wan} has an address." } } on-error={ }`);
  add(`:do { :if ($hpWan = "") do={ :if ([/ping 8.8.8.8 count=3] = 0) do={ :set hpNet "down"; :put "The router cannot reach the internet yet. Customers will not get online until it works."; :log warning "HotspotPro: the router cannot reach the internet (ping 8.8.8.8 failed). Customers will not get online until it works." } else={ :put "The router can reach the internet." } } } on-error={ }`);
  add(`# --- Tell HotspotPro this router finished setting up`);
  say("Telling HotspotPro this router is ready...");
  const reportTls = origin.startsWith("https:") ? " check-certificate=no" : "";
  add(`:do { :local hpTry 0; :while ($hpTry < 4) do={ :do { /tool fetch url=(${q(`${origin}/api/provision/${token}/done?failed=`)} . $hpFails . "&dm=" . $hpDm . "&wan=" . $hpWan . "&net=" . $hpNet) keep-result=no${reportTls}; :set hpTry 4; :put "HotspotPro received this router." } on-error={ :set hpTry ($hpTry + 1); :delay 8s; :put "HotspotPro is reaching the site again..." } } } on-error={ :put "HotspotPro could not be told that setup finished. The router is still configured."; :log warning "HotspotPro could not report back to the server" }`);
  if (router.hotspotEnabled !== false) safe(`/system script run hotspotpro-control`, true);
  add(`:log info ("HotspotPro provisioning finished, steps failed: " . $hpFails)`);
  say("==========================================");
  say("HotspotPro setup is complete.");
  say("==========================================");
  say("Your hotspot is configured and ready.");
  say("Customers who connect are sent to your login page.");
  if (hotspotNetwork) say(`Hotspot network: ${hotspotNetwork}`);
  if (hotspotGateway) say(`Gateway: ${hotspotGateway}`);
  say("Thank you for using our system.");
  say("Continue to create a package and a voucher to enjoy this service.");
  say("==========================================");
  add(`:if ($hpFails > 0) do={ :put ("HotspotPro finished with " . $hpFails . " step(s) skipped. Look in the router log for HotspotPro step failed.") }`);
  add(`:global hpSetup "${SETUP_VERSION}"`);
  return lines.join("\n") + "\n";
}
