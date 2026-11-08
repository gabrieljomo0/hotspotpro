"use client";

// The bar across the top of the agent portal: a search box, the router
// this agent was assigned by admin (one agent = one router, so it's a
// plain label, not a picker), a notifications bell, and the agent's own
// profile — click it for a dropdown with their details and quick actions.
// Nothing here leads to the admin dashboard.

import { sym } from "@/components/dashboard/shared/currency";
import { useEffect, useState } from "react";
import Link from "next/link";
import { Menu, Search, Bell, Router, ChevronDown, LayoutDashboard, Wallet, LogOut } from "lucide-react";

import { DropdownMenuPortal } from "@/components/dashboard/shared/DropdownMenuPortal";
import { settingsOf } from "@/components/dashboard/agents/agentSettings";
import { useDashboard } from "@/components/dashboard/context/DashboardContext";
import type { AgentProfile } from "@/components/dashboard/shared/types";
import { purgeLocalCache } from "@/components/dashboard/context/localCache";

export function Topbar({
  onOpenSidebar,
  agent,
  onOpenTopUp,
  agentId,
  agentName,
  agentInitials,
  agentRole,
  routerName,
  siteName,
}: {
  onOpenSidebar: () => void;
  // The agent whose dashboard this is — the profile dropdown shows their
  // own details, never anyone else's.
  agent: AgentProfile;
  onOpenTopUp: () => void;
  agentId: string;
  agentName: string;
  agentInitials: string;
  agentRole: string;
  // The one router admin assigned to this agent (null if none yet).
  routerName: string | null;
  siteName: string;
}) {
  const { getAgentAlerts, markAlertRead } = useDashboard();
  // This agent's own switches (set by admin on their Settings tab).
  const agentSettings = settingsOf(agent);
  const showRouter = agentSettings.allowViewAssignedRouters;
  const showCommission = agentSettings.allowViewSalesCommission;
  const [alertsMenuOpen, setAlertsMenuOpen] = useState(false);
  const [alertsMenuRect, setAlertsMenuRect] = useState<DOMRect | null>(null);
  const myAlerts = getAgentAlerts(agentId);
  const unreadMyAlerts = myAlerts.filter((alert) => !alert.read);

  const [profileOpen, setProfileOpen] = useState(false);
  const [profileRect, setProfileRect] = useState<DOMRect | null>(null);

  // Esc closes the profile menu, like any menu.
  useEffect(() => {
    if (!profileOpen) return;
    function onKey(event: KeyboardEvent) {
      if (event.key === "Escape") setProfileOpen(false);
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [profileOpen]);

  return (
    <header className="sticky top-0 z-30 flex h-16 items-center border-b bg-white px-4">
      <button
        type="button"
        onClick={onOpenSidebar}
        className="mr-3 rounded-lg p-2 hover:bg-[#f4f4f4] lg:hidden"
        aria-label="Open sidebar"
      >
        <Menu size={22} />
      </button>

      <div className="relative hidden w-full max-w-[330px] md:block">
        <Search size={17} className="absolute left-3 top-1/2 -translate-y-1/2 text-[#737373]" />
        <input
          type="search"
          placeholder="Search anything..."
          className="h-10 w-full rounded-lg border border-[#d4d4d4] bg-[#f7f7f7] pl-10 pr-20 text-sm outline-none focus:border-[#1a1a1a] "
        />
        <span className="absolute right-2 top-1/2 -translate-y-1/2 rounded bg-white px-2 py-1 text-[10px] text-[#737373] dark:border-slate-600">
          CTRL + K
        </span>
      </div>

      <div className="ml-auto flex items-center gap-3">
        {/* The router admin assigned to this agent — display only. Hidden
            when the organization has switched off "View assigned routers". */}
        {showRouter && (
          <div
            data-testid="topbar-router"
            className="hidden min-w-[190px] items-center gap-3 rounded-lg px-4 py-2 md:flex"
            title="The router your admin assigned to you"
          >
            <Router size={18} className="shrink-0 text-[#1a1a1a]" />
            <div className="min-w-0 text-left leading-tight">
              <p className="truncate text-sm font-semibold">{routerName ?? "No router assigned yet"}</p>
              <p className="truncate text-[10px] text-[#a3a3a3]">{siteName}</p>
            </div>
          </div>
        )}

        <div className="relative">
          <button
            type="button"
            onClick={(event) => {
              setAlertsMenuRect((event.currentTarget as HTMLElement).getBoundingClientRect());
              setAlertsMenuOpen((current) => !current);
            }}
            className="relative rounded-lg p-2 hover:bg-[#f4f4f4]"
            aria-label="Notifications"
          >
            <Bell size={20} />
            {unreadMyAlerts.length > 0 && (
              <span className="absolute right-0 top-0 flex h-4 min-w-4 items-center justify-center rounded-full bg-[#1a1a1a] px-1 text-[9px] font-bold text-white">
                {unreadMyAlerts.length}
              </span>
            )}
          </button>

          {alertsMenuOpen && (
            <DropdownMenuPortal anchorRect={alertsMenuRect} onClose={() => setAlertsMenuOpen(false)} width={300}>
              <div className="border-b border-[#f4f4f4] px-4 py-2.5 text-xs font-bold uppercase text-[#a3a3a3]">
                Alerts
              </div>
              {myAlerts.length === 0 ? (
                <p className="px-4 py-6 text-center text-xs text-[#a3a3a3]">No alerts yet.</p>
              ) : (
                <div className="max-h-80 overflow-y-auto">
                  {myAlerts.slice(0, 15).map((alert) => (
                    <button
                      key={alert.id}
                      type="button"
                      onClick={() => markAlertRead(alert.id)}
                      className={`block w-full border-b border-[#f4f4f4] px-4 py-2.5 text-left text-xs last:border-0 ${ alert.read ? "text-[#a3a3a3]" : "font-semibold text-[#1a1a1a]" } hover:bg-[#f7f7f7]`}
                    >
                      <p>{alert.message}</p>
                      <p className="mt-0.5 text-[10px] text-[#a3a3a3]">{alert.timestamp}</p>
                    </button>
                  ))}
                </div>
              )}
            </DropdownMenuPortal>
          )}
        </div>

        <div className="relative">
          <button
            type="button"
            aria-haspopup="menu"
            aria-expanded={profileOpen}
            aria-label="Open profile menu"
            onClick={(event) => {
              setProfileRect((event.currentTarget as HTMLElement).getBoundingClientRect());
              setProfileOpen((current) => !current);
            }}
            className={`flex items-center gap-3 rounded-lg p-1.5 transition hover:bg-[#f4f4f4] ${ profileOpen ? "bg-[#f4f4f4]" : "" }`}
          >
            <div className="flex h-9 w-9 items-center justify-center rounded-full bg-[#e6e6e6] font-bold text-[#1a1a1a]">
              {agentInitials}
            </div>
            <div className="hidden text-left sm:block">
              <p className="text-sm font-semibold">{agentName}</p>
              <p className="text-xs text-[#737373]">{agentRole}</p>
            </div>
            <ChevronDown
              size={16}
              className={`hidden text-[#737373] transition-transform sm:block ${profileOpen ? "rotate-180" : ""}`}
            />
          </button>

          {profileOpen && (
            <DropdownMenuPortal anchorRect={profileRect} onClose={() => setProfileOpen(false)} width={296}>
              <div role="menu" aria-label="Profile">
                <div className="flex items-center gap-3 border-b border-[#f4f4f4] bg-[#f7f7f7] px-4 py-4">
                  <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-[#e6e6e6] text-base font-bold text-[#1a1a1a]">
                    {agentInitials}
                  </div>
                  <div className="min-w-0">
                    <p className="truncate text-sm font-bold text-[#1a1a1a]" data-testid="profile-name">
                      {agentName}
                    </p>
                    <p className="truncate text-xs text-[#737373]" data-testid="profile-role">
                      {agentRole} · {agent.agentCode}
                    </p>
                    <p className="truncate text-xs text-[#a3a3a3]" data-testid="profile-email">
                      {agent.email}
                    </p>
                  </div>
                </div>

                <dl className="grid grid-cols-2 gap-x-4 gap-y-3 border-b border-[#f4f4f4] px-4 py-3.5 text-xs">
                  {showRouter && (
                    <div className="min-w-0">
                      <dt className="text-[#a3a3a3]">Router</dt>
                      <dd className="truncate font-semibold text-[#1a1a1a]" data-testid="profile-router">
                        {routerName ?? "Not assigned yet"}
                      </dd>
                    </div>
                  )}
                  <div className="min-w-0">
                    <dt className="text-[#a3a3a3]">Site</dt>
                    <dd className="truncate font-semibold text-[#1a1a1a]" data-testid="profile-site">
                      {siteName}
                    </dd>
                  </div>
                  <div>
                    <dt className="text-[#a3a3a3]">Wallet</dt>
                    <dd className="font-semibold text-[#1a1a1a]" data-testid="profile-wallet">
                      {sym()} {agent.walletBalance.toLocaleString()}
                    </dd>
                  </div>
                  {showCommission && (
                    <div>
                      <dt className="text-[#a3a3a3]">Commission</dt>
                      <dd className="font-semibold text-[#1a1a1a]" data-testid="profile-commission">
                        {agent.commissionRatePercent}%
                      </dd>
                    </div>
                  )}
                </dl>

                <div className="py-1.5">
                  <Link
                    href={`/agent-portal/${agentId}`}
                    role="menuitem"
                    onClick={() => setProfileOpen(false)}
                    className="flex items-center gap-2.5 px-4 py-2.5 text-sm text-[#525252] hover:bg-[#f4f4f4]"
                  >
                    <LayoutDashboard size={15} />
                    My dashboard
                  </Link>
                  {agent.allowWalletTopUp && (
                    <button
                      type="button"
                      role="menuitem"
                      onClick={() => {
                        setProfileOpen(false);
                        onOpenTopUp();
                      }}
                      className="flex w-full items-center gap-2.5 px-4 py-2.5 text-left text-sm text-[#525252] hover:bg-[#f4f4f4]"
                    >
                      <Wallet size={15} />
                      Fund wallet
                    </button>
                  )}
                </div>

                <div className="border-t border-[#f4f4f4] py-1.5">
                  <button
                    type="button"
                    role="menuitem"
                    onClick={async () => {
                      setProfileOpen(false);
                      try {
                        await fetch("/api/auth/logout", { method: "POST" });
                      } catch {
                        // go to the sign-in page regardless
                      }
                      purgeLocalCache();
                      window.location.assign("/login");
                    }}
                    className="flex w-full items-center gap-2.5 px-4 py-2.5 text-left text-sm font-semibold text-red-600 hover:bg-red-50"
                  >
                    <LogOut size={15} />
                    Sign out
                  </button>
                </div>
              </div>
            </DropdownMenuPortal>
          )}
        </div>
      </div>
    </header>
  );
}
