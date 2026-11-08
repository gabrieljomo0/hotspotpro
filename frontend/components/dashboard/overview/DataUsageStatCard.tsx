"use client";

import Link from "next/link";
import { Database } from "lucide-react";

import { formatDataAmount, totalDataUsedMb } from "./dashboardScope";
import { useDashboardScope } from "./useDashboardScope";

// Total data used by the users inside the dashboard filter — added up from
// each user's real "data used", not a fixed number.
export function DataUsageStatCard() {
  const { users } = useDashboardScope();
  const totalMb = totalDataUsedMb(users);

  return (
    <Link
      href="/dashboards/analytics/data-usage"
      className="min-h-[150px] rounded-2xl border border-[#e6e6e6] bg-white p-5 shadow-[0_8px_24px_rgba(26,26,26,0.06)] transition-all duration-300 hover:-translate-y-1 hover:shadow-lg"
    >
      <div className="flex items-center gap-4">
        <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-full bg-[#f4f4f4] text-[#1a1a1a]">
          <Database size={27} />
        </div>

        <div className="min-w-0">
          <p className="text-sm font-medium text-[#737373]">Data Usage</p>
          <p data-testid="data-usage-value" className="mt-2 truncate text-2xl font-bold">
            {formatDataAmount(totalMb)}
          </p>
          <p className="mt-3 text-xs font-medium text-[#1a1a1a]">
            Across {users.length} user{users.length === 1 ? "" : "s"} · View usage breakdown
          </p>
        </div>
      </div>
    </Link>
  );
}
