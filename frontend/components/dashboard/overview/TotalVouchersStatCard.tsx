"use client";

import Link from "next/link";
import { Ticket } from "lucide-react";

import { useDashboardScope } from "./useDashboardScope";

export function TotalVouchersStatCard() {
  // The vouchers inside the dashboard filter (everything, by default).
  const { vouchers } = useDashboardScope();

  const availableCount = vouchers.filter((v) => v.status === "Available").length;
  const usedCount = vouchers.filter((v) => v.status === "Used").length;

  return (
    <Link
      href="/dashboards/vouchers"
      className="min-h-[150px] rounded-2xl border border-[#e6e6e6] bg-white p-5 shadow-[0_8px_24px_rgba(26,26,26,0.06)] transition-all duration-300 hover:-translate-y-1 hover:shadow-lg  "
    >
      <div className="flex items-center gap-4">
        <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-full bg-[#f4f4f4] text-[#1a1a1a] ">
          <Ticket size={27} />
        </div>

        <div className="min-w-0">
          <p className="text-sm font-medium text-[#737373] ">Total Vouchers</p>

          <p className="mt-2 truncate text-2xl font-bold">{vouchers.length}</p>

          <p className="mt-3 flex flex-wrap items-center gap-x-2 gap-y-1 text-xs">
            <span className="inline-flex items-center gap-1 font-semibold text-emerald-600">
              <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" />
              {availableCount} Available
            </span>
            <span className="inline-flex items-center gap-1 font-semibold text-slate-500">
              <span className="h-1.5 w-1.5 rounded-full bg-slate-400" />
              {usedCount} Used
            </span>
          </p>
        </div>
      </div>
    </Link>
  );
}
