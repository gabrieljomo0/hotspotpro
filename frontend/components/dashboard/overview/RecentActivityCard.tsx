"use client";

import { sym } from "@/components/dashboard/shared/currency";
import { useState } from "react";
import Link from "next/link";
import { Gift, Package, Router as RouterIcon, Users, UserCog, Settings, Clock, Receipt } from "lucide-react";

import { useDashboard } from "../context/DashboardContext";
import { useDashboardScope } from "./useDashboardScope";
import type { ActivityLogEntry } from "../shared/types";

const CATEGORY_ICON: Record<ActivityLogEntry["category"], typeof Gift> = {
  Voucher: Gift,
  Package: Package,
  Router: RouterIcon,
  Agent: UserCog,
  User: Users,
  Settings: Settings,
};

const CATEGORY_COLOR: Record<ActivityLogEntry["category"], string> = {
  Voucher: "bg-blue-100 text-blue-700",
  Package: "bg-blue-100 text-blue-700",
  Router: "bg-blue-100 text-blue-700",
  Agent: "bg-amber-100 text-amber-700",
  User: "bg-emerald-100 text-emerald-700",
  Settings: "bg-slate-200 text-slate-700",
};

function parsePrice(price: string): number {
  const match = price.match(/[\d,.]+/);
  return match ? parseFloat(match[0].replace(/,/g, "")) : 0;
}

type View = "transactions" | "activities";

export function RecentActivityCard() {
  const { packages, agents } = useDashboard();
  // Only what falls inside the dashboard filter (everything, by default).
  const { activity: activityLog, vouchers, resolved } = useDashboardScope();
  // Defaults to Recent Transactions, per how this card is meant to open.
  const [view, setView] = useState<View>("transactions");

  const recentActivity = activityLog.slice(0, 6);

  const priceByPackage = Object.fromEntries(packages.map((p) => [p.name, parsePrice(p.price)]));
  const recentTransactions = vouchers
    .filter((v) => v.status === "Used")
    .sort((a, b) => b.generatedAtMs - a.generatedAtMs)
    .slice(0, 6);

  return (
    <article className="overflow-hidden rounded-2xl border border-[#e6e6e6] bg-white shadow-[0_8px_24px_rgba(26,26,26,0.06)]">
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-[#e6e6e6] px-5 py-4">
        <div className="flex gap-2">
          <button
            type="button"
            onClick={() => setView("transactions")}
            className={`flex items-center gap-2 rounded-xl px-3.5 py-2 text-sm font-bold transition ${
              view === "transactions"
                ? "bg-emerald-500 text-white shadow"
                : "bg-[#ffffff] text-[#737373] hover:bg-[#f4f4f4]"
            }`}
          >
            <Receipt size={15} />
            Recent Transactions
          </button>
          <button
            type="button"
            onClick={() => setView("activities")}
            className={`flex items-center gap-2 rounded-xl px-3.5 py-2 text-sm font-bold transition ${
              view === "activities"
                ? "bg-[#1a1a1a] text-white shadow"
                : "bg-[#ffffff] text-[#737373] hover:bg-[#f4f4f4]"
            }`}
          >
            <Clock size={15} />
            Recent Activities
          </button>
        </div>

        <Link
          href={view === "transactions" ? "/dashboards/revenue/router-agent-breakdown" : "/dashboards/settings/activity-logs"}
          className="text-xs font-semibold text-[#1a1a1a] hover:underline"
        >
          {view === "transactions" ? "View all transactions" : "View full history"}
        </Link>
      </div>

      {view === "transactions" ? (
        recentTransactions.length === 0 ? (
          <p className="px-5 py-8 text-center text-sm text-[#a3a3a3]">
            {resolved.filtered ? "No sales for this view yet." : "No sales yet. Completed voucher sales will show up here."}
          </p>
        ) : (
          <div className="divide-y divide-[#f4f4f4]">
            {recentTransactions.map((v) => {
              const agent = agents.find((a) => a.id === v.agentId);
              return (
                <div key={v.code} className="flex items-center gap-3 px-5 py-3">
                  <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-emerald-100 text-emerald-700">
                    <Receipt size={14} />
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm text-[#525252]">
                      {v.packageName} · {v.redeemerPhone ?? "Walk-in"}
                      {agent ? ` · ${agent.name}` : ""}
                    </p>
                  </div>
                  <span className="shrink-0 text-sm font-bold text-emerald-600">
                    {sym()} {(priceByPackage[v.packageName] ?? 0).toLocaleString()}
                  </span>
                </div>
              );
            })}
          </div>
        )
      ) : recentActivity.length === 0 ? (
        <p className="px-5 py-8 text-center text-sm text-[#a3a3a3]">
          {resolved.filtered ? "No activity for this view yet." : "No activity yet. Actions you take will show up here."}
        </p>
      ) : (
        <div className="divide-y divide-[#f4f4f4]">
          {recentActivity.map((entry: ActivityLogEntry) => {
            const Icon = CATEGORY_ICON[entry.category];

            return (
              <div key={entry.id} className="flex items-center gap-3 px-5 py-3">
                <div
                  className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-full ${CATEGORY_COLOR[entry.category]}`}
                >
                  <Icon size={14} />
                </div>
                <p className="min-w-0 flex-1 truncate text-sm text-[#525252]">
                  {entry.message}
                </p>
                <span className="shrink-0 text-xs text-[#a3a3a3]">
                  {entry.timestamp}
                </span>
              </div>
            );
          })}
        </div>
      )}
    </article>
  );
}
