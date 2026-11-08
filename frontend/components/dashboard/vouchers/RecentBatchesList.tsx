"use client";

import { useState } from "react";
import Link from "next/link";
import { Layers, ChevronRight, ChevronDown } from "lucide-react";

import { useDashboard } from "../context/DashboardContext";
import { money } from "../shared/currency";
import type { VoucherBatch } from "../shared/types";
import { computeBatchSales } from "./batchSales";

export function RecentBatchesList({ batches }: { batches: VoucherBatch[] }) {
  const [expanded, setExpanded] = useState(false);
  const { vouchers } = useDashboard();

  if (batches.length === 0) {
    return null;
  }

  return (
    <article className="mb-5 overflow-hidden rounded-2xl border border-[#e6e6e6] bg-white shadow-[0_8px_24px_rgba(26,26,26,0.06)]">
      <button
        type="button"
        onClick={() => setExpanded((current) => !current)}
        className="flex w-full items-center justify-between gap-2 px-5 py-4 text-left transition hover:bg-[#ffffff]"
      >
        <span className="flex items-center gap-2">
          <Layers size={16} className="text-[#1a1a1a]" />
          <h3 className="text-base font-bold text-[#1a1a1a]">All Batches</h3>
          <span className="rounded-full bg-[#f4f4f4] px-2 py-0.5 text-xs font-bold text-[#737373]">
            {batches.length}
          </span>
        </span>
        <ChevronDown
          size={18}
          className={`text-[#a3a3a3] transition-transform ${expanded ? "rotate-180" : ""}`}
        />
      </button>

      {expanded && (
        <div className="max-h-[420px] divide-y divide-[#f4f4f4] overflow-y-auto border-t border-[#f4f4f4]">
          {batches.map((batch) => {
            const sales = computeBatchSales(batch, vouchers);
            return (
            <Link
              key={batch.id}
              href={`/dashboards/vouchers/batch/${batch.id}`}
              className="flex items-center justify-between gap-3 px-5 py-3.5 transition hover:bg-[#ffffff]"
            >
              <div className="min-w-0">
                <p className="truncate font-bold text-[#1a1a1a]">
                  {batch.reference}
                  {batch.isGiveaway && (
                    <span className="ml-2 rounded-full bg-amber-100 px-2 py-0.5 text-[10px] font-bold text-amber-700">
                      Giveaway
                    </span>
                  )}
                </p>
                <p className="text-xs text-[#737373]">
                  {batch.count} voucher{batch.count === 1 ? "" : "s"} ·{" "}
                  {batch.packageName} · {batch.createdAt}
                </p>
                <p data-testid={`batch-row-sales-${batch.id}`} className="text-xs font-semibold text-[#525252]">
                  Sold {sales.sold}/{sales.total} · {money(sales.revenue)}
                </p>
              </div>
              <span className="inline-flex shrink-0 items-center gap-1 rounded-lg border border-[#e6e6e6] px-3 py-2 text-xs font-semibold text-[#1a1a1a]">
                Open
                <ChevronRight size={13} />
              </span>
            </Link>
            );
          })}
        </div>
      )}
    </article>
  );
}
