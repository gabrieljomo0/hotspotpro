"use client";

// Settings for ONE agent: whether they can sign in, what they may see and do
// on top of their permissions, and how you want to hear about what they do.
// Everything here applies to this agent only.

import { useEffect, useState } from "react";
import Link from "next/link";
import { Info } from "lucide-react";

import { useDashboard } from "../../context/DashboardContext";
import { ConfirmDialog } from "../../shared/ConfirmDialog";
import type { AgentProfile } from "../../shared/types";
import {
  isCustomerPurchaseAvailable,
  resolveVoucherAlertDeliveries,
  settingsOf,
  validateAgentSettings,
  type AgentSettings,
} from "../agentSettings";

function SectionTitle({ children }: { children: React.ReactNode }) {
  return (
    <div className="mb-3 mt-8 flex items-center gap-4">
      <h4 className="shrink-0 text-base font-bold text-[#1a1a1a]">{children}</h4>
      <div className="h-px flex-1 bg-[#f4f4f4]" />
    </div>
  );
}

function CheckRow({
  id,
  checked,
  onChange,
  label,
  description,
  disabled,
}: {
  id: string;
  checked: boolean;
  onChange: (next: boolean) => void;
  label: string;
  description?: string;
  disabled?: boolean;
}) {
  return (
    <div className="flex items-start gap-3 py-2">
      <input
        id={id}
        type="checkbox"
        checked={checked}
        disabled={disabled}
        onChange={(event) => onChange(event.target.checked)}
        className="mt-1 h-[18px] w-[18px] shrink-0 accent-[#1a1a1a]"
      />
      <label htmlFor={id} className={`block ${disabled ? "opacity-60" : "cursor-pointer"}`}>
        <span className="block text-[15px] font-medium text-[#1a1a1a]">{label}</span>
        {description && <span className="mt-0.5 block text-sm text-[#737373]">{description}</span>}
      </label>
    </div>
  );
}

export function AgentSettingsPanel({ agent }: { agent: AgentProfile }) {
  const { updateAgentSettings, setAgentStatus, voucherAlertLog, paymentSettings, momoSettings, branding } =
    useDashboard();

  const saved = settingsOf(agent);
  const [draft, setDraft] = useState<AgentSettings>(saved);
  const [confirmOff, setConfirmOff] = useState(false);

  // Follow the saved settings when they load or change elsewhere.
  const savedKey = JSON.stringify(saved);
  useEffect(() => {
    setDraft(saved);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [savedKey, agent.id]);

  function change<K extends keyof AgentSettings>(key: K, value: AgentSettings[K]) {
    setDraft((current) => ({ ...current, [key]: value }));
  }

  const errors = validateAgentSettings(draft);
  const hasErrors = Object.keys(errors).length > 0;
  const dirty = JSON.stringify(draft) !== JSON.stringify(saved);
  const purchaseAvailable = isCustomerPurchaseAvailable(paymentSettings, momoSettings);
  const deliveries = resolveVoucherAlertDeliveries(draft, {
    supportEmail: branding.supportEmail,
    supportNumber: branding.supportNumber,
  });
  const myAlerts = voucherAlertLog.filter((entry) => entry.agentId === agent.id);

  const isOwner = agent.isDefault;
  const accessOn = agent.status === "Active";
  const canToggleAccess = !isOwner && agent.status !== "Pending";

  const inputClass =
    "h-12 w-full rounded-xl border bg-white px-4 text-[15px] outline-none focus:border-[#1a1a1a]";

  return (
    <section className="w-full" data-testid="agent-settings-panel">
      <h3 className="mb-1 text-xl font-bold text-[#1a1a1a]">Settings for {agent.name}</h3>
      <p className="mb-6 max-w-3xl text-sm text-[#737373]">
        Whether {agent.name} can sign in, what they may see and do, and how you hear about what they do. These apply to
        this agent only — every agent has their own.
      </p>

      <div className="rounded-2xl border border-[#e6e6e6] bg-white p-6 md:p-8">
        {/* ---------- Access ---------- */}
        <div className="flex flex-wrap items-center justify-between gap-4" data-testid="access-section">
          <div className="max-w-xl">
            <h4 className="text-base font-bold text-[#1a1a1a]">Portal access</h4>
            <p className="mt-1 text-sm text-[#737373]">
              {isOwner
                ? "The owner profile always has access."
                : agent.status === "Pending"
                  ? "This agent's application hasn't been approved yet. Approve it from the Agent Applications tab first."
                  : accessOn
                    ? `${agent.name} can sign in to the agent portal.`
                    : `${agent.name} can't sign in. If they try, they're told to contact admin to reactivate their access.`}
            </p>
          </div>
          <button
            type="button"
            role="switch"
            aria-checked={accessOn}
            aria-label={`Access for ${agent.name}`}
            disabled={!canToggleAccess}
            onClick={() => (accessOn ? setConfirmOff(true) : setAgentStatus(agent.id, "Active"))}
            className={`relative h-8 w-14 shrink-0 rounded-full transition disabled:cursor-not-allowed disabled:opacity-50 ${
              accessOn ? "bg-emerald-500" : "bg-[#d4d4d4]"
            }`}
          >
            <span
              className={`absolute top-1 h-6 w-6 rounded-full bg-white shadow transition-transform ${
                accessOn ? "translate-x-7" : "translate-x-1"
              }`}
            />
          </button>
        </div>

        {/* ---------- What they may see and do ---------- */}
        <SectionTitle>What {agent.name} may see and do</SectionTitle>
        <p className="mb-3 text-sm text-[#737373]">
          These sit on top of their permissions: turning one off takes it away from this agent only. For finer control,
          use the Permissions tab.
        </p>

        <CheckRow
          id="cap-create"
          checked={draft.allowCreateVouchers}
          onChange={(value) => change("allowCreateVouchers", value)}
          label="Create vouchers"
          description="Allows this agent to create hotspot vouchers from their assigned packages in the agent portal."
        />
        <CheckRow
          id="cap-custom"
          checked={draft.allowCustomVoucherCredentials}
          onChange={(value) => change("allowCustomVoucherCredentials", value)}
          disabled={!draft.allowCreateVouchers}
          label="Allow custom voucher credentials on create"
          description="When on, this agent may optionally set the username and password for a single voucher. When off, codes are always auto-generated."
        />
        <CheckRow
          id="cap-sales"
          checked={draft.allowViewSalesCommission}
          onChange={(value) => change("allowViewSalesCommission", value)}
          label="View sales & commission"
          description="Overview KPIs and the sales table for this agent's payments."
        />
        <CheckRow
          id="cap-routers"
          checked={draft.allowViewAssignedRouters}
          onChange={(value) => change("allowViewAssignedRouters", value)}
          label="View assigned routers"
          description="Shows their assigned router name on the agent dashboard."
        />

        <div
          data-testid="purchase-for-customer-note"
          className="mt-3 flex items-start gap-3 rounded-xl border border-[#e6e6e6] bg-[#f7f7f7] px-4 py-3.5 text-sm text-[#525252]"
        >
          <Info size={16} className="mt-0.5 shrink-0 text-[#737373]" />
          {purchaseAvailable ? (
            <p>
              <strong className="font-semibold text-[#1a1a1a]">Purchase for Customer</strong> — a payment gateway is set
              up. Letting an agent start a mobile-money payment for a customer needs the payment backend, which
              isn&apos;t connected yet, so it isn&apos;t switched on.
            </p>
          ) : (
            <p>
              <strong className="font-semibold text-[#1a1a1a]">Purchase for Customer</strong> — not available. Configure
              Hubtel in{" "}
              <Link href="/dashboards/settings/payments" className="underline hover:text-[#1a1a1a]">
                Payment Settings
              </Link>
              , or a Hubtel/Paystack aggregator under{" "}
              <Link href="/dashboards/configuration/momo-integration" className="underline hover:text-[#1a1a1a]">
                Mobile Money
              </Link>
              , to enable this feature.
            </p>
          )}
        </div>

        {/* ---------- Alerts ---------- */}
        <SectionTitle>Voucher alerts for {agent.name}</SectionTitle>
        <p className="mb-3 text-sm text-[#737373]">
          When {agent.name} generates hotspot vouchers, you can get a short summary by email, SMS, or both. Leave the
          override fields empty to use your organization&apos;s email and business phone (set on the{" "}
          <Link href="/dashboards/settings" className="underline hover:text-[#1a1a1a]">
            System Settings
          </Link>{" "}
          page).
        </p>

        <CheckRow
          id="notify-on"
          checked={draft.notifyOnVoucherGeneration}
          onChange={(value) => change("notifyOnVoucherGeneration", value)}
          label={`Get notifications when ${agent.name} generates vouchers`}
        />

        {draft.notifyOnVoucherGeneration && (
          <div className="ml-[30px] mt-1 space-y-4 border-l-2 border-[#f4f4f4] pl-5" data-testid="alert-options">
            <div>
              <p className="mb-1 text-sm font-semibold text-[#525252]">Send by</p>
              <div className="flex flex-wrap gap-x-6">
                <CheckRow id="notify-email" checked={draft.notifyByEmail} onChange={(value) => change("notifyByEmail", value)} label="Email" />
                <CheckRow id="notify-sms" checked={draft.notifyBySms} onChange={(value) => change("notifyBySms", value)} label="SMS" />
              </div>
              {errors.notifyChannels && <p className="text-xs font-semibold text-red-600">{errors.notifyChannels}</p>}
            </div>

            {draft.notifyByEmail && (
              <label className="block max-w-lg">
                <span className="mb-1.5 block text-sm font-semibold text-[#525252]">Email address (optional override)</span>
                <input
                  value={draft.notifyEmailOverride}
                  onChange={(event) => change("notifyEmailOverride", event.target.value)}
                  placeholder={branding.supportEmail || "e.g. alerts@yourbusiness.com"}
                  aria-label="Alert email override"
                  className={`${inputClass} ${errors.notifyEmailOverride ? "border-red-400" : "border-[#e6e6e6]"}`}
                />
                {errors.notifyEmailOverride && <span className="mt-1 block text-xs font-semibold text-red-600">{errors.notifyEmailOverride}</span>}
              </label>
            )}

            {draft.notifyBySms && (
              <label className="block max-w-lg">
                <span className="mb-1.5 block text-sm font-semibold text-[#525252]">Phone number (optional override)</span>
                <input
                  value={draft.notifyPhoneOverride}
                  onChange={(event) => change("notifyPhoneOverride", event.target.value)}
                  placeholder={branding.supportNumber || "e.g. 024 000 0000"}
                  aria-label="Alert phone override"
                  className={`${inputClass} ${errors.notifyPhoneOverride ? "border-red-400" : "border-[#e6e6e6]"}`}
                />
                {errors.notifyPhoneOverride && <span className="mt-1 block text-xs font-semibold text-red-600">{errors.notifyPhoneOverride}</span>}
              </label>
            )}

            <div className="rounded-xl bg-[#f7f7f7] px-4 py-3 text-sm text-[#525252]" data-testid="alert-destinations">
              {deliveries.length === 0 ? (
                "Pick at least one way to be notified."
              ) : (
                deliveries.map((delivery) => (
                  <p key={delivery.channel}>
                    <span className="font-semibold">{delivery.channel}</span> →{" "}
                    {delivery.to ? (
                      <>
                        {delivery.to}
                        {!delivery.usingOverride && <span className="text-[#a3a3a3]"> (organization default)</span>}
                      </>
                    ) : (
                      <span className="font-semibold text-amber-700">
                        nowhere yet — add an override above or fill in your organization&apos;s{" "}
                        {delivery.channel === "Email" ? "email" : "phone number"} on System Settings
                      </span>
                    )}
                  </p>
                ))
              )}
              <p className="mt-2 text-xs text-[#a3a3a3]">
                Email and SMS sending isn&apos;t connected yet, so each summary is recorded below instead of being sent.
              </p>
            </div>
          </div>
        )}

        {myAlerts.length > 0 && (
          <div className="mt-4" data-testid="alert-log">
            <p className="mb-2 text-sm font-semibold text-[#525252]">Recent alerts for {agent.name} ({myAlerts.length})</p>
            <ul className="divide-y divide-[#f4f4f4] rounded-xl border border-[#f4f4f4]">
              {myAlerts.slice(0, 5).map((entry) => (
                <li key={entry.id} className="flex flex-wrap items-start justify-between gap-2 px-4 py-2.5 text-sm">
                  <div className="min-w-0">
                    <p className="text-[#1a1a1a]">{entry.message}</p>
                    <p className="text-xs text-[#a3a3a3]">
                      {entry.channel} → {entry.to ?? "no destination"} · {entry.sentAt}
                    </p>
                  </div>
                  <span
                    className={`shrink-0 rounded-full px-2.5 py-1 text-xs font-semibold ${
                      entry.status === "Logged" ? "bg-slate-100 text-slate-600" : "bg-amber-100 text-amber-700"
                    }`}
                  >
                    {entry.status === "Logged" ? "Recorded, not sent" : "No destination"}
                  </span>
                </li>
              ))}
            </ul>
          </div>
        )}

        {/* ---------- Payout notes ---------- */}
        <label className="mt-8 block">
          <span className="mb-2 block text-base font-bold text-[#1a1a1a]">Payout notes (internal)</span>
          <textarea
            value={draft.payoutNotes}
            onChange={(event) => change("payoutNotes", event.target.value)}
            rows={4}
            aria-label="Payout notes"
            className="w-full rounded-xl border border-[#e6e6e6] bg-white px-4 py-3 text-[15px] outline-none focus:border-[#1a1a1a]"
          />
          <span className="mt-1 block text-xs text-[#a3a3a3]">Only you and your team see this — {agent.name} never does.</span>
        </label>

        <p className="mt-4 rounded-xl bg-[#f7f7f7] px-4 py-3 text-xs text-[#737373]">
          {agent.name}&apos;s commission rate, wallet and limits are on their Commission, Wallet and Limits tabs.
        </p>

        <div className="mt-6 flex flex-wrap items-center gap-3">
          <button
            type="button"
            onClick={() => !hasErrors && updateAgentSettings(agent.id, draft)}
            disabled={!dirty || hasErrors}
            className="rounded-xl bg-[#1a1a1a] px-8 py-3.5 text-base font-bold text-white hover:bg-[#111111] disabled:cursor-not-allowed disabled:opacity-50"
          >
            Save
          </button>
          {dirty && (
            <>
              <button
                type="button"
                onClick={() => setDraft(saved)}
                className="rounded-xl border border-[#e6e6e6] bg-white px-5 py-3.5 text-sm font-semibold text-[#525252] hover:bg-[#ffffff]"
              >
                Discard changes
              </button>
              <span className="text-sm font-medium text-amber-700">You have unsaved changes.</span>
            </>
          )}
        </div>
      </div>

      <ConfirmDialog
        open={confirmOff}
        title={`Turn off access for ${agent.name}?`}
        subtitle={agent.name}
        confirmLabel="Yes, turn access off"
        points={[
          `${agent.name} can't sign in to the agent portal any more.`,
          "If they try, they're told to contact admin to reactivate their access.",
          "Their vouchers, sales and collection history are all kept, and you can turn access back on any time.",
        ]}
        onCancel={() => setConfirmOff(false)}
        onConfirm={() => {
          setAgentStatus(agent.id, "Suspended");
          setConfirmOff(false);
        }}
      />
    </section>
  );
}
