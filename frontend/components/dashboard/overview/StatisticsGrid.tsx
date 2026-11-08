"use client";

import { localizeAmountString } from "@/components/dashboard/shared/currency";
import Link from "next/link";

import { statistics } from "../data/dashboard-data";
import { TotalVouchersStatCard } from "./TotalVouchersStatCard";
import { RoutersOnlineStatCard } from "./RoutersOnlineStatCard";
import { RevenueStatCard } from "./RevenueStatCard";
import { DataUsageStatCard } from "./DataUsageStatCard";

export function StatisticsGrid() {
  return (
    <section className="mt-5 grid gap-4 sm:grid-cols-2 lg:grid-cols-3 2xl:grid-cols-4">
      {statistics.map((statistic) => {
        if (statistic.title === "Today's Revenue") {
          return <RevenueStatCard key={statistic.title} />;
        }

        if (statistic.title === "Total Vouchers") {
          return <TotalVouchersStatCard key={statistic.title} />;
        }

        if (statistic.title === "Data Usage") {
          return <DataUsageStatCard key={statistic.title} />;
        }

        if (statistic.title === "Routers Online") {
          return <RoutersOnlineStatCard key={statistic.title} />;
        }

        const Icon = statistic.icon;

        const cardClass =
          "min-h-[150px] rounded-2xl border border-[#e2e8f0] bg-white p-5 shadow-[0_8px_24px_rgba(37,99,235,0.06)] transition-all duration-300 hover:-translate-y-1 hover:shadow-lg  ";

        const content = (
          <div className="flex items-center gap-4">
            <div
              className={`flex h-14 w-14 shrink-0 items-center justify-center rounded-full ${statistic.iconClass}`}
            >
              <Icon size={27} />
            </div>

            <div className="min-w-0">
              <p className="text-sm font-medium text-[#64748b] ">
                {statistic.title}
              </p>

              <p className="mt-2 truncate text-2xl font-bold">
                {localizeAmountString(statistic.value)}
              </p>

              <p
                className={`mt-3 text-xs ${
                  statistic.isNeutral
                    ? "text-[#64748b] "
                    : statistic.href
                      ? "font-medium text-[#2563eb] "
                      : "font-medium text-emerald-600 "
                }`}
              >
                {statistic.isNeutral || statistic.href
                  ? statistic.detail
                  : `↑ ${statistic.detail}`}
              </p>
            </div>
          </div>
        );

        return statistic.href ? (
          <Link
            key={statistic.title}
            href={statistic.href}
            className={cardClass}
          >
            {content}
          </Link>
        ) : (
          <article key={statistic.title} className={cardClass}>
            {content}
          </article>
        );
      })}
    </section>
  );
}
