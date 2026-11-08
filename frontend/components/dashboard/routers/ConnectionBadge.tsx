"use client";

// A small red / green tag beside a router's name in the lists:
//   red   "Lost internet"  — the router stopped contacting HotspotPro (lost its internet or power)
//   red   "Disconnected"   — you disconnected it (its internet is cut)
//   green "Back online"    — reconnected, or recovered from losing contact, in the last 10 minutes
import { connectionIndicator, type ControlInfo } from "./routerConnection";

export function ConnectionBadge({
  router,
  control,
}: {
  router: { disconnected?: boolean; disconnectedAt?: string; reconnectedAt?: string };
  control?: ControlInfo;
}) {
  const indicator = connectionIndicator(router, control, Date.now());
  if (!indicator) return null;
  const red = indicator.kind !== "back";
  const label = indicator.kind === "lost" ? "Lost internet" : indicator.kind === "disconnected" ? "Disconnected" : "Back online";
  return (
    <span
      data-testid="router-connection-badge"
      data-kind={indicator.kind}
      className={`ml-2 inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-bold ${red ? "bg-[#f3f1ec] text-[#1a1a1a]" : "bg-[#f3f1ec] text-[#111111]"}`}
    >
      <span className={`h-1.5 w-1.5 rounded-full ${red ? "bg-[#1a1a1a]" : "bg-[#1a1a1a]"}`} />
      {label}
    </span>
  );
}
