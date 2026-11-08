"use client";

import { use, useState } from "react";
import { useRouter } from "next/navigation";
import { UserCheck } from "lucide-react";

import { useDashboard } from "@/components/dashboard/context/DashboardContext";
import {
  ActionPageLayout,
  NotFoundCard,
} from "@/components/dashboard/shared/ActionPageLayout";
import { PackageForm } from "@/components/dashboard/packages/PackageForm";
import type { PackageInput } from "@/components/dashboard/shared/types";

export default function EditPackagePage({
  params,
}: {
  params: Promise<{ packageId: string }>;
}) {
  const { packageId } = use(params);
  const router = useRouter();
  const { findPackage, updatePackage, routers, businessLocations, agents, pushPackageToAgents, removePackagePush } = useDashboard();
  const [selectedAgentIds, setSelectedAgentIds] = useState<string[]>([]);

  const pkg = findPackage(packageId);

  if (!pkg) {
    return (
      <NotFoundCard
        message="This package may have been deleted."
        backHref="/dashboards/packages"
      />
    );
  }

  function handleSubmit(input: PackageInput) {
    updatePackage(packageId, input);
    router.push("/dashboards/packages");
  }

  function toggleAgent(agentId: string) {
    setSelectedAgentIds((current) =>
      current.includes(agentId) ? current.filter((id) => id !== agentId) : [...current, agentId],
    );
  }

  function handlePush() {
    if (selectedAgentIds.length === 0) return;
    pushPackageToAgents(packageId, selectedAgentIds);
    setSelectedAgentIds([]);
  }

  // Every agent NOT already covered by the package's router/site scope —
  // pushing is for handing it to someone outside its normal reach.
  const alreadyCoveredIds = new Set(
    agents
      .filter((a) => a.routerIp && (pkg.applyToAllSites || pkg.routerIps.includes(a.routerIp)))
      .map((a) => a.id),
  );
  const eligibleAgents = agents.filter((a) => !a.isDefault && !alreadyCoveredIds.has(a.id));
  const alreadyPushedIds = new Set(pkg.pushedToAgentIds);

  return (
    <ActionPageLayout
      eyebrow="Edit package"
      title={pkg.name}
      subtitle={`Currently ${pkg.status.toLowerCase()} · ${pkg.customers} customers on this plan`}
      backHref="/dashboards/packages"
      backLabel="Back to Packages"
    >
      <PackageForm
        initialValues={pkg}
        submitLabel="Save Changes"
        onSubmit={handleSubmit}
        routers={routers}
        businessLocations={businessLocations}
      />

      <div id="push-to-agents" className="mt-6 overflow-hidden rounded-2xl border-2 border-amber-200 bg-white shadow-[0_8px_24px_rgba(37,99,235,0.06)]">
        <div className="flex items-center gap-2 border-b border-amber-200 bg-amber-50 px-5 py-4">
          <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-amber-500 text-white">
            <UserCheck size={16} />
          </span>
          <div>
            <p className="text-sm font-bold text-[#0f172a]">Push to Agents</p>
            <p className="text-xs text-[#64748b]">
              Give a specific agent access to sell this package even if their router isn&apos;t
              normally covered — they don&apos;t need &quot;Create Package&quot; permission to use it.
            </p>
          </div>
        </div>

        <div className="p-5">
          {pkg.pushedToAgentIds.length > 0 && (
            <div className="mb-4 flex flex-wrap gap-2">
              {agents
                .filter((a) => pkg.pushedToAgentIds.includes(a.id))
                .map((a) => (
                  <span
                    key={a.id}
                    className="inline-flex items-center gap-1.5 rounded-full bg-emerald-100 px-3 py-1 text-xs font-bold text-emerald-700"
                  >
                    {a.name}
                    <button
                      type="button"
                      onClick={() => removePackagePush(packageId, a.id)}
                      className="text-emerald-600 hover:text-emerald-900"
                      title="Remove access"
                    >
                      ×
                    </button>
                  </span>
                ))}
            </div>
          )}

          {eligibleAgents.length === 0 ? (
            <p className="text-sm text-[#94a3b8]">
              Every agent is already covered by this package&apos;s router/site scope.
            </p>
          ) : (
            <>
              <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
                {eligibleAgents.map((agent) => {
                  const isSelected = selectedAgentIds.includes(agent.id);
                  const isAssigned = alreadyPushedIds.has(agent.id);
                  return (
                    <label
                      key={agent.id}
                      className={`flex items-center gap-2 rounded-xl border-2 px-3 py-2.5 text-sm transition ${
                        isSelected ? "border-amber-400 bg-amber-50" : "border-[#e2e8f0] bg-white hover:bg-[#ffffff]"
                      }`}
                    >
                      <input
                        type="checkbox"
                        checked={isSelected}
                        onChange={() => toggleAgent(agent.id)}
                        disabled={isAssigned}
                        className="h-4 w-4 rounded border-[#e2e8f0] accent-amber-500"
                      />
                      <span className="min-w-0 flex-1 truncate text-[#475569]">{agent.name}</span>
                      {isAssigned && (
                        <span className="shrink-0 rounded-full bg-emerald-100 px-2 py-0.5 text-[10px] font-bold text-emerald-700">
                          Pushed
                        </span>
                      )}
                    </label>
                  );
                })}
              </div>
              <button
                type="button"
                onClick={handlePush}
                disabled={selectedAgentIds.length === 0}
                className="mt-4 inline-flex items-center gap-2 rounded-xl bg-amber-500 px-5 py-2.5 text-sm font-bold text-white hover:bg-amber-600 disabled:cursor-not-allowed disabled:opacity-50"
              >
                <UserCheck size={15} />
                Push to {selectedAgentIds.length || ""} Selected Agent{selectedAgentIds.length === 1 ? "" : "s"}
              </button>
            </>
          )}
        </div>
      </div>
    </ActionPageLayout>
  );
}
