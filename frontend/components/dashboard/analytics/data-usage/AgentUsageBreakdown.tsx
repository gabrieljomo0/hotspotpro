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
import { UserCog } from "lucide-react";

import type { AgentProfile } from "@/components/dashboard/shared/types";

function seededValue(seed: number, min: number, max: number) {
  const x = Math.sin(seed * 12.9898) * 43758.5453;
  const frac = x - Math.floor(x);
  return Math.round(min + frac * (max - min));
}

export function AgentUsageBreakdown({ agents }: { agents: AgentProfile[] }) {
  const data = agents.map((agent, index) => ({
    name: agent.name,
    download: seededValue(index + 31, 30, 320),
    upload: seededValue(index + 81, 8, 100),
  }));

  return (
    <div className="rounded-xl border border-[#f4f4f4] p-5">
      <div className="mb-1 flex items-center gap-2">
        <UserCog size={18} className="text-emerald-600" />
        <p className="text-sm font-bold text-[#1a1a1a]">
          Data Usage per Agent / Reseller ({agents.length})
        </p>
      </div>
      <p className="mb-4 text-xs text-[#a3a3a3]">
        Every agent shows automatically — one line per traffic type.
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
              stroke="#1a1a1a"
              strokeWidth={2.5}
              dot={{ r: 4 }}
            />
            <Line
              type="monotone"
              dataKey="upload"
              name="Upload"
              stroke="#f3f1ec"
              strokeWidth={2.5}
              dot={{ r: 4 }}
            />
          </LineChart>
        </ResponsiveContainer>
      </div>

      <div className="mt-3 flex gap-4 text-xs">
        <span className="inline-flex items-center gap-1.5 text-[#525252]">
          <span className="h-0.5 w-4 bg-[#1a1a1a]" />
          Download — green
        </span>
        <span className="inline-flex items-center gap-1.5 text-[#525252]">
          <span className="h-0.5 w-4 bg-[#f3f1ec]" />
          Upload — teal
        </span>
      </div>
    </div>
  );
}
