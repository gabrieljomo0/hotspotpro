"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import dynamic from "next/dynamic";
import { Plus, Zap, HelpCircle } from "lucide-react";

import type { Package } from "../shared/types";
import type { RouterInfo } from "../data/dashboard-data";
import type { PackageTemplate } from "./packageTemplates";

// Both are occasional-use popups (a template picker and a help guide) —
// no reason to ship their code on every visit to the packages page.
const QuickTemplatesModal = dynamic(
  () => import("./QuickTemplatesModal").then((m) => m.QuickTemplatesModal),
  { ssr: false },
);
const PackageGuideModal = dynamic(
  () => import("./PackageGuideModal").then((m) => m.PackageGuideModal),
  { ssr: false },
);

export function PackagesHeader({
  packages,
  activeFilter,
  onFilterChange,
  routers,
  routerFilter,
  onRouterFilterChange,
  businessLocations,
  siteFilter,
  onSiteFilterChange,
}: {
  packages: Package[];
  activeFilter: string;
  onFilterChange: (filter: string) => void;
  routers: RouterInfo[];
  routerFilter: string;
  onRouterFilterChange: (routerIp: string) => void;
  businessLocations: { id: string; name: string }[];
  siteFilter: string;
  onSiteFilterChange: (siteId: string) => void;
}) {
  const router = useRouter();
  const [guideOpen, setGuideOpen] = useState(false);
  const [templatesOpen, setTemplatesOpen] = useState(false);

  function handleUseTemplate(template: PackageTemplate) {
    setTemplatesOpen(false);
    router.push(`/dashboards/packages/create?template=${template.key}`);
  }

  const tabs = [
    { key: "All", label: "All", count: packages.length },
    { key: "Active", label: "Active", count: packages.filter((p) => p.status === "Active").length },
    { key: "Hidden", label: "Hidden", count: packages.filter((p) => p.status === "Hidden").length },
    { key: "Disabled", label: "Disabled", count: packages.filter((p) => p.status === "Disabled").length },
    { key: "Free Trial", label: "Free Trial", count: packages.filter((p) => p.freeTrial).length },
  ];

  return (
    <div className="mb-6">
      <div className="flex flex-col justify-between gap-4 md:flex-row md:items-start">
        <div>
          <h2 className="text-3xl font-bold tracking-tight md:text-4xl">
            Packages
          </h2>
          <p className="mt-2 max-w-xl text-sm text-[#737373] md:text-base">
            Create pricing plans, set speeds, and configure schedules for
            every router and site you sell on.
          </p>
        </div>

        <div className="flex flex-wrap gap-3">
          <button
            type="button"
            onClick={() => setTemplatesOpen(true)}
            className="inline-flex items-center gap-2 rounded-xl border border-[#e6e6e6] bg-white px-4 py-3 text-sm font-bold text-[#525252] shadow-sm transition hover:bg-[#ffffff]"
          >
            <Zap size={17} />
            Quick Templates
          </button>
          <button
            type="button"
            onClick={() => setGuideOpen(true)}
            className="inline-flex items-center gap-2 rounded-xl border border-[#e6e6e6] bg-white px-4 py-3 text-sm font-bold text-[#525252] shadow-sm transition hover:bg-[#ffffff]"
          >
            <HelpCircle size={17} />
            Package Guide
          </button>
          <Link
            href="/dashboards/packages/create"
            className="inline-flex items-center gap-2 rounded-xl bg-[#1a1a1a] px-4 py-3 text-sm font-bold text-white shadow-sm transition hover:bg-[#111111]"
          >
            <Plus size={17} />
            Create Package
          </Link>
        </div>
      </div>

      <div className="mt-5 flex flex-wrap items-center gap-2 border-b border-[#e6e6e6] pb-4">
        {tabs.map((tab) => {
          const isActive = activeFilter === tab.key;
          return (
            <button
              type="button"
              key={tab.key}
              onClick={() => onFilterChange(tab.key)}
              className={`inline-flex items-center gap-2 rounded-full border px-4 py-2 text-sm font-semibold transition ${
                isActive
                  ? "border-[#1a1a1a] bg-[#f4f4f4] text-[#1a1a1a]"
                  : "border-[#e6e6e6] bg-white text-[#525252] hover:bg-[#ffffff]"
              }`}
            >
              {tab.label}
              <span
                className={`rounded-full px-2 py-0.5 text-xs font-bold ${
                  isActive ? "bg-[#1a1a1a] text-white" : "bg-[#f4f4f4] text-[#737373]"
                }`}
              >
                {tab.count}
              </span>
            </button>
          );
        })}

        {businessLocations.length > 1 && (
          <select
            value={siteFilter}
            onChange={(event) => {
              onSiteFilterChange(event.target.value);
              onRouterFilterChange("All");
            }}
            className="ml-auto h-9 rounded-lg border border-[#e6e6e6] bg-white px-2.5 text-xs font-medium text-[#525252] outline-none focus:border-[#1a1a1a]"
          >
            <option value="All">All Sites</option>
            {businessLocations.map((site) => (
              <option key={site.id} value={site.id}>
                {site.name}
              </option>
            ))}
          </select>
        )}

        {routers.length > 1 && (
          <select
            value={routerFilter}
            onChange={(event) => onRouterFilterChange(event.target.value)}
            className={`h-9 rounded-lg border border-[#e6e6e6] bg-white px-2.5 text-xs font-medium text-[#525252] outline-none focus:border-[#1a1a1a] ${
              businessLocations.length > 1 ? "" : "ml-auto"
            }`}
          >
            <option value="All">All Routers</option>
            {routers.map((r) => (
              <option key={r.ip} value={r.ip}>
                {r.name.split(" (")[0]}
              </option>
            ))}
          </select>
        )}
      </div>

      <QuickTemplatesModal
        open={templatesOpen}
        onClose={() => setTemplatesOpen(false)}
        onUseTemplate={handleUseTemplate}
      />

      <PackageGuideModal open={guideOpen} onClose={() => setGuideOpen(false)} />
    </div>
  );
}
