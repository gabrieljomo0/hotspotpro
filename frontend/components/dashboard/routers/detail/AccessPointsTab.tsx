"use client";

// This router's Access Points tab: which agents/resellers are assigned to
// work from this specific router.
import Link from "next/link";
import { UserCog } from "lucide-react";

import type { AgentProfile } from "@/components/dashboard/shared/types";

export function AccessPointsTab({ assignedAgents }: { assignedAgents: AgentProfile[] }) {
  return (
    <article data-testid="assigned-agents" className="rounded-2xl border border-[#d4d4d4] bg-white p-5 shadow-[0_8px_24px_rgba(26,26,26,0.06)]">
      <p className="mb-3 flex items-center gap-2 text-sm font-bold text-[#1a1a1a]">
        <UserCog size={16} className="text-[#1a1a1a]" />
        Agents Working From This Router ({assignedAgents.length})
      </p>
      {assignedAgents.length === 0 ? (
        <p className="text-sm text-[#a3a3a3]">No agents assigned yet.</p>
      ) : (
        <div className="space-y-2">
          {assignedAgents.map((agent) => (
            <Link key={agent.id} href={`/dashboards/agents/${encodeURIComponent(agent.id)}`} data-testid="assigned-agent-link" className="flex items-center justify-between rounded-lg bg-[#ffffff] px-4 py-2.5 text-sm hover:bg-[#f4f4f4]">
              <span className="font-semibold text-[#1a1a1a]">
                {agent.name}
                {agent.isDefault && (
                  <span className="ml-2 rounded-full bg-[#f4f4f4] px-2 py-0.5 text-[10px] font-bold text-[#1a1a1a]">
                    Default agent
                  </span>
                )}
              </span>
              <span className="text-xs text-[#737373]">{agent.role}</span>
            </Link>
          ))}
        </div>
      )}
    </article>
  );
}
