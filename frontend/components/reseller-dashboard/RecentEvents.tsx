"use client";

import { recentEvents } from "./mockData";

export function RecentEvents() {
 return (
  <article className="rounded-2xl border border-[#e6e6e6] bg-white p-6 shadow-[0_8px_24px_rgba(26,26,26,0.06)] ">
   <div className="flex items-center justify-between">
    <h3 className="font-bold">
     Recent Events
    </h3>

    <button
     type="button"
     className="text-xs font-semibold text-[#1a1a1a]"
    >
     View all
    </button>
   </div>

   <div className="mt-5 space-y-4">
    {recentEvents.map((event) => {
     const Icon = event.icon;

     return (
      <div
       key={`${event.title}-${event.time}`}
       className="flex items-start gap-3"
      >
       <div
        className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-full ${event.iconClass}`}
       >
        <Icon size={15} />
       </div>

       <div className="min-w-0 flex-1">
        <p className="text-xs font-semibold">
         {event.title}
        </p>

        <p className="mt-1 truncate text-[11px] text-[#737373] ">
         {event.subtitle}
        </p>
       </div>

       <span className="whitespace-nowrap text-[11px] text-[#737373]">
        {event.time}
       </span>
      </div>
     );
    })}
   </div>
  </article>
 );
}
