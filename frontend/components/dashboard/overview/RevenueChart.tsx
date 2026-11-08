"use client";

import { sym } from "@/components/dashboard/shared/currency";
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

import { useDashboard } from "../context/DashboardContext";
import { useDashboardScope } from "./useDashboardScope";
import { priceLookup, revenueByRouter, revenueSeries } from "./revenueSeries";

type Metric = "revenue" | "router-revenue" | "data-usage" | "sessions";
type Timeframe = "Today" | "Daily" | "Weekly" | "Monthly" | "Yearly";

const HOUR_LABELS = Array.from({ length: 24 }, (_, hour) => {
  const period = hour >= 12 ? "PM" : "AM";
  const hour12 = hour % 12 === 0 ? 12 : hour % 12;
  return `${hour12}${period}`;
});

const TIMEFRAME_LABELS: Record<Timeframe, string[]> = {
  Today: HOUR_LABELS,
  Daily: ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"],
  Weekly: ["Wk 1", "Wk 2", "Wk 3", "Wk 4", "Wk 5", "Wk 6"],
  Monthly: [
    "Jan", "Feb", "Mar", "Apr", "May", "Jun",
    "Jul", "Aug", "Sep", "Oct", "Nov", "Dec",
  ],
  Yearly: ["2022", "2023", "2024", "2025", "2026"],
};

const METRICS: Array<{ key: Metric; label: string; unit: string; color: string }> = [
  { key: "revenue", label: "Total Revenue", unit: "CUR", color: "#2563eb" },
  { key: "router-revenue", label: "Revenue per Router", unit: "CUR", color: "#2563eb" },
  { key: "data-usage", label: "Data Usage", unit: "GB", color: "#2563eb" },
  { key: "sessions", label: "Active Sessions", unit: "sessions", color: "#2563eb" },
];

function seededValue(seed: number, min: number, max: number) {
  const x = Math.sin(seed * 12.9898) * 43758.5453;
  const frac = x - Math.floor(x);
  return Math.round(min + frac * (max - min));
}

function buildSeries(labels: string[], min: number, max: number, offset: number) {
  return labels.map((label, index) => ({
    label,
    value: seededValue(index + offset, min, max),
  }));
}

export function RevenueChart() {
  const { darkMode, packages, voucherBatches } = useDashboard();
  // Everything below follows the dashboard filter (everything, by default).
  const { vouchers, routers: scopedRouters, allRouters, resolved } = useDashboardScope();
  const [metric, setMetric] = useState<Metric>("revenue");
  const [timeframe, setTimeframe] = useState<Timeframe>("Daily");

  const activeMetric = METRICS.find((m) => m.key === metric) ?? METRICS[0];
  const labels: string[] = TIMEFRAME_LABELS[timeframe as Timeframe];
  const isHourly = timeframe === "Today";

  const priceByPackage = useMemo(() => priceLookup(packages), [packages]);

  // Revenue is REAL: used vouchers at their package price (the same
  // definition as the Revenue card above), inside the dashboard filter.
  const realRevenue = useMemo(
    () => revenueSeries(vouchers, priceByPackage, timeframe, new Date()),
    [vouchers, priceByPackage, timeframe],
  );
  // An agent's sales can land on any router, so their view lists every router.
  const routerRevenueData = useMemo(
    () =>
      revenueByRouter(
        vouchers,
        voucherBatches,
        resolved.agentId ? allRouters : scopedRouters,
        priceByPackage,
        timeframe,
        new Date(),
      ),
    [vouchers, voucherBatches, resolved.agentId, allRouters, scopedRouters, priceByPackage, timeframe],
  );

  // Data usage and sessions have no history recorded anywhere, so these two
  // trend lines are still sample shapes — and say so.
  const isSample = metric === "data-usage" || metric === "sessions";
  const sampleSeries = useMemo(() => {
    if (metric === "data-usage")
      return buildSeries(labels, isHourly ? 10 : 150, isHourly ? 120 : 2800, 2);
    if (metric === "sessions")
      return buildSeries(labels, isHourly ? 5 : 40, isHourly ? 80 : 620, 3);
    return [];
  }, [metric, timeframe, isHourly]);

  const isRouterBreakdown = metric === "router-revenue";
  const chartData = isRouterBreakdown ? routerRevenueData : metric === "revenue" ? realRevenue : sampleSeries;
  const noSalesHere = !isSample && chartData.every((point) => point.value === 0);

  return (
    <article className="overflow-hidden rounded-2xl border border-[#e2e8f0] bg-white shadow-[0_8px_24px_rgba(37,99,235,0.06)]  ">
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-[#e2e8f0] px-5 py-4 ">
        <div className="flex flex-wrap gap-1.5">
          {METRICS.map((item) => (
            <button
              type="button"
              key={item.key}
              onClick={() => setMetric(item.key)}
              className={`rounded-lg px-3 py-2 text-xs font-semibold transition ${
                metric === item.key
                  ? "bg-[#f1f5f9] text-[#2563eb]"
                  : "text-[#64748b] hover:bg-[#ffffff]"
              }`}
            >
              {item.label}
            </button>
          ))}
        </div>

        {(
          <div className="flex overflow-hidden rounded-lg border border-[#e2e8f0] text-xs ">
            {(["Today", "Daily", "Weekly", "Monthly", "Yearly"] as Timeframe[]).map(
              (period) => (
                <button
                  type="button"
                  key={period}
                  onClick={() => setTimeframe(period)}
                  className={`px-3 py-2 transition ${
                    timeframe === period
                      ? "bg-[#f1f5f9] font-semibold text-[#2563eb]"
                      : "bg-white hover:bg-[#ffffff]  "
                  }`}
                >
                  {period}
                </button>
              ),
            )}
          </div>
        )}
      </div>

      <p className="px-5 pt-3 text-[11px] text-[#94a3b8]">
        Drag the bottom-right corner to resize this chart.
      </p>
      {resolved.filtered && !isSample && (
        <p data-testid="chart-scope" className="px-5 pt-1 text-[11px] font-semibold text-[#2563eb]">
          Showing: {resolved.label}
        </p>
      )}
      {isSample && (
        <p data-testid="chart-sample-note" className="px-5 pt-1 text-[11px] font-semibold text-amber-700">
          Sample trend — usage history isn&apos;t recorded yet, so this line isn&apos;t real and doesn&apos;t follow the filter.
        </p>
      )}
      {noSalesHere && (
        <p data-testid="chart-empty" className="px-5 pt-1 text-[11px] text-[#94a3b8]">
          No sales in this period{resolved.filtered ? " for this view" : ""}.
        </p>
      )}

      <div className="h-[360px] min-h-[220px] resize-y overflow-hidden p-4">
        <ResponsiveContainer width="100%" height="100%">
          <LineChart data={chartData}>
            <CartesianGrid
              vertical={false}
              strokeDasharray="3 3"
              stroke={darkMode ? "#334155" : "#cbd5e1"}
              opacity={0.7}
            />
            <XAxis
              dataKey="label"
              axisLine={false}
              tickLine={false}
              interval={isRouterBreakdown ? 0 : isHourly ? 2 : 0}
              tick={{ fontSize: 11, fill: darkMode ? "#94a3b8" : "#475569" }}
            />
            <YAxis
              axisLine={false}
              tickLine={false}
              tick={{ fontSize: 12, fill: darkMode ? "#94a3b8" : "#475569" }}
            />
            <Tooltip
              formatter={(value) => [
                metric === "revenue" || metric === "router-revenue"
                  ? `${sym()} ${Number(value).toLocaleString()}`
                  : `${Number(value).toLocaleString()} ${activeMetric.unit === "CUR" ? sym() : activeMetric.unit}`,
                activeMetric.label,
              ]}
              contentStyle={{
                borderRadius: "12px",
                border: darkMode ? "1px solid #334155" : "1px solid #e2e8f0",
                fontSize: "13px",
                background: darkMode ? "#0f172a" : "#ffffff",
                color: darkMode ? "#ffffff" : "#0f172a",
              }}
            />
            <Line
              type="monotone"
              dataKey="value"
              stroke={activeMetric.color}
              strokeWidth={2.5}
              dot={isRouterBreakdown ? { r: 4 } : false}
            />
          </LineChart>
        </ResponsiveContainer>
      </div>
    </article>
  );
}
