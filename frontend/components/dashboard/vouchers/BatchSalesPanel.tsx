"use client";

// Sales for one batch, shown at the top of its page. Overall sales for all
// vouchers stay on the Vouchers / Revenue pages; the last row here shows how
// this batch compares with them.

import { useMemo } from "react";
import Link from "next/link";
import { BarChart3 } from "lucide-react";

import { useDashboard } from "../context/DashboardContext";
import { money } from "../shared/currency";
import type { VoucherBatch } from "../shared/types";
import { computeBatchSales, computeOverallSales, timeAgoLabel } from "./batchSales";

function Tile({ label, value, note, testId }: { label: string; value: string; note?: string; testId: string }) {
  return (
    <div className="rounded-xl bg-[#f4f4f4] p-4">
      <p className="text-xs font-semibold text-[#737373]">{label}</p>
      <p data-testid={testId} className="mt-1 text-2xl font-black text-[#1a1a1a]">
        {value}
      </p>
      {note && <p className="mt-0.5 text-xs text-[#737373]">{note}</p>}
    </div>
  );
}

export function BatchSalesPanel({ batch }: { batch: VoucherBatch }) {
  const { vouchers, voucherBatches, packages } = useDashboard();
  const s = useMemo(() => computeBatchSales(batch, vouchers), [batch, vouchers]);
  const overall = useMemo(() => computeOverallSales(vouchers, voucherBatches, packages), [vouchers, voucherBatches, packages]);
  const share = overall.revenue > 0 ? Math.round((s.revenue / overall.revenue) * 100) : 0;
  const peak = Math.max(1, ...s.last7Days.map((d) => d.revenue));

  return (
    <section data-testid="batch-sales" className="mb-6 rounded-2xl bg-white p-6">
      <div className="mb-4 flex flex-wrap items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-[#1a1a1a] text-white">
            <BarChart3 size={16} />
          </span>
          <div>
            <h2 className="text-base font-bold text-[#1a1a1a]">Sales for this batch</h2>
            <p className="text-xs text-[#737373]">Only the vouchers in {batch.reference}.</p>
          </div>
        </div>
        <p data-testid="batch-last-sale" className="text-xs font-semibold text-[#737373]">
          Last sale: {timeAgoLabel(s.lastSaleMs)}
        </p>
      </div>

      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <Tile testId="batch-revenue" label="Revenue from this batch" value={money(s.revenue)} note={batch.isGiveaway ? "Giveaway batch — no revenue" : `${money(s.unitPrice)} per voucher`} />
        <Tile testId="batch-sold" label="Vouchers sold" value={`${s.sold} / ${s.total}`} note={s.freeUsed > 0 ? `${s.paidSold} paid, ${s.freeUsed} free` : `${s.available} still available`} />
        <Tile testId="batch-unsold-value" label="Still to earn" value={money(s.unsoldValue)} note={`${s.available} unsold voucher${s.available === 1 ? "" : "s"}`} />
        <Tile testId="batch-sellthrough" label="Sell-through" value={`${s.sellThrough}%`} note={s.expired > 0 ? `${s.expired} expired` : "of the batch used"} />
      </div>

      <div className="mt-4 h-2 overflow-hidden rounded-full bg-[#e6e6e6]" aria-hidden>
        <div className="h-full rounded-full bg-[#1a1a1a]" style={{ width: `${s.sellThrough}%` }} />
      </div>

      <div className="mt-6 grid gap-6 lg:grid-cols-2">
        <div>
          <p className="mb-2 text-sm font-bold text-[#1a1a1a]">How they were sold</p>
          {s.byType.length === 0 ? (
            <p data-testid="batch-no-sales" className="text-sm text-[#a3a3a3]">
              No vouchers from this batch have been used yet.
            </p>
          ) : (
            <table data-testid="batch-types" className="w-full text-sm">
              <tbody className="divide-y divide-[#e6e6e6]">
                {s.byType.map((row) => (
                  <tr key={row.type}>
                    <td className="py-2 text-[#525252]">{row.type}</td>
                    <td className="py-2 text-right font-semibold text-[#1a1a1a]">{row.count}</td>
                    <td className="py-2 text-right text-[#737373]">{money(row.revenue)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
        <div>
          <p className="mb-2 text-sm font-bold text-[#1a1a1a]">Last 7 days</p>
          <div data-testid="batch-days" className="flex h-24 items-end gap-2">
            {s.last7Days.map((d, i) => (
              <div key={i} className="flex flex-1 flex-col items-center gap-1" title={`${d.label}: ${money(d.revenue)}`}>
                <div className="flex h-16 w-full items-end">
                  <div className="w-full rounded-t bg-[#1a1a1a]" style={{ height: `${d.revenue === 0 ? 2 : Math.max(8, (d.revenue / peak) * 100)}%`, opacity: d.revenue === 0 ? 0.25 : 1 }} />
                </div>
                <span className="text-[10px] text-[#737373]">{d.label}</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      <div data-testid="batch-vs-overall" className="mt-5 flex flex-wrap items-center justify-between gap-2 rounded-xl border border-[#e6e6e6] px-4 py-3 text-sm">
        <span className="text-[#525252]">
          All vouchers together: <strong className="text-[#1a1a1a]">{money(overall.revenue)}</strong> from {overall.sold} sold. This batch is{" "}
          <strong className="text-[#1a1a1a]">{share}%</strong> of that.
        </span>
        <Link href="/dashboards/revenue" className="font-bold text-[#1a1a1a] hover:underline">
          See overall sales
        </Link>
      </div>
    </section>
  );
}
