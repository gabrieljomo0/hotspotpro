// Picks the hotspot (LAN) address range for a new router from the number of
// people who will use it at the same time. A /24 only has 254 addresses, so a
// busy campus on a /24 would run out and new users could not connect.

export type PeakChoice = "200" | "500" | "1000" | "1000+";

export type PeakPlan = {
  id: PeakChoice;
  label: string;
  users: number;     // the most people this plan is meant for
  lanIp: string;     // router address (gateway), with prefix
};

export const PEAK_PLANS: PeakPlan[] = [
  { id: "200", label: "Up to ~200 users", users: 200, lanIp: "192.168.50.1/24" },
  { id: "500", label: "Up to ~500 users", users: 500, lanIp: "192.168.50.1/23" },
  { id: "1000", label: "Up to ~1000 users", users: 1000, lanIp: "192.168.48.1/22" },
  { id: "1000+", label: "1000+ / campus", users: 60000, lanIp: "10.50.0.1/16" },
];

export const DEFAULT_PEAK: PeakChoice = "200";

export function planFor(id: PeakChoice): PeakPlan {
  return PEAK_PLANS.find((plan) => plan.id === id) ?? PEAK_PLANS[0];
}

function toInt(octets: number[]) {
  return ((octets[0] << 24) >>> 0) + (octets[1] << 16) + (octets[2] << 8) + octets[3];
}

function toDotted(n: number) {
  return [(n >>> 24) & 255, (n >>> 16) & 255, (n >>> 8) & 255, n & 255].join(".");
}

export type ParsedLan = {
  ip: string;
  prefix: number;
  network: string;      // e.g. 192.168.50.0/24
  usableHosts: number;  // addresses that can be handed out
  poolStart: string;
  poolEnd: string;
};

// Reads "192.168.50.1/24". Returns the parsed range, or a plain-words problem.
export function parseLanIp(value: string): ParsedLan | { error: string } {
  const text = value.trim();
  const match = /^(\d{1,3})\.(\d{1,3})\.(\d{1,3})\.(\d{1,3})\/(\d{1,2})$/.exec(text);
  if (!match) return { error: "Use the form 192.168.50.1/24 (address, slash, size)." };
  const octets = match.slice(1, 5).map(Number);
  const prefix = Number(match[5]);
  if (octets.some((o) => o > 255)) return { error: "Each part of the address must be between 0 and 255." };
  if (prefix < 16 || prefix > 29) return { error: "The size after the slash must be between /16 and /29." };

  const isPrivate =
    octets[0] === 10 || (octets[0] === 172 && octets[1] >= 16 && octets[1] <= 31) || (octets[0] === 192 && octets[1] === 168);
  if (!isPrivate) return { error: "Use a private range: 10.x.x.x, 172.16-31.x.x or 192.168.x.x." };

  const ipInt = toInt(octets);
  const size = 2 ** (32 - prefix);
  const networkInt = ipInt - (ipInt % size);
  const broadcastInt = networkInt + size - 1;
  if (ipInt === networkInt || ipInt === broadcastInt) {
    return { error: "That address is the network or broadcast address. Use one inside the range, like .1." };
  }
  const usableHosts = size - 2;
  return {
    ip: toDotted(ipInt),
    prefix,
    network: `${toDotted(networkInt)}/${prefix}`,
    usableHosts,
    poolStart: toDotted(networkInt + 10 > broadcastInt - 1 ? networkInt + 2 : networkInt + 10),
    poolEnd: toDotted(broadcastInt - 1),
  };
}

// Which plan would be right for a given address range, in words for a hint.
export function enoughFor(usableHosts: number, plan: PeakPlan) {
  return usableHosts >= Math.min(plan.users, 60000);
}
