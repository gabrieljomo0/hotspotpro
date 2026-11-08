"use client";

import { Users } from "lucide-react";
import { Cell, Pie, PieChart, ResponsiveContainer } from "recharts";

import { statusData } from "./mockData";

export function UsersByStatus() {
 return (
  <article className="rounded-2xl border border-[#e2e8f0] bg-white p-6 shadow-[0_8px_24px_rgba(37,99,235,0.06)] ">
   <h3 className="font-bold">
    Users by Status
   </h3>

   <div className="mt-5 grid items-center gap-5 sm:grid-cols-[1fr_1.15fr]">
    <div className="relative h-[220px]">
     <ResponsiveContainer
      width="100%"
      height="100%"
     >
      <PieChart>
       <Pie
        data={statusData}
        dataKey="value"
        innerRadius={65}
        outerRadius={90}
        paddingAngle={1}
       >
        {statusData.map((item) => (
         <Cell
          key={item.name}
          fill={item.color}
         />
        ))}
       </Pie>
      </PieChart>
     </ResponsiveContainer>

     <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center">
      <p className="text-2xl font-black">
       487
      </p>

      <p className="text-xs text-[#64748b]">
       Total Users
      </p>
     </div>
    </div>

    <div className="space-y-3">
     {statusData.map((item) => (
      <div
       key={item.name}
       className="grid grid-cols-[12px_1fr_auto] items-center gap-2 text-xs"
      >
       <span
        className="h-2.5 w-2.5 rounded-full"
        style={{
         backgroundColor:
          item.color,
        }}
       />

       <span>{item.name}</span>

       <span className="font-semibold">
        {item.value}{" "}
        <span className="font-normal text-[#64748b]">
         ({item.percentage})
        </span>
       </span>
      </div>
     ))}
    </div>
   </div>
  </article>
 );
}

