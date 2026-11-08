"use client";

import { useState } from "react";
import { ShieldCheck } from "lucide-react";

import { useDashboard } from "../context/DashboardContext";
import { ToggleRow, Field, inputClass } from "./SettingsFormControls";

export function SecuritySettingsPanel() {
  const { securitySettings, updateSecuritySettings, showToast } = useDashboard();
  const [form, setForm] = useState(securitySettings);

  function save(updates = form) {
    updateSecuritySettings(updates);
  }

  function handleEnablePersonalTwoFactor() {
    const next = { ...form, personalTwoFactorEnabled: true };
    setForm(next);
    save(next);
    showToast("Two-factor authentication enabled for your account.");
  }

  return (
    <div className="space-y-6">
      <article className="rounded-2xl border border-[#e2e8f0] bg-white p-6 shadow-[0_8px_24px_rgba(37,99,235,0.06)] md:p-8">
        <h3 className="text-lg font-bold text-[#0f172a]">Two-Factor Authentication Policy</h3>
        <p className="mb-6 text-sm text-[#64748b]">Configure 2FA requirements for your organization.</p>

        <div className="space-y-5">
          <ToggleRow
            title="Enable 2FA"
            hint="Allow users to set up two-factor authentication."
            checked={form.orgTwoFactorEnabled}
            onChange={() => {
              const next = { ...form, orgTwoFactorEnabled: !form.orgTwoFactorEnabled };
              setForm(next);
              save(next);
            }}
          />

          <div className="grid gap-5 md:grid-cols-2">
            <ToggleRow
              title="Require 2FA for all users"
              hint="Force all users to set up 2FA before accessing the admin panel."
              checked={form.require2FAForAllUsers}
              onChange={() => {
                const next = { ...form, require2FAForAllUsers: !form.require2FAForAllUsers };
                setForm(next);
                save(next);
              }}
            />

            <Field label="Trust Device Duration (days)" hint="How long a device stays trusted after 2FA verification.">
              <input
                type="number"
                min={1}
                value={form.trustDeviceDurationDays}
                onChange={(e) => {
                  const next = { ...form, trustDeviceDurationDays: Number(e.target.value) };
                  setForm(next);
                }}
                onBlur={() => save()}
                className={inputClass}
              />
            </Field>
          </div>
        </div>
      </article>

      <article className="rounded-2xl border border-[#e2e8f0] bg-white p-6 shadow-[0_8px_24px_rgba(37,99,235,0.06)] md:p-8">
        <h3 className="text-lg font-bold text-[#0f172a]">Your Two-Factor Authentication</h3>
        <p className="mb-5 text-sm text-[#64748b]">Manage your personal 2FA settings.</p>

        <p className="mb-2 text-sm font-semibold text-[#475569]">Status</p>
        <span
          className={`mb-5 inline-block rounded-full px-3 py-1 text-xs font-bold ${
            form.personalTwoFactorEnabled ? "bg-emerald-100 text-emerald-700" : "bg-slate-200 text-slate-700"
          }`}
        >
          {form.personalTwoFactorEnabled ? "Enabled" : "Not enabled"}
        </span>

        {!form.personalTwoFactorEnabled ? (
          <div>
            <button
              type="button"
              onClick={handleEnablePersonalTwoFactor}
              className="inline-flex items-center gap-2 rounded-xl bg-emerald-500 px-5 py-3 text-sm font-bold text-white hover:bg-emerald-600"
            >
              <ShieldCheck size={16} /> Enable 2FA
            </button>
          </div>
        ) : (
          <button
            type="button"
            onClick={() => {
              const next = { ...form, personalTwoFactorEnabled: false };
              setForm(next);
              save(next);
              showToast("Two-factor authentication disabled for your account.");
            }}
            className="rounded-xl border border-red-200 bg-red-50 px-5 py-3 text-sm font-bold text-red-600 hover:bg-red-100"
          >
            Disable 2FA
          </button>
        )}
      </article>
    </div>
  );
}
