"use client";

import { useMemo, useState } from "react";
import {
  CartesianGrid,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { Radio, Users, Router as RouterIcon, Store, Globe, Gift } from "lucide-react";

import { useDashboard } from "@/components/dashboard/context/DashboardContext";
import { ActionPageLayout } from "@/components/dashboard/shared/ActionPageLayout";
import { LiveUsagePanel } from "@/components/dashboard/analytics/data-usage/LiveUsagePanel";
import { PerRouterLivePanel } from "@/components/dashboard/analytics/data-usage/PerRouterLivePanel";
import { RouterUsageBreakdown } from "@/components/dashboard/analytics/data-usage/RouterUsageBreakdown";
import { AgentUsageBreakdown } from "@/components/dashboard/analytics/data-usage/AgentUsageBreakdown";
import { LiveRoutersStatusTable } from "@/components/dashboard/analytics/data-usage/LiveRoutersStatusTable";
import { DateRangeSelector } from "@/components/dashboard/analytics/data-usage/DateRangeSelector";
import { ClearDataUsageHistoryButton } from "@/components/dashboard/analytics/data-usage/ClearDataUsageHistoryButton";
import {
  UsageScopeSelector,
  type UsageScope,
} from "@/components/dashboard/analytics/data-usage/UsageScopeSelector";
import { getUserId } from "@/components/dashboard/active-users/userLinks";

type Timeframe = "Today" | "Weekly" | "Monthly" | "Yearly";

const HOUR_LABELS = Array.from({ length: 24 }, (_, hour) => {
  const period = hour >= 12 ? "PM" : "AM";
  const hour12 = hour % 12 === 0 ? 12 : hour % 12;
  return `${hour12}${period}`;
});

const TIMEFRAME_LABELS: Record<Timeframe, string[]> = {
  Today: HOUR_LABELS,
  Weekly: ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"],
  Monthly: [
    "Jan", "Feb", "Mar", "Apr", "May", "Jun",
    "Jul", "Aug", "Sep", "Oct", "Nov", "Dec",
  ],
  Yearly: ["2022", "2023", "2024", "2025", "2026"],
};

const TIMEFRAME_DESCRIPTION: Record<Timeframe, string> = {
  Today: "Hour by hour, over the current 24-hour day.",
  Weekly: "Day by day, once a full 24 hours has passed.",
  Monthly: "Month by month, across the year.",
  Yearly: "Year over year.",
};

const NAV_SECTIONS = [
  { id: "overview", label: "Overview" },
  { id: "usage-trend", label: "Usage Trend" },
  { id: "live-routers", label: "Live Routers" },
  { id: "usage-by-router", label: "By Router" },
  { id: "usage-by-agent", label: "By Agent" },
  { id: "usage-by-source", label: "By Source" },
  { id: "history", label: "History" },
];

function seededValue(seed: number, min: number, max: number) {
  const x = Math.sin(seed * 12.9898) * 43758.5453;
  const frac = x - Math.floor(x);
  return Math.round(min + frac * (max - min));
}

function hashString(value: string) {
  let hash = 0;
  for (let i = 0; i < value.length; i += 1) {
    hash = (hash * 31 + value.charCodeAt(i)) % 1000;
  }
  return hash;
}

export default function DataUsagePage() {
  const {
    users,
    routers,
    routerEnabled,
    agents,
    vouchers,
    getConnectionState,
    dataUsageResetAt,
    clearDataUsageHistory,
  } = useDashboard();

  const [mode, setMode] = useState<"live" | "historical">("historical");
  const [timeframe, setTimeframe] = useState<Timeframe>("Today");
  const [scope, setScope] = useState<UsageScope>({ type: "network" });
  const [customRange, setCustomRange] = useState<{
    from: string;
    to: string;
  } | null>(null);

  const onlineNow = users.filter((user) => {
    const state = getConnectionState(getUserId(user));
    return !state.blocked && !state.disconnected && !state.paused;
  }).length;

  const labels: string[] = TIMEFRAME_LABELS[timeframe as Timeframe];
  const isHourly = timeframe === "Today";

  const scopeSeedOffset =
    scope.type === "network"
      ? 0
      : scope.type === "router"
        ? hashString(scope.ip)
        : hashString(scope.id);

  const scopeAgent =
    scope.type === "agent" ? agents.find((a) => a.id === scope.id) : null;
  const scopeAgentRouter = scopeAgent
    ? routers.find((r) => r.ip === scopeAgent.routerIp)
    : null;

  const usageData = useMemo(
    () =>
      labels.map((label, index) => ({
        label,
        download: seededValue(
          index + 5 + scopeSeedOffset,
          isHourly ? 10 : 120,
          isHourly ? 90 : 900,
        ),
        upload: seededValue(
          index + 55 + scopeSeedOffset,
          isHourly ? 3 : 30,
          isHourly ? 30 : 260,
        ),
      })),
    [labels, isHourly, scopeSeedOffset],
  );

  const totalGb = usageData.reduce(
    (sum, entry) => sum + entry.download + entry.upload,
    0,
  );

  // Custom date/time range — generates its own distinct dataset, seeded from
  // the actual dates picked, so a different range genuinely shows different
  // numbers instead of reusing the timeframe chart above.
  const customRangeData = useMemo(() => {
    if (!customRange) return [];

    const start = new Date(customRange.from);
    const end = new Date(customRange.to);
    if (Number.isNaN(start.getTime()) || Number.isNaN(end.getTime())) {
      return [];
    }

    const spanMs = Math.max(end.getTime() - start.getTime(), 0);
    const spanHours = spanMs / (1000 * 60 * 60);
    const pointCount = Math.max(2, Math.min(12, Math.round(spanHours / 6) || 6));
    const seed = hashString(customRange.from + customRange.to);

    return Array.from({ length: pointCount }, (_, index) => {
      const pointTime = new Date(
        start.getTime() + (spanMs * index) / (pointCount - 1),
      );
      return {
        label: pointTime.toLocaleString("en-GB", {
          day: "2-digit",
          month: "short",
          hour: "2-digit",
          minute: "2-digit",
        }),
        download: seededValue(seed + index * 17, 15, 320),
        upload: seededValue(seed + index * 43, 5, 110),
      };
    });
  }, [customRange]);

  // Usage by source — same categorization logic as Revenue by Source, so the
  // two pages describe the same activity from two different angles.
  const usedVouchers = vouchers.filter((v) => v.status === "Used");
  const usageBySource = useMemo(() => {
    let directSale = 0;
    let onlinePurchase = 0;
    let packageUsage = 0;

    usedVouchers.forEach((voucher, index) => {
      const gb = seededValue(index + 41, 2, 35);
      const isPlan = voucher.packageName.toLowerCase().includes("plan");

      if (isPlan) {
        packageUsage += gb;
      } else if (voucher.saleType === "Online") {
        onlinePurchase += gb;
      } else {
        directSale += gb;
      }
    });

    return { directSale, onlinePurchase, packageUsage };
  }, [usedVouchers]);

  const totalSourceGb =
    usageBySource.directSale +
    usageBySource.onlinePurchase +
    usageBySource.packageUsage || 1;

  function handleApplyRange(from: string, to: string) {
    setCustomRange({ from, to });
  }

  return (
    <ActionPageLayout
      eyebrow="Analytics"
      title="Data Usage"
      subtitle="Network-wide download and upload volume."
      backHref="/dashboards"
      backLabel="Back to Dashboard"
      wide
    >
      {/* In-page nav */}
      <nav className="mb-6 flex flex-wrap gap-2 border-b border-[#f1f5f9] pb-4">
        {NAV_SECTIONS.map((section) => (
          <a
            key={section.id}
            href={`#${section.id}`}
            className="rounded-lg px-3 py-1.5 text-xs font-semibold text-[#64748b] hover:bg-[#ffffff] hover:text-[#2563eb]"
          >
            {section.label}
          </a>
        ))}
      </nav>

      {/* Live / Historical toggle */}
      <div className="mb-5 flex overflow-hidden rounded-lg border border-[#e2e8f0] text-sm">
        <button
          type="button"
          onClick={() => setMode("historical")}
          className={`flex-1 px-4 py-2.5 font-semibold transition ${
            mode === "historical"
              ? "bg-[#f1f5f9] text-[#2563eb]"
              : "bg-white text-[#64748b] hover:bg-[#ffffff]"
          }`}
        >
          Historical
        </button>
        <button
          type="button"
          onClick={() => setMode("live")}
          className={`flex flex-1 items-center justify-center gap-1.5 px-4 py-2.5 font-semibold transition ${
            mode === "live"
              ? "bg-red-50 text-red-600"
              : "bg-white text-[#64748b] hover:bg-[#ffffff]"
          }`}
        >
          <Radio size={14} />
          Live
        </button>
      </div>

      {mode === "live" ? (
        <div className="space-y-5">
          <LiveUsagePanel connectedUsers={users.length} />
          <PerRouterLivePanel routers={routers} routerEnabled={routerEnabled} />
        </div>
      ) : (
        <>
          <div id="overview" className="scroll-mt-20">
            <UsageScopeSelector
              routers={routers}
              agents={agents}
              scope={scope}
              onChange={setScope}
            />

            {scopeAgent && (
              <div className="mb-5 flex items-center gap-2 rounded-xl border border-blue-200 bg-white px-4 py-3 text-sm">
                <RouterIcon size={16} className="text-blue-600" />
                <span className="text-[#475569]">
                  <strong className="text-[#0f172a]">{scopeAgent.name}</strong>{" "}
                  ({scopeAgent.role}) works from{" "}
                  <strong className="text-[#0f172a]">
                    {scopeAgentRouter
                      ? scopeAgentRouter.name.split(" (")[0]
                      : "no router assigned"}
                  </strong>
                </span>
              </div>
            )}

            <div className="mb-5 grid grid-cols-1 gap-3 sm:grid-cols-3">
              <div className="rounded-xl border border-blue-200 bg-white p-4">
                <p className="text-xs text-[#64748b]">
                  Total ({timeframe})
                  {scope.type !== "network" && " · filtered"}
                </p>
                <p className="text-lg font-bold text-[#0f172a]">{totalGb} GB</p>
              </div>
              <div className="rounded-xl border border-emerald-200 bg-white p-4">
                <p className="flex items-center gap-1.5 text-xs text-[#64748b]">
                  <Users size={13} />
                  Online Now
                </p>
                <p className="text-lg font-bold text-[#0f172a]">
                  {onlineNow} / {users.length}
                </p>
              </div>
              <div className="rounded-xl border border-blue-200 bg-white p-4">
                <p className="text-xs text-[#64748b]">Avg per User</p>
                <p className="text-lg font-bold text-[#0f172a]">
                  {users.length ? Math.round(totalGb / users.length) : 0} GB
                </p>
              </div>
            </div>
          </div>

          {/* Usage trend */}
          <article
            id="usage-trend"
            className="mb-5 scroll-mt-20 rounded-2xl border border-blue-200 bg-white p-5"
          >
            <div className="mb-2 flex flex-wrap items-center justify-between gap-2">
              <h3 className="text-base font-bold">Usage Trend</h3>
              <div className="flex overflow-hidden rounded-lg border border-[#e2e8f0] bg-white text-xs">
                {(["Today", "Weekly", "Monthly", "Yearly"] as Timeframe[]).map(
                  (period) => (
                    <button
                      type="button"
                      key={period}
                      onClick={() => setTimeframe(period)}
                      className={`px-3 py-2.5 font-semibold transition ${
                        timeframe === period
                          ? "bg-[#f1f5f9] text-[#2563eb]"
                          : "bg-white text-[#64748b] hover:bg-[#ffffff]"
                      }`}
                    >
                      {period}
                    </button>
                  ),
                )}
              </div>
            </div>
            <p className="mb-4 text-xs text-[#94a3b8]">
              {TIMEFRAME_DESCRIPTION[timeframe as Timeframe]}
            </p>

            <div className="h-[300px] rounded-xl bg-white p-2">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={usageData}>
                  <CartesianGrid vertical={false} strokeDasharray="3 3" />
                  <XAxis
                    dataKey="label"
                    tick={{ fontSize: 11 }}
                    interval={isHourly ? 2 : 0}
                  />
                  <YAxis tick={{ fontSize: 12 }} unit="GB" />
                  <Tooltip formatter={(value) => [`${value} GB`, ""]} />
                  <Line
                    type="monotone"
                    dataKey="download"
                    name="Download"
                    stroke="#2563eb"
                    strokeWidth={2.5}
                    dot={false}
                  />
                  <Line
                    type="monotone"
                    dataKey="upload"
                    name="Upload"
                    stroke="#93c5fd"
                    strokeWidth={2.5}
                    dot={false}
                  />
                </LineChart>
              </ResponsiveContainer>
            </div>
            <div className="mt-3 flex gap-4 text-xs">
              <span className="inline-flex items-center gap-1.5 text-[#475569]">
                <span className="h-0.5 w-4 bg-[#2563eb]" />
                Download
              </span>
              <span className="inline-flex items-center gap-1.5 text-[#475569]">
                <span className="h-0.5 w-4 bg-[#93c5fd]" />
                Upload
              </span>
            </div>

            <div className="mt-5">
              <DateRangeSelector onApply={handleApplyRange} />

              {customRange && (
                <div className="mt-4 rounded-xl bg-white p-2">
                  <p className="mb-2 px-2 text-xs font-semibold text-[#475569]">
                    Usage from {customRange.from} to {customRange.to}
                  </p>
                  {customRangeData.length === 0 ? (
                    <p className="px-2 pb-4 text-xs text-red-600">
                      That range looks invalid — check the from/to values and
                      try again.
                    </p>
                  ) : (
                    <div className="h-[260px]">
                      <ResponsiveContainer width="100%" height="100%">
                        <LineChart data={customRangeData}>
                          <CartesianGrid vertical={false} strokeDasharray="3 3" />
                          <XAxis dataKey="label" tick={{ fontSize: 10 }} />
                          <YAxis tick={{ fontSize: 12 }} unit="GB" />
                          <Tooltip formatter={(value) => [`${value} GB`, ""]} />
                          <Line
                            type="monotone"
                            dataKey="download"
                            name="Download"
                            stroke="#2563eb"
                            strokeWidth={2.5}
                            dot={{ r: 3 }}
                          />
                          <Line
                            type="monotone"
                            dataKey="upload"
                            name="Upload"
                            stroke="#93c5fd"
                            strokeWidth={2.5}
                            dot={{ r: 3 }}
                          />
                        </LineChart>
                      </ResponsiveContainer>
                    </div>
                  )}
                </div>
              )}
            </div>
          </article>

          {/* Live routers */}
          <article
            id="live-routers"
            className="mb-5 scroll-mt-20 rounded-2xl border border-red-200 bg-red-50 p-1"
          >
            <LiveRoutersStatusTable routers={routers} routerEnabled={routerEnabled} />
          </article>

          {/* By router */}
          <article
            id="usage-by-router"
            className="mb-5 scroll-mt-20 rounded-2xl border border-blue-200 bg-white p-1"
          >
            <RouterUsageBreakdown routers={routers} />
          </article>

          {/* By agent */}
          <article
            id="usage-by-agent"
            className="mb-5 scroll-mt-20 rounded-2xl border border-emerald-200 bg-white p-1"
          >
            <AgentUsageBreakdown agents={agents} />
          </article>

          {/* By source */}
          <article
            id="usage-by-source"
            className="mb-5 scroll-mt-20 rounded-2xl border border-amber-200 bg-white p-5"
          >
            <h3 className="mb-1 text-base font-bold">Usage by Source</h3>
            <p className="mb-4 text-xs text-[#64748b]">
              Where data-consuming sessions came from — matches the same
              categories as Revenue by Source.
            </p>
            <div className="grid gap-4 sm:grid-cols-3">
              <div className="rounded-xl bg-white p-4">
                <div className="flex items-center gap-2 text-[#64748b]">
                  <Store size={15} />
                  <p className="text-xs">Direct Sale (Voucher)</p>
                </div>
                <p className="mt-2 text-xl font-black text-[#0f172a]">
                  {usageBySource.directSale} GB
                </p>
                <p className="mt-1 text-xs text-[#94a3b8]">
                  {Math.round((usageBySource.directSale / totalSourceGb) * 100)}%
                  of tracked usage
                </p>
              </div>
              <div className="rounded-xl bg-white p-4">
                <div className="flex items-center gap-2 text-[#64748b]">
                  <Globe size={15} />
                  <p className="text-xs">Online Purchase</p>
                </div>
                <p className="mt-2 text-xl font-black text-[#0f172a]">
                  {usageBySource.onlinePurchase} GB
                </p>
                <p className="mt-1 text-xs text-[#94a3b8]">
                  {Math.round(
                    (usageBySource.onlinePurchase / totalSourceGb) * 100,
                  )}
                  % of tracked usage
                </p>
              </div>
              <div className="rounded-xl bg-white p-4">
                <div className="flex items-center gap-2 text-[#64748b]">
                  <Gift size={15} />
                  <p className="text-xs">Package Plans</p>
                </div>
                <p className="mt-2 text-xl font-black text-[#0f172a]">
                  {usageBySource.packageUsage} GB
                </p>
                <p className="mt-1 text-xs text-[#94a3b8]">
                  {Math.round(
                    (usageBySource.packageUsage / totalSourceGb) * 100,
                  )}
                  % of tracked usage
                </p>
              </div>
            </div>
          </article>

          {/* History / clear */}
          <div id="history" className="scroll-mt-20">
            <ClearDataUsageHistoryButton
              resetAt={dataUsageResetAt}
              onClear={clearDataUsageHistory}
            />
          </div>
        </>
      )}
    </ActionPageLayout>
  );
}
