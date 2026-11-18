import type { ControlInfo } from "./routerConnection";

export type LiveStatus = "Online" | "Offline" | "Disabled";

/** What the Status column / badge should show for a router right now. */
export function routerLiveStatus(
  router: {
    ip: string;
    status?: string;
    disconnected?: boolean;
    provisioningStatus?: string;
  },
  control: ControlInfo | null | undefined,
  routerEnabled?: Record<string, boolean>,
): LiveStatus {
  if (routerEnabled && routerEnabled[router.ip] === false) return "Disabled";
  if (router.disconnected) return "Offline";
  if (control?.lostSignal) return "Offline";
  if (control?.hasToken && !control.lastCheckInAt && router.provisioningStatus === "Provisioned") return "Offline";
  // Fresh check-in beats a stale Offline status on the router row.
  if (control?.lastCheckInAt && !control.lostSignal) return "Online";
  if (router.status === "Online") return "Online";
  if (routerEnabled?.[router.ip]) return "Online";
  if (router.status === "Offline") return "Offline";
  return "Offline";
}

export function isRouterLiveOnline(
  router: { ip: string; status?: string; disconnected?: boolean; provisioningStatus?: string },
  control: ControlInfo | null | undefined,
  routerEnabled?: Record<string, boolean>,
) {
  return routerLiveStatus(router, control, routerEnabled) === "Online";
}
