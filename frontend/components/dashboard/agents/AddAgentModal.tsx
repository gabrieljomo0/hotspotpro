"use client";

// The "Add agent" window: everything needed to give someone their own agent
// account. They're active straight away, with a temporary password you hand
// to them (shown once, after you add them).

import { useState } from "react";
import { Copy } from "lucide-react";

import { agentLoginLink } from "./agentLink";
import { useDashboard } from "../context/DashboardContext";
import type { AgentProfile, AgentRole } from "../shared/types";
import { validateNewAgent, type NewAgentInput } from "./agentSignup";
import { ModalFrame } from "./detail/ModalFrame";

const ROLES: AgentRole[] = ["Field Agent", "Sub-Agent", "Associate Admin", "Manager", "Viewer"];

export function AddAgentModal({ onClose }: { onClose: () => void }) {
  const { agents, routers, maxAgentCommissionPercent, createAgentByAdmin, showToast } = useDashboard();

  const [draft, setDraft] = useState<NewAgentInput>({
    name: "",
    email: "",
    username: "",
    phone: "",
    whatsapp: "",
    location: "",
    role: "Field Agent",
    routerIp: routers[0]?.ip ?? null,
    commissionPercent: String(Math.min(5, maxAgentCommissionPercent)),
    password: "",
  });
  const [submitted, setSubmitted] = useState(false);
  const [usernameTouched, setUsernameTouched] = useState(false);
  const [created, setCreated] = useState<{ agent: AgentProfile; password: string } | null>(null);

  const errors = validateNewAgent(draft, agents, maxAgentCommissionPercent);
  const show = (field: keyof typeof errors) => (submitted ? errors[field] : undefined);

  function set<K extends keyof NewAgentInput>(key: K, value: NewAgentInput[K]) {
    setDraft((current) => ({ ...current, [key]: value }));
  }

  // Suggests a username from the email until they type one themselves.
  function changeEmail(value: string) {
    setDraft((current) => ({
      ...current,
      email: value,
      username: usernameTouched ? current.username : value.split("@")[0].toLowerCase().replace(/[^a-z0-9._-]/g, ""),
    }));
  }

  function handleSubmit(event: React.FormEvent) {
    event.preventDefault();
    setSubmitted(true);
    if (Object.keys(errors).length > 0) return;
    const result = createAgentByAdmin(draft);
    if (result.ok) setCreated({ agent: result.agent, password: result.password });
  }

  async function copyLogin() {
    if (!created) return;
    const text = `Sign in at ${agentLoginLink(window.location.origin, created.agent.id)}\nEmail: ${created.agent.email}\nUsername: ${created.agent.username}\nTemporary password: ${created.password}`;
    try {
      await navigator.clipboard.writeText(text);
      showToast("Login details copied.");
    } catch {
      showToast("Couldn't copy automatically — select and copy the details shown.");
    }
  }

  const field = (bad: boolean) =>
    `h-11 w-full rounded-xl border bg-white px-3.5 text-sm outline-none focus:border-[#2563eb] ${bad ? "border-red-400" : "border-[#e2e8f0]"}`;
  const err = (message?: string) =>
    message ? <span className="mt-1 block text-xs font-semibold text-red-600">{message}</span> : null;

  if (created) {
    return (
      <ModalFrame title="Agent added" subtitle={`${created.agent.name} is active and can sign in now`} onClose={onClose} testId="add-agent-done">
        <div className="space-y-4">
          <div data-testid="new-agent-credentials" className="space-y-1.5 rounded-xl border border-emerald-200 bg-white px-5 py-4 text-sm text-[#475569]">
            <p>
              <span className="text-[#64748b]">Sign in at </span>
              <strong className="font-mono">/login</strong>
            </p>
            <p>
              <span className="text-[#64748b]">Email: </span>
              <strong>{created.agent.email}</strong>
            </p>
            <p>
              <span className="text-[#64748b]">Username: </span>
              <strong className="font-mono">{created.agent.username}</strong>
            </p>
            <p>
              <span className="text-[#64748b]">Temporary password: </span>
              <strong className="font-mono" data-testid="temporary-password">
                {created.password}
              </strong>
            </p>
          </div>
          <p className="text-xs text-[#94a3b8]">
            This is the only time the password is shown. Give it to {created.agent.name} — they sign in with their
            email and this password.
          </p>
          <div className="flex gap-3">
            <button type="button" onClick={copyLogin} className="inline-flex items-center gap-2 rounded-xl bg-[#2563eb] px-5 py-3 text-sm font-bold text-white hover:bg-[#1d4ed8]">
              <Copy size={15} />
              Copy login details
            </button>
            <button type="button" onClick={onClose} className="rounded-xl border border-[#e2e8f0] bg-white px-5 py-3 text-sm font-semibold text-[#475569] hover:bg-[#ffffff]">
              Done
            </button>
          </div>
        </div>
      </ModalFrame>
    );
  }

  return (
    <ModalFrame title="Add agent" subtitle="Give someone their own agent account" onClose={onClose} widthClass="max-w-2xl" testId="add-agent-modal">
      <form onSubmit={handleSubmit} className="space-y-4" noValidate>
        <div className="grid gap-4 sm:grid-cols-2">
          <label className="block">
            <span className="mb-1.5 block text-sm font-semibold text-[#475569]">Full name <span className="text-red-500">*</span></span>
            <input autoFocus value={draft.name} onChange={(e) => set("name", e.target.value)} placeholder="e.g. Grace Owusu" aria-label="Full name" className={field(!!show("name"))} />
            {err(show("name"))}
          </label>
          <label className="block">
            <span className="mb-1.5 block text-sm font-semibold text-[#475569]">Email (Gmail) <span className="text-red-500">*</span></span>
            <input type="email" value={draft.email} onChange={(e) => changeEmail(e.target.value)} placeholder="agent@gmail.com" aria-label="Email" className={field(!!show("email"))} />
            {err(show("email"))}
          </label>
          <label className="block">
            <span className="mb-1.5 block text-sm font-semibold text-[#475569]">Username <span className="text-red-500">*</span></span>
            <input
              value={draft.username}
              onChange={(e) => {
                setUsernameTouched(true);
                set("username", e.target.value);
              }}
              placeholder="e.g. grace.sells"
              aria-label="Username"
              className={field(!!show("username"))}
            />
            {err(show("username"))}
          </label>
          <label className="block">
            <span className="mb-1.5 block text-sm font-semibold text-[#475569]">Phone number <span className="text-red-500">*</span></span>
            <input value={draft.phone} onChange={(e) => set("phone", e.target.value)} placeholder="055 123 4567" aria-label="Phone number" className={field(!!show("phone"))} />
            {err(show("phone"))}
          </label>
          <label className="block">
            <span className="mb-1.5 block text-sm font-semibold text-[#475569]">WhatsApp number</span>
            <input value={draft.whatsapp} onChange={(e) => set("whatsapp", e.target.value)} placeholder="Optional" aria-label="WhatsApp number" className={field(!!show("whatsapp"))} />
            {err(show("whatsapp"))}
          </label>
          <label className="block">
            <span className="mb-1.5 block text-sm font-semibold text-[#475569]">Location</span>
            <input value={draft.location} onChange={(e) => set("location", e.target.value)} placeholder="Optional" aria-label="Location" className={field(false)} />
          </label>
          <label className="block">
            <span className="mb-1.5 block text-sm font-semibold text-[#475569]">Role</span>
            <select value={draft.role} onChange={(e) => set("role", e.target.value as AgentRole)} aria-label="Role" className={field(false)}>
              {ROLES.map((role) => (
                <option key={role} value={role}>{role}</option>
              ))}
            </select>
          </label>
          <label className="block">
            <span className="mb-1.5 block text-sm font-semibold text-[#475569]">Assigned router</span>
            <select value={draft.routerIp ?? ""} onChange={(e) => set("routerIp", e.target.value || null)} aria-label="Assigned router" className={field(false)}>
              <option value="">No router yet</option>
              {routers.map((router) => (
                <option key={router.ip} value={router.ip}>{router.name.split(" (")[0]}</option>
              ))}
            </select>
          </label>
          <label className="block">
            <span className="mb-1.5 block text-sm font-semibold text-[#475569]">Commission rate (%)</span>
            <input value={draft.commissionPercent} onChange={(e) => set("commissionPercent", e.target.value)} inputMode="decimal" aria-label="Commission rate" className={field(!!show("commissionPercent"))} />
            {err(show("commissionPercent")) ?? <span className="mt-1 block text-xs text-[#94a3b8]">Platform maximum: {maxAgentCommissionPercent}%</span>}
          </label>
          <label className="block">
            <span className="mb-1.5 block text-sm font-semibold text-[#475569]">Temporary password</span>
            <input value={draft.password} onChange={(e) => set("password", e.target.value)} placeholder="Leave blank to make one" aria-label="Temporary password" className={field(!!show("password"))} />
            {err(show("password"))}
          </label>
        </div>

        <div className="flex gap-3 pt-2">
          <button type="submit" className="rounded-xl bg-[#2563eb] px-7 py-3 text-sm font-bold text-white hover:bg-[#1d4ed8]">
            Add agent
          </button>
          <button type="button" onClick={onClose} className="rounded-xl border border-[#e2e8f0] bg-white px-5 py-3 text-sm font-semibold text-[#475569] hover:bg-[#ffffff]">
            Cancel
          </button>
        </div>
      </form>
    </ModalFrame>
  );
}
