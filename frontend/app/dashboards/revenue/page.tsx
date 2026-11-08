"use client";

import { sym } from "@/components/dashboard/shared/currency";
import { useMemo, useState } from "react";
import Link from "next/link";
import {
  CartesianGrid,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { Router as RouterIcon, Gift, Globe, Store, Settings2 } from "lucide-react";

import { useDashboard } from "@/components/dashboard/context/DashboardContext";
import { revenueData } from "@/components/dashboard/data/dashboard-data";
import { RevenueSettingsModal } from "@/components/dashboard/revenue/RevenueSettingsModal";
import { BackLink } from "@/components/dashboard/shared/BackLink";

type RevenueTimeframe = "Today" | "Daily" | "Monthly" | "Yearly";

const HOUR_LABELS = Array.from({ length: 24 }, (_, hour) => {
  const period = hour >= 12 ? "PM" : "AM";
  const hour12 = hour % 12 === 0 ? 12 : hour % 12;
  return `${hour12}${period}`;
});
const MONTH_LABELS = [
  "Jan", "Feb", "Mar", "Apr", "May", "Jun",
  "Jul", "Aug", "Sep", "Oct", "Nov", "Dec",
];
const YEAR_LABELS = ["2022", "2023", "2024", "2025", "2026"];

const NAV_SECTIONS = [
  { id: "overview", label: "Overview" },
  { id: "revenue-trend", label: "Revenue Trend" },
  { id: "sales-by-agent", label: "Sales by Agent" },
  { id: "revenue-by-router", label: "Revenue by Router" },
  { id: "revenue-by-source", label: "Revenue by Source" },
  { id: "revenue-history", label: "Revenue History" },
];

function seededValue(seed: number, min: number, max: number) {
  const x = Math.sin(seed * 12.9898) * 43758.5453;
  const frac = x - Math.floor(x);
  return Math.round(min + frac * (max - min));
}

function parsePrice(price: string) {
  const numeric = Number(price.replace(/[^0-9.]/g, ""));
  return Number.isFinite(numeric) ? numeric : 0;
}

export default function RevenueOverviewPage() {
  const { vouchers, packages, users, agents, routers, commissionSettings, businessLocations } =
    useDashboard();
  const [revenueTimeframe, setRevenueTimeframe] =
    useState<RevenueTimeframe>("Daily");
  const [siteFilter, setSiteFilter] = useState("All");
  const [routerFilter, setRouterFilter] = useState("All");
  const [agentFilter, setAgentFilter] = useState("All");
  const [settingsOpen, setSettingsOpen] = useState(false);

  // Linked dropdowns: choosing a router also selects the site it belongs to,
  // and choosing an agent also selects the router and site they work on.
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

  const routersForFilter = siteFilter === "All" ? routers : routers.filter((r) => r.siteId === siteFilter);
  const agentsForFilter =
    routerFilter === "All"
      ? siteFilter === "All"
        ? agents
        : agents.filter((a) => routersForFilter.some((r) => r.ip === a.routerIp))
      : agents.filter((a) => a.routerIp === routerFilter);

  // Every downstream computation below reads from this scoped agent list
  // instead of the raw `agents`/`routers` from context, so picking a site,
  // router, or specific agent narrows the whole page consistently.
  const scopedAgents =
    agentFilter === "All" ? agentsForFilter : agentsForFilter.filter((a) => a.id === agentFilter);
  const scopedRouters = siteFilter === "All" ? routers : routers.filter((r) => r.siteId === siteFilter);
  const hasRevenueFilter = siteFilter !== "All" || routerFilter !== "All" || agentFilter !== "All";

  const priceByPackage = Object.fromEntries(
    packages.map((pkg) => [pkg.name, parsePrice(pkg.price)]),
  );

  const agentSales: Array<{
    agent: (typeof agents)[number];
    totalGenerated: number;
    totalSold: number;
    revenue: number;
  }> = scopedAgents.map((agent) => {
    const agentVouchers = vouchers.filter((v) => v.agentId === agent.id);
    const soldVouchers = agentVouchers.filter((v) => v.status === "Used");
    const revenue = soldVouchers.reduce(
      (sum, voucher) => sum + (priceByPackage[voucher.packageName] ?? 0),
      0,
    );

    return {
      agent,
      totalGenerated: agentVouchers.length,
      totalSold: soldVouchers.length,
      revenue,
    };
  });

  // Roll up agent revenue by the router they're assigned to
  const revenueByRouter: Array<{
    router: (typeof routers)[number];
    agentCount: number;
    agentNames: string[];
    totalRevenue: number;
  }> = scopedRouters.map((router) => {
    const routerAgents = agentSales.filter(
      (entry) => entry.agent.routerIp === router.ip,
    );
    const totalRevenue = routerAgents.reduce(
      (sum, entry) => sum + entry.revenue,
      0,
    );

    return {
      router,
      agentCount: routerAgents.length,
      agentNames: routerAgents.map((entry) => entry.agent.name),
      totalRevenue,
    };
  });

  // Revenue by source: Direct Sale (voucher bought in person), Online
  // Purchase, or a recurring Package plan.
  const scopedAgentIds = new Set(scopedAgents.map((a) => a.id));
  const soldVouchers = vouchers.filter(
    (v) => v.status === "Used" && (!hasRevenueFilter || scopedAgentIds.has(v.agentId)),
  );
  const revenueBySource = useMemo(() => {
    let directSale = 0;
    let onlinePurchase = 0;
    let packageSales = 0;

    for (const voucher of soldVouchers) {
      const amount = priceByPackage[voucher.packageName] ?? 0;
      const isPlan = voucher.packageName.toLowerCase().includes("plan");

      if (isPlan) {
        packageSales += amount;
      } else if (voucher.saleType === "Online") {
        onlinePurchase += amount;
      } else {
        directSale += amount;
      }
    }

    return { directSale, onlinePurchase, packageSales };
  }, [soldVouchers, priceByPackage]);

  const totalSourceRevenue =
    revenueBySource.directSale +
    revenueBySource.onlinePurchase +
    revenueBySource.packageSales || 1;

  const revenueChartData = useMemo(() => {
    if (revenueTimeframe === "Today") {
      return HOUR_LABELS.map((date, index) => ({
        date,
        revenue: seededValue(index + 1, 80, 900),
      }));
    }
    if (revenueTimeframe === "Daily") {
      return revenueData;
    }
    if (revenueTimeframe === "Monthly") {
      return MONTH_LABELS.map((date, index) => ({
        date,
        revenue: seededValue(index + 3, 3000, 18000),
      }));
    }
    return YEAR_LABELS.map((date, index) => ({
      date,
      revenue: seededValue(index + 8, 40000, 220000),
    }));
  }, [revenueTimeframe]);

  const totalRevenueAllTime = revenueData.reduce(
    (sum, day) => sum + day.revenue,
    0,
  );

  const filteredRevenueTotal = soldVouchers.reduce(
    (sum, v) => sum + (priceByPackage[v.packageName] ?? 0),
    0,
  );

  // revenueData dates look like "May 12" — parse them into real Date objects
  // (assuming the current year) so we can filter by an actual date & time
  // range, not just a dropdown of the 7 preset labels.
  function parseRevenueDate(label: string) {
    return new Date(`${label} 2026 00:00`);
  }

  const [historyFromDate, setHistoryFromDate] = useState("2026-05-12");
  const [historyFromTime, setHistoryFromTime] = useState("00:00");
  const [historyToDate, setHistoryToDate] = useState("2026-05-18");
  const [historyToTime, setHistoryToTime] = useState("23:59");
  const [historyMinAmount, setHistoryMinAmount] = useState(0);

  const rangeStart = new Date(`${historyFromDate}T${historyFromTime}`);
  const rangeEnd = new Date(`${historyToDate}T${historyToTime}`);

  const filteredRevenueHistory = revenueData
    .filter((day) => {
      const dayDate = parseRevenueDate(day.date);
      return dayDate >= rangeStart && dayDate <= rangeEnd;
    })
    .filter((day) => day.revenue >= historyMinAmount);

  function handleClearHistoryFilter() {
    setHistoryFromDate("2026-05-12");
    setHistoryFromTime("00:00");
    setHistoryToDate("2026-05-18");
    setHistoryToTime("23:59");
    setHistoryMinAmount(0);
  }

  function handlePrintHistory() {
    const rows = filteredRevenueHistory
      .slice()
      .reverse()
      .map(
        (day) =>
          `<tr><td>${day.date}</td><td>${sym()} ${day.revenue.toLocaleString()}</td><td>${((day.revenue / totalRevenueAllTime) * 100).toFixed(1)}%</td></tr>`,
      )
      .join("");

    const printWindow = window.open("", "_blank", "width=800,height=900");
    if (!printWindow) return;

    printWindow.document.write(`
      <html>
        <head>
          <title>Revenue History — ${historyFromDate} to ${historyToDate}</title>
          <style>
            body { font-family: system-ui, sans-serif; padding: 24px; color: #1a1a1a; }
            h1 { font-size: 18px; margin-bottom: 4px; }
            p { font-size: 12px; color: #737373; margin-top: 0; }
            table { width: 100%; border-collapse: collapse; margin-top: 16px; }
            th, td { text-align: left; padding: 8px 12px; border-bottom: 1px solid #f4f4f4; font-size: 13px; }
            th { background: #ffffff; color: #737373; }
          </style>
        </head>
        <body>
          <h1>Revenue History</h1>
          <p>
            Filtered: ${historyFromDate} ${historyFromTime} to ${historyToDate} ${historyToTime}
            ${historyMinAmount > 0 ? ` · Minimum ${sym()} ${historyMinAmount}` : ""}
            · ${filteredRevenueHistory.length} entr${filteredRevenueHistory.length === 1 ? "y" : "ies"}
          </p>
          <table>
            <thead><tr><th>Date</th><th>Revenue</th><th>Share of Total</th></tr></thead>
            <tbody>${rows || '<tr><td colspan="3">No entries match this filter.</td></tr>'}</tbody>
          </table>
        </body>
      </html>
    `);
    printWindow.document.close();
    printWindow.focus();
    printWindow.print();
  }

  return (
    <section className="w-full">
      <BackLink />
      <div className="mb-1 flex flex-wrap items-start justify-between gap-3">
        <h2 className="text-3xl font-bold tracking-tight md:text-4xl">
          Revenue Overview
        </h2>
        <button
          type="button"
          data-testid="open-revenue-settings"
          onClick={() => setSettingsOpen(true)}
          className="inline-flex items-center gap-2 rounded-xl border border-[#e6e6e6] bg-white px-4 py-2.5 text-sm font-bold text-[#525252] shadow-sm hover:bg-[#ffffff] print:hidden"
        >
          <Settings2 size={15} />
          Revenue Settings
        </button>
      </div>
      <p className="mb-6 max-w-2xl text-sm text-[#737373] md:text-base">
        The same revenue analysis as Analytics, focused purely on money —
        trend, per-agent and per-router breakdowns, source, and history.
      </p>

      {/* Revenue scope filter — site, router, agent */}
      <div className="mb-6 flex flex-wrap items-center gap-2 rounded-2xl border border-[#e6e6e6] bg-white p-4 shadow-[0_8px_24px_rgba(26,26,26,0.06)] print:hidden">
        <span className="w-full text-xs font-bold uppercase tracking-wide text-[#a3a3a3]">Review revenue for</span>

        <div className="flex items-center gap-1.5">
          <Store size={14} className="text-blue-500" />
          <select
            value={siteFilter}
            onChange={(event) => {
              setSiteFilter(event.target.value);
              setRouterFilter("All");
              setAgentFilter("All");
            }}
            className="h-9 rounded-lg border border-[#e6e6e6] bg-white px-2.5 text-xs font-semibold text-[#525252] outline-none focus:border-blue-400"
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
            className="h-9 rounded-lg border border-[#e6e6e6] bg-white px-2.5 text-xs font-semibold text-[#525252] outline-none focus:border-blue-400"
          >
            <option value="All">All routers</option>
            {routersForFilter.map((r) => (
              <option key={r.ip} value={r.ip}>
                {r.name.split(" (")[0]}
              </option>
            ))}
          </select>
        </div>

        <div className="flex items-center gap-1.5">
          <Globe size={14} className="text-blue-500" />
          <select
            value={agentFilter}
            onChange={(event) => pickAgent(event.target.value)}
            className="h-9 rounded-lg border border-[#e6e6e6] bg-white px-2.5 text-xs font-semibold text-[#525252] outline-none focus:border-blue-400"
          >
            <option value="All">All agents</option>
            {agentsForFilter.map((a) => (
              <option key={a.id} value={a.id}>
                {a.name}
              </option>
            ))}
          </select>
        </div>

        {hasRevenueFilter && (
          <button
            type="button"
            onClick={() => {
              setSiteFilter("All");
              setRouterFilter("All");
              setAgentFilter("All");
            }}
            className="rounded-lg border border-[#e6e6e6] px-2.5 py-1.5 text-xs font-semibold text-[#737373] hover:bg-[#ffffff]"
          >
            Clear
          </button>
        )}
      </div>

      {/* In-page nav */}
      <nav className="mb-6 flex flex-wrap gap-2 border-b border-[#f4f4f4] pb-4 print:hidden">
        {NAV_SECTIONS.map((section) => (
          <a
            key={section.id}
            href={`#${section.id}`}
            className="rounded-lg px-3 py-1.5 text-xs font-semibold text-[#737373] hover:bg-[#ffffff] hover:text-[#1a1a1a]"
          >
            {section.label}
          </a>
        ))}
      </nav>

      <div id="overview" className="mb-5 grid scroll-mt-20 gap-4 sm:grid-cols-3">
        {hasRevenueFilter && (
          <div className="rounded-2xl border-2 border-amber-300 bg-white p-5 sm:col-span-3">
            <p className="text-xs font-bold uppercase tracking-wide text-amber-700">Filtered Revenue (current selection)</p>
            <p className="mt-1 text-2xl font-bold text-[#1a1a1a]">
              {sym()} {filteredRevenueTotal.toLocaleString()}
            </p>
            <p className="mt-0.5 text-xs text-amber-700">
              {soldVouchers.length} sold voucher{soldVouchers.length === 1 ? "" : "s"} across {scopedAgents.length} agent{scopedAgents.length === 1 ? "" : "s"}
            </p>
          </div>
        )}
        <div className="rounded-2xl border border-blue-200 bg-white p-5">
          <p className="text-xs font-medium text-[#737373]">All-Time Revenue</p>
          <p className="mt-1 text-2xl font-bold text-[#1a1a1a]">
            {sym()} {totalRevenueAllTime.toLocaleString()}
          </p>
        </div>
        <div className="rounded-2xl border border-emerald-200 bg-white p-5">
          <p className="text-xs font-medium text-[#737373]">
            Vouchers Sold
          </p>
          <p className="mt-1 text-2xl font-bold text-[#1a1a1a]">
            {soldVouchers.length}
          </p>
        </div>
        <div className="rounded-2xl border border-blue-200 bg-white p-5">
          <p className="text-xs font-medium text-[#737373]">
            Agents Earning Revenue
          </p>
          <p className="mt-1 text-2xl font-bold text-[#1a1a1a]">
            {agentSales.filter((a) => a.revenue > 0).length} / {agents.length}
          </p>
        </div>
      </div>

      {/* Revenue Trend */}
      <article
        id="revenue-trend"
        className="mb-5 scroll-mt-20 rounded-2xl border border-blue-200 bg-white p-5"
      >
        <div className="mb-4 flex flex-wrap items-center justify-between gap-2">
          <h3 className="text-base font-bold">Revenue Trend</h3>
          <div className="flex overflow-hidden rounded-lg border border-[#e6e6e6] bg-white text-xs">
            {(["Today", "Daily", "Monthly", "Yearly"] as RevenueTimeframe[]).map(
              (period) => (
                <button
                  type="button"
                  key={period}
                  onClick={() => setRevenueTimeframe(period)}
                  className={`px-3 py-1.5 font-semibold transition ${
                    revenueTimeframe === period
                      ? "bg-[#f4f4f4] text-[#1a1a1a]"
                      : "bg-white text-[#737373] hover:bg-[#ffffff]"
                  }`}
                >
                  {period}
                </button>
              ),
            )}
          </div>
        </div>
        <div className="h-[280px] rounded-xl bg-white p-2">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={revenueChartData}>
              <CartesianGrid vertical={false} strokeDasharray="3 3" />
              <XAxis
                dataKey="date"
                tick={{ fontSize: 11 }}
                interval={revenueTimeframe === "Today" ? 2 : 0}
              />
              <YAxis tick={{ fontSize: 12 }} />
              <Tooltip
                formatter={(value) => [
                  `${sym()} ${Number(value).toLocaleString()}`,
                  "Revenue",
                ]}
              />
              <Line
                type="monotone"
                dataKey="revenue"
                stroke="#1a1a1a"
                strokeWidth={2.5}
                dot={{ r: 3 }}
              />
            </LineChart>
          </ResponsiveContainer>
        </div>
      </article>

      {/* Sales by agent — comes before the router grand total */}
      <article
        id="sales-by-agent"
        className="mb-5 scroll-mt-20 overflow-hidden rounded-2xl border border-emerald-200 bg-white"
      >
        <div className="border-b border-emerald-200 bg-white px-5 py-4">
          <h3 className="text-base font-bold">Sales by Agent</h3>
          <p className="mt-1 text-xs text-[#737373]">
            Vouchers generated, sold, revenue, and which router each agent
            works from — before rolling up to router totals below.
          </p>
        </div>
        <div className="overflow-x-auto bg-white">
          <table className="w-full text-left text-sm">
            <thead className="bg-[#ffffff] text-[#737373]">
              <tr>
                <th className="px-5 py-3 font-semibold">Agent</th>
                <th className="px-5 py-3 font-semibold">Role</th>
                <th className="px-5 py-3 font-semibold">Router</th>
                <th className="px-5 py-3 font-semibold">Generated</th>
                <th className="px-5 py-3 font-semibold">Sold</th>
                <th className="px-5 py-3 font-semibold">Revenue</th>
                {commissionSettings.enabled && (
                  <th className="px-5 py-3 font-semibold">
                    Expected Commission ({commissionSettings.ratePercent}%)
                  </th>
                )}
              </tr>
            </thead>
            <tbody>
              {agentSales.map(({ agent, totalGenerated, totalSold, revenue }) => {
                const router = routers.find((r) => r.ip === agent.routerIp);
                const commission = revenue * (commissionSettings.ratePercent / 100);

                return (
                  <tr key={agent.id} className="border-t border-[#f4f4f4]">
                    <td className="px-5 py-3 font-semibold text-[#1a1a1a]">
                      {agent.name}
                    </td>
                    <td className="px-5 py-3 text-[#737373]">{agent.role}</td>
                    <td className="px-5 py-3 text-[#525252]">
                      {router ? (
                        <span className="inline-flex items-center gap-1.5 rounded-full bg-blue-100 px-2.5 py-1 text-xs font-semibold text-blue-700">
                          <RouterIcon size={12} />
                          {router.name.split(" (")[0]}
                        </span>
                      ) : (
                        "—"
                      )}
                    </td>
                    <td className="px-5 py-3 text-[#525252]">{totalGenerated}</td>
                    <td className="px-5 py-3 text-[#525252]">{totalSold}</td>
                    <td className="px-5 py-3 font-semibold text-[#1a1a1a]">
                      {sym()} {revenue.toLocaleString()}
                    </td>
                    {commissionSettings.enabled && (
                      <td className="px-5 py-3 font-semibold text-emerald-600">
                        {sym()} {commission.toLocaleString()}
                      </td>
                    )}
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </article>

      {/* Revenue rolled up by router */}
      <article
        id="revenue-by-router"
        className="mb-5 scroll-mt-20 overflow-hidden rounded-2xl border border-blue-200 bg-white"
      >
        <div className="border-b border-blue-200 bg-white px-5 py-4">
          <h3 className="text-base font-bold">Revenue by Router</h3>
          <p className="mt-1 text-xs text-[#737373]">
            Grand total revenue when several agents share the same router.
          </p>
        </div>
        <div className="overflow-x-auto bg-white">
          <table className="w-full text-left text-sm">
            <thead className="bg-[#ffffff] text-[#737373]">
              <tr>
                <th className="px-5 py-3 font-semibold">Router</th>
                <th className="px-5 py-3 font-semibold">Agents on this Router</th>
                <th className="px-5 py-3 font-semibold">Total Revenue</th>
              </tr>
            </thead>
            <tbody>
              {revenueByRouter.map(
                ({ router, agentCount, agentNames, totalRevenue }) => (
                  <tr key={router.ip} className="border-t border-[#f4f4f4]">
                    <td className="px-5 py-3 font-semibold text-[#1a1a1a]">
                      <span className="inline-flex items-center gap-1.5">
                        <RouterIcon size={14} className="text-blue-600" />
                        {router.name.split(" (")[0]}
                      </span>
                    </td>
                    <td className="px-5 py-3 text-[#525252]">
                      {agentCount === 0 ? (
                        <span className="text-[#a3a3a3]">No agents assigned</span>
                      ) : (
                        `${agentCount} — ${agentNames.join(", ")}`
                      )}
                    </td>
                    <td className="px-5 py-3 font-semibold text-[#1a1a1a]">
                      {sym()} {totalRevenue.toLocaleString()}
                    </td>
                  </tr>
                ),
              )}
            </tbody>
          </table>
        </div>
      </article>

      {/* Revenue by source */}
      <article
        id="revenue-by-source"
        className="mb-5 scroll-mt-20 rounded-2xl border border-amber-200 bg-white p-5"
      >
        <h3 className="mb-1 text-base font-bold">Revenue by Source</h3>
        <p className="mb-4 text-xs text-[#737373]">
          Where sold-voucher revenue came from.
        </p>
        <div className="grid gap-4 sm:grid-cols-3">
          <div className="rounded-xl bg-white p-4">
            <div className="flex items-center gap-2 text-[#737373]">
              <Store size={15} />
              <p className="text-xs">Direct Sale (Voucher)</p>
            </div>
            <p className="mt-2 text-xl font-black text-[#1a1a1a]">
              {sym()} {revenueBySource.directSale.toLocaleString()}
            </p>
            <p className="mt-1 text-xs text-[#a3a3a3]">
              {Math.round((revenueBySource.directSale / totalSourceRevenue) * 100)}
              % of sold revenue
            </p>
          </div>
          <div className="rounded-xl bg-white p-4">
            <div className="flex items-center gap-2 text-[#737373]">
              <Globe size={15} />
              <p className="text-xs">Online Purchase</p>
            </div>
            <p className="mt-2 text-xl font-black text-[#1a1a1a]">
              {sym()} {revenueBySource.onlinePurchase.toLocaleString()}
            </p>
            <p className="mt-1 text-xs text-[#a3a3a3]">
              {Math.round(
                (revenueBySource.onlinePurchase / totalSourceRevenue) * 100,
              )}
              % of sold revenue
            </p>
          </div>
          <div className="rounded-xl bg-white p-4">
            <div className="flex items-center gap-2 text-[#737373]">
              <Gift size={15} />
              <p className="text-xs">Package Sales</p>
            </div>
            <p className="mt-2 text-xl font-black text-[#1a1a1a]">
              {sym()} {revenueBySource.packageSales.toLocaleString()}
            </p>
            <p className="mt-1 text-xs text-[#a3a3a3]">
              {Math.round(
                (revenueBySource.packageSales / totalSourceRevenue) * 100,
              )}
              % of sold revenue
            </p>
          </div>
        </div>
      </article>

      {/* Revenue history */}
      <article
        id="revenue-history"
        className="scroll-mt-20 overflow-hidden rounded-2xl border border-blue-200 bg-white"
      >
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-blue-200 bg-white px-5 py-4">
          <h3 className="text-base font-bold">Revenue History</h3>
          <div className="flex flex-wrap items-center gap-3">
            <Link
              href="/dashboards/revenue/router-agent-breakdown"
              className="inline-flex items-center gap-1.5 rounded-lg border-2 border-blue-400 px-3 py-1.5 text-xs font-bold text-blue-600 hover:bg-blue-50 print:hidden"
            >
              <RouterIcon size={13} />
              Router &amp; Agent Revenue List →
            </Link>
            <span className="text-xs text-[#737373]">
              Total: {sym()} {totalRevenueAllTime.toLocaleString()}
            </span>
          </div>
        </div>

        <div className="flex flex-wrap items-end gap-3 border-b border-blue-200 bg-white px-5 py-4 print:hidden">
          <div className="flex flex-col gap-1">
            <span className="text-xs font-semibold text-[#737373]">From</span>
            <div className="flex gap-2">
              <input
                type="date"
                value={historyFromDate}
                onChange={(event) => setHistoryFromDate(event.target.value)}
                className="h-10 cursor-pointer rounded-lg border border-[#e6e6e6] bg-white px-3 text-sm outline-none focus:border-[#1a1a1a]"
              />
              <input
                type="time"
                value={historyFromTime}
                onChange={(event) => setHistoryFromTime(event.target.value)}
                className="h-10 w-28 cursor-pointer rounded-lg border border-[#e6e6e6] bg-white px-3 text-sm outline-none focus:border-[#1a1a1a]"
              />
            </div>
          </div>

          <div className="flex flex-col gap-1">
            <span className="text-xs font-semibold text-[#737373]">To</span>
            <div className="flex gap-2">
              <input
                type="date"
                value={historyToDate}
                onChange={(event) => setHistoryToDate(event.target.value)}
                className="h-10 cursor-pointer rounded-lg border border-[#e6e6e6] bg-white px-3 text-sm outline-none focus:border-[#1a1a1a]"
              />
              <input
                type="time"
                value={historyToTime}
                onChange={(event) => setHistoryToTime(event.target.value)}
                className="h-10 w-28 cursor-pointer rounded-lg border border-[#e6e6e6] bg-white px-3 text-sm outline-none focus:border-[#1a1a1a]"
              />
            </div>
          </div>

          <label className="block">
            <span className="mb-1 block text-xs font-semibold text-[#737373]">
              Minimum revenue ({sym()})
            </span>
            <input
              type="number"
              min={0}
              value={historyMinAmount}
              onChange={(event) =>
                setHistoryMinAmount(Number(event.target.value) || 0)
              }
              className="h-10 w-36 rounded-lg border border-[#e6e6e6] bg-white px-3 text-sm outline-none focus:border-[#1a1a1a]"
            />
          </label>

          <button
            type="button"
            onClick={handleClearHistoryFilter}
            className="h-10 rounded-lg border border-[#e6e6e6] bg-white px-4 text-sm font-semibold text-[#525252] hover:bg-[#ffffff]"
          >
            Clear Filter
          </button>

          <button
            type="button"
            onClick={handlePrintHistory}
            className="ml-auto h-10 rounded-lg bg-[#1a1a1a] px-4 text-sm font-bold text-white hover:bg-[#111111]"
          >
            Print
          </button>
        </div>

        <div className="overflow-x-auto bg-white">
          <table className="w-full text-left text-sm">
            <thead className="bg-[#ffffff] text-[#737373]">
              <tr>
                <th className="px-5 py-3 font-semibold">Date</th>
                <th className="px-5 py-3 font-semibold">Revenue</th>
                <th className="px-5 py-3 font-semibold">Share of Total</th>
              </tr>
            </thead>
            <tbody>
              {filteredRevenueHistory.length === 0 && (
                <tr>
                  <td
                    colSpan={3}
                    className="px-5 py-8 text-center text-sm text-[#a3a3a3]"
                  >
                    No revenue entries match this filter.
                  </td>
                </tr>
              )}
              {filteredRevenueHistory
                .slice()
                .reverse()
                .map((day) => (
                  <tr key={day.date} className="border-t border-[#f4f4f4]">
                    <td className="px-5 py-3 font-semibold text-[#1a1a1a]">
                      {day.date}
                    </td>
                    <td className="px-5 py-3 text-[#525252]">
                      {sym()} {day.revenue.toLocaleString()}
                    </td>
                    <td className="px-5 py-3 text-[#737373]">
                      {((day.revenue / totalRevenueAllTime) * 100).toFixed(1)}%
                    </td>
                  </tr>
                ))}
            </tbody>
          </table>
        </div>
      </article>
      {settingsOpen && <RevenueSettingsModal onClose={() => setSettingsOpen(false)} />}
    </section>
  );
}
