"use client";

import { summaryCards } from "./mockData";

export function SummaryCards() {
 return (
  <section className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 2xl:grid-cols-5">
   {summaryCards.map((card) => {
    const Icon = card.icon;

    return (
     <article
      key={card.title}
      className="rounded-2xl border border-[#e2e8f0] bg-white p-6 shadow-[0_8px_24px_rgba(37,99,235,0.06)] "
     >
      <div className="flex items-start gap-4">
       <div
        className={`flex h-13 w-13 shrink-0 items-center justify-center rounded-full p-3 ${card.iconClass}`}
       >
        <Icon size={25} />
       </div>

       <div className="min-w-0">
        <p className="text-sm text-[#64748b] ">
         {card.title}
        </p>

        <p className="mt-1 text-2xl font-black">
         {card.value}
        </p>

        <p className="mt-1 text-sm text-[#64748b] ">
         {card.subtitle}
        </p>

        <p
         className={`mt-3 text-xs font-semibold ${
          card.positive
           ? "text-emerald-600"
           : "text-red-500"
         }`}
        >
         {card.positive ? "↑" : "↓"}{" "}
         {card.change}
         <span className="ml-2 font-normal text-[#64748b] ">
          from yesterday
         </span>
        </p>
       </div>
      </div>
     </article>
    );
   })}
  </section>
 );
}

