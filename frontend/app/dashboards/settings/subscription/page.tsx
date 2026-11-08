"use client";

import { sym, money } from "@/components/dashboard/shared/currency";
import { useState } from "react";
import Link from "next/link";
import dynamic from "next/dynamic";
import {
  CalendarClock,
  CheckCircle2,
  TrendingUp,
  CreditCard,
  Sparkles,
  Calendar,
  Clock,
  ChevronDown,
  BarChart3,
  FileText,
  Search,
  Filter,
  ExternalLink,
} from "lucide-react";

import { useDashboard } from "@/components/dashboard/context/DashboardContext";
import { SettingsTabs } from "@/components/dashboard/settings/SettingsTabs";
import { BackLink } from "@/components/dashboard/shared/BackLink";
import { BillingModelChooser } from "@/components/dashboard/settings/BillingModelChooser";
import { CommissionSection } from "@/components/dashboard/settings/CommissionSection";
import { PayCommissionModal } from "@/components/dashboard/settings/PayCommissionModal";
import { useCommissionFigures } from "@/components/dashboard/settings/useCommissionFigures";

// Only needed once "Renew / Pay Ahead" is clicked.
const RenewSubscriptionModal = dynamic(
  () => import("@/components/dashboard/settings/RenewSubscriptionModal").then((m) => m.RenewSubscriptionModal),
  { ssr: false },
);

function StatCard({
  label,
  value,
  hint,
  hintClass = "text-emerald-600",
}: {
  label: string;
  value: string;
  hint: string;
  hintClass?: string;
}) {
  return (
    <div className="rounded-2xl border border-[#e2e8f0] bg-white p-5 shadow-[0_8px_24px_rgba(37,99,235,0.06)]">
      <p className="text-xs font-semibold text-[#64748b]">{label}</p>
      <p className="mt-1 text-2xl font-black text-[#0f172a]">{value}</p>
      <p className={`mt-1 text-xs font-semibold ${hintClass}`}>{hint}</p>
    </div>
  );
}

export default function SubscriptionBillingPage() {
  const { subscription } = useDashboard();
  const [renewOpen, setRenewOpen] = useState(false);
  const [payOpen, setPayOpen] = useState(false);
  const isCommission = subscription.billingModel === "Commission";
  const fig = useCommissionFigures("this-month");
  const [summaryOpen, setSummaryOpen] = useState(false);
  const [query, setQuery] = useState("");

  const visibleHistory = subscription.billingHistory.filter((entry) => {
    if (!query) return true;
    const q = query.toLowerCase();
    return entry.reference.toLowerCase().includes(q) || entry.method.toLowerCase().includes(q);
  });

  return (
    <section className="w-full">
      <BackLink />
      <SettingsTabs activeTab="subscription" />

      <div className="mb-6 flex flex-wrap items-start justify-between gap-4">
        <div>
          <h2 className="mb-1 text-3xl font-bold tracking-tight md:text-4xl">Billing &amp; Subscription</h2>
          <p className="max-w-2xl text-sm text-[#64748b] md:text-base">
            {isCommission
              ? "You pay a share of each router's sales. See what you owe and your payment history."
              : "Manage your monthly subscription and payment history."}
          </p>
        </div>
        {isCommission ? (
          <button
            type="button"
            data-testid="pay-commission"
            onClick={() => setPayOpen(true)}
            disabled={fig.balanceDue <= 0}
            className="inline-flex items-center gap-2 rounded-xl bg-[#2563eb] px-4 py-2.5 text-sm font-bold text-white hover:bg-[#1d4ed8] disabled:cursor-not-allowed disabled:opacity-50"
          >
            <CreditCard size={16} />
            Pay commission
          </button>
        ) : (
          <button
            type="button"
            data-testid="renew-button"
            onClick={() => setRenewOpen(true)}
            className="inline-flex items-center gap-2 rounded-xl bg-emerald-500 px-4 py-2.5 text-sm font-bold text-white hover:bg-emerald-600"
          >
            <CalendarClock size={16} />
            Renew / Pay Ahead
          </button>
        )}
      </div>

      <BillingModelChooser />

      {isCommission ? (
        <div data-testid="commission-stats" className="mb-5 grid gap-4 sm:grid-cols-3">
          <StatCard label="Account Status" value={subscription.status} hint={`Your account is ${subscription.status.toLowerCase()} ✓`} />
          <StatCard label="Commission Rate" value={`${subscription.commissionRate}%`} hint="Of each router's voucher sales" hintClass="text-blue-600" />
          <StatCard
            label="Balance Due"
            value={money(fig.balanceDue)}
            hint={fig.balanceDue > 0 ? "Commission earned and not yet paid" : "All paid up! ✓"}
            hintClass={fig.balanceDue > 0 ? "text-amber-600" : "text-emerald-600"}
          />
          <StatCard label="Sales This Month" value={money(fig.monthSales)} hint="Voucher revenue this month ↗" />
          <StatCard label="Commission This Month" value={money(fig.monthCommission)} hint={`${subscription.commissionRate}% of this month's sales`} hintClass="text-blue-600" />
          <StatCard label="Commission Paid" value={money(subscription.commissionPaid)} hint="Paid since you switched to commission" hintClass="text-blue-600" />
        </div>
      ) : (
      <div className="mb-5 grid gap-4 sm:grid-cols-3">
        <StatCard
          label="Subscription Status"
          value={subscription.status}
          hint={`Your subscription is ${subscription.status.toLowerCase()} ✓`}
        />
        <StatCard
          label="Subscription"
          value={`${subscription.daysRemaining} days remaining`}
          hint={`Paid until ${subscription.paidUntil} ✓`}
        />
        <StatCard
          label="Balance Due"
          value={money(0)}
          hint="All paid up! ✓"
        />
        <StatCard
          label="This Month Sales"
          value={`${sym()} ${subscription.thisMonthSales.toLocaleString(undefined, { minimumFractionDigits: 2 })}`}
          hint="Voucher revenue this month ↗"
          hintClass="text-emerald-600"
        />
        <StatCard
          label="Total Sales"
          value={`${sym()} ${subscription.totalSales.toLocaleString(undefined, { minimumFractionDigits: 2 })}`}
          hint="All-time voucher revenue"
          hintClass="text-blue-600"
        />
        <StatCard
          label="Monthly Fee"
          value={`${sym()} ${subscription.monthlyFee.toFixed(2)}`}
          hint="No balance due ✓"
        />
      </div>
      )}

      {isCommission ? (
        <CommissionSection />
      ) : (
        <>
      {/* Subscription Details */}
      <article className="mb-5 rounded-2xl border border-[#e2e8f0] bg-white p-6 shadow-[0_8px_24px_rgba(37,99,235,0.06)]">
        <div className="mb-5 flex items-center gap-2">
          <Sparkles size={16} className="text-[#2563eb]" />
          <div>
            <h3 className="text-base font-bold text-[#0f172a]">Subscription Details</h3>
            <p className="text-xs text-[#64748b]">Your current subscription plan and billing information</p>
          </div>
        </div>

        <div className="grid gap-4 sm:grid-cols-3">
          <div className="rounded-xl border border-[#f1f5f9] p-4">
            <p className="mb-3 text-xs font-bold uppercase tracking-wide text-[#94a3b8]">Account Status</p>
            <p className="mb-1 text-xs font-semibold text-[#64748b]">Status</p>
            <span className="mb-3 inline-flex items-center gap-1 rounded-full bg-emerald-100 px-2.5 py-1 text-xs font-bold text-emerald-700">
              <CheckCircle2 size={11} />
              {subscription.status}
            </span>
            <p className="mb-1 text-xs font-semibold text-[#64748b]">Member Since</p>
            <p className="flex items-center gap-1.5 text-sm text-[#0f172a]">
              <Calendar size={13} className="text-[#94a3b8]" />
              {subscription.memberSince}
            </p>
          </div>

          <div className="rounded-xl border border-[#f1f5f9] p-4">
            <p className="mb-3 text-xs font-bold uppercase tracking-wide text-[#94a3b8]">Monthly Fee</p>
            <p className="mb-1 text-xs font-semibold text-[#64748b]">Fee</p>
            <p className="mb-3 flex items-center gap-1.5 text-sm font-bold text-[#0f172a]">
              <CreditCard size={13} className="text-[#94a3b8]" />{sym()} {subscription.monthlyFee.toFixed(2)}
            </p>
            <p className="mb-1 text-xs font-semibold text-[#64748b]">Billing Model</p>
            <span className="mb-3 inline-flex items-center gap-1 rounded-full bg-emerald-100 px-2.5 py-1 text-xs font-bold text-emerald-700">
              <CheckCircle2 size={11} />
              {subscription.billingModel}
            </span>
            <p className="mb-1 text-xs font-semibold text-[#64748b]">Info</p>
            <p className="text-xs text-[#2563eb]">Flat monthly fee - no commission on sales</p>
          </div>

          <div className="rounded-xl border border-[#f1f5f9] p-4">
            <p className="mb-3 text-xs font-bold uppercase tracking-wide text-[#94a3b8]">Subscription Period</p>
            <p className="mb-1 text-xs font-semibold text-[#64748b]">Paid Until</p>
            <p className="mb-3 flex items-center gap-1.5 text-sm font-bold text-[#0f172a]">
              <CheckCircle2 size={13} className="text-emerald-500" />
              {subscription.paidUntil}
            </p>
            <p className="mb-1 text-xs font-semibold text-[#64748b]">Days Remaining</p>
            <span className="inline-flex items-center gap-1 rounded-full bg-emerald-100 px-2.5 py-1 text-xs font-bold text-emerald-700">
              ✓ {subscription.daysRemaining} days
            </span>
          </div>
        </div>
      </article>

      {/* Billing Cycle */}
      <article className="mb-5 rounded-2xl border border-[#e2e8f0] bg-white p-6 shadow-[0_8px_24px_rgba(37,99,235,0.06)]">
        <div className="mb-5 flex items-center gap-2">
          <Calendar size={16} className="text-[#2563eb]" />
          <div>
            <h3 className="text-base font-bold text-[#0f172a]">Billing Cycle</h3>
            <p className="text-xs text-[#64748b]">Your monthly billing schedule</p>
          </div>
        </div>
        <div className="grid gap-4 sm:grid-cols-3">
          <div>
            <p className="mb-1 text-xs font-semibold text-[#64748b]">Billing Day</p>
            <p className="flex items-center gap-1.5 text-sm font-bold text-[#0f172a]">
              <Calendar size={13} className="text-emerald-500" />
              Day {subscription.billingDay} of each month
            </p>
          </div>
          <div>
            <p className="mb-1 text-xs font-semibold text-[#64748b]">Next Billing Date</p>
            <p className="flex items-center gap-1.5 text-sm font-bold text-[#0f172a]">
              <Clock size={13} className="text-[#94a3b8]" />
              {subscription.nextBillingDate}
            </p>
            <p className="mt-0.5 text-xs text-[#94a3b8]">Prepaid subscription - no charge until this date</p>
          </div>
          <div>
            <p className="mb-1 text-xs font-semibold text-[#64748b]">Grace Period</p>
            <p className="flex items-center gap-1.5 text-sm font-bold text-[#0f172a]">
              <CheckCircle2 size={13} className="text-emerald-500" />
              {subscription.gracePeriodDays} days
            </p>
            <p className="mt-0.5 text-xs text-[#94a3b8]">Time to pay after billing date</p>
          </div>
        </div>
      </article>

        </>
      )}

      {/* Account Summary (collapsible) */}
      <article className="mb-5 overflow-hidden rounded-2xl border border-[#e2e8f0] bg-white shadow-[0_8px_24px_rgba(37,99,235,0.06)]">
        <button
          type="button"
          onClick={() => setSummaryOpen((c) => !c)}
          className="flex w-full items-center justify-between px-6 py-5"
        >
          <span className="flex items-center gap-2">
            <BarChart3 size={16} className="text-[#2563eb]" />
            <span className="text-base font-bold text-[#0f172a]">Account Summary</span>
          </span>
          <ChevronDown size={16} className={`text-[#94a3b8] transition-transform ${summaryOpen ? "rotate-180" : ""}`} />
        </button>
        {summaryOpen && (
          <div className="grid gap-4 border-t border-[#f1f5f9] p-6 sm:grid-cols-3">
            <div className="rounded-xl bg-[#ffffff] p-4">
              <p className="text-xs font-semibold text-[#64748b]">This Month Sales</p>
              <p className="mt-1 text-lg font-black text-[#0f172a]">
                {sym()} {subscription.thisMonthSales.toLocaleString(undefined, { minimumFractionDigits: 2 })}
              </p>
            </div>
            <div className="rounded-xl bg-[#ffffff] p-4">
              <p className="text-xs font-semibold text-[#64748b]">Total Sales</p>
              <p className="mt-1 text-lg font-black text-[#0f172a]">
                {sym()} {subscription.totalSales.toLocaleString(undefined, { minimumFractionDigits: 2 })}
              </p>
            </div>
            <div className="rounded-xl bg-[#ffffff] p-4">
              <p className="text-xs font-semibold text-[#64748b]">Total Paid To HotspotPro</p>
              <p className="mt-1 text-lg font-black text-[#0f172a]">{sym()} {subscription.totalPaid.toFixed(2)}</p>
            </div>
          </div>
        )}
      </article>

      {/* Payment History */}
      <article className="mb-5 rounded-2xl border border-[#e2e8f0] bg-white p-6 shadow-[0_8px_24px_rgba(37,99,235,0.06)]">
        <div className="mb-5 flex items-center gap-2">
          <CreditCard size={16} className="text-[#2563eb]" />
          <div>
            <h3 className="text-base font-bold text-[#0f172a]">Payment History</h3>
            <p className="text-xs text-[#64748b]">Your subscription payment records</p>
          </div>
        </div>
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div className="flex flex-wrap gap-8">
            <div>
              <p className="text-xs font-semibold text-[#64748b]">Total Paid</p>
              <p className="flex items-center gap-1.5 text-sm font-bold text-[#0f172a]">
                <CreditCard size={13} className="text-[#94a3b8]" />{sym()} {subscription.totalPaid.toFixed(2)}
              </p>
            </div>
            <div>
              <p className="text-xs font-semibold text-[#64748b]">Successful Payments</p>
              <p className="flex items-center gap-1.5 text-sm font-bold text-[#0f172a]">
                <CheckCircle2 size={13} className="text-emerald-500" />
                {subscription.successfulPayments} payments
              </p>
            </div>
            <div>
              <p className="text-xs font-semibold text-[#64748b]">Last Payment</p>
              <p className="flex items-center gap-1.5 text-sm font-bold text-[#0f172a]">
                <Calendar size={13} className="text-[#94a3b8]" />
                {subscription.lastPaymentDate ?? "—"}
              </p>
            </div>
          </div>
          <Link
            href="/dashboards/settings/payment-history"
            className="inline-flex items-center gap-1.5 rounded-xl border border-[#e2e8f0] bg-white px-4 py-2.5 text-sm font-bold text-[#475569] hover:bg-[#ffffff]"
          >
            <ExternalLink size={14} />
            View Full History
          </Link>
        </div>
      </article>

      {/* Billing History */}
      <article className="overflow-hidden rounded-2xl border border-[#e2e8f0] bg-white shadow-[0_8px_24px_rgba(37,99,235,0.06)]">
        <div className="flex items-center gap-2 border-b border-[#e2e8f0] px-6 py-5">
          <FileText size={16} className="text-[#2563eb]" />
          <div>
            <h3 className="text-base font-bold text-[#0f172a]">Billing History</h3>
            <p className="text-xs text-[#64748b]">Record of subscription payments</p>
          </div>
        </div>

        <div className="flex flex-wrap items-center justify-end gap-2 px-5 py-4">
          <div className="relative">
            <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-[#94a3b8]" />
            <input
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder="Search"
              className="h-10 w-56 rounded-lg border border-[#e2e8f0] bg-white pl-8 pr-3 text-sm outline-none focus:border-[#2563eb]"
            />
          </div>
          <button type="button" className="rounded-lg border border-[#e2e8f0] p-2.5 text-[#475569] hover:bg-[#ffffff]">
            <Filter size={16} />
          </button>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead className="bg-[#ffffff] text-xs text-[#64748b]">
              <tr>
                <th className="px-4 py-3 font-semibold">Date</th>
                <th className="px-4 py-3 font-semibold">Reference</th>
                <th className="px-4 py-3 font-semibold">Method</th>
                <th className="px-4 py-3 font-semibold">Amount</th>
                <th className="px-4 py-3 font-semibold">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#f1f5f9]">
              {visibleHistory.map((entry) => (
                <tr key={entry.id} className="hover:bg-[#ffffff]">
                  <td className="px-4 py-3 text-[#475569]">{entry.date}</td>
                  <td className="px-4 py-3 font-mono text-xs text-[#2563eb]">{entry.reference}</td>
                  <td className="px-4 py-3">
                    <span className="rounded-full border border-[#e2e8f0] px-2.5 py-1 text-xs font-semibold text-[#475569]">
                      {entry.method}
                    </span>
                  </td>
                  <td className="px-4 py-3 font-semibold text-[#0f172a]">{sym()} {entry.amount.toFixed(2)}</td>
                  <td className="px-4 py-3">
                    <span
                      className={`rounded-full px-2.5 py-1 text-xs font-bold ${
                        entry.status === "completed"
                          ? "bg-emerald-100 text-emerald-700"
                          : entry.status === "pending"
                            ? "bg-amber-100 text-amber-700"
                            : "bg-red-100 text-red-700"
                      }`}
                    >
                      {entry.status}
                    </span>
                  </td>
                </tr>
              ))}
              {visibleHistory.length === 0 && (
                <tr>
                  <td colSpan={5} className="px-4 py-8 text-center text-sm text-[#94a3b8]">
                    No billing history matches your search.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        <div className="flex flex-wrap items-center justify-between gap-3 border-t border-[#e2e8f0] px-5 py-3 text-sm text-[#64748b]">
          <span>
            Showing {visibleHistory.length} result{visibleHistory.length === 1 ? "" : "s"}
          </span>
          <label className="flex items-center gap-2 text-xs">
            Per page
            <select defaultValue={10} className="rounded-lg border border-[#e2e8f0] bg-white px-2 py-1.5 text-xs outline-none focus:border-[#2563eb]">
              <option value={10}>10</option>
              <option value={25}>25</option>
            </select>
          </label>
        </div>
      </article>

      {renewOpen && <RenewSubscriptionModal onClose={() => setRenewOpen(false)} />}
      {payOpen && <PayCommissionModal onClose={() => setPayOpen(false)} />}
    </section>
  );
}
