"use client";

// The admin dashboard's left sidebar. Renders the navigation groups from
// navigationGroups in dashboard-data.ts, highlights whichever link matches
// the current page, and can collapse to icon-only. This is the admin
// equivalent of components/agent-portal/Sidebar.tsx (that one is for the
// separate agent/reseller portal, not this admin dashboard).

import Link from "next/link";
import { Fragment, useState } from "react";

import {
  ChevronDown,
  Banknote,
  Menu,
  Moon,
  Router,
  Settings,
  ShoppingCart,
  Sun,
  UserPlus,
  Wifi,
} from "lucide-react";

import { navigationGroups } from "../data/dashboard-data";
import { useDashboard } from "../context/DashboardContext";

export function DashboardSidebar({
  mobileOpen,
  collapsed,
  darkMode,
  onCloseMobile,
  onToggleCollapse,
  onToggleTheme,
}: {
  mobileOpen: boolean;
  collapsed: boolean;
  darkMode: boolean;
  onCloseMobile: () => void;
  onToggleCollapse: () => void;
  onToggleTheme: () => void;
}) {
  // Agent applications waiting for a decision — shown as a badge on Agents.
  const { approvalRequests } = useDashboard();
  const waitingApplications = approvalRequests.filter(
    (request) =>
      request.type === "New Agent" && (request.status === "Pending" || request.status === "Under Review"),
  ).length;

  const [openMenus, setOpenMenus] = useState<Record<string, boolean>>({
    Revenue: false,
    Marketing: false,
    Configuration: false,
    Installers: false,
    Settings: false,
  });

  function toggleMenu(menu: string) {
    setOpenMenus((current) => ({
      ...current,
      [menu]: !current[menu],
    }));
  }

  return (
    <>
      {mobileOpen && (
        <button
          type="button"
          aria-label="Close navigation overlay"
          onClick={onCloseMobile}
          className="fixed inset-0 z-40 bg-slate-950/60 lg:hidden"
        />
      )}

      <aside
        className={`fixed inset-y-0 left-0 z-50 h-screen overflow-y-auto overflow-x-hidden border-r border-[#d4d4d4] bg-[#f4f4f4] text-[#1a1a1a] shadow-[6px_0_24px_rgba(26,26,26,0.05)] transition-all duration-300 lg:sticky lg:top-0 ${
          mobileOpen ? "translate-x-0" : "-translate-x-full"
        } ${collapsed ? "w-[82px]" : "w-[270px]"} lg:translate-x-0`}
      >
        <div className="relative min-h-full">
          <div
            className={`flex h-20 items-center border-b border-[#d4d4d4] ${
              collapsed ? "justify-center px-3" : "justify-between px-5"
            }`}
          >
            {!collapsed && (
              <div className="flex min-w-0 items-center gap-3 overflow-hidden">
                <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-white text-[#1a1a1a]">
                  <Wifi size={26} strokeWidth={3} />
                </div>

                <div className="min-w-0 whitespace-nowrap">
                  <h1 className="truncate text-xl font-bold leading-tight">
                    HotspotPro
                  </h1>
                  <p className="mt-1 text-xs text-[#737373]">
                    Billing System
                  </p>
                </div>
              </div>
            )}

            <button
              type="button"
              onClick={() => {
                if (window.innerWidth < 1024) {
                  onCloseMobile();
                } else {
                  onToggleCollapse();
                }
              }}
              className={`flex shrink-0 items-center justify-center bg-transparent p-0 text-[#525252] transition hover:text-[#1a1a1a] focus:outline-none ${
                collapsed ? "h-11 w-11" : "h-10 w-10"
              }`}
              aria-label={collapsed ? "Show sidebar" : "Hide sidebar"}
              title={collapsed ? "Show sidebar" : "Hide sidebar"}
            >
              <Menu size={collapsed ? 28 : 25} strokeWidth={2.4} />
            </button>
          </div>

          <div className="px-3 py-5">
            {navigationGroups.map((group) => {
              const isMain = group.title === "Main";
              const isOpen = openMenus[group.title] ?? false;

              const groupIcon =
                group.title === "Revenue"
                    ? Banknote
                    : group.title === "Marketing"
                      ? ShoppingCart
                      : group.title === "Configuration"
                        ? Router
                        : group.title === "Installers"
                          ? UserPlus
                          : Settings;

              const GroupIcon = groupIcon;

              if (isMain) {
                return (
                  <section key={group.title} className="mb-2">
                    {!collapsed && (
                      <p className="mb-2 px-3 text-xs font-semibold uppercase tracking-[0.16em] text-[#a3a3a3]">
                        Main
                      </p>
                    )}

                    {collapsed && (
                      <div className="mb-3 border-t border-[#d4d4d4]" />
                    )}

                    <div className="space-y-1.5">
                      {group.items.map((item) => {
                        const Icon = item.icon;

                        const itemClass = `flex w-full items-center rounded-xl text-left text-sm transition-all duration-200 ${
                          collapsed
                            ? "justify-center px-2 py-3"
                            : "gap-3 px-3 py-3"
                        } ${
                          item.active
                            ? "bg-white font-bold text-[#111111] shadow-sm ring-1 ring-[#d4d4d4]"
                            : "text-[#525252] hover:bg-[#e6e6e6] hover:text-[#1a1a1a]"
                        }`;

                        const showBadge = item.href === "/dashboards/agents" && waitingApplications > 0;

                        const content = (
                          <>
                            <span className="relative shrink-0">
                              <Icon size={19} />
                              {showBadge && collapsed && (
                                <span
                                  data-testid="sidebar-agents-dot"
                                  className="absolute -right-1 -top-1 h-2.5 w-2.5 rounded-full bg-amber-500"
                                />
                              )}
                            </span>
                            {!collapsed && (
                              <span className="truncate">{item.label}</span>
                            )}
                            {!collapsed && showBadge && (
                              <span
                                data-testid="sidebar-agents-badge"
                                title={`${waitingApplications} agent application${waitingApplications === 1 ? "" : "s"} waiting`}
                                className="ml-auto rounded-full bg-amber-500 px-2 py-0.5 text-[10px] font-bold text-white"
                              >
                                {waitingApplications}
                              </span>
                            )}
                          </>
                        );

                        const control = item.href ? (
                          <Link
                            href={item.href}
                            title={collapsed ? item.label : undefined}
                            className={itemClass}
                          >
                            {content}
                          </Link>
                        ) : (
                          <button
                            type="button"
                            title={collapsed ? item.label : undefined}
                            className={itemClass}
                          >
                            {content}
                          </button>
                        );

                        return (
                          <Fragment key={item.label}>
                            {control}
                            {item.dividerAfter && (
                              <div
                                role="separator"
                                className={`mt-4 border-t border-[#d4d4d4] ${collapsed ? "mx-1" : "mx-2"}`}
                              />
                            )}
                          </Fragment>
                        );
                      })}
                    </div>
                  </section>
                );
              }

              return (
                <Fragment key={group.title}>
                <section className="mb-2">
                  <button
                    type="button"
                    onClick={() => toggleMenu(group.title)}
                    title={collapsed ? group.title : undefined}
                    aria-expanded={isOpen}
                    className={`flex w-full items-center rounded-xl text-left text-sm font-semibold text-[#525252] transition hover:bg-[#e6e6e6] hover:text-[#1a1a1a] ${
                      collapsed
                        ? "justify-center px-2 py-3"
                        : "gap-3 px-3 py-3"
                    }`}
                  >
                    <GroupIcon size={19} className="shrink-0" />

                    {!collapsed && (
                      <>
                        <span className="flex-1">{group.title}</span>
                        <ChevronDown
                          size={17}
                          className={`transition-transform duration-200 ${
                            isOpen ? "rotate-180" : ""
                          }`}
                        />
                      </>
                    )}
                  </button>

                  {isOpen && (
                    <div
                      className={`space-y-1 ${
                        collapsed
                          ? "mt-1"
                          : "ml-5 border-l border-[#d4d4d4] pl-3"
                      }`}
                    >
                      {group.items.map((item) => {
                        const Icon = item.icon;

                        const submenuClass = `flex w-full items-center rounded-lg text-left text-sm text-[#737373] transition hover:bg-white hover:text-[#1a1a1a] ${
                          collapsed
                            ? "justify-center px-2 py-2.5"
                            : "gap-3 px-3 py-2.5"
                        }`;

                        const content = (
                          <>
                            <Icon size={17} className="shrink-0" />
                            {!collapsed && (
                              <span className="truncate">{item.label}</span>
                            )}
                          </>
                        );

                        return item.href ? (
                          <Link
                            key={item.label}
                            href={item.href}
                            title={collapsed ? item.label : undefined}
                            className={submenuClass}
                          >
                            {content}
                          </Link>
                        ) : (
                          <button
                            type="button"
                            key={item.label}
                            title={collapsed ? item.label : undefined}
                            className={submenuClass}
                          >
                            {content}
                          </button>
                        );
                      })}
                    </div>
                  )}
                </section>
                {group.dividerAfter && (
                  <div
                    role="separator"
                    className={`mb-5 mt-4 border-t border-[#d4d4d4] ${collapsed ? "mx-1" : "mx-2"}`}
                  />
                )}
                </Fragment>
              );
            })}

            <section className="mt-4 border-t border-[#d4d4d4] pt-5">
              <div
                className={`rounded-xl border border-[#d4d4d4] bg-white ${
                  collapsed ? "p-2" : "p-4"
                }`}
              >
                <div
                  className={`flex items-center ${
                    collapsed ? "justify-center" : "justify-between gap-3"
                  }`}
                >
                  {!collapsed && (
                    <div>
                      <p className="text-sm font-semibold">Theme</p>
                      <p className="mt-1 text-xs text-[#a3a3a3]">
                        {darkMode ? "Dark mode" : "Light mode"}
                      </p>
                    </div>
                  )}

                  <button
                    type="button"
                    onClick={onToggleTheme}
                    className={`relative h-8 w-14 shrink-0 rounded-full transition-all duration-300 ${
                      darkMode ? "bg-[#1a1a1a]" : "bg-[#d4d4d4]"
                    }`}
                    aria-label="Toggle light and dark theme"
                  >
                    <span
                      className={`absolute top-1 flex h-6 w-6 items-center justify-center rounded-full bg-white shadow-md transition-all duration-300 ${
                        darkMode ? "translate-x-7" : "translate-x-1"
                      }`}
                    >
                      {darkMode ? (
                        <Moon size={13} className="text-[#1a1a1a]" />
                      ) : (
                        <Sun size={13} className="text-[#1a1a1a]" />
                      )}
                    </span>
                  </button>
                </div>
              </div>
            </section>

            {!collapsed && (
              <section className="mt-4 rounded-xl border border-[#d4d4d4] bg-white p-4">
                <p className="text-base font-semibold">Need Help?</p>

                <p className="mt-2 text-sm leading-6 text-[#737373]">
                  Our support team is ready to assist you anytime.
                </p>

                <button
                  type="button"
                  className="mt-4 w-full rounded-lg bg-[#1a1a1a] px-4 py-3 text-sm font-bold text-white transition hover:bg-[#111111]"
                >
                  Contact Support
                </button>
              </section>
            )}

            {!collapsed && (
              <div className="px-2 py-5 text-xs text-[#a3a3a3]">
                <p>© 2026 HotspotPro</p>
                <p className="mt-1">Version 1.0.0</p>
              </div>
            )}
          </div>
        </div>
      </aside>
    </>
  );
}
