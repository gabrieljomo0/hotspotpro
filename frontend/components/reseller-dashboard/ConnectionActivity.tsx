"use client";

import { Activity, Users } from "lucide-react";
import { Area, AreaChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";

import { connectionActivity } from "./mockData";

export function ConnectionActivity() {
 return (
  <article className="rounded-2xl border border-[#e6e6e6] bg-white p-6 shadow-[0_8px_24px_rgba(26,26,26,0.06)] ">
   <div className="flex items-center justify-between">
    <h3 className="font-bold">
     Connection Activity (Today)
    </h3>

    <select className="rounded-lg border border-[#e6e6e6] px-3 py-2 text-xs ">
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
       stroke="#e6e6e6"
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
         "1px solid #e6e6e6",
       }}
      />

      <Area
       type="monotone"
       dataKey="users"
       stroke="#1a1a1a"
       strokeWidth={2.5}
       fill="#1a1a1a" fillOpacity={0.15}
      />
     </AreaChart>
    </ResponsiveContainer>
   </div>

   <div className="flex justify-center">
    <span className="flex items-center gap-2 text-xs text-[#737373]">
     <span className="h-2 w-2 rounded-full bg-[#1a1a1a]" />
     Online Users
    </span>
   </div>
  </article>
 );
}

