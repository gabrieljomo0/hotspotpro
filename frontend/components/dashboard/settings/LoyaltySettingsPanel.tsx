"use client";

import { useEffect, useState, type FormEvent } from "react";
import { Star } from "lucide-react";

import { useDashboard } from "../context/DashboardContext";
import { BusinessScopeBanner } from "./BusinessScopeBanner";

export function LoyaltySettingsPanel() {
  const {
    loyaltySettings,
    updateLoyaltySettings,
    loyaltyStrategy,
    updateLoyaltyStrategy,
    getLoyaltySettingsForBusiness,
    updateBusinessLoyaltySettings,
    businessLocations,
    packages,
  } = useDashboard();

  const [selectedBusinessId, setSelectedBusinessId] = useState(businessLocations[0]?.id ?? "");
  const [form, setForm] = useState(
    loyaltyStrategy === "per-business"
      ? getLoyaltySettingsForBusiness(selectedBusinessId)
      : loyaltySettings,
  );

  // Reload the form whenever the strategy changes, or a different
  // business is picked while in "per-business" mode.
  useEffect(() => {
    setForm(
      loyaltyStrategy === "per-business"
        ? getLoyaltySettingsForBusiness(selectedBusinessId)
        : loyaltySettings,
    );
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [loyaltyStrategy, selectedBusinessId]);

  function save(updates: typeof form) {
    if (loyaltyStrategy === "per-business") {
      updateBusinessLoyaltySettings(selectedBusinessId, updates);
    } else {
      updateLoyaltySettings(updates);
    }
  }

  function handleToggle() {
    const nextEnabled = !form.enabled;
    const next = { ...form, enabled: nextEnabled };
    setForm(next);
    save(next);
  }

  function handleSubmit(event: FormEvent) {
    event.preventDefault();
    save(form);
  }

  return (
    <article className="rounded-2xl border border-[#e2e8f0] bg-white p-6 shadow-[0_8px_24px_rgba(37,99,235,0.06)] md:p-8">
      <div className="flex items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-amber-100 text-amber-600">
            <Star size={20} />
          </div>
          <div>
            <h3 className="text-lg font-bold text-[#0f172a]">
              Loyalty Programme
            </h3>
            <p className="text-sm text-[#64748b]">
              Reward frequent WiFi users with points they can redeem for free
              vouchers.
            </p>
          </div>
        </div>

        <button
          type="button"
          onClick={handleToggle}
          className={`relative h-7 w-12 shrink-0 rounded-full transition-colors ${
            form.enabled ? "bg-emerald-500" : "bg-[#e2e8f0]"
          }`}
          aria-pressed={form.enabled}
          aria-label="Toggle loyalty programme"
        >
          <span
            className={`absolute top-1 h-5 w-5 rounded-full bg-white shadow transition-transform ${
              form.enabled ? "translate-x-6" : "translate-x-1"
            }`}
          />
        </button>
      </div>

      {businessLocations.length > 1 && (
        <div className="mt-6 rounded-xl border border-[#f1f5f9] bg-[#ffffff] p-4">
          <div className="flex items-center justify-between gap-3">
            <div>
              <p className="text-sm font-bold text-[#0f172a]">Use the same loyalty programme for every business</p>
              <p className="text-xs text-[#64748b]">
                On — one set of rules for every business/site on the account. Off — each
                business can reward and redeem differently.
              </p>
            </div>
            <button
              type="button"
              onClick={() => updateLoyaltyStrategy(loyaltyStrategy === "same" ? "per-business" : "same")}
              className={`relative h-6 w-11 shrink-0 rounded-full transition ${
                loyaltyStrategy === "same" ? "bg-emerald-500" : "bg-[#e2e8f0]"
              }`}
            >
              <span
                className={`absolute top-0.5 h-5 w-5 rounded-full bg-white shadow transition-transform ${
                  loyaltyStrategy === "same" ? "translate-x-5" : "translate-x-0.5"
                }`}
              />
            </button>
          </div>
        </div>
      )}

      {loyaltyStrategy === "per-business" && businessLocations.length > 1 && (
        <div className="mt-5">
          <BusinessScopeBanner
            businessLocations={businessLocations}
            selectedBusinessId={selectedBusinessId}
            onSelectBusiness={setSelectedBusinessId}
          />
        </div>
      )}

      <form onSubmit={handleSubmit} className="mt-6 grid gap-5 md:grid-cols-2">
        <label className="block">
          <span className="mb-2 block text-sm font-semibold text-[#475569]">
            Points earned per hour online
          </span>
          <input
            type="number"
            min={1}
            value={form.pointsPerHourOnline}
            onChange={(event) =>
              setForm({
                ...form,
                pointsPerHourOnline: Number(event.target.value),
              })
            }
            className="h-11 w-full rounded-xl border border-[#e2e8f0] bg-white px-3 text-sm outline-none focus:border-[#2563eb]"
          />
        </label>

        <label className="block">
          <span className="mb-2 block text-sm font-semibold text-[#475569]">
            Points needed to redeem a voucher
          </span>
          <input
            type="number"
            min={1}
            value={form.pointsToVoucherThreshold}
            onChange={(event) =>
              setForm({
                ...form,
                pointsToVoucherThreshold: Number(event.target.value),
              })
            }
            className="h-11 w-full rounded-xl border border-[#e2e8f0] bg-white px-3 text-sm outline-none focus:border-[#2563eb]"
          />
        </label>

        <label className="block md:col-span-2">
          <span className="mb-2 block text-sm font-semibold text-[#475569]">
            Reward package
          </span>
          <select
            value={form.rewardPackageName}
            onChange={(event) =>
              setForm({ ...form, rewardPackageName: event.target.value })
            }
            className="h-11 w-full rounded-xl border border-[#e2e8f0] bg-white px-3 text-sm outline-none focus:border-[#2563eb]"
          >
            {packages.map((pkg) => (
              <option key={pkg.id} value={pkg.name}>
                {pkg.name}
              </option>
            ))}
          </select>
        </label>

        <div className="md:col-span-2">
          <button
            type="submit"
            className="rounded-xl bg-[#2563eb] px-6 py-3 text-sm font-bold text-white hover:bg-[#1d4ed8]"
          >
            Save Loyalty Settings
          </button>
        </div>
      </form>
    </article>
  );
}
