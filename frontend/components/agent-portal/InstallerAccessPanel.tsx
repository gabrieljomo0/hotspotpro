"use client";

// Shows up only if this agent's account was created by an installer
// dispatching a finished setup. Lets the agent see who has standing
// "support access" to their dashboard, and turn it on/off themselves —
// this never affects what the agent themselves can do.

import { LifeBuoy } from "lucide-react";

import { useDashboard } from "@/components/dashboard/context/DashboardContext";
import type { AgentProfile } from "@/components/dashboard/shared/types";

export function InstallerAccessPanel({ agent }: { agent: AgentProfile }) {
  const { installDispatches, installers, setInstallerSupportAccess } = useDashboard();

  const dispatch = installDispatches.find((d) => d.clientAgentId === agent.id);
  const installer = dispatch ? installers.find((i) => i.id === dispatch.installerId) : null;

  // No installer ever dispatched this account — nothing to show.
  if (!dispatch || !installer) return null;

  return (
    <article className="mt-5 flex flex-wrap items-center justify-between gap-3 rounded-2xl bg-white p-5 shadow-sm">
      <div className="flex items-center gap-3">
        <div className="flex h-11 w-11 items-center justify-center rounded-full bg-[#f4f4f4] text-[#1a1a1a]">
          <LifeBuoy size={18} />
        </div>
        <div>
          <p className="text-sm font-bold text-[#1a1a1a]">
            Installer Support Access: {installer.name}
          </p>
          <p className="text-xs text-[#737373]">
            {agent.allowAdminAccess
              ? "They can open your dashboard to help troubleshoot. This never limits what you can do here yourself."
              : "They can no longer open your dashboard. Turn this back on anytime if you want their help again."}
          </p>
        </div>
      </div>
      <button
        type="button"
        onClick={() => setInstallerSupportAccess(agent.id, !agent.allowAdminAccess)}
        className={`relative h-6 w-11 shrink-0 rounded-full transition ${ agent.allowAdminAccess ? "bg-[#1a1a1a]" : "bg-[#e6e6e6]" }`}
      >
        <span
          className={`absolute top-0.5 h-5 w-5 rounded-full bg-white shadow transition-transform ${ agent.allowAdminAccess ? "translate-x-5" : "translate-x-0.5" }`}
        />
      </button>
    </article>
  );
}
