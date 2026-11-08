"use client";

import {
  Area,
  AreaChart,
  CartesianGrid,
  ReferenceLine,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { Gauge } from "lucide-react";

export function DataQuotaSection({
  quotaGb,
  quotaSeries,
  usedSoFarGb,
  quotaPct,
  isFullyUsed,
  userLabel,
}: {
  quotaGb: number;
  quotaSeries: Array<{ hour: string; usedGb: number }>;
  usedSoFarGb: number;
  quotaPct: number;
  isFullyUsed: boolean;
  userLabel: string;
}) {
  return (
    <div id="data-quota" className="mb-6 rounded-xl border border-blue-200 bg-white p-5 scroll-mt-20">
      <div className="mb-3 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Gauge size={18} className="text-[#2563eb]" />
          <p className="text-sm font-bold text-[#0f172a]">
            Voucher Data Quota
          </p>
        </div>
        <span
          className={`rounded-full px-3 py-1 text-xs font-bold ${
            isFullyUsed
              ? "bg-red-100 text-red-700"
              : quotaPct > 80
                ? "bg-amber-100 text-amber-700"
                : "bg-emerald-100 text-emerald-700"
          }`}
        >
          {isFullyUsed
            ? "Fully used"
            : `${usedSoFarGb} GB of ${quotaGb} GB used (${quotaPct}%)`}
        </span>
      </div>

      <div className="h-[220px]">
        <ResponsiveContainer width="100%" height="100%">
          <AreaChart data={quotaSeries}>
            <CartesianGrid vertical={false} strokeDasharray="3 3" />
            <XAxis dataKey="hour" tick={{ fontSize: 12 }} />
            <YAxis
              tick={{ fontSize: 12 }}
              unit="GB"
              domain={[0, Math.ceil(quotaGb * 1.1)]}
            />
            <Tooltip formatter={(value) => [`${value} GB used`, ""]} />
            <ReferenceLine
              y={quotaGb}
              stroke="#ef4444"
              strokeDasharray="4 4"
              label={{
                value: `${quotaGb} GB limit`,
                position: "insideTopRight",
                fontSize: 11,
                fill: "#ef4444",
              }}
            />
            <Area
              type="monotone"
              dataKey="usedGb"
              stroke={isFullyUsed ? "#ef4444" : "#2563eb"}
              strokeWidth={3}
              fill={isFullyUsed ? "#ef4444" : "#2563eb"}
              fillOpacity={0.15}
            />
          </AreaChart>
        </ResponsiveContainer>
      </div>
      <p className="mt-2 text-xs text-[#64748b]">
        This voucher was issued for {quotaGb} GB. The line fills up as{" "}
        {userLabel} uses their data, until it reaches the limit.
      </p>
    </div>
  );
}
