"use client";

import { Activity, Users } from "lucide-react";
import { Area, AreaChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";

import { connectionActivity } from "./mockData";

export function ConnectionActivity() {
 return (
  <article className="rounded-2xl border border-[#e2e8f0] bg-white p-6 shadow-[0_8px_24px_rgba(37,99,235,0.06)] ">
   <div className="flex items-center justify-between">
    <h3 className="font-bold">
     Connection Activity (Today)
    </h3>

    <select className="rounded-lg border border-[#e2e8f0] px-3 py-2 text-xs ">
     <option>Today</option>
     <option>This Week</option>
     <option>This Month</option>
    </select>
   </div>

   <div className="mt-5 h-[300px]">
    <ResponsiveContainer
     width="100%"
     height="100%"
    >
     <AreaChart data={connectionActivity}>

      <CartesianGrid
       strokeDasharray="3 3"
       vertical={false}
       stroke="#e2e8f0"
      />

      <XAxis
       dataKey="time"
       axisLine={false}
       tickLine={false}
       tick={{
        fontSize: 11,
       }}
      />

      <YAxis
       axisLine={false}
       tickLine={false}
       tick={{
        fontSize: 11,
       }}
      />

      <Tooltip
       formatter={(value) => [
        `${value} users`,
        "Online Users",
       ]}
       contentStyle={{
        borderRadius: "10px",
        border:
         "1px solid #e2e8f0",
       }}
      />

      <Area
       type="monotone"
       dataKey="users"
       stroke="#2563eb"
       strokeWidth={2.5}
       fill="#2563eb" fillOpacity={0.15}
      />
     </AreaChart>
    </ResponsiveContainer>
   </div>

   <div className="flex justify-center">
    <span className="flex items-center gap-2 text-xs text-[#64748b]">
     <span className="h-2 w-2 rounded-full bg-[#2563eb]" />
     Online Users
    </span>
   </div>
  </article>
 );
}

