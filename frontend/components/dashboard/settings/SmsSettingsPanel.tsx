"use client";

// Settings → SMS. Turn customer SMS on, pick the gateway, and save that
// gateway's credentials. Edits stay a draft until Save (an "Unsaved changes"
// bar offers Save / Discard). Nothing is really sent in this demo.

import { useState } from "react";
import { Check, Eye, EyeOff, RotateCcw } from "lucide-react";

import { useDashboard } from "../context/DashboardContext";
import { usePersistedState } from "../context/usePersistedState";
import { Toggle } from "./SettingsFormControls";

type GatewayField = { key: "apiKey" | "apiSecret" | "username"; label: string; hint: string; secret?: boolean; required?: boolean };
type Gateway = { id: string; signupUrl?: string; label: string; blurb: string; fields: GatewayField[] };

export const SMS_GATEWAYS: Gateway[] = [
  {
    id: "mambo",
    signupUrl: "https://www.mambosms.com/signup?q=MA1771017126",
    label: "Mambo SMS (Uganda)",
    blurb: "Uganda-based SMS delivery (Airtel, MTN & UTL).",
    fields: [{ key: "apiKey", label: "API Key", hint: "Paste the API key generated from your Mambo SMS dashboard", secret: true, required: true }],
  },
  {
    id: "julysms",
    label: "JulySMS (Uganda)",
    blurb: "The recommended gateway for Uganda.",
    fields: [{ key: "apiKey", label: "API Key", hint: "Paste the API key from your JulySMS dashboard", secret: true, required: true }],
  },
  {
    id: "africastalking",
    label: "Africa's Talking",
    blurb: "Supports 25+ African countries.",
    fields: [
      { key: "username", label: "Username", hint: "Your Africa's Talking account username", required: true },
      { key: "apiKey", label: "API Key", hint: "Paste the API key from your Africa's Talking dashboard", secret: true, required: true },
    ],
  },
  {
    id: "hubtel",
    label: "Hubtel (Ghana)",
    blurb: "Ghana-based SMS delivery.",
    fields: [
      { key: "username", label: "Client ID", hint: "The client ID from your Hubtel dashboard", required: true },
      { key: "apiSecret", label: "Client Secret", hint: "The client secret from your Hubtel dashboard", secret: true, required: true },
    ],
  },
];

export type SmsState = {
  enabled: boolean;
  gateway: string;
  senderId: string;
  creds: Record<string, { apiKey: string; apiSecret: string; username: string }>;
};

const EMPTY = { apiKey: "", apiSecret: "", username: "" };
const INITIAL: SmsState = { enabled: false, gateway: "mambo", senderId: "", creds: {} };

export function SmsSettingsPanel() {
  const { showToast, logActivity } = useDashboard();
  const [saved, setSaved] = usePersistedState<SmsState>("smsSettings", INITIAL);
  const [draft, setDraft] = useState<SmsState | null>(null);
  const [shown, setShown] = useState<Record<string, boolean>>({});
  const [errors, setErrors] = useState<string[]>([]);

  const view = draft ?? saved;
  const gateway = SMS_GATEWAYS.find((g) => g.id === view.gateway) ?? SMS_GATEWAYS[0];
  const creds = view.creds[gateway.id] ?? EMPTY;
  const dirty = draft !== null && JSON.stringify(draft) !== JSON.stringify(saved);

  function edit(change: Partial<SmsState>) {
    setDraft({ ...view, ...change });
    setErrors([]);
  }
  function editCred(key: GatewayField["key"], value: string) {
    edit({ creds: { ...view.creds, [gateway.id]: { ...creds, [key]: value } } });
  }

  function save() {
    const missing = view.enabled ? gateway.fields.filter((f) => f.required && !creds[f.key].trim()).map((f) => f.label) : [];
    if (missing.length) {
      setErrors(missing.map((label) => `${label} is required.`));
      return;
    }
    setSaved(view);
    setDraft(null);
    setErrors([]);
    showToast("SMS settings saved.");
    logActivity("Settings", `Saved SMS settings (${gateway.label}, ${view.enabled ? "on" : "off"}).`);
  }

  function discard() {
    setDraft(null);
    setErrors([]);
  }

  return (
    <div data-testid="sms-panel" className="space-y-6 pb-24">
      <section className="rounded-2xl bg-white">
        <header className="border-b border-[#e2e8f0] px-6 py-5">
          <h3 className="text-lg font-bold text-[#0f172a]">SMS Gateway Configuration</h3>
          <p className="text-sm text-[#64748b]">Configure the SMS gateway used to send notifications to customers.</p>
        </header>
        <div className="space-y-6 p-6">
          <div>
            <div className="flex items-center gap-3">
              <Toggle checked={view.enabled} onChange={() => edit({ enabled: !view.enabled })} />
              <span data-testid="sms-enabled-label" className="text-sm font-bold text-[#0f172a]">
                Enable SMS Notifications
              </span>
            </div>
            <p className="mt-2 text-xs text-[#64748b]">Turn this on to send SMS notifications to customers.</p>
          </div>

          <label className="block">
            <span className="mb-1.5 block text-sm font-semibold text-[#475569]">SMS Gateway</span>
            <select
              data-testid="sms-gateway"
              value={view.gateway}
              onChange={(event) => edit({ gateway: event.target.value })}
              className="h-11 w-full rounded-lg border border-[#cbd5e1] bg-white px-3 text-sm text-[#0f172a] outline-none focus:border-[#2563eb]"
            >
              {SMS_GATEWAYS.map((g) => (
                <option key={g.id} value={g.id}>
                  {g.label}
                </option>
              ))}
            </select>
            <span className="mt-1 block text-xs text-[#94a3b8]">{gateway.blurb}</span>
          </label>
        </div>
      </section>

      <section className="rounded-2xl bg-white" data-testid="sms-credentials">
        <header className="border-b border-[#e2e8f0] px-6 py-5">
          <h3 className="text-lg font-bold text-[#0f172a]">{gateway.label.replace(/ \(.*\)/, "")} Settings</h3>
          <p className="text-sm text-[#64748b]">Enter your {gateway.label.replace(/ \(.*\)/, "")} credentials. {gateway.blurb}</p>
        </header>
        <div className="space-y-6 p-6">
          <div className="rounded-lg bg-[#f1f5f9] p-4">
            <p className="mb-2 text-sm font-bold text-[#0f172a]">How to get your credentials</p>
            <ol className="list-decimal space-y-1 pl-5 text-sm text-[#475569]">
              <li>
                Create a {gateway.label.replace(/ \(.*\)/, "")} account
                {gateway.signupUrl ? (
                  <>
                    :{" "}
                    <a
                      href={gateway.signupUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      data-testid="sms-signup-link"
                      className="font-bold text-[#2563eb] underline hover:text-[#1d4ed8]"
                    >
                      Sign up here
                    </a>
                  </>
                ) : (
                  " with the provider."
                )}
              </li>
              <li>Log in to the provider&apos;s dashboard.</li>
              <li>Open its API settings (usually in the side menu).</li>
              <li>Generate or copy your credentials and paste them below.</li>
            </ol>
          </div>

          <div className="grid gap-5 md:grid-cols-2">
            {gateway.fields.map((field) => {
              const key = `${gateway.id}-${field.key}`;
              const visible = !field.secret || shown[key];
              return (
                <label key={key} className="block">
                  <span className="mb-1.5 block text-sm font-semibold text-[#475569]">
                    {field.label} {field.required && <span className="text-red-500">*</span>}
                  </span>
                  <div className="flex h-11 items-center rounded-lg border border-[#cbd5e1] bg-white focus-within:border-[#2563eb]">
                    <input
                      data-testid={`sms-${field.key}`}
                      type={visible ? "text" : "password"}
                      value={creds[field.key]}
                      onChange={(event) => editCred(field.key, event.target.value)}
                      autoComplete="off"
                      className="h-full min-w-0 flex-1 bg-transparent px-3 text-sm text-[#0f172a] outline-none"
                    />
                    {field.secret && (
                      <button
                        type="button"
                        aria-label={shown[key] ? "Hide" : "Show"}
                        onClick={() => setShown((c) => ({ ...c, [key]: !c[key] }))}
                        className="flex h-full w-11 items-center justify-center border-l border-[#e2e8f0] text-[#64748b] hover:bg-[#f1f5f9]"
                      >
                        {shown[key] ? <EyeOff size={16} /> : <Eye size={16} />}
                      </button>
                    )}
                  </div>
                  <span className="mt-1 block text-xs text-[#94a3b8]">{field.hint}</span>
                </label>
              );
            })}
            <label className="block">
              <span className="mb-1.5 block text-sm font-semibold text-[#475569]">Sender ID</span>
              <input
                data-testid="sms-sender"
                value={view.senderId}
                maxLength={11}
                onChange={(event) => edit({ senderId: event.target.value })}
                className="h-11 w-full rounded-lg border border-[#cbd5e1] bg-white px-3 text-sm text-[#0f172a] outline-none focus:border-[#2563eb]"
              />
              <span className="mt-1 block text-xs text-[#94a3b8]">
                Optional. Any word or registered Sender ID (max 11 characters). If left empty, your company name is used.
              </span>
            </label>
          </div>

          {errors.length > 0 && (
            <div data-testid="sms-errors" className="rounded-lg bg-[#fef2f2] px-3 py-2 text-xs font-semibold text-[#b91c1c]">
              {errors.map((e) => (
                <p key={e}>{e}</p>
              ))}
            </div>
          )}

          <button
            type="button"
            data-testid="sms-save"
            onClick={save}
            className="inline-flex h-11 items-center gap-2 rounded-lg bg-[#2563eb] px-5 text-sm font-bold text-white hover:bg-[#1d4ed8]"
          >
            <Check size={16} /> Save Settings
          </button>
        </div>
      </section>

      {dirty && (
        <div
          data-testid="sms-unsaved"
          className="fixed bottom-6 left-1/2 z-40 flex w-[min(92vw,34rem)] -translate-x-1/2 items-center justify-between gap-4 rounded-xl border border-[#cbd5e1] bg-white px-5 py-3 shadow-lg"
        >
          <div>
            <p className="text-sm font-bold text-[#0f172a]">Unsaved changes</p>
            <p className="text-xs text-[#64748b]">Save before leaving this page.</p>
          </div>
          <div className="flex gap-2">
            <button
              type="button"
              data-testid="sms-discard"
              onClick={discard}
              className="inline-flex h-10 items-center gap-2 rounded-lg border border-[#cbd5e1] bg-white px-4 text-sm font-bold text-[#475569] hover:bg-[#f1f5f9]"
            >
              <RotateCcw size={14} /> Discard
            </button>
            <button
              type="button"
              data-testid="sms-bar-save"
              onClick={save}
              className="inline-flex h-10 items-center gap-2 rounded-lg bg-[#2563eb] px-4 text-sm font-bold text-white hover:bg-[#1d4ed8]"
            >
              <Check size={14} /> Save
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
