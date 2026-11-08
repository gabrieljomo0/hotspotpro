"use client";

import Link from "next/link";
import { Router } from "lucide-react";

import { useDashboard } from "../context/DashboardContext";
import { useDashboardScope } from "./useDashboardScope";

export function RoutersOnlineStatCard() {
  const { routerEnabled } = useDashboard();
  // Only the routers inside the dashboard filter (all of them, by default).
  const { routers } = useDashboardScope();

  const onlineCount = routers.filter((router) => routerEnabled[router.ip]).length;
  const offlineCount = routers.length - onlineCount;
  const pct = routers.length
    ? Math.round((onlineCount / routers.length) * 100)
    : 0;

  return (
    <Link
      href="/dashboards/configuration/routers"
      className="min-h-[150px] rounded-2xl border border-[#e2e8f0] bg-white p-5 shadow-[0_8px_24px_rgba(37,99,235,0.06)] transition-all duration-300 hover:-translate-y-1 hover:shadow-lg  "
    >
      <div className="flex items-center gap-4">
        <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-full bg-[#e9fbf3] text-[#0f9f6e] ">
          <Router size={27} />
        </div>

        <div className="min-w-0">
          <p className="text-sm font-medium text-[#64748b] ">
            Routers Online
          </p>

          <p className="mt-2 truncate text-2xl font-bold">
            {onlineCount} / {routers.length}
          </p>

          <p className="mt-3 flex flex-wrap items-center gap-x-2 gap-y-1 text-xs">
            <span className="text-[#64748b]">{pct}% online</span>
            {offlineCount > 0 && (
              <span className="inline-flex items-center gap-1 font-semibold text-red-600">
                <span className="h-1.5 w-1.5 rounded-full bg-red-500" />
                {offlineCount} down
              </span>
            )}
          </p>
        </div>
      </div>
    </Link>
  );
}
