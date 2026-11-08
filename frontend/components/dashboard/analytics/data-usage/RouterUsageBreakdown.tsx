"use client";

import {
  CartesianGrid,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { Router as RouterIcon } from "lucide-react";

import type { RouterInfo } from "@/components/dashboard/data/dashboard-data";

function seededValue(seed: number, min: number, max: number) {
  const x = Math.sin(seed * 12.9898) * 43758.5453;
  const frac = x - Math.floor(x);
  return Math.round(min + frac * (max - min));
}

export function RouterUsageBreakdown({ routers }: { routers: RouterInfo[] }) {
  const data = routers.map((router, index) => ({
    name: router.name.split(" (")[0],
    download: seededValue(index + 21, 40, 380),
    upload: seededValue(index + 71, 10, 120),
  }));

  return (
    <div className="rounded-xl border border-[#f1f5f9] p-5">
      <div className="mb-1 flex items-center gap-2">
        <RouterIcon size={18} className="text-blue-600" />
        <p className="text-sm font-bold text-[#0f172a]">
          Data Usage per Router
        </p>
      </div>
      <p className="mb-4 text-xs text-[#94a3b8]">
        One line per traffic type, plotted across your routers.
      </p>

      <div className="h-[260px]">
        <ResponsiveContainer width="100%" height="100%">
          <LineChart data={data}>
            <CartesianGrid vertical={false} strokeDasharray="3 3" />
            <XAxis dataKey="name" tick={{ fontSize: 11 }} />
            <YAxis tick={{ fontSize: 12 }} unit="GB" />
            <Tooltip formatter={(value) => [`${value} GB`, ""]} />
            <Line
              type="monotone"
              dataKey="download"
              name="Download"
              stroke="#2563eb"
              strokeWidth={2.5}
              dot={{ r: 4 }}
            />
            <Line
              type="monotone"
              dataKey="upload"
              name="Upload"
              stroke="#93c5fd"
              strokeWidth={2.5}
              dot={{ r: 4 }}
            />
          </LineChart>
        </ResponsiveContainer>
      </div>

      <div className="mt-3 flex gap-4 text-xs">
        <span className="inline-flex items-center gap-1.5 text-[#475569]">
          <span className="h-0.5 w-4 bg-[#2563eb]" />
          Download — blue
        </span>
        <span className="inline-flex items-center gap-1.5 text-[#475569]">
          <span className="h-0.5 w-4 bg-[#93c5fd]" />
          Upload — purple
        </span>
      </div>
    </div>
  );
}
