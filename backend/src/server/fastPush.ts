// Fast push: get site changes onto the router in ~2s without a heavy check-in every 2s.
//
// The full check-in (hotspotpro-control) is ~70 KB of RouterOS and runs every CHECKIN_INTERVAL.
// A tiny router scheduler (hotspotpro-ping) asks /api/provision/<token>/pending every 2s instead; the
// answer is one byte. "1" makes the router run the check-in straight away.

import { getState, hasQueuedJobs } from "./store";

// Site data whose change should reach the router at once. Not "routers": every check-in updates it.
// "portalPush" changes when a customer taps Connect on the site portal: one immediate run; while that
// login waits, the check-in itself already runs every 3s.
const WATCHED = ["packages", "vouchers", "deletedPackages", "portalPush"];

// token -> content version the router last received. In memory: after a restart the first answer is
// "0" until the next normal check-in, which is at most CHECKIN_INTERVAL away.
const served = new Map<string, number>();

function contentVersion(): number {
  let v = 0;
  for (const key of WATCHED) v = Math.max(v, getState(key)?.seq ?? 0);
  return v;
}

/** Call when a check-in script was built for this router (inside its business). */
export function markServed(token: string) {
  served.set(token, contentVersion());
}

/** Should this router run its check-in now? (inside its business) */
export function needsCheckIn(token: string): boolean {
  if (hasQueuedJobs(token)) return true;
  const seen = served.get(token);
  return seen !== undefined && contentVersion() > seen;
}
