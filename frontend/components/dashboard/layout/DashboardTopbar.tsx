"use client";

// The admin dashboard's top bar: search, dark mode toggle, notifications,
// and the admin's own profile menu (which links to Account settings and
// logout). The Shop button is still shown here on purpose, but its
// destination page (/dashboards/shop) was deliberately removed — clicking
// it 404s intentionally, not a bug.

import { useState, useRef } from "react";
import Link from "next/link";
import {
  Bell,
  ChevronDown,
  LayoutDashboard,
  LogOut,
  Menu,
  Search,
  Settings,
  ShoppingBag,
  UserCircle2,
  Users2,
} from "lucide-react";

import { useDashboard } from "../context/DashboardContext";
import { DashboardScopeFilter } from "../overview/DashboardScopeFilter";
import { DropdownMenuPortal } from "../shared/DropdownMenuPortal";
import { purgeLocalCache } from "@/components/dashboard/context/localCache";

export function DashboardTopbar({
  onOpenMobile,
}: {
  onOpenMobile: () => void;
}) {
  const { currentAgent, getAdminAlerts, markAlertRead } = useDashboard();
  const [profileOpen, setProfileOpen] = useState(false);
  const [alertsMenuOpen, setAlertsMenuOpen] = useState(false);
  const [alertsMenuRect, setAlertsMenuRect] = useState<DOMRect | null>(null);
  const alertsCloseTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  function openAlertsMenu(target: HTMLElement) {
    if (alertsCloseTimer.current) clearTimeout(alertsCloseTimer.current);
    setAlertsMenuRect(target.getBoundingClientRect());
    setAlertsMenuOpen(true);
  }

  function scheduleCloseAlertsMenu() {
    if (alertsCloseTimer.current) clearTimeout(alertsCloseTimer.current);
    alertsCloseTimer.current = setTimeout(() => setAlertsMenuOpen(false), 150);
  }

  function cancelCloseAlertsMenu() {
    if (alertsCloseTimer.current) clearTimeout(alertsCloseTimer.current);
  }
  const adminAlerts = getAdminAlerts();
  const unreadAdminAlerts = adminAlerts.filter((alert) => !alert.read);

  async function handleLogout() {
    try {
      await fetch("/api/auth/logout", { method: "POST" });
    } catch {
      // proceed to login regardless
    }
    // Full reload so nothing from this session stays in memory.
    purgeLocalCache();
    window.location.assign("/login");
  }

  const initials = currentAgent.name
    .split(" ")
    .map((part) => part[0])
    .slice(0, 2)
    .join("")
    .toUpperCase();

  return (
    <header className="sticky top-0 z-30 flex h-20 items-center border-b border-[#e2e8f0] bg-white px-4 transition-colors   md:px-6">
      <button
        type="button"
        onClick={onOpenMobile}
        className="mr-3 rounded-xl p-2.5 text-[#475569] transition hover:bg-[#f1f5f9]   lg:hidden"
        aria-label="Open sidebar"
      >
        <Menu size={24} />
      </button>

      <div className="relative hidden w-full max-w-md md:block">
        <Search
          size={19}
          className="absolute left-4 top-1/2 -translate-y-1/2 text-[#94a3b8]"
        />

        <input
          type="search"
          placeholder="Search users, routers or transactions..."
          className="h-12 w-full rounded-xl border border-[#e2e8f0] bg-[#ffffff] pl-12 pr-20 text-sm text-[#1f4732] outline-none transition focus:border-[#2563eb] focus:bg-white focus:ring-4 focus:ring-blue-100    "
        />

        <span className="absolute right-3 top-1/2 -translate-y-1/2 rounded-md border border-[#e2e8f0] bg-white px-2 py-1 text-xs text-[#64748b]   ">
          CTRL + K
        </span>
      </div>

      <div className="ml-auto flex items-center gap-3">
        <Link
          href="/dashboards/shop"
          className="flex items-center gap-2 rounded-xl border border-[#e2e8f0] bg-white px-4 py-3 text-sm font-semibold text-[#475569] transition hover:bg-[#ffffff]"
          title="WemaMart"
        >
          <ShoppingBag size={19} className="text-[#2563eb]" />
          <span>Shop</span>
        </Link>

        {/* Filter the dashboard by site, router or agent */}
        <div className="hidden lg:block">
          <DashboardScopeFilter />
        </div>

        <div
          className="relative"
          onMouseEnter={(event) => openAlertsMenu(event.currentTarget)}
          onMouseLeave={scheduleCloseAlertsMenu}
        >
          <button
            type="button"
            onClick={(event) => {
              setAlertsMenuRect((event.currentTarget as HTMLElement).getBoundingClientRect());
              setAlertsMenuOpen((current) => !current);
            }}
            className="relative rounded-xl p-3 text-[#475569] transition hover:bg-[#f1f5f9]  "
            aria-label="Notifications"
          >
            <Bell size={22} />

            {unreadAdminAlerts.length > 0 && (
              <span className="absolute right-1 top-1 flex h-5 min-w-5 items-center justify-center rounded-full bg-red-500 px-1 text-xs font-bold text-white">
                {unreadAdminAlerts.length}
              </span>
            )}
          </button>

          {alertsMenuOpen && (
            <DropdownMenuPortal
              anchorRect={alertsMenuRect}
              onClose={() => setAlertsMenuOpen(false)}
              width={320}
              onMouseEnter={cancelCloseAlertsMenu}
              onMouseLeave={scheduleCloseAlertsMenu}
            >
              <div className="flex items-center justify-between border-b border-[#f1f5f9] px-4 py-2.5">
                <span className="text-xs font-bold uppercase text-[#94a3b8]">Alerts</span>
                <Link href="/dashboards/settings/alerts" onClick={() => setAlertsMenuOpen(false)} className="text-xs font-semibold text-[#2563eb] hover:underline">
                  Configure
                </Link>
              </div>
              {adminAlerts.length === 0 ? (
                <p className="px-4 py-6 text-center text-xs text-[#94a3b8]">No alerts yet.</p>
              ) : (
                <div className="max-h-80 overflow-y-auto">
                  {adminAlerts.slice(0, 15).map((alert) => (
                    <button
                      key={alert.id}
                      type="button"
                      onClick={() => markAlertRead(alert.id)}
                      className={`block w-full border-b border-[#f1f5f9] px-4 py-2.5 text-left text-xs last:border-0 ${
                        alert.read ? "text-[#94a3b8]" : "font-semibold text-[#0f172a]"
                      } hover:bg-[#ffffff]`}
                    >
                      <p>{alert.message}</p>
                      <p className="mt-0.5 text-[10px] text-[#94a3b8]">{alert.timestamp}</p>
                    </button>
                  ))}
                </div>
              )}
            </DropdownMenuPortal>
          )}
        </div>

        <div
          className="relative"
          onMouseEnter={() => setProfileOpen(true)}
          onMouseLeave={() => setProfileOpen(false)}
        >
          <button
            type="button"
            onClick={() => setProfileOpen((current) => !current)}
            className="flex items-center gap-3 rounded-xl p-2 transition hover:bg-[#ffffff] "
          >
            <div className="flex h-11 w-11 items-center justify-center rounded-full bg-[#2563eb] text-sm font-bold text-white ring-2 ring-[#e2e8f0]">
              {initials || "AU"}
            </div>

            <div className="hidden text-left sm:block">
              <p className="text-sm font-semibold text-[#0f172a] ">
                {currentAgent.name}
              </p>

              <p className="mt-0.5 text-xs text-[#64748b] ">
                {currentAgent.role}
              </p>
            </div>

            <ChevronDown
              size={16}
              className="hidden text-[#64748b] sm:block"
            />
          </button>

          {profileOpen && (
            <>
              <button
                type="button"
                aria-label="Close profile menu"
                className="fixed inset-0 z-40 cursor-default"
                onClick={() => setProfileOpen(false)}
              />

              <div className="absolute right-0 top-16 z-50 w-56 overflow-hidden rounded-xl border border-[#e2e8f0] bg-white py-2 text-left shadow-2xl">
                <div className="px-4 py-2.5">
                  <p className="text-sm font-bold text-[#0f172a]">
                    {currentAgent.name}
                  </p>
                  <p className="text-xs text-[#64748b]">{currentAgent.email}</p>
                </div>

                <div className="my-1 border-t border-[#f1f5f9]" />

                <Link
                  href="/dashboards/account"
                  onClick={() => setProfileOpen(false)}
                  className="flex items-center gap-2 px-4 py-2.5 text-sm text-[#475569] hover:bg-[#f1f5f9]"
                >
                  <UserCircle2 size={16} />
                  Profile Settings
                </Link>
                <Link
                  href={`/agent-portal/${currentAgent.id}`}
                  onClick={() => setProfileOpen(false)}
                  className="flex items-center gap-2 px-4 py-2.5 text-sm text-[#475569] hover:bg-[#f1f5f9]"
                >
                  <LayoutDashboard size={16} />
                  My Agent Dashboard
                </Link>
                <Link
                  href="/dashboards/agents"
                  onClick={() => setProfileOpen(false)}
                  className="flex items-center gap-2 px-4 py-2.5 text-sm text-[#475569] hover:bg-[#f1f5f9]"
                >
                  <Users2 size={16} />
                  Switch Agent Profile
                </Link>
                <Link
                  href="/dashboards/settings"
                  onClick={() => setProfileOpen(false)}
                  className="flex items-center gap-2 px-4 py-2.5 text-sm text-[#475569] hover:bg-[#f1f5f9]"
                >
                  <Settings size={16} />
                  Business Settings
                </Link>

                <div className="my-1 border-t border-[#f1f5f9]" />

                <button
                  type="button"
                  onClick={handleLogout}
                  className="flex w-full items-center gap-2 px-4 py-2.5 text-sm font-semibold text-red-600 hover:bg-red-50"
                >
                  <LogOut size={16} />
                  Log Out
                </button>
              </div>
            </>
          )}
        </div>
      </div>
    </header>
  );
}
