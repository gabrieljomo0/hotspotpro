"use client";

// Revenue Settings as a pop-up on top of the Revenue page (not a page of its own).

import { sym } from "@/components/dashboard/shared/currency";
import Link from "next/link";
import { useEffect } from "react";
import { Settings2, AlertTriangle, Target, Gift, Percent, X } from "lucide-react";

import { useDashboard } from "@/components/dashboard/context/DashboardContext";

export function RevenueSettingsModal({ onClose }: { onClose: () => void }) {
  const { revenueSettings, updateRevenueSettings, saveRevenueSettings } = useDashboard();

  useEffect(() => {
    function onKey(event: KeyboardEvent) {
      if (event.key === "Escape") onClose();
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);

  return (
    <div
      data-testid="revenue-settings-modal"
      role="dialog"
      aria-modal="true"
      aria-label="Revenue Settings"
      className="fixed inset-0 z-50 flex items-start justify-center overflow-y-auto bg-black/50 p-4 print:hidden"
      onMouseDown={(event) => {
        if (event.target === event.currentTarget) onClose();
      }}
    >
      <section className="my-8 w-full max-w-xl rounded-2xl bg-[#f1f5f9] p-5 shadow-xl">
        <div className="mb-4 flex items-start justify-between gap-3">
          <div>
            <h2 className="flex items-center gap-2 text-xl font-bold text-[#0f172a]">
              <Settings2 className="text-[#2563eb]" size={22} />
              Revenue Settings
            </h2>
            <p className="mt-1 text-xs text-[#64748b]">
              What the Revenue page opens showing, what it flags, and what counts toward the numbers.
            </p>
          </div>
          <button
            type="button"
            data-testid="revenue-settings-close"
            aria-label="Close"
            onClick={onClose}
            className="rounded-lg p-1.5 text-[#64748b] hover:bg-white"
          >
            <X size={18} />
          </button>
        </div>

        <div className="space-y-5">
        <article className="rounded-2xl border border-[#e2e8f0] bg-white p-6 shadow-[0_8px_24px_rgba(37,99,235,0.06)]">
          <p className="mb-1 text-sm font-bold text-[#0f172a]">Default View</p>
          <p className="mb-4 text-xs text-[#64748b]">Which timeframe the Revenue page opens showing.</p>
          <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
            {(["Today", "Daily", "Monthly", "Yearly"] as const).map((tf) => (
              <button
                key={tf}
                type="button"
                onClick={() => updateRevenueSettings({ defaultTimeframe: tf })}
                className={`rounded-xl border-2 px-3 py-2.5 text-sm font-bold transition ${
                  revenueSettings.defaultTimeframe === tf
                    ? "border-[#2563eb] bg-[#f1f5f9] text-[#2563eb]"
                    : "border-[#e2e8f0] bg-white text-[#475569] hover:bg-[#ffffff]"
                }`}
              >
                {tf}
              </button>
            ))}
          </div>
        </article>

        <article className="rounded-2xl border-2 border-amber-200 bg-white p-6">
          <div className="mb-4 flex items-center justify-between gap-3">
            <div className="flex items-center gap-3">
              <span className="flex h-9 w-9 items-center justify-center rounded-lg bg-amber-500 text-white">
                <AlertTriangle size={16} />
              </span>
              <div>
                <p className="text-sm font-bold text-[#0f172a]">Low Revenue Alert</p>
                <p className="text-xs text-[#64748b]">Flag a day whose revenue falls below a threshold.</p>
              </div>
            </div>
            <button
              type="button"
              onClick={() => updateRevenueSettings({ lowRevenueAlertEnabled: !revenueSettings.lowRevenueAlertEnabled })}
              className={`relative h-6 w-11 shrink-0 rounded-full transition ${
                revenueSettings.lowRevenueAlertEnabled ? "bg-amber-500" : "bg-[#e2e8f0]"
              }`}
            >
              <span
                className={`absolute top-0.5 h-5 w-5 rounded-full bg-white shadow transition-transform ${
                  revenueSettings.lowRevenueAlertEnabled ? "translate-x-5" : "translate-x-0.5"
                }`}
              />
            </button>
          </div>
          {revenueSettings.lowRevenueAlertEnabled && (
            <label className="block max-w-xs">
              <span className="mb-1.5 block text-xs font-semibold text-[#475569]">Alert below ({sym()})</span>
              <input
                type="number"
                min={0}
                value={revenueSettings.lowRevenueAlertThreshold}
                onChange={(event) => updateRevenueSettings({ lowRevenueAlertThreshold: Number(event.target.value) })}
                className="h-11 w-full rounded-xl border border-amber-300 bg-white px-3 text-sm outline-none focus:border-amber-500"
              />
            </label>
          )}
        </article>

        <article className="rounded-2xl border-2 border-emerald-200 bg-white p-6">
          <div className="mb-4 flex items-center gap-3">
            <span className="flex h-9 w-9 items-center justify-center rounded-lg bg-emerald-500 text-white">
              <Target size={16} />
            </span>
            <div>
              <p className="text-sm font-bold text-[#0f172a]">Monthly Revenue Goal</p>
              <p className="text-xs text-[#64748b]">Used to show progress toward a target on the Revenue page.</p>
            </div>
          </div>
          <label className="block max-w-xs">
            <span className="mb-1.5 block text-xs font-semibold text-[#475569]">Goal ({sym()} / month)</span>
            <input
              type="number"
              min={0}
              value={revenueSettings.monthlyRevenueGoal}
              onChange={(event) => updateRevenueSettings({ monthlyRevenueGoal: Number(event.target.value) })}
              className="h-11 w-full rounded-xl border border-emerald-300 bg-white px-3 text-sm outline-none focus:border-emerald-500"
            />
          </label>
        </article>

        <article className="flex items-center justify-between gap-3 rounded-2xl border-2 border-blue-200 bg-white p-6">
          <div className="flex items-center gap-3">
            <span className="flex h-9 w-9 items-center justify-center rounded-lg bg-blue-500 text-white">
              <Gift size={16} />
            </span>
            <div>
              <p className="text-sm font-bold text-[#0f172a]">Include Giveaways in Reports</p>
              <p className="text-xs text-[#64748b]">
                Count giveaway vouchers toward "Vouchers Sold" and revenue totals.
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={() => updateRevenueSettings({ includeGiveawaysInReports: !revenueSettings.includeGiveawaysInReports })}
            className={`relative h-6 w-11 shrink-0 rounded-full transition ${
              revenueSettings.includeGiveawaysInReports ? "bg-blue-500" : "bg-[#e2e8f0]"
            }`}
          >
            <span
              className={`absolute top-0.5 h-5 w-5 rounded-full bg-white shadow transition-transform ${
                revenueSettings.includeGiveawaysInReports ? "translate-x-5" : "translate-x-0.5"
              }`}
            />
          </button>
        </article>

        <Link
          href="/dashboards/settings"
          onClick={onClose}
          className="flex items-center gap-3 rounded-2xl border border-[#e2e8f0] bg-white p-6 shadow-[0_8px_24px_rgba(37,99,235,0.06)] hover:bg-[#ffffff]"
        >
          <span className="flex h-9 w-9 items-center justify-center rounded-lg bg-[#2563eb] text-white">
            <Percent size={16} />
          </span>
          <div>
            <p className="text-sm font-bold text-[#0f172a]">Commission Settings</p>
            <p className="text-xs text-[#64748b]">Manage agent commission rates on General Settings →</p>
          </div>
        </Link>

        <button
          type="button"
          data-testid="revenue-settings-save"
          onClick={() => {
            saveRevenueSettings();
            onClose();
          }}
          className="rounded-xl bg-emerald-600 px-6 py-3 text-sm font-bold text-white  hover:bg-emerald-700"
        >
          Save Revenue Settings
        </button>
      </div>
    
      </section>
    </div>
  );
}
