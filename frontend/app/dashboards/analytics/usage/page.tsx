"use client";

import { ComingSoonCard } from "@/components/dashboard/shared/ComingSoonCard";

export default function UsageReportsPage() {
  return (
    <section className="w-full">
      <h2 className="mb-1 text-3xl font-bold tracking-tight md:text-4xl">
        Usage Reports
      </h2>
      <p className="mb-6 max-w-2xl text-sm text-[#64748b] md:text-base">
        Detailed per-customer data and time usage breakdowns.
      </p>

      <ComingSoonCard
        title="Usage Reports"
        description="Detailed per-customer bandwidth and time usage reports are coming soon. Check Analytics Overview for current totals."
        backHref="/dashboards/analytics"
        backLabel="Back to Analytics"
      />
    </section>
  );
}
