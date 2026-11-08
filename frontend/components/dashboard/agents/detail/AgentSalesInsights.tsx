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

const COLORS = ["#1a1a1a", "#1a1a1a", "#1a1a1a", "#f3f1ec", "#111111", "#111111", "#f3f1ec", "#111111"];

function money(value: number) {
  return `${sym()} ${value.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

function Section({ title, children, testId }: { title: string; children: React.ReactNode; testId?: string }) {
  return (
    <article data-testid={testId} className="overflow-hidden rounded-2xl border border-[#e6e6e6] bg-white">
      <div className="border-b border-[#f4f4f4] px-5 py-4">
        <h3 className="text-base font-bold text-[#1a1a1a]">{title}</h3>
      </div>
      {children}
    </article>
  );
}

function Empty({ children }: { children: string }) {
  return <p className="px-5 py-8 text-center text-sm text-[#a3a3a3]">{children}</p>;
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
                  <CartesianGrid vertical={false} strokeDasharray="3 3" stroke="#d4d4d4" opacity={0.7} />
                  <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fontSize: 12, fill: "#525252" }} />
                  <YAxis allowDecimals={false} axisLine={false} tickLine={false} tick={{ fontSize: 12, fill: "#525252" }} />
                  <Tooltip />
                  <Legend />
                  <Bar dataKey="Sold" stackId="a" fill="#1a1a1a" />
                  <Bar dataKey="Remaining" stackId="a" fill="#1a1a1a" />
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
            <thead className="bg-[#ffffff] text-xs text-[#737373]">
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
                <tr key={row.packageName} className="border-t border-[#f4f4f4]">
                  <td className="px-5 py-3 font-semibold text-[#1a1a1a]">{row.packageName}</td>
                  <td className="px-5 py-3 text-[#737373]">{row.batches.length > 0 ? row.batches.join(", ") : "—"}</td>
                  <td className="px-5 py-3 text-[#525252]">{row.given}</td>
                  <td className="px-5 py-3 text-[#525252]">{row.sold}</td>
                  <td className="px-5 py-3 text-[#525252]">{row.remaining}</td>
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
            <thead className="bg-[#ffffff] text-xs text-[#737373]">
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
                <tr key={row.key} className="border-t border-[#f4f4f4]">
                  <td className="px-5 py-3 font-semibold text-[#1a1a1a]">{row.reference}</td>
                  <td className="px-5 py-3 text-[#525252]">{row.given}</td>
                  <td className="px-5 py-3 text-[#737373]">{row.delivery}</td>
                  <td className="px-5 py-3 text-[#525252]">{row.sold}</td>
                  <td className="px-5 py-3 text-[#525252]">{row.remaining}</td>
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
            <thead className="bg-[#ffffff] text-xs text-[#737373]">
              <tr>
                <th className="px-5 py-3 font-semibold">Router</th>
                <th className="px-5 py-3 font-semibold">Vouchers Sold</th>
                <th className="px-5 py-3 font-semibold">Latest Sale</th>
                <th className="px-5 py-3 text-right font-semibold">Retail Value</th>
              </tr>
            </thead>
            <tbody>
              {byRouter.map((row) => (
                <tr key={row.ip} className="border-t border-[#f4f4f4]">
                  <td className="px-5 py-3 font-semibold text-[#1a1a1a]">{row.name}</td>
                  <td className="px-5 py-3 text-[#525252]">{row.vouchersSold}</td>
                  <td className="px-5 py-3 text-[#737373]">
                    {new Date(row.latestSaleMs).toLocaleString("en-GB", { day: "2-digit", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit" })}
                  </td>
                  <td className="px-5 py-3 text-right font-bold text-emerald-700">{money(row.retailValue)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
        {unattributedSold > 0 && (
          <p data-testid="router-note" className="border-t border-[#f4f4f4] px-5 py-3 text-xs text-[#a3a3a3]">
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
            <thead className="bg-[#ffffff] text-xs text-[#737373]">
              <tr>
                <th className="px-5 py-3 font-semibold">Voucher Code</th>
                <th className="px-5 py-3 font-semibold">Package</th>
                <th className="px-5 py-3 font-semibold">Used At</th>
                <th className="px-5 py-3 text-right font-semibold">Amount</th>
              </tr>
            </thead>
            <tbody>
              {recent.map((sale) => (
                <tr key={sale.code} className="border-t border-[#f4f4f4]">
                  <td className="px-5 py-3 font-mono font-semibold text-[#1a1a1a]">{sale.code}</td>
                  <td className="px-5 py-3 text-[#525252]">{sale.packageName}</td>
                  <td className="px-5 py-3 text-[#737373]">{timeAgo(sale.usedAtMs)}</td>
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
