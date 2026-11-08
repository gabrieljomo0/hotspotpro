"use client";

import { useState } from "react";
import Link from "next/link";
import { Building2, Plus, Router as RouterIcon, Users, ChevronRight } from "lucide-react";

import { useDashboard } from "@/components/dashboard/context/DashboardContext";
import { BackLink } from "@/components/dashboard/shared/BackLink";
import { AddSiteModal } from "@/components/dashboard/sites/AddSiteModal";

export default function SitesPage() {
  const { businessLocations, routers, agents } = useDashboard();
  const [addOpen, setAddOpen] = useState(false);

  return (
    <section className="w-full">
      <BackLink />
      <div className="mb-6 flex flex-wrap items-start justify-between gap-4">
        <div>
          <h2 className="mb-1 flex items-center gap-2 text-3xl font-bold tracking-tight md:text-4xl">
            <Building2 className="text-blue-500" size={30} />
            Sites
          </h2>
          <p className="max-w-2xl text-sm text-[#64748b] md:text-base">
            Every site/business on your account — its routers, the agents
            working there, and its settings, all in one place. Open a site
            for the full picture.
          </p>
        </div>
        <button
          type="button"
          onClick={() => setAddOpen(true)}
          className="inline-flex shrink-0 items-center gap-2 rounded-xl bg-blue-500 px-4 py-2.5 text-sm font-bold text-white hover:bg-blue-600"
        >
          <Plus size={16} />
          Add Site
        </button>
      </div>

      <div className="overflow-hidden rounded-2xl border border-[#e2e8f0] bg-white shadow-[0_8px_24px_rgba(37,99,235,0.06)]">
        {businessLocations.length === 0 ? (
          <div className="p-10 text-center">
            <Building2 size={28} className="mx-auto mb-3 text-blue-300" />
            <p className="text-sm font-semibold text-[#0f172a]">No sites yet</p>
            <p className="mt-1 text-xs text-[#94a3b8]">Add one to start grouping routers, agents and settings under it.</p>
          </div>
        ) : (
          businessLocations.map((site, index) => {
            const siteRouters = routers.filter((r) => r.siteId === site.id);
            const siteRouterIps = siteRouters.map((r) => r.ip);
            const siteAgents = agents.filter((a) => a.routerIp && siteRouterIps.includes(a.routerIp));
            return (
              <Link
                key={site.id}
                href={`/dashboards/configuration/sites/${site.id}`}
                className={`flex items-center justify-between gap-4 px-5 py-4 transition hover:bg-[#ffffff] ${
                  index > 0 ? "border-t border-[#f1f5f9]" : ""
                }`}
              >
                <div className="min-w-0">
                  <p className="flex items-center gap-2 truncate text-sm font-bold text-[#0f172a]">
                    {site.name}
                    {!site.enabled && (
                      <span className="rounded-full bg-red-100 px-2 py-0.5 text-[10px] font-bold text-red-700">
                        Disabled
                      </span>
                    )}
                  </p>
                  <p className="mt-0.5 text-xs text-[#94a3b8]">Since {site.createdAt}</p>
                </div>
                <div className="flex shrink-0 items-center gap-2">
                  <span className="inline-flex items-center gap-1.5 rounded-full bg-blue-100 px-2.5 py-1 text-xs font-semibold text-blue-700">
                    <RouterIcon size={11} />
                    {siteRouters.length} router{siteRouters.length === 1 ? "" : "s"}
                  </span>
                  <span className="inline-flex items-center gap-1.5 rounded-full bg-blue-100 px-2.5 py-1 text-xs font-semibold text-blue-700">
                    <Users size={11} />
                    {siteAgents.length} agent{siteAgents.length === 1 ? "" : "s"}
                  </span>
                  <ChevronRight size={16} className="text-[#94a3b8]" />
                </div>
              </Link>
            );
          })
        )}
      </div>

      {addOpen && <AddSiteModal onClose={() => setAddOpen(false)} />}
    </section>
  );
}
