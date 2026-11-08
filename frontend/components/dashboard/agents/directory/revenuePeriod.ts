// The "which sales count?" filter on the All Agents tab: a day, a month, a
// date range or a preset (today, this week …), optionally narrowed to a time
// of day (for example 08:00–12:00 on every day in the period).
//
// Plain logic — no React, no storage — so every combination can be tested.
// Dates and times are the admin's LOCAL time, because that is how they think
// about "today" and "the morning shift".

import type { Voucher } from "../../shared/types";
import { priceOf, saleTimeMs } from "../agentLedger";

export type PeriodKind =
  | "today"
  | "yesterday"
  | "week"
  | "month"
  | "all"
  | "day"
  | "month-pick"
  | "range";

export type RevenuePeriod = {
  kind: PeriodKind;
  // "YYYY-MM-DD" (used by "day")
  day: string;
  // "YYYY-MM" (used by "month-pick")
  month: string;
  // "YYYY-MM-DD" (used by "range")
  from: string;
  to: string;
  // "HH:MM" — empty means no limit on that side.
  timeFrom: string;
  timeTo: string;
};

export const PERIOD_OPTIONS: Array<{ kind: PeriodKind; label: string }> = [
  { kind: "today", label: "Today" },
  { kind: "yesterday", label: "Yesterday" },
  { kind: "week", label: "This week" },
  { kind: "month", label: "This month" },
  { kind: "all", label: "All time" },
  { kind: "day", label: "A specific day" },
  { kind: "month-pick", label: "A specific month" },
  { kind: "range", label: "Date range" },
];

export function defaultPeriod(): RevenuePeriod {
  return { kind: "today", day: "", month: "", from: "", to: "", timeFrom: "", timeTo: "" };
}


function startOfDay(date: Date) {
  return new Date(date.getFullYear(), date.getMonth(), date.getDate()).getTime();
}

function parseDay(value: string): number | null {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(value);
  if (!match) return null;
  const [, y, m, d] = match.map(Number);
  const date = new Date(y, m - 1, d);
  // Reject 2026-02-31 style dates that JS silently rolls over.
  if (date.getFullYear() !== y || date.getMonth() !== m - 1 || date.getDate() !== d) return null;
  return date.getTime();
}

function parseMonth(value: string): { start: number; end: number } | null {
  const match = /^(\d{4})-(\d{2})$/.exec(value);
  if (!match) return null;
  const y = Number(match[1]);
  const m = Number(match[2]);
  if (m < 1 || m > 12) return null;
  return { start: new Date(y, m - 1, 1).getTime(), end: new Date(y, m, 1).getTime() };
}

// "08:30" → minutes since midnight, or null.
function parseTime(value: string): number | null {
  const match = /^(\d{2}):(\d{2})$/.exec(value);
  if (!match) return null;
  const h = Number(match[1]);
  const m = Number(match[2]);
  if (h > 23 || m > 59) return null;
  return h * 60 + m;
}

// What's wrong with the chosen filter, if anything. Shown to the admin and
// the totals read as zero until it is fixed.
export function periodError(period: RevenuePeriod): string | null {
  if (period.kind === "day" && parseDay(period.day) === null) return "Pick a day.";
  if (period.kind === "month-pick" && parseMonth(period.month) === null) return "Pick a month.";
  if (period.kind === "range") {
    const from = parseDay(period.from);
    const to = parseDay(period.to);
    if (from === null || to === null) return "Pick both a start and an end date.";
    if (to < from) return "The end date is before the start date.";
  }
  if (period.timeFrom && parseTime(period.timeFrom) === null) return "Enter the start time as hours and minutes.";
  if (period.timeTo && parseTime(period.timeTo) === null) return "Enter the end time as hours and minutes.";
  return null;
}

// [startMs, endMs) — null on a side means no limit. null overall = invalid.
export function periodWindow(
  period: RevenuePeriod,
  now: Date = new Date(),
): { startMs: number | null; endMs: number | null } | null {
  if (periodError(period)) return null;
  const today = startOfDay(now);

  switch (period.kind) {
    case "today":
      return { startMs: today, endMs: new Date(now.getFullYear(), now.getMonth(), now.getDate() + 1).getTime() };
    case "yesterday":
      return { startMs: new Date(now.getFullYear(), now.getMonth(), now.getDate() - 1).getTime(), endMs: today };
    case "week": {
      const mondayOffset = now.getDay() === 0 ? 6 : now.getDay() - 1;
      return {
        startMs: new Date(now.getFullYear(), now.getMonth(), now.getDate() - mondayOffset).getTime(),
        endMs: new Date(now.getFullYear(), now.getMonth(), now.getDate() + 1).getTime(),
      };
    }
    case "month":
      return {
        startMs: new Date(now.getFullYear(), now.getMonth(), 1).getTime(),
        endMs: new Date(now.getFullYear(), now.getMonth() + 1, 1).getTime(),
      };
    case "all":
      return { startMs: null, endMs: null };
    case "day": {
      const start = parseDay(period.day)!;
      return { startMs: start, endMs: new Date(new Date(start).getFullYear(), new Date(start).getMonth(), new Date(start).getDate() + 1).getTime() };
    }
    case "month-pick": {
      const range = parseMonth(period.month)!;
      return { startMs: range.start, endMs: range.end };
    }
    case "range": {
      const start = parseDay(period.from)!;
      const last = new Date(parseDay(period.to)!);
      return { startMs: start, endMs: new Date(last.getFullYear(), last.getMonth(), last.getDate() + 1).getTime() };
    }
  }
}

// Does a sale made at `ms` belong in the period (date window AND time of day)?
export function inPeriod(ms: number, period: RevenuePeriod, now: Date = new Date()): boolean {
  const window = periodWindow(period, now);
  if (!window) return false;
  if (window.startMs !== null && ms < window.startMs) return false;
  if (window.endMs !== null && ms >= window.endMs) return false;

  const from = period.timeFrom ? parseTime(period.timeFrom) : null;
  const to = period.timeTo ? parseTime(period.timeTo) : null;
  if (from === null && to === null) return true;

  const when = new Date(ms);
  const minute = when.getHours() * 60 + when.getMinutes();
  const lower = from ?? 0;
  const upper = to ?? 23 * 60 + 59;
  // A start later than the end means an overnight window, e.g. 22:00–02:00.
  return lower <= upper ? minute >= lower && minute <= upper : minute >= lower || minute <= upper;
}

export type PeriodSales = { count: number; value: number };

function round2(value: number) {
  return Math.round((value + Number.EPSILON) * 100) / 100;
}

// What an agent sold in the period: vouchers that have been used, at the
// package price, dated by when they were sold.
export function salesInPeriod(
  held: Voucher[],
  priceByPackage: Record<string, number>,
  period: RevenuePeriod,
  now: Date = new Date(),
): PeriodSales {
  const sold = held.filter((voucher) => voucher.status === "Used" && inPeriod(saleTimeMs(voucher), period, now));
  return { count: sold.length, value: round2(sold.reduce((sum, v) => sum + priceOf(priceByPackage, v.packageName), 0)) };
}

function dayLabel(ms: number) {
  return new Date(ms).toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric" });
}

// A short phrase for headings, e.g. "Today", "14 Mar 2026, 08:00–12:00".
export function periodLabel(period: RevenuePeriod): string {
  let base: string;
  switch (period.kind) {
    case "today":
      base = "Today";
      break;
    case "yesterday":
      base = "Yesterday";
      break;
    case "week":
      base = "This week";
      break;
    case "month":
      base = "This month";
      break;
    case "all":
      base = "All time";
      break;
    case "day": {
      const start = parseDay(period.day);
      base = start === null ? "Pick a day" : dayLabel(start);
      break;
    }
    case "month-pick": {
      const range = parseMonth(period.month);
      base = range
        ? new Date(range.start).toLocaleDateString("en-GB", { month: "long", year: "numeric" })
        : "Pick a month";
      break;
    }
    case "range": {
      const from = parseDay(period.from);
      const to = parseDay(period.to);
      base = from !== null && to !== null ? `${dayLabel(from)} – ${dayLabel(to)}` : "Pick dates";
      break;
    }
  }
  if (!period.timeFrom && !period.timeTo) return base;
  return `${base}, ${period.timeFrom || "00:00"}–${period.timeTo || "23:59"}`;
}

// Is this the plain "Today" the card has always shown?
export function isPlainToday(period: RevenuePeriod): boolean {
  return period.kind === "today" && !period.timeFrom && !period.timeTo;
}
