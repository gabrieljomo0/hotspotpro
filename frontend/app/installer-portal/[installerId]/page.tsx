"use client";

import { use } from "react";
import Link from "next/link";
import { Wrench, CheckCircle2, Clock, Router as RouterIcon, Building2 } from "lucide-react";

import { useDashboard } from "@/components/dashboard/context/DashboardContext";

export default function InstallerPortalPage({
  params,
}: {
  params: Promise<{ installerId: string }>;
}) {
  const { installerId } = use(params);
  const { installers, routers, businessLocations } = useDashboard();

  const installer = installers.find((i) => i.id === installerId);

  if (!installer) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-[#f1f5f9] px-4">
        <div className="w-full max-w-md rounded-2xl border border-[#e2e8f0] bg-white p-8 text-center shadow-[0_8px_24px_rgba(37,99,235,0.06)]">
          <p className="text-lg font-bold text-[#0f172a]">Installer account not found</p>
          <p className="mt-2 text-sm text-[#64748b]">It may have been removed.</p>
          <Link href="/login" className="mt-4 inline-block text-sm font-semibold text-[#2563eb] hover:underline">
            Back to Sign In
          </Link>
        </div>
      </main>
    );
  }

  const site = businessLocations.find((b) => b.id === installer.assignedSiteId);
  const router = routers.find((r) => r.ip === installer.assignedRouterIp);
  const assigned = installer.assignedSiteId !== null || installer.assignedRouterIp !== null;

  return (
    <main className="min-h-screen bg-[#f1f5f9] px-4 py-10 text-[#0f172a] sm:py-16">
      <div className="mx-auto max-w-xl">
        <div className="mb-6 flex items-center gap-3">
          <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-blue-100 text-blue-600">
            <Wrench size={20} />
          </div>
          <div>
            <p className="text-xl font-black">Welcome, {installer.name.split(" ")[0]}</p>
            <p className="text-xs text-[#64748b]">Installer account</p>
          </div>
        </div>

        <div className="space-y-4 rounded-2xl border border-[#e2e8f0] bg-white p-6 shadow-[0_8px_24px_rgba(37,99,235,0.06)] sm:p-8">
          <div className="flex items-center gap-2">
            <span
              className={`rounded-full px-3 py-1 text-xs font-bold ${
                installer.status === "Active" ? "bg-emerald-100 text-emerald-700" : "bg-red-100 text-red-700"
              }`}
            >
              {installer.status}
            </span>
            <span className="text-xs text-[#94a3b8]">Since {installer.createdAt}</span>
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <p className="text-xs text-[#94a3b8]">Email</p>
              <p className="text-sm font-semibold text-[#0f172a]">{installer.email}</p>
            </div>
            <div>
              <p className="text-xs text-[#94a3b8]">Phone</p>
              <p className="text-sm font-semibold text-[#0f172a]">{installer.phone}</p>
            </div>
          </div>

          <div className="rounded-xl border border-[#f1f5f9] bg-[#ffffff] p-4">
            {assigned ? (
              <>
                <p className="flex items-center gap-2 text-sm font-bold text-[#0f172a]">
                  <CheckCircle2 size={15} className="text-emerald-600" />
                  You&apos;re assigned
                </p>
                <div className="mt-2 space-y-1 text-sm text-[#475569]">
                  {site && (
                    <p className="flex items-center gap-1.5">
                      <Building2 size={13} className="text-[#94a3b8]" />
                      {site.name}
                    </p>
                  )}
                  {router && (
                    <p className="flex items-center gap-1.5">
                      <RouterIcon size={13} className="text-[#94a3b8]" />
                      {router.name}
                    </p>
                  )}
                </div>
              </>
            ) : (
              <>
                <p className="flex items-center gap-2 text-sm font-bold text-amber-700">
                  <Clock size={15} />
                  Waiting for assignment
                </p>
                <p className="mt-1 text-sm text-[#64748b]">
                  Admin hasn&apos;t assigned you to a site or router yet. Check back once they&apos;ve set you up.
                </p>
              </>
            )}
          </div>
        </div>
      </div>
    </main>
  );
}
