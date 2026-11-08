"use client";

import { useState } from "react";
import { CalendarDays, ChevronDown, RefreshCcw } from "lucide-react";

import { Sidebar } from "@/components/reseller-dashboard/Sidebar";
import { Topbar } from "@/components/reseller-dashboard/Topbar";
import { SummaryCards } from "@/components/reseller-dashboard/SummaryCards";
import { LiveUsersTable } from "@/components/reseller-dashboard/LiveUsersTable";
import { ConnectionActivity } from "@/components/reseller-dashboard/ConnectionActivity";
import { UsersByStatus } from "@/components/reseller-dashboard/UsersByStatus";
import { DataUsageOverview } from "@/components/reseller-dashboard/DataUsageOverview";
import { TopUsers } from "@/components/reseller-dashboard/TopUsers";
import { RecentEvents } from "@/components/reseller-dashboard/RecentEvents";

// This page used to be one 1,365-line file with the sidebar, topbar, every
// chart/table, and all the mock data mixed together. It's now broken into
// small focused pieces under components/reseller-dashboard/, mirroring the
// same pattern used for the agent portal — so editing one widget (say, the
// Live Users table) can't accidentally break the sidebar or another chart.

export default function ResellerDashboardPage() {
 const [mobileSidebarOpen, setMobileSidebarOpen] =
  useState(false);

 const [
  desktopSidebarCollapsed,
  setDesktopSidebarCollapsed,
 ] = useState(false);

 function toggleDesktopSidebar() {
  setDesktopSidebarCollapsed(
   (current) => !current,
  );
 }

 return (
  <div className="flex min-h-screen bg-[#f1f5f9] text-[#0f172a]">
   <Sidebar
    mobileOpen={mobileSidebarOpen}
    desktopCollapsed={
     desktopSidebarCollapsed
    }
    onClose={() =>
     setMobileSidebarOpen(false)
    }
    onToggleDesktop={
     toggleDesktopSidebar
    }
   />

   <div className="min-w-0 flex-1">
    <Topbar
     onOpenSidebar={() =>
      setMobileSidebarOpen(true)
     }
    />

    <main className="p-4 md:p-6">
     <section className="mx-auto max-w-[1650px]">
      <div className="mb-6 flex flex-col justify-between gap-4 lg:flex-row lg:items-center">
       <div>
        <h1 className="text-2xl font-black md:text-3xl">
         Welcome back, Emm! 👋
        </h1>

        <p className="mt-2 text-sm text-[#64748b] ">
         Here&apos;s what&apos;s happening
         on your network today.
        </p>
       </div>

       <div className="flex flex-wrap gap-3">
        <button
         type="button"
         className="flex items-center gap-3 rounded-lg border border-[#e2e8f0] bg-white px-4 py-3 text-sm font-semibold "
        >
         <CalendarDays size={17} />
         May 12 - May 18, 2024
         <ChevronDown size={15} />
        </button>

        <button
         type="button"
         className="flex items-center gap-2 rounded-lg bg-[#2563eb] px-5 py-3 text-sm font-bold text-white hover:bg-[#1d4ed8]"
        >
         <RefreshCcw size={17} />
         Refresh
        </button>
       </div>
      </div>

      <SummaryCards />

      <section className="mt-5 grid gap-5 2xl:grid-cols-[1.8fr_0.9fr]">
       <LiveUsersTable />
       <ConnectionActivity />
      </section>

      <section className="mt-5 grid gap-5 md:grid-cols-2 2xl:grid-cols-[1fr_1.05fr_0.9fr_1.15fr]">
       <UsersByStatus />
       <DataUsageOverview />
       <TopUsers />
       <RecentEvents />
      </section>

      <footer className="mt-8 flex flex-col justify-between gap-3 border-t border-[#e2e8f0] py-5 text-xs text-[#64748b] sm:flex-row">
       <p>
        You are logged in as: Emm
        (Reseller)
       </p>

       <p>
        HotspotPro Billing System ©
        2026
       </p>
      </footer>
     </section>
    </main>
   </div>
  </div>
 );
}