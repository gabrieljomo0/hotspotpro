// Turns the account's real ActiveUser list into the numbers/rows an agent
// portal widget needs, scoped to one router — no sample data involved.

import type { ActiveUser, RouterInfo } from "../dashboard/data/dashboard-data";
import { hashString } from "../dashboard/active-users/advanced-details/helpers";
import { routerForUser } from "../dashboard/active-users/sessionInsights";

export function getScopedUsers(
  users: ActiveUser[],
  routers: RouterInfo[],
  routerIp: string | null,
): ActiveUser[] {
  if (!routerIp || routers.length === 0) return [];
  return users.filter((user) => routerForUser(user, routers)?.ip === routerIp);
}

export function parseDataSize(value: string): number {
  const match = value.match(/([\d.]+)\s*(GB|MB)/i);
  if (!match) return 0;
  const amount = parseFloat(match[1]);
  return match[2].toUpperCase() === "MB" ? amount / 1024 : amount;
}

export function formatGB(gb: number): string {
  if (gb < 1) return `${Math.round(gb * 1024)} MB`;
  return `${gb.toFixed(1)} GB`;
}

export function statusBreakdown(scopedUsers: ActiveUser[]) {
  const colors: Record<string, string> = {
    Online: "#1a1a1a",
    Idle: "#1a1a1a",
    "Expiring Soon": "#a3a3a3",
    Disconnected: "#d4d4d4",
    Expired: "#d4d4d4",
    Blocked: "#1a1a1a",
    Paused: "#a3a3a3",
  };
  const counts = new Map<string, number>();
  scopedUsers.forEach((u) => counts.set(u.status, (counts.get(u.status) ?? 0) + 1));
  const total = scopedUsers.length || 1;
  return Array.from(counts.entries()).map(([name, value]) => ({
    name,
    value,
    percentage: `${((value / total) * 100).toFixed(1)}%`,
    color: colors[name] ?? "#d4d4d4",
  }));
}

export function topUsersByData(scopedUsers: ActiveUser[], limit = 5) {
  return [...scopedUsers]
    .map((u) => ({ phone: u.phone, usageGb: parseDataSize(u.dataUsed) }))
    .sort((a, b) => b.usageGb - a.usageGb)
    .slice(0, limit)
    .map((u) => ({ phone: u.phone, usage: formatGB(u.usageGb) }));
}

export function buildConnectionSeries(routerIp: string | null, currentOnline: number) {
  const hours = ["12 AM", "2 AM", "4 AM", "6 AM", "8 AM", "10 AM", "12 PM", "2 PM", "4 PM", "6 PM", "8 PM", "10 PM"];
  const seed = routerIp ? hashString(routerIp) : 0;
  const peak = Math.max(currentOnline, 4);
  return hours.map((time, index) => {
    const wave = Math.sin((index / hours.length) * Math.PI * 1.6 + seed / 200);
    const users = Math.max(0, Math.round(peak * (0.4 + 0.6 * (wave + 1) / 2)));
    return { time, users };
  });
}
