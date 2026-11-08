"use client";

import Link from "next/link";

import { quickActions } from "../data/dashboard-data";

export function QuickActionsGrid() {
  return (
    <section className="grid gap-4 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-5">
      {quickActions.map((action) => {
        const Icon = action.icon;

        const className =
          "group flex min-h-[96px] items-center gap-4 rounded-2xl border border-[#e2e8f0] bg-white p-4 text-left shadow-[0_8px_24px_rgba(37,99,235,0.06)] transition-all duration-300 hover:-translate-y-1 hover:border-[#2563eb] hover:shadow-lg   dark:hover:border-[#2563eb]";

        const content = (
          <>
            <div
              className={`flex h-12 w-12 shrink-0 items-center justify-center rounded-xl transition-transform duration-300 group-hover:scale-105 ${action.iconClass}`}
            >
              <Icon size={23} />
            </div>

            <div className="min-w-0">
              <p className="truncate text-sm font-bold">{action.title}</p>

              <p className="mt-1 truncate text-xs text-[#64748b] ">
                {action.subtitle}
              </p>
            </div>
          </>
        );

        return action.href ? (
          <Link key={action.title} href={action.href} className={className}>
            {content}
          </Link>
        ) : (
          <button type="button" key={action.title} className={className}>
            {content}
          </button>
        );
      })}
    </section>
  );
}
