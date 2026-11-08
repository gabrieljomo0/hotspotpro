"use client";

import { useState, type FormEvent } from "react";
import { Percent } from "lucide-react";

import { useDashboard } from "../context/DashboardContext";

export function CommissionSettingsPanel() {
  const { commissionSettings, updateCommissionSettings } = useDashboard();
  const [form, setForm] = useState(commissionSettings);

  function handleToggle() {
    const nextEnabled = !form.enabled;
    setForm({ ...form, enabled: nextEnabled });
    updateCommissionSettings({ enabled: nextEnabled });
  }

  function handleSubmit(event: FormEvent) {
    event.preventDefault();
    updateCommissionSettings(form);
  }

  return (
    <article className="mt-6 rounded-2xl border border-[#e6e6e6] bg-white p-6 shadow-[0_8px_24px_rgba(26,26,26,0.06)] md:p-8">
      <div className="flex items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-emerald-100 text-emerald-600">
            <Percent size={20} />
          </div>
          <div>
            <h3 className="text-lg font-bold text-[#1a1a1a]">
              Agent Commission
            </h3>
            <p className="text-sm text-[#737373]">
              Show expected commission per agent on the Analytics page.
            </p>
          </div>
        </div>

        <button
          type="button"
          onClick={handleToggle}
          className={`relative h-7 w-12 shrink-0 rounded-full transition-colors ${
            form.enabled ? "bg-emerald-500" : "bg-[#e6e6e6]"
          }`}
          aria-pressed={form.enabled}
          aria-label="Toggle agent commission"
        >
          <span
            className={`absolute top-1 h-5 w-5 rounded-full bg-white shadow transition-transform ${
              form.enabled ? "translate-x-6" : "translate-x-1"
            }`}
          />
        </button>
      </div>

      <form onSubmit={handleSubmit} className="mt-6 flex items-end gap-4">
        <label className="block">
          <span className="mb-2 block text-sm font-semibold text-[#525252]">
            Commission rate (%)
          </span>
          <input
            type="number"
            min={0}
            max={100}
            value={form.ratePercent}
            onChange={(event) =>
              setForm({ ...form, ratePercent: Number(event.target.value) })
            }
            className="h-11 w-40 rounded-xl border border-[#e6e6e6] bg-white px-3 text-sm outline-none focus:border-[#1a1a1a]"
          />
        </label>

        <button
          type="submit"
          className="h-11 rounded-xl bg-[#1a1a1a] px-5 text-sm font-bold text-white hover:bg-[#111111]"
        >
          Save
        </button>
      </form>
    </article>
  );
}
