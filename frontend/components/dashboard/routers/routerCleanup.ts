// Per-router automatic clean-up: prune inactive users, wipe expired
// vouchers, and clear remembered-device cookies. Pure helpers only; the
// state and the scheduler live in DashboardContext.

import type { ActiveUser } from "../data/dashboard-data";
import type { Voucher, VoucherBatch } from "../shared/types";

export type RouterCleanupSettings = {
  pruneEnabled: boolean;
  pruneAfterDays: number;
  vouchersEnabled: boolean;
  vouchersAfterDays: number;
  cookiesEnabled: boolean;
  cookiesAfterDays: number;
  // Time of day (HH:MM, 24h) the automatic clean-up runs.
  runAt: string;
  lastRunMs: number | null;
};

export const DEFAULT_ROUTER_CLEANUP: RouterCleanupSettings = {
  pruneEnabled: false,
  pruneAfterDays: 7,
  vouchersEnabled: false,
  vouchersAfterDays: 7,
  cookiesEnabled: false,
  cookiesAfterDays: 30,
  runAt: "03:00",
  lastRunMs: null,
};

export const anyCleanupOn = (s: RouterCleanupSettings) => s.pruneEnabled || s.vouchersEnabled || s.cookiesEnabled;

const DAY_MS = 24 * 60 * 60 * 1000;
const ageDays = (ms: number, now: number) => (now - ms) / DAY_MS;

// A user is inactive when they are not online and have not been seen for
// the set number of days. Users with no recorded last-seen time are left
// alone — there is nothing to measure.
export function inactiveUsers(users: ActiveUser[], routerIp: string, days: number, now = Date.now()) {
  return users.filter(
    (u) => u.routerIp === routerIp && u.status !== "Online" && u.lastSeenMs !== undefined && ageDays(u.lastSeenMs, now) >= days,
  );
}

export function expiredVouchersFor(
  vouchers: Voucher[],
  batches: VoucherBatch[],
  routerIp: string,
  days: number,
  routerOfVoucher: (v: Voucher) => string | null,
  now = Date.now(),
) {
  const batchById = new Map(batches.map((b) => [b.id, b]));
  return vouchers.filter((v) => {
    if (v.status !== "Expired") return false;
    const batch = v.batchId ? batchById.get(v.batchId) : undefined;
    const onRouter = batch ? batch.routerIps.includes(routerIp) : routerOfVoucher(v) === routerIp;
    return onRouter && ageDays(v.usedAtMs ?? v.generatedAtMs, now) >= days;
  });
}

export function staleCookies(users: ActiveUser[], routerIp: string, days: number, now = Date.now()) {
  return users.filter((u) => u.routerIp === routerIp && u.cookieSetAtMs !== undefined && ageDays(u.cookieSetAtMs, now) >= days);
}

export function cookieCount(users: ActiveUser[], routerIp: string) {
  return users.filter((u) => u.routerIp === routerIp && u.cookieSetAtMs !== undefined).length;
}

// Has today's scheduled time passed without a run yet?
export function isDue(s: RouterCleanupSettings, now = new Date()): boolean {
  if (!anyCleanupOn(s)) return false;
  const [h, m] = s.runAt.split(":").map(Number);
  const scheduled = new Date(now);
  scheduled.setHours(Number.isFinite(h) ? h : 3, Number.isFinite(m) ? m : 0, 0, 0);
  if (now.getTime() < scheduled.getTime()) return false;
  return s.lastRunMs === null || s.lastRunMs < scheduled.getTime();
}
