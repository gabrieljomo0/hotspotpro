// Real revenue figures for the dashboard chart, computed from vouchers.
//
// "Revenue" here means exactly what the Revenue card above the chart means:
// a voucher that has been used (redeemed), at its package's price. Using the
// same definition keeps the card and the chart agreeing with each other.
// (Sales are dated by when the voucher was generated, like the card.)

import type { RouterInfo } from "../data/dashboard-data";
import type { Voucher, VoucherBatch } from "../shared/types";
import { shortRouterName } from "./dashboardScope";

export type ChartTimeframe = "Today" | "Daily" | "Weekly" | "Monthly" | "Yearly";

const HOURS = Array.from({ length: 24 }, (_, hour) => {
  const period = hour >= 12 ? "PM" : "AM";
  const hour12 = hour % 12 === 0 ? 12 : hour % 12;
  return `${hour12}${period}`;
});
const WEEKDAYS = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];
const MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
const WEEKS = ["Wk 1", "Wk 2", "Wk 3", "Wk 4", "Wk 5", "Wk 6"];

export function parsePrice(price: string): number {
  const match = price.match(/[\d,.]+/);
  return match ? parseFloat(match[0].replace(/,/g, "")) : 0;
}

// Rounds to 2 decimals the way people expect (1.005 → 1.01), not the way
// floating-point arithmetic happens to land.
function round2(value: number) {
  return Math.round((value + Number.EPSILON) * 100) / 100;
}

export function priceLookup(packages: Array<{ name: string; price: string }>) {
  return Object.fromEntries(packages.map((pkg) => [pkg.name, parsePrice(pkg.price)])) as Record<string, number>;
}

export function chartLabels(timeframe: ChartTimeframe, now: Date): string[] {
  if (timeframe === "Today") return HOURS;
  if (timeframe === "Daily") return WEEKDAYS;
  if (timeframe === "Weekly") return WEEKS;
  if (timeframe === "Monthly") return MONTHS;
  const year = now.getFullYear();
  return [year - 4, year - 3, year - 2, year - 1, year].map(String);
}

// Which slot of the chart a moment falls into, or -1 if it is outside the
// period the chart is showing right now.
function slotFor(timeframe: ChartTimeframe, moment: Date, now: Date): number {
  const sameDay = moment.toDateString() === now.toDateString();
  if (timeframe === "Today") return sameDay ? moment.getHours() : -1;

  if (timeframe === "Daily") {
    // The current week, Monday to Sunday (the same week the cards use).
    const mondayOffset = now.getDay() === 0 ? 6 : now.getDay() - 1;
    const start = new Date(now.getFullYear(), now.getMonth(), now.getDate() - mondayOffset).getTime();
    const end = start + 7 * 86400000;
    if (moment.getTime() < start || moment.getTime() >= end) return -1;
    return Math.floor((moment.getTime() - start) / 86400000);
  }

  if (timeframe === "Weekly") {
    // The weeks of the current month: days 1–7, 8–14, and so on.
    if (moment.getFullYear() !== now.getFullYear() || moment.getMonth() !== now.getMonth()) return -1;
    return Math.floor((moment.getDate() - 1) / 7);
  }

  if (timeframe === "Monthly") {
    return moment.getFullYear() === now.getFullYear() ? moment.getMonth() : -1;
  }

  const index = moment.getFullYear() - (now.getFullYear() - 4);
  return index >= 0 && index <= 4 ? index : -1;
}

function isSold(voucher: Voucher) {
  return voucher.status === "Used";
}

export function revenueSeries(
  vouchers: Voucher[],
  priceByPackage: Record<string, number>,
  timeframe: ChartTimeframe,
  now: Date = new Date(),
) {
  const labels = chartLabels(timeframe, now);
  const values = labels.map(() => 0);
  vouchers.filter(isSold).forEach((voucher) => {
    const slot = slotFor(timeframe, new Date(voucher.generatedAtMs), now);
    if (slot >= 0 && slot < values.length) values[slot] += priceByPackage[voucher.packageName] ?? 0;
  });
  return labels.map((label, index) => ({ label, value: round2(values[index]) }));
}

// Revenue per router, over the same period the chart is showing. A voucher
// counts toward every router its batch covers — the same rule the Router &
// Agent Revenue page uses — so the two never disagree about a router.
export function revenueByRouter(
  vouchers: Voucher[],
  batches: VoucherBatch[],
  routers: RouterInfo[],
  priceByPackage: Record<string, number>,
  timeframe: ChartTimeframe,
  now: Date = new Date(),
) {
  const routersOfBatch = new Map(batches.map((batch) => [batch.id, batch.routerIps]));
  const totals = new Map<string, number>(routers.map((router) => [router.ip, 0]));

  vouchers.filter(isSold).forEach((voucher) => {
    if (slotFor(timeframe, new Date(voucher.generatedAtMs), now) < 0) return;
    const amount = priceByPackage[voucher.packageName] ?? 0;
    (voucher.batchId ? (routersOfBatch.get(voucher.batchId) ?? []) : []).forEach((ip) => {
      if (totals.has(ip)) totals.set(ip, (totals.get(ip) ?? 0) + amount);
    });
  });

  return routers.map((router) => ({
    label: shortRouterName(router.name),
    value: round2(totals.get(router.ip) ?? 0),
  }));
}
