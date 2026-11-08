"use client";

import { localizeAmountString } from "@/components/dashboard/shared/currency";
import { useMemo, useState } from "react";
import Link from "next/link";
import { ChevronRight, Filter, ClipboardList, UserCheck, Building2, Package as PackageIcon } from "lucide-react";

import { useDashboard } from "@/components/dashboard/context/DashboardContext";
import { ConnectedAgentBanner } from "@/components/dashboard/agents/ConnectedAgentBanner";
import type { VoucherStatus } from "@/components/dashboard/shared/types";

function ToggleRow({
  label,
  description,
  checked,
  onChange,
}: {
  label: string;
  description: string;
  checked: boolean;
  onChange: () => void;
}) {
  return (
    <label className="flex items-start justify-between gap-3 rounded-xl border border-[#f4f4f4] bg-[#ffffff] px-4 py-3">
      <div>
        <span className="text-sm font-semibold text-[#525252]">{label}</span>
        <p className="text-xs text-[#a3a3a3]">{description}</p>
      </div>
      <button
        type="button"
        onClick={onChange}
        className={`relative h-6 w-11 shrink-0 rounded-full transition ${
          checked ? "bg-emerald-500" : "bg-[#e6e6e6]"
        }`}
      >
        <span
          className={`absolute top-0.5 h-5 w-5 rounded-full bg-white shadow transition-transform ${
            checked ? "translate-x-5" : "translate-x-0.5"
          }`}
        />
      </button>
    </label>
  );
}

const SITE_COLOR_PALETTE = [
  { border: "border-blue-200", chip: "bg-blue-100 text-blue-700", icon: "text-blue-600", check: "accent-blue-600 border-blue-300", selected: "bg-white border-blue-300" },
  { border: "border-blue-200", chip: "bg-blue-100 text-blue-700", icon: "text-blue-600", check: "accent-blue-600 border-blue-300", selected: "bg-white border-blue-300" },
  { border: "border-blue-200", chip: "bg-blue-100 text-blue-700", icon: "text-blue-600", check: "accent-blue-600 border-blue-300", selected: "bg-blue-50 border-blue-300" },
  { border: "border-red-200", chip: "bg-red-100 text-red-700", icon: "text-red-600", check: "accent-red-600 border-red-300", selected: "bg-red-50 border-red-300" },
  { border: "border-blue-200", chip: "bg-blue-100 text-blue-700", icon: "text-blue-600", check: "accent-blue-600 border-blue-300", selected: "bg-white border-blue-300" },
  { border: "border-emerald-200", chip: "bg-emerald-100 text-emerald-700", icon: "text-emerald-600", check: "accent-emerald-600 border-emerald-300", selected: "bg-white border-emerald-300" },
] as const;

export default function BulkAssignPage() {
  const { vouchers, packages, voucherBatches, bulkAssignVouchersToBatch, bulkUpdateVoucherPackage, bulkAssignVouchersToAgents, agents, routers, businessLocations } =
    useDashboard();

  const [packageFilter, setPackageFilter] = useState("All packages");
  const [statusFilter, setStatusFilter] = useState<"All" | VoucherStatus>(
    "Available",
  );
  const [createdFrom, setCreatedFrom] = useState("");
  const [createdUntil, setCreatedUntil] = useState("");
  const [batchFilter, setBatchFilter] = useState("Any");
  const [excludeGiveaways, setExcludeGiveaways] = useState(true);
  const [excludeOnlineSales, setExcludeOnlineSales] = useState(true);

  const [assignToBatch, setAssignToBatch] = useState("");
  const [newPackageName, setNewPackageName] = useState("");
  const [limit, setLimit] = useState("");
  const [selectedAgentIds, setSelectedAgentIds] = useState<string[]>([]);

  // Agents grouped by site, each shown with their own specific router —
  // pushing vouchers to a group only actually applies per-agent where
  // that agent's router is covered by the voucher's batch.
  const agentsBySite = businessLocations.map((site) => {
    const siteRouterIps = routers.filter((r) => r.siteId === site.id).map((r) => r.ip);
    return {
      site,
      siteAgents: agents.filter((a) => a.routerIp && siteRouterIps.includes(a.routerIp)),
    };
  });
  const unassignedAgents = agents.filter(
    (a) => !a.routerIp || !businessLocations.some((s) => routers.find((r) => r.ip === a.routerIp)?.siteId === s.id),
  );

  function toggleAgent(agentId: string) {
    setSelectedAgentIds((current) =>
      current.includes(agentId) ? current.filter((id) => id !== agentId) : [...current, agentId],
    );
  }

  const matchingVouchers = useMemo(() => {
    return vouchers.filter((voucher) => {
      if (packageFilter !== "All packages" && voucher.packageName !== packageFilter)
        return false;
      if (statusFilter !== "All" && voucher.status !== statusFilter) return false;
      if (batchFilter !== "Any") {
        const batch = voucherBatches.find((b) => b.id === voucher.batchId);
        if (batch?.reference !== batchFilter) return false;
      }
      if (excludeGiveaways && voucher.saleType === "Giveaway") return false;
      if (excludeOnlineSales && voucher.saleType === "Online") return false;

      if (createdFrom || createdUntil) {
        const generated = new Date(voucher.generatedAt);
        if (createdFrom && generated < new Date(createdFrom)) return false;
        if (createdUntil && generated > new Date(createdUntil)) return false;
      }

      return true;
    });
  }, [
    vouchers,
    packageFilter,
    statusFilter,
    batchFilter,
    excludeGiveaways,
    excludeOnlineSales,
    createdFrom,
    createdUntil,
    voucherBatches,
  ]);

  function handleAssign() {
    const limitNum = limit ? Math.max(1, Number(limit)) : matchingVouchers.length;
    const codes = matchingVouchers.slice(0, limitNum).map((v) => v.code);
    const batchRef =
      assignToBatch.trim().toUpperCase() === "REMOVE"
        ? null
        : assignToBatch.trim() || null;

    if (codes.length === 0) return;
    bulkAssignVouchersToBatch(codes, batchRef);
    setAssignToBatch("");
    setLimit("");
  }

  function handleChangePackage() {
    const limitNum = limit ? Math.max(1, Number(limit)) : matchingVouchers.length;
    const codes = matchingVouchers.slice(0, limitNum).map((v) => v.code);
    if (codes.length === 0 || !newPackageName) return;
    bulkUpdateVoucherPackage(codes, newPackageName);
    setNewPackageName("");
  }

  function handlePushToAgents() {
    const limitNum = limit ? Math.max(1, Number(limit)) : matchingVouchers.length;
    const codes = matchingVouchers.slice(0, limitNum).map((v) => v.code);
    if (codes.length === 0 || selectedAgentIds.length === 0) return;
    bulkAssignVouchersToAgents(codes, selectedAgentIds);
    setSelectedAgentIds([]);
  }

  return (
    <section className="mx-auto w-full max-w-3xl">
      <div className="mb-4 flex items-center gap-1.5 text-xs text-[#a3a3a3]">
        <Link href="/dashboards/vouchers" className="hover:text-[#1a1a1a]">
          Vouchers
        </Link>
        <ChevronRight size={12} />
        <span className="text-[#525252]">Bulk Assign</span>
      </div>

      <h1 className="mb-1 text-3xl font-black text-[#1a1a1a] md:text-4xl">
        Bulk Assign Vouchers
      </h1>
      <p className="mb-6 text-sm text-[#737373]">
        Filter vouchers and assign them to a batch without manual selection.
      </p>

      <ConnectedAgentBanner />

      <div className="mb-5 rounded-2xl border border-blue-200 bg-white p-6 md:p-8">
        <div className="mb-5 flex items-center gap-2">
          <Filter size={16} className="text-blue-600" />
          <div>
            <h2 className="text-base font-bold text-[#1a1a1a]">
              Filter Vouchers
            </h2>
            <p className="text-xs text-[#737373]">
              Select criteria to filter which vouchers to assign.
            </p>
          </div>
        </div>

        <div className="grid gap-4 rounded-xl bg-white p-5 sm:grid-cols-2">
          <label className="block">
            <span className="mb-2 block text-sm font-semibold text-[#525252]">
              Package
            </span>
            <select
              value={packageFilter}
              onChange={(event) => setPackageFilter(event.target.value)}
              className="h-11 w-full rounded-xl border-2 border-emerald-300 bg-white px-3 text-sm outline-none focus:border-emerald-500"
            >
              <option>All packages</option>
              {packages.map((pkg) => (
                <option key={pkg.id} value={pkg.name}>
                  {pkg.name}
                </option>
              ))}
            </select>
          </label>

          <label className="block">
            <span className="mb-2 block text-sm font-semibold text-[#525252]">
              Status
            </span>
            <select
              value={statusFilter}
              onChange={(event) =>
                setStatusFilter(event.target.value as "All" | VoucherStatus)
              }
              className="h-11 w-full rounded-xl border border-[#e6e6e6] bg-white px-3 text-sm outline-none focus:border-[#1a1a1a]"
            >
              <option value="All">All statuses</option>
              <option value="Available">Available (Active)</option>
              <option value="Used">Used</option>
              <option value="Expired">Expired</option>
            </select>
          </label>

          <label className="block">
            <span className="mb-2 block text-sm font-semibold text-[#525252]">
              Created From
            </span>
            <input
              type="date"
              value={createdFrom}
              onChange={(event) => setCreatedFrom(event.target.value)}
              className="h-11 w-full rounded-xl border border-[#e6e6e6] bg-white px-3 text-sm outline-none focus:border-[#1a1a1a]"
            />
          </label>

          <label className="block">
            <span className="mb-2 block text-sm font-semibold text-[#525252]">
              Created Until
            </span>
            <input
              type="date"
              value={createdUntil}
              onChange={(event) => setCreatedUntil(event.target.value)}
              className="h-11 w-full rounded-xl border border-[#e6e6e6] bg-white px-3 text-sm outline-none focus:border-[#1a1a1a]"
            />
          </label>

          <label className="block">
            <span className="mb-2 block text-sm font-semibold text-[#525252]">
              Current Batch
            </span>
            <select
              value={batchFilter}
              onChange={(event) => setBatchFilter(event.target.value)}
              className="h-11 w-full rounded-xl border border-[#e6e6e6] bg-white px-3 text-sm outline-none focus:border-[#1a1a1a]"
            >
              <option>Any</option>
              {voucherBatches.filter((batch) => !batch.hiddenFromAdmin).map((batch) => (
                <option key={batch.id} value={batch.reference}>
                  {batch.reference}
                </option>
              ))}
            </select>
          </label>

          <div className="flex flex-col gap-3">
            <ToggleRow
              label="Exclude Giveaways"
              description="Exclude vouchers marked as giveaways."
              checked={excludeGiveaways}
              onChange={() => setExcludeGiveaways((c) => !c)}
            />
          </div>

          <div className="sm:col-span-2">
            <ToggleRow
              label="Exclude Online Sales"
              description="Exclude vouchers purchased online (with payments)."
              checked={excludeOnlineSales}
              onChange={() => setExcludeOnlineSales((c) => !c)}
            />
          </div>
        </div>

        <div className="mt-5 rounded-xl bg-white p-5">
          <p className="text-sm font-semibold text-[#525252]">
            Matching Vouchers
          </p>
          <p className="mt-1 text-2xl font-black text-[#1a1a1a]">
            {matchingVouchers.length}{" "}
            <span className="text-base font-semibold text-[#737373]">
              voucher{matchingVouchers.length === 1 ? "" : "s"} match your
              filter
            </span>
          </p>
        </div>
      </div>

      <div className="rounded-2xl border border-emerald-200 bg-white p-6 md:p-8">
        <div className="mb-5 flex items-center gap-2">
          <ClipboardList size={16} className="text-emerald-600" />
          <div>
            <h2 className="text-base font-bold text-[#1a1a1a]">
              Assignment
            </h2>
            <p className="text-xs text-[#737373]">
              Choose what to assign the matching vouchers to.
            </p>
          </div>
        </div>

        <div className="grid gap-4 rounded-xl bg-white p-5 sm:grid-cols-2">
          <label className="block">
            <span className="mb-2 block text-sm font-semibold text-[#525252]">
              Assign to Batch
            </span>
            <input
              value={assignToBatch}
              onChange={(event) => setAssignToBatch(event.target.value)}
              placeholder="Keep current batch"
              className="h-11 w-full rounded-xl border border-[#e6e6e6] bg-white px-3 text-sm outline-none focus:border-[#1a1a1a]"
            />
            <span className="mt-1 block text-xs text-[#a3a3a3]">
              Enter a batch name, or type &quot;REMOVE&quot; to clear it.
            </span>
          </label>

          <label className="block">
            <span className="mb-2 block text-sm font-semibold text-[#525252]">
              Limit (Optional)
            </span>
            <input
              type="number"
              min={1}
              value={limit}
              onChange={(event) => setLimit(event.target.value)}
              placeholder="All matching"
              className="h-11 w-full rounded-xl border border-[#e6e6e6] bg-white px-3 text-sm outline-none focus:border-[#1a1a1a]"
            />
            <span className="mt-1 block text-xs text-[#a3a3a3]">
              Limit how many vouchers to assign.
            </span>
          </label>
        </div>

        <div className="mt-5 rounded-xl border-2 border-blue-200 bg-blue-50/40 p-4">
          <div className="mb-2 flex items-center gap-2">
            <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-blue-500 text-white">
              <PackageIcon size={16} />
            </span>
            <div>
              <p className="text-sm font-bold text-[#1a1a1a]">Switch Package Rules (optional)</p>
              <p className="text-xs text-[#737373]">
                Move the matching vouchers onto a different package —
                daily, weekly, a fixed data cap, whatever plan you pick —
                without regenerating them.
              </p>
            </div>
          </div>
          <div className="flex flex-wrap items-end gap-3">
            <label className="block">
              <span className="mb-1.5 block text-xs font-semibold text-[#525252]">New package</span>
              <select
                value={newPackageName}
                onChange={(event) => setNewPackageName(event.target.value)}
                className="h-10 w-56 rounded-lg border border-blue-200 bg-white px-3 text-sm outline-none focus:border-blue-500"
              >
                <option value="">Select a package</option>
                {packages.map((pkg) => (
                  <option key={pkg.id} value={pkg.name}>
                    {pkg.name} · {localizeAmountString(pkg.price)}
                  </option>
                ))}
              </select>
            </label>
            <button
              type="button"
              onClick={handleChangePackage}
              disabled={!newPackageName || matchingVouchers.length === 0}
              className="h-10 rounded-lg bg-blue-500 px-4 text-sm font-bold text-white hover:bg-blue-600 disabled:cursor-not-allowed disabled:opacity-50"
            >
              Apply to {limit ? Math.min(Number(limit), matchingVouchers.length) : matchingVouchers.length} voucher(s)
            </button>
          </div>
        </div>

        <div className="mt-5 rounded-xl border-2 border-amber-200 bg-white p-4">
          <div className="mb-2 flex items-center gap-2">
            <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-amber-500 text-white">
              <UserCheck size={16} />
            </span>
            <div>
              <p className="text-sm font-bold text-[#1a1a1a]">Push to Agents (optional)</p>
              <p className="text-xs text-[#737373]">
                Pick any number of agents across one or more sites — each only
                receives the matching vouchers whose router is actually theirs.
              </p>
            </div>
          </div>

          {agents.length === 0 ? (
            <p className="text-xs text-[#a3a3a3]">No agents yet.</p>
          ) : (
            <div className="max-h-72 space-y-2 overflow-y-auto rounded-xl border border-amber-200 bg-white p-2.5">
              {agentsBySite.map(({ site, siteAgents }, siteIndex) => {
                if (siteAgents.length === 0) return null;
                const palette = SITE_COLOR_PALETTE[siteIndex % SITE_COLOR_PALETTE.length];
                const selectedInSite = siteAgents.filter((a) => selectedAgentIds.includes(a.id)).length;
                return (
                  <div key={site.id} className={`rounded-lg border-2 ${palette.border} p-2`}>
                    <div className="mb-1.5 flex items-center justify-between gap-2">
                      <span className={`inline-flex items-center gap-1.5 rounded-full px-2 py-0.5 text-[11px] font-bold uppercase tracking-wide ${palette.chip}`}>
                        <Building2 size={11} className={palette.icon} />
                        {site.name}
                      </span>
                      <div className="flex items-center gap-2">
                        {selectedInSite > 0 && (
                          <span className={`rounded-full px-2 py-0.5 text-[10px] font-bold ${palette.chip}`}>
                            {selectedInSite} selected
                          </span>
                        )}
                        <button
                          type="button"
                          onClick={() => {
                            const siteAgentIds = siteAgents.map((a) => a.id);
                            const allSelected = siteAgentIds.every((id) => selectedAgentIds.includes(id));
                            setSelectedAgentIds((current) =>
                              allSelected
                                ? current.filter((id) => !siteAgentIds.includes(id))
                                : [...new Set([...current, ...siteAgentIds])],
                            );
                          }}
                          className="text-[10px] font-semibold text-[#1a1a1a] hover:underline"
                        >
                          {siteAgents.every((a) => selectedAgentIds.includes(a.id)) ? "Unselect site" : "Select whole site"}
                        </button>
                      </div>
                    </div>
                    <div className="grid gap-1 sm:grid-cols-2">
                      {siteAgents.map((agent) => {
                        const agentRouter = routers.find((r) => r.ip === agent.routerIp);
                        const isSelected = selectedAgentIds.includes(agent.id);
                        return (
                          <label
                            key={agent.id}
                            className={`flex items-center gap-2 rounded-lg border px-1.5 py-1.5 text-xs transition ${
                              isSelected ? palette.selected : "border-transparent text-[#525252] hover:bg-[#ffffff]"
                            }`}
                          >
                            <input
                              type="checkbox"
                              checked={isSelected}
                              onChange={() => toggleAgent(agent.id)}
                              className={`h-3.5 w-3.5 shrink-0 rounded ${palette.check}`}
                            />
                            <span className="truncate">
                              <span className={isSelected ? "font-semibold text-[#1a1a1a]" : ""}>{agent.name}</span>
                              <span className="ml-1 text-[10px] text-[#a3a3a3]">
                                ({agentRouter ? agentRouter.name.split(" (")[0] : "no router"})
                              </span>
                            </span>
                          </label>
                        );
                      })}
                    </div>
                  </div>
                );
              })}
              {unassignedAgents.length > 0 && (
                <div className="rounded-lg border-2 border-slate-200 p-2">
                  <span className="mb-1.5 inline-flex items-center rounded-full bg-slate-100 px-2 py-0.5 text-[11px] font-bold uppercase tracking-wide text-slate-700">
                    No site assigned
                  </span>
                  <div className="grid gap-1 sm:grid-cols-2">
                    {unassignedAgents.map((agent) => {
                      const isSelected = selectedAgentIds.includes(agent.id);
                      return (
                        <label
                          key={agent.id}
                          className={`flex items-center gap-2 rounded-lg border px-1.5 py-1.5 text-xs transition ${
                            isSelected ? "border-slate-300 bg-slate-50" : "border-transparent text-[#525252] hover:bg-[#ffffff]"
                          }`}
                        >
                          <input
                            type="checkbox"
                            checked={isSelected}
                            onChange={() => toggleAgent(agent.id)}
                            className="h-3.5 w-3.5 shrink-0 rounded accent-slate-600 border-slate-300"
                          />
                          <span className={`truncate ${isSelected ? "font-semibold text-[#1a1a1a]" : ""}`}>{agent.name}</span>
                        </label>
                      );
                    })}
                  </div>
                </div>
              )}
            </div>
          )}

          <div className="mt-2 flex flex-wrap items-center justify-between gap-2">
            <button
              type="button"
              onClick={() => setSelectedAgentIds(agents.map((a) => a.id))}
              className="text-xs font-semibold text-amber-700 hover:underline"
            >
              Select all agents (every site)
            </button>
            {selectedAgentIds.length > 0 && (
              <span className="rounded-full bg-amber-500 px-2.5 py-1 text-xs font-bold text-white">
                {selectedAgentIds.length} agent{selectedAgentIds.length === 1 ? "" : "s"} selected
              </span>
            )}
          </div>

          <button
            type="button"
            onClick={handlePushToAgents}
            disabled={matchingVouchers.length === 0 || selectedAgentIds.length === 0}
            className="mt-3 w-full rounded-xl bg-amber-500 px-5 py-3 text-sm font-bold text-white hover:bg-amber-600 disabled:cursor-not-allowed disabled:bg-[#e6e6e6] disabled:text-[#a3a3a3]"
          >
            Push Matching Vouchers to Selected Agents
          </button>
        </div>

        <div className="mt-6 flex flex-wrap gap-3">
          <button
            type="button"
            onClick={handleAssign}
            disabled={matchingVouchers.length === 0}
            className="rounded-xl bg-emerald-600 px-6 py-3 text-sm font-bold text-white  hover:bg-emerald-700 disabled:cursor-not-allowed disabled:from-[#e6e6e6] disabled:to-[#e6e6e6] disabled:text-[#a3a3a3] disabled:shadow-none"
          >
            Assign Vouchers
          </button>
          <Link
            href="/dashboards/vouchers"
            className="rounded-xl border border-[#e6e6e6] bg-white px-6 py-3 text-sm font-bold text-[#525252] hover:bg-[#ffffff]"
          >
            Cancel
          </Link>
        </div>
      </div>
    </section>
  );
}
