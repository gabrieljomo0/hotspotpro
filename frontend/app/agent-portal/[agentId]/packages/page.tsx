"use client";

import { localizeAmountString } from "@/components/dashboard/shared/currency";
import { use, useState } from "react";
import Link from "next/link";
import { Package as PackageIcon, Plus, Zap, Copy, Ban, Pencil } from "lucide-react";

import { useDashboard } from "@/components/dashboard/context/DashboardContext";
import { AgentPortalPage } from "@/components/agent-portal/AgentPortalPage";
import { getSellablePackages, getPackageRights } from "@/components/dashboard/agents/agentPackages";
import { QuickCreatePackageModal } from "@/components/agent-portal/QuickCreatePackageModal";
import { ConfirmDialog } from "@/components/dashboard/shared/ConfirmDialog";

export default function AgentPackagesPage({
  params,
}: {
  params: Promise<{ agentId: string }>;
}) {
  const { agentId } = use(params);
  const { packages, duplicatePackage, setPackageStatus, addPackage, routers } = useDashboard();
  const [quickOpen, setQuickOpen] = useState(false);
  const [disableTarget, setDisableTarget] = useState<{ id: string; name: string } | null>(null);

  return (
    <AgentPortalPage
      agentId={agentId}
      permissionKey="packages.view"
      featureLabel="Packages"
      render={(agent) => {
        const availablePackages = getSellablePackages(packages, agent);
        const canCreate = agent.permissions["packages.create"] === "Allowed";
        const canViewPricing = agent.permissions["packages.viewPricing"] === "Allowed";
        const canViewSubscribers = agent.permissions["packages.viewSubscribers"] === "Allowed";
        return (
          <section>
            <div className="mb-5 flex flex-wrap items-start justify-between gap-3">
              <div>
                <h1 className="flex items-center gap-2 text-2xl font-black md:text-3xl">
                  <PackageIcon size={26} className="text-[#2563eb]" />
                  Packages
                </h1>
                <p className="mt-1 text-sm text-[#64748b]">
                  What&apos;s available to sell on your router — {availablePackages.length} package
                  {availablePackages.length === 1 ? "" : "s"}.
                </p>
              </div>
              {canCreate && (
                <div className="flex flex-wrap gap-2">
                  <button
                    type="button"
                    data-testid="quick-create-btn"
                    onClick={() => setQuickOpen(true)}
                    className="inline-flex items-center gap-2 rounded-xl border-2 bg-[#f1f5f9] px-4 py-2.5 text-sm font-bold text-[#2563eb] hover:bg-white"
                  >
                    <Zap size={16} />
                    Quick Create
                  </button>
                  <Link
                    href={`/agent-portal/${agentId}/packages/create`}
                    className="inline-flex items-center gap-2 rounded-xl bg-[#2563eb] px-4 py-2.5 text-sm font-bold text-white hover:bg-[#1d4ed8]"
                  >
                    <Plus size={16} />
                    Create Package
                  </Link>
                </div>
              )}
            </div>

            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {availablePackages.map((pkg) => {
                const rights = getPackageRights(agent, pkg);
                const hasRowActions = rights.canEdit || rights.canDuplicate || rights.canDisableDelete;
                return (
                <article
                  key={pkg.id}
                  className="rounded-2xl bg-white p-5 shadow-sm"
                >
                  <div className="mb-2 flex items-center justify-between">
                    <p className="font-bold text-[#0f172a]">{pkg.name}</p>
                    <div className="flex items-center gap-1.5">
                      {pkg.pushedToAgentIds.includes(agent.id) &&
                        !pkg.applyToAllSites &&
                        !(agent.routerIp && pkg.routerIps.includes(agent.routerIp)) && (
                          <span className="rounded-full bg-[#f1f5f9] px-2 py-0.5 text-[10px] font-bold text-[#2563eb]">
                            Pushed to you
                          </span>
                        )}
                      {!rights.isOwn && (
                        <span className="rounded-full bg-slate-100 px-2 py-0.5 text-[10px] font-bold text-slate-600">
                          Managed by admin
                        </span>
                      )}
                      {pkg.featured && <Zap size={14} className="text-[#2563eb]" />}
                    </div>
                  </div>
                  <p className="mb-3 text-xs text-[#64748b]">{pkg.description || pkg.validity}</p>
                  <div className="mb-3 flex items-center justify-between text-sm">
                    <span className="text-[#64748b]">{pkg.validity} · {pkg.download}</span>
                    {canViewPricing && <span className="font-black text-[#2563eb]">{localizeAmountString(pkg.price)}</span>}
                  </div>
                  {canViewSubscribers && (
                    <p className="mb-3 text-xs text-[#94a3b8]">{pkg.customers} customer{pkg.customers === 1 ? "" : "s"} subscribed</p>
                  )}
                  {hasRowActions && (
                    <div className="flex items-center gap-2 border-t border-[#f1f5f9] pt-3">
                      {rights.canEdit && (
                        <Link
                          href={`/agent-portal/${agentId}/packages/${pkg.id}`}
                          className="inline-flex items-center gap-1 rounded-lg px-2.5 py-1.5 text-xs font-semibold text-[#475569] hover:bg-[#f8fafc]"
                        >
                          <Pencil size={12} />
                          Edit
                        </Link>
                      )}
                      {rights.canDuplicate && (
                        <button
                          type="button"
                          onClick={() => duplicatePackage(pkg.id)}
                          className="inline-flex items-center gap-1 rounded-lg px-2.5 py-1.5 text-xs font-semibold text-[#475569] hover:bg-[#f8fafc]"
                        >
                          <Copy size={12} />
                          Duplicate
                        </button>
                      )}
                      {rights.canDisableDelete && (
                        <button
                          type="button"
                          onClick={() => setDisableTarget({ id: pkg.id, name: pkg.name })}
                          className="inline-flex items-center gap-1 rounded-lg border-red-200 px-2.5 py-1.5 text-xs font-semibold text-red-600 hover:bg-red-50"
                        >
                          <Ban size={12} />
                          Disable
                        </button>
                      )}
                    </div>
                  )}
                </article>
                );
              })}
              {availablePackages.length === 0 && (
                <div className="col-span-full rounded-2xl bg-white p-10 text-center text-sm text-[#94a3b8]">
                  No packages available to you yet.{" "}
                  {canCreate
                    ? "Use Quick Create or Create Package above to add one, or ask admin to push you one."
                    : "Ask admin to push a package to you."}
                </div>
              )}
            </div>

            {quickOpen && canCreate && (
              <QuickCreatePackageModal
                agent={agent}
                routers={routers}
                onClose={() => setQuickOpen(false)}
                onCreate={(input) => {
                  if (addPackage(input)) setQuickOpen(false);
                }}
              />
            )}

            <ConfirmDialog
              open={disableTarget !== null}
              title="Disable this package?"
              subtitle={disableTarget?.name}
              confirmLabel="Yes, disable package"
              cancelLabel="Keep it"
              points={[
                "Nobody can buy it or generate new vouchers from it while it's disabled — that includes other agents and customers on the same package.",
                "Vouchers already generated from it stay valid and keep working.",
                "It disappears from your list straight away, and you can't switch it back on yourself — you'd need admin to re-enable it.",
              ]}
              onCancel={() => setDisableTarget(null)}
              onConfirm={() => {
                if (disableTarget) setPackageStatus(disableTarget.id, "Disabled");
                setDisableTarget(null);
              }}
            />
          </section>
        );
      }}
    />
  );
}
