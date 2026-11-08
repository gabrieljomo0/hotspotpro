"use client";

import { DashboardScopeNotes } from "@/components/dashboard/overview/DashboardScopeFilter";
import { DashboardHeader } from "@/components/dashboard/overview/DashboardHeader";
import { QuickActionsGrid } from "@/components/dashboard/overview/QuickActionsGrid";
import { StatisticsGrid } from "@/components/dashboard/overview/StatisticsGrid";
import { RevenueChart } from "@/components/dashboard/overview/RevenueChart";
import { RecentActivityCard } from "@/components/dashboard/overview/RecentActivityCard";
import { ActiveUsersCard } from "@/components/dashboard/active-users/ActiveUsersCard";
import { NetworkStatusCard } from "@/components/dashboard/routers/NetworkStatusCard";

export default function DashboardPage() {
  return (
    <section className="w-full">
      <DashboardHeader />

      <DashboardScopeNotes />

      <QuickActionsGrid />

      <StatisticsGrid />

      <section className="mt-5 grid gap-5 2xl:grid-cols-[1.35fr_0.9fr_1.1fr]">
        <RevenueChart />
        <ActiveUsersCard />
      </section>

      <section className="mt-5 grid gap-5 lg:grid-cols-2">
        <RecentActivityCard />
        <NetworkStatusCard />
      </section>
    </section>
  );
}
