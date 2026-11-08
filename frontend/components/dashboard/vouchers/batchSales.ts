// Sales figures for ONE voucher batch (and how they compare with every
// voucher on the account). A voucher counts as "sold" once it is Used.
// Free Trial and Giveaway vouchers are used but bring in no money.

import { parsePrice, priceLookup } from "../overview/revenueSeries";
import type { Voucher, VoucherBatch, VoucherSaleType } from "../shared/types";

const DAY_MS = 24 * 60 * 60 * 1000;
const PAID_TYPES: VoucherSaleType[] = ["Counter Sale", "Online", "Unassigned"];

export type SaleTypeRow = { type: VoucherSaleType; count: number; revenue: number };
export type DayRow = { label: string; revenue: number; count: number };

export type BatchSales = {
  total: number;
  sold: number; // used vouchers (paid or free)
  paidSold: number; // used vouchers that earned money
  freeUsed: number;
  available: number;
  expired: number;
  unitPrice: number;
  revenue: number;
  unsoldValue: number; // what the still-available vouchers would bring in
  sellThrough: number; // 0-100, share of the batch that has been used
  lastSaleMs: number | null;
  byType: SaleTypeRow[];
  last7Days: DayRow[];
};

export const saleMs = (v: Voucher) => v.usedAtMs ?? v.generatedAtMs;
const isPaid = (v: Voucher, batch: VoucherBatch | null | undefined) =>
  !batch?.isGiveaway && PAID_TYPES.includes(v.saleType);

export function computeBatchSales(batch: VoucherBatch, vouchers: Voucher[], now = Date.now()): BatchSales {
  const mine = vouchers.filter((v) => v.batchId === batch.id);
  const unitPrice = batch.isGiveaway ? 0 : parsePrice(batch.price);
  const used = mine.filter((v) => v.status === "Used");
  const paid = used.filter((v) => isPaid(v, batch));
  const available = mine.filter((v) => v.status === "Available").length;

  const types: VoucherSaleType[] = ["Counter Sale", "Online", "Free Trial", "Giveaway", "Unassigned"];
  const byType = types
    .map((type) => {
      const rows = used.filter((v) => v.saleType === type);
      return { type, count: rows.length, revenue: rows.filter((v) => isPaid(v, batch)).length * unitPrice };
    })
    .filter((row) => row.count > 0);

  const last7Days: DayRow[] = [];
  const startOfToday = new Date(now);
  startOfToday.setHours(0, 0, 0, 0);
  for (let i = 6; i >= 0; i--) {
    const from = startOfToday.getTime() - i * DAY_MS;
    const rows = paid.filter((v) => saleMs(v) >= from && saleMs(v) < from + DAY_MS);
    last7Days.push({
      label: new Date(from).toLocaleDateString("en-GB", { weekday: "short" }),
      count: rows.length,
      revenue: rows.length * unitPrice,
    });
  }

  const total = mine.length || batch.count;
  return {
    total,
    sold: used.length,
    paidSold: paid.length,
    freeUsed: used.length - paid.length,
    available,
    expired: mine.filter((v) => v.status === "Expired").length,
    unitPrice,
    revenue: paid.length * unitPrice,
    unsoldValue: available * unitPrice,
    sellThrough: total === 0 ? 0 : Math.round((used.length / total) * 100),
    lastSaleMs: used.length ? Math.max(...used.map(saleMs)) : null,
    byType,
    last7Days,
  };
}

// Money earned by every voucher on the account (batch price when the
// voucher belongs to a batch, otherwise its package's price).
export function computeOverallSales(
  vouchers: Voucher[],
  batches: VoucherBatch[],
  packages: Array<{ name: string; price: string }>,
) {
  const byId = new Map(batches.map((b) => [b.id, b]));
  const packagePrice = priceLookup(packages);
  let revenue = 0;
  let sold = 0;
  for (const v of vouchers) {
    if (v.status !== "Used") continue;
    sold += 1;
    const batch = v.batchId ? byId.get(v.batchId) : null;
    if (!isPaid(v, batch)) continue;
    revenue += batch ? parsePrice(batch.price) : (packagePrice[v.packageName] ?? 0);
  }
  return { sold, revenue, total: vouchers.length };
}

export function timeAgoLabel(ms: number | null, now = Date.now()): string {
  if (ms === null) return "No sales yet";
  const mins = Math.max(0, Math.round((now - ms) / 60000));
  if (mins < 1) return "Just now";
  if (mins < 60) return `${mins} min ago`;
  const hours = Math.round(mins / 60);
  if (hours < 24) return `${hours} hour${hours === 1 ? "" : "s"} ago`;
  const days = Math.round(hours / 24);
  return `${days} day${days === 1 ? "" : "s"} ago`;
}
