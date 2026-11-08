"use client";

import { sym } from "@/components/dashboard/shared/currency";
import { useState } from "react";
import { useSearchParams } from "next/navigation";
import Link from "next/link";
import {
  Router as RouterIcon,
  Building2,
  Users,
  Banknote,
  TrendingUp,
  CheckCircle2,
  Clock,
  XCircle,
  ListFilter,
  X,
} from "lucide-react";

import { useDashboard } from "@/components/dashboard/context/DashboardContext";
import { BackLink } from "@/components/dashboard/shared/BackLink";

function parsePrice(price: string): number {
  const match = price.match(/[\d,.]+/);
  return match ? parseFloat(match[0].replace(/,/g, "")) : 0;
}

export default function RouterAgentRevenuePage() {
  const { vouchers, voucherBatches, packages, agents, routers, businessLocations } = useDashboard();
  const searchParams = useSearchParams();

  const [siteFilter, setSiteFilter] = useState(searchParams.get("site") ?? "All");
  const [routerFilter, setRouterFilter] = useState(searchParams.get("router") ?? "All");
  const [agentFilter, setAgentFilter] = useState("All");
  const [fromDate, setFromDate] = useState("");
  const [toDate, setToDate] = useState("");

  const priceByPackage = Object.fromEntries(packages.map((p) => [p.name, parsePrice(p.price)]));
  const batchById = new Map<string, (typeof voucherBatches)[number]>(voucherBatches.map((b) => [b.id, b]));
  const defaultAgentId = agents.find((a) => a.isDefault)?.id ?? null;

  // Which router(s) a voucher actually belongs to — its BATCH's
  // routerIps, not the selling agent's own assigned router. A router
  // with no dedicated agent still has real sales (admin sold them
  // directly), and this is the only way to find those: the agent who
  // made the sale (admin included) may not be "assigned" to this router
  // at all, but the batch still says which router(s) it was for.
  function routerIpsForVoucher(v: (typeof vouchers)[number]): string[] {
    return v.batchId ? (batchById.get(v.batchId)?.routerIps ?? []) : [];
  }

  // --- Filter scope: which routers/agents are in play right now ---
  // Linked dropdowns: a router fills in its site; an agent fills in their
  // router and site.
  function pickRouter(ip: string) {
    setRouterFilter(ip);
    setAgentFilter("All");
    const router = routers.find((r) => r.ip === ip);
    if (router?.siteId) setSiteFilter(router.siteId);
  }
  function pickAgent(id: string) {
    setAgentFilter(id);
    const agent = agents.find((a) => a.id === id);
    const router = agent?.routerIp ? routers.find((r) => r.ip === agent.routerIp) : undefined;
    if (router) {
      setRouterFilter(router.ip);
      if (router.siteId) setSiteFilter(router.siteId);
    }
  }

  const routersForSite = siteFilter === "All" ? routers : routers.filter((r) => r.siteId === siteFilter);
  const routersInScope = routerFilter === "All" ? routersForSite : routersForSite.filter((r) => r.ip === routerFilter);
  const routerIpsInScope = new Set(routersInScope.map((r) => r.ip));

  // The agent picker still lists people "assigned" to a router in scope
  // (the normal, expected set to filter by) — admin's own sales from
  // are covered separately below regardless of this list.
  const agentsForRouter = routerFilter === "All" ? agents.filter((a) => a.routerIp && routerIpsInScope.has(a.routerIp)) : agents.filter((a) => a.routerIp === routerFilter);
  const agentsInScope = agentFilter === "All" ? agentsForRouter : agentsForRouter.filter((a) => a.id === agentFilter);

  const fromMs = fromDate ? new Date(fromDate + "T00:00:00").getTime() : null;
  const toMs = toDate ? new Date(toDate + "T23:59:59").getTime() : null;

  const hasFilter = siteFilter !== "All" || routerFilter !== "All" || agentFilter !== "All" || fromDate || toDate;

  function inDateRange(ms: number) {
    if (fromMs !== null && ms < fromMs) return false;
    if (toMs !== null && ms > toMs) return false;
    return true;
  }

  // Every voucher whose batch touches a router in scope — covers agent
  // sales AND admin's own sales from the router (routers with no agent working
  // them still show up here), filtered down to one seller only when a
  // specific agent is picked.
  const scopedVouchers = vouchers.filter((v) => {
    if (!inDateRange(v.generatedAtMs)) return false;
    if (!routerIpsForVoucher(v).some((ip) => routerIpsInScope.has(ip))) return false;
    if (agentFilter !== "All") return v.agentId === agentFilter;
    return true;
  });

  function statsFromVouchers(list: typeof vouchers) {
    const sold = list.filter((v) => v.status === "Used");
    const available = list.filter((v) => v.status === "Available").length;
    const expired = list.filter((v) => v.status === "Expired").length;
    const revenue = sold.reduce((sum, v) => sum + (priceByPackage[v.packageName] ?? 0), 0);
    return { generated: list.length, sold: sold.length, available, expired, revenue };
  }

  // Same stats, but for one seller (agent or admin) on one specific
  // router — used inside each router's block so a person selling across
  // several routers in the same site doesn't have their numbers mixed
  // together under just one of them.
  function statsForSellerOnRouter(agentId: string, routerIp: string) {
    return statsFromVouchers(
      scopedVouchers.filter((v) => v.agentId === agentId && routerIpsForVoucher(v).includes(routerIp)),
    );
  }

  function statsForAgent(agentId: string) {
    return statsFromVouchers(scopedVouchers.filter((v) => v.agentId === agentId));
  }

  const grandTotals = statsFromVouchers(scopedVouchers);

  const siteGroups = businessLocations
    .filter((s) => siteFilter === "All" || siteFilter === s.id)
    .map((site) => ({
      site,
      siteRouters: routersInScope.filter((r) => r.siteId === site.id),
    }));
  const unassignedRouters = routersInScope.filter((r) => !businessLocations.some((s) => s.id === r.siteId));

  function clearFilters() {
    setSiteFilter("All");
    setRouterFilter("All");
    setAgentFilter("All");
    setFromDate("");
    setToDate("");
  }

  function renderRouterBlock(router: (typeof routers)[number], isLast: boolean) {
    // The name admin gave this router — used as the label for its own
    // direct sales, so it reads as "Main Router: 3 · GH₵15" rather than
    // a generic phrase.
    const routerName = router.name.split(" (")[0];
    // Every voucher actually touching this specific router, whoever sold
    // it — this is what "belongs to this router" means, not who admin
    // happened to assign here.
    const routerVouchers = scopedVouchers.filter((v) => routerIpsForVoucher(v).includes(router.ip));
    const sellerIds = new Set(routerVouchers.map((v) => v.agentId));

    // Agents who actually sold something on this router, in the current
    // filter — not just whoever is "assigned" here, so a shared-batch
    // sale from another agent still shows up.
    const routerAgents = agents.filter((a) => !a.isDefault && sellerIds.has(a.id));
    // Admin's own sales from this router — the case that used to
    // vanish entirely when a router had no dedicated agent.
    const directVouchers = defaultAgentId ? routerVouchers.filter((v) => v.agentId === defaultAgentId) : [];
    const directStats = statsFromVouchers(directVouchers);
    const hasDirectSales = directVouchers.length > 0;

    const routerTotal =
      routerAgents.reduce((sum, a) => sum + statsForSellerOnRouter(a.id, router.ip).revenue, 0) + directStats.revenue;
    const routerSold =
      routerAgents.reduce((sum, a) => sum + statsForSellerOnRouter(a.id, router.ip).sold, 0) + directStats.sold;

    return (
      <div key={router.ip} className={`overflow-hidden rounded-xl bg-white ${isLast ? "" : "mb-3"}`}>
        <div className="rounded-t-xl border-2 border-b-0 border-blue-300 bg-blue-600 px-4 py-3">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <span className="flex items-center gap-2 text-sm font-bold text-white">
              <RouterIcon size={15} />
              {router.name.split(" (")[0]}
            </span>
            <span className="rounded-full bg-white px-3 py-1 text-xs font-black text-blue-700">
              {sym()} {routerTotal.toLocaleString()}
            </span>
          </div>
          <div className="mt-2 flex flex-wrap items-center gap-2 text-[11px] font-semibold text-white/90">
            <span className="rounded-full bg-white/15 px-2 py-0.5">IP: {router.ip}</span>
            <span
              className={`rounded-full px-2 py-0.5 ${
                router.status === "Online" ? "bg-emerald-400 text-emerald-950" : "bg-slate-300 text-slate-800"
              }`}
            >
              {router.status}
            </span>
            <span className="rounded-full bg-white/15 px-2 py-0.5">{router.clients} client{router.clients === 1 ? "" : "s"} now</span>
            {hasDirectSales && (
              <span className="rounded-full bg-amber-300 px-2 py-0.5 font-bold text-amber-950">
                {routerName}: {directStats.sold} · {sym()} {directStats.revenue.toLocaleString()}
              </span>
            )}
            <span className="rounded-full bg-white/15 px-2 py-0.5">
              {routerAgents.length === 0 ? "No agent" : `${routerAgents.length} agent${routerAgents.length === 1 ? "" : "s"}`}
            </span>
            <span className="rounded-full bg-white/15 px-2 py-0.5">{routerSold} sold</span>
          </div>
        </div>

        {routerAgents.length === 0 && !hasDirectSales ? (
          <p className="rounded-b-xl border-2 border-t-0 border-blue-300 px-4 py-4 text-sm text-[#a3a3a3]">
            No sales on this router yet for this filter.
          </p>
        ) : (
          <table className="w-full rounded-b-xl border-2 border-t-0 border-blue-300 text-left text-sm">
            <thead className="bg-blue-50 text-xs font-bold text-blue-900">
              <tr>
                <th className="px-4 py-2.5">Agent</th>
                <th className="px-4 py-2.5">Role</th>
                <th className="px-4 py-2.5">Generated</th>
                <th className="px-4 py-2.5">Sold</th>
                <th className="px-4 py-2.5">Available</th>
                <th className="px-4 py-2.5">Expired</th>
                <th className="px-4 py-2.5">Revenue</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#f4f4f4]">
              {hasDirectSales && (
                <tr className="bg-amber-50 hover:bg-amber-50">
                  <td className="px-4 py-2.5">
                    <span className="font-bold text-amber-800">{router.name.split(" (")[0]}</span>
                  </td>
                  <td className="px-4 py-2.5 text-amber-700">No agent — sold directly by admin on this router</td>
                  <td className="px-4 py-2.5 font-semibold text-[#1a1a1a]">{directStats.generated}</td>
                  <td className="px-4 py-2.5 font-semibold text-[#1a1a1a]">{directStats.sold}</td>
                  <td className="px-4 py-2.5">
                    <span className="rounded-full bg-emerald-100 px-2 py-0.5 text-xs font-bold text-emerald-700">
                      {directStats.available}
                    </span>
                  </td>
                  <td className="px-4 py-2.5">
                    <span className="rounded-full bg-red-100 px-2 py-0.5 text-xs font-bold text-red-700">
                      {directStats.expired}
                    </span>
                  </td>
                  <td className="px-4 py-2.5">
                    <span className="rounded-full bg-emerald-500 px-2.5 py-1 text-xs font-black text-white">
                      {sym()} {directStats.revenue.toLocaleString()}
                    </span>
                  </td>
                </tr>
              )}
              {routerAgents.map((agent) => {
                const stats = statsForSellerOnRouter(agent.id, router.ip);
                return (
                  <tr key={agent.id} className="hover:bg-blue-50">
                    <td className="px-4 py-2.5">
                      <Link href={`/dashboards/agents/${agent.id}`} className="font-bold text-[#1a1a1a] hover:underline">
                        {agent.name}
                      </Link>
                    </td>
                    <td className="px-4 py-2.5 text-[#737373]">{agent.role}</td>
                    <td className="px-4 py-2.5 font-semibold text-[#1a1a1a]">{stats.generated}</td>
                    <td className="px-4 py-2.5 font-semibold text-[#1a1a1a]">{stats.sold}</td>
                    <td className="px-4 py-2.5">
                      <span className="rounded-full bg-emerald-100 px-2 py-0.5 text-xs font-bold text-emerald-700">
                        {stats.available}
                      </span>
                    </td>
                    <td className="px-4 py-2.5">
                      <span className="rounded-full bg-red-100 px-2 py-0.5 text-xs font-bold text-red-700">
                        {stats.expired}
                      </span>
                    </td>
                    <td className="px-4 py-2.5">
                      <span className="rounded-full bg-emerald-500 px-2.5 py-1 text-xs font-black text-white">
                        {sym()} {stats.revenue.toLocaleString()}
                      </span>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        )}
      </div>
    );
  }

  // Full, individual sale-by-sale detail — every completed sale for
  // whoever/whatever is currently in scope, newest first.
  const fullSalesDetails = scopedVouchers
    .filter((v) => v.status === "Used")
    .sort((a, b) => b.generatedAtMs - a.generatedAtMs);

  return (
    <section className="w-full">
      <BackLink />

      <div className="mb-6 rounded-2xl bg-[#111111] p-6  md:p-8">
        <div className="flex flex-col justify-between gap-4 md:flex-row md:items-center">
          <div className="text-white">
            <p className="mb-1 flex items-center gap-2 text-xs font-bold uppercase tracking-wide text-white/80">
              <TrendingUp size={14} />
              Revenue Breakdown
            </p>
            <h2 className="text-3xl font-bold tracking-tight md:text-4xl">
              Router &amp; Agent Revenue
            </h2>
            <p className="mt-2 max-w-xl text-sm text-white/90 md:text-base">
              Full sales statistics for every router and agent — filter it
              down to exactly what you want to see.
            </p>
          </div>
          <div className="rounded-2xl bg-white px-6 py-4 text-center shadow-lg">
            <p className="flex items-center justify-center gap-1.5 text-xs font-bold uppercase tracking-wide text-emerald-600">
              <Banknote size={13} />
              {hasFilter ? "Filtered Total" : "Grand Total"}
            </p>
            <p className="mt-1 text-3xl font-black text-[#1a1a1a]">{sym()} {grandTotals.revenue.toLocaleString()}</p>
          </div>
        </div>
      </div>

      {/* Filters */}
      <div className="mb-6 rounded-2xl border-2 border-[#e6e6e6] bg-white p-4 shadow-[0_8px_24px_rgba(26,26,26,0.06)]">
        <div className="mb-3 flex items-center gap-2 text-xs font-bold uppercase tracking-wide text-[#a3a3a3]">
          <ListFilter size={14} />
          Filter this page
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <div className="flex items-center gap-1.5">
            <Building2 size={14} className="text-blue-500" />
            <select
              value={siteFilter}
              onChange={(event) => {
                setSiteFilter(event.target.value);
                setRouterFilter("All");
                setAgentFilter("All");
              }}
              className="h-10 rounded-lg border-2 border-blue-200 bg-white px-3 text-sm font-semibold text-blue-700 outline-none focus:border-blue-500"
            >
              <option value="All">All sites</option>
              {businessLocations.map((site) => (
                <option key={site.id} value={site.id}>
                  {site.name}
                </option>
              ))}
            </select>
          </div>

          <div className="flex items-center gap-1.5">
            <RouterIcon size={14} className="text-blue-500" />
            <select
              value={routerFilter}
              onChange={(event) => pickRouter(event.target.value)}
              className="h-10 rounded-lg border-2 border-blue-200 bg-white px-3 text-sm font-semibold text-blue-700 outline-none focus:border-blue-500"
            >
              <option value="All">All routers</option>
              {routersForSite.map((r) => (
                <option key={r.ip} value={r.ip}>
                  {r.name.split(" (")[0]}
                </option>
              ))}
            </select>
          </div>

          <div className="flex items-center gap-1.5">
            <Users size={14} className="text-blue-500" />
            <select
              value={agentFilter}
              onChange={(event) => pickAgent(event.target.value)}
              className="h-10 rounded-lg border-2 border-blue-200 bg-white px-3 text-sm font-semibold text-blue-700 outline-none focus:border-blue-500"
            >
              <option value="All">All agents</option>
              {defaultAgentId && (
                <option value={defaultAgentId}>Admin (No Agent)</option>
              )}
              {agentsForRouter.map((a) => (
                <option key={a.id} value={a.id}>
                  {a.name}
                </option>
              ))}
            </select>
          </div>

          <div className="flex items-center gap-1.5">
            <input
              type="date"
              value={fromDate}
              onChange={(event) => setFromDate(event.target.value)}
              className="h-10 rounded-lg border-2 border-amber-200 bg-white px-2.5 text-sm font-semibold text-amber-700 outline-none focus:border-amber-500"
            />
            <span className="text-xs text-[#a3a3a3]">to</span>
            <input
              type="date"
              value={toDate}
              onChange={(event) => setToDate(event.target.value)}
              className="h-10 rounded-lg border-2 border-amber-200 bg-white px-2.5 text-sm font-semibold text-amber-700 outline-none focus:border-amber-500"
            />
          </div>

          {hasFilter && (
            <button
              type="button"
              onClick={clearFilters}
              className="inline-flex items-center gap-1 rounded-lg border-2 border-red-200 bg-red-50 px-3 py-2 text-xs font-bold text-red-600 hover:bg-red-100"
            >
              <X size={12} />
              Clear filters
            </button>
          )}
        </div>
      </div>

      {/* Summary stat cards for the current filter */}
      <div className="mb-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <div className="rounded-2xl border-2 border-emerald-300 bg-white p-5">
          <p className="flex items-center gap-1.5 text-xs font-bold text-emerald-700">
            <Banknote size={13} />
            Revenue
          </p>
          <p className="mt-1 text-2xl font-black text-[#1a1a1a]">{sym()} {grandTotals.revenue.toLocaleString()}</p>
        </div>
        <div className="rounded-2xl border-2 border-blue-300 bg-white p-5">
          <p className="flex items-center gap-1.5 text-xs font-bold text-blue-700">
            <CheckCircle2 size={13} />
            Vouchers Sold
          </p>
          <p className="mt-1 text-2xl font-black text-[#1a1a1a]">{grandTotals.sold}</p>
        </div>
        <div className="rounded-2xl border-2 border-amber-300 bg-white p-5">
          <p className="flex items-center gap-1.5 text-xs font-bold text-amber-700">
            <Clock size={13} />
            Available
          </p>
          <p className="mt-1 text-2xl font-black text-[#1a1a1a]">{grandTotals.available}</p>
        </div>
        <div className="rounded-2xl border-2 border-red-300 bg-red-50 p-5">
          <p className="flex items-center gap-1.5 text-xs font-bold text-red-700">
            <XCircle size={13} />
            Expired
          </p>
          <p className="mt-1 text-2xl font-black text-[#1a1a1a]">{grandTotals.expired}</p>
        </div>
      </div>

      <div className="space-y-6">
        {siteGroups.map(({ site, siteRouters }) => {
          if (siteRouters.length === 0) return null;
          const siteTotal = siteRouters.reduce(
            (sum, router) =>
              sum +
              statsFromVouchers(scopedVouchers.filter((v) => routerIpsForVoucher(v).includes(router.ip))).revenue,
            0,
          );

          return (
            <article key={site.id} className="overflow-hidden rounded-2xl border-2 border-blue-300 bg-white shadow-sm">
              <div className="flex flex-wrap items-center justify-between gap-2 bg-blue-600 px-5 py-4">
                <span className="flex items-center gap-2 text-base font-bold text-white">
                  <Building2 size={18} />
                  {site.name}
                </span>
                <span className="rounded-full bg-white px-3 py-1 text-xs font-black text-blue-700">
                  {sym()} {siteTotal.toLocaleString()} site total
                </span>
              </div>
              <div className="bg-blue-50 p-4">
                {siteRouters.map((router, index) => renderRouterBlock(router, index === siteRouters.length - 1))}
              </div>
            </article>
          );
        })}

        {unassignedRouters.length > 0 && (
          <article className="overflow-hidden rounded-2xl border-2 border-slate-300 bg-white shadow-sm">
            <p className="flex items-center gap-2 bg-slate-600 px-5 py-4 text-base font-bold text-white">
              <Users size={18} />
              No Site Assigned
            </p>
            <div className="bg-slate-50 p-4">
              {unassignedRouters.map((router, index) => renderRouterBlock(router, index === unassignedRouters.length - 1))}
            </div>
          </article>
        )}

        {routersInScope.length === 0 && (
          <div className="rounded-2xl border border-dashed border-[#e6e6e6] bg-white p-10 text-center text-sm text-[#a3a3a3]">
            No routers match this filter.
          </div>
        )}
      </div>

      {/* Full sale-by-sale detail */}
      <article className="mt-8 overflow-hidden rounded-2xl border-2 border-[#e6e6e6] bg-white shadow-[0_8px_24px_rgba(26,26,26,0.06)]">
        <div className="border-b-2 border-[#e6e6e6] bg-[#1a1a1a] px-5 py-4">
          <h3 className="text-base font-bold text-white">Full Sales Details</h3>
          <p className="text-xs text-white/70">
            Every completed sale for the current filter — {fullSalesDetails.length} sale{fullSalesDetails.length === 1 ? "" : "s"}.
          </p>
        </div>
        <div className="max-h-[520px] overflow-auto">
          <table className="w-full min-w-[900px] text-left text-sm">
            <thead className="sticky top-0 bg-[#ffffff] text-xs text-[#737373]">
              <tr>
                <th className="px-4 py-3">Date</th>
                <th className="px-4 py-3">Agent</th>
                <th className="px-4 py-3">Router</th>
                <th className="px-4 py-3">Voucher Code</th>
                <th className="px-4 py-3">Package</th>
                <th className="px-4 py-3">Customer</th>
                <th className="px-4 py-3">Sale Type</th>
                <th className="px-4 py-3">Amount</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#f4f4f4]">
              {fullSalesDetails.map((v) => {
                const soldByAgent = agents.find((a) => a.id === v.agentId);
                // Which router this sale was actually for — from the
                // voucher's own batch, not the seller's assigned router
                // (admin's sales from a router aren't tied to just one router).
                const saleRouterIps = routerIpsForVoucher(v);
                const soldOnRouter = routers.find((r) => saleRouterIps.includes(r.ip));
                return (
                  <tr key={v.code} className="hover:bg-[#ffffff]">
                    <td className="px-4 py-3 text-[#737373]">{v.generatedAt}</td>
                    <td className="px-4 py-3">
                      {soldByAgent ? (
                        <Link href={`/dashboards/agents/${soldByAgent.id}`} className="font-semibold text-[#1a1a1a] hover:underline">
                          {soldByAgent.name}
                        </Link>
                      ) : (
                        "—"
                      )}
                    </td>
                    <td className="px-4 py-3 text-[#525252]">
                      {soldOnRouter
                        ? saleRouterIps.length > 1
                          ? `${soldOnRouter.name.split(" (")[0]} +${saleRouterIps.length - 1}`
                          : soldOnRouter.name.split(" (")[0]
                        : "—"}
                    </td>
                    <td className="px-4 py-3 font-mono text-xs text-[#1a1a1a]">{v.code}</td>
                    <td className="px-4 py-3">{v.packageName}</td>
                    <td className="px-4 py-3">{v.redeemerPhone ?? "—"}</td>
                    <td className="px-4 py-3">
                      <span className="rounded-full bg-slate-100 px-2.5 py-1 text-xs font-semibold text-slate-700">
                        {v.saleType}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <span className="rounded-full bg-emerald-500 px-2.5 py-1 text-xs font-black text-white">
                        {sym()} {(priceByPackage[v.packageName] ?? 0).toLocaleString()}
                      </span>
                    </td>
                  </tr>
                );
              })}
              {fullSalesDetails.length === 0 && (
                <tr>
                  <td colSpan={8} className="px-4 py-10 text-center text-sm text-[#a3a3a3]">
                    No sales match this filter.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </article>
    </section>
  );
}
