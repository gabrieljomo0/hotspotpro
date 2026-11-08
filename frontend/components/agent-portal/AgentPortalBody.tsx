"use client";

// The actual visual layout of the agent dashboard — sidebar, topbar,
// summary cards, tables and charts. Pulled out of app/agent-portal/[agentId]/
// so the exact same rendering can be reused for a real agent (looked up by
// ID) and for a static, no-agent-required preview an installer/admin can
// open before anyone's actually been dispatched.

import { sym } from "@/components/dashboard/shared/currency";
import { useState } from "react";
import { Lock } from "lucide-react";

import { useDashboard } from "@/components/dashboard/context/DashboardContext";
import type { AgentProfile } from "@/components/dashboard/shared/types";

import { Sidebar } from "@/components/agent-portal/Sidebar";
import { SalesOverview } from "@/components/agent-portal/SalesOverview";
import { defaultPeriod, type RevenuePeriod } from "@/components/dashboard/agents/directory/revenuePeriod";
import { ResaleRuleBanner } from "@/components/agent-portal/ResaleRuleBanner";
import { Topbar } from "@/components/agent-portal/Topbar";
import { SummaryCards } from "@/components/agent-portal/SummaryCards";
import { LiveUsersTable } from "@/components/agent-portal/LiveUsersTable";
import { ConnectionActivity } from "@/components/agent-portal/ConnectionActivity";
import { UsersByStatus } from "@/components/agent-portal/UsersByStatus";
import { DataUsageOverview } from "@/components/agent-portal/DataUsageOverview";
import { TopUsers } from "@/components/agent-portal/TopUsers";
import { RecentEvents } from "@/components/agent-portal/RecentEvents";
import { InstallerAccessPanel } from "@/components/agent-portal/InstallerAccessPanel";
import { ManagersSection } from "@/components/agent-portal/ManagersSection";
import { AdminVouchersSection } from "@/components/agent-portal/AdminVouchersSection";
import { TopUpWalletModal } from "@/components/agent-portal/TopUpWalletModal";
import { getScopedUsers } from "@/components/agent-portal/realData";
import { applyAgentRestrictions, settingsOf } from "@/components/dashboard/agents/agentSettings";
import { Wallet as WalletIcon } from "lucide-react";

// A small "locked" placeholder shown in place of a section the agent's
// own admin hasn't given them permission to see — so what's visible here
// always tracks what's actually been allowed on the admin side.
function RestrictedNotice({ label }: { label: string }) {
  return (
    <div className="flex items-center gap-3 rounded-2xl bg-white p-6 text-sm text-[#94a3b8]">
      <Lock size={16} />
      {label} isn&apos;t enabled for your account. Ask your admin to turn it on if you need it.
    </div>
  );
}

export function AgentPortalBody({ agent: storedAgent }: { agent: AgentProfile }) {
  const { routers, businessLocations, users, voucherBatches } = useDashboard();

  // What this agent can actually do: their own permissions, minus anything
  // you have switched off for them in their Settings.
  const agent = applyAgentRestrictions(storedAgent);
  const agentSettings = settingsOf(storedAgent);
  const showRouterName = agentSettings.allowViewAssignedRouters;
  const showCommission = agentSettings.allowViewSalesCommission;

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

  // Real data, scoped to this agent's own router — never sample data, and
  // never another agent's site. This is what makes the dashboard an
  // actual reflection of what the admin has set up, not a static demo.
  const scopedUsers = getScopedUsers(users, routers, agent.routerIp);
  const recentBatches = voucherBatches.filter(
    (b) =>
      b.agentId === agent.id ||
      (agent.permissions["voucher.viewAssignedByAdmin"] === "Allowed" && b.assignedAgentIds.includes(agent.id)),
  );

  // Permission-gated visibility — exactly what the admin has allowed for
  // this agent's role/custom permissions, nothing more.
  const canViewUsers = agent.permissions["users.view"] === "Allowed";
  const canViewSessions = agent.permissions["users.viewSessions"] === "Allowed";
  const canSeeSales = agent.permissions["sales.viewOwn"] === "Allowed";
  const [salesPeriod, setSalesPeriod] = useState<RevenuePeriod>(() => defaultPeriod());
  const canViewReports = agent.permissions["reports.view"] === "Allowed";

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

          <main className="p-4 md:p-6">
            <ResaleRuleBanner agent={agent} />

            <div className="mb-5 flex flex-col justify-between gap-4 lg:flex-row lg:items-center">
              <div>
                <h1 className="text-2xl font-black md:text-3xl">
                  Welcome back, {agent.name.split(" ")[0]}! 👋
                </h1>
                <p className="mt-2 text-sm text-[#64748b]">
                  {agent.agentCode} · {agent.role} · {agent.status}
                </p>
              </div>

              <div className="flex flex-wrap gap-3">
                <div className="rounded-xl bg-white px-4 py-2.5">
                  <p className="text-[10px] text-[#64748b]">Wallet</p>
                  <div className="flex items-center gap-2">
                    <p className="text-sm font-black text-[#0f172a]">
                      {sym()} {agent.walletBalance.toLocaleString()}
                    </p>
                    {agent.allowWalletTopUp && (
                      <button
                        type="button"
                        onClick={() => setTopUpOpen(true)}
                        className="inline-flex items-center gap-1 rounded-full bg-[#2563eb] px-2 py-0.5 text-[10px] font-bold text-white hover:bg-[#1d4ed8]"
                      >
                        <WalletIcon size={10} />
                        Top Up
                      </button>
                    )}
                  </div>
                </div>
                {showCommission && (
                  <div
                    data-testid="commission-earned-card"
                    className="rounded-xl bg-white px-4 py-2.5"
                  >
                    <p className="text-[10px] text-[#64748b]">Commission Earned</p>
                    <p className="text-sm font-black text-[#0f172a]">
                      {sym()} {agent.earnedCommission.toLocaleString()}
                    </p>
                  </div>
                )}
              </div>
            </div>

            <SummaryCards
              scopedUsers={scopedUsers}
              router={assignedRouter}
              showRouterName={showRouterName}
              salesCard={
                canSeeSales ? <SalesOverview agent={agent} period={salesPeriod} onPeriodChange={setSalesPeriod} /> : null
              }
            />

            {/* All three of these render nothing (return null) unless they
                apply to this specific agent — safe to always include. */}
            <InstallerAccessPanel agent={agent} />
            <ManagersSection agent={agent} />
            <AdminVouchersSection agent={agent} />

            <section className="mt-5 grid gap-5 2xl:grid-cols-[1.8fr_0.9fr]">
              {canViewSessions ? (
                <LiveUsersTable scopedUsers={scopedUsers} agent={agent} />
              ) : (
                <RestrictedNotice label="Live user sessions" />
              )}
              {canViewSessions ? (
                <ConnectionActivity scopedUsers={scopedUsers} routerIp={agent.routerIp} />
              ) : (
                <RestrictedNotice label="Connection activity" />
              )}
            </section>

            <section className="mt-5 grid gap-5 md:grid-cols-2 2xl:grid-cols-[1fr_1.05fr_0.9fr_1.15fr]">
              {canViewUsers ? <UsersByStatus scopedUsers={scopedUsers} /> : <RestrictedNotice label="Users by status" />}
              {canViewReports ? <DataUsageOverview scopedUsers={scopedUsers} /> : <RestrictedNotice label="Data usage reports" />}
              {canViewUsers ? <TopUsers scopedUsers={scopedUsers} /> : <RestrictedNotice label="Top users" />}
              <RecentEvents scopedUsers={scopedUsers} recentBatches={recentBatches} />
            </section>

            <p className="mt-6 text-xs italic text-[#94a3b8]">
              Live data for {siteName}
              {assignedRouter && showRouterName ? ` · ${assignedRouter.name.split(" (")[0]}` : ""} — reflects what&apos;s actually
              set up on the admin dashboard right now.
            </p>

            <footer className="mt-8 flex flex-col justify-between gap-3 border-t py-5 text-xs text-[#64748b] sm:flex-row">
              <p>Signed in as {agent.name} ({agent.role})</p>
              <p>HotspotPro Billing System © 2026</p>
            </footer>
          </main>
        </div>
      </div>

      {topUpOpen && <TopUpWalletModal agent={agent} onClose={() => setTopUpOpen(false)} />}
    </div>
  );
}
