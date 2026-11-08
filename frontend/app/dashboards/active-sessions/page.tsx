"use client";

import { useState } from "react";

import { useDashboard } from "@/components/dashboard/context/DashboardContext";
import { ActiveUsersCard } from "@/components/dashboard/active-users/ActiveUsersCard";
import { BackLink } from "@/components/dashboard/shared/BackLink";

export default function ActiveSessionsPage() {
  const { users } = useDashboard();
  const [routerFilter, setRouterFilter] = useState("All");

  return (
    <section className="w-full">
      <BackLink />
      <h2 className="mb-1 text-3xl font-bold tracking-tight md:text-4xl">
        Active Sessions
      </h2>
      <p className="mb-6 max-w-2xl text-sm text-[#737373] md:text-base">
        Every customer currently connected to your network ({users.length}{" "}
        online). Click Actions on any row to manage a session.
      </p>

      <ActiveUsersCard
        expanded
        routerFilter={routerFilter}
        onRouterFilterChange={setRouterFilter}
      />
    </section>
  );
}
