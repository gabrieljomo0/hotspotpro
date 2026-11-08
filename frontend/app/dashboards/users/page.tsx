"use client";

import { useState } from "react";

import { useDashboard } from "@/components/dashboard/context/DashboardContext";
import { ActiveUsersCard } from "@/components/dashboard/active-users/ActiveUsersCard";
import { UsersNavTabs } from "@/components/dashboard/active-users/UsersNavTabs";
import { BackLink } from "@/components/dashboard/shared/BackLink";

export default function UsersPage() {
  const { users } = useDashboard();
  const [routerFilter, setRouterFilter] = useState("All");
  const [howOpen, setHowOpen] = useState(false);


  return (
    <section className="w-full">
      <BackLink />
      <h2 className="mb-1 text-3xl font-bold tracking-tight md:text-4xl">
        Active Users
      </h2>
      <p className="mb-4 text-sm text-[#737373] md:text-base">
        Live hotspot sessions.{" "}
        <button
          type="button"
          onClick={() => setHowOpen((open) => !open)}
          aria-expanded={howOpen}
          className="font-semibold text-[#1a1a1a] hover:underline"
        >
          How it works
        </button>
      </p>

      {howOpen && (
        <p className="mb-6 max-w-2xl rounded-xl border border-[#e6e6e6] bg-[#ffffff] px-4 py-3 text-sm text-[#737373]">
          Everyone who has authenticated on your network ({users.length}{" "}
          currently). This is the same live list as Active Sessions — a user
          only appears here while they&apos;re actually connected. Once a
          session is disconnected or expires, it&apos;s removed permanently
          rather than kept as history.
        </p>
      )}

      <UsersNavTabs />

      <ActiveUsersCard
        expanded
        routerFilter={routerFilter}
        onRouterFilterChange={setRouterFilter}
      />
    </section>
  );
}
