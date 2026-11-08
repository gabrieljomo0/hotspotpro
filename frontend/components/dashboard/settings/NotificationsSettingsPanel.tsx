"use client";

// Account-wide notification settings — who gets alerted (and how: SMS,
// email, or both) when a MikroTik router goes offline/online, when a
// captive portal issue happens, and reminders before a customer's package
// expires. This is account-wide; a single router can still override its
// own contacts from that router's "Notification Contacts" action.

import { useState } from "react";
import { Radio, Ticket, Clock3, Wifi as WifiIcon, KeyRound, Activity } from "lucide-react";

import { useDashboard } from "../context/DashboardContext";
import type { NotificationSettings } from "../shared/types";
import { ToggleRow, Field, inputClass, textareaClass } from "./SettingsFormControls";

const REMINDER_OPTIONS = ["15 minutes before", "30 minutes before", "1 hour before", "6 hours before", "12 hours before", "24 hours before"];
const CHANNEL_LABELS: Array<{ key: keyof NotificationSettings["businessPulseChannels"]; label: string }> = [
  { key: "dashboard", label: "Dashboard" },
  { key: "browserPush", label: "Browser push" },
  { key: "sms", label: "SMS" },
  { key: "whatsapp", label: "WhatsApp" },
  { key: "email", label: "Email" },
];

export function NotificationsSettingsPanel() {
  const { notificationSettings, updateNotificationSettings } = useDashboard();
  const [form, setForm] = useState<NotificationSettings>(notificationSettings);

  function set<K extends keyof NotificationSettings>(key: K, value: NotificationSettings[K]) {
    setForm((current) => ({ ...current, [key]: value }));
  }

  function save() {
    updateNotificationSettings(form);
  }

  function toggleChannel(key: keyof NotificationSettings["businessPulseChannels"]) {
    setForm((current) => ({
      ...current,
      businessPulseChannels: {
        ...current.businessPulseChannels,
        [key]: !current.businessPulseChannels[key],
      },
    }));
  }

  return (
    <div className="space-y-6">
      {/* MikroTik status */}
      <article className="rounded-2xl border border-[#e6e6e6] bg-white p-6 shadow-[0_8px_24px_rgba(26,26,26,0.06)] md:p-8">
        <div className="mb-6 flex items-center gap-3">
          <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-blue-100 text-blue-600">
            <Radio size={20} />
          </div>
          <div>
            <h3 className="text-lg font-bold text-[#1a1a1a]">MikroTik Status Notifications</h3>
            <p className="text-sm text-[#737373]">Notifications for MikroTik status changes.</p>
          </div>
        </div>

        <div className="space-y-5">
          <ToggleRow
            title="Enable MikroTik Status Notifications"
            hint="Get notified when a MikroTik router goes offline or comes back online."
            checked={form.mikrotikStatusEnabled}
            onChange={() => set("mikrotikStatusEnabled", !form.mikrotikStatusEnabled)}
          />
          <Field label="Notification Phone Numbers" hint="These numbers will receive MikroTik offline alerts and admin OTP verification codes.">
            <input
              value={form.mikrotikNotificationPhones}
              onChange={(e) => set("mikrotikNotificationPhones", e.target.value)}
              placeholder="Add phone numbers to notify"
              className={inputClass}
            />
          </Field>
          <Field label="Notification Emails" hint="These emails will receive MikroTik status alerts and admin OTP verification codes.">
            <input
              value={form.mikrotikNotificationEmails}
              onChange={(e) => set("mikrotikNotificationEmails", e.target.value)}
              placeholder="Add email addresses"
              className={inputClass}
            />
          </Field>
        </div>
      </article>

      {/* Voucher and payment notifications */}
      <article className="rounded-2xl border border-[#e6e6e6] bg-white p-6 shadow-[0_8px_24px_rgba(26,26,26,0.06)] md:p-8">
        <div className="mb-6 flex items-center gap-3">
          <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-emerald-100 text-emerald-600">
            <Ticket size={20} />
          </div>
          <div>
            <h3 className="text-lg font-bold text-[#1a1a1a]">Voucher and Payment Notifications</h3>
            <p className="text-sm text-[#737373]">
              Control voucher delivery and the optional payment receipt sent after successful hotspot payments.
            </p>
          </div>
        </div>

        <div className="space-y-5">
          <ToggleRow
            title="Send voucher code by SMS"
            hint="Controls SMS delivery of voucher codes/login credentials after successful payment. WhatsApp delivery is controlled by the channel settings."
            checked={form.sendVoucherCodeBySms}
            onChange={() => set("sendVoucherCodeBySms", !form.sendVoucherCodeBySms)}
          />
          <ToggleRow
            title="Send hotspot credentials message"
            hint='Controls hotspot credential messages after online login. Voucher-code SMS delivery is controlled by "Send voucher code by SMS".'
            checked={form.sendHotspotCredentialsMessage}
            onChange={() => set("sendHotspotCredentialsMessage", !form.sendHotspotCredentialsMessage)}
          />
          <Field
            label="Hotspot voucher/credentials message"
            hint="Used for voucher-code and hotspot-credentials messages. Variables: @password, @package_name, @validity, @company_name, @expiry_date, @support_number, @portal_url, @amount"
          >
            <textarea
              value={form.hotspotCredentialsMessage}
              onChange={(e) => set("hotspotCredentialsMessage", e.target.value)}
              rows={5}
              className={textareaClass}
            />
          </Field>
          <ToggleRow
            title="Send separate payment receipt SMS"
            hint="Sends a short payment receipt SMS in addition to the voucher/credentials message."
            checked={form.sendPaymentReceiptSms}
            onChange={() => set("sendPaymentReceiptSms", !form.sendPaymentReceiptSms)}
          />
        </div>
      </article>

      {/* Hotspot expiry notifications */}
      <article className="rounded-2xl border border-[#e6e6e6] bg-white p-6 shadow-[0_8px_24px_rgba(26,26,26,0.06)] md:p-8">
        <div className="mb-6 flex items-center gap-3">
          <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-amber-100 text-amber-600">
            <Clock3 size={20} />
          </div>
          <div>
            <h3 className="text-lg font-bold text-[#1a1a1a]">Expiry Notifications</h3>
            <p className="text-sm text-[#737373]">SMS sent when a user package has expired, or shortly before it does.</p>
          </div>
        </div>

        <div className="space-y-5">
          <ToggleRow
            title="Send expiry notifications to hotspot users"
            checked={form.sendExpiryNotification}
            onChange={() => set("sendExpiryNotification", !form.sendExpiryNotification)}
          />
          <Field label="Hotspot expiry notification" hint="Variables: @username, @package_name, @company_name, @expiry_date, @support_number, @portal_url">
            <textarea
              value={form.hotspotExpiryMessage}
              onChange={(e) => set("hotspotExpiryMessage", e.target.value)}
              rows={4}
              className={textareaClass}
            />
          </Field>

          <div className="border-t border-[#f4f4f4] pt-5">
            <ToggleRow
              title="Send expiry reminder notifications to hotspot users"
              hint="Send SMS reminder before package expires"
              checked={form.sendExpiryReminder}
              onChange={() => set("sendExpiryReminder", !form.sendExpiryReminder)}
            />
          </div>
          {form.sendExpiryReminder && (
            <>
              <Field label="Send reminder before expiry">
                <select
                  value={form.expiryReminderBefore}
                  onChange={(e) => set("expiryReminderBefore", e.target.value)}
                  className={inputClass}
                >
                  {REMINDER_OPTIONS.map((opt) => (
                    <option key={opt}>{opt}</option>
                  ))}
                </select>
              </Field>
              <Field
                label="Expiry reminder SMS"
                hint="Variables: @username, @package_name, @company_name, @expiry_date, @hours_left, @support_number, @portal_url"
              >
                <textarea
                  value={form.expiryReminderMessage}
                  onChange={(e) => set("expiryReminderMessage", e.target.value)}
                  rows={5}
                  className={textareaClass}
                />
              </Field>
            </>
          )}
        </div>
      </article>

      {/* PPPoE expiry notifications */}
      <article className="rounded-2xl border border-[#e6e6e6] bg-white p-6 shadow-[0_8px_24px_rgba(26,26,26,0.06)] md:p-8">
        <div className="mb-6 flex items-center gap-3">
          <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-blue-100 text-blue-600">
            <WifiIcon size={20} />
          </div>
          <div>
            <h3 className="text-lg font-bold text-[#1a1a1a]">PPPoE Expiry Notifications</h3>
            <p className="text-sm text-[#737373]">
              Notifications for PPPoE customers (separate from hotspot users). Routed via the channel configured in WhatsApp Settings.
            </p>
          </div>
        </div>

        <div className="space-y-5">
          <ToggleRow
            title="Send reminder before PPPoE subscription expires"
            checked={form.sendPppoeExpiryReminder}
            onChange={() => set("sendPppoeExpiryReminder", !form.sendPppoeExpiryReminder)}
          />
          {form.sendPppoeExpiryReminder && (
            <>
              <Field label="Send PPPoE reminder before expiry">
                <select
                  value={form.pppoeReminderBefore}
                  onChange={(e) => set("pppoeReminderBefore", e.target.value)}
                  className={inputClass}
                >
                  {REMINDER_OPTIONS.map((opt) => (
                    <option key={opt}>{opt}</option>
                  ))}
                </select>
              </Field>
              <Field
                label="PPPoE expiry reminder message"
                hint="Variables: @username, @package_name, @company_name, @expiry_date, @hours_left, @support_number, @renew_url"
              >
                <textarea
                  value={form.pppoeReminderMessage}
                  onChange={(e) => set("pppoeReminderMessage", e.target.value)}
                  rows={5}
                  className={textareaClass}
                />
              </Field>
            </>
          )}

          <div className="border-t border-[#f4f4f4] pt-5">
            <ToggleRow
              title="Send notification when PPPoE subscription expires"
              checked={form.sendPppoeExpiryNotification}
              onChange={() => set("sendPppoeExpiryNotification", !form.sendPppoeExpiryNotification)}
            />
          </div>
          {form.sendPppoeExpiryNotification && (
            <Field
              label="PPPoE expiry notification message"
              hint="Variables: @username, @package_name, @company_name, @expiry_date, @support_number, @renew_url"
            >
              <textarea
                value={form.pppoeExpiryMessage}
                onChange={(e) => set("pppoeExpiryMessage", e.target.value)}
                rows={4}
                className={textareaClass}
              />
            </Field>
          )}
        </div>
      </article>

      {/* OTP verification */}
      <article className="rounded-2xl border border-[#e6e6e6] bg-white p-6 shadow-[0_8px_24px_rgba(26,26,26,0.06)] md:p-8">
        <div className="mb-6 flex items-center gap-3">
          <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-blue-100 text-blue-600">
            <KeyRound size={20} />
          </div>
          <div>
            <h3 className="text-lg font-bold text-[#1a1a1a]">OTP Verification SMS</h3>
            <p className="text-sm text-[#737373]">SMS sent for free trial phone verification.</p>
          </div>
        </div>
        <Field label="OTP verification SMS" hint="Variables: @company_name, @otp_code, @validity">
          <textarea
            value={form.otpVerificationMessage}
            onChange={(e) => set("otpVerificationMessage", e.target.value)}
            rows={4}
            className={textareaClass}
          />
        </Field>
      </article>

      {/* Business Pulse */}
      <article className="rounded-2xl border border-[#e6e6e6] bg-white p-6 shadow-[0_8px_24px_rgba(26,26,26,0.06)] md:p-8">
        <div className="mb-6 flex items-center gap-3">
          <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-red-100 text-red-600">
            <Activity size={20} />
          </div>
          <div>
            <h3 className="text-lg font-bold text-[#1a1a1a]">Business Pulse</h3>
            <p className="text-sm text-[#737373]">Owner alerts when sales are completed. These messages go to your team, not customers.</p>
          </div>
        </div>

        <div className="space-y-5">
          <ToggleRow
            title="Enable Business Pulse"
            hint="Send short sales alerts to owner/admin contacts after successful payments."
            checked={form.businessPulseEnabled}
            onChange={() => set("businessPulseEnabled", !form.businessPulseEnabled)}
          />

          {form.businessPulseEnabled && (
            <>
              <div>
                <p className="mb-2 text-sm font-semibold text-[#525252]">Alert channels</p>
                <div className="flex flex-wrap gap-4">
                  {CHANNEL_LABELS.map(({ key, label }) => (
                    <label key={key} className="flex items-center gap-2 text-sm text-[#525252]">
                      <input
                        type="checkbox"
                        checked={form.businessPulseChannels[key]}
                        onChange={() => toggleChannel(key)}
                        className="h-4 w-4 rounded border-[#e6e6e6] accent-[#1a1a1a]"
                      />
                      {label}
                    </label>
                  ))}
                </div>
                <p className="mt-1 text-xs text-[#a3a3a3]">Browser push can notify enabled admin devices even when the dashboard is closed.</p>
              </div>

              <Field label="Owner email addresses" hint="Required for email alerts. You can add multiple addresses.">
                <input
                  value={form.ownerEmails}
                  onChange={(e) => set("ownerEmails", e.target.value)}
                  placeholder="Add email addresses"
                  className={inputClass}
                />
              </Field>

              <div>
                <p className="mb-2 text-sm font-semibold text-[#525252]">Alert types</p>
                <div className="flex flex-wrap gap-4">
                  <label className="flex items-center gap-2 text-sm text-[#525252]">
                    <input
                      type="checkbox"
                      checked={form.alertVoucherSales}
                      onChange={() => set("alertVoucherSales", !form.alertVoucherSales)}
                      className="h-4 w-4 rounded border-[#e6e6e6] accent-[#1a1a1a]"
                    />
                    Voucher sales
                  </label>
                  <label className="flex items-center gap-2 text-sm text-[#525252]">
                    <input
                      type="checkbox"
                      checked={form.alertPppoeRenewals}
                      onChange={() => set("alertPppoeRenewals", !form.alertPppoeRenewals)}
                      className="h-4 w-4 rounded border-[#e6e6e6] accent-[#1a1a1a]"
                    />
                    PPPoE renewals
                  </label>
                  <label className="flex items-center gap-2 text-sm text-[#525252]">
                    <input
                      type="checkbox"
                      checked={form.alertAgentVoucherSales}
                      onChange={() => set("alertAgentVoucherSales", !form.alertAgentVoucherSales)}
                      className="h-4 w-4 rounded border-[#e6e6e6] accent-[#1a1a1a]"
                    />
                    Agent voucher sales
                  </label>
                </div>
              </div>

              <Field label="Minimum sale amount" hint="Set to 0 to alert for every completed sale.">
                <input
                  type="number"
                  min={0}
                  value={form.minimumSaleAmount}
                  onChange={(e) => set("minimumSaleAmount", Number(e.target.value))}
                  className={inputClass}
                />
              </Field>
            </>
          )}
        </div>
      </article>

      <div className="flex justify-end">
        <button
          type="button"
          onClick={save}
          className="rounded-xl bg-[#1a1a1a] px-6 py-3 text-sm font-bold text-white hover:bg-[#111111]"
        >
          Save Notification Settings
        </button>
      </div>
    </div>
  );
}
