"use client";

import { sym } from "@/components/dashboard/shared/currency";
import { use } from "react";
import { FileBarChart, CheckCircle2, Clock, XCircle, TrendingUp, Download } from "lucide-react";

import { useDashboard } from "@/components/dashboard/context/DashboardContext";
import { AgentPortalPage } from "@/components/agent-portal/AgentPortalPage";
import { getScopedUsers } from "@/components/agent-portal/realData";

function parsePrice(price: string): number {
  const match = price.match(/[\d,.]+/);
  return match ? parseFloat(match[0].replace(/,/g, "")) : 0;
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

export default function AgentReportsPage({
  params,
}: {
  params: Promise<{ agentId: string }>;
}) {
  const { agentId } = use(params);
  const { vouchers, packages, users, routers } = useDashboard();

  return (
    <AgentPortalPage
      agentId={agentId}
      permissionKey="reports.view"
      featureLabel="Reports"
      render={(agent) => {
        const priceByPackage = Object.fromEntries(packages.map((p) => [p.name, parsePrice(p.price)]));
        const myVouchers = vouchers.filter((v) => v.agentId === agent.id);
        const available = myVouchers.filter((v) => v.status === "Available").length;
        const used = myVouchers.filter((v) => v.status === "Used").length;
        const expired = myVouchers.filter((v) => v.status === "Expired").length;
        const revenue = myVouchers
          .filter((v) => v.status === "Used")
          .reduce((sum, v) => sum + (priceByPackage[v.packageName] ?? 0), 0);
        const canViewFinancial = agent.permissions["reports.viewFinancial"] === "Allowed";
        const canExport = agent.permissions["reports.export"] === "Allowed";

        const packageCounts = new Map<string, number>();
        myVouchers.forEach((v) => packageCounts.set(v.packageName, (packageCounts.get(v.packageName) ?? 0) + 1));
        const topPackage = Array.from(packageCounts.entries()).sort((a, b) => b[1] - a[1])[0];

        const scopedUsers = getScopedUsers(users, routers, agent.routerIp);

        function handleExport() {
          downloadCsv(
            `report-${agent.id}.csv`,
            [
              ["Metric", "Value"],
              ["Available Vouchers", String(available)],
              ["Used Vouchers", String(used)],
              ["Expired Vouchers", String(expired)],
              ...(canViewFinancial ? [[`Total Revenue (${sym()})`, String(revenue)]] : []),
              ["Best-Selling Package", topPackage ? `${topPackage[0]} (${topPackage[1]})` : "—"],
              ["Customers on Router", String(scopedUsers.length)],
            ],
          );
        }

        return (
          <section>
            <div className="mb-5 flex flex-wrap items-start justify-between gap-3">
              <div>
                <h1 className="flex items-center gap-2 text-2xl font-black md:text-3xl">
                  <FileBarChart size={26} className="text-[#1a1a1a]" />
                  Reports
                </h1>
                <p className="mt-1 text-sm text-[#737373]">Your own performance, built from real voucher and customer records.</p>
              </div>
              {canExport && (
                <button
                  type="button"
                  onClick={handleExport}
                  className="inline-flex items-center gap-2 rounded-xl border-2 border-[#1a1a1a] px-4 py-2.5 text-sm font-bold text-[#1a1a1a] hover:bg-[#e6e6e6]"
                >
                  <Download size={16} />
                  Export CSV
                </button>
              )}
            </div>

            <div className="mb-5 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
              {canViewFinancial && (
                <div className="rounded-2xl bg-white p-5">
                  <p className="flex items-center gap-1.5 text-xs font-semibold text-[#1a1a1a]">
                    <TrendingUp size={13} />
                    Total Revenue
                  </p>
                  <p className="mt-1 text-2xl font-black text-[#1a1a1a]">{sym()} {revenue.toLocaleString()}</p>
                </div>
              )}
              <div className="rounded-2xl bg-white p-5">
                <p className="flex items-center gap-1.5 text-xs font-semibold text-[#737373]">
                  <CheckCircle2 size={13} className="text-[#1a1a1a]" />
                  Available Vouchers
                </p>
                <p className="mt-1 text-2xl font-black text-[#1a1a1a]">{available}</p>
              </div>
              <div className="rounded-2xl bg-white p-5">
                <p className="flex items-center gap-1.5 text-xs font-semibold text-[#737373]">
                  <Clock size={13} className="text-slate-500" />
                  Used Vouchers
                </p>
                <p className="mt-1 text-2xl font-black text-[#1a1a1a]">{used}</p>
              </div>
              <div className="rounded-2xl bg-white p-5">
                <p className="flex items-center gap-1.5 text-xs font-semibold text-[#737373]">
                  <XCircle size={13} className="text-red-500" />
                  Expired Vouchers
                </p>
                <p className="mt-1 text-2xl font-black text-[#1a1a1a]">{expired}</p>
              </div>
            </div>

            <div className="grid gap-5 lg:grid-cols-2">
              <article className="rounded-2xl bg-white p-6">
                <h3 className="mb-3 font-bold text-[#1a1a1a]">Best-Selling Package</h3>
                {topPackage ? (
                  <div className="flex items-center justify-between rounded-xl bg-[#f7f7f7] px-4 py-3">
                    <span className="font-semibold text-[#1a1a1a]">{topPackage[0]}</span>
                    <span className="rounded-full bg-[#f4f4f4] px-2.5 py-1 text-xs font-bold text-[#1a1a1a]">
                      {topPackage[1]} voucher{topPackage[1] === 1 ? "" : "s"}
                    </span>
                  </div>
                ) : (
                  <p className="text-sm text-[#a3a3a3]">No vouchers generated yet.</p>
                )}
              </article>

              <article className="rounded-2xl bg-white p-6">
                <h3 className="mb-3 font-bold text-[#1a1a1a]">Customers on Your Router</h3>
                <div className="flex items-center justify-between rounded-xl bg-[#f7f7f7] px-4 py-3">
                  <span className="text-sm text-[#737373]">Total customers</span>
                  <span className="text-lg font-black text-[#1a1a1a]">{scopedUsers.length}</span>
                </div>
              </article>
            </div>
          </section>
        );
      }}
    />
  );
}
