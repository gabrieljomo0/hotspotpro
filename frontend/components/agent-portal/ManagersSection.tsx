"use client";

// Only shows up if the admin has granted this agent the
// "agentManagement.inviteManager" permission. Lets the agent see who they've
// already added, and invite a new manager (who then waits for admin
// approval, same as any other agent application).

import { useState, type FormEvent } from "react";
import { UsersRound, ShieldCheck } from "lucide-react";

import { useDashboard } from "@/components/dashboard/context/DashboardContext";
import { freeUsername } from "@/components/dashboard/agents/agentSignup";
import type { AgentProfile } from "@/components/dashboard/shared/types";

export function ManagersSection({ agent }: { agent: AgentProfile }) {
  const { agents, inviteManagerToSite, createAgentByAdmin, setAgentStatus } = useDashboard();
  const [inviteOpen, setInviteOpen] = useState(false);
  const [managerName, setManagerName] = useState("");
  const [managerEmail, setManagerEmail] = useState("");
  const [adminPhone, setAdminPhone] = useState("");
  const [adminError, setAdminError] = useState<string | null>(null);
  const [created, setCreated] = useState<{ name: string; username: string; password: string } | null>(null);

  // Admin hasn't granted this agent permission to add their own managers.
  if (agent.permissions["agentManagement.inviteManager"] !== "Allowed") return null;

  const myManagers = agents.filter((a) => a.assignedAdminId === agent.id);

  // The owner's own agent profile: people added here are admins who help run
  // this dashboard. You are the approver, so they're active straight away,
  // with a login you can hand to them.
  const isOwnerProfile = agent.isDefault;

  function handleAddAdmin(event: FormEvent) {
    event.preventDefault();
    const result = createAgentByAdmin({
      name: managerName,
      email: managerEmail,
      username: freeUsername(managerEmail.split("@")[0] ?? "", agents),
      phone: adminPhone,
      whatsapp: "",
      location: "",
      role: "Associate Admin",
      routerIp: agent.routerIp,
      commissionPercent: "0",
      password: "",
      assignedAdminId: agent.id,
    });
    if (!result.ok) {
      setAdminError(Object.values(result.errors)[0] ?? "Check the details and try again.");
      return;
    }
    setAdminError(null);
    setCreated({ name: result.agent.name, username: result.agent.username, password: result.password });
    setManagerName("");
    setManagerEmail("");
    setAdminPhone("");
    setInviteOpen(false);
  }

  function handleInvite(event: FormEvent) {
    event.preventDefault();
    if (!managerName.trim() || !managerEmail.trim()) return;
    inviteManagerToSite(agent.id, managerName.trim(), managerEmail.trim());
    setManagerName("");
    setManagerEmail("");
    setInviteOpen(false);
  }

  return (
    <article className="mt-5 rounded-2xl bg-white p-5 shadow-sm">
      <div className="mb-3 flex flex-wrap items-center justify-between gap-3">
        <div>
          <p className="flex items-center gap-2 text-sm font-bold text-[#0f172a]">
            <UsersRound size={15} className="text-[#2563eb]" />
            {isOwnerProfile ? "Admins" : "Your Managers"}
          </p>
          <p className="text-xs text-[#94a3b8]">
            {isOwnerProfile
              ? "People you've added to help manage this dashboard."
              : "People you've added to help run this site's day-to-day."}
          </p>
        </div>
        <button
          type="button"
          data-testid="add-admin-btn"
          onClick={() => setInviteOpen((current) => !current)}
          className="rounded-lg bg-[#2563eb] px-4 py-2 text-xs font-bold text-white hover:bg-[#1d4ed8]"
        >
          {isOwnerProfile ? "+ Add Admin" : "+ Invite Manager"}
        </button>
      </div>

      {myManagers.length === 0 ? (
        <p className="text-sm text-[#94a3b8]">{isOwnerProfile ? "No admins added yet." : "No managers added yet."}</p>
      ) : (
        <div className="space-y-2">
          {myManagers.map((manager) => (
            <div key={manager.id} className="flex items-center justify-between rounded-lg bg-[#f8fafc] px-3 py-2 text-sm">
              <span className="font-semibold text-[#0f172a]">
                {manager.name}
                <span className="ml-2 text-xs font-normal text-[#94a3b8]">{manager.email}</span>
              </span>
              <span className="flex items-center gap-2">
              {isOwnerProfile && manager.status !== "Pending" && (
                <button
                  type="button"
                  data-testid="toggle-admin"
                  onClick={() => setAgentStatus(manager.id, manager.status === "Active" ? "Suspended" : "Active")}
                  className="rounded-md px-2 py-0.5 text-[10px] font-semibold text-[#475569] hover:bg-[#f1f5f9]"
                >
                  {manager.status === "Active" ? "Suspend" : "Activate"}
                </button>
              )}
              <span
                className={`rounded-full px-2 py-0.5 text-[10px] font-bold ${ manager.status === "Active" ? "bg-[#f1f5f9] text-[#2563eb]" : manager.status === "Pending" ? "bg-[#f1f5f9] text-[#2563eb]" : "bg-slate-200 text-slate-700" }`}
              >
                {manager.status}
              </span>
              </span>
            </div>
          ))}
        </div>
      )}

      {created && (
        <div data-testid="admin-created" className="mt-4 rounded-xl bg-white p-4 text-sm text-[#2563eb]">
          <p className="flex items-center gap-2 font-bold">
            <ShieldCheck size={15} /> {created.name} is now an admin on this dashboard.
          </p>
          <p className="mt-1">
            Username: <strong>{created.username}</strong> · Temporary password: <strong>{created.password}</strong>
          </p>
          <p className="mt-1 text-xs">
            Give them these details — or send the welcome email prepared under Settings → SMS &amp; Email. Copy the password now; it isn&apos;t shown again.
          </p>
          <button type="button" onClick={() => setCreated(null)} className="mt-2 text-xs font-semibold underline">
            Done
          </button>
        </div>
      )}

      {inviteOpen && isOwnerProfile && (
        <form onSubmit={handleAddAdmin} data-testid="add-admin-form" className="mt-4 grid gap-3 rounded-xl bg-[#f8fafc] p-4 sm:grid-cols-2">
          <input required data-testid="admin-name" value={managerName} onChange={(e) => setManagerName(e.target.value)} placeholder="Admin's full name" className="h-10 rounded-lg border border-[#cbd5e1] bg-white px-3 text-sm outline-none focus:border-[#cbd5e1]" />
          <input required data-testid="admin-email" type="email" value={managerEmail} onChange={(e) => setManagerEmail(e.target.value)} placeholder="Admin's email" className="h-10 rounded-lg border border-[#cbd5e1] bg-white px-3 text-sm outline-none focus:border-[#cbd5e1]" />
          <input required data-testid="admin-phone" value={adminPhone} onChange={(e) => setAdminPhone(e.target.value)} placeholder="Phone number" className="h-10 rounded-lg border border-[#cbd5e1] bg-white px-3 text-sm outline-none focus:border-[#cbd5e1]" />
          <button type="submit" data-testid="admin-submit" className="h-10 rounded-lg bg-[#2563eb] text-xs font-bold text-white hover:bg-[#1d4ed8]">
            Add Admin
          </button>
          {adminError && <p data-testid="admin-error" className="text-sm font-semibold text-red-600 sm:col-span-2">{adminError}</p>}
          <p className="text-xs text-[#94a3b8] sm:col-span-2">
            They&apos;re active straight away as an Associate Admin, with a temporary password you hand to them. You can suspend them any time.
          </p>
        </form>
      )}

      {inviteOpen && !isOwnerProfile && (
        <form onSubmit={handleInvite} className="mt-4 grid gap-3 rounded-xl bg-[#f8fafc] p-4 sm:grid-cols-3">
          <input
            required
            value={managerName}
            onChange={(e) => setManagerName(e.target.value)}
            placeholder="Manager's full name"
            className="h-10 rounded-lg border border-[#cbd5e1] bg-white px-3 text-sm outline-none focus:border-[#cbd5e1]"
          />
          <input
            required
            type="email"
            value={managerEmail}
            onChange={(e) => setManagerEmail(e.target.value)}
            placeholder="Manager's email"
            className="h-10 rounded-lg border border-[#cbd5e1] bg-white px-3 text-sm outline-none focus:border-[#cbd5e1]"
          />
          <button type="submit" className="h-10 rounded-lg bg-[#2563eb] text-xs font-bold text-white hover:bg-[#1d4ed8]">
            Send Invite
          </button>
          <p className="text-xs text-[#94a3b8] sm:col-span-3">
            They&apos;ll be added as pending until your admin approves them.
          </p>
        </form>
      )}
    </article>
  );
}
