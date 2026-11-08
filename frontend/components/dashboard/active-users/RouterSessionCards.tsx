"use client";

// A row of cards above the Active Users table: the total number of live
// sessions, then one card per router showing whether it is reachable and
// how many sessions it is carrying. Clicking a card narrows the table below
// to that router (click "Total active" to see everyone again).

import type { RouterSessionSummary } from "./sessionInsights";

export function RouterSessionCards({
  perRouter,
  totalActive,
  upCount,
  downCount,
  selected,
  onSelect,
}: {
  perRouter: RouterSessionSummary[];
  totalActive: number;
  upCount: number;
  downCount: number;
  selected: string; // "All" or a router ip
  onSelect: (routerIp: string) => void;
}) {
  if (perRouter.length === 0) return null;

  return (
    <div className="mb-5 flex flex-wrap gap-3" data-testid="router-session-cards">
      <button
        type="button"
        onClick={() => onSelect("All")}
        aria-pressed={selected === "All"}
        className={`min-w-[170px] rounded-xl border-2 bg-white px-4 py-3 text-left transition ${
          selected === "All" ? "border-[#2563eb]" : "border-[#e2e8f0] hover:border-[#cbd5e1]"
        }`}
      >
        <p className="text-[10px] font-bold uppercase tracking-wide text-[#94a3b8]">Total active</p>
        <p className="mt-1 text-3xl font-black leading-none text-[#2563eb]">
          {totalActive} <span className="text-sm font-semibold text-[#64748b]">online</span>
        </p>
        <p className="mt-1.5 text-[11px] text-[#94a3b8]">
          {upCount}/{perRouter.length} routers{downCount > 0 ? ` · ${downCount} failed` : ""}
        </p>
      </button>

      {perRouter.map(({ router, up, active }) => (
        <button
          type="button"
          key={router.ip}
          onClick={() => onSelect(router.ip)}
          aria-pressed={selected === router.ip}
          title={up ? undefined : "This router is unreachable, so its live count isn't available."}
          className={`min-w-[150px] rounded-xl border-2 bg-white px-4 py-3 text-left transition ${
            selected === router.ip ? "border-[#2563eb]" : "border-[#e2e8f0] hover:border-[#cbd5e1]"
          }`}
        >
          <p className="flex items-center gap-2 text-sm font-semibold text-[#0f172a]">
            <span
              aria-label={up ? "Router up" : "Router down"}
              className={`h-2 w-2 shrink-0 rounded-full ${up ? "bg-emerald-500" : "bg-red-500"}`}
            />
            {router.name.split(" (")[0]}
          </p>
          <p className="mt-1.5 text-2xl font-black leading-none text-[#0f172a]">
            {up ? active : "—"}{" "}
            <span className="text-sm font-semibold text-[#64748b]">{up ? "active" : "down"}</span>
          </p>
        </button>
      ))}
    </div>
  );
}
