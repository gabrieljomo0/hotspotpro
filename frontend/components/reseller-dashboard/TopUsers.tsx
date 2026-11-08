"use client";

import { Users } from "lucide-react";

import { topUsers } from "./mockData";

export function TopUsers() {
 return (
  <article className="rounded-2xl border border-[#e6e6e6] bg-white p-6 shadow-[0_8px_24px_rgba(26,26,26,0.06)] ">
   <div className="flex items-center justify-between">
    <h3 className="font-bold">
     Top Users by Data Usage
    </h3>

    <button
     type="button"
     className="text-xs font-semibold text-[#1a1a1a]"
    >
     View all
    </button>
   </div>

   <div className="mt-5 space-y-4">
    {topUsers.map((user, index) => (
     <div
      key={user.phone}
      className="grid grid-cols-[28px_1fr_auto] items-center gap-3 text-sm"
     >
      <span className="flex h-7 w-7 items-center justify-center rounded-full bg-blue-100 text-xs font-semibold text-[#1a1a1a]">
       {index + 1}
      </span>

      <span className="font-semibold">
       {user.phone}
      </span>

      <span className="font-bold">
       {user.usage}
      </span>
     </div>
    ))}
   </div>
  </article>
 );
}

