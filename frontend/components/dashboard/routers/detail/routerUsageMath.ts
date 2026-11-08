// Turns the server's hourly usage rows into the numbers and chart series the Data Usage tab shows.
// Everything is worked out in the VIEWER's own time zone, so "today" starts at their midnight.

import type { RouterUsage } from "./routerUsageTypes";

export type Hour = RouterUsage["hours"][number];
export type Point = { label: string; down: number; up: number };

const hourMs = (h: string) => Date.parse(`${h}:00:00Z`);

export function fmtBytes(n: number) {
  if (!Number.isFinite(n) || n <= 0) return "0 B";
  const units = ["B", "KB", "MB", "GB", "TB"];
  let i = 0;
  while (n >= 1024 && i < units.length - 1) { n /= 1024; i += 1; }
  return `${n >= 100 || i === 0 ? n.toFixed(0) : n >= 10 ? n.toFixed(1) : n.toFixed(2)} ${units[i]}`;
}

/** bytes per second -> "1.2 Mbps" / "340 kbps" */
export function fmtRate(bytesPerSec: number) {
  const bits = bytesPerSec * 8;
  if (bits >= 1e6) return `${(bits / 1e6).toFixed(bits >= 1e7 ? 1 : 2)} Mbps`;
  if (bits >= 1e3) return `${Math.round(bits / 1e3)} kbps`;
  return `${Math.round(bits)} bps`;
}

export function fmtDuration(totalSeconds: number) {
  const s = Math.max(0, Math.floor(totalSeconds));
  const d = Math.floor(s / 86400), h = Math.floor((s % 86400) / 3600), m = Math.floor((s % 3600) / 60), sec = s % 60;
  if (d) return `${d}d ${h}h`;
  if (h) return `${h}h ${m}m`;
  if (m) return `${m}m ${sec}s`;
  return `${sec}s`;
}

export function ago(ms: number) {
  const s = Math.max(0, Math.round(ms / 1000));
  if (s < 5) return "just now";
  if (s < 60) return `${s}s ago`;
  if (s < 3600) return `${Math.floor(s / 60)}m ago`;
  if (s < 86400) return `${Math.floor(s / 3600)}h ago`;
  return `${Math.floor(s / 86400)}d ago`;
}

const startOfDay = (d: Date) => new Date(d.getFullYear(), d.getMonth(), d.getDate()).getTime();

export function totalsSince(hours: Hour[], fromMs: number) {
  let down = 0, up = 0, starts = 0;
  for (const h of hours) if (hourMs(h.h) >= fromMs) { down += h.down; up += h.up; starts += h.starts; }
  return { down, up, starts, total: down + up };
}

export function periodTotals(hours: Hour[], nowMs: number) {
  const now = new Date(nowMs);
  const today = startOfDay(now);
  const monday = today - ((now.getDay() + 6) % 7) * 86400000; // week starts Monday
  const month = new Date(now.getFullYear(), now.getMonth(), 1).getTime();
  return {
    today: totalsSince(hours, today),
    week: totalsSince(hours, monday),
    month: totalsSince(hours, month),
  };
}

/** The last 24 hours, one bar per hour. */
export function hourlySeries(hours: Hour[], nowMs: number): Point[] {
  const byHour = new Map(hours.map((h) => [h.h, h]));
  const out: Point[] = [];
  const top = Math.floor(nowMs / 3600000) * 3600000;
  for (let i = 23; i >= 0; i -= 1) {
    const at = top - i * 3600000;
    const row = byHour.get(new Date(at).toISOString().slice(0, 13));
    out.push({ label: new Date(at).toLocaleTimeString([], { hour: "numeric" }), down: row?.down ?? 0, up: row?.up ?? 0 });
  }
  return out;
}

/** The last `days` days, one bar per day (days start at the viewer's midnight). */
export function dailySeries(hours: Hour[], nowMs: number, days: number): Point[] {
  const first = startOfDay(new Date(nowMs)) - (days - 1) * 86400000;
  const slots: Point[] = Array.from({ length: days }, (_, i) => {
    const d = new Date(first + i * 86400000);
    return { label: days <= 7 ? d.toLocaleDateString([], { weekday: "short", day: "numeric" }) : d.toLocaleDateString([], { day: "numeric", month: "short" }), down: 0, up: 0 };
  });
  for (const h of hours) {
    const idx = Math.floor((startOfDay(new Date(hourMs(h.h))) - first) / 86400000 + 0.01);
    if (idx >= 0 && idx < days) { slots[idx].down += h.down; slots[idx].up += h.up; }
  }
  return slots;
}

/** Which hours of the day are busiest (all data of the last 7 days, grouped by the viewer's clock hour). */
export function peakHours(hours: Hour[], nowMs: number): { label: string; bytes: number; sessions: number }[] {
  const from = nowMs - 7 * 86400000;
  const slots = Array.from({ length: 24 }, (_, hour) => ({ label: `${hour}:00`, bytes: 0, sessions: 0 }));
  for (const h of hours) {
    const t = hourMs(h.h);
    if (t < from) continue;
    const slot = slots[new Date(t).getHours()];
    slot.bytes += h.down + h.up;
    slot.sessions += h.starts;
  }
  return slots;
}
