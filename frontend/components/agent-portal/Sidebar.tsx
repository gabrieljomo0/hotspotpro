"use client";

// The agent portal's left-hand sidebar: logo, the navigation menu (from
// navigation.ts, filtered to what this agent's permissions actually
// allow), the agent's real wallet balance.
// Collapses to icon-only on desktop, slides in/out as an overlay on
// mobile — both controlled by props passed down from the parent page.

import { sym } from "@/components/dashboard/shared/currency";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Wifi, Menu, Banknote } from "lucide-react";

import { navigation } from "./navigation";
import { useDashboard } from "@/components/dashboard/context/DashboardContext";
import type { AgentProfile } from "@/components/dashboard/shared/types";

export function Sidebar({
  agent,
  mobileOpen,
  desktopCollapsed,
  onClose,
  onToggleDesktop,
  onOpenTopUp,
}: {
  agent: AgentProfile;
  mobileOpen: boolean;
  desktopCollapsed: boolean;
  onClose: () => void;
  onToggleDesktop: () => void;
  onOpenTopUp: () => void;
}) {
  const pathname = usePathname();
  const { showToast } = useDashboard();
  const dashboardHref = `/agent-portal/${agent.id}`;

  return (
    <>
      {/* On mobile, tapping the dark overlay behind the open sidebar closes it */}
      {mobileOpen && (
        <button
          type="button"
          onClick={onClose}
          className="fixed inset-0 z-40 bg-slate-950/60 lg:hidden"
          aria-label="Close sidebar overlay"
        />
      )}

      <aside
        className={`fixed inset-y-0 left-0 z-50 flex w-[228px] flex-col overflow-y-auto border-r border-[#d4d4d4] bg-[#f4f4f4] text-[#1a1a1a] transition-all duration-300 lg:sticky lg:top-0 lg:h-screen ${ mobileOpen ? "translate-x-0" : "-translate-x-full" } ${desktopCollapsed ? "lg:w-[84px]" : "lg:w-[228px]"} lg:translate-x-0`}
      >
        {/* Logo + collapse/expand toggle */}
        <div
          className={`flex min-h-20 shrink-0 items-center px-4 ${ desktopCollapsed ? "lg:justify-center lg:px-2" : "justify-between" }`}
        >
          {!desktopCollapsed && (
            <div className="flex min-w-0 items-center gap-3">
              <Wifi className="h-10 w-10 shrink-0 text-[#1a1a1a]" strokeWidth={3} />
              <div className="min-w-0 overflow-hidden whitespace-nowrap">
                <p className="truncate text-xl font-bold">
                  Hotspot<span className="text-[#1a1a1a]">Pro</span>
                </p>
                <p className="text-xs text-[#1a1a1a]">Billing System</p>
              </div>
            </div>
          )}

          <button
            type="button"
            onClick={() => {
              // Under 1024px wide counts as "mobile" — there the button just
              // closes the sidebar overlay. On desktop it toggles collapse.
              if (window.innerWidth < 1024) {
                onClose();
              } else {
                onToggleDesktop();
              }
            }}
            className={`flex shrink-0 items-center justify-center bg-transparent p-0 text-[#333333] transition hover:text-[#1a1a1a] focus:outline-none ${ desktopCollapsed ? "h-11 w-11" : "h-10 w-10" }`}
            aria-label={desktopCollapsed ? "Show sidebar" : "Hide sidebar"}
            title={desktopCollapsed ? "Show sidebar" : "Hide sidebar"}
          >
            <Menu size={desktopCollapsed ? 28 : 25} strokeWidth={2.4} />
          </button>
        </div>

        <nav className={`flex-1 px-3 py-5 transition-all duration-300 ${desktopCollapsed ? "lg:px-2" : ""}`}>
          {/* Navigation links, grouped under headings like "Main" and "Tools" */}
          {navigation.map((group) => {
            const visibleItems = group.items.filter((item) => agent.permissions[item.permissionKey] === "Allowed");
            if (visibleItems.length === 0) return null;

            return (
              <section key={group.heading} className="mb-6">
                <p
                  className={`mb-2 overflow-hidden whitespace-nowrap px-2 text-[11px] font-semibold uppercase tracking-widest text-[#737373] transition-all duration-300 ${ desktopCollapsed ? "lg:h-0 lg:mb-0 lg:opacity-0" : "" }`}
                >
                  {group.heading}
                </p>

                <div className="space-y-1">
                  {visibleItems.map((item) => {
                    const Icon = item.icon;
                    const href =
                      item.href === "/agent-portal/"
                        ? dashboardHref
                        : item.href?.replace("{id}", agent.id) ?? null;
                    const isActive = href ? pathname === href : false;

                    const content = (
                      <>
                        <Icon size={18} className="shrink-0" />
                        <span
                          className={`overflow-hidden whitespace-nowrap transition-all duration-300 ${ desktopCollapsed ? "lg:w-0 lg:opacity-0" : "lg:w-auto lg:opacity-100" }`}
                        >
                          {item.label}
                        </span>
                      </>
                    );

                    const className = `flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-left text-sm transition ${
                      isActive
                        ? "bg-white font-semibold text-[#1a1a1a] shadow-sm ring-1 ring-[#d4d4d4]"
                        : "text-[#333333] hover:bg-[#e6e6e6] hover:text-[#1a1a1a]"
                    } ${desktopCollapsed ? "lg:justify-center lg:px-2" : ""}`;

                    if (href) {
                      return (
                        <Link key={item.label} href={href} title={desktopCollapsed ? item.label : undefined} className={className}>
                          {content}
                        </Link>
                      );
                    }

                    return (
                      <button
                        type="button"
                        key={item.label}
                        title={desktopCollapsed ? `${item.label} — coming soon` : undefined}
                        onClick={() => showToast(`${item.label} isn't built yet — coming soon.`)}
                        className={`${className} opacity-70`}
                      >
                        {content}
                      </button>
                    );
                  })}
                </div>
              </section>
            );
          })}

          {/* Wallet balance card — the agent's real balance, not a sample number */}
          <section className="border-t border-[#d4d4d4] pt-5">
            {desktopCollapsed ? (
              <button
                type="button"
                title={`Wallet Balance: ${sym()} ${agent.walletBalance.toLocaleString()}`}
                onClick={agent.allowWalletTopUp ? onOpenTopUp : undefined}
                className="hidden w-full items-center justify-center rounded-xl border-[#d4d4d4] p-3 text-[#1a1a1a] transition hover:bg-[#e6e6e6] lg:flex"
              >
                <Banknote size={22} />
              </button>
            ) : null}

            <div className={`rounded-xl border-[#d4d4d4] p-4 ${desktopCollapsed ? "lg:hidden" : ""}`}>
              <div className="flex items-center gap-2 text-sm font-semibold">
                <Banknote size={18} className="text-[#1a1a1a]" />
                Wallet Balance
              </div>
              <p className="mt-4 text-2xl font-black text-[#1a1a1a]">{sym()} {agent.walletBalance.toLocaleString()}</p>
              {agent.allowWalletTopUp && (
                <button
                  type="button"
                  onClick={onOpenTopUp}
                  className="mt-4 w-full rounded-lg bg-[#1a1a1a] px-4 py-3 text-sm font-bold text-white transition hover:bg-[#111111]"
                >
                  Fund Wallet
                </button>
              )}
            </div>
          </section>

        </nav>
      </aside>
    </>
  );
}
