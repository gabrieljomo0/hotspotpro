// Whether a business may keep its captive portal open.
//
// A new business gets a free trial. After that, online access has to be renewed.
// There is a short grace period, then the router locks the portal: no new logins,
// and customers already online are signed out. The same deadline is planted on the
// router, so unplugging it from this server does not leave the portal free forever.

import { currentTenantId, getTenant, updateTenant } from "./store";

export const TRIAL_DAYS = 14;
export const GRACE_DAYS = 3;
const DAY = 24 * 60 * 60 * 1000;

export type AccessDecision = {
  locked: boolean;
  mode: "trial" | "paid" | "grace" | "locked";
  untilMs: number;
  graceEndsMs: number;
  reason: string;
};

export function accessDecision(now = Date.now()): AccessDecision {
  const tenant = getTenant(currentTenantId() ?? "");
  if (!tenant || tenant.status === "suspended") {
    return {
      locked: true,
      mode: "locked",
      untilMs: 0,
      graceEndsMs: 0,
      reason: "This business is suspended.",
    };
  }
  const created = Date.parse(tenant.createdAt) || now;
  const trial = typeof tenant.accessUntilMs !== "number";
  const until = trial ? created + TRIAL_DAYS * DAY : tenant.accessUntilMs!;
  const graceEnds = until + GRACE_DAYS * DAY;
  if (now <= until) {
    return {
      locked: false,
      mode: trial ? "trial" : "paid",
      untilMs: until,
      graceEndsMs: graceEnds,
      reason: trial ? `Trial until ${new Date(until).toISOString().slice(0, 10)}.` : "Online access is paid.",
    };
  }
  if (now <= graceEnds) {
    return {
      locked: false,
      mode: "grace",
      untilMs: until,
      graceEndsMs: graceEnds,
      reason: `Payment is overdue. The portal locks on ${new Date(graceEnds).toISOString().slice(0, 10)} if it is not renewed.`,
    };
  }
  return {
    locked: true,
    mode: "locked",
    untilMs: until,
    graceEndsMs: graceEnds,
    reason: "Online access is not paid. The captive portal is locked until it is renewed.",
  };
}

/** Add paid time. A locked business starts again from today; time already paid is kept. */
export function extendAccess(months: number, now = Date.now()): AccessDecision {
  const id = currentTenantId();
  if (!id) throw new Error("No business is selected.");
  const count = Math.min(36, Math.max(1, Math.round(months)));
  const current = accessDecision(now);
  const base = current.locked ? now : Math.max(now, current.untilMs);
  updateTenant(id, { accessUntilMs: base + count * 30 * DAY });
  return accessDecision(now);
}

/** Super admin: set the exact deadline (ms). */
export function setAccessUntil(tenantId: string, untilMs: number) {
  return updateTenant(tenantId, { accessUntilMs: untilMs });
}
