// What an agent has sold, worked out from real voucher records. Shared by the
// Sales page and the main dashboard's sales overview so they always agree.
//
// A sale is a voucher that has been used (not a giveaway), counted for the
// agent who made it OR who admin pushed it to alone — and, if the agent may
// see team sales, for everyone else on the same router too.

import { agentStock } from "../dashboard/agents/agentLedger";
import type { AgentProfile, Package, Voucher, VoucherBatch } from "../dashboard/shared/types";

export function parsePrice(price: string): number {
  const match = price.replace(/,/g, "").match(/[\d.]+/);
  return match ? parseFloat(match[0]) : 0;
}

export type AgentSale = { voucher: Voucher; seller: string; amount: number };

export function getAgentSales(
  agent: AgentProfile,
  agents: AgentProfile[],
  vouchers: Voucher[],
  batches: VoucherBatch[],
  packages: Package[],
): AgentSale[] {
  const canViewTeam = agent.permissions["sales.viewTeam"] === "Allowed";
  const priceByPackage = Object.fromEntries(packages.map((p) => [p.name, parsePrice(p.price)]));
  const teamIds = canViewTeam
    ? agents.filter((a) => a.routerIp !== null && a.routerIp === agent.routerIp).map((a) => a.id)
    : [];
  if (!teamIds.includes(agent.id)) teamIds.push(agent.id);

  const soldBy = new Map<string, string>();
  teamIds.forEach((id) => {
    agentStock(id, vouchers, batches).held.forEach((v) => {
      if (!soldBy.has(v.code)) soldBy.set(v.code, id);
    });
  });

  return vouchers
    .filter((v) => soldBy.has(v.code) && v.status === "Used" && v.saleType !== "Giveaway")
    .map((voucher) => ({
      voucher,
      seller: soldBy.get(voucher.code) ?? voucher.agentId,
      amount: priceByPackage[voucher.packageName] ?? 0,
    }));
}

// --- Sales inside a chosen period (day, week, month, range, time of day) ---

import { saleTimeMs } from "../dashboard/agents/agentLedger";
import { inPeriod, periodWindow, type RevenuePeriod } from "../dashboard/agents/directory/revenuePeriod";

export function salesInPeriodList(sales: AgentSale[], period: RevenuePeriod, now: Date = new Date()): AgentSale[] {
  return sales.filter((s) => inPeriod(saleTimeMs(s.voucher), period, now));
}

export type TrendPoint = { label: string; value: number };

const DAY = 86400000;
const round2 = (v: number) => Math.round((v + Number.EPSILON) * 100) / 100;

// The revenue trend for the chosen period: by hour when it is a single day,
// by day for up to ~2 months, otherwise by month.
export function trendFor(sales: AgentSale[], period: RevenuePeriod, now: Date = new Date()): TrendPoint[] {
  const window = periodWindow(period, now);
  if (!window) return [];
  const inside = salesInPeriodList(sales, period, now);
  const times = inside.map((s) => saleTimeMs(s.voucher));
  const start = window.startMs ?? (times.length ? Math.min(...times) : now.getTime());
  const end = window.endMs ?? now.getTime() + DAY;

  if (end - start <= DAY + 3600000) {
    const dayStart = new Date(new Date(start).getFullYear(), new Date(start).getMonth(), new Date(start).getDate()).getTime();
    const buckets = Array.from({ length: 24 }, (_, h) => ({ label: `${h % 12 === 0 ? 12 : h % 12}${h >= 12 ? "PM" : "AM"}`, value: 0 }));
    inside.forEach((s) => {
      const h = new Date(saleTimeMs(s.voucher)).getHours();
      if (saleTimeMs(s.voucher) >= dayStart) buckets[h].value += s.amount;
    });
    return buckets.map((b) => ({ ...b, value: round2(b.value) }));
  }

  if (end - start <= 62 * DAY) {
    const first = new Date(new Date(start).getFullYear(), new Date(start).getMonth(), new Date(start).getDate());
    const days = Math.max(1, Math.round((end - first.getTime()) / DAY));
    const buckets = Array.from({ length: days }, (_, i) => {
      const d = new Date(first.getFullYear(), first.getMonth(), first.getDate() + i);
      return { key: d.toDateString(), label: d.toLocaleDateString("en-GB", { day: "2-digit", month: "short" }), value: 0 };
    });
    inside.forEach((s) => {
      const b = buckets.find((x) => x.key === new Date(saleTimeMs(s.voucher)).toDateString());
      if (b) b.value += s.amount;
    });
    return buckets.map(({ label, value }) => ({ label, value: round2(value) }));
  }

  const first = new Date(new Date(start).getFullYear(), new Date(start).getMonth(), 1);
  const months: Array<{ key: string; label: string; value: number }> = [];
  for (let d = new Date(first); d.getTime() < end && months.length < 36; d = new Date(d.getFullYear(), d.getMonth() + 1, 1)) {
    months.push({ key: `${d.getFullYear()}-${d.getMonth()}`, label: d.toLocaleDateString("en-GB", { month: "short", year: "2-digit" }), value: 0 });
  }
  inside.forEach((s) => {
    const t = new Date(saleTimeMs(s.voucher));
    const b = months.find((x) => x.key === `${t.getFullYear()}-${t.getMonth()}`);
    if (b) b.value += s.amount;
  });
  return months.map(({ label, value }) => ({ label, value: round2(value) }));
}

export function todayInputValue(now: Date = new Date()) {
  const m = String(now.getMonth() + 1).padStart(2, "0");
  const d = String(now.getDate()).padStart(2, "0");
  return `${now.getFullYear()}-${m}-${d}`;
}
