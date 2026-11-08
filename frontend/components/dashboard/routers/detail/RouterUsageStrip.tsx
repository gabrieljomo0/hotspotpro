"use client";

// A one-line summary of this router's data under its name, shown on every tab:
// speed right now, customers online, data used today. Click it for the full Data Usage tab.
import { useMemo } from "react";
import { Activity } from "lucide-react";

import { useRouterUsage } from "./useRouterUsage";
import { fmtBytes, fmtRate, periodTotals } from "./routerUsageMath";

export function RouterUsageStrip({ routerIp, onOpen }: { routerIp: string; onOpen: () => void }) {
  const { data } = useRouterUsage(routerIp, 10000);
  const today = useMemo(() => periodTotals(data?.hours ?? [], data?.now ?? Date.now()).today, [data]);
  const live = data?.live;

  return (
    <button
      type="button"
      onClick={onOpen}
      data-testid="router-usage-strip"
      className="mb-6 flex w-full flex-wrap items-center gap-x-6 gap-y-2 rounded-xl border border-[#e2e8f0] bg-white px-5 py-3 text-left hover:bg-[#f8fafc]"
    >
      <span className="flex items-center gap-2 text-sm font-bold text-[#0f172a]">
        <Activity size={16} className="text-[#2563eb]" />
        Data usage
        <span className={`rounded-full px-2 py-0.5 text-[10px] font-bold ${live?.fresh ? "bg-[#ecfdf5] text-[#047857]" : "bg-[#f1f5f9] text-[#64748b]"}`}>
          {live?.fresh ? "LIVE" : "IDLE"}
        </span>
      </span>
      <span className="text-sm text-[#475569]">↓ <strong className="text-[#0f172a]">{fmtRate(live?.downBytesPerSec ?? 0)}</strong></span>
      <span className="text-sm text-[#475569]">↑ <strong className="text-[#0f172a]">{fmtRate(live?.upBytesPerSec ?? 0)}</strong></span>
      <span className="text-sm text-[#475569]"><strong className="text-[#0f172a]">{live?.online ?? 0}</strong> online</span>
      <span className="text-sm text-[#475569]">Today <strong className="text-[#0f172a]">{fmtBytes(today.total)}</strong></span>
      <span className="ml-auto text-xs font-semibold text-[#2563eb]">See everything →</span>
    </button>
  );
}
