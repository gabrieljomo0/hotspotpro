// Multi-WAN lines for a MikroTik from the site's mode and ISP links.
// Applied on check-in (when the saved config changes) and when Submit queues a job.
//
// Design:
// - DHCP clients do NOT install their own default route (add-default-route=no).
// - Every check-in syncs default routes from each ISP gateway (static or DHCP lease).
// - Failover uses recursive routes via healthCheckIp + check-gateway=ping.
// - Load balancing uses PCC mangle + per-ISP routing tables (RouterOS v7).

export type IspLink = {
  id?: string;
  label?: string;
  interface: string;
  connectionType?: "DHCP" | "Static";
  gateway?: string;
  dnsServers?: string;
  healthCheckIp?: string;
  allowRemovalFromBridge?: boolean;
};

export type WanMode = "Single WAN" | "Load Balancing" | "Failover" | "Load Balancing + Failover";

const IFACE = /^(ether|sfp|sfp-sfpplus|sfpplus|lte|wlan|wifi|vlan|pppoe-out)[A-Za-z0-9._-]*$/;
const IPV4 = /^(?:(?:25[0-5]|2[0-4]\d|1?\d?\d)\.){3}(?:25[0-5]|2[0-4]\d|1?\d?\d)$/;

function cleanIface(value: string) {
  const name = value.trim();
  return IFACE.test(name) ? name : "";
}

function cleanIp(value: string | undefined) {
  const ip = (value || "").trim();
  return IPV4.test(ip) ? ip : "";
}

type Port = {
  name: string;
  dhcp: boolean;
  gateway: string;
  dns: string;
  check: string;
  fromBridge: boolean;
  distance: number;
};

function normalize(mode: WanMode | string | undefined, links: IspLink[] | undefined, managementPort = ""): Port[] {
  const mgmt = managementPort.replace(/[^A-Za-z0-9._-]/g, "");
  const balancing = mode === "Load Balancing" || mode === "Load Balancing + Failover";
  // Single WAN: only the first usable ISP link is configured on the router.
  const raw = Array.isArray(links) ? (mode === "Single WAN" ? links.slice(0, 1) : links) : [];
  const ports = raw
    .map((link) => ({
      name: cleanIface(link.interface || ""),
      dhcp: (link.connectionType || "DHCP") !== "Static",
      gateway: cleanIp(link.gateway),
      dns: (link.dnsServers || "8.8.8.8,1.1.1.1").replace(/[^0-9.,]/g, "") || "8.8.8.8,1.1.1.1",
      check: cleanIp(link.healthCheckIp) || "8.8.8.8",
      fromBridge: link.allowRemovalFromBridge !== false,
    }))
    .filter((link) => link.name && link.name !== mgmt);

  const unique: Port[] = [];
  const seen = new Set<string>();
  const checks = new Set<string>();
  for (const link of ports) {
    if (seen.has(link.name)) continue;
    seen.add(link.name);
    // Unique probe hosts so recursive /32 routes do not collide across ISPs.
    let check = link.check;
    if (checks.has(check)) {
      check = check === "8.8.8.8" ? "1.1.1.1" : check === "1.1.1.1" ? "8.8.8.8" : `9.9.9.${(unique.length % 200) + 1}`;
      if (checks.has(check)) check = `1.0.0.${(unique.length % 200) + 1}`;
    }
    checks.add(check);
    // Equal distance shares traffic. Rising distance keeps a backup when the primary dies.
    const distance = balancing || unique.length === 0 ? 1 : unique.length + 1;
    unique.push({ ...link, check, distance });
  }
  return unique;
}

/** Stable fingerprint so check-in only rewrites clients/mangle when the owner changed Multi-WAN. */
export function multiWanStamp(mode: WanMode | string | undefined, links: IspLink[] | undefined, managementPort = ""): string {
  const ports = normalize(mode, links, managementPort);
  return `${mode || "Single WAN"}|${ports.map((p) => `${p.name}:${p.dhcp ? "d" : "s"}:${p.gateway}:${p.check}:${p.distance}`).join(",")}`;
}

/** Ensure default + table routes exist from each ISP gateway (runs every check-in). */
function routeSyncLines(ports: Port[], balancing: boolean, failover: boolean): string[] {
  const lines: string[] = [];
  ports.forEach((link, index) => {
    const mark = index + 1;
    const checkGw = failover ? " check-gateway=ping" : "";
    const staticGw = link.gateway ? `"${link.gateway}"` : `""`;
    // Resolve gateway: static from the site, otherwise the DHCP lease for this port.
    lines.push(
      `:do { :local g ${staticGw}; :if ([:len $g] = 0) do={ :do { :set g [/ip dhcp-client get [find where interface=${link.name} comment="HotspotPro WAN"] gateway] } on-error={ } }; :if ([:len $g] > 0) do={ ` +
        `:do { :local p [/ip route find where comment=("HotspotPro WAN probe " . ${mark})]; :if ([:len $p] = 0) do={ /ip route add dst-address=${link.check}/32 gateway=$g scope=10 comment=("HotspotPro WAN probe " . ${mark}) } else={ /ip route set $p gateway=$g } } on-error={ }; ` +
        `:do { :local r [/ip route find where comment=("HotspotPro WAN " . ${mark})]; :if ([:len $r] = 0) do={ /ip route add dst-address=0.0.0.0/0 gateway=${link.check} target-scope=10 distance=${link.distance}${checkGw} comment=("HotspotPro WAN " . ${mark}) } else={ /ip route set $r gateway=${link.check} distance=${link.distance} } } on-error={ }; ` +
        (balancing
          ? `:do { :local t [/ip route find where comment=("HotspotPro WAN table " . ${mark})]; :if ([:len $t] = 0) do={ /ip route add dst-address=0.0.0.0/0 gateway=${link.check} routing-table=("hpwan" . ${mark}) target-scope=10 distance=1${checkGw} comment=("HotspotPro WAN table " . ${mark}) } else={ /ip route set $t gateway=${link.check} } } on-error={ }`
          : "") +
        ` } } on-error={ }`,
    );
  });
  return lines;
}

/** RouterOS that sets DHCP/static clients, PCC load balancing, and failover routes. */
export function multiWanLines(
  mode: WanMode | string | undefined,
  links: IspLink[] | undefined,
  managementPort = "",
): string[] {
  const unique = normalize(mode, links, managementPort);
  if (unique.length === 0) return [];

  const balancing = mode === "Load Balancing" || mode === "Load Balancing + Failover";
  const failover = mode === "Failover" || mode === "Load Balancing + Failover" || unique.length === 1;
  const stamp = multiWanStamp(mode, links, managementPort).replace(/[^A-Za-z0-9|_:,.-]/g, "").slice(0, 120);

  const setup: string[] = [
    `:do { /ip route remove [find where comment~"HotspotPro WAN"] } on-error={ }`,
    `:do { /ip firewall mangle remove [find where comment~"HotspotPro WAN"] } on-error={ }`,
    `:do { /tool netwatch remove [find where comment~"HotspotPro WAN"] } on-error={ }`,
    `:do { /routing table remove [find where comment="HotspotPro WAN"] } on-error={ }`,
    `:do { /ip dhcp-client remove [find where comment="HotspotPro WAN"] } on-error={ }`,
    // Remove the single-WAN client from first setup so Multi-WAN owns the default route and wanip reporting.
    `:do { /ip dhcp-client remove [find where comment="HotspotPro WAN DHCP Client"] } on-error={ }`,
  ];

  unique.forEach((link, index) => {
    const mark = index + 1;
    if (link.fromBridge) {
      setup.push(`:do { /interface bridge port remove [find where interface=${link.name}] } on-error={ }`);
    }
    if (link.dhcp) {
      // Lease only — default routes are built in routeSyncLines once the gateway is known.
      setup.push(
        `:do { /ip dhcp-client add interface=${link.name} disabled=no use-peer-dns=yes use-peer-ntp=yes add-default-route=no comment="HotspotPro WAN" } on-error={ }`,
      );
    } else if (link.dns) {
      setup.push(`:do { /ip dns set allow-remote-requests=yes servers=${link.dns} } on-error={ }`);
    }
    // Per-ISP table so PCC can pin connections to one path.
    setup.push(
      `:do { :if ([:len [/routing table find where name=("hpwan" . ${mark})]] = 0) do={ /routing table add name=("hpwan" . ${mark}) fib comment="HotspotPro WAN" } } on-error={ }`,
    );
    setup.push(
      `:do { :if ([:len [/ip firewall nat find where comment="HotspotPro NAT" out-interface=${link.name}]] = 0) do={ /ip firewall nat add chain=srcnat out-interface=${link.name} action=masquerade comment="HotspotPro NAT" } } on-error={ }`,
    );
  });

  if (balancing && unique.length > 1) {
    // Per-connection classifier: share new connections across ISP links.
    unique.forEach((_link, index) => {
      const mark = index + 1;
      setup.push(
        `:do { /ip firewall mangle add chain=prerouting dst-address-type=!local in-interface=hotspotpro-bridge per-connection-classifier=both-addresses-and-ports:${unique.length}/${index} action=mark-connection new-connection-mark=("hpwan" . ${mark}) passthrough=yes comment=("HotspotPro WAN PCC " . ${mark}) } on-error={ }`,
      );
      setup.push(
        `:do { /ip firewall mangle add chain=prerouting connection-mark=("hpwan" . ${mark}) in-interface=hotspotpro-bridge action=mark-routing new-routing-mark=("hpwan" . ${mark}) passthrough=no comment=("HotspotPro WAN route " . ${mark}) } on-error={ }`,
      );
      setup.push(
        `:do { /ip firewall mangle add chain=output connection-mark=("hpwan" . ${mark}) action=mark-routing new-routing-mark=("hpwan" . ${mark}) passthrough=no comment=("HotspotPro WAN out " . ${mark}) } on-error={ }`,
      );
    });
  }

  setup.push(`:set hpWanCfg "${stamp}"`);

  return [
    `# HotspotPro Multi-WAN: ${mode || "Single WAN"}`,
    `:global hpWanCfg`,
    // Full rebuild only when the site config fingerprint changed.
    `:if ($hpWanCfg != "${stamp}") do={ ${setup.join("; ")} }`,
    // Always sync routes — DHCP gateways often appear a few seconds after the client is created.
    ...routeSyncLines(unique, balancing, failover),
  ];
}
