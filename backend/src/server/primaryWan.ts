/** First usable ISP interface from Multi-WAN, else the router’s wanInterface. */
export function primaryWanInterface(row: {
  wanInterface?: string;
  ispLinks?: Array<{ interface?: string }>;
  managementPort?: string;
} | null | undefined): string {
  const mgmt = (row?.managementPort || "").replace(/[^A-Za-z0-9._-]/g, "");
  const fromLinks = (Array.isArray(row?.ispLinks) ? row!.ispLinks! : [])
    .map((link) => (link.interface || "").trim())
    .find((name) => /^(ether|sfp|sfp-sfpplus|sfpplus|lte|wlan|wifi|vlan|pppoe-out)[A-Za-z0-9._-]*$/.test(name) && name !== mgmt);
  if (fromLinks) return fromLinks;
  const wan = (row?.wanInterface || "ether1").replace(/[^A-Za-z0-9._-]/g, "");
  return wan || "ether1";
}
