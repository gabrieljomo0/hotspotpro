"use client";

import { useState } from "react";
import {
  Gift,
  Package,
  Router as RouterIcon,
  Users,
  UserCog,
  Settings,
  Trash2,
} from "lucide-react";

import { useDashboard } from "@/components/dashboard/context/DashboardContext";
import type { ActivityLogEntry } from "@/components/dashboard/shared/types";
import { BackLink } from "@/components/dashboard/shared/BackLink";

const CATEGORY_ICON: Record<ActivityLogEntry["category"], typeof Gift> = {
  Voucher: Gift,
  Package: Package,
  Router: RouterIcon,
  Agent: UserCog,
  User: Users,
  Settings: Settings,
};

const CATEGORY_COLOR: Record<string, string> = {
  Voucher: "bg-blue-100 text-blue-700",
  Package: "bg-blue-100 text-blue-700",
  Router: "bg-blue-100 text-blue-700",
  Agent: "bg-amber-100 text-amber-700",
  User: "bg-emerald-100 text-emerald-700",
  Settings: "bg-slate-200 text-slate-700",
};

export default function HistoryPage() {
  const { activityLog, clearHistory } = useDashboard();
  const [filter, setFilter] = useState("All");

  const categories = ["All", "Voucher", "Package", "Router", "Agent", "User", "Settings"];

  const filteredLog =
    filter === "All"
      ? activityLog
      : activityLog.filter((entry) => entry.category === filter);

  return (
    <section className="w-full">
      <BackLink />
      <div className="flex flex-col justify-between gap-4 md:flex-row md:items-start">
        <div>
          <h2 className="text-3xl font-bold tracking-tight md:text-4xl">
            Activity Logs
          </h2>
          <p className="mt-2 max-w-xl text-sm text-[#64748b] md:text-base">
            Every action taken on your account since it was created.
          </p>
        </div>

        <div className="flex gap-3">
          <button
            type="button"
            onClick={clearHistory}
            className="inline-flex items-center gap-2 rounded-xl border border-red-200 bg-white px-4 py-3 text-sm font-bold text-red-600 hover:bg-red-50"
          >
            <Trash2 size={16} />
            Clear History
          </button>
        </div>
      </div>

      <div className="mt-5 flex flex-wrap gap-2">
        {categories.map((category) => (
          <button
            type="button"
            key={category}
            onClick={() => setFilter(category)}
            className={`rounded-full border px-4 py-2 text-sm font-semibold transition ${
              filter === category
                ? "border-[#2563eb] bg-[#f1f5f9] text-[#2563eb]"
                : "border-[#e2e8f0] bg-white text-[#475569] hover:bg-[#ffffff]"
            }`}
          >
            {category}
          </button>
        ))}
      </div>

      <article className="mt-5 overflow-hidden rounded-2xl border border-[#e2e8f0] bg-white shadow-[0_8px_24px_rgba(37,99,235,0.06)]">
        {filteredLog.length === 0 ? (
          <div className="px-5 py-14 text-center text-sm text-[#94a3b8]">
            No activity recorded yet. Actions you take across the dashboard
            will show up here.
          </div>
        ) : (
          <div className="divide-y divide-[#f1f5f9]">
            {filteredLog.map((entry: ActivityLogEntry) => {
              const Icon = CATEGORY_ICON[entry.category];

              return (
                <div
                  key={entry.id}
                  className="flex items-center gap-4 px-5 py-4"
                >
                  <div
                    className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-full ${CATEGORY_COLOR[entry.category]}`}
                  >
                    <Icon size={16} />
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="text-sm text-[#475569]">{entry.message}</p>
                  </div>
                  <span className="shrink-0 text-xs text-[#94a3b8]">
                    {entry.timestamp}
                  </span>
                </div>
              );
            })}
          </div>
        )}
      </article>
    </section>
  );
}
