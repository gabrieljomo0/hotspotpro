"use client";

// Settings → WhatsApp. Channel choice, the provider credentials, and the
// inbound chatbot. Edits are a draft until saved ("Unsaved changes" bar).
// Demo only: nothing is really sent or connected.

import { useEffect, useState } from "react";
import { Check, ChevronDown, Copy, ExternalLink, Eye, EyeOff, Lightbulb, RotateCcw } from "lucide-react";

import { useDashboard } from "../context/DashboardContext";
import { usePersistedState } from "../context/usePersistedState";
import { Toggle } from "./SettingsFormControls";
import { useBusinessAddress } from "./DomainSettingsPanel";

// Put your WhatsApp provider's sign-up address here to show the button.
export const WHATSAPP_PROVIDER_SIGNUP_URL = "";

export const CHANNELS = [
  { id: "sms", label: "SMS only" },
  { id: "whatsapp", label: "WhatsApp only" },
  { id: "both", label: "Both SMS and WhatsApp" },
];
export const CHATBOT_COMMANDS = ["BUY", "RENEW", "VOUCHER <code>", "PAYMENT <ref>", "EXPIRY", "HELP", "MENU", "CANCEL"];

export type WhatsAppState = {
  enabled: boolean;
  channel: string;
  gateway: string;
  apiKey: string;
  device: string;
  signingSecret: string;
  chatbotEnabled: boolean;
};
const INITIAL: WhatsAppState = { enabled: false, channel: "both", gateway: "whatsapp", apiKey: "", device: "", signingSecret: "", chatbotEnabled: false };

const card = "rounded-2xl bg-white";
const input = "h-11 w-full rounded-lg border border-[#d4d4d4] bg-white px-3 text-sm text-[#1a1a1a] outline-none focus:border-[#1a1a1a]";

function Secret({ id, value, onChange }: { id: string; value: string; onChange: (v: string) => void }) {
  const [show, setShow] = useState(false);
  return (
    <div className="flex h-11 items-center rounded-lg border border-[#d4d4d4] bg-white focus-within:border-[#1a1a1a]">
      <input
        data-testid={id}
        type={show ? "text" : "password"}
        value={value}
        onChange={(event) => onChange(event.target.value)}
        autoComplete="off"
        className="h-full min-w-0 flex-1 bg-transparent px-3 text-sm text-[#1a1a1a] outline-none"
      />
      <button
        type="button"
        aria-label={show ? "Hide" : "Show"}
        onClick={() => setShow((c) => !c)}
        className="flex h-full w-11 items-center justify-center border-l border-[#e6e6e6] text-[#737373] hover:bg-[#f4f4f4]"
      >
        {show ? <EyeOff size={16} /> : <Eye size={16} />}
      </button>
    </div>
  );
}

export function WhatsAppSettingsPanel() {
  const { showToast, logActivity } = useDashboard();
  const address = useBusinessAddress();
  // The callback carries your business code so the platform knows whose WhatsApp event it is.
  const [bizTag, setBizTag] = useState("");
  useEffect(() => {
    fetch("/api/auth/me", { cache: "no-store" })
      .then((r) => (r.ok ? r.json() : null))
      .then((me) => {
        const id: string | undefined = me?.viewing?.id ?? me?.tenantId;
        if (id) setBizTag(id.replace(/^t-/, ""));
      })
      .catch(() => undefined);
  }, []);
  const webhook = `${address}/api/webhooks/whatsapp${bizTag ? `?biz=${bizTag}` : ""}`;
  const [saved, setSaved] = usePersistedState<WhatsAppState>("whatsappSettings", INITIAL);
  const [draft, setDraft] = useState<WhatsAppState | null>(null);
  const [errors, setErrors] = useState<string[]>([]);
  const [copied, setCopied] = useState(false);
  const [botOpen, setBotOpen] = useState(true);

  const view = draft ?? saved;
  const dirty = draft !== null && JSON.stringify(draft) !== JSON.stringify(saved);
  const keySaved = saved.apiKey.trim() !== "";

  function edit(change: Partial<WhatsAppState>) {
    setDraft({ ...view, ...change });
    setErrors([]);
  }

  function save() {
    const problems: string[] = [];
    if ((view.enabled || view.chatbotEnabled) && !view.apiKey.trim()) problems.push("API Key is required.");
    if (view.chatbotEnabled && !view.signingSecret.trim()) problems.push("Webhook Signing Secret is required for the chatbot.");
    if (problems.length) return setErrors(problems);
    // Once a key is saved, the first device is picked automatically.
    const next = { ...view, device: view.apiKey.trim() ? view.device || "Primary device" : "" };
    setSaved(next);
    setDraft(null);
    setErrors([]);
    showToast("WhatsApp settings saved.");
    logActivity("Settings", `Saved WhatsApp settings (${next.enabled ? "on" : "off"}, chatbot ${next.chatbotEnabled ? "on" : "off"}).`);
  }

  function copyWebhook() {
    navigator.clipboard?.writeText(webhook).catch(() => {});
    setCopied(true);
    window.setTimeout(() => setCopied(false), 1500);
  }

  return (
    <div data-testid="wa-panel" className="space-y-6 pb-24">
      {/* 1. Configuration */}
      <section className={card}>
        <header className="border-b border-[#e6e6e6] px-6 py-5">
          <h3 className="text-lg font-bold text-[#1a1a1a]">WhatsApp Configuration</h3>
          <p className="text-sm text-[#737373]">Configure WhatsApp messaging for customer notifications.</p>
        </header>
        <div className="space-y-6 p-6">
          <div>
            <div className="flex items-center gap-3">
              <Toggle checked={view.enabled} onChange={() => edit({ enabled: !view.enabled })} />
              <span className="text-sm font-bold text-[#1a1a1a]">Enable WhatsApp Notifications</span>
            </div>
            <p className="mt-2 text-xs text-[#737373]">Enable sending notifications via WhatsApp.</p>
          </div>
          <label className="block">
            <span className="mb-1.5 block text-sm font-semibold text-[#525252]">Notification Channel</span>
            <select data-testid="wa-channel" value={view.channel} onChange={(e) => edit({ channel: e.target.value })} className={input}>
              {CHANNELS.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.label}
                </option>
              ))}
            </select>
            <span className="mt-1 block text-xs text-[#a3a3a3]">Choose how to send notifications to customers. WhatsApp requires the device to be connected.</span>
          </label>
          <label className="block">
            <span className="mb-1.5 block text-sm font-semibold text-[#525252]">WhatsApp Gateway</span>
            <select data-testid="wa-gateway" value={view.gateway} onChange={(e) => edit({ gateway: e.target.value })} className={input}>
              <option value="whatsapp">WhatsApp provider</option>
            </select>
          </label>
        </div>
      </section>

      {/* 2. Provider credentials */}
      <section className={card}>
        <header className="border-b border-[#e6e6e6] px-6 py-5">
          <h3 className="text-lg font-bold text-[#1a1a1a]">WhatsApp Provider Settings</h3>
          <p className="text-sm text-[#737373]">Configure your WhatsApp API credentials.</p>
        </header>
        <div className="space-y-6 p-6">
          <div>
            {WHATSAPP_PROVIDER_SIGNUP_URL && (
              <a
                href={WHATSAPP_PROVIDER_SIGNUP_URL}
                target="_blank"
                rel="noopener noreferrer"
                data-testid="wa-signup"
                className="inline-flex h-11 items-center gap-2 rounded-lg bg-[#1a1a1a] px-4 text-sm font-bold text-white hover:bg-[#111111]"
              >
                Sign up with your provider <ExternalLink size={15} />
              </a>
            )}
            <p className="mt-2 text-xs text-[#737373]">After signing up, add a device, scan the QR, create an API key, then paste it below.</p>
          </div>

          <div>
            <p className="mb-1.5 text-sm font-semibold text-[#525252]">Inbound Webhook URL</p>
            <div className="flex items-center gap-2">
              <code data-testid="wa-webhook" className="min-w-0 flex-1 break-all rounded-lg bg-[#f4f4f4] px-3 py-2.5 font-mono text-sm text-[#1a1a1a]">
                {webhook}
              </code>
              <button
                type="button"
                data-testid="wa-copy-webhook"
                onClick={copyWebhook}
                className="inline-flex h-10 items-center gap-2 rounded-lg border border-[#d4d4d4] bg-white px-3 text-sm font-bold text-[#1a1a1a] hover:bg-[#f4f4f4]"
              >
                {copied ? <Check size={15} /> : <Copy size={15} />} {copied ? "Copied" : "Copy"}
              </button>
            </div>
            <p className="mt-1 text-xs text-[#a3a3a3]">Paste this into your provider as the inbound-message webhook URL. Required for WhatsApp chatbot replies.</p>
          </div>

          <div className="rounded-lg border border-[#d4d4d4] bg-white p-4">
            <p className="flex items-center gap-2 text-sm font-bold text-[#1a1a1a]">
              <Lightbulb size={15} className="text-[#1a1a1a]" /> Pro tip — use a WhatsApp Business number for unlimited messages
            </p>
            <p className="mt-1 text-sm text-[#525252]">
              Personal WhatsApp accounts have a soft daily send limit that kicks in once you are messaging many customers.{" "}
              <strong>WhatsApp Business</strong> accounts do not hit that wall — pair a Business number so your vouchers, payment confirmations and chatbot
              replies keep flowing at peak times. Upgrading your current number from Personal to Business is <strong>free</strong> inside the WhatsApp
              Business app — just install it, sign in with the same number, then pair it with your provider.
            </p>
          </div>

          <div className="grid gap-5 md:grid-cols-2">
            <label className="block">
              <span className="mb-1.5 block text-sm font-semibold text-[#525252]">API Key</span>
              <Secret id="wa-apikey" value={view.apiKey} onChange={(v) => edit({ apiKey: v })} />
              <span className="mt-1 block text-xs text-[#a3a3a3]">
                Bearer token from your WhatsApp provider's dashboard. Click elsewhere after entering — we auto-pick your first device.
              </span>
            </label>
            <label className="block">
              <span className="mb-1.5 block text-sm font-semibold text-[#525252]">Device</span>
              <select
                data-testid="wa-device"
                disabled={!keySaved}
                value={view.device}
                onChange={(e) => edit({ device: e.target.value })}
                className={`${input} disabled:bg-[#f4f4f4] disabled:text-[#a3a3a3]`}
              >
                {!keySaved ? <option value="">Save the API key first, then pick a device</option> : <option value={saved.device || "Primary device"}>{saved.device || "Primary device"}</option>}
              </select>
              <span className="mt-1 block text-xs text-[#a3a3a3]">Auto-selected after the API key is entered. Change if you have multiple devices.</span>
            </label>
          </div>

          <label className="block">
            <span className="mb-1.5 block text-sm font-semibold text-[#525252]">Webhook Signing Secret</span>
            <Secret id="wa-secret" value={view.signingSecret} onChange={(v) => edit({ signingSecret: v })} />
            <span className="mt-1 block text-xs text-[#a3a3a3]">
              Paste the signing secret your provider shows when you register the inbound webhook. Required for the chatbot.
            </span>
          </label>

          {errors.length > 0 && (
            <div data-testid="wa-errors" className="rounded-lg bg-[#f3f1ec] px-3 py-2 text-xs font-semibold text-[#1a1a1a]">
              {errors.map((e) => (
                <p key={e}>{e}</p>
              ))}
            </div>
          )}

          <button
            type="button"
            data-testid="wa-save"
            onClick={save}
            className="inline-flex h-11 items-center gap-2 rounded-lg bg-[#1a1a1a] px-5 text-sm font-bold text-white hover:bg-[#111111]"
          >
            <Check size={16} /> Save Credentials
          </button>
        </div>
      </section>

      {/* 3. Chatbot */}
      <section className={card}>
        <button type="button" onClick={() => setBotOpen((c) => !c)} className="flex w-full items-center justify-between gap-4 px-6 py-5 text-left" aria-expanded={botOpen}>
          <span>
            <span className="block text-lg font-bold text-[#1a1a1a]">WhatsApp Chatbot (Inbound)</span>
            <span className="block text-sm text-[#737373]">Let customers BUY vouchers, RENEW PPPoE, and check status by texting your your provider number.</span>
          </span>
          <ChevronDown size={18} className={`shrink-0 text-[#737373] transition-transform ${botOpen ? "rotate-180" : ""}`} />
        </button>
        {botOpen && (
          <div data-testid="wa-chatbot" className="space-y-5 border-t border-[#e6e6e6] p-6">
            <div>
              <div className="flex items-center gap-3">
                <Toggle checked={view.chatbotEnabled} onChange={() => edit({ chatbotEnabled: !view.chatbotEnabled })} />
                <span className="text-sm font-bold text-[#1a1a1a]">Enable WhatsApp chatbot</span>
              </div>
              <p className="mt-2 text-xs text-[#737373]">
                Off by default. When off, inbound messages are ignored and nothing is sent. The webhook URL is in WhatsApp Provider Settings above.
              </p>
            </div>
            <div>
              <p className="mb-2 text-sm font-bold text-[#1a1a1a]">Supported commands</p>
              <div className="flex flex-wrap gap-2">
                {CHATBOT_COMMANDS.map((c) => (
                  <code key={c} className="rounded-md bg-[#f4f4f4] px-2.5 py-1 font-mono text-xs font-bold text-[#1a1a1a]">
                    {c}
                  </code>
                ))}
              </div>
            </div>
          </div>
        )}
      </section>

      {dirty && (
        <div
          data-testid="wa-unsaved"
          className="fixed bottom-6 left-1/2 z-40 flex w-[min(92vw,34rem)] -translate-x-1/2 items-center justify-between gap-4 rounded-xl border border-[#d4d4d4] bg-white px-5 py-3 shadow-lg"
        >
          <div>
            <p className="text-sm font-bold text-[#1a1a1a]">Unsaved changes</p>
            <p className="text-xs text-[#737373]">Save before leaving this page.</p>
          </div>
          <div className="flex gap-2">
            <button
              type="button"
              data-testid="wa-discard"
              onClick={() => {
                setDraft(null);
                setErrors([]);
              }}
              className="inline-flex h-10 items-center gap-2 rounded-lg border border-[#d4d4d4] bg-white px-4 text-sm font-bold text-[#525252] hover:bg-[#f4f4f4]"
            >
              <RotateCcw size={14} /> Discard
            </button>
            <button
              type="button"
              data-testid="wa-bar-save"
              onClick={save}
              className="inline-flex h-10 items-center gap-2 rounded-lg bg-[#1a1a1a] px-4 text-sm font-bold text-white hover:bg-[#111111]"
            >
              <Check size={14} /> Save
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
