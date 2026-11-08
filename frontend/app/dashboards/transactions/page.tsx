"use client";

// Transactions — the one page for money-in: a grand total, time-period
// stats (today / this week / this month / a date range you pick), and a
// searchable ledger of every individual sale. Payments used to be a
// separate page for the totals half of this; it's merged in here now so
// there's one place for money-in, not two.

import { sym } from "@/components/dashboard/shared/currency";
import { useState } from "react";
import { Search, ReceiptText, Banknote, Store, Globe, Calendar, TrendingUp } from "lucide-react";

import { useDashboard } from "@/components/dashboard/context/DashboardContext";
import { BackLink } from "@/components/dashboard/shared/BackLink";

type ChannelFilter = "All" | "Counter Sale" | "Online";
type Timeframe = "Today" | "This Week" | "This Month" | "Custom Range";

function parsePrice(price: string): number {
  const match = price.match(/[\d,.]+/);
  return match ? parseFloat(match[0].replace(/,/g, "")) : 0;
}

function startOfDay(d: Date) {
  const x = new Date(d);
  x.setHours(0, 0, 0, 0);
  return x;
}
function startOfWeek(d: Date) {
  const x = startOfDay(d);
  x.setDate(x.getDate() - x.getDay());
  return x;
}
function startOfMonth(d: Date) {
  const x = startOfDay(d);
  x.setDate(1);
  return x;
}

export default function TransactionsPage() {
  const { vouchers, packages, agents } = useDashboard();

  const [query, setQuery] = useState("");
  const [channelFilter, setChannelFilter] = useState<ChannelFilter>("All");
  const [timeframe, setTimeframe] = useState<Timeframe>("Today");
  const [fromDate, setFromDate] = useState("");
  const [toDate, setToDate] = useState("");

  const priceByPackage = Object.fromEntries(packages.map((p) => [p.name, parsePrice(p.price)]));
  const agentById = new Map<string, (typeof agents)[number]>(agents.map((a) => [a.id, a]));

  // A real transaction: a voucher that was actually paid for and
  // redeemed — Free Trial and Giveaway vouchers never had money change
  // hands, so they don't belong in a payments ledger.
  const paidVouchers = vouchers
    .filter((v) => v.status === "Used" && (v.saleType === "Counter Sale" || v.saleType === "Online"))
    .sort((a, b) => b.generatedAtMs - a.generatedAtMs);

  const grandTotal = paidVouchers.reduce((sum, v) => sum + (priceByPackage[v.packageName] ?? 0), 0);
  const counterSaleCount = paidVouchers.filter((v) => v.saleType === "Counter Sale").length;
  const onlineCount = paidVouchers.filter((v) => v.saleType === "Online").length;

  // --- Time-period drill-down ---
  const now = new Date();
  let periodStart: number;
  let periodEnd: number = now.getTime();
  if (timeframe === "Today") {
    periodStart = startOfDay(now).getTime();
  } else if (timeframe === "This Week") {
    periodStart = startOfWeek(now).getTime();
  } else if (timeframe === "This Month") {
    periodStart = startOfMonth(now).getTime();
  } else {
    periodStart = fromDate ? new Date(fromDate + "T00:00:00").getTime() : 0;
    periodEnd = toDate ? new Date(toDate + "T23:59:59").getTime() : now.getTime();
  }
  const periodVouchers = paidVouchers.filter((v) => v.generatedAtMs >= periodStart && v.generatedAtMs <= periodEnd);
  const periodTotal = periodVouchers.reduce((sum, v) => sum + (priceByPackage[v.packageName] ?? 0), 0);
  const periodCount = periodVouchers.length;
  const periodAverage = periodCount > 0 ? periodTotal / periodCount : 0;

  const byDay = new Map<string, number>();
  for (const v of periodVouchers) {
    const key = new Date(v.generatedAtMs).toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric" });
    byDay.set(key, (byDay.get(key) ?? 0) + (priceByPackage[v.packageName] ?? 0));
  }
  const dailyBreakdown = [...byDay.entries()].sort((a, b) => new Date(b[0]).getTime() - new Date(a[0]).getTime());

  // --- Searchable ledger ---
  const filtered = paidVouchers.filter((v) => {
    const seller = agentById.get(v.agentId);
    const matchesQuery =
      !query ||
      v.code.toLowerCase().includes(query.toLowerCase()) ||
      (v.redeemerPhone ?? "").toLowerCase().includes(query.toLowerCase()) ||
      (seller?.name ?? "").toLowerCase().includes(query.toLowerCase()) ||
      v.packageName.toLowerCase().includes(query.toLowerCase());
    const matchesChannel = channelFilter === "All" || v.saleType === channelFilter;
    return matchesQuery && matchesChannel;
  });

  return (
    <section className="w-full">
      <BackLink />
      <h2 className="mb-1 text-3xl font-bold tracking-tight md:text-4xl">Transactions</h2>
      <p className="mb-6 max-w-2xl text-sm text-[#64748b] md:text-base">
        Every payment that&apos;s come in — the grand total, how much by day/week/month, and a searchable list of
        each individual sale, all real revenue from completed sales (not giveaways or free trials).
      </p>

      <div className="mb-6 rounded-2xl border-2 border-emerald-300 bg-white p-6">
        <p className="flex items-center gap-1.5 text-xs font-bold uppercase tracking-wide text-emerald-700">
          <Banknote size={13} />
          Grand Total — All Time
        </p>
        <p className="mt-1 text-4xl font-black text-emerald-900">{sym()} {grandTotal.toLocaleString()}</p>
        <p className="mt-1 text-xs text-emerald-700">
          From {paidVouchers.length} paid sale{paidVouchers.length === 1 ? "" : "s"} in total.
        </p>
      </div>

      <div className="mb-4 flex flex-wrap items-center gap-2">
        {(["Today", "This Week", "This Month", "Custom Range"] as Timeframe[]).map((period) => (
          <button
            key={period}
            type="button"
            onClick={() => setTimeframe(period)}
            className={`rounded-lg px-4 py-2 text-sm font-bold transition ${
              timeframe === period ? "bg-[#2563eb] text-white" : "border border-[#e2e8f0] bg-white text-[#475569] hover:bg-[#ffffff]"
            }`}
          >
            {period}
          </button>
        ))}
        {timeframe === "Custom Range" && (
          <div className="flex items-center gap-2">
            <input
              type="date"
              value={fromDate}
              onChange={(event) => setFromDate(event.target.value)}
              className="h-10 rounded-lg border border-[#e2e8f0] bg-white px-3 text-sm outline-none focus:border-[#2563eb]"
            />
            <span className="text-xs text-[#94a3b8]">to</span>
            <input
              type="date"
              value={toDate}
              onChange={(event) => setToDate(event.target.value)}
              className="h-10 rounded-lg border border-[#e2e8f0] bg-white px-3 text-sm outline-none focus:border-[#2563eb]"
            />
          </div>
        )}
      </div>

      <div className="mb-6 grid grid-cols-2 gap-3 sm:grid-cols-3">
        <div className="rounded-xl border border-emerald-200 bg-white p-4">
          <p className="flex items-center gap-1.5 text-xs text-[#64748b]">
            <TrendingUp size={12} />
            {timeframe} Total
          </p>
          <p className="mt-1 text-xl font-black text-[#0f172a]">{sym()} {periodTotal.toLocaleString()}</p>
        </div>
        <div className="rounded-xl border border-[#e2e8f0] bg-white p-4">
          <p className="flex items-center gap-1.5 text-xs text-[#64748b]">
            <ReceiptText size={12} />
            Payments
          </p>
          <p className="mt-1 text-xl font-black text-[#0f172a]">{periodCount}</p>
        </div>
        <div className="rounded-xl border border-[#e2e8f0] bg-white p-4">
          <p className="flex items-center gap-1.5 text-xs text-[#64748b]">
            <Calendar size={12} />
            Average Payment
          </p>
          <p className="mt-1 text-xl font-black text-[#0f172a]">{sym()} {periodAverage.toFixed(2)}</p>
        </div>
      </div>

      <article className="mb-8 overflow-hidden rounded-2xl border border-[#e2e8f0] bg-white shadow-[0_8px_24px_rgba(37,99,235,0.06)]">
        <div className="border-b border-[#e2e8f0] px-5 py-4">
          <h3 className="text-base font-bold text-[#0f172a]">Daily Breakdown — {timeframe}</h3>
          <p className="text-xs text-[#64748b]">Each day&apos;s total within the period selected above.</p>
        </div>
        <table className="w-full text-left text-sm">
          <thead className="bg-[#ffffff] text-xs text-[#64748b]">
            <tr>
              <th className="px-5 py-3 font-semibold">Date</th>
              <th className="px-5 py-3 font-semibold">Payments</th>
              <th className="px-5 py-3 font-semibold">Total</th>
            </tr>
          </thead>
          <tbody>
            {dailyBreakdown.length === 0 && (
              <tr>
                <td colSpan={3} className="px-5 py-8 text-center text-[#94a3b8]">
                  No payments in this period.
                </td>
              </tr>
            )}
            {dailyBreakdown.map(([date, total]) => {
              const count = periodVouchers.filter(
                (v) =>
                  new Date(v.generatedAtMs).toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric" }) === date,
              ).length;
              return (
                <tr key={date} className="border-t border-[#f1f5f9]">
                  <td className="px-5 py-3 text-[#0f172a]">{date}</td>
                  <td className="px-5 py-3 text-[#475569]">{count}</td>
                  <td className="px-5 py-3 font-bold text-emerald-700">{sym()} {total.toLocaleString()}</td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </article>

      <h3 className="mb-3 text-lg font-bold text-[#0f172a]">Every Individual Sale</h3>

      <div className="mb-5 grid grid-cols-2 gap-3 sm:grid-cols-4">
        <div className="rounded-xl border border-[#e2e8f0] bg-white p-4">
          <p className="flex items-center gap-1.5 text-xs text-[#64748b]">
            <ReceiptText size={12} />
            Total Transactions
          </p>
          <p className="mt-1 text-lg font-bold text-[#0f172a]">{paidVouchers.length}</p>
        </div>
        <div className="rounded-xl border border-emerald-200 bg-white p-4">
          <p className="flex items-center gap-1.5 text-xs text-[#64748b]">
            <Banknote size={12} />
            Total Revenue
          </p>
          <p className="mt-1 text-lg font-bold text-[#0f172a]">{sym()} {grandTotal.toLocaleString()}</p>
        </div>
        <div className="rounded-xl border border-amber-200 bg-white p-4">
          <p className="flex items-center gap-1.5 text-xs text-[#64748b]">
            <Store size={12} />
            Counter Sale
          </p>
          <p className="mt-1 text-lg font-bold text-[#0f172a]">{counterSaleCount}</p>
        </div>
        <div className="rounded-xl border border-blue-200 bg-white p-4">
          <p className="flex items-center gap-1.5 text-xs text-[#64748b]">
            <Globe size={12} />
            Online
          </p>
          <p className="mt-1 text-lg font-bold text-[#0f172a]">{onlineCount}</p>
        </div>
      </div>

      <div className="mb-4 flex flex-wrap items-center gap-3">
        <div className="relative">
          <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-[#94a3b8]" />
          <input
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="Search code, customer, agent or package..."
            className="h-10 w-72 rounded-lg border border-[#e2e8f0] bg-white pl-8 pr-3 text-sm outline-none focus:border-[#2563eb]"
          />
        </div>
        <div className="flex overflow-hidden rounded-lg border border-[#e2e8f0] text-xs">
          {(["All", "Counter Sale", "Online"] as ChannelFilter[]).map((channel) => (
            <button
              type="button"
              key={channel}
              onClick={() => setChannelFilter(channel)}
              className={`px-3 py-2.5 font-semibold transition ${
                channelFilter === channel ? "bg-[#f1f5f9] text-[#2563eb]" : "bg-white text-[#64748b] hover:bg-[#ffffff]"
              }`}
            >
              {channel}
            </button>
          ))}
        </div>
      </div>

      <article className="overflow-hidden rounded-2xl border border-[#e2e8f0] bg-white shadow-[0_8px_24px_rgba(37,99,235,0.06)]">
        <table className="w-full text-left text-sm">
          <thead className="bg-[#ffffff] text-xs text-[#64748b]">
            <tr>
              <th className="px-5 py-3 font-semibold">Date</th>
              <th className="px-5 py-3 font-semibold">Code</th>
              <th className="px-5 py-3 font-semibold">Customer</th>
              <th className="px-5 py-3 font-semibold">Package</th>
              <th className="px-5 py-3 font-semibold">Sold By</th>
              <th className="px-5 py-3 font-semibold">Channel</th>
              <th className="px-5 py-3 font-semibold">Amount</th>
            </tr>
          </thead>
          <tbody>
            {filtered.length === 0 && (
              <tr>
                <td colSpan={7} className="px-5 py-8 text-center text-[#94a3b8]">
                  No transactions match this filter.
                </td>
              </tr>
            )}
            {filtered.map((v) => {
              const seller = agentById.get(v.agentId);
              return (
                <tr key={v.code} className="border-t border-[#f1f5f9]">
                  <td className="px-5 py-3 text-[#64748b]">{v.generatedAt}</td>
                  <td className="px-5 py-3 font-mono font-semibold text-[#2563eb]">{v.code}</td>
                  <td className="px-5 py-3 text-[#0f172a]">{v.redeemerPhone ?? "—"}</td>
                  <td className="px-5 py-3 text-[#475569]">{v.packageName}</td>
                  <td className="px-5 py-3 text-[#475569]">{seller?.name ?? "—"}</td>
                  <td className="px-5 py-3">
                    <span className="rounded-full border border-[#e2e8f0] px-2.5 py-1 text-xs font-semibold text-[#475569]">
                      {v.saleType}
                    </span>
                  </td>
                  <td className="px-5 py-3 font-semibold text-[#0f172a]">
                    {sym()} {(priceByPackage[v.packageName] ?? 0).toLocaleString()}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </article>
    </section>
  );
}
