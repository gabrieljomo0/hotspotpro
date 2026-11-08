"use client";

import { History, Trash2 } from "lucide-react";

import { useDashboard } from "../context/DashboardContext";
import type { HistoryRetention } from "../shared/types";

const OPTIONS: HistoryRetention[] = ["Never", "30 Days", "90 Days", "1 Year"];

export function HistorySettingsPanel() {
  const { historyRetention, updateHistoryRetention, activityLog, clearHistory } =
    useDashboard();

  return (
    <article className="mt-6 rounded-2xl border border-[#e2e8f0] bg-white p-6 shadow-[0_8px_24px_rgba(37,99,235,0.06)] md:p-8">
      <div className="flex items-center gap-3">
        <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-[#f1f5f9] text-[#2563eb]">
          <History size={20} />
        </div>
        <div>
          <h3 className="text-lg font-bold text-[#0f172a]">
            History &amp; Activity Log
          </h3>
          <p className="text-sm text-[#64748b]">
            {activityLog.length} event{activityLog.length === 1 ? "" : "s"}{" "}
            recorded so far. History is never cleared automatically unless you
            set a retention period below.
          </p>
        </div>
      </div>

      <div className="mt-6">
        <span className="mb-2 block text-sm font-semibold text-[#475569]">
          Automatically clear history older than
        </span>
        <div className="flex flex-wrap gap-2">
          {OPTIONS.map((option) => (
            <button
              type="button"
              key={option}
              onClick={() => updateHistoryRetention(option)}
              className={`rounded-xl border px-4 py-2.5 text-sm font-semibold transition ${
                historyRetention === option
                  ? "border-[#2563eb] bg-[#f1f5f9] text-[#2563eb]"
                  : "border-[#e2e8f0] text-[#475569] hover:bg-[#ffffff]"
              }`}
            >
              {option}
            </button>
          ))}
        </div>
        <p className="mt-2 text-xs text-[#94a3b8]">
          "Never" keeps every event for as long as your account exists.
        </p>
      </div>

      <button
        type="button"
        onClick={clearHistory}
        className="mt-6 inline-flex items-center gap-2 rounded-xl border border-red-200 bg-white px-4 py-3 text-sm font-bold text-red-600 hover:bg-red-50"
      >
        <Trash2 size={16} />
        Clear History Now
      </button>
    </article>
  );
}
