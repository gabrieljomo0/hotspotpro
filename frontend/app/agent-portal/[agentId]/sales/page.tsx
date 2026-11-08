"use client";

import { sym } from "@/components/dashboard/shared/currency";
import { use, useState } from "react";
import { ShoppingCart, Banknote, Download, Users, Search, Percent } from "lucide-react";

import { useDashboard } from "@/components/dashboard/context/DashboardContext";
import { AgentPortalPage } from "@/components/agent-portal/AgentPortalPage";
import { settingsOf } from "@/components/dashboard/agents/agentSettings";
import { saleTimeMs } from "@/components/dashboard/agents/agentLedger";
import { getAgentSales } from "@/components/agent-portal/salesData";
import { RevenueFilter } from "@/components/dashboard/agents/directory/RevenueFilter";
import {
  defaultPeriod,
  inPeriod,
  periodError,
  periodLabel,
  type RevenuePeriod,
} from "@/components/dashboard/agents/directory/revenuePeriod";

function money(value: number) {
  return value.toLocaleString(undefined, { minimumFractionDigits: 0, maximumFractionDigits: 2 });
}

function downloadCsv(filename: string, rows: string[][]) {
  const csv = rows.map((row) => row.map((cell) => `"${cell.replace(/"/g, '""')}"`).join(",")).join("\n");
  const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = filename;
  link.click();
  URL.revokeObjectURL(url);
}

function formatWhen(ms: number) {
  return new Date(ms).toLocaleString("en-GB", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

export default function AgentSalesPage({
  params,
}: {
  params: Promise<{ agentId: string }>;
}) {
  const { agentId } = use(params);
  const { vouchers, voucherBatches, packages, agents } = useDashboard();
  const [period, setPeriod] = useState<RevenuePeriod>({ ...defaultPeriod(), kind: "all" });
  const [query, setQuery] = useState("");
  const [packageFilter, setPackageFilter] = useState("All");
  const [saleTypeFilter, setSaleTypeFilter] = useState("All");

  return (
    <AgentPortalPage
      agentId={agentId}
      permissionKey="sales.viewOwn"
      featureLabel="Sales"
      render={(agent) => {
        // Everything on this page is driven by what the admin has allowed.
        const canViewTeam = agent.permissions["sales.viewTeam"] === "Allowed";
        const canExport = agent.permissions["sales.export"] === "Allowed";
        const canSeePayment = agent.permissions["transactions.viewStatus"] === "Allowed";
        const canSeeHistory = agent.permissions["transactions.viewHistory"] === "Allowed";
        const showCommission = settingsOf(agent).allowViewSalesCommission;
        const rate = agent.commissionRatePercent ?? 0;

        const agentName = (id: string) => agents.find((a) => a.id === id)?.name ?? "—";
        const allSales = getAgentSales(agent, agents, vouchers, voucherBatches, packages)
          .map((sale) => ({ ...sale, when: saleTimeMs(sale.voucher) }))
          .sort((x, y) => y.when - x.when);

        const error = periodError(period);
        const q = query.trim().toLowerCase();
        const sales = allSales.filter(({ voucher: v, when }) => {
          if (!inPeriod(when, period)) return false;
          if (packageFilter !== "All" && v.packageName !== packageFilter) return false;
          if (saleTypeFilter !== "All" && v.saleType !== saleTypeFilter) return false;
          if (!q) return true;
          return (
            v.code.toLowerCase().includes(q) ||
            v.packageName.toLowerCase().includes(q) ||
            (v.redeemerPhone ?? "").toLowerCase().includes(q)
          );
        });

        const packageNames = Array.from(new Set(allSales.map((s) => s.voucher.packageName)));
        const saleTypes = Array.from(new Set(allSales.map((s) => s.voucher.saleType)));
        const totalRevenue = sales.reduce((sum, s) => sum + s.amount, 0);
        const commission = (totalRevenue * rate) / 100;

        // Which columns exist depends on the permissions above.
        const columns: string[] = ["Voucher Code", "Package"];
        if (canSeeHistory) columns.push("Sold To");
        if (canViewTeam) columns.push("Sold By");
        columns.push("Sale Type", "Amount");
        if (showCommission) columns.push("Commission");
        if (canSeePayment) columns.push("Payment");
        columns.push("Date");

        function handleExport() {
          downloadCsv(`sales-${agent.id}.csv`, [
            columns.map((c) => (c === "Amount" ? `Amount (${sym()})` : c === "Commission" ? `Commission (${sym()})` : c)),
            ...sales.map(({ voucher: v, seller, when, amount }) =>
              columns.map((c) => {
                switch (c) {
                  case "Voucher Code":
                    return v.code;
                  case "Package":
                    return v.packageName;
                  case "Sold To":
                    return v.redeemerPhone ?? "";
                  case "Sold By":
                    return agentName(seller);
                  case "Sale Type":
                    return v.saleType;
                  case "Amount":
                    return String(amount);
                  case "Commission":
                    return String(Math.round(((amount * rate) / 100) * 100) / 100);
                  case "Payment":
                    return "Paid";
                  default:
                    return formatWhen(when);
                }
              }),
            ),
          ]);
        }

        return (
          <section>
            <div className="mb-5 flex flex-wrap items-start justify-between gap-3">
              <div>
                <h1 className="flex items-center gap-2 text-2xl font-black md:text-3xl">
                  <ShoppingCart size={26} className="text-[#2563eb]" />
                  Sales
                </h1>
                <p className="mt-1 text-sm text-[#64748b]">
                  {canViewTeam ? "Every voucher sold by your team" : "Every voucher you've sold"} — pulled from real
                  voucher records.
                </p>
              </div>
              {canExport && (
                <button
                  type="button"
                  data-testid="sales-export"
                  onClick={handleExport}
                  disabled={sales.length === 0}
                  className="inline-flex items-center gap-2 rounded-xl border-2 px-4 py-2.5 text-sm font-bold text-[#2563eb] hover:bg-[#e2e8f0] disabled:opacity-50"
                >
                  <Download size={16} />
                  Export CSV
                </button>
              )}
            </div>

            <RevenueFilter
              period={period}
              onChange={setPeriod}
              soldCount={sales.length}
              label="Sales for"
              note=" Totals and the table below follow this filter."
            />

            <div className={`mb-5 grid gap-3 ${showCommission ? "sm:grid-cols-3" : "sm:grid-cols-2"}`}>
              <div className="rounded-xl bg-white p-4">
                <p className="flex items-center gap-1.5 text-xs font-semibold text-[#2563eb]">
                  <Banknote size={13} />
                  Total Sales
                </p>
                <p data-testid="sales-total" className="mt-1 text-xl font-black text-[#0f172a]">
                  {sym()} {money(error ? 0 : totalRevenue)}
                </p>
              </div>
              <div className="rounded-xl bg-white p-4">
                <p className="flex items-center gap-1.5 text-xs font-semibold text-[#64748b]">
                  {canViewTeam && <Users size={13} />}
                  Vouchers Sold
                </p>
                <p data-testid="sales-count" className="mt-1 text-xl font-black text-[#0f172a]">
                  {error ? 0 : sales.length}
                </p>
              </div>
              {showCommission && (
                <div className="rounded-xl bg-white p-4">
                  <p className="flex items-center gap-1.5 text-xs font-semibold text-[#64748b]">
                    <Percent size={13} />
                    Commission ({rate}%)
                  </p>
                  <p data-testid="sales-commission" className="mt-1 text-xl font-black text-[#0f172a]">
                    {sym()} {money(error ? 0 : commission)}
                  </p>
                </div>
              )}
            </div>

            <div className="mb-4 flex flex-wrap items-center gap-2 rounded-xl bg-white p-3">
              <div className="relative">
                <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-[#94a3b8]" />
                <input
                  data-testid="sales-search"
                  value={query}
                  onChange={(event) => setQuery(event.target.value)}
                  placeholder={canSeeHistory ? "Search code, package or phone..." : "Search code or package..."}
                  className="h-10 w-64 rounded-lg border border-[#cbd5e1] bg-white pl-8 pr-3 text-sm outline-none focus:border-[#2563eb]"
                />
              </div>
              <select
                data-testid="sales-package"
                value={packageFilter}
                onChange={(event) => setPackageFilter(event.target.value)}
                className="h-10 rounded-lg border border-[#cbd5e1] bg-white px-3 text-sm outline-none focus:border-[#2563eb]"
              >
                <option value="All">All packages</option>
                {packageNames.map((n) => (
                  <option key={n} value={n}>
                    {n}
                  </option>
                ))}
              </select>
              <select
                data-testid="sales-saletype"
                value={saleTypeFilter}
                onChange={(event) => setSaleTypeFilter(event.target.value)}
                className="h-10 rounded-lg border border-[#cbd5e1] bg-white px-3 text-sm outline-none focus:border-[#2563eb]"
              >
                <option value="All">All sale types</option>
                {saleTypes.map((n) => (
                  <option key={n} value={n}>
                    {n}
                  </option>
                ))}
              </select>
              <span className="ml-auto text-xs text-[#94a3b8]">
                {error ? "Fix the filter above" : `${sales.length} of ${allSales.length} sales · ${periodLabel(period)}`}
              </span>
            </div>

            <article className="overflow-hidden rounded-2xl bg-white shadow-sm">
              <div className="overflow-x-auto">
                <table className="w-full min-w-[700px] text-left text-sm">
                  <thead className="bg-[#f8fafc] text-xs text-[#64748b]">
                    <tr>
                      {columns.map((c) => (
                        <th key={c} className="px-4 py-3">
                          {c}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody data-testid="sales-rows" className="divide-y divide-[#f1f5f9]">
                    {(error ? [] : sales).map(({ voucher: v, seller, when, amount }) => (
                      <tr key={v.code} className="hover:bg-[#f8fafc]">
                        <td className="px-4 py-3 font-mono text-xs text-[#2563eb]">{v.code}</td>
                        <td className="px-4 py-3">{v.packageName}</td>
                        {canSeeHistory && <td className="px-4 py-3">{v.redeemerPhone ?? "—"}</td>}
                        {canViewTeam && <td className="px-4 py-3">{agentName(seller)}</td>}
                        <td className="px-4 py-3">
                          <span className="rounded-full bg-slate-100 px-2.5 py-1 text-xs font-semibold text-slate-700">
                            {v.saleType}
                          </span>
                        </td>
                        <td className="px-4 py-3 font-semibold text-[#2563eb]">
                          {sym()} {money(amount)}
                        </td>
                        {showCommission && (
                          <td className="px-4 py-3 text-[#475569]">
                            {sym()} {money((amount * rate) / 100)}
                          </td>
                        )}
                        {canSeePayment && (
                          <td className="px-4 py-3">
                            <span className="rounded-full bg-[#f1f5f9] px-2.5 py-1 text-xs font-semibold text-[#2563eb]">
                              Paid
                            </span>
                          </td>
                        )}
                        <td className="px-4 py-3 text-[#64748b]">{formatWhen(when)}</td>
                      </tr>
                    ))}
                    {(error || sales.length === 0) && (
                      <tr>
                        <td colSpan={columns.length} className="px-4 py-10 text-center text-sm text-[#94a3b8]">
                          {error
                            ? error
                            : allSales.length === 0
                              ? "No sales recorded yet."
                              : "No sales match these filters."}
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </article>
          </section>
        );
      }}
    />
  );
}
