"use client";

// The platform (super admin) area. It is built from the same pieces as the business dashboard so the two look like
// one product: the same left sidebar (colors, spacing, active link), the same white top bar, the same page background.

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState, type ReactNode } from "react";
import { Activity, Building2, CreditCard, LayoutDashboard, LogOut, Menu, Settings, Users, Wifi } from "lucide-react";

import { purgeLocalCache } from "@/components/dashboard/context/localCache";

const NAV = [
  { href: "/super-admin", label: "Overview", icon: LayoutDashboard, exact: true },
  { href: "/super-admin/businesses", label: "Businesses", icon: Building2 },
  { href: "/super-admin/people", label: "People", icon: Users },
  { href: "/super-admin/payments", label: "Payments", icon: CreditCard },
  { href: "/super-admin/activity", label: "Activity", icon: Activity },
  { href: "/super-admin/settings", label: "Settings", icon: Settings },
];

export default function SuperAdminLayout({ children }: { children: ReactNode }) {
  const pathname = usePathname();
  const [name, setName] = useState("");
  const [mobileOpen, setMobileOpen] = useState(false);

  useEffect(() => {
    fetch("/api/auth/me", { cache: "no-store" })
      .then((r) => (r.ok ? r.json() : null))
      .then((me) => setName(me?.name || me?.email || ""))
      .catch(() => undefined);
  }, []);

  useEffect(() => setMobileOpen(false), [pathname]);

  async function signOut() {
    try {
      await fetch("/api/auth/logout", { method: "POST" });
    } catch {
      // go to the sign-in page regardless
    }
    purgeLocalCache();
    window.location.assign("/login");
  }

  const isActive = (item: (typeof NAV)[number]) => (item.exact ? pathname === item.href : pathname.startsWith(item.href));
  const current = NAV.find(isActive);

  return (
    <div className="flex min-h-screen bg-[#f1f5f9] text-[#0f172a]">
      {mobileOpen && (
        <button type="button" aria-label="Close navigation overlay" onClick={() => setMobileOpen(false)} className="fixed inset-0 z-40 bg-slate-950/60 lg:hidden" />
      )}

      <aside
        className={`fixed inset-y-0 left-0 z-50 h-screen w-[270px] overflow-y-auto overflow-x-hidden border-r border-[#cbd5e1] bg-[#f1f5f9] text-[#0f172a] shadow-[6px_0_24px_rgba(37,99,235,0.05)] transition-all duration-300 lg:sticky lg:top-0 lg:translate-x-0 ${
          mobileOpen ? "translate-x-0" : "-translate-x-full"
        }`}
      >
        <div className="flex h-20 items-center border-b border-[#cbd5e1] px-5">
          <div className="flex min-w-0 items-center gap-3 overflow-hidden">
            <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-white text-[#2563eb]">
              <Wifi size={26} strokeWidth={3} />
            </div>
            <div className="min-w-0 whitespace-nowrap">
              <h1 className="truncate text-xl font-bold leading-tight">HotspotPro</h1>
              <p className="mt-1 text-xs text-[#64748b]">Platform Admin</p>
            </div>
          </div>
        </div>

        <div className="px-3 py-5">
          <p className="mb-2 px-3 text-xs font-semibold uppercase tracking-[0.16em] text-[#94a3b8]">Platform</p>
          <div className="space-y-1.5">
            {NAV.map((item) => {
              const Icon = item.icon;
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className={`flex w-full items-center gap-3 rounded-xl px-3 py-3 text-left text-sm transition-all duration-200 ${
                    isActive(item) ? "bg-white font-bold text-[#1d4ed8] shadow-sm ring-1 ring-[#cbd5e1]" : "text-[#475569] hover:bg-[#e2e8f0] hover:text-[#0f172a]"
                  }`}
                >
                  <Icon size={19} className="shrink-0" />
                  <span className="truncate">{item.label}</span>
                </Link>
              );
            })}
            <div role="separator" className="mx-2 mt-4 border-t border-[#cbd5e1]" />
            <Link href="/dashboards" className="flex w-full items-center gap-3 rounded-xl px-3 py-3 text-left text-sm text-[#475569] transition-all duration-200 hover:bg-[#e2e8f0] hover:text-[#0f172a]">
              <LayoutDashboard size={19} className="shrink-0" />
              <span className="truncate">My own dashboard</span>
            </Link>
          </div>
        </div>
      </aside>

      <div className="h-screen min-w-0 flex-1 overflow-y-auto">
        <header className="sticky top-0 z-30 flex h-20 items-center border-b border-[#e2e8f0] bg-white px-4 md:px-6">
          <button type="button" onClick={() => setMobileOpen(true)} className="mr-3 rounded-xl p-2.5 text-[#475569] transition hover:bg-[#f1f5f9] lg:hidden" aria-label="Open sidebar">
            <Menu size={24} />
          </button>
          <p className="text-base font-bold text-[#0f172a]">{current?.label ?? "Platform"}</p>

          <div className="ml-auto flex items-center gap-3">
            <div className="hidden text-right sm:block">
              <p className="text-sm font-bold leading-tight text-[#0f172a]">{name || "Super admin"}</p>
              <p className="text-xs leading-tight text-[#64748b]">Super admin</p>
            </div>
            <div className="flex h-11 w-11 items-center justify-center rounded-full bg-[#2563eb] text-sm font-bold text-white ring-2 ring-[#e2e8f0]">
              {(name || "S").trim().charAt(0).toUpperCase()}
            </div>
            <button type="button" onClick={signOut} className="flex items-center gap-2 rounded-xl border border-[#e2e8f0] bg-white px-4 py-3 text-sm font-semibold text-[#475569] transition hover:bg-[#f1f5f9]">
              <LogOut size={17} /> <span className="hidden sm:inline">Sign out</span>
            </button>
          </div>
        </header>

        <main className="p-4 md:p-6">{children}</main>
      </div>
    </div>
  );
}
