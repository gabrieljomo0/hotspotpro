"use client";

import { use } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { ChevronRight } from "lucide-react";

import { useDashboard } from "@/components/dashboard/context/DashboardContext";
import { AgentPortalPage } from "@/components/agent-portal/AgentPortalPage";
import { getPackageRights } from "@/components/dashboard/agents/agentPackages";
import { PackageForm } from "@/components/dashboard/packages/PackageForm";
import type { PackageInput } from "@/components/dashboard/shared/types";

export default function AgentEditPackagePage({
  params,
}: {
  params: Promise<{ agentId: string; packageId: string }>;
}) {
  const { agentId, packageId } = use(params);
  const router = useRouter();
  const { findPackage, updatePackage, routers, businessLocations } = useDashboard();
  const pkg = findPackage(packageId);

  return (
    <AgentPortalPage
      agentId={agentId}
      permissionKey="packages.view"
      featureLabel="Packages"
      render={(agent) => {
        if (!pkg) {
          return (
            <div className="rounded-2xl bg-white p-10 text-center text-sm text-[#94a3b8]">
              This package may have been deleted.
            </div>
          );
        }

        // Whether the agent may edit THIS package depends on who created it:
        // their own → "edit a package they created"; admin's (including
        // anything pushed to them) → the separate "…admin created or pushed
        // to them" permission. Opening the URL directly doesn't get around it.
        const rights = getPackageRights(agent, pkg);
        if (!rights.canEdit) {
          return (
            <section className="mx-auto w-full max-w-md rounded-2xl bg-white p-8 text-center shadow-sm">
              <h1 className="mb-2 text-lg font-bold text-[#0f172a]">You can&apos;t edit this package</h1>
              <p className="text-sm text-[#64748b]">
                {rights.isOwn
                  ? "Admin hasn't allowed you to edit packages you create."
                  : "This package belongs to admin, and you haven't been given permission to edit it."}{" "}
                Ask admin if you need a change made.
              </p>
              <Link
                href={`/agent-portal/${agentId}/packages`}
                className="mt-5 inline-block text-sm font-semibold text-[#2563eb] hover:underline"
              >
                ← Back to Packages
              </Link>
            </section>
          );
        }

        return (
          <section className="mx-auto w-full max-w-3xl">
            <div className="mb-4 flex items-center gap-1.5 text-xs text-[#94a3b8]">
              <Link href={`/agent-portal/${agentId}/packages`} className="hover:text-[#2563eb]">
                Packages
              </Link>
              <ChevronRight size={12} />
              <span className="text-[#475569]">{pkg.name}</span>
            </div>

            <h1 className="mb-1 text-3xl font-black text-[#0f172a] md:text-4xl">{pkg.name}</h1>
            <p className="mb-6 text-sm text-[#64748b]">
              Currently {pkg.status.toLowerCase()} · {pkg.customers} customers on this plan
            </p>

            <PackageForm
              initialValues={pkg}
              submitLabel="Save Changes"
              onSubmit={(input: PackageInput) => {
                updatePackage(packageId, input);
                router.push(`/agent-portal/${agentId}/packages`);
              }}
              routers={routers}
              businessLocations={businessLocations}
              actingAgent={agent}
            />
          </section>
        );
      }}
    />
  );
}
