"use client";

import { Upload, Download } from "lucide-react";

export function DataUsageOverview() {
 return (
  <article className="rounded-2xl border border-[#e2e8f0] bg-white p-6 shadow-[0_8px_24px_rgba(37,99,235,0.06)] ">
   <div className="flex items-center justify-between">
    <h3 className="font-bold">
     Data Usage Overview
    </h3>

    <select className="rounded-lg border border-[#e2e8f0] px-3 py-2 text-xs ">
     <option>Today</option>
     <option>This Week</option>
     <option>This Month</option>
    </select>
   </div>

   <div className="mt-14 grid grid-cols-2 gap-6">
    <div className="flex items-center gap-3">
     <div className="flex h-12 w-12 items-center justify-center rounded-full bg-[#f1f5f9] text-[#2563eb]">
      <Upload size={24} />
     </div>

     <div>
      <p className="text-sm text-[#64748b]">
       Upload
      </p>

      <p className="text-2xl font-black text-[#2563eb]">
       14.2 GB
      </p>
     </div>
    </div>

    <div className="flex items-center gap-3">
     <div className="flex h-12 w-12 items-center justify-center rounded-full bg-[#e9fbf3] text-[#0f9f6e]">
      <Download size={24} />
     </div>

     <div>
      <p className="text-sm text-[#64748b]">
       Download
      </p>

      <p className="text-2xl font-black text-emerald-600">
       20.4 GB
      </p>
     </div>
    </div>
   </div>

   <div className="mt-10 overflow-hidden rounded-full bg-[#f1f5f9]">
    <div className="flex h-3">
     <div className="w-[41%] bg-[#2563eb]" />
     <div className="w-[59%] bg-emerald-500" />
    </div>
   </div>

   <div className="mt-3 flex justify-between text-xs font-semibold">
    <span className="text-[#2563eb]">
     41%
    </span>

    <span className="text-emerald-600">
     59%
    </span>
   </div>

   <p className="mt-5 text-center text-sm text-[#64748b]">
    Total:{" "}
    <span className="font-bold text-[#0f172a] ">
     34.6 GB
    </span>
   </p>
  </article>
 );
}

