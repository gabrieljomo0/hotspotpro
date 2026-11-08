// Commission billing: what HotspotPro charges when the account is on the
// "commission" model instead of the flat monthly subscription. It is a
// share of each router's voucher sales, so the figures are worked out per
// router from the vouchers that were sold (Used, and paid for).

import { parsePrice, priceLookup } from "../overview/revenueSeries";
import type { AgentProfile, Voucher, VoucherBatch } from "../shared/types";

export type RouterSalesRow = { ip: string; name: string; sold: number; sales: number; commission: number };
export type Period = "this-month" | "last-month" | "all";

const PAID = ["Counter Sale", "Online", "Unassigned"];
const saleMs = (v: Voucher) => v.usedAtMs ?? v.generatedAtMs;

export function periodRange(period: Period, now = new Date()): [number, number] {
  const start = new Date(now.getFullYear(), now.getMonth(), 1).getTime();
  if (period === "this-month") return [start, Infinity];
  if (period === "last-month") return [new Date(now.getFullYear(), now.getMonth() - 1, 1).getTime(), start];
  return [-Infinity, Infinity];
}

export function periodLabel(period: Period, now = new Date()): string {
  if (period === "all") return "all time";
  const d = period === "this-month" ? now : new Date(now.getFullYear(), now.getMonth() - 1, 1);
  return d.toLocaleDateString("en-GB", { month: "long", year: "numeric" });
}

// Sales per router in the period. A batch made for several routers shares
// each of its sales equally between them; vouchers without a batch count
// for their agent's router.
export function salesByRouter(
  vouchers: Voucher[],
  batches: VoucherBatch[],
  packages: Array<{ name: string; price: string }>,
  agents: Pick<AgentProfile, "id" | "routerIp">[],
  routers: Array<{ ip: string; name: string }>,
  rate: number,
  range: [number, number],
): RouterSalesRow[] {
  const batchById = new Map(batches.map((b) => [b.id, b]));
  const packagePrice = priceLookup(packages);
  const totals = new Map<string, { sold: number; sales: number }>();
  const add = (ip: string, sold: number, sales: number) => {
    const t = totals.get(ip) ?? { sold: 0, sales: 0 };
    totals.set(ip, { sold: t.sold + sold, sales: t.sales + sales });
  };

  for (const v of vouchers) {
    if (v.status !== "Used" || !PAID.includes(v.saleType)) continue;
    const at = saleMs(v);
    if (at < range[0] || at >= range[1]) continue;
    const batch = v.batchId ? batchById.get(v.batchId) : undefined;
    if (batch?.isGiveaway) continue;
    const price = batch ? parsePrice(batch.price) : (packagePrice[v.packageName] ?? 0);
    const ips = batch && batch.routerIps.length ? batch.routerIps : [agents.find((a) => a.id === v.agentId)?.routerIp ?? ""];
    for (const ip of ips) add(ip, 1 / ips.length, price / ips.length);
  }

  const nameOf = (ip: string) => routers.find((r) => r.ip === ip)?.name.split(" (")[0] ?? (ip || "Unassigned");
  return [...totals.entries()]
    .map(([ip, t]) => ({ ip, name: nameOf(ip), sold: Math.round(t.sold * 100) / 100, sales: Math.round(t.sales * 100) / 100, commission: Math.round(t.sales * rate) / 100 }))
    .sort((a, b) => b.sales - a.sales);
}

export const sumRows = (rows: RouterSalesRow[]) =>
  rows.reduce((acc, r) => ({ sales: acc.sales + r.sales, commission: acc.commission + r.commission, sold: acc.sold + r.sold }), { sales: 0, commission: 0, sold: 0 });
