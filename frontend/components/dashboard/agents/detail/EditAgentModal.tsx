"use client";

// Edit an agent's basic details from their own page. Commission and wallet
// have their own tabs, so this stays to who the agent is.

import { useState } from "react";

import { useDashboard } from "../../context/DashboardContext";
import type { AgentProfile, AgentStatus } from "../../shared/types";
import { emailProblem, usernameProblem } from "../agentSignup";
import { ModalFrame } from "./ModalFrame";

const STATUSES: AgentStatus[] = ["Active", "Suspended", "Deactivated"];

export function EditAgentModal({ agent, onClose }: { agent: AgentProfile; onClose: () => void }) {
  const { updateAgentAdminDetails, setAgentStatus, updateAgentRouter, agents, routers } = useDashboard();
  const [name, setName] = useState(agent.name);
  const [email, setEmail] = useState(agent.email);
  const [username, setUsername] = useState(agent.username);
  const [routerIp, setRouterIp] = useState(agent.routerIp ?? "");
  const [phone, setPhone] = useState(agent.phone ?? "");
  const [location, setLocation] = useState(agent.location ?? "");
  const [status, setStatus] = useState<AgentStatus>(agent.status);
  const [submitted, setSubmitted] = useState(false);

  const nameError = name.trim() === "" ? "An agent needs a name." : null;
  const emailError = emailProblem(email, agents, agent.id);
  const usernameError = usernameProblem(username, agents, agent.id);
  const phoneDigits = phone.replace(/[^\d]/g, "");
  const phoneError = phone.trim() !== "" && (phoneDigits.length < 9 || phoneDigits.length > 15) ? "Enter a phone number with 9–15 digits." : null;
  const canChangeStatus = !agent.isDefault && agent.status !== "Pending";

  function handleSubmit(event: React.FormEvent) {
    event.preventDefault();
    setSubmitted(true);
    if (nameError || phoneError || emailError || usernameError) return;
    const saved = updateAgentAdminDetails(agent.id, { name, phone, location, notes: agent.notes ?? "", email, username });
    if (!saved) return;
    if (routerIp && routerIp !== (agent.routerIp ?? "")) updateAgentRouter(agent.id, routerIp);
    if (canChangeStatus && status !== agent.status) setAgentStatus(agent.id, status);
    onClose();
  }

  const field = (bad: boolean) =>
    `h-11 w-full rounded-xl border bg-white px-3.5 text-sm outline-none focus:border-[#2563eb] ${bad ? "border-red-400" : "border-[#e2e8f0]"}`;

  return (
    <ModalFrame title={`Edit ${agent.name}`} subtitle="Agent information" onClose={onClose} widthClass="max-w-xl" testId="edit-agent-modal">
      <form onSubmit={handleSubmit} className="space-y-4" noValidate>
        <label className="block">
          <span className="mb-1.5 block text-sm font-semibold text-[#475569]">
            Agent name <span className="text-red-500">*</span>
          </span>
          <input autoFocus value={name} onChange={(event) => setName(event.target.value)} aria-label="Agent name" className={field(submitted && !!nameError)} />
          {submitted && nameError && <span className="mt-1 block text-xs font-semibold text-red-600">{nameError}</span>}
        </label>
        <div className="grid gap-4 sm:grid-cols-2">
          <label className="block">
            <span className="mb-1.5 block text-sm font-semibold text-[#475569]">Email</span>
            <input value={email} onChange={(event) => setEmail(event.target.value)} aria-label="Email" className={field(submitted && !!emailError)} />
            {submitted && emailError && <span className="mt-1 block text-xs font-semibold text-red-600">{emailError}</span>}
          </label>
          <label className="block">
            <span className="mb-1.5 block text-sm font-semibold text-[#475569]">Username</span>
            <input value={username} onChange={(event) => setUsername(event.target.value)} aria-label="Username" className={field(submitted && !!usernameError)} />
            {submitted && usernameError && <span className="mt-1 block text-xs font-semibold text-red-600">{usernameError}</span>}
          </label>
        </div>
        <div className="grid gap-4 sm:grid-cols-2">
          <label className="block">
            <span className="mb-1.5 block text-sm font-semibold text-[#475569]">Phone</span>
            <input value={phone} onChange={(event) => setPhone(event.target.value)} aria-label="Phone" className={field(submitted && !!phoneError)} />
            {submitted && phoneError && <span className="mt-1 block text-xs font-semibold text-red-600">{phoneError}</span>}
          </label>
          <label className="block">
            <span className="mb-1.5 block text-sm font-semibold text-[#475569]">Location</span>
            <input value={location} onChange={(event) => setLocation(event.target.value)} aria-label="Location" className={field(false)} />
          </label>
        </div>
        <label className="block">
          <span className="mb-1.5 block text-sm font-semibold text-[#475569]">Assigned router</span>
          <select value={routerIp} onChange={(event) => setRouterIp(event.target.value)} aria-label="Assigned router" className={field(false)}>
            {!agent.routerIp && <option value="">No router yet</option>}
            {routers.map((router) => (
              <option key={router.ip} value={router.ip}>
                {router.name.split(" (")[0]}
              </option>
            ))}
          </select>
        </label>
        <label className="block">
          <span className="mb-1.5 block text-sm font-semibold text-[#475569]">Status</span>
          <select
            value={status}
            disabled={!canChangeStatus}
            onChange={(event) => setStatus(event.target.value as AgentStatus)}
            aria-label="Status"
            className={`${field(false)} disabled:bg-[#f1f5f9] disabled:text-[#94a3b8]`}
          >
            {(canChangeStatus ? STATUSES : [agent.status]).map((value) => (
              <option key={value} value={value}>
                {value}
              </option>
            ))}
          </select>
          {!canChangeStatus && (
            <span className="mt-1 block text-xs text-[#94a3b8]">
              {agent.isDefault ? "The owner profile is always active." : "Approve the application first to change status."}
            </span>
          )}
        </label>
        <p className="rounded-xl bg-[#f8fafc] px-4 py-3 text-xs text-[#64748b]">
          Commission rate, wallet and permissions have their own tabs on this page.
        </p>
        <div className="flex gap-3 pt-1">
          <button type="submit" className="rounded-xl bg-[#2563eb] px-6 py-3 text-sm font-bold text-white hover:bg-[#1d4ed8]">
            Save changes
          </button>
          <button type="button" onClick={onClose} className="rounded-xl border border-[#e2e8f0] bg-white px-5 py-3 text-sm font-semibold text-[#475569] hover:bg-[#ffffff]">
            Cancel
          </button>
        </div>
      </form>
    </ModalFrame>
  );
}
