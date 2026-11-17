// Multi-WAN lines for a MikroTik from the site's mode and ISP links.
// Applied on check-in (when the saved config changes) and when Submit queues a job.

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
  const ports = (Array.isArray(links) ? links : [])
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
  for (const link of ports) {
    if (seen.has(link.name)) continue;
    seen.add(link.name);
    // Equal distance shares traffic. Rising distance keeps a backup when the primary dies.
    const distance = balancing || unique.length === 0 ? 1 : unique.length + 1;
    unique.push({ ...link, distance });
  }
  return unique;
}

/** Stable fingerprint so check-in only rewrites routes when the owner changed Multi-WAN. */
export function multiWanStamp(mode: WanMode | string | undefined, links: IspLink[] | undefined, managementPort = ""): string {
  const ports = normalize(mode, links, managementPort);
  return `${mode || "Single WAN"}|${ports.map((p) => `${p.name}:${p.dhcp ? "d" : "s"}:${p.gateway}:${p.distance}`).join(",")}`;
}

/** RouterOS that sets DHCP/static clients and default routes from the saved Multi-WAN page. */
export function multiWanLines(
  mode: WanMode | string | undefined,
  links: IspLink[] | undefined,
  managementPort = "",
): string[] {
  const unique = normalize(mode, links, managementPort);
  if (unique.length === 0) return [];

  const failover = mode === "Failover" || mode === "Load Balancing + Failover" || unique.length === 1;
  const stamp = multiWanStamp(mode, links, managementPort).replace(/[^A-Za-z0-9|_:,.-]/g, "").slice(0, 120);
  const body: string[] = [
    `:do { /ip route remove [find where comment~"HotspotPro WAN"] } on-error={ }`,
    `:do { /ip firewall mangle remove [find where comment~"HotspotPro WAN"] } on-error={ }`,
    `:do { /ip dhcp-client remove [find where comment="HotspotPro WAN"] } on-error={ }`,
    // Remove the single-WAN client from first setup so Multi-WAN owns the default route and wanip reporting.
    `:do { /ip dhcp-client remove [find where comment="HotspotPro WAN DHCP Client"] } on-error={ }`,
  ];

  unique.forEach((link, index) => {
    const mark = index + 1;
    if (link.fromBridge) {
      body.push(`:do { /interface bridge port remove [find where interface=${link.name}] } on-error={ }`);
    }
    if (link.dhcp) {
      // MikroTik builds the default route from the ISP lease. Distance picks primary vs backup / share.
      body.push(
        `:do { /ip dhcp-client add interface=${link.name} disabled=no use-peer-dns=yes use-peer-ntp=yes add-default-route=yes default-route-distance=${link.distance} comment="HotspotPro WAN" } on-error={ }`,
      );
    } else if (link.gateway) {
      body.push(
        `:do { /ip route add dst-address=0.0.0.0/0 gateway=${link.gateway} distance=${link.distance}${failover ? " check-gateway=ping" : ""} comment=("HotspotPro WAN " . ${mark}) } on-error={ }`,
      );
      if (link.dns) {
        body.push(`:do { /ip dns set allow-remote-requests=yes servers=${link.dns} } on-error={ }`);
      }
    }
    body.push(
      `:do { :if ([:len [/ip firewall nat find where comment="HotspotPro NAT" out-interface=${link.name}]] = 0) do={ /ip firewall nat add chain=srcnat out-interface=${link.name} action=masquerade comment="HotspotPro NAT" } } on-error={ }`,
    );
  });

  body.push(`:set hpWan "${stamp}"`);

  // One block so a 10s check-in does not flap routes unless the site config changed.
  return [
    `# HotspotPro Multi-WAN: ${mode || "Single WAN"}`,
    `:global hpWan`,
    `:if ($hpWan != "${stamp}") do={ ${body.join("; ")} }`,
  ];
}
