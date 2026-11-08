"use client";

// This tab covers account-wide voucher and billing POLICY — voucher code
// length/format, session pruning rules, PPPoE self-registration, tethering
// protection, and agent-portal defaults. It's deliberately NOT about how
// the captive portal looks — that's per-router, under Configuration →
// Hotspot → Captive Portal. See the banner at the top of the rendered
// page for the same explanation in the UI itself.

import { useEffect, useState } from "react";
import { Wifi, Users, UserPlus, ShieldAlert, Copy } from "lucide-react";

import { useDashboard } from "../context/DashboardContext";
import type { HotspotPolicySettings } from "../shared/types";
import { Toggle, Field, inputClass } from "./SettingsFormControls";
import { MasterPortalSettings } from "./MasterPortalSettings";

export function HotspotPolicySettingsPanel() {
  const { hotspotPolicySettings, updateHotspotPolicySettings, showToast } = useDashboard();
  const [form, setForm] = useState<HotspotPolicySettings>(hotspotPolicySettings);
  const [origin, setOrigin] = useState("");

  useEffect(() => {
    setOrigin(window.location.origin);
  }, []);

  function set<K extends keyof HotspotPolicySettings>(key: K, value: HotspotPolicySettings[K]) {
    setForm((current) => ({ ...current, [key]: value }));
  }

  function save() {
    updateHotspotPolicySettings(form);
  }

  function handleCopyAgentPortalUrl() {
    const url = `${origin}/agent-portal`;
    navigator.clipboard?.writeText(url).catch(() => {});
    showToast("Agent portal URL copied.");
  }

  return (
    <div className="space-y-6">
      <p className="rounded-xl border border-blue-200 bg-white px-4 py-3 text-xs text-blue-800">
        This tab covers account-wide voucher and billing policy. Looking for
        WiFi network names, portal templates, or colors? Those are configured
        per router under <strong>Configuration → Hotspot</strong>.
      </p>

      <MasterPortalSettings section="hotspot" />

      {/* Hotspot / voucher settings */}
      <article className="rounded-2xl border border-[#e2e8f0] bg-white p-6 shadow-[0_8px_24px_rgba(37,99,235,0.06)] md:p-8">
        <div className="mb-6 flex items-center gap-3">
          <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-blue-100 text-blue-600">
            <Wifi size={20} />
          </div>
          <div>
            <h3 className="text-lg font-bold text-[#0f172a]">Hotspot Settings</h3>
            <p className="text-sm text-[#64748b]">Configure your hotspot voucher settings.</p>
          </div>
        </div>

        <div className="grid gap-5 md:grid-cols-2">
          <Field label="Customer ID Prefix" hint='Prefix for customer IDs (e.g., HS001, HS002). Letters and numbers only.'>
            <input
              value={form.customerIdPrefix}
              onChange={(e) => set("customerIdPrefix", e.target.value.toUpperCase())}
              className={inputClass}
            />
          </Field>

          <Field label="Mobile Money Voucher Code Length" hint="Mobile money vouchers use at least 8 characters.">
            <select
              value={form.mobileMoneyVoucherCodeLength}
              onChange={(e) => set("mobileMoneyVoucherCodeLength", Number(e.target.value))}
              className={inputClass}
            >
              {[6, 7, 8, 9, 10, 12].map((n) => (
                <option key={n} value={n}>
                  {n} characters
                </option>
              ))}
            </select>
          </Field>

          <Field label="Printed Vouchers: Default Length" hint="Default for Create Voucher and Generate Voucher Sheet.">
            <select
              value={form.printedVoucherDefaultLength}
              onChange={(e) => set("printedVoucherDefaultLength", Number(e.target.value))}
              className={inputClass}
            >
              {[4, 5, 6, 8, 10].map((n) => (
                <option key={n} value={n}>
                  {n} characters
                </option>
              ))}
            </select>
          </Field>

          <Field label="Printed Vouchers: Default Format" hint="Default format for manually generated vouchers.">
            <select
              value={form.printedVoucherDefaultFormat}
              onChange={(e) =>
                set("printedVoucherDefaultFormat", e.target.value as HotspotPolicySettings["printedVoucherDefaultFormat"])
              }
              className={inputClass}
            >
              <option>Alphanumeric (A-Z, 0-9)</option>
              <option>Numeric (0-9)</option>
              <option>Letters (A-Z)</option>
            </select>
          </Field>

          <Field
            label="Voucher Generation Style"
            hint="Switching back to Classic does not affect vouchers you already printed — batches made in the Studio stay reprintable."
          >
            <select
              value={form.voucherGenerationStyle}
              onChange={(e) =>
                set("voucherGenerationStyle", e.target.value as HotspotPolicySettings["voucherGenerationStyle"])
              }
              className={inputClass}
            >
              <option>Voucher Studio (new)</option>
              <option>Classic</option>
            </select>
          </Field>

          <Field label="Voucher Code Prefix" hint="Optional 1 letter prefix added to all voucher codes (e.g., A → A3K7N).">
            <input
              value={form.voucherCodePrefix}
              onChange={(e) => set("voucherCodePrefix", e.target.value.slice(0, 1).toUpperCase())}
              placeholder="e.g., A"
              className={inputClass}
            />
          </Field>

          <Field label="Prune Inactive Users After" hint="Automatically delete hotspot users inactive for this many days.">
            <select
              value={form.pruneInactiveUsersAfterDays}
              onChange={(e) => set("pruneInactiveUsersAfterDays", Number(e.target.value))}
              className={inputClass}
            >
              {[3, 7, 14, 30, 60, 90].map((n) => (
                <option key={n} value={n}>
                  {n} days
                </option>
              ))}
            </select>
          </Field>

          <Field
            label="Auto-Reconnect Method"
            hint="IP Binding bypasses hotspot (users hidden from Active tab in Winbox). MAC-Cookie uses hotspot authentication (users visible with auto-reconnect)."
          >
            <select
              value={form.autoReconnectMethod}
              onChange={(e) => set("autoReconnectMethod", e.target.value as HotspotPolicySettings["autoReconnectMethod"])}
              className={inputClass}
            >
              <option>MAC-Cookie (Recommended)</option>
              <option>IP Binding</option>
            </select>
          </Field>

          <Field label="Device Remember Duration" hint="How long MikroTik remembers a device before requiring the voucher again.">
            <select
              value={form.deviceRememberDurationDays}
              onChange={(e) => set("deviceRememberDurationDays", Number(e.target.value))}
              className={inputClass}
            >
              {[7, 14, 30, 60, 90].map((n) => (
                <option key={n} value={n}>
                  {n} days{n === 30 ? " (Recommended)" : ""}
                </option>
              ))}
            </select>
          </Field>
        </div>
      </article>

      {/* Agent settings */}
      <article className="rounded-2xl border border-[#e2e8f0] bg-white p-6 shadow-[0_8px_24px_rgba(37,99,235,0.06)] md:p-8">
        <div className="mb-6 flex items-center gap-3">
          <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-blue-100 text-blue-600">
            <Users size={20} />
          </div>
          <div>
            <h3 className="text-lg font-bold text-[#0f172a]">Agent Settings</h3>
            <p className="text-sm text-[#64748b]">
              Configure agent portal access, voucher visibility, and agent voucher reselling in one place.
            </p>
          </div>
        </div>

        <div className="space-y-5">
          <div className="rounded-xl border border-[#f1f5f9] bg-[#ffffff] p-4">
            <p className="mb-4 text-sm font-bold text-[#0f172a]">Agent Portal</p>
            <div className="space-y-4">
              <div className="flex items-center justify-between gap-3">
                <div>
                  <p className="text-sm font-semibold text-[#475569]">Enable Agent Portal</p>
                  <p className="text-xs text-[#94a3b8]">
                    When enabled, agents with dispatched access can log in to view their performance dashboard.
                  </p>
                </div>
                <Toggle
                  checked={form.agentPortalEnabled}
                  onChange={() => set("agentPortalEnabled", !form.agentPortalEnabled)}
                />
              </div>
              <div className="flex items-center justify-between gap-3">
                <div>
                  <p className="text-sm font-semibold text-[#475569]">Allow Agents to View Voucher Codes</p>
                  <p className="text-xs text-[#94a3b8]">
                    When enabled, agents can see their assigned voucher codes in the agent portal.
                  </p>
                </div>
                <Toggle
                  checked={form.allowAgentsToViewVoucherCodes}
                  onChange={() => set("allowAgentsToViewVoucherCodes", !form.allowAgentsToViewVoucherCodes)}
                />
              </div>

              <div>
                <span className="mb-2 block text-sm font-semibold text-[#475569]">Agent Portal URL</span>
                <div className="flex overflow-hidden rounded-xl border border-[#e2e8f0] bg-white">
                  <span className="flex-1 truncate px-3 py-2.5 text-sm text-[#475569]">{origin}/agent-portal</span>
                  <button
                    type="button"
                    onClick={handleCopyAgentPortalUrl}
                    className="flex items-center gap-1.5 border-l border-[#e2e8f0] bg-[#ffffff] px-3 text-xs font-bold text-[#2563eb] hover:bg-[#f1f5f9]"
                  >
                    <Copy size={13} /> Copy
                  </button>
                </div>
                <span className="mt-1 block text-xs text-[#94a3b8]">
                  Share this URL with your agents. Access must be dispatched per-agent from the Agents page.
                </span>
              </div>
            </div>
          </div>

          <div className="rounded-xl border border-[#f1f5f9] bg-[#ffffff] p-4">
            <div className="mb-4 flex items-center justify-between gap-3">
              <div>
                <p className="text-sm font-bold text-[#0f172a]">Voucher Reselling</p>
                <p className="text-xs text-[#94a3b8]">
                  When enabled, agents see a &quot;Buy Vouchers&quot; page in their portal where they can purchase
                  vouchers using mobile money.
                </p>
              </div>
              <Toggle
                checked={form.agentResellingEnabled}
                onChange={() => set("agentResellingEnabled", !form.agentResellingEnabled)}
              />
            </div>

            {form.agentResellingEnabled && (
              <div className="grid gap-4 sm:grid-cols-2">
                <Field label="Pricing Model" hint="How agent prices are calculated.">
                  <select
                    value={form.agentPricingModel}
                    onChange={(e) =>
                      set("agentPricingModel", e.target.value as HotspotPolicySettings["agentPricingModel"])
                    }
                    className={inputClass}
                  >
                    <option>Per Package — Set a custom agent price on each package</option>
                    <option>Percentage Discount</option>
                    <option>Fixed Markup</option>
                  </select>
                </Field>
                <div className="grid grid-cols-2 gap-3">
                  <Field label="Minimum Quantity" hint="Per purchase.">
                    <input
                      type="number"
                      min={1}
                      value={form.voucherMinQuantity}
                      onChange={(e) => set("voucherMinQuantity", Number(e.target.value))}
                      className={inputClass}
                    />
                  </Field>
                  <Field label="Maximum Quantity" hint="Per purchase.">
                    <input
                      type="number"
                      min={1}
                      value={form.voucherMaxQuantity}
                      onChange={(e) => set("voucherMaxQuantity", Number(e.target.value))}
                      className={inputClass}
                    />
                  </Field>
                </div>
                <div className="sm:col-span-2 flex items-center justify-between gap-3 rounded-xl border border-[#e2e8f0] bg-white p-3">
                  <div>
                    <p className="text-sm font-semibold text-[#475569]">Enable SMS Voucher Sales</p>
                    <p className="text-xs text-[#94a3b8]">
                      Agents can sell from dedicated SMS-only voucher batches using this site&apos;s own SMS gateway.
                    </p>
                  </div>
                  <Toggle
                    checked={form.smsVoucherSalesEnabled}
                    onChange={() => set("smsVoucherSalesEnabled", !form.smsVoucherSalesEnabled)}
                  />
                </div>
              </div>
            )}
          </div>
        </div>
      </article>

      {/* PPPoE self-registration */}
      <article className="rounded-2xl border border-[#e2e8f0] bg-white p-6 shadow-[0_8px_24px_rgba(37,99,235,0.06)] md:p-8">
        <div className="flex items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-emerald-100 text-emerald-600">
              <UserPlus size={20} />
            </div>
            <div>
              <h3 className="text-lg font-bold text-[#0f172a]">PPPoE Self-Registration</h3>
              <p className="text-sm text-[#64748b]">
                Allow potential customers to register online for PPPoE internet service. You will review and
                activate them manually.
              </p>
            </div>
          </div>
          <Toggle
            checked={form.pppoeSelfRegistrationEnabled}
            onChange={() => set("pppoeSelfRegistrationEnabled", !form.pppoeSelfRegistrationEnabled)}
          />
        </div>
        {form.pppoeSelfRegistrationEnabled && (
          <p className="mt-4 rounded-xl bg-[#ffffff] p-3 text-xs text-[#64748b]">
            A public registration page is available at <code className="rounded bg-white px-1">/pppoe/register</code> on your domain.
          </p>
        )}
      </article>

      {/* Tethering protection */}
      <article className="rounded-2xl border border-[#e2e8f0] bg-white p-6 shadow-[0_8px_24px_rgba(37,99,235,0.06)] md:p-8">
        <div className="mb-4 flex items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-red-100 text-red-600">
              <ShieldAlert size={20} />
            </div>
            <div>
              <h3 className="text-lg font-bold text-[#0f172a]">Tethering Protection</h3>
              <p className="text-sm text-[#64748b]">Prevent users from sharing their WiFi connection via mobile hotspot.</p>
            </div>
          </div>
          <Toggle
            checked={form.tetheringProtectionEnabled}
            onChange={() => set("tetheringProtectionEnabled", !form.tetheringProtectionEnabled)}
          />
        </div>
        {form.tetheringProtectionEnabled && (
          <Field label="Action When Detected" hint="Choose whether to block tethered devices or just log the activity.">
            <select
              value={form.tetheringAction}
              onChange={(e) => set("tetheringAction", e.target.value as HotspotPolicySettings["tetheringAction"])}
              className={inputClass}
            >
              <option>Block Connection</option>
              <option>Log Only</option>
            </select>
          </Field>
        )}
      </article>

      <div className="flex justify-end">
        <button
          type="button"
          onClick={save}
          className="rounded-xl bg-[#2563eb] px-6 py-3 text-sm font-bold text-white hover:bg-[#1d4ed8]"
        >
          Save Hotspot Settings
        </button>
      </div>
    </div>
  );
}
