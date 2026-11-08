"use client";

import { useState, type ReactNode } from "react";
import { LockKeyhole } from "lucide-react";

import { useDashboard } from "@/components/dashboard/context/DashboardContext";
import { NotFoundCard } from "@/components/dashboard/shared/ActionPageLayout";
import type { AgentProfile } from "@/components/dashboard/shared/types";

import { Sidebar } from "./Sidebar";
import { Topbar } from "./Topbar";
import { useActAsAgent } from "./useActAsAgent";
import { TopUpWalletModal } from "./TopUpWalletModal";
import {
  accessBlockedMessage,
  agentDashboardOff,
  AGENT_DASHBOARD_OFF_MESSAGE,
  applyAgentRestrictions,
} from "@/components/dashboard/agents/agentSettings";

export function AccessRestricted({ agent }: { agent: AgentProfile }) {
  const reason =
    agent.status === "Active" && agentDashboardOff(agent) ? AGENT_DASHBOARD_OFF_MESSAGE : accessBlockedMessage(agent.status);

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

// The actual sidebar/topbar/top-up-modal shell shared by the main
// dashboard and every sub-page (Users, Sales, Vouchers, Packages,
// Reports) — so all of them look and behave consistently.
function Shell({ agent, children }: { agent: AgentProfile; children: ReactNode }) {
  const { routers, businessLocations } = useDashboard();
  const [mobileOpen, setMobileOpen] = useState(false);
  const [desktopCollapsed, setDesktopCollapsed] = useState(false);
  const [topUpOpen, setTopUpOpen] = useState(false);

  const initials = agent.name
    .split(" ")
    .map((part) => part[0])
    .slice(0, 2)
    .join("")
    .toUpperCase();

  const assignedRouter = routers.find((r) => r.ip === agent.routerIp);
  const site = assignedRouter?.siteId ? businessLocations.find((s) => s.id === assignedRouter.siteId) : null;
  const siteName = site?.name ?? assignedRouter?.name ?? "This Business";
  const routerName = assignedRouter ? assignedRouter.name.split(" (")[0] : null;

  return (
    <div className="min-h-screen bg-[#f1f5f9] text-[#0f172a]">
      <div className="flex">
        <Sidebar
          agent={agent}
          mobileOpen={mobileOpen}
          desktopCollapsed={desktopCollapsed}
          onClose={() => setMobileOpen(false)}
          onToggleDesktop={() => setDesktopCollapsed((current) => !current)}
          onOpenTopUp={() => setTopUpOpen(true)}
        />

        <div className="min-w-0 flex-1">
          <Topbar
            onOpenSidebar={() => setMobileOpen(true)}
            agent={agent}
            onOpenTopUp={() => setTopUpOpen(true)}
            agentId={agent.id}
            agentName={agent.name}
            agentInitials={initials}
            agentRole={agent.role}
            routerName={routerName}
            siteName={siteName}
          />

          <main className="p-4 md:p-6">{children}</main>
        </div>
      </div>

      {topUpOpen && <TopUpWalletModal agent={agent} onClose={() => setTopUpOpen(false)} />}
    </div>
  );
}

export function AgentPortalPage({
  agentId,
  permissionKey,
  featureLabel,
  render,
}: {
  agentId: string;
  // If set, the page's content is hidden behind a "not enabled for your
  // account" notice unless the agent's own permissions allow it — same
  // rule as the main dashboard's sections.
  permissionKey?: string;
  featureLabel?: string;
  render: (agent: AgentProfile) => ReactNode;
}) {
  const { findAgent } = useDashboard();
  const storedAgent = findAgent(agentId);

  // Everything in this tab acts as this agent while their dashboard is open
  // (and only while their access is on).
  useActAsAgent(storedAgent && storedAgent.status === "Active" ? storedAgent.id : null);

  if (!storedAgent) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-[#f8fafc] p-6">
        <NotFoundCard message="This agent may have been removed." backHref="/login" />
      </div>
    );
  }

  if (storedAgent.status !== "Active" || agentDashboardOff(storedAgent)) {
    return <AccessRestricted agent={storedAgent} />;
  }

  // What this agent can actually do: their own permissions, minus anything
  // you have switched off for them in their Settings.
  const agent = applyAgentRestrictions(storedAgent);

  if (permissionKey && agent.permissions[permissionKey] !== "Allowed") {
    return (
      <Shell agent={agent}>
        <div className="flex items-center gap-3 rounded-2xl bg-white p-6 text-sm text-[#94a3b8]">
          <LockKeyhole size={16} />
          {featureLabel ?? "This section"} isn&apos;t enabled for your account. Ask your admin to turn it on if you
          need it.
        </div>
      </Shell>
    );
  }

  return <Shell agent={agent}>{render(agent)}</Shell>;
}
