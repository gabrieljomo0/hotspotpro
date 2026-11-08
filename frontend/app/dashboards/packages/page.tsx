"use client";

import { useState } from "react";

import { useDashboard } from "@/components/dashboard/context/DashboardContext";
import { PackagesHeader } from "@/components/dashboard/packages/PackagesHeader";
import { PackagesTable } from "@/components/dashboard/packages/PackagesTable";
import { BackLink } from "@/components/dashboard/shared/BackLink";

export default function PackagesPage() {
  const { packages, setPackageStatus, deletePackage, routers, businessLocations } = useDashboard();
  const [filter, setFilter] = useState("All");
  const [routerFilter, setRouterFilter] = useState("All");
  const [siteFilter, setSiteFilter] = useState("All");

  const siteRouterIps =
    siteFilter !== "All" ? routers.filter((r) => r.siteId === siteFilter).map((r) => r.ip) : null;

  const filteredPackages = packages.filter((pkg) => {
    if (routerFilter !== "All" && !pkg.routerIps.includes(routerFilter)) return false;
    if (siteRouterIps && !pkg.applyToAllSites && !siteRouterIps.some((ip) => pkg.routerIps.includes(ip))) return false;
    if (filter === "All") return true;
    if (filter === "Free Trial") return pkg.freeTrial;
    return pkg.status === filter;
  });

  return (
    <section className="w-full">
      <BackLink />
      <PackagesHeader
        packages={packages}
        activeFilter={filter}
        onFilterChange={setFilter}
        routers={siteFilter !== "All" ? routers.filter((r) => r.siteId === siteFilter) : routers}
        routerFilter={routerFilter}
        onRouterFilterChange={setRouterFilter}
        businessLocations={businessLocations}
        siteFilter={siteFilter}
        onSiteFilterChange={setSiteFilter}
      />
      <PackagesTable
        packages={filteredPackages}
        routers={routers}
        onSetStatus={setPackageStatus}
        onDelete={deletePackage}
      />
    </section>
  );
}
