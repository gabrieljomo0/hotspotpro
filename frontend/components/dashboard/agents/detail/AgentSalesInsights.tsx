"use client";

// What an agent has sold, broken down: by package (with two charts), by
// batch, by router, and the most recent sales.

import { sym } from "@/components/dashboard/shared/currency";
import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Legend,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";

import { timeAgo, type BatchRow, type PackageRow, type RouterRow } from "../agentLedger";

const COLORS = ["#2563eb", "#3b82f6", "#60a5fa", "#93c5fd", "#1d4ed8", "#1e40af", "#bfdbfe", "#1e3a8a"];

function money(value: number) {
  return `${sym()} ${value.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

function Section({ title, children, testId }: { title: string; children: React.ReactNode; testId?: string }) {
  return (
    <article data-testid={testId} className="overflow-hidden rounded-2xl border border-[#e2e8f0] bg-white">
      <div className="border-b border-[#f1f5f9] px-5 py-4">
        <h3 className="text-base font-bold text-[#0f172a]">{title}</h3>
      </div>
      {children}
    </article>
  );
}

function Empty({ children }: { children: string }) {
  return <p className="px-5 py-8 text-center text-sm text-[#94a3b8]">{children}</p>;
}

export function AgentSalesInsights({
  byPackage,
  byBatch,
  byRouter,
  recent,
  unattributedSold,
}: {
  byPackage: PackageRow[];
  byBatch: BatchRow[];
  byRouter: RouterRow[];
  recent: Array<{ code: string; packageName: string; usedAtMs: number; amount: number }>;
  // Sold vouchers that aren't in a batch, so can't be placed on a router.
  unattributedSold: number;
}) {
  const barData = byPackage.map((row) => ({ name: row.packageName, Sold: row.sold, Remaining: row.remaining }));
  const pieData = byPackage.filter((row) => row.retailValue > 0).map((row) => ({ name: row.packageName, value: row.retailValue }));

  return (
    <div className="space-y-5">
      <div className="grid gap-5 lg:grid-cols-2">
        <Section title="Sales by Package" testId="chart-sales-by-package">
          {barData.length === 0 ? (
            <Empty>No vouchers yet.</Empty>
          ) : (
            <div className="h-[280px] p-4">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={barData}>
                  <CartesianGrid vertical={false} strokeDasharray="3 3" stroke="#cbd5e1" opacity={0.7} />
                  <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fontSize: 12, fill: "#475569" }} />
                  <YAxis allowDecimals={false} axisLine={false} tickLine={false} tick={{ fontSize: 12, fill: "#475569" }} />
                  <Tooltip />
                  <Legend />
                  <Bar dataKey="Sold" stackId="a" fill="#10b981" />
                  <Bar dataKey="Remaining" stackId="a" fill="#f59e0b" />
                </BarChart>
              </ResponsiveContainer>
            </div>
          )}
        </Section>

        <Section title="Retail Sales Value by Package" testId="chart-value-by-package">
          {pieData.length === 0 ? (
            <Empty>Nothing sold yet.</Empty>
          ) : (
            <div className="h-[280px] p-4">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie data={pieData} dataKey="value" nameKey="name" innerRadius={60} outerRadius={105}>
                    {pieData.map((entry, index) => (
                      <Cell key={entry.name} fill={COLORS[index % COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip formatter={(value) => money(Number(value))} />
                  <Legend />
                </PieChart>
              </ResponsiveContainer>
            </div>
          )}
        </Section>
      </div>

      <Section title="Breakdown by Package" testId="breakdown-package">
        {byPackage.length === 0 ? (
          <Empty>No vouchers yet.</Empty>
        ) : (
          <table className="w-full text-left text-sm">
            <thead className="bg-[#ffffff] text-xs text-[#64748b]">
              <tr>
                <th className="px-5 py-3 font-semibold">Package</th>
                <th className="px-5 py-3 font-semibold">Batch</th>
                <th className="px-5 py-3 font-semibold">Given</th>
                <th className="px-5 py-3 font-semibold">Sold</th>
                <th className="px-5 py-3 font-semibold">Remaining</th>
                <th className="px-5 py-3 text-right font-semibold">Retail Value</th>
              </tr>
            </thead>
            <tbody>
              {byPackage.map((row) => (
                <tr key={row.packageName} className="border-t border-[#f1f5f9]">
                  <td className="px-5 py-3 font-semibold text-[#0f172a]">{row.packageName}</td>
                  <td className="px-5 py-3 text-[#64748b]">{row.batches.length > 0 ? row.batches.join(", ") : "—"}</td>
                  <td className="px-5 py-3 text-[#475569]">{row.given}</td>
                  <td className="px-5 py-3 text-[#475569]">{row.sold}</td>
                  <td className="px-5 py-3 text-[#475569]">{row.remaining}</td>
                  <td className="px-5 py-3 text-right font-bold text-emerald-700">{money(row.retailValue)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </Section>

      <Section title="Breakdown by Batch" testId="breakdown-batch">
        {byBatch.length === 0 ? (
          <Empty>No vouchers yet.</Empty>
        ) : (
          <table className="w-full text-left text-sm">
            <thead className="bg-[#ffffff] text-xs text-[#64748b]">
              <tr>
                <th className="px-5 py-3 font-semibold">Batch</th>
                <th className="px-5 py-3 font-semibold">Given</th>
                <th className="px-5 py-3 font-semibold">Delivery</th>
                <th className="px-5 py-3 font-semibold">Sold</th>
                <th className="px-5 py-3 font-semibold">Remaining</th>
                <th className="px-5 py-3 text-right font-semibold">Retail Value</th>
              </tr>
            </thead>
            <tbody>
              {byBatch.map((row) => (
                <tr key={row.key} className="border-t border-[#f1f5f9]">
                  <td className="px-5 py-3 font-semibold text-[#0f172a]">{row.reference}</td>
                  <td className="px-5 py-3 text-[#475569]">{row.given}</td>
                  <td className="px-5 py-3 text-[#64748b]">{row.delivery}</td>
                  <td className="px-5 py-3 text-[#475569]">{row.sold}</td>
                  <td className="px-5 py-3 text-[#475569]">{row.remaining}</td>
                  <td className="px-5 py-3 text-right font-bold text-emerald-700">{money(row.retailValue)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </Section>

      <Section title="Breakdown by Router" testId="breakdown-router">
        {byRouter.length === 0 ? (
          <Empty>No sales on any router yet.</Empty>
        ) : (
          <table className="w-full text-left text-sm">
            <thead className="bg-[#ffffff] text-xs text-[#64748b]">
              <tr>
                <th className="px-5 py-3 font-semibold">Router</th>
                <th className="px-5 py-3 font-semibold">Vouchers Sold</th>
                <th className="px-5 py-3 font-semibold">Latest Sale</th>
                <th className="px-5 py-3 text-right font-semibold">Retail Value</th>
              </tr>
            </thead>
            <tbody>
              {byRouter.map((row) => (
                <tr key={row.ip} className="border-t border-[#f1f5f9]">
                  <td className="px-5 py-3 font-semibold text-[#0f172a]">{row.name}</td>
                  <td className="px-5 py-3 text-[#475569]">{row.vouchersSold}</td>
                  <td className="px-5 py-3 text-[#64748b]">
                    {new Date(row.latestSaleMs).toLocaleString("en-GB", { day: "2-digit", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit" })}
                  </td>
                  <td className="px-5 py-3 text-right font-bold text-emerald-700">{money(row.retailValue)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
        {unattributedSold > 0 && (
          <p data-testid="router-note" className="border-t border-[#f1f5f9] px-5 py-3 text-xs text-[#94a3b8]">
            {unattributedSold} sold voucher{unattributedSold === 1 ? "" : "s"} aren&apos;t part of a batch, so{" "}
            {unattributedSold === 1 ? "it can't" : "they can't"} be placed on a router.
          </p>
        )}
      </Section>

      <Section title="Recent Sales" testId="recent-sales">
        {recent.length === 0 ? (
          <Empty>No sales yet.</Empty>
        ) : (
          <table className="w-full text-left text-sm">
            <thead className="bg-[#ffffff] text-xs text-[#64748b]">
              <tr>
                <th className="px-5 py-3 font-semibold">Voucher Code</th>
                <th className="px-5 py-3 font-semibold">Package</th>
                <th className="px-5 py-3 font-semibold">Used At</th>
                <th className="px-5 py-3 text-right font-semibold">Amount</th>
              </tr>
            </thead>
            <tbody>
              {recent.map((sale) => (
                <tr key={sale.code} className="border-t border-[#f1f5f9]">
                  <td className="px-5 py-3 font-mono font-semibold text-[#2563eb]">{sale.code}</td>
                  <td className="px-5 py-3 text-[#475569]">{sale.packageName}</td>
                  <td className="px-5 py-3 text-[#64748b]">{timeAgo(sale.usedAtMs)}</td>
                  <td className="px-5 py-3 text-right font-bold text-emerald-700">{money(sale.amount)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </Section>
    </div>
  );
}
