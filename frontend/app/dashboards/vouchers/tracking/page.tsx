"use client";

import { useState } from "react";
import Link from "next/link";
import { Search, Building2, Router as RouterIcon, Clock, CheckCircle2, XCircle, Ticket } from "lucide-react";

import { useDashboard } from "@/components/dashboard/context/DashboardContext";
import { BackLink } from "@/components/dashboard/shared/BackLink";
import { computeBatchSales } from "@/components/dashboard/vouchers/batchSales";
import { money } from "@/components/dashboard/shared/currency";

const PERIODS = [
  { key: "today", label: "Today" },
  { key: "week", label: "This Week" },
  { key: "month", label: "This Month" },
  { key: "all", label: "All Time" },
] as const;
type PeriodKey = (typeof PERIODS)[number]["key"];

function isWithinPeriod(ms: number, period: PeriodKey) {
  if (period === "all") return true;
  const now = Date.now();
  const diffDays = (now - ms) / (1000 * 60 * 60 * 24);
  if (period === "today") return diffDays <= 1;
  if (period === "week") return diffDays <= 7;
  if (period === "month") return diffDays <= 30;
  return true;
}

export default function VoucherTrackingPage() {
  const { voucherBatches, vouchers, routers, businessLocations } = useDashboard();
  const [period, setPeriod] = useState<PeriodKey>("week");
  const [query, setQuery] = useState("");

  function routerNamesFor(batch: (typeof voucherBatches)[number]) {
    return batch.routerIps.map((ip) => routers.find((r) => r.ip === ip)?.name.split(" (")[0] ?? ip);
  }

  function siteLabelFor(batch: (typeof voucherBatches)[number]) {
    const matchingSite = businessLocations.find((site) => {
      const siteRouterIps = routers.filter((r) => r.siteId === site.id).map((r) => r.ip);
      return (
        siteRouterIps.length > 0 &&
        siteRouterIps.length === batch.routerIps.length &&
        siteRouterIps.every((ip) => batch.routerIps.includes(ip))
      );
    });
    return matchingSite?.name ?? null;
  }

  const visibleBatches = voucherBatches.filter((batch) => {
    if (batch.hiddenFromAdmin) return false;
    if (!isWithinPeriod(batch.createdAtMs, period)) return false;
    if (!query) return true;
    const q = query.toLowerCase();
    const site = siteLabelFor(batch);
    return (
      batch.reference.toLowerCase().includes(q) ||
      batch.packageName.toLowerCase().includes(q) ||
      (site && site.toLowerCase().includes(q)) ||
      routerNamesFor(batch).some((name) => name.toLowerCase().includes(q))
    );
  });

  const batchStats = visibleBatches.map((batch) => {
    const sales = computeBatchSales(batch, vouchers);
    return {
      batch,
      total: sales.total,
      used: sales.sold,
      expired: sales.expired,
      available: sales.available,
      revenue: sales.revenue,
      sellThrough: sales.sellThrough,
      site: siteLabelFor(batch),
      routerNames: routerNamesFor(batch),
    };
  });

  const totals = batchStats.reduce(
    (acc, b) => ({
      total: acc.total + b.total,
      used: acc.used + b.used,
      expired: acc.expired + b.expired,
      available: acc.available + b.available,
      revenue: acc.revenue + b.revenue,
    }),
    { total: 0, used: 0, expired: 0, available: 0, revenue: 0 },
  );

  return (
    <section className="w-full">
      <BackLink />
      <div className="mb-6">
        <h2 className="mb-1 text-3xl font-bold tracking-tight md:text-4xl">Voucher Batch Tracking</h2>
        <p className="max-w-2xl text-sm text-[#737373] md:text-base">
          See what's active, used, and expired across every batch you've
          generated — filter by when it was created and by router or site.
        </p>
      </div>

      <div className="mb-5 flex flex-wrap items-center justify-between gap-3">
        <div className="flex flex-wrap gap-2">
          {PERIODS.map((p) => (
            <button
              key={p.key}
              type="button"
              onClick={() => setPeriod(p.key)}
              className={`inline-flex items-center gap-1.5 rounded-full border-2 px-4 py-2 text-sm font-semibold transition ${
                period === p.key
                  ? "border-[#1a1a1a] bg-[#f4f4f4] text-[#1a1a1a]"
                  : "border-[#e6e6e6] bg-white text-[#525252] hover:bg-[#ffffff]"
              }`}
            >
              <Clock size={13} />
              {p.label}
            </button>
          ))}
        </div>

        <div className="relative">
          <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-[#a3a3a3]" />
          <input
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="Search router, site, package or reference"
            className="h-10 w-72 rounded-lg border border-[#e6e6e6] bg-white pl-8 pr-3 text-sm outline-none focus:border-[#1a1a1a]"
          />
        </div>
      </div>

      <div className="mb-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-5">
        <div className="rounded-2xl border border-[#e6e6e6] bg-white p-5 shadow-[0_8px_24px_rgba(26,26,26,0.06)]">
          <p className="flex items-center gap-1.5 text-xs font-semibold text-[#737373]">
            <Ticket size={13} />
            Total Vouchers
          </p>
          <p className="mt-1 text-2xl font-black text-[#1a1a1a]">{totals.total}</p>
        </div>
        <div className="rounded-2xl border border-emerald-200 bg-white p-5">
          <p className="flex items-center gap-1.5 text-xs font-semibold text-emerald-700">
            <CheckCircle2 size={13} />
            Active / Left to Use
          </p>
          <p className="mt-1 text-2xl font-black text-emerald-700">{totals.available}</p>
        </div>
        <div className="rounded-2xl border border-blue-200 bg-white p-5">
          <p className="flex items-center gap-1.5 text-xs font-semibold text-blue-700">
            <Ticket size={13} />
            In Use / Redeemed
          </p>
          <p className="mt-1 text-2xl font-black text-blue-700">{totals.used}</p>
        </div>
        <div className="rounded-2xl border border-red-200 bg-red-50 p-5">
          <p className="flex items-center gap-1.5 text-xs font-semibold text-red-700">
            <XCircle size={13} />
            Expired
          </p>
          <p className="mt-1 text-2xl font-black text-red-700">{totals.expired}</p>
        </div>
        <div className="rounded-2xl border border-[#e6e6e6] bg-white p-5">
          <p className="text-xs font-semibold text-[#737373]">Batch revenue</p>
          <p className="mt-1 text-2xl font-black text-[#1a1a1a]">{money(totals.revenue)}</p>
        </div>
      </div>

      <article className="overflow-hidden rounded-2xl border border-[#e6e6e6] bg-white shadow-[0_8px_24px_rgba(26,26,26,0.06)]">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead className="bg-[#ffffff] text-xs text-[#737373]">
              <tr>
                <th className="px-4 py-4 font-semibold">Batch</th>
                <th className="px-4 py-4 font-semibold">Site / Router</th>
                <th className="px-4 py-4 font-semibold">Created</th>
                <th className="px-4 py-4 font-semibold">Active</th>
                <th className="px-4 py-4 font-semibold">Used</th>
                <th className="px-4 py-4 font-semibold">Expired</th>
                <th className="px-4 py-4 font-semibold">Sell-through</th>
                <th className="px-4 py-4 font-semibold">Revenue</th>
                <th className="px-4 py-4 font-semibold">Total</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#f4f4f4]">
              {batchStats.map(({ batch, total, used, expired, available, revenue, sellThrough, site, routerNames }) => (
                <tr key={batch.id} className="hover:bg-[#ffffff]">
                  <td className="px-4 py-4">
                    <Link href={`/dashboards/vouchers/batch/${batch.id}`} className="font-semibold text-[#1a1a1a] hover:underline">
                      {batch.reference}
                    </Link>
                    <p className="text-xs text-[#a3a3a3]">{batch.packageName}</p>
                  </td>
                  <td className="px-4 py-4">
                    {site ? (
                      <span className="inline-flex items-center gap-1 rounded-full bg-blue-100 px-2.5 py-1 text-xs font-semibold text-blue-700">
                        <Building2 size={11} />
                        {site}
                      </span>
                    ) : (
                      <span
                        className="inline-flex items-center gap-1 rounded-full bg-slate-100 px-2.5 py-1 text-xs font-semibold text-slate-700"
                        title={routerNames.join(", ")}
                      >
                        <RouterIcon size={11} />
                        {routerNames[0] ?? "—"}
                        {routerNames.length > 1 ? ` +${routerNames.length - 1}` : ""}
                      </span>
                    )}
                  </td>
                  <td className="px-4 py-4 text-xs text-[#525252]">{batch.createdAt}</td>
                  <td className="px-4 py-4">
                    <span className="rounded-full bg-emerald-100 px-2.5 py-1 text-xs font-bold text-emerald-700">{available}</span>
                  </td>
                  <td className="px-4 py-4">
                    <span className="rounded-full bg-blue-100 px-2.5 py-1 text-xs font-bold text-blue-700">{used}</span>
                  </td>
                  <td className="px-4 py-4">
                    <span className="rounded-full bg-red-100 px-2.5 py-1 text-xs font-bold text-red-700">{expired}</span>
                  </td>
                  <td className="px-4 py-4 font-semibold text-[#1a1a1a]">{sellThrough}%</td>
                  <td className="px-4 py-4 font-semibold text-[#1a1a1a]">{money(revenue)}</td>
                  <td className="px-4 py-4 font-semibold text-[#1a1a1a]">{total}</td>
                </tr>
              ))}
              {batchStats.length === 0 && (
                <tr>
                  <td colSpan={9} className="px-4 py-10 text-center text-sm text-[#a3a3a3]">
                    No batches match this period/search.
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
