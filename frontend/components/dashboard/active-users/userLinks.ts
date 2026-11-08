import type { ActiveUser } from "../data/dashboard-data";

export function getUserId(user: ActiveUser) {
  return user.phone || user.voucherUsername;
}

export function userActionHref(userId: string, action?: string) {
  const base = `/dashboards/active-users/${encodeURIComponent(userId)}`;
  // Advanced details now live on the one session page — there is no separate page.
  return action && action !== "advanced-details" ? `${base}/${action}` : base;
}
