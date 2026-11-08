"use client";

// Settings → Domain. The business's own web address (https://name.<base>),
// used for the WiFi login page and the customer self-service pages.
// Changing it is a 3-step pop-up: choose → verify by email code → done.

import { useMemo, useState } from "react";
import { Check, Clock, Copy, ExternalLink, Globe, Pencil, Send, ShieldCheck, Store, Ticket, Users, Wifi } from "lucide-react";

import { useDashboard } from "../context/DashboardContext";
import { usePersistedState } from "../context/usePersistedState";
import { ModalFrame } from "../agents/detail/ModalFrame";

export const BASE_DOMAIN = "hotspotpro.com";
const RESERVED = ["www", "admin", "api", "app", "mail", "portal", "support", "hotspotpro", "login", "billing"];
const CODE_MINUTES = 10;

type DomainState = {
  subdomain: string;
  changedAt: string | null;
  history: { subdomain: string; changedAt: string; retiredAt: string }[];
};

export function cleanAddress(raw: string) {
  return raw.toLowerCase().replace(/\s+/g, "-").replace(/[^a-z0-9-]/g, "");
}

export function addressProblem(value: string, current: string): string | null {
  if (!value) return "Type the name you want.";
  if (value.length < 3) return "Use at least 3 characters.";
  if (value.length > 30) return "Use 30 characters or fewer.";
  if (value.startsWith("-") || value.endsWith("-")) return "Cannot start or end with a hyphen.";
  if (RESERVED.includes(value)) return `"${value}" is reserved. Pick another name.`;
  if (value === current) return "This is already your address.";
  return null;
}

const nowLabel = () => new Date().toLocaleString("en-GB", { day: "2-digit", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit" });

// Shared by every page that needs the business's current web address.
export function useDomainState() {
  const { sitesSettings } = useDashboard();
  const startName = sitesSettings.currentSiteDomain.split(".")[0] || "mybusiness";
  return usePersistedState<DomainState>("domainSettings", {
    subdomain: startName,
    changedAt: null,
    history: [],
  });
}

export function useBusinessAddress() {
  const [state] = useDomainState();
  return `https://${state.subdomain}.${BASE_DOMAIN}`;
}

export function DomainSettingsPanel() {
  const { routers, showToast, logActivity } = useDashboard();
  const [state, setState] = useDomainState();
  const [open, setOpen] = useState(false);
  const [copiedKey, setCopiedKey] = useState("");

  const address = `https://${state.subdomain}.${BASE_DOMAIN}`;
  const uses = useMemo(
    () => [
      { key: "wifi", icon: Wifi, label: "WiFi login page", note: "What customers see when they join your WiFi", path: "" },
      { key: "buy", icon: Ticket, label: "Buy a voucher", note: "Customers pay and receive a code", path: "/portal" },
      { key: "agent", icon: Users, label: "Agent sign-in", note: "Where your agents open their dashboard", path: "/login" },
      { key: "shop", icon: Store, label: "Self-service pages", note: "Check usage, top up, get support", path: "/portal" },
    ],
    [],
  );

  function copy(key: string, text: string) {
    navigator.clipboard?.writeText(text).catch(() => {});
    setCopiedKey(key);
    window.setTimeout(() => setCopiedKey(""), 1500);
  }

  function applyChange(next: string) {
    const stamp = nowLabel();
    setState((current) => ({
      subdomain: next,
      changedAt: stamp,
      history: [{ subdomain: current.subdomain, changedAt: current.changedAt ?? "Original address", retiredAt: stamp }, ...current.history].slice(0, 10),
    }));
    showToast(`Your address is now https://${next}.${BASE_DOMAIN}`);
    logActivity("Settings", `Changed the business address to ${next}.${BASE_DOMAIN}.`);
  }

  return (
    <div data-testid="domain-panel" className="space-y-6">
      {/* Address strip */}
      <section className="overflow-hidden rounded-2xl bg-white">
        <div className="flex flex-wrap items-center justify-between gap-3 bg-[#1a1a1a] px-6 py-4">
          <div className="flex items-center gap-2 text-white">
            <Globe size={18} />
            <span className="text-sm font-bold tracking-wide">YOUR BUSINESS ADDRESS</span>
          </div>
          <span className="inline-flex items-center gap-2 rounded-md bg-[#1a1a1a] px-2.5 py-1 text-xs font-bold text-white">
            <span className="h-1.5 w-1.5 rounded-full bg-white" /> Live
          </span>
        </div>
        <div className="grid gap-6 p-6 lg:grid-cols-[1fr_auto] lg:items-center">
          <div className="min-w-0">
            <p data-testid="current-address" className="break-all font-mono text-2xl font-bold text-[#1a1a1a] md:text-3xl">
              <span className="text-[#a3a3a3]">https://</span>
              {state.subdomain}
              <span className="text-[#1a1a1a]">.{BASE_DOMAIN}</span>
            </p>
            <p className="mt-2 text-sm text-[#737373]">
              Customers type this into their browser to reach your WiFi portal and self-service pages.
              {state.changedAt ? ` Changed ${state.changedAt}.` : ""}
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              data-testid="copy-address"
              onClick={() => copy("main", address)}
              className="inline-flex h-11 items-center gap-2 rounded-lg border border-[#d4d4d4] bg-white px-4 text-sm font-bold text-[#1a1a1a] hover:bg-[#f4f4f4]"
            >
              {copiedKey === "main" ? <Check size={15} /> : <Copy size={15} />}
              {copiedKey === "main" ? "Copied" : "Copy"}
            </button>
            <button
              type="button"
              data-testid="change-address"
              onClick={() => setOpen(true)}
              className="inline-flex h-11 items-center gap-2 rounded-lg bg-[#1a1a1a] px-4 text-sm font-bold text-white hover:bg-[#111111]"
            >
              <Pencil size={15} /> Change address
            </button>
          </div>
        </div>
      </section>

      <div className="grid gap-6 lg:grid-cols-[3fr_2fr]">
        {/* Where it is used */}
        <section className="rounded-2xl bg-white p-6">
          <h3 className="text-base font-bold text-[#1a1a1a]">Where customers use this address</h3>
          <p className="mb-4 text-sm text-[#737373]">Every link below follows your address automatically.</p>
          <ul className="divide-y divide-[#e6e6e6]">
            {uses.map((row) => {
              const Icon = row.icon;
              const url = `${address}${row.path}`;
              return (
                <li key={row.key} data-testid={`use-${row.key}`} className="flex items-center gap-3 py-3">
                  <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-[#f4f4f4] text-[#1a1a1a]">
                    <Icon size={17} />
                  </span>
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-bold text-[#1a1a1a]">{row.label}</p>
                    <p className="truncate font-mono text-xs text-[#737373]">{url}</p>
                  </div>
                  <button
                    type="button"
                    aria-label={`Copy ${row.label} link`}
                    onClick={() => copy(row.key, url)}
                    className="flex h-8 w-8 items-center justify-center rounded-md text-[#525252] hover:bg-[#f4f4f4]"
                  >
                    {copiedKey === row.key ? <Check size={15} /> : <Copy size={15} />}
                  </button>
                  <a
                    href={url}
                    target="_blank"
                    rel="noreferrer"
                    aria-label={`Open ${row.label}`}
                    className="flex h-8 w-8 items-center justify-center rounded-md text-[#525252] hover:bg-[#f4f4f4]"
                  >
                    <ExternalLink size={15} />
                  </a>
                </li>
              );
            })}
          </ul>
        </section>

        {/* Safety + history */}
        <div className="space-y-6">
          <section className="rounded-2xl bg-white p-6">
            <div className="mb-2 flex items-center gap-2 text-[#1a1a1a]">
              <ShieldCheck size={18} className="text-[#1a1a1a]" />
              <h3 className="text-base font-bold">Changing it is safe</h3>
            </div>
            <ul className="space-y-2 text-sm text-[#525252]">
              <li>• You confirm with a code sent to your email.</li>
              <li>• Your old address keeps working while routers refresh.</li>
              <li>
                • {routers.length} {routers.length === 1 ? "router" : "routers"} will update on their own.
              </li>
            </ul>
          </section>

          <section className="rounded-2xl bg-white p-6">
            <div className="mb-3 flex items-center gap-2 text-[#1a1a1a]">
              <Clock size={18} className="text-[#1a1a1a]" />
              <h3 className="text-base font-bold">Address history</h3>
            </div>
            {state.history.length === 0 ? (
              <p data-testid="history-empty" className="text-sm text-[#a3a3a3]">
                You have not changed your address yet.
              </p>
            ) : (
              <ol data-testid="history-list" className="space-y-3 border-l-2 border-[#e6e6e6] pl-4">
                {state.history.map((item, index) => (
                  <li key={`${item.subdomain}-${index}`}>
                    <p className="font-mono text-sm font-bold text-[#1a1a1a]">
                      {item.subdomain}.{BASE_DOMAIN}
                    </p>
                    <p className="text-xs text-[#737373]">Used until {item.retiredAt}</p>
                  </li>
                ))}
              </ol>
            )}
          </section>
        </div>
      </div>

      {open && (
        <ChangeAddressModal
          current={state.subdomain}
          onClose={() => setOpen(false)}
          onConfirm={(next) => applyChange(next)}
        />
      )}
    </div>
  );
}

function ChangeAddressModal({
  current,
  onClose,
  onConfirm,
}: {
  current: string;
  onClose: () => void;
  onConfirm: (next: string) => void;
}) {
  const [step, setStep] = useState<1 | 2 | 3>(1);
  const [value, setValue] = useState("");
  const [sentCode, setSentCode] = useState<{ code: string; expires: number } | null>(null);
  const [typed, setTyped] = useState("");
  const [codeError, setCodeError] = useState("");
  const problem = addressProblem(value, current);

  function sendCode() {
    const code = String(Math.floor(100000 + Math.random() * 900000));
    setSentCode({ code, expires: Date.now() + CODE_MINUTES * 60_000 });
    setTyped("");
    setCodeError("");
  }

  function confirm() {
    if (!sentCode) return setCodeError("Send the verification code first.");
    if (Date.now() > sentCode.expires) return setCodeError("That code has expired. Send a new one.");
    if (typed.trim() !== sentCode.code) return setCodeError("That code is not right. Check it and try again.");
    onConfirm(value);
    setStep(3);
  }

  const steps = ["Choose", "Verify", "Done"];

  return (
    <ModalFrame title="Change your address" subtitle="Pick a new name for your business address" onClose={onClose} widthClass="max-w-lg" testId="change-address-modal">
      <ol className="mb-5 grid grid-cols-3 gap-2">
        {steps.map((label, index) => {
          const n = index + 1;
          const done = step > n;
          const active = step === n;
          return (
            <li key={label} className="flex items-center gap-2">
              <span
                className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-xs font-bold ${
                  done || active ? "bg-[#1a1a1a] text-white" : "bg-[#e6e6e6] text-[#737373]"
                }`}
              >
                {done ? <Check size={14} /> : n}
              </span>
              <span className={`text-xs font-bold ${active ? "text-[#1a1a1a]" : "text-[#a3a3a3]"}`}>{label}</span>
            </li>
          );
        })}
      </ol>

      {step === 1 && (
        <div className="space-y-4">
          <label className="block">
            <span className="mb-1.5 block text-sm font-semibold text-[#525252]">
              New address <span className="text-red-500">*</span>
            </span>
            <div className="flex h-12 items-center rounded-lg border border-[#d4d4d4] bg-white focus-within:border-[#1a1a1a]">
              <span className="pl-3 text-sm text-[#a3a3a3]">https://</span>
              <input
                data-testid="new-address"
                value={value}
                onChange={(event) => setValue(cleanAddress(event.target.value))}
                placeholder="your-name"
                autoFocus
                className="h-full min-w-0 flex-1 bg-transparent px-1 text-sm font-semibold text-[#1a1a1a] outline-none"
              />
              <span className="pr-3 text-sm text-[#1a1a1a]">.{BASE_DOMAIN}</span>
            </div>
            <span className="mt-1 block text-xs text-[#a3a3a3]">Spaces become hyphens. Other symbols are removed as you type.</span>
          </label>

          <div className="rounded-lg bg-[#f4f4f4] p-3">
            <p className="text-xs font-semibold text-[#737373]">Preview</p>
            <p data-testid="address-preview" className="break-all font-mono text-sm font-bold text-[#1a1a1a]">
              https://{value || "your-name"}.{BASE_DOMAIN}
            </p>
          </div>
          {value && problem && (
            <p data-testid="address-problem" className="rounded-lg bg-[#f3f1ec] px-3 py-2 text-xs font-semibold text-[#1a1a1a]">
              {problem}
            </p>
          )}

          <div className="flex justify-end gap-2">
            <button type="button" onClick={onClose} className="h-10 rounded-lg border border-[#d4d4d4] bg-white px-4 text-sm font-bold text-[#525252] hover:bg-[#f4f4f4]">
              Cancel
            </button>
            <button
              type="button"
              data-testid="address-next"
              disabled={!!problem}
              onClick={() => {
                setStep(2);
                sendCode();
              }}
              className="h-10 rounded-lg bg-[#1a1a1a] px-5 text-sm font-bold text-white hover:bg-[#111111] disabled:cursor-not-allowed disabled:opacity-50"
            >
              Continue
            </button>
          </div>
        </div>
      )}

      {step === 2 && (
        <div className="space-y-4">
          <div className="rounded-lg bg-[#f4f4f4] p-3">
            <p className="text-xs text-[#737373]">Changing to</p>
            <p className="break-all font-mono text-sm font-bold text-[#1a1a1a]">
              https://{value}.{BASE_DOMAIN}
            </p>
          </div>
          <div className="rounded-lg border border-[#e6e6e6] p-4">
            <div className="flex items-center gap-2 text-[#1a1a1a]">
              <ShieldCheck size={16} className="text-[#1a1a1a]" />
              <p className="text-sm font-bold">Email verification</p>
            </div>
            <p className="mt-1 text-xs text-[#737373]">We send a 6-digit code to your registered email. It is valid for {CODE_MINUTES} minutes.</p>
            {sentCode && (
              <p data-testid="demo-code" className="mt-3 rounded-md bg-[#f4f4f4] px-3 py-2 text-xs text-[#525252]">
                Demo mode: no email is really sent. Your code is{" "}
                <span className="font-mono text-sm font-bold text-[#1a1a1a]">{sentCode.code}</span>
              </p>
            )}
            <button
              type="button"
              data-testid="send-code"
              onClick={sendCode}
              className="mt-3 inline-flex h-9 items-center gap-2 rounded-lg border border-[#d4d4d4] bg-white px-3 text-xs font-bold text-[#1a1a1a] hover:bg-[#f4f4f4]"
            >
              <Send size={13} /> {sentCode ? "Send a new code" : "Send code"}
            </button>
          </div>
          <label className="block">
            <span className="mb-1.5 block text-sm font-semibold text-[#525252]">
              Verification code <span className="text-red-500">*</span>
            </span>
            <input
              data-testid="code-input"
              value={typed}
              onChange={(event) => {
                setTyped(event.target.value.replace(/\D/g, "").slice(0, 6));
                setCodeError("");
              }}
              inputMode="numeric"
              placeholder="Enter 6-digit code"
              className="h-11 w-full rounded-lg border border-[#d4d4d4] bg-white px-3 text-sm tracking-widest text-[#1a1a1a] outline-none focus:border-[#1a1a1a]"
            />
          </label>
          {codeError && (
            <p data-testid="code-error" className="rounded-lg bg-[#f3f1ec] px-3 py-2 text-xs font-semibold text-[#1a1a1a]">
              {codeError}
            </p>
          )}
          <div className="flex justify-between gap-2">
            <button type="button" onClick={() => setStep(1)} className="h-10 rounded-lg border border-[#d4d4d4] bg-white px-4 text-sm font-bold text-[#525252] hover:bg-[#f4f4f4]">
              Back
            </button>
            <button
              type="button"
              data-testid="confirm-change"
              disabled={typed.length !== 6}
              onClick={confirm}
              className="h-10 rounded-lg bg-[#1a1a1a] px-5 text-sm font-bold text-white hover:bg-[#111111] disabled:cursor-not-allowed disabled:opacity-50"
            >
              Confirm change
            </button>
          </div>
        </div>
      )}

      {step === 3 && (
        <div data-testid="change-done" className="space-y-4 text-center">
          <span className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-[#1a1a1a] text-white">
            <Check size={26} />
          </span>
          <div>
            <p className="text-base font-bold text-[#1a1a1a]">Your address has changed</p>
            <p className="mt-1 break-all font-mono text-sm font-bold text-[#1a1a1a]">
              https://{value}.{BASE_DOMAIN}
            </p>
            <p className="mt-2 text-xs text-[#737373]">New links use this address. Your routers refresh on their own, and your old address keeps working meanwhile.</p>
          </div>
          <button type="button" data-testid="done-close" onClick={onClose} className="h-10 rounded-lg bg-[#1a1a1a] px-6 text-sm font-bold text-white hover:bg-[#111111]">
            Done
          </button>
        </div>
      )}
    </ModalFrame>
  );
}
