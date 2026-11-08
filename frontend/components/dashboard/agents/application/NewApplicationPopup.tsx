"use client";

// A pop-up in the corner of the dashboard when someone applies to become a
// reseller on the captive portal. It stays until you review or dismiss it,
// then doesn't come back for those applications. If several arrive while
// you're away, they're grouped into one. It lives in the dashboard shell, so
// it shows on the main dashboard (and every other dashboard page).

import { useRouter } from "next/navigation";
import { Bell, X } from "lucide-react";

import { useDashboard } from "../../context/DashboardContext";

const SHOWN = 3;

export function NewApplicationPopup() {
  const router = useRouter();
  const { storeReady, approvalRequests, agents, routers, notifiedApplicationIds, markApplicationsNotified } =
    useDashboard();

  // Wait until saved data has loaded, so applications you've already seen
  // never flash up again.
  if (!storeReady) return null;

  const fresh = approvalRequests.filter(
    (request) =>
      request.type === "New Agent" &&
      (request.status === "Pending" || request.status === "Under Review") &&
      !notifiedApplicationIds.includes(request.id) &&
      agents.some((agent) => agent.id === request.agentId),
  );
  if (fresh.length === 0) return null;

  const ids = fresh.map((request) => request.id);
  const shown = fresh.slice(0, SHOWN);

  return (
    <div
      role="alert"
      aria-live="polite"
      data-testid="new-application-popup"
      className="fixed right-4 top-20 z-[70] w-[min(380px,calc(100vw-2rem))] overflow-hidden rounded-2xl border border-amber-300 bg-white shadow-2xl"
    >
      <div className="flex items-start gap-3 border-b border-amber-200 bg-amber-50 px-4 py-3">
        <div className="mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-amber-500 text-white">
          <Bell size={17} />
        </div>
        <div className="min-w-0 flex-1">
          <p className="text-sm font-bold text-[#1a1a1a]" data-testid="popup-title">
            {fresh.length === 1 ? "New reseller application" : `${fresh.length} new reseller applications`}
          </p>
          <p className="text-xs text-[#737373]">Someone applied on the captive portal.</p>
        </div>
        <button
          type="button"
          aria-label="Dismiss"
          onClick={() => markApplicationsNotified(ids)}
          className="rounded-lg p-1 text-[#a3a3a3] hover:bg-amber-100 hover:text-[#525252]"
        >
          <X size={16} />
        </button>
      </div>

      <ul className="divide-y divide-[#f4f4f4]">
        {shown.map((request) => {
          const agent = agents.find((a) => a.id === request.agentId);
          const router_ = agent ? routers.find((r) => r.ip === agent.routerIp) : undefined;
          return (
            <li key={request.id} data-testid="popup-application" className="px-4 py-3">
              <p className="text-sm font-semibold text-[#1a1a1a]">{request.agentName}</p>
              <p className="text-xs text-[#737373]">
                {[agent?.phone, agent?.location, router_ ? `from ${router_.name.split(" (")[0]}` : null]
                  .filter(Boolean)
                  .join(" · ")}
              </p>
              <p className="text-[11px] text-[#a3a3a3]">{request.createdAt}</p>
            </li>
          );
        })}
        {fresh.length > SHOWN && (
          <li className="px-4 py-2 text-xs text-[#a3a3a3]">+ {fresh.length - SHOWN} more</li>
        )}
      </ul>

      <div className="flex gap-2 border-t border-[#f4f4f4] px-4 py-3">
        <button
          type="button"
          onClick={() => {
            markApplicationsNotified(ids);
            router.push("/dashboards/agents?tab=applications");
          }}
          className="flex-1 rounded-lg bg-[#1a1a1a] px-3 py-2.5 text-sm font-bold text-white hover:bg-[#111111]"
        >
          {fresh.length === 1 ? "Review application" : "Review applications"}
        </button>
        <button
          type="button"
          onClick={() => markApplicationsNotified(ids)}
          className="rounded-lg border border-[#e6e6e6] bg-white px-4 py-2.5 text-sm font-semibold text-[#525252] hover:bg-[#ffffff]"
        >
          Dismiss
        </button>
      </div>
    </div>
  );
}
