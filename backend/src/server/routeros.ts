// Builds the RouterOS (MikroTik) script a router downloads from
//   /api/provision/<token>
// WAN DHCP, hotspot LAN, DHCP server, hotspot service, walled garden, the
// captive-portal pages, and optional WiFi. Safe to run again: pieces this
// script owns are removed and recreated, so a second run does not stack
// duplicate NAT / RADIUS / hotspot entries.

import dns from "node:dns";

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

function rosQuoted(source: string) {
  return `"${source.replace(/\\/g, "\\\\").replace(/"/g, '\\"').replace(/\$/g, "\\$")}"`;
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
  return `:local hpCpu 0; :local hpFree 0; :local hpTotal 1; :local hpUp ""; :local hpVer ""; :local hpArch ""; :local hpCpuN ""; :local hpActive 0; :local hpUsers ""; :local hpCount 0; :local hpDns ""; :local hpPub ""; :local hpWan ""; :do { :set hpCpu [/system resource get cpu-load] } on-error={ }; :do { :set hpFree [/system resource get free-memory] } on-error={ }; :do { :set hpTotal [/system resource get total-memory] } on-error={ }; :do { :set hpUp [/system resource get uptime] } on-error={ }; :do { :set hpVer [/system resource get version]; :set hpVer [:pick $hpVer 0 [:find $hpVer " "]] } on-error={ }; :do { :set hpArch [/system resource get architecture-name] } on-error={ }; :do { :set hpCpuN [/system resource get cpu-count] } on-error={ }; :do { :set hpActive [:len [/ip hotspot active find]] } on-error={ }; :do { :foreach i in=[/ip hotspot active find] do={ :if ($hpCount < 12) do={ :set hpUsers ($hpUsers . "," . [/ip hotspot active get $i user]); :set hpCount ($hpCount + 1) } } } on-error={ }; :do { :set hpDns [/ip cloud get dns-name] } on-error={ }; :do { :set hpPub [/ip cloud get public-address] } on-error={ }; :do { :set hpWan [/ip dhcp-client get [find where comment="HotspotPro WAN DHCP Client"] address]; :if ([:find $hpWan "/"] >= 0) do={ :set hpWan [:pick $hpWan 0 [:find $hpWan "/"]] } } on-error={ }; :local hpUrl "${url}"; :set hpUrl ($hpUrl . "?cpu=" . $hpCpu . "&free=" . $hpFree . "&total=" . $hpTotal . "&up=" . $hpUp . "&ver=" . $hpVer . "&arch=" . $hpArch . "&cpus=" . $hpCpuN . "&active=" . $hpActive . "&users=" . $hpUsers . "&dns=" . $hpDns . "&pub=" . $hpPub . "&wanip=" . $hpWan); :do { /tool fetch url=$hpUrl dst-path=hotspotpro-control.rsc${tls}; :delay 2s; /import file-name=hotspotpro-control.rsc } on-error={ }`;
}

/** Open or close WinBox from outside the shop. Off keeps it on the admin port only. */
export function remoteWinboxLines(enabled: boolean, origin: string, token: string): string[] {
  if (!enabled) {
    return [
      `:do { /ip firewall filter remove [find where comment="HotspotPro remote WinBox"] } on-error={ }`,
      `:do { /ip service set winbox address=192.168.88.0/24 disabled=no } on-error={ }`,
      `:do { :if ([/ip cloud get back-to-home-vpn] = "enabled") do={ /ip cloud set back-to-home-vpn=revoked-and-disabled } } on-error={ }`,
    ];
  }
  const lines = [
    `:do { /ip cloud set ddns-enabled=yes } on-error={ }`,
    `:do { :if ([/ip cloud get back-to-home-vpn] != "enabled") do={ /ip cloud set back-to-home-vpn=enabled } } on-error={ }`,
    `:do { /ip service set winbox address=0.0.0.0/0 disabled=no } on-error={ }`,
    `:do { :if ([:len [/ip firewall filter find where comment="HotspotPro remote WinBox"]] = 0) do={ /ip firewall filter add chain=input action=accept protocol=tcp dst-port=8291 comment="HotspotPro remote WinBox" place-before=0 } } on-error={ }`,
  ];
  if (origin) {
    const tls = origin.startsWith("https:") ? " check-certificate=no" : "";
    const post = `${origin}/api/provision/${token}/winbox`;
    lines.push(`:do { :global hpWgSent; :local hpWg ""; :do { :set hpWg [/ip cloud get vpn-wireguard-client-config] } on-error={ }; :if ([:len $hpWg] > 20 && $hpWgSent != $hpWg) do={ :do { /tool fetch url="${post}" http-method=post http-data=$hpWg keep-result=no${tls}; :set hpWgSent $hpWg } on-error={ } } } on-error={ }`);
  }
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
    `/system scheduler add name=hotspotpro-control interval=10s start-time=startup on-event=hotspotpro-control policy=ftp,reboot,read,write,policy,test comment="HotspotPro"`,
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
  say("==========================================");
  say("HotspotPro setup is starting...");
  say("==========================================");
  say("Checking the router mode...");
  // Home mode (RouterOS 7) blocks the download and the 30-second check-in. Switch to advanced first.
  // The router does not apply that until someone presses reset or power-cycles it, so setup stops here and waits.
  add(`:do { :local hpMode [/system device-mode get mode]; :local dmF [/system device-mode get fetch]; :local dmS [/system device-mode get scheduler]; :if ($hpMode = "home" || !$dmF || !$dmS) do={ :set hpDm "blocked"; :log warning "HotspotPro: device-mode is home, or downloads are off. Switching to advanced. Press the reset button briefly, or switch the power off and on, within 5 minutes. Then run the HotspotPro command again."; /system device-mode update mode=advanced fetch=yes scheduler=yes } } on-error={ }`);
  add(`:if ($hpDm = "blocked") do={ :put "HotspotPro stopped. This router is still in home mode. Paste the device-mode command, press reset or power-cycle within 5 minutes, then paste the device-mode command again before the configuration command."; :error "device-mode" }`);
  say("Router mode is fine. Continuing.");
  const wan = wanOf(router);
  const mgmt = mgmtOf(router);

  // MikroTik sends this name as NAS-Identifier on every RADIUS packet. Accounting and Disconnect match the router by it.
  say("Setting the router name...");
  safe(`/system identity set name=${q(router.name)}`, false, "Router name set");

  // WAN
  // The ISP port gets its address by DHCP (ether1 unless the owner chose another port).
  // A new MikroTik keeps that port inside the factory bridge, and a DHCP client on a bridge port never gets an address.
  say(`Setting the internet port ${wan}...`);
  if (!input.existing) safe(`/interface bridge port remove [find where interface=${wan}]`, true);
  safe(`/ip dhcp-client add interface=${wan} disabled=no use-peer-dns=yes use-peer-ntp=yes add-default-route=yes comment="HotspotPro WAN DHCP Client"`, true, `DHCP client added on ${wan}`);
  safe(`/ip dhcp-client set [find where interface=${wan}] disabled=no use-peer-dns=yes use-peer-ntp=yes add-default-route=yes`, false, `DHCP client is on ${wan}`);
  say("Configuring DNS...");
  safe(`/ip dns set allow-remote-requests=yes servers=8.8.8.8,1.1.1.1`, false, "DNS configured");
  // Voucher time limits depend on the router's clock.
  say("Setting the clock...");
  safe(`/system ntp client set enabled=yes`, true);
  safe(`/system ntp client servers add address=pool.ntp.org`, true, "Clock service turned on");
  // The login pages and the "I'm finished" call need this port to have an address first.
  if (!input.existing) {
    say(`Waiting for the internet cable on ${wan}...`);
    add(`:do { :local hpWait 0; :while ($hpWait < 8 && [/ip dhcp-client get [find where interface=${wan}] status] != "bound") do={ :delay 2s; :set hpWait ($hpWait + 1) } } on-error={ }`);
    say("Internet port checked.");
  }

  if (router.adminFromWan === true) {
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
    add(`:do { :if ([:len [/ip firewall filter find where comment="HotspotPro WinBox from ISP network"]] = 0) do={ /ip firewall filter add chain=input action=accept in-interface=${wan} src-address-list=hotspotpro-private protocol=tcp dst-port=8291 comment="HotspotPro WinBox from ISP network" } } on-error={ :set hpFails ($hpFails + 1); :log warning "HotspotPro step failed: WinBox firewall rule" }`);
    safe(`/interface list add name=hotspotpro-admin include=LAN`, true);
    safe(`/interface list member add list=hotspotpro-admin interface=${wan}`, true);
    safe(`/tool mac-server set allowed-interface-list=hotspotpro-admin`, true);
    safe(`/tool mac-server mac-winbox set allowed-interface-list=hotspotpro-admin`, true);
    safe(`/ip neighbor discovery-settings set discover-interface-list=hotspotpro-admin`, true);
    say("WinBox access from the private network is set.");
  }

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
    const dns = (router.hotspotDnsServers || "8.8.8.8,8.8.4.4").replace(/[^0-9.,]/g, "");
    if (mgmt && !input.existing) {
      // Your computer keeps its own small network, outside the hotspot. A factory-default router already has one
      // (192.168.88.1/24); a blank router gets one now. Either way this port is never touched, so you never lose the connection.
      add(`# --- Admin port ${mgmt}: stays outside the hotspot (your computer)`);
      say(`Keeping ${mgmt} as the admin port for your computer...`);
      add(`:do { :if ([:len [/ip address find where address="192.168.88.1/24"]] = 0) do={ /interface bridge add name=hotspotpro-admin comment="HotspotPro admin"; /interface bridge port remove [find where interface=${mgmt}]; /interface bridge port add bridge=hotspotpro-admin interface=${mgmt} comment="HotspotPro admin"; /ip address add address=192.168.88.1/24 interface=hotspotpro-admin comment="HotspotPro admin"; /ip pool add name=hotspotpro-admin-pool ranges=192.168.88.10-192.168.88.60; /ip dhcp-server network add address=192.168.88.0/24 gateway=192.168.88.1 dns-server=192.168.88.1 comment="HotspotPro admin"; /ip dhcp-server add name=hotspotpro-admin-dhcp interface=hotspotpro-admin address-pool=hotspotpro-admin-pool disabled=no; /interface list member add list=LAN interface=hotspotpro-admin; :put "Admin port ${mgmt} is ready." } else={ :put "Admin port ${mgmt} was already set." } } on-error={ :set hpFails ($hpFails + 1); :log warning "HotspotPro step failed: admin port setup"; :put "HotspotPro: the admin port step had a problem and was skipped. Setup continues." }`);
    }
    add(`# --- Hotspot network ${plan.network} (these pieces are replaced if the script is run again)`);
    say(`Preparing the hotspot network ${plan.network}...`);
    for (const command of [
      `/ip hotspot remove [find where name=hotspotpro]`,
      `/ip hotspot profile remove [find where name=hotspotpro]`,
      `/ip dhcp-server remove [find where name=hotspotpro-dhcp]`,
      `/ip dhcp-server network remove [find where comment="HotspotPro"]`,
      `/ip pool remove [find where name=hotspotpro-pool]`,
      `/ip address remove [find where comment="HotspotPro" interface=hotspotpro-bridge]`,
      `/ip firewall nat remove [find where comment="HotspotPro NAT"]`,
      `/radius remove [find where comment="HotspotPro"]`,
      `/ip hotspot walled-garden ip remove [find where comment="HotspotPro"]`,
      `/ip hotspot walled-garden remove [find where comment="HotspotPro"]`,
    ]) safe(command, true);
    safe(`/interface bridge add name=hotspotpro-bridge comment="HotspotPro"`, true);
    if (!input.existing) {
      // A new MikroTik ships with ether2-5 already inside its default bridge; a port can only be in one
      // bridge, so take them out of the old one first, then add them to ours. Boards with more ports
      // (ether6+, sfp) are picked up by the loop below.
      for (const port of ["ether1", "ether2", "ether3", "ether4", "ether5"].filter((p) => p !== wan && p !== mgmt)) {
        safe(`/interface bridge port remove [find where interface=${port}]`, true);
        // Quiet: a board with fewer ports does not have ether4 or ether5, and that is not a failed setup.
        safe(`/interface bridge port add bridge=hotspotpro-bridge interface=${port} comment="HotspotPro"`, true);
      }
      const skipWan = wan.replace(/[^A-Za-z0-9._-]/g, "") || "ether1";
      const skipMgmt = mgmt.replace(/[^A-Za-z0-9._-]/g, "");
      const notMgmt = skipMgmt ? ` && $n != "${skipMgmt}"` : "";
      add(`:do { :foreach p in=[/interface ethernet find] do={ :local n [/interface ethernet get $p name]; :if ($n != "${skipWan}"${notMgmt}) do={ :do { /interface bridge port remove [find where interface=$n] } on-error={ }; :do { /interface bridge port add bridge=hotspotpro-bridge interface=$n comment="HotspotPro" } on-error={ } } } } on-error={ }`);
      say("Ethernet ports added to the hotspot bridge.");
    }
    // The factory firewall only lets "LAN" interfaces talk to the router (DHCP, DNS, login page).
    safe(`/interface list member add list=LAN interface=hotspotpro-bridge`, true);
    say(`Assigning gateway ${plan.gateway}...`);
    safe(`/ip address add address=${plan.gateway}/${plan.prefix} interface=hotspotpro-bridge comment="HotspotPro"`, false, "Gateway address assigned");
    say("Creating the address pool...");
    safe(`/ip pool add name=hotspotpro-pool ranges=${plan.poolFrom}-${plan.poolTo}`, false, "Address pool created");
    say("Creating the DHCP server...");
    safe(`/ip dhcp-server network add address=${plan.network} gateway=${plan.gateway} dns-server=${plan.gateway},${dns} comment="HotspotPro"`, false, "DHCP network created");
    safe(`/ip dhcp-server add name=hotspotpro-dhcp interface=hotspotpro-bridge address-pool=hotspotpro-pool disabled=no`, false, "DHCP server created");
    say("Adding the internet sharing rule...");
    safe(`/ip firewall nat add chain=srcnat out-interface=${wan} action=masquerade comment="HotspotPro NAT"`, false, "Internet sharing rule added");
    // One mode at a time. Cloud asks RADIUS. Local does not, and the check-in copies vouchers onto the router instead.
    const useCloud = router.loginMode !== "local" && !!radius;
    say("Creating the hotspot server...");
    safe(`/ip hotspot profile add name=hotspotpro hotspot-address=${plan.gateway} dns-name=${q(router.dnsName || "login.hotspot")} login-by=http-pap,http-chap,mac-cookie trial-uptime-limit=0s${useCloud ? " use-radius=yes radius-accounting=yes radius-interim-update=1m" : " use-radius=no"} html-directory=$hpDir`, false, "Hotspot profile created");
    safe(`/ip hotspot add name=hotspotpro interface=hotspotpro-bridge address-pool=hotspotpro-pool profile=hotspotpro disabled=no`, false, "Hotspot server created");
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
    } else {
      say("Login stays on the router. Cloud RADIUS is not used for this site.");
    }
    // Login pages go on the router either way. Cloud and local both send the phone to the same portal.
    const tls = origin.startsWith("https:") ? " check-certificate=no" : "";
    say("Downloading the captive portal pages...");
    for (const [index, page] of ["login.html", "alogin.html", "error.html", "logout.html", "redirect.html", "status.html"].entries()) {
      const wait = index === 0 ? ":delay 1s; " : "";
      safe(`${wait}/tool fetch url="${origin}/api/provision/${token}/${page}" dst-path=($hpDir . "/${page}")${tls}`, false, `Downloaded ${page}`);
      // Some boards keep files under flash/, others at the top. Put a copy in both so the profile can find it.
      safe(`/tool fetch url="${origin}/api/provision/${token}/${page}" dst-path=("hotspot/${page}")${tls}`, true);
      safe(`/tool fetch url="${origin}/api/provision/${token}/${page}" dst-path=("flash/hotspot/${page}")${tls}`, true);
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
    say("Login page access is set.");
    say("The 30-second check-in is scheduled.");
  }

  if (router.pppoeEnabled) {
    const pppoe = planNetwork(router.pppoeNetwork || "192.168.91.0/24", undefined);
    add(`# --- PPPoE network ${pppoe.network}`);
    say("Configuring PPPoE...");
    safe(`/ip pool add name=hotspotpro-pppoe-pool ranges=${pppoe.poolFrom}-${pppoe.poolTo}`, false, "PPPoE address pool created");
    safe(`/ppp profile add name=hotspotpro-pppoe local-address=${pppoe.gateway} remote-address=hotspotpro-pppoe-pool`, false, "PPPoE profile created");
  }

  if (!input.existing && input.wireless && ssid) {
    add(`# --- WiFi`);
    say("Turning on WiFi...");
    // A router without the wifi package cannot even read /interface wifi. Those commands stay inside a
    // text script so a missing package does not stop the rest of the import.
    const wifiScript = [
      `:do { /interface wifi set [find] disabled=no configuration.ssid=${q(ssid)} configuration.mode=ap } on-error={ }`,
      `:do { /interface wireless security-profiles set [find default=yes] mode=none } on-error={ }`,
      `:do { /interface wireless set [find] disabled=no ssid=${q(ssid)} mode=ap-bridge security-profile=default } on-error={ }`,
      `:do { /interface wifi set [find] security.authentication-types="" datapath.bridge=hotspotpro-bridge } on-error={ }`,
      `:do { :foreach p in=[/interface wifi find] do={ :local n [/interface wifi get $p name]; :do { /interface bridge port remove [find where interface=$n] } on-error={ }; :do { /interface bridge port add bridge=hotspotpro-bridge interface=$n comment="HotspotPro" } on-error={ } } } on-error={ }`,
      `:do { :foreach p in=[/interface wireless find] do={ :local n [/interface wireless get $p name]; :do { /interface bridge port remove [find where interface=$n] } on-error={ }; :do { /interface bridge port add bridge=hotspotpro-bridge interface=$n comment="HotspotPro" } on-error={ } } } on-error={ }`,
    ].join("; ");
    add(`:do { :execute script="${wifiScript.replace(/\\/g, "\\\\").replace(/"/g, '\\"').replace(/\$/g, "\\$")}" } on-error={ }`);
    for (const name of ["wifi1", "wlan1"]) {
      safe(`/interface bridge port remove [find where interface=${name}]`, true);
      safe(`/interface bridge port add bridge=hotspotpro-bridge interface=${name} comment="HotspotPro"`, true);
    }
    say("WiFi is set. Customers log in on the portal page.");
  } else if (!input.wireless) {
    say("Wireless setup skipped. This router is using its LAN ports.");
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
  if (hotspotNetwork) say(`Hotspot network: ${hotspotNetwork}`);
  if (hotspotGateway) say(`Gateway: ${hotspotGateway}`);
  say("Thank you for using our system.");
  say("Continue to create a package and a voucher to enjoy this service.");
  say("==========================================");
  add(`:if ($hpFails > 0) do={ :put ("HotspotPro finished with " . $hpFails . " step(s) skipped. Look in the router log for HotspotPro step failed.") }`);
  // The hotspot is already saved. A newer RouterOS on the router's own update channel is installed last, then the router restarts.
  say("Checking for a newer RouterOS...");
  add(`:do { /system package update check-for-updates } on-error={ :put "HotspotPro could not ask MikroTik for a newer RouterOS. The hotspot setup is already saved." }`);
  add(`:do { :delay 3s; :local hpUp 0; :local hpSt ""; :while ($hpUp < 10) do={ :set hpSt [/system package update get status]; :if ($hpSt != "finding out latest version..." && $hpSt != "please wait..." && $hpSt != "downloading...") do={ :set hpUp 10 }; :delay 2s; :set hpUp ($hpUp + 1) }; :local hpNow [/system package update get installed-version]; :local hpNew [/system package update get latest-version]; :put ("RouterOS " . $hpNow); :if ([:len $hpNew] > 0 && $hpNow != $hpNew) do={ :put ("A newer RouterOS is available: " . $hpNew . ". Installing it now. The router will restart. The hotspot setup is already saved."); /system package update install } else={ :put "RouterOS is already the newest version." } } on-error={ :put "HotspotPro could not install a RouterOS update. The hotspot setup is already saved." }`);
  return lines.join("\n") + "\n";
}
