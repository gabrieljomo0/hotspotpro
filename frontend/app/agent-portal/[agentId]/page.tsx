"use client";

// This is the entry point for an agent's own dashboard (reached at
// /agent-portal/[agentId]). Its job is just to: load the agent, check
// they're allowed to be here, and hand off to AgentPortalBody for the
// actual layout (shared with the no-agent-required preview at
// /agent-portal/preview).

import { use } from "react";
import { LockKeyhole } from "lucide-react";

import { useDashboard } from "@/components/dashboard/context/DashboardContext";
import { NotFoundCard } from "@/components/dashboard/shared/ActionPageLayout";
import { accessBlockedMessage, agentDashboardOff, AGENT_DASHBOARD_OFF_MESSAGE } from "@/components/dashboard/agents/agentSettings";
import { AgentPortalBody } from "@/components/agent-portal/AgentPortalBody";
import { useActAsAgent } from "@/components/agent-portal/useActAsAgent";

function AgentPortalInner({ agentId }: { agentId: string }) {
  const { findAgent } = useDashboard();
  const agent = findAgent(agentId);

  // Everything in this tab acts as this agent while their dashboard is open
  // (and only while their access is on).
  useActAsAgent(agent && agent.status === "Active" ? agent.id : null);

  // No agent found with this ID — show a friendly "not found" message.
  if (!agent) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-[#f8fafc] p-6">
        <NotFoundCard
          message="This agent may have been removed."
          backHref="/login"
        />
      </div>
    );
  }

  // Agent exists, but the admin hasn't (or no longer) allows them access.
  if (agent.status !== "Active" || agentDashboardOff(agent)) {
    const reason = agent.status === "Active" ? AGENT_DASHBOARD_OFF_MESSAGE : accessBlockedMessage(agent.status);

    return (
      <div className="flex min-h-screen items-center justify-center bg-[#f1f5f9] p-6">
        <div className="w-full max-w-sm rounded-2xl bg-white p-8 text-center shadow-sm">
          <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-[#f1f5f9] text-[#2563eb]">
            <LockKeyhole size={22} />
          </div>
          <h1 className="mb-2 text-lg font-bold text-[#0f172a]">Access Restricted</h1>
          <p className="text-sm text-[#64748b]">{reason}</p>
          <p className="mt-4 text-xs text-[#94a3b8]">
            {agent.status === "Pending"
              ? "You'll be able to sign in once admin approves your application."
              : "Contact admin to reactivate your access to this portal."}
          </p>
        </div>
      </div>
    );
  }

  return <AgentPortalBody agent={agent} />;
}

export default function AgentPortalPage({
  params,
}: {
  params: Promise<{ agentId: string }>;
}) {
  const { agentId } = use(params);
  return <AgentPortalInner agentId={agentId} />;
}
