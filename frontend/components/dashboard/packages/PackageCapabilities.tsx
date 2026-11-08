"use client";

// "Advanced Features" of the package form — back to the original plain
// layout: one flat white section, simple Yes/No toggles for Burst and
// Schedule, small switches for PPPoE / Hotspot / Agent Reselling, divided
// by plain border lines. No cards, no grouped columns.

import { sym } from "@/components/dashboard/shared/currency";
import type { PackageInput, AgentProfile } from "../shared/types";

type UpdateField = <K extends keyof PackageInput>(key: K, value: PackageInput[K]) => void;

function YesNoToggle({
  value,
  onChange,
}: {
  value: boolean;
  onChange: (next: boolean) => void;
}) {
  return (
    <div className="inline-flex overflow-hidden rounded-lg border border-[#e2e8f0]">
      <button
        type="button"
        onClick={() => onChange(true)}
        className={`px-4 py-2 text-sm font-bold transition ${
          value ? "bg-[#0f172a] text-white" : "bg-white text-[#475569]"
        }`}
      >
        Yes
      </button>
      <button
        type="button"
        onClick={() => onChange(false)}
        className={`px-4 py-2 text-sm font-bold transition ${
          !value ? "bg-emerald-500 text-white" : "bg-white text-[#475569]"
        }`}
      >
        No
      </button>
    </div>
  );
}

function Switch({
  checked,
  onChange,
}: {
  checked: boolean;
  onChange: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onChange}
      className={`relative h-6 w-11 shrink-0 rounded-full transition ${
        checked ? "bg-emerald-500" : "bg-[#e2e8f0]"
      }`}
    >
      <span
        className={`absolute top-0.5 h-5 w-5 rounded-full bg-white shadow transition-transform ${
          checked ? "translate-x-5" : "translate-x-0.5"
        }`}
      />
    </button>
  );
}

export function PackageCapabilities({
  form,
  update,
  actingAgent,
}: {
  form: PackageInput;
  update: UpdateField;
  // Only passed from the agent portal -- caps "Agent price" against
  // their resale markup limit and gates who can even touch the field.
  actingAgent?: AgentProfile;
}) {
  const isAgentContext = !!actingAgent;
  const canSetOwnPrice = !isAgentContext || actingAgent!.permissions["packages.setOwnPricing"] === "Allowed";
  const cap = isAgentContext ? actingAgent!.maxResaleMarkupPercent : null;
  const basePrice = Number(form.price.replace(/[^0-9.]/g, "")) || 0;
  const capAmount = cap !== null ? Math.round(basePrice * (1 + cap / 100) * 100) / 100 : null;
  const enteredPrice = Number(form.agentPrice);
  const overCap = capAmount !== null && form.agentPrice.trim() !== "" && !Number.isNaN(enteredPrice) && enteredPrice > capAmount;

  return (
    <section className="rounded-2xl border border-[#e2e8f0] bg-white p-6 shadow-[0_8px_24px_rgba(37,99,235,0.06)] md:p-8">
      <h3 className="text-base font-bold text-[#0f172a]">Advanced Features</h3>
      <p className="mb-5 text-xs text-[#64748b]">Configure burst and scheduling features.</p>

      <div className="space-y-5">
        <div>
          <span className="mb-2 block text-sm font-semibold text-[#475569]">
            Enable burst for this package?
          </span>
          <YesNoToggle value={form.burstEnabled} onChange={(v) => update("burstEnabled", v)} />
        </div>

        <div>
          <span className="mb-1 block text-sm font-semibold text-[#475569]">
            Enable schedule for this package?
          </span>
          <p className="mb-2 text-xs text-[#94a3b8]">
            Enable to make this package available only during specific times.
          </p>
          <YesNoToggle value={form.scheduleEnabled} onChange={(v) => update("scheduleEnabled", v)} />
        </div>

        <div className="border-t border-[#f1f5f9] pt-5">
          <span className="mb-1 block text-sm font-semibold text-[#475569]">Enable PPPoE support?</span>
          <p className="mb-2 text-xs text-[#94a3b8]">
            Make this package available for PPPoE subscription customers.
          </p>
          <label className="flex items-center gap-2">
            <Switch checked={form.pppoeEnabled} onChange={() => update("pppoeEnabled", !form.pppoeEnabled)} />
            <span className="text-sm text-[#475569]">Enable PPPoE</span>
          </label>
        </div>

        <div className="border-t border-[#f1f5f9] pt-5">
          <span className="mb-1 block text-sm font-semibold text-[#475569]">Enable Hotspot support?</span>
          <p className="mb-2 text-xs text-[#94a3b8]">
            Make this package available on the WiFi hotspot captive portal (login page).
          </p>
          <label className="flex items-center gap-2">
            <Switch checked={form.hotspotEnabled} onChange={() => update("hotspotEnabled", !form.hotspotEnabled)} />
            <span className="text-sm text-[#475569]">Enable Hotspot</span>
          </label>
        </div>

        <div className="border-t border-[#f1f5f9] pt-5">
          <label className="flex items-center gap-2">
            <Switch
              checked={form.agentResellingEnabled}
              onChange={() => update("agentResellingEnabled", !form.agentResellingEnabled)}
            />
            <span className="text-sm font-semibold text-[#475569]">Enable Agent Reselling</span>
          </label>
          <p className="mt-1 text-xs text-[#94a3b8]">
            Allow agents to pre-buy vouchers for this package from the agent portal.
          </p>

          {form.agentResellingEnabled &&
            (isAgentContext && !canSetOwnPrice ? (
              <p className="mt-3 max-w-xs text-xs text-[#94a3b8]">
                Setting your own agent price isn&apos;t allowed yet -- ask admin for the &quot;Set their own resale
                price / markup&quot; permission.
              </p>
            ) : (
              <label className="mt-3 block max-w-xs">
                <span className="mb-2 block text-sm font-semibold text-[#475569]">Agent Price</span>
                <div
                  className={`flex overflow-hidden rounded-xl border focus-within:border-[#2563eb] ${
                    overCap ? "border-red-400" : "border-[#e2e8f0]"
                  }`}
                >
                  <span className="flex items-center bg-[#ffffff] px-3 text-xs font-semibold text-[#64748b]">
                    {sym()}
                  </span>
                  <input
                    value={form.agentPrice}
                    onChange={(event) => update("agentPrice", event.target.value)}
                    className="h-11 w-full px-3 text-sm outline-none"
                  />
                </div>
                {overCap ? (
                  <span className="mt-1 block text-xs font-semibold text-red-600">
                    Above your {cap}% limit -- the most you can charge on this package is {sym()} {capAmount!.toFixed(2)}.
                  </span>
                ) : (
                  <span className="mt-1 block text-xs text-[#94a3b8]">
                    {capAmount !== null
                      ? `Custom price for agents. Capped at ${sym()} ${capAmount.toFixed(2)} (${cap}% above base price).`
                      : "Custom price for agents. Leave empty to use the pricing model from hotspot settings."}
                  </span>
                )}
              </label>
            ))}
        </div>
      </div>
    </section>
  );
}
