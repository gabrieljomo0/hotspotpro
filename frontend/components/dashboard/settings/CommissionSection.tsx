"use client";

// Commission billing: what each router sold and the commission on it.

import { useState } from "react";
import { Percent } from "lucide-react";

import { money } from "../shared/currency";
import { periodLabel, type Period } from "./commission";
import { useCommissionFigures } from "./useCommissionFigures";

const PERIODS: { id: Period; label: string }[] = [
  { id: "this-month", label: "This month" },
  { id: "last-month", label: "Last month" },
  { id: "all", label: "All time" },
];

export function CommissionSection() {
  const [period, setPeriod] = useState<Period>("this-month");
  const fig = useCommissionFigures(period);

  return (
    <article data-testid="commission-section" className="mb-5 overflow-hidden rounded-2xl bg-white">
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-[#e6e6e6] px-6 py-5">
        <div className="flex items-center gap-2">
          <Percent size={16} className="text-[#1a1a1a]" />
          <div>
            <h3 className="text-base font-bold text-[#1a1a1a]">Commission by router</h3>
            <p className="text-xs text-[#737373]">
              {fig.rate}% of each router&apos;s voucher sales — {periodLabel(period)}.
            </p>
          </div>
        </div>
        <div className="flex gap-1 rounded-lg bg-[#f4f4f4] p-1">
          {PERIODS.map((p) => (
            <button
              key={p.id}
              type="button"
              data-testid={`period-${p.id}`}
              aria-pressed={period === p.id}
              onClick={() => setPeriod(p.id)}
              className={`rounded-md px-3 py-1.5 text-xs font-bold ${period === p.id ? "bg-white text-[#1a1a1a]" : "text-[#737373]"}`}
            >
              {p.label}
            </button>
          ))}
        </div>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full min-w-[520px] text-left text-sm">
          <thead className="bg-[#f4f4f4] text-xs text-[#737373]">
            <tr>
              <th className="px-5 py-3 font-semibold">Router</th>
              <th className="px-5 py-3 text-right font-semibold">Vouchers sold</th>
              <th className="px-5 py-3 text-right font-semibold">Sales</th>
              <th className="px-5 py-3 text-right font-semibold">Commission ({fig.rate}%)</th>
            </tr>
          </thead>
          <tbody data-testid="commission-rows" className="divide-y divide-[#e6e6e6]">
            {fig.rows.map((row) => (
              <tr key={row.ip} data-testid={`commission-row-${row.ip}`}>
                <td className="px-5 py-3 font-semibold text-[#1a1a1a]">{row.name}</td>
                <td className="px-5 py-3 text-right text-[#525252]">{Math.round(row.sold * 100) / 100}</td>
                <td className="px-5 py-3 text-right text-[#525252]">{money(row.sales)}</td>
                <td className="px-5 py-3 text-right font-bold text-[#1a1a1a]">{money(row.commission)}</td>
              </tr>
            ))}
            {fig.rows.length === 0 && (
              <tr>
                <td colSpan={4} data-testid="commission-empty" className="px-5 py-8 text-center text-sm text-[#a3a3a3]">
                  No voucher sales in this period, so there is no commission.
                </td>
              </tr>
            )}
          </tbody>
          {fig.rows.length > 0 && (
            <tfoot className="border-t-2 border-[#e6e6e6] bg-[#f4f4f4]">
              <tr>
                <td className="px-5 py-3 font-bold text-[#1a1a1a]">Total</td>
                <td className="px-5 py-3 text-right font-bold text-[#1a1a1a]">{Math.round(fig.shown.sold * 100) / 100}</td>
                <td data-testid="commission-total-sales" className="px-5 py-3 text-right font-bold text-[#1a1a1a]">{money(fig.shown.sales)}</td>
                <td data-testid="commission-total" className="px-5 py-3 text-right font-bold text-[#1a1a1a]">{money(fig.shown.commission)}</td>
              </tr>
            </tfoot>
          )}
        </table>
      </div>
    </article>
  );
}
