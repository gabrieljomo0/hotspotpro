"use client";

// Payment gateway configuration — which gateway is active (PesaPal, etc),
// sandbox mode, and API credentials. "Request a new gateway" lets the
// admin ask for one that isn't in the list yet.

import { useEffect, useState } from "react";
import { Check, Copy, Download, Eye, EyeOff, X } from "lucide-react";

import { useDashboard } from "../context/DashboardContext";
import { Field, inputClass, textareaClass } from "./SettingsFormControls";
import { BusinessScopeBanner } from "./BusinessScopeBanner";
import { useBusinessAddress } from "./DomainSettingsPanel";
import { ServerConnectionPanel } from "./ServerConnectionPanel";

const GATEWAYS = [
  "PesaPal",
  "PayFast",
  "Hubtel",
  "MTN Mobile Money",
  "Airtel Money",
  "Telecel Cash",
];

// What the dropdown shows. The stored value stays the plain name.
const GATEWAY_LABELS: Record<string, string> = { Hubtel: "Hubtel (Ghana)" };

function SecretBox({ value, onChange, testId }: { value: string; onChange: (v: string) => void; testId?: string }) {
  const [show, setShow] = useState(false);
  return (
    <div className="flex overflow-hidden rounded-xl border border-[#cbd5e1] bg-white focus-within:border-[#2563eb]">
      <input
        data-testid={testId}
        type={show ? "text" : "password"}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        autoComplete="off"
        className="h-11 w-full px-3 text-sm outline-none"
      />
      <button type="button" aria-label={show ? "Hide" : "Show"} onClick={() => setShow((c) => !c)} className="flex items-center border-l border-[#e2e8f0] px-3 text-[#64748b]">
        {show ? <EyeOff size={15} /> : <Eye size={15} />}
      </button>
    </div>
  );
}

function HubtelGuide({ callbackUrl, returnUrl }: { callbackUrl: string; returnUrl: string }) {
  return (
    <div data-testid="hubtel-guide" className="rounded-xl bg-[#f1f5f9] p-5">
      <p className="mb-3 flex items-center gap-2 text-sm font-bold text-[#0f172a]">
        <span className="rounded bg-[#0f172a] px-1.5 py-0.5 text-[10px] font-bold text-white">GH</span>
        Hubtel Online Checkout Setup Guide (Ghana)
      </p>
      <ol className="list-decimal space-y-2 pl-5 text-sm text-[#475569]">
        <li>
          Register at{" "}
          <a href="https://hubtel.com" target="_blank" rel="noopener noreferrer" className="font-semibold text-[#2563eb] underline">
            hubtel.com
          </a>{" "}
          and create a <strong>Merchant Account</strong>.
        </li>
        <li>
          Complete business verification (KYC) and configure <strong>Online Checkout</strong> for your merchant account.
        </li>
        <li>
          From your <strong>Hubtel Dashboard</strong>, copy the matching <strong>API Key</strong>, <strong>API Secret</strong>, and{" "}
          <strong>Collection Account Number</strong> and enter them above.
        </li>
        <li>
          The <strong>Collection Account Number</strong> is sent to Hubtel as <code className="font-mono text-xs">merchantAccountNumber</code> and is also used in the Transaction Status Check URL.
        </li>
        <li>
          Hubtel Online Checkout redirects customers to <strong>pay.hubtel.com</strong>, where Hubtel handles OTP verification and payment method selection.
        </li>
        <li>Set the callback URL below — applied automatically per transaction.</li>
        <li>
          Submit your server&apos;s <strong>public IP addresses (max 4)</strong> to your Hubtel <strong>Retail Systems Engineer</strong> for Transaction Status Check whitelisting.
        </li>
        <li>
          Test with a small amount (e.g. <code className="font-mono text-xs">GHS 0.10</code>) before going live. If no callback arrives within 5 minutes, we fall back to the Status Check API automatically.
        </li>
      </ol>
      <div className="mt-4 space-y-2">
        <p className="rounded-lg border border-[#cbd5e1] bg-white px-3 py-2 text-sm text-[#0f172a]">
          <strong>Callback URL:</strong> <span data-testid="hubtel-guide-callback" className="break-all">{callbackUrl}</span>
        </p>
        <p className="rounded-lg border border-[#cbd5e1] bg-white px-3 py-2 text-sm text-[#0f172a]">
          <strong>Return URL:</strong> <span data-testid="hubtel-guide-return" className="break-all">{returnUrl}</span>
        </p>
      </div>
      <p className="mt-3 text-sm text-[#475569]">
        <strong>Ghana only (GHS).</strong> Supports Mobile Money, Bank Card, Hubtel/G-Money/Zeepay wallets, GhQR, Cash and Cheque through Hubtel Online Checkout.
      </p>
    </div>
  );
}

export function PaymentSettingsPanel() {
  const address = useBusinessAddress();
  const [copied, setCopied] = useState(false);
  const [formError, setFormError] = useState("");
  const {
    paymentSettings,
    updatePaymentSettings,
    paymentGatewayStrategy,
    updatePaymentGatewayStrategy,
    businessLocations,
    getPaymentSettingsForBusiness,
    updateBusinessPaymentSettings,
    requestPaymentGateway,
  } = useDashboard();

  const [selectedBusinessId, setSelectedBusinessId] = useState(businessLocations[0]?.id ?? "");
  const [form, setForm] = useState(
    paymentGatewayStrategy === "per-business"
      ? getPaymentSettingsForBusiness(selectedBusinessId)
      : paymentSettings,
  );
  const [showKey, setShowKey] = useState(false);
  const [showSecret, setShowSecret] = useState(false);
  const [requestOpen, setRequestOpen] = useState(false);

  const [reqName, setReqName] = useState("");
  const [reqUrl, setReqUrl] = useState("");
  const [reqUsername, setReqUsername] = useState("");
  const [reqPassword, setReqPassword] = useState("");
  const [reqReason, setReqReason] = useState("");
  const [showReqPassword, setShowReqPassword] = useState(false);

  // Reload the form whenever the strategy changes, or a different
  // business is picked while in "per-business" mode.
  useEffect(() => {
    setForm(
      paymentGatewayStrategy === "per-business"
        ? getPaymentSettingsForBusiness(selectedBusinessId)
        : paymentSettings,
    );
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [paymentGatewayStrategy, selectedBusinessId]);

  function save() {
    if (form.gateway === "Hubtel") {
      const missing = [
        !form.consumerKey.trim() && "API Key",
        !form.consumerSecret.trim() && "API Secret",
        !(form.collectionAccountNumber ?? "").trim() && "Collection Account Number",
      ].filter(Boolean);
      if (missing.length) {
        setFormError(`Hubtel needs: ${missing.join(", ")}.`);
        return;
      }
    }
    setFormError("");
    if (paymentGatewayStrategy === "per-business") {
      updateBusinessPaymentSettings(selectedBusinessId, form);
    } else {
      updatePaymentSettings(form);
    }
  }

  function submitRequest() {
    if (!reqName.trim()) return;
    requestPaymentGateway({
      gatewayName: reqName.trim(),
      loginUrl: reqUrl.trim(),
      testUsername: reqUsername.trim(),
      reason: reqReason.trim(),
    });
    setRequestOpen(false);
    setReqName("");
    setReqUrl("");
    setReqUsername("");
    setReqPassword("");
    setReqReason("");
  }

  return (
    <>
    <article className="rounded-2xl border border-[#e2e8f0] bg-white p-6 shadow-[0_8px_24px_rgba(37,99,235,0.06)] md:p-8">
      <div className="-mx-6 mb-6 flex items-start justify-between gap-4 border-b border-[#e2e8f0] px-6 pb-5 md:-mx-8 md:px-8">
        <div>
          <h3 className="text-lg font-bold text-[#0f172a]">Payment Gateway Settings</h3>
          <p className="text-sm text-[#64748b]">Configure your own payment gateway to receive payments directly.</p>
        </div>
        <button
          type="button"
          data-testid="request-gateway"
          onClick={() => setRequestOpen(true)}
          className="inline-flex shrink-0 items-center gap-1.5 text-sm font-bold text-[#2563eb] hover:underline"
        >
          <Download size={16} /> Request Payment Gateway
        </button>
      </div>

      <div className="space-y-5">
        <Field
          label="Payment Gateway"
          hint="Select the payment gateway you want to use. PesaPal, PayFast and Hubtel redirect customers to a payment page. The other supported mobile money gateways send a prompt directly to the customer's phone."
        >
          <select
            value={form.gateway}
            onChange={(e) => {
              setForm({ ...form, gateway: e.target.value });
              setFormError("");
            }}
            className={inputClass}
          >
            {GATEWAYS.map((g) => (
              <option key={g} value={g}>
                {GATEWAY_LABELS[g] ?? g}
              </option>
            ))}
          </select>
        </Field>

        {form.gateway === "Hubtel" ? (
        <div data-testid="hubtel-fields" className="space-y-5">
          <Field label="API Key (Basic Auth Username)" hint="Copy the Hubtel API Key exactly as shown. It is used as the Basic Auth username.">
            <SecretBox testId="hubtel-key" value={form.consumerKey} onChange={(v) => setForm({ ...form, consumerKey: v })} />
          </Field>
          <Field label="API Secret (Basic Auth Password)" hint="Copy the Hubtel API Secret exactly as shown. It is used as the Basic Auth password.">
            <SecretBox testId="hubtel-secret" value={form.consumerSecret} onChange={(v) => setForm({ ...form, consumerSecret: v })} />
          </Field>
          <Field
            label="Collection Account Number"
            hint="Enter the Collection Account Number used as merchantAccountNumber in Online Checkout and in the status-check URL. It must belong to the same Hubtel business as the API credentials."
          >
            <input
              data-testid="hubtel-account"
              value={form.collectionAccountNumber ?? ""}
              onChange={(e) => setForm({ ...form, collectionAccountNumber: e.target.value })}
              className={inputClass}
            />
          </Field>
          <div>
            <p className="mb-1.5 text-sm font-semibold text-[#475569]">Your Callback URL (Webhook)</p>
            <div className="flex items-center gap-2 rounded-xl bg-[#f1f5f9] p-2 pl-4">
              <code data-testid="hubtel-callback" className="min-w-0 flex-1 break-all font-mono text-sm text-[#0f172a]">
                {address}/webhooks/hubtel
              </code>
              <button
                type="button"
                data-testid="hubtel-copy"
                onClick={() => {
                  navigator.clipboard?.writeText(`${address}/webhooks/hubtel`).catch(() => {});
                  setCopied(true);
                  window.setTimeout(() => setCopied(false), 1500);
                }}
                className="inline-flex h-9 items-center gap-1.5 rounded-lg bg-[#2563eb] px-3 text-sm font-bold text-white hover:bg-[#1d4ed8]"
              >
                {copied ? <Check size={14} /> : <Copy size={14} />} {copied ? "Copied" : "Copy"}
              </button>
            </div>
            <p className="mt-1 text-xs text-[#94a3b8]">
              Set automatically per transaction. Hubtel Online Checkout sends customers to pay.hubtel.com for OTP/payment, then posts the final status here.
            </p>
          </div>
          <HubtelGuide callbackUrl={`${address}/webhooks/hubtel`} returnUrl={`${address}/payments/hubtel/return`} />
        </div>
        ) : (
          <>
        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={() => setForm({ ...form, sandboxMode: !form.sandboxMode })}
            aria-pressed={form.sandboxMode}
            className={`relative h-6 w-11 shrink-0 rounded-full transition-colors ${
              form.sandboxMode ? "bg-emerald-500" : "bg-[#e2e8f0]"
            }`}
          >
            <span
              className={`absolute top-0.5 h-5 w-5 rounded-full bg-white shadow transition-transform ${
                form.sandboxMode ? "translate-x-5" : "translate-x-0.5"
              }`}
            />
          </button>
          <div>
            <p className="text-sm font-semibold text-[#475569]">Sandbox Mode</p>
            <p className="text-xs text-[#94a3b8]">Enable this to use {form.gateway} sandbox/test environment.</p>
          </div>
        </div>

        <div className="grid gap-5 md:grid-cols-2">
          <Field label="Consumer Key" hint={`Your ${form.gateway} Consumer Key (get from ${form.gateway} dashboard).`}>
            <div className="flex overflow-hidden rounded-xl border border-[#e2e8f0] focus-within:border-[#2563eb]">
              <input
                type={showKey ? "text" : "password"}
                value={form.consumerKey}
                onChange={(e) => setForm({ ...form, consumerKey: e.target.value })}
                className="h-11 w-full px-3 text-sm outline-none"
              />
              <button type="button" onClick={() => setShowKey((c) => !c)} className="flex items-center px-3 text-[#94a3b8]">
                {showKey ? <EyeOff size={15} /> : <Eye size={15} />}
              </button>
            </div>
          </Field>

          <Field label="Consumer Secret" hint={`Your ${form.gateway} Consumer Secret.`}>
            <div className="flex overflow-hidden rounded-xl border border-[#e2e8f0] focus-within:border-[#2563eb]">
              <input
                type={showSecret ? "text" : "password"}
                value={form.consumerSecret}
                onChange={(e) => setForm({ ...form, consumerSecret: e.target.value })}
                className="h-11 w-full px-3 text-sm outline-none"
              />
              <button type="button" onClick={() => setShowSecret((c) => !c)} className="flex items-center px-3 text-[#94a3b8]">
                {showSecret ? <EyeOff size={15} /> : <Eye size={15} />}
              </button>
            </div>
          </Field>
        </div>

        <Field label="IPN ID" hint="Auto-generated when you save with valid credentials. You can also enter one manually.">
          <input
            value={form.ipnId}
            onChange={(e) => setForm({ ...form, ipnId: e.target.value })}
            className={inputClass}
          />
        </Field>

        <div className="rounded-xl border border-[#f1f5f9] bg-[#ffffff] p-4">
          <p className="mb-1 text-sm font-bold text-[#0f172a]">Callback URL</p>
          <code className="block overflow-x-auto whitespace-nowrap rounded-lg bg-white px-3 py-2 text-xs text-[#475569]">
            {address}/api/hotspot/payment-callback
          </code>
          <p className="mt-2 text-xs text-amber-700">
            ⚠ {form.gateway} charges may apply per transaction. Customers may be redirected to a payment page.
          </p>
        </div>

          </>
        )}

        {formError && (
          <p data-testid="payment-form-error" className="rounded-lg bg-[#fef2f2] px-3 py-2 text-xs font-semibold text-[#b91c1c]">
            {formError}
          </p>
        )}

      <div className="rounded-xl border border-[#f1f5f9] bg-[#ffffff] p-4">
        <div className="flex items-center justify-between gap-3">
          <div>
            <p className="text-sm font-bold text-[#0f172a]">Use the same payment gateway for every business</p>
            <p className="text-xs text-[#64748b]">
              On — one gateway and one set of credentials applies to every business/site on the
              account. Off — each business can use a different gateway (e.g. one on MTN Mobile
              Money, another on PesaPal) with its own separate credentials.
            </p>
          </div>
          <button
            type="button"
            onClick={() =>
              updatePaymentGatewayStrategy(paymentGatewayStrategy === "same" ? "per-business" : "same")
            }
            className={`relative h-6 w-11 shrink-0 rounded-full transition ${
              paymentGatewayStrategy === "same" ? "bg-emerald-500" : "bg-[#e2e8f0]"
            }`}
          >
            <span
              className={`absolute top-0.5 h-5 w-5 rounded-full bg-white shadow transition-transform ${
                paymentGatewayStrategy === "same" ? "translate-x-5" : "translate-x-0.5"
              }`}
            />
          </button>
        </div>

        {paymentGatewayStrategy === "per-business" && (
          <div className="mt-4">
            <BusinessScopeBanner
              businessLocations={businessLocations}
              selectedBusinessId={selectedBusinessId}
              onSelectBusiness={setSelectedBusinessId}
            />
          </div>
        )}
      </div>


        <div className="flex justify-end">
          <button
            type="button"
            onClick={save}
            className="rounded-xl bg-[#2563eb] px-6 py-3 text-sm font-bold text-white hover:bg-[#1d4ed8]"
          >
            Save Payment Settings
          </button>
        </div>
      </div>

      {requestOpen && (
        <div className="fixed inset-0 z-[220] flex items-center justify-center bg-slate-950/50 p-4">
          <button type="button" aria-label="Close" className="absolute inset-0" onClick={() => setRequestOpen(false)} />
          <div className="relative z-10 w-full max-w-md rounded-2xl bg-white p-6 shadow-2xl">
            <div className="mb-1 flex items-center justify-between">
              <h3 className="text-lg font-bold text-[#0f172a]">Request Payment Gateway</h3>
              <button type="button" onClick={() => setRequestOpen(false)} className="rounded-lg p-1.5 text-[#64748b] hover:bg-[#ffffff]">
                <X size={18} />
              </button>
            </div>
            <p className="mb-4 text-sm text-[#64748b]">
              Use this form to request a payment gateway to be added. We will contact you once we have added it.
            </p>
            <div className="space-y-4">
              <Field label="Payment Gateway Name" required>
                <input
                  value={reqName}
                  onChange={(e) => setReqName(e.target.value)}
                  placeholder="Name of the payment gateway you want to be added"
                  className={inputClass}
                />
              </Field>
              <Field label="Gateway Login URL">
                <input
                  value={reqUrl}
                  onChange={(e) => setReqUrl(e.target.value)}
                  placeholder="Link to the dashboard/portal where we can sign in and test the gateway"
                  className={inputClass}
                />
              </Field>
              <Field label="Test Username / Email">
                <input
                  value={reqUsername}
                  onChange={(e) => setReqUsername(e.target.value)}
                  className={inputClass}
                />
              </Field>
              <Field label="Test Password / Token">
                <div className="flex overflow-hidden rounded-xl border border-[#e2e8f0] focus-within:border-[#2563eb]">
                  <input
                    type={showReqPassword ? "text" : "password"}
                    value={reqPassword}
                    onChange={(e) => setReqPassword(e.target.value)}
                    className="h-11 w-full px-3 text-sm outline-none"
                  />
                  <button type="button" onClick={() => setShowReqPassword((c) => !c)} className="flex items-center px-3 text-[#94a3b8]">
                    {showReqPassword ? <EyeOff size={15} /> : <Eye size={15} />}
                  </button>
                </div>
              </Field>
              <Field label="Reason">
                <textarea
                  value={reqReason}
                  onChange={(e) => setReqReason(e.target.value)}
                  placeholder="Why do you need this payment gateway?"
                  rows={3}
                  className={textareaClass}
                />
              </Field>
              <div className="flex gap-3">
                <button
                  type="button"
                  onClick={submitRequest}
                  disabled={!reqName.trim()}
                  className="rounded-xl bg-[#2563eb] px-5 py-3 text-sm font-bold text-white hover:bg-[#1d4ed8] disabled:cursor-not-allowed disabled:opacity-50"
                >
                  Submit Request
                </button>
                <button
                  type="button"
                  onClick={() => setRequestOpen(false)}
                  className="rounded-xl border border-[#e2e8f0] bg-white px-5 py-3 text-sm font-bold text-[#475569] hover:bg-[#ffffff]"
                >
                  Cancel
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </article>
      <ServerConnectionPanel />
    </>
  );
}
