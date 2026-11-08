"use client";

// This router's Reports tab: revenue stat cards, a revenue trend chart,
// peak usage hours, and package distribution. The revenue figures are still
// placeholders (GH₵ 0.00 / "No Data") until real per-router transaction
// history is wired up. Session count, average session length and data used
// are real — they come from what this router reports (see the Data Usage tab).
import { useMemo } from "react";
import { sym } from "@/components/dashboard/shared/currency";
import { useRouterUsage } from "./useRouterUsage";
import { fmtBytes, fmtDuration, periodTotals } from "./routerUsageMath";
import { CartesianGrid, Line, LineChart, Pie, PieChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";

export function ReportsTab({ routerIp }: { routerIp: string }) {
  const { data } = useRouterUsage(routerIp, 15000);
  const month = useMemo(() => periodTotals(data?.hours ?? [], data?.now ?? Date.now()).month, [data]);
  return (
    <div className="space-y-5">
      <div className="grid gap-4 sm:grid-cols-4">
        {["Today's Revenue", "This Week's Revenue", "This Month's Revenue", "This Year's Revenue"].map((label) => (
          <div key={label} className="rounded-xl border border-[#f4f4f4] p-4">
            <p className="text-xs text-[#737373]">{label}</p>
            <p className="text-lg font-black text-[#1a1a1a]">{sym()} 0.00</p>
          </div>
        ))}
      </div>
      <div className="grid gap-4 sm:grid-cols-4">
        <div className="rounded-xl border border-[#f4f4f4] p-4">
          <p className="text-xs text-[#737373]">Avg Session Duration</p>
          <p className="text-lg font-black text-[#1a1a1a]">{data?.avgSessionSeconds ? fmtDuration(data.avgSessionSeconds) : "0 sec"}</p>
        </div>
        <div className="rounded-xl border border-[#f4f4f4] p-4">
          <p className="text-xs text-[#737373]">This Month Sessions</p>
          <p className="text-lg font-black text-[#1a1a1a]">{month.starts}</p>
        </div>
        <div className="rounded-xl border border-[#f4f4f4] p-4">
          <p className="text-xs text-[#737373]">Data Usage (This Month)</p>
          <p className="text-lg font-black text-[#1a1a1a]">{fmtBytes(month.total)}</p>
        </div>
        <div className="rounded-xl border border-[#f4f4f4] p-4">
          <p className="text-xs text-[#737373]">SMS Sent</p>
          <p className="text-lg font-black text-[#1a1a1a]">0</p>
        </div>
      </div>

      <article className="rounded-2xl border border-[#e6e6e6] bg-white p-5 shadow-[0_8px_24px_rgba(26,26,26,0.06)]">
        <h3 className="mb-1 text-base font-bold text-[#1a1a1a]">Revenue Trend (Last 30 Days)</h3>
        <p className="mb-4 text-xs text-[#a3a3a3]">Daily revenue from voucher purchases</p>
        <div className="h-[220px]">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={Array.from({ length: 14 }, (_, i) => ({ d: i, revenue: 0 }))}>
              <CartesianGrid vertical={false} strokeDasharray="3 3" />
              <XAxis dataKey="d" hide />
              <YAxis tick={{ fontSize: 11 }} />
              <Tooltip />
              <Line type="monotone" dataKey="revenue" stroke="#1a1a1a" strokeWidth={2} dot={false} />
            </LineChart>
          </ResponsiveContainer>
        </div>
      </article>

      <div className="grid gap-5 lg:grid-cols-2">
        <article className="rounded-2xl border border-[#e6e6e6] bg-white p-5 shadow-[0_8px_24px_rgba(26,26,26,0.06)]">
          <h3 className="mb-1 text-base font-bold text-[#1a1a1a]">Peak Usage Hours</h3>
          <p className="mb-4 text-xs text-[#a3a3a3]">Session distribution by hour (last 7 days)</p>
          <div className="h-[200px]">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={Array.from({ length: 24 }, (_, i) => ({ h: i, sessions: 0 }))}>
                <CartesianGrid vertical={false} strokeDasharray="3 3" />
                <XAxis dataKey="h" tick={{ fontSize: 10 }} />
                <YAxis tick={{ fontSize: 10 }} />
                <Line type="monotone" dataKey="sessions" stroke="#1a1a1a" strokeWidth={2} dot />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </article>

        <article className="rounded-2xl border border-[#e6e6e6] bg-white p-5 shadow-[0_8px_24px_rgba(26,26,26,0.06)]">
          <h3 className="mb-1 text-base font-bold text-[#1a1a1a]">Package Distribution</h3>
          <p className="mb-4 text-xs text-[#a3a3a3]">Active vouchers by package type</p>
          <div className="flex h-[200px] items-center justify-center">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie data={[{ name: "No Data", value: 1 }]} dataKey="value" outerRadius={80} fill="#1a1a1a" />
              </PieChart>
            </ResponsiveContainer>
          </div>
        </article>
      </div>
    </div>
  );
}
