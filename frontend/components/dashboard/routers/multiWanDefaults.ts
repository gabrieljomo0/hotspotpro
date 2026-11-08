// Multi-WAN starts with two internet (ISP) links already set up, so nobody
// has to type the usual values by hand. A router with fewer than two links
// is topped up to two, and a new router is created with two.

import type { RouterISPLink, RouterInfo } from "@/components/dashboard/data/dashboard-data";

export const MIN_ISP_LINKS = 2;
export const DEFAULT_WAN_MODE: RouterInfo["multiWanMode"] = "Load Balancing + Failover";

const DEFAULT_DNS = ["8.8.8.8,1.1.1.1", "1.1.1.1,8.8.8.8"];
const DEFAULT_HEALTH = ["8.8.8.8", "1.1.1.1"];

// The next ether port not already used by one of the links.
function freeInterface(taken: string[]) {
  let n = 1;
  while (taken.includes(`ether${n}`)) n += 1;
  return `ether${n}`;
}

export function defaultIspLink(existing: RouterISPLink[], salt = Date.now()): RouterISPLink {
  const index = existing.length;
  const iface = freeInterface(existing.map((link) => link.interface));
  return {
    id: `isp-${salt}-${index}`,
    label: `ISP ${index + 1}`,
    interface: iface,
    connectionType: "DHCP",
    gateway: "",
    dnsServers: DEFAULT_DNS[index % DEFAULT_DNS.length],
    healthCheckIp: DEFAULT_HEALTH[index % DEFAULT_HEALTH.length],
    allowRemovalFromBridge: false,
  };
}

export function defaultIspLinks(): RouterISPLink[] {
  const links: RouterISPLink[] = [];
  const salt = Date.now();
  while (links.length < MIN_ISP_LINKS) links.push(defaultIspLink(links, salt));
  return links;
}

// Keeps what is already there and fills the rest with defaults.
export function ensureMinimumIspLinks(links: RouterISPLink[]): RouterISPLink[] {
  const next = [...links];
  const salt = Date.now();
  while (next.length < MIN_ISP_LINKS) next.push(defaultIspLink(next, salt));
  return next;
}
