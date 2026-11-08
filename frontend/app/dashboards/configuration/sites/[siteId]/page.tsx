"use client";

import { localizeAmountString } from "@/components/dashboard/shared/currency";
import { use, useEffect, useState } from "react";
import Link from "next/link";
import {
  Building2,
  Router as RouterIcon,
  Users,
  Package as PackageIcon,
  Plus,
  ChevronRight,
  ArrowLeft,
  Settings2,
  Power,
  Wifi,
} from "lucide-react";

import { useDashboard } from "@/components/dashboard/context/DashboardContext";
import { NotFoundCard } from "@/components/dashboard/shared/ActionPageLayout";
import { AddSiteModal } from "@/components/dashboard/sites/AddSiteModal";

export default function SiteDetailPage({
  params,
}: {
  params: Promise<{ siteId: string }>;
}) {
  const { siteId } = use(params);
  const { businessLocations, routers, agents, packages, updateBusinessLocationSsid, toggleSiteEnabled } =
    useDashboard();
  const [addSiteOpen, setAddSiteOpen] = useState(false);
  // "?new=1" is set right after the site is created (read after load so the
  // page stays a plain client page).
  const [justCreated, setJustCreated] = useState(false);
  useEffect(() => {
    setJustCreated(new URLSearchParams(window.location.search).get("new") === "1");
  }, []);

  const site = businessLocations.find((s) => s.id === siteId);

  if (!site) {
    return <NotFoundCard message="This site may have been removed." backHref="/dashboards/configuration/sites" />;
  }

  const enabled = site.enabled;
  const siteRouters = routers.filter((r) => r.siteId === site.id);
  const siteRouterIps = siteRouters.map((r) => r.ip);
  const siteAgents = agents.filter((a) => a.routerIp && siteRouterIps.includes(a.routerIp));
  const sitePackages = packages.filter(
    (p) => p.applyToAllSites || p.applySiteId === site.id || p.routerIps.some((ip) => siteRouterIps.includes(ip)),
  );

  return (
    <section className="w-full">
      <nav className="mb-4 flex items-center gap-1.5 text-sm text-[#737373]">
        <Link href="/dashboards/configuration/sites" className="flex items-center gap-1 hover:text-blue-600">
          <ArrowLeft size={14} />
          Sites
        </Link>
        <ChevronRight size={14} />
        <span className="font-semibold text-[#1a1a1a]">{site.name}</span>
      </nav>

      {justCreated && (
        <div
          data-testid="new-site-banner"
          className="mb-5 flex flex-wrap items-center justify-between gap-3 rounded-2xl bg-white p-5"
        >
          <div>
            <p className="text-sm font-bold text-[#1a1a1a]">&ldquo;{site.name}&rdquo; is ready.</p>
            <p className="text-xs text-[#737373]">
              Add a router to this site now, or come back and do it later.
            </p>
          </div>
          <Link
            href={`/dashboards/configuration/routers/create?site=${encodeURIComponent(site.id)}`}
            data-testid="new-site-add-router"
            className="inline-flex items-center gap-2 rounded-xl bg-[#1a1a1a] px-4 py-2.5 text-sm font-bold text-white hover:bg-[#111111]"
          >
            <Plus size={16} />
            Add a router to this site
          </Link>
        </div>
      )}

      <div className="mb-6 flex flex-wrap items-start justify-between gap-4">
        <div>
          <h2 className="mb-1 flex items-center gap-2 text-3xl font-bold tracking-tight md:text-4xl">
            <Building2 className="text-blue-500" size={30} />
            {site.name}
            {!enabled && (
              <span className="rounded-full bg-red-100 px-2.5 py-1 text-xs font-bold text-red-700">Disabled</span>
            )}
          </h2>
          <p className="max-w-2xl text-sm text-[#737373] md:text-base">
            Everything under this site — its routers, the agents linked to
            them, and the packages sold here. Still the same HotspotPro
            account and billing as every other site.
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <button
            type="button"
            onClick={() => setAddSiteOpen(true)}
            className="inline-flex items-center gap-2 rounded-xl border-2 border-blue-400 bg-white px-4 py-2.5 text-sm font-bold text-blue-600 hover:bg-blue-50"
          >
            <Plus size={16} />
            Add Another Site
          </button>
          <Link
            href={`/dashboards/configuration/routers/create?site=${encodeURIComponent(site.id)}`}
            className="inline-flex items-center gap-2 rounded-xl bg-blue-500 px-4 py-2.5 text-sm font-bold text-white hover:bg-blue-600"
          >
            <Plus size={16} />
            Add Router
          </Link>
        </div>
      </div>

      <div className="mb-5 grid gap-4 sm:grid-cols-3">
        <div className="rounded-2xl border border-[#e6e6e6] bg-white p-5 shadow-[0_8px_24px_rgba(26,26,26,0.06)]">
          <p className="flex items-center gap-1.5 text-xs font-semibold text-[#737373]">
            <RouterIcon size={13} className="text-blue-500" />
            Routers
          </p>
          <p className="mt-1 text-2xl font-black text-[#1a1a1a]">{siteRouters.length}</p>
        </div>
        <div className="rounded-2xl border border-[#e6e6e6] bg-white p-5 shadow-[0_8px_24px_rgba(26,26,26,0.06)]">
          <p className="flex items-center gap-1.5 text-xs font-semibold text-[#737373]">
            <Users size={13} className="text-emerald-500" />
            Agents
          </p>
          <p className="mt-1 text-2xl font-black text-[#1a1a1a]">{siteAgents.length}</p>
        </div>
        <div className="rounded-2xl border border-[#e6e6e6] bg-white p-5 shadow-[0_8px_24px_rgba(26,26,26,0.06)]">
          <p className="flex items-center gap-1.5 text-xs font-semibold text-[#737373]">
            <PackageIcon size={13} className="text-amber-500" />
            Packages sold here
          </p>
          <p className="mt-1 text-2xl font-black text-[#1a1a1a]">{sitePackages.length}</p>
        </div>
      </div>

      {/* Routers */}
      <article className="mb-5 overflow-hidden rounded-2xl border border-[#e6e6e6] bg-white shadow-[0_8px_24px_rgba(26,26,26,0.06)]">
        <div className="flex items-center justify-between border-b border-[#e6e6e6] px-6 py-4">
          <p className="flex items-center gap-1.5 text-sm font-bold text-[#1a1a1a]">
            <RouterIcon size={14} className="text-blue-500" />
            Routers on this site
          </p>
          <Link href={`/dashboards/configuration/routers/create?site=${encodeURIComponent(site.id)}`} className="text-xs font-semibold text-blue-600 hover:underline">
            + Add another
          </Link>
        </div>
        {siteRouters.length === 0 ? (
          <p className="px-6 py-6 text-sm text-[#a3a3a3]">No routers added to this site yet.</p>
        ) : (
          <div className="divide-y divide-[#f4f4f4]">
            {siteRouters.map((router) => (
              <Link
                key={router.ip}
                href={`/dashboards/configuration/routers/${router.ip}`}
                className="flex items-center justify-between gap-3 px-6 py-3.5 text-sm hover:bg-[#ffffff]"
              >
                <div className="min-w-0">
                  <p className="truncate font-semibold text-[#1a1a1a]">{router.name.split(" (")[0]}</p>
                  <p className="truncate text-xs text-[#a3a3a3]">{router.ip}</p>
                </div>
                <span
                  className={`shrink-0 rounded-full px-2.5 py-1 text-xs font-bold ${
                    router.status === "Online" ? "bg-emerald-100 text-emerald-700" : "bg-slate-100 text-slate-600"
                  }`}
                >
                  {router.status}
                </span>
              </Link>
            ))}
          </div>
        )}
      </article>

      {/* Agents */}
      <article className="mb-5 overflow-hidden rounded-2xl border border-[#e6e6e6] bg-white shadow-[0_8px_24px_rgba(26,26,26,0.06)]">
        <div className="border-b border-[#e6e6e6] px-6 py-4">
          <p className="flex items-center gap-1.5 text-sm font-bold text-[#1a1a1a]">
            <Users size={14} className="text-emerald-500" />
            Agents linked to this site
          </p>
        </div>
        {siteAgents.length === 0 ? (
          <p className="px-6 py-6 text-sm text-[#a3a3a3]">No agents are linked to a router on this site yet.</p>
        ) : (
          <div className="divide-y divide-[#f4f4f4]">
            {siteAgents.map((agent) => (
              <Link
                key={agent.id}
                href={`/dashboards/agents/${agent.id}`}
                className="flex items-center justify-between gap-3 px-6 py-3.5 text-sm hover:bg-[#ffffff]"
              >
                <div className="min-w-0">
                  <p className="truncate font-semibold text-[#1a1a1a]">{agent.name}</p>
                  <p className="truncate text-xs text-[#a3a3a3]">
                    {agent.role} · {routers.find((r) => r.ip === agent.routerIp)?.name.split(" (")[0] ?? "—"}
                  </p>
                </div>
                <span
                  className={`shrink-0 rounded-full px-2.5 py-1 text-xs font-bold ${
                    agent.status === "Active" ? "bg-emerald-100 text-emerald-700" : "bg-slate-100 text-slate-600"
                  }`}
                >
                  {agent.status}
                </span>
              </Link>
            ))}
          </div>
        )}
      </article>

      {/* Packages */}
      <article className="overflow-hidden rounded-2xl border border-[#e6e6e6] bg-white shadow-[0_8px_24px_rgba(26,26,26,0.06)]">
        <div className="border-b border-[#e6e6e6] px-6 py-4">
          <p className="flex items-center gap-1.5 text-sm font-bold text-[#1a1a1a]">
            <PackageIcon size={14} className="text-amber-500" />
            Packages sold on this site
          </p>
        </div>
        {sitePackages.length === 0 ? (
          <p className="px-6 py-6 text-sm text-[#a3a3a3]">No packages apply to this site yet.</p>
        ) : (
          <div className="divide-y divide-[#f4f4f4]">
            {sitePackages.map((pkg) => (
              <Link
                key={pkg.id}
                href={`/dashboards/packages/${pkg.id}`}
                className="flex items-center justify-between gap-3 px-6 py-3.5 text-sm hover:bg-[#ffffff]"
              >
                <div className="min-w-0">
                  <p className="truncate font-semibold text-[#1a1a1a]">{pkg.name}</p>
                  <p className="truncate text-xs text-[#a3a3a3]">{localizeAmountString(pkg.price)}</p>
                </div>
                {pkg.applyToAllSites && (
                  <span className="shrink-0 rounded-full bg-blue-100 px-2.5 py-1 text-xs font-bold text-blue-700">
                    Universal
                  </span>
                )}
              </Link>
            ))}
          </div>
        )}
      </article>

      {/* Site Settings */}
      <article className="mt-5 rounded-2xl border border-[#e6e6e6] bg-[#ffffff] p-6">
        <p className="mb-3 flex items-center gap-1.5 text-sm font-bold text-[#1a1a1a]">
          <Settings2 size={14} className="text-[#1a1a1a]" />
          Site Settings
        </p>
        <p className="mb-4 text-xs text-[#737373]">
          Controls for this site and every router under it. Any new
          site-wide setting added to HotspotPro in the future will show up
          here too.
        </p>

        <div className="space-y-4">
          <div className="flex items-center justify-between gap-3 rounded-xl border border-[#e6e6e6] bg-white p-4">
            <div className="flex items-center gap-3">
              <span
                className={`flex h-9 w-9 items-center justify-center rounded-lg ${
                  enabled ? "bg-emerald-100 text-emerald-600" : "bg-red-100 text-red-600"
                }`}
              >
                <Power size={16} />
              </span>
              <div>
                <p className="text-sm font-bold text-[#1a1a1a]">Site Status</p>
                <p className="text-xs text-[#737373]">
                  {enabled
                    ? "This site and its routers are active."
                    : "This site and every router under it are disabled."}
                </p>
              </div>
            </div>
            <button
              type="button"
              onClick={() => toggleSiteEnabled(site.id)}
              className={`relative h-6 w-11 shrink-0 rounded-full transition ${
                enabled ? "bg-emerald-500" : "bg-[#e6e6e6]"
              }`}
            >
              <span
                className={`absolute top-0.5 h-5 w-5 rounded-full bg-white shadow transition-transform ${
                  enabled ? "translate-x-5" : "translate-x-0.5"
                }`}
              />
            </button>
          </div>

          <div className="rounded-xl border border-blue-200 bg-white p-4">
            <p className="mb-3 flex items-center gap-1.5 text-sm font-bold text-[#1a1a1a]">
              <Wifi size={14} className="text-blue-600" />
              WiFi Name (SSID)
            </p>
            <div className="mb-3 grid gap-2 sm:grid-cols-2">
              <button
                type="button"
                onClick={() => updateBusinessLocationSsid(site.id, { ssidMode: "perRouter" })}
                className={`rounded-xl border-2 p-3 text-left transition ${
                  site.ssidMode === "perRouter"
                    ? "border-blue-400 bg-white"
                    : "border-blue-100 bg-white hover:bg-white"
                }`}
              >
                <p className="text-sm font-bold text-[#1a1a1a]">Per router</p>
                <p className="text-xs text-[#737373]">Each router keeps its own WiFi name.</p>
              </button>
              <button
                type="button"
                onClick={() => updateBusinessLocationSsid(site.id, { ssidMode: "siteWide" })}
                className={`rounded-xl border-2 p-3 text-left transition ${
                  site.ssidMode === "siteWide"
                    ? "border-blue-400 bg-white"
                    : "border-blue-100 bg-white hover:bg-white"
                }`}
              >
                <p className="text-sm font-bold text-[#1a1a1a]">One name for the whole site</p>
                <p className="text-xs text-[#737373]">Every router here broadcasts the same WiFi name.</p>
              </button>
            </div>

            {site.ssidMode === "siteWide" && (
              <label className="block">
                <span className="mb-1.5 block text-xs font-semibold text-[#525252]">Shared WiFi name</span>
                <input
                  value={site.siteWideSsid}
                  onChange={(event) => updateBusinessLocationSsid(site.id, { siteWideSsid: event.target.value })}
                  placeholder={site.name}
                  className="h-11 w-full max-w-sm rounded-xl border border-blue-200 bg-white px-3 text-sm outline-none focus:border-blue-500"
                />
                <span className="mt-1 block text-xs text-[#a3a3a3]">
                  All {siteRouters.length} router{siteRouters.length === 1 ? "" : "s"} on this site will show this
                  as their WiFi name.
                </span>
              </label>
            )}
          </div>

          <p className="text-center text-xs italic text-[#d4d4d4]">
            More site-wide settings will appear here as they're added.
          </p>
        </div>
      </article>

      {addSiteOpen && <AddSiteModal onClose={() => setAddSiteOpen(false)} />}
    </section>
  );
}
