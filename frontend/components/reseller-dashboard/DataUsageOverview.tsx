"use client";

import { Upload, Download } from "lucide-react";

export function DataUsageOverview() {
 return (
  <article className="rounded-2xl border border-[#e6e6e6] bg-white p-6 shadow-[0_8px_24px_rgba(26,26,26,0.06)] ">
   <div className="flex items-center justify-between">
    <h3 className="font-bold">
     Data Usage Overview
    </h3>

    <select className="rounded-lg border border-[#e6e6e6] px-3 py-2 text-xs ">
     <option>Today</option>
     <option>This Week</option>
     <option>This Month</option>
    </select>
   </div>

   <div className="mt-14 grid grid-cols-2 gap-6">
    <div className="flex items-center gap-3">
     <div className="flex h-12 w-12 items-center justify-center rounded-full bg-[#f4f4f4] text-[#1a1a1a]">
      <Upload size={24} />
     </div>

     <div>
      <p className="text-sm text-[#737373]">
       Upload
      </p>

      <p className="text-2xl font-black text-[#1a1a1a]">
       14.2 GB
      </p>
     </div>
    </div>

    <div className="flex items-center gap-3">
     <div className="flex h-12 w-12 items-center justify-center rounded-full bg-[#f3f1ec] text-[#1a1a1a]">
      <Download size={24} />
     </div>

     <div>
      <p className="text-sm text-[#737373]">
       Download
      </p>

      <p className="text-2xl font-black text-emerald-600">
       20.4 GB
      </p>
     </div>
    </div>
   </div>

   <div className="mt-10 overflow-hidden rounded-full bg-[#f4f4f4]">
    <div className="flex h-3">
     <div className="w-[41%] bg-[#1a1a1a]" />
     <div className="w-[59%] bg-emerald-500" />
    </div>
   </div>

   <div className="mt-3 flex justify-between text-xs font-semibold">
    <span className="text-[#1a1a1a]">
     41%
    </span>

    <span className="text-emerald-600">
     59%
    </span>
   </div>

   <p className="mt-5 text-center text-sm text-[#737373]">
    Total:{" "}
    <span className="font-bold text-[#1a1a1a] ">
     34.6 GB
    </span>
   </p>
  </article>
 );
}

