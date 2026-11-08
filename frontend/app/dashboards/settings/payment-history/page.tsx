"use client";

import { sym } from "@/components/dashboard/shared/currency";
import { useState } from "react";
import {
  Calendar,
  CheckCircle2,
  CreditCard,
  FileText,
  Search,
  SlidersHorizontal,
  Columns3,
  Hash,
} from "lucide-react";

import { useDashboard } from "@/components/dashboard/context/DashboardContext";
import { SettingsTabs } from "@/components/dashboard/settings/SettingsTabs";
import { BackLink } from "@/components/dashboard/shared/BackLink";

function formatRelativeTime(timestamp: number) {
  const diffMs = Date.now() - timestamp;
  const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));

  if (diffDays <= 0) return "Today";
  if (diffDays === 1) return "Yesterday";
  if (diffDays < 7) return `${diffDays} days ago`;
  if (diffDays < 14) return "1 week ago";
  if (diffDays < 30) return `${Math.floor(diffDays / 7)} weeks ago`;
  if (diffDays < 60) return "1 month ago";
  return `${Math.floor(diffDays / 30)} months ago`;
}

export default function PaymentHistoryPage() {
  const { subscription, showToast } = useDashboard();
  const [query, setQuery] = useState("");

  const now = new Date();
  const thisMonthLabel = now.toLocaleDateString("en-US", { month: "long", year: "numeric" });
  const thisMonthTotal = subscription.billingHistory
    .filter((entry) => {
      const d = new Date(entry.timestamp);
      return d.getMonth() === now.getMonth() && d.getFullYear() === now.getFullYear();
    })
    .reduce((sum, entry) => sum + entry.amount, 0);

  const visible = subscription.billingHistory.filter((entry) => {
    if (!query) return true;
    const q = query.toLowerCase();
    return entry.reference.toLowerCase().includes(q) || entry.method.toLowerCase().includes(q);
  });

  return (
    <section className="w-full">
      <BackLink />
      <SettingsTabs activeTab="payment-history" />

      <div className="mb-6">
        <h2 className="mb-1 text-3xl font-bold tracking-tight md:text-4xl">Payment History</h2>
        <p className="max-w-2xl text-sm text-[#737373] md:text-base">
          Complete history of all subscription payments.
        </p>
      </div>

      <div className="mb-5 grid gap-4 sm:grid-cols-3">
        <div className="rounded-2xl border border-[#e6e6e6] bg-white p-5 shadow-[0_8px_24px_rgba(26,26,26,0.06)]">
          <p className="text-xs font-semibold text-[#737373]">Total Paid</p>
          <p className="mt-1 text-2xl font-black text-[#1a1a1a]">{sym()} {subscription.totalPaid.toFixed(2)}</p>
          <p className="mt-1 flex items-center gap-1.5 text-xs font-semibold text-emerald-600">
            <CreditCard size={12} />
            All time payments
          </p>
        </div>
        <div className="rounded-2xl border border-[#e6e6e6] bg-white p-5 shadow-[0_8px_24px_rgba(26,26,26,0.06)]">
          <p className="text-xs font-semibold text-[#737373]">This Month</p>
          <p className="mt-1 text-2xl font-black text-[#1a1a1a]">{sym()} {thisMonthTotal.toFixed(2)}</p>
          <p className="mt-1 flex items-center gap-1.5 text-xs font-semibold text-emerald-600">
            <Calendar size={12} />
            {thisMonthLabel}
          </p>
        </div>
        <div className="rounded-2xl border border-[#e6e6e6] bg-white p-5 shadow-[0_8px_24px_rgba(26,26,26,0.06)]">
          <p className="text-xs font-semibold text-[#737373]">Successful Payments</p>
          <p className="mt-1 text-2xl font-black text-[#1a1a1a]">{subscription.successfulPayments}</p>
          <p className="mt-1 flex items-center gap-1.5 text-xs font-semibold text-emerald-600">
            <CheckCircle2 size={12} />
            Completed transactions
          </p>
        </div>
      </div>

      <article className="overflow-hidden rounded-2xl border border-[#e6e6e6] bg-white shadow-[0_8px_24px_rgba(26,26,26,0.06)]">
        <div className="flex items-center gap-2 border-b border-[#e6e6e6] px-6 py-5">
          <FileText size={16} className="text-[#1a1a1a]" />
          <div>
            <h3 className="text-base font-bold text-[#1a1a1a]">All Payments</h3>
            <p className="text-xs text-[#737373]">Complete record of all your subscription payment transactions</p>
          </div>
        </div>

        <div className="flex flex-wrap items-center justify-end gap-2 px-5 py-4">
          <div className="relative">
            <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-[#a3a3a3]" />
            <input
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder="Search"
              className="h-10 w-56 rounded-lg border border-[#e6e6e6] bg-white pl-8 pr-3 text-sm outline-none focus:border-[#1a1a1a]"
            />
          </div>
          <button
            type="button"
            onClick={() => showToast("Filters coming soon.")}
            className="rounded-lg border border-[#e6e6e6] p-2.5 text-[#525252] hover:bg-[#ffffff]"
            aria-label="Filter"
          >
            <SlidersHorizontal size={16} />
          </button>
          <button
            type="button"
            onClick={() => showToast("Column visibility coming soon.")}
            className="rounded-lg border border-[#e6e6e6] p-2.5 text-[#525252] hover:bg-[#ffffff]"
            aria-label="Columns"
          >
            <Columns3 size={16} />
          </button>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead className="bg-[#ffffff] text-xs text-[#737373]">
              <tr>
                <th className="px-4 py-4 font-semibold">Date</th>
                <th className="px-4 py-4 font-semibold">Reference</th>
                <th className="px-4 py-4 font-semibold">Amount</th>
                <th className="px-4 py-4 font-semibold">Method</th>
                <th className="px-4 py-4 font-semibold">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#f4f4f4]">
              {visible.map((entry) => (
                <tr key={entry.id} className="hover:bg-[#ffffff]">
                  <td className="px-4 py-4">
                    <p className="flex items-center gap-1.5 font-semibold text-[#1a1a1a]">
                      <Calendar size={13} className="text-[#a3a3a3]" />
                      {entry.date}
                    </p>
                    <p className="mt-0.5 text-xs text-emerald-600">{formatRelativeTime(entry.timestamp)}</p>
                  </td>
                  <td className="px-4 py-4">
                    <span className="inline-flex items-center gap-1 rounded-full border border-[#e6e6e6] bg-[#ffffff] px-2.5 py-1 font-mono text-xs text-[#525252]">
                      <Hash size={11} className="text-[#a3a3a3]" />
                      {entry.reference}
                    </span>
                  </td>
                  <td className="px-4 py-4 font-bold text-emerald-600">{sym()} {entry.amount.toFixed(2)}</td>
                  <td className="px-4 py-4">
                    <span className="inline-flex items-center gap-1.5 rounded-full border border-[#e6e6e6] bg-[#ffffff] px-2.5 py-1 text-xs font-semibold text-[#525252]">
                      <CreditCard size={11} className="text-[#a3a3a3]" />
                      {entry.method}
                    </span>
                  </td>
                  <td className="px-4 py-4">
                    <span
                      className={`inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-xs font-bold ${
                        entry.status === "completed"
                          ? "bg-emerald-100 text-emerald-700"
                          : entry.status === "pending"
                            ? "bg-amber-100 text-amber-700"
                            : "bg-red-100 text-red-700"
                      }`}
                    >
                      <CheckCircle2 size={11} />
                      {entry.status === "completed" ? "Completed" : entry.status === "pending" ? "Pending" : "Failed"}
                    </span>
                  </td>
                </tr>
              ))}
              {visible.length === 0 && (
                <tr>
                  <td colSpan={5} className="px-4 py-10 text-center text-sm text-[#a3a3a3]">
                    No payments match your search.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        <div className="flex flex-wrap items-center justify-between gap-3 border-t border-[#e6e6e6] px-5 py-3 text-sm text-[#737373]">
          <span>
            Showing {visible.length} result{visible.length === 1 ? "" : "s"}
          </span>
          <label className="flex items-center gap-2 text-xs">
            Per page
            <select defaultValue={10} className="rounded-lg border border-[#e6e6e6] bg-white px-2 py-1.5 text-xs outline-none focus:border-[#1a1a1a]">
              <option value={10}>10</option>
              <option value={25}>25</option>
            </select>
          </label>
        </div>
      </article>
    </section>
  );
}
