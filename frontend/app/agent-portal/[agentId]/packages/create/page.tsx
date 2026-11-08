"use client";

import { use } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { ChevronRight } from "lucide-react";

import { useDashboard } from "@/components/dashboard/context/DashboardContext";
import { AgentPortalPage } from "@/components/agent-portal/AgentPortalPage";
import { PackageForm } from "@/components/dashboard/packages/PackageForm";
import type { PackageInput } from "@/components/dashboard/shared/types";

export default function AgentCreatePackagePage({
  params,
}: {
  params: Promise<{ agentId: string }>;
}) {
  const { agentId } = use(params);
  const router = useRouter();
  const { addPackage, routers, businessLocations } = useDashboard();

  return (
    <AgentPortalPage
      agentId={agentId}
      permissionKey="packages.create"
      featureLabel="Creating packages"
      render={(agent) => (
        <section className="mx-auto w-full max-w-3xl">
          <div className="mb-4 flex items-center gap-1.5 text-xs text-[#a3a3a3]">
            <Link href={`/agent-portal/${agentId}/packages`} className="hover:text-[#1a1a1a]">
              Packages
            </Link>
            <ChevronRight size={12} />
            <span className="text-[#525252]">Create</span>
          </div>

          <h1 className="mb-6 text-3xl font-black text-[#1a1a1a] md:text-4xl">Create Package</h1>

          <PackageForm
            submitLabel="Create"
            onSubmit={(input: PackageInput) => {
              addPackage(input);
              router.push(`/agent-portal/${agentId}/packages`);
            }}
            onSubmitAndCreateAnother={(input: PackageInput) => addPackage(input)}
            routers={routers}
            businessLocations={businessLocations}
            actingAgent={agent}
          />

          <div className="mt-4">
            <Link
              href={`/agent-portal/${agentId}/packages`}
              className="text-sm font-semibold text-[#737373] hover:text-[#525252]"
            >
              Cancel
            </Link>
          </div>
        </section>
      )}
    />
  );
}
