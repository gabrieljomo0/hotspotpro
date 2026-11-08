"use client";

import { sym } from "@/components/dashboard/shared/currency";
import { useState } from "react";
import {
  Smartphone,
  CheckCircle2,
  XCircle,
  Copy,
  Eye,
  EyeOff,
  Wifi,
  FlaskConical,
  Rocket,
  RefreshCw,
  ShieldAlert,
  Search,
} from "lucide-react";

import { useDashboard } from "@/components/dashboard/context/DashboardContext";
import { BackLink } from "@/components/dashboard/shared/BackLink";
import type { MomoProvider } from "@/components/dashboard/shared/types";

const PROVIDERS: Array<{ key: MomoProvider; blurb: string; dot: string; active: string }> = [
  { key: "MTN Mobile Money", blurb: "Ghana's largest mobile money network.", dot: "bg-amber-400", active: "border-amber-400 bg-amber-50" },
  { key: "Vodafone Cash", blurb: "Vodafone's mobile wallet service.", dot: "bg-red-500", active: "border-red-400 bg-red-50" },
  { key: "AirtelTigo Money", blurb: "AirtelTigo's mobile money service.", dot: "bg-blue-500", active: "border-blue-400 bg-blue-50" },
  { key: "Aggregator (Hubtel/Paystack/Flutterwave)", blurb: "One integration that routes to all networks.", dot: "bg-blue-500", active: "border-blue-400 bg-blue-50" },
];

export default function MomoIntegrationPage() {
  const {
    momoSettings,
    updateMomoSettings,
    saveMomoSettings,
    testMomoConnection,
    users,
    autoRenewDisabledPhones,
    disableAutoRenewForCustomer,
    enableAutoRenewForCustomer,
  } = useDashboard();
  const [showApiKey, setShowApiKey] = useState(false);
  const [showApiSecret, setShowApiSecret] = useState(false);
  const [copied, setCopied] = useState(false);
  const [customerQuery, setCustomerQuery] = useState("");

  function handleCopyCallback() {
    navigator.clipboard?.writeText(momoSettings.callbackUrl).catch(() => {});
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  }

  const statusBadge = !momoSettings.enabled
    ? { label: "Disabled", className: "bg-slate-100 text-slate-600" }
    : momoSettings.lastTestStatus === "success"
      ? { label: `Connected · ${momoSettings.environment === "live" ? "Live" : "Sandbox"}`, className: "bg-emerald-100 text-emerald-700" }
      : { label: "Enabled · Not tested yet", className: "bg-amber-100 text-amber-700" };

  // Unique customers (by phone) for the per-customer auto-renew control.
  const uniqueCustomers = Array.from(new Map(users.map((u) => [u.phone, u])).values());
  const matchingCustomers = customerQuery
    ? uniqueCustomers.filter(
        (u) => u.phone.toLowerCase().includes(customerQuery.toLowerCase()),
      )
    : uniqueCustomers.slice(0, 8);

  return (
    <section className="mx-auto w-full max-w-3xl">
      <BackLink />
      <div className="mb-6 flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="mb-1 flex items-center gap-2 text-3xl font-black text-[#0f172a] md:text-4xl">
            <Smartphone className="text-emerald-500" size={30} />
            MoMo Integration
          </h1>
          <p className="max-w-2xl text-sm text-[#64748b]">
            Let customers buy vouchers and packages with Mobile Money directly
            from the captive portal.
          </p>
        </div>
        <span className={`rounded-full px-3 py-1.5 text-xs font-bold ${statusBadge.className}`}>
          {statusBadge.label}
        </span>
      </div>

      <div className="space-y-6">
        {/* Enable toggle */}
        <article className="flex items-center justify-between gap-4 rounded-2xl border-2 border-emerald-200 bg-white p-5">
          <div>
            <p className="text-sm font-bold text-[#0f172a]">Allow Mobile Money Payments</p>
            <p className="text-xs text-[#64748b]">
              Turn this on to accept MoMo on your captive portal. Customers will see it as a payment option.
            </p>
          </div>
          <button
            type="button"
            onClick={() => updateMomoSettings({ enabled: !momoSettings.enabled })}
            className={`relative h-7 w-12 shrink-0 rounded-full transition ${
              momoSettings.enabled ? "bg-emerald-500" : "bg-[#e2e8f0]"
            }`}
          >
            <span
              className={`absolute top-0.5 h-6 w-6 rounded-full bg-white shadow transition-transform ${
                momoSettings.enabled ? "translate-x-5" : "translate-x-0.5"
              }`}
            />
          </button>
        </article>

        {/* Provider */}
        <article className="rounded-2xl border border-[#e2e8f0] bg-white p-6 shadow-[0_8px_24px_rgba(37,99,235,0.06)]">
          <p className="mb-1 text-sm font-bold text-[#0f172a]">Mobile Money Provider</p>
          <p className="mb-4 text-xs text-[#64748b]">Choose who processes the payment.</p>
          <div className="grid gap-3 sm:grid-cols-2">
            {PROVIDERS.map((p) => {
              const isActive = momoSettings.provider === p.key;
              return (
                <button
                  key={p.key}
                  type="button"
                  onClick={() => updateMomoSettings({ provider: p.key })}
                  className={`rounded-xl border-2 p-4 text-left transition ${
                    isActive ? p.active : "border-[#e2e8f0] bg-white hover:bg-[#ffffff]"
                  }`}
                >
                  <span className="mb-1.5 flex items-center gap-2">
                    <span className={`h-2.5 w-2.5 rounded-full ${p.dot}`} />
                    <span className="text-sm font-bold text-[#0f172a]">{p.key}</span>
                  </span>
                  <p className="text-xs text-[#64748b]">{p.blurb}</p>
                </button>
              );
            })}
          </div>
        </article>

        {/* Environment */}
        <article className="rounded-2xl border border-[#e2e8f0] bg-white p-6 shadow-[0_8px_24px_rgba(37,99,235,0.06)]">
          <p className="mb-1 text-sm font-bold text-[#0f172a]">Environment</p>
          <p className="mb-4 text-xs text-[#64748b]">
            Use Sandbox while you're testing. Switch to Live only once real payments are ready.
          </p>
          <div className="grid gap-3 sm:grid-cols-2">
            <button
              type="button"
              onClick={() => updateMomoSettings({ environment: "sandbox" })}
              className={`flex items-center gap-3 rounded-xl border-2 p-4 text-left transition ${
                momoSettings.environment === "sandbox" ? "border-amber-400 bg-amber-50" : "border-[#e2e8f0] bg-white hover:bg-[#ffffff]"
              }`}
            >
              <FlaskConical size={18} className="text-amber-600" />
              <div>
                <p className="text-sm font-bold text-[#0f172a]">Sandbox</p>
                <p className="text-xs text-[#64748b]">Test mode — no real money moves.</p>
              </div>
            </button>
            <button
              type="button"
              onClick={() => updateMomoSettings({ environment: "live" })}
              className={`flex items-center gap-3 rounded-xl border-2 p-4 text-left transition ${
                momoSettings.environment === "live" ? "border-red-400 bg-red-50" : "border-[#e2e8f0] bg-white hover:bg-[#ffffff]"
              }`}
            >
              <Rocket size={18} className="text-red-600" />
              <div>
                <p className="text-sm font-bold text-[#0f172a]">Live</p>
                <p className="text-xs text-[#64748b]">Real customer payments.</p>
              </div>
            </button>
          </div>
          {momoSettings.environment === "live" && (
            <p className="mt-3 rounded-lg bg-red-50 px-3 py-2 text-xs font-semibold text-red-700">
              You're set to Live — real customer money will move through this integration.
            </p>
          )}
        </article>

        {/* Credentials */}
        <article className="rounded-2xl border border-[#e2e8f0] bg-white p-6 shadow-[0_8px_24px_rgba(37,99,235,0.06)]">
          <p className="mb-1 text-sm font-bold text-[#0f172a]">Credentials</p>
          <p className="mb-4 text-xs text-[#64748b]">
            From your {momoSettings.provider} merchant dashboard.
          </p>
          <div className="grid gap-4 sm:grid-cols-2">
            <label className="block sm:col-span-2">
              <span className="mb-1.5 block text-sm font-semibold text-[#475569]">Merchant / Short Code</span>
              <input
                value={momoSettings.merchantId}
                onChange={(event) => updateMomoSettings({ merchantId: event.target.value })}
                placeholder="e.g. 123456"
                className="h-11 w-full rounded-xl border border-[#e2e8f0] bg-white px-3 font-mono text-sm outline-none focus:border-emerald-500"
              />
            </label>

            <label className="block">
              <span className="mb-1.5 block text-sm font-semibold text-[#475569]">API Key</span>
              <div className="relative">
                <input
                  type={showApiKey ? "text" : "password"}
                  value={momoSettings.apiKey}
                  onChange={(event) => updateMomoSettings({ apiKey: event.target.value })}
                  placeholder="••••••••••••"
                  className="h-11 w-full rounded-xl border border-[#e2e8f0] bg-white px-3 pr-10 font-mono text-sm outline-none focus:border-emerald-500"
                />
                <button
                  type="button"
                  onClick={() => setShowApiKey((c) => !c)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-[#94a3b8] hover:text-[#475569]"
                >
                  {showApiKey ? <EyeOff size={15} /> : <Eye size={15} />}
                </button>
              </div>
            </label>

            <label className="block">
              <span className="mb-1.5 block text-sm font-semibold text-[#475569]">API Secret</span>
              <div className="relative">
                <input
                  type={showApiSecret ? "text" : "password"}
                  value={momoSettings.apiSecret}
                  onChange={(event) => updateMomoSettings({ apiSecret: event.target.value })}
                  placeholder="••••••••••••"
                  className="h-11 w-full rounded-xl border border-[#e2e8f0] bg-white px-3 pr-10 font-mono text-sm outline-none focus:border-emerald-500"
                />
                <button
                  type="button"
                  onClick={() => setShowApiSecret((c) => !c)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-[#94a3b8] hover:text-[#475569]"
                >
                  {showApiSecret ? <EyeOff size={15} /> : <Eye size={15} />}
                </button>
              </div>
            </label>

            <label className="block sm:col-span-2">
              <span className="mb-1.5 block text-sm font-semibold text-[#475569]">Callback / Webhook URL</span>
              <div className="flex gap-2">
                <input
                  readOnly
                  value={momoSettings.callbackUrl}
                  className="h-11 w-full flex-1 rounded-xl border border-[#e2e8f0] bg-[#ffffff] px-3 font-mono text-xs text-[#475569] outline-none"
                />
                <button
                  type="button"
                  onClick={handleCopyCallback}
                  className="flex shrink-0 items-center gap-1.5 rounded-xl border border-[#e2e8f0] bg-white px-3 text-xs font-bold text-[#475569] hover:bg-[#ffffff]"
                >
                  <Copy size={13} />
                  {copied ? "Copied!" : "Copy"}
                </button>
              </div>
              <span className="mt-1 block text-xs text-[#94a3b8]">
                Paste this into your provider's dashboard so payment confirmations reach HotspotPro.
              </span>
            </label>
          </div>
        </article>

        {/* What can be bought */}
        <article className="rounded-2xl border border-[#e2e8f0] bg-white p-6 shadow-[0_8px_24px_rgba(37,99,235,0.06)]">
          <p className="mb-1 text-sm font-bold text-[#0f172a]">What Customers Can Buy With MoMo</p>
          <p className="mb-4 text-xs text-[#64748b]">
            Tick everything you want to accept Mobile Money for. With this on,
            customers self-serve straight from the captive portal — no need
            to find an agent and buy a voucher in person.
          </p>
          <div className="space-y-2">
            <label className="flex cursor-pointer items-center gap-2.5 rounded-xl border border-[#f1f5f9] bg-[#ffffff] px-4 py-3 text-sm text-[#475569]">
              <input
                type="checkbox"
                checked={momoSettings.allowVoucherPurchase}
                onChange={() => updateMomoSettings({ allowVoucherPurchase: !momoSettings.allowVoucherPurchase })}
                className="h-4 w-4 rounded border-[#e2e8f0] accent-emerald-500"
              />
              <Wifi size={15} className="text-emerald-500" />
              Vouchers
            </label>
            <label className="flex cursor-pointer items-center gap-2.5 rounded-xl border border-[#f1f5f9] bg-[#ffffff] px-4 py-3 text-sm text-[#475569]">
              <input
                type="checkbox"
                checked={momoSettings.allowPackagePurchase}
                onChange={() => updateMomoSettings({ allowPackagePurchase: !momoSettings.allowPackagePurchase })}
                className="h-4 w-4 rounded border-[#e2e8f0] accent-emerald-500"
              />
              <Smartphone size={15} className="text-emerald-500" />
              Packages
            </label>
          </div>
        </article>

        {/* Auto-renew */}
        <article className="rounded-2xl border-2 border-blue-200 bg-white p-6">
          <div className="mb-4 flex items-start justify-between gap-3">
            <div className="flex items-start gap-3">
              <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-blue-500 text-white">
                <RefreshCw size={17} />
              </span>
              <div>
                <p className="text-sm font-bold text-[#0f172a]">Auto-Renew</p>
                <p className="text-xs text-[#64748b]">
                  Automatically charge the customer&apos;s Mobile Money to
                  renew their package when data runs low, or their voucher is
                  about to expire — instead of making them buy again.
                </p>
              </div>
            </div>
            <button
              type="button"
              onClick={() => updateMomoSettings({ autoRenewEnabled: !momoSettings.autoRenewEnabled })}
              className={`relative h-7 w-12 shrink-0 rounded-full transition ${
                momoSettings.autoRenewEnabled ? "bg-blue-500" : "bg-[#e2e8f0]"
              }`}
            >
              <span
                className={`absolute top-0.5 h-6 w-6 rounded-full bg-white shadow transition-transform ${
                  momoSettings.autoRenewEnabled ? "translate-x-5" : "translate-x-0.5"
                }`}
              />
            </button>
          </div>

          <div className="space-y-4 rounded-xl bg-white p-5">
            <div>
              <p className="mb-2 text-xs font-bold uppercase tracking-wide text-[#64748b]">When to renew</p>
              <div className="grid gap-3 sm:grid-cols-2">
                <label className="flex items-start gap-2.5 rounded-xl border border-[#f1f5f9] bg-[#ffffff] px-4 py-3 text-sm text-[#475569]">
                  <input
                    type="checkbox"
                    checked={momoSettings.autoRenewOnLowData}
                    onChange={() => updateMomoSettings({ autoRenewOnLowData: !momoSettings.autoRenewOnLowData })}
                    className="mt-0.5 h-4 w-4 rounded border-[#e2e8f0] accent-blue-500"
                  />
                  <span>
                    <span className="block font-semibold">Bundle/data running low</span>
                    <span className="mt-1 flex items-center gap-2 text-xs text-[#94a3b8]">
                      Renew at
                      <input
                        type="number"
                        min={1}
                        max={100}
                        value={momoSettings.autoRenewDataThresholdPercent}
                        onChange={(event) =>
                          updateMomoSettings({ autoRenewDataThresholdPercent: Number(event.target.value) })
                        }
                        onClick={(event) => event.preventDefault()}
                        className="h-7 w-16 rounded-lg border border-[#e2e8f0] bg-white px-2 text-xs outline-none focus:border-blue-500"
                      />
                      % remaining
                    </span>
                  </span>
                </label>
                <label className="flex items-start gap-2.5 rounded-xl border border-[#f1f5f9] bg-[#ffffff] px-4 py-3 text-sm text-[#475569]">
                  <input
                    type="checkbox"
                    checked={momoSettings.autoRenewOnExpiry}
                    onChange={() => updateMomoSettings({ autoRenewOnExpiry: !momoSettings.autoRenewOnExpiry })}
                    className="mt-0.5 h-4 w-4 rounded border-[#e2e8f0] accent-blue-500"
                  />
                  <span>
                    <span className="block font-semibold">Voucher about to expire</span>
                    <span className="mt-1 flex items-center gap-2 text-xs text-[#94a3b8]">
                      Renew
                      <input
                        type="number"
                        min={1}
                        value={momoSettings.autoRenewBeforeExpiryMinutes}
                        onChange={(event) =>
                          updateMomoSettings({ autoRenewBeforeExpiryMinutes: Number(event.target.value) })
                        }
                        onClick={(event) => event.preventDefault()}
                        className="h-7 w-16 rounded-lg border border-[#e2e8f0] bg-white px-2 text-xs outline-none focus:border-blue-500"
                      />
                      min before expiry
                    </span>
                  </span>
                </label>
              </div>
            </div>

            <div className="rounded-xl border-2 border-amber-200 bg-white p-4">
              <p className="mb-1 flex items-center gap-1.5 text-xs font-bold uppercase tracking-wide text-amber-700">
                <ShieldAlert size={13} />
                Safety Controls
              </p>
              <p className="mb-3 text-xs text-[#64748b]">
                Caps how often auto-renew can charge the same customer, so it
                can&apos;t fire over and over if something goes wrong.
              </p>
              <div className="grid gap-3 sm:grid-cols-2">
                <label className="block">
                  <span className="mb-1.5 block text-xs font-semibold text-[#475569]">Max renewals per customer / day</span>
                  <input
                    type="number"
                    min={1}
                    value={momoSettings.autoRenewMaxPerCustomerPerDay}
                    onChange={(event) =>
                      updateMomoSettings({ autoRenewMaxPerCustomerPerDay: Number(event.target.value) })
                    }
                    className="h-10 w-full rounded-lg border border-[#e2e8f0] bg-white px-3 text-sm outline-none focus:border-amber-500"
                  />
                </label>
                <label className="block">
                  <span className="mb-1.5 block text-xs font-semibold text-[#475569]">Cooldown between renewals (minutes)</span>
                  <input
                    type="number"
                    min={0}
                    value={momoSettings.autoRenewCooldownMinutes}
                    onChange={(event) =>
                      updateMomoSettings({ autoRenewCooldownMinutes: Number(event.target.value) })
                    }
                    className="h-10 w-full rounded-lg border border-[#e2e8f0] bg-white px-3 text-sm outline-none focus:border-amber-500"
                  />
                </label>
              </div>
            </div>

            <div>
              <p className="mb-1 text-xs font-bold uppercase tracking-wide text-[#64748b]">Turn off for one customer</p>
              <p className="mb-3 text-xs text-[#94a3b8]">
                If auto-renew keeps firing on a specific client — a faulty
                device retrying, or a dispute — find them and switch it off
                just for their number, without touching everyone else.
              </p>
              <div className="relative mb-2">
                <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-[#94a3b8]" />
                <input
                  value={customerQuery}
                  onChange={(event) => setCustomerQuery(event.target.value)}
                  placeholder="Search by phone number"
                  className="h-10 w-full rounded-lg border border-[#e2e8f0] bg-white pl-8 pr-3 text-sm outline-none focus:border-blue-500"
                />
              </div>
              {matchingCustomers.length === 0 ? (
                <p className="text-xs text-[#94a3b8]">No customers found.</p>
              ) : (
                <div className="max-h-56 space-y-1.5 overflow-y-auto">
                  {matchingCustomers.map((customer) => {
                    const isDisabled = autoRenewDisabledPhones.includes(customer.phone);
                    return (
                      <div
                        key={customer.phone}
                        className={`flex items-center justify-between gap-3 rounded-lg px-3 py-2 text-sm ${
                          isDisabled ? "bg-red-50" : "bg-[#ffffff]"
                        }`}
                      >
                        <div className="min-w-0">
                          <p className="truncate font-semibold text-[#0f172a]">{customer.phone}</p>
                          <p className="truncate text-xs text-[#94a3b8]">{customer.package}</p>
                        </div>
                        {isDisabled ? (
                          <div className="flex shrink-0 items-center gap-2">
                            <span className="rounded-full bg-red-100 px-2 py-0.5 text-[10px] font-bold text-red-700">
                              Auto-renew off
                            </span>
                            <button
                              type="button"
                              onClick={() => enableAutoRenewForCustomer(customer.phone)}
                              className="rounded-lg border border-[#e2e8f0] bg-white px-2.5 py-1.5 text-xs font-bold text-emerald-600 hover:bg-emerald-50"
                            >
                              Re-enable
                            </button>
                          </div>
                        ) : (
                          <button
                            type="button"
                            onClick={() => disableAutoRenewForCustomer(customer.phone)}
                            className="shrink-0 rounded-lg border border-[#e2e8f0] bg-white px-2.5 py-1.5 text-xs font-bold text-red-600 hover:bg-red-50"
                          >
                            Disable for this customer
                          </button>
                        )}
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </div>
        </article>

        {/* Limits */}
        <article className="rounded-2xl border border-[#e2e8f0] bg-white p-6 shadow-[0_8px_24px_rgba(37,99,235,0.06)]">
          <p className="mb-1 text-sm font-bold text-[#0f172a]">Transaction Limits</p>
          <p className="mb-4 text-xs text-[#64748b]">Minimum and maximum amount per Mobile Money payment.</p>
          <div className="grid gap-4 sm:grid-cols-2">
            <label className="block">
              <span className="mb-1.5 block text-sm font-semibold text-[#475569]">Minimum ({sym()})</span>
              <input
                type="number"
                min={0}
                value={momoSettings.minAmount}
                onChange={(event) => updateMomoSettings({ minAmount: Number(event.target.value) })}
                className="h-11 w-full rounded-xl border border-[#e2e8f0] bg-white px-3 text-sm outline-none focus:border-emerald-500"
              />
            </label>
            <label className="block">
              <span className="mb-1.5 block text-sm font-semibold text-[#475569]">Maximum ({sym()})</span>
              <input
                type="number"
                min={0}
                value={momoSettings.maxAmount}
                onChange={(event) => updateMomoSettings({ maxAmount: Number(event.target.value) })}
                className="h-11 w-full rounded-xl border border-[#e2e8f0] bg-white px-3 text-sm outline-none focus:border-emerald-500"
              />
            </label>
          </div>
        </article>

        {/* Test + last result */}
        <article className="rounded-2xl border border-[#e2e8f0] bg-white p-6 shadow-[0_8px_24px_rgba(37,99,235,0.06)]">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <p className="text-sm font-bold text-[#0f172a]">Test Connection</p>
              <p className="text-xs text-[#64748b]">Verify your credentials before going live.</p>
            </div>
            <button
              type="button"
              onClick={testMomoConnection}
              className="rounded-xl border-2 border-emerald-500 px-4 py-2.5 text-sm font-bold text-emerald-600 hover:bg-emerald-50"
            >
              Test Connection
            </button>
          </div>
          {momoSettings.lastTestedAt && (
            <div
              className={`mt-4 flex items-center gap-2 rounded-xl px-4 py-3 text-sm font-semibold ${
                momoSettings.lastTestStatus === "success"
                  ? "bg-emerald-50 text-emerald-700"
                  : "bg-red-50 text-red-700"
              }`}
            >
              {momoSettings.lastTestStatus === "success" ? (
                <CheckCircle2 size={16} />
              ) : (
                <XCircle size={16} />
              )}
              {momoSettings.lastTestStatus === "success" ? "Connected successfully" : "Connection failed"} — last tested {momoSettings.lastTestedAt}
            </div>
          )}
        </article>

        <div className="flex flex-wrap gap-3">
          <button
            type="button"
            onClick={saveMomoSettings}
            className="rounded-xl bg-emerald-600 px-6 py-3 text-sm font-bold text-white  hover:bg-emerald-700"
          >
            Save Mobile Money Settings
          </button>
        </div>
      </div>
    </section>
  );
}
