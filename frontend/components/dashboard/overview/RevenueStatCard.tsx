"use client";

import { sym } from "@/components/dashboard/shared/currency";
import Link from "next/link";
import { Banknote, Ticket, Package as PackageIcon } from "lucide-react";

import { useDashboard } from "../context/DashboardContext";
import { useDashboardScope } from "./useDashboardScope";

const PERIOD_LABEL: Record<string, string> = {
  Today: "Today's Revenue",
  "This Week": "This Week's Revenue",
  "This Month": "This Month's Revenue",
  "This Year": "This Year's Revenue",
};

function parsePrice(price: string): number {
  const match = price.match(/[\d,.]+/);
  return match ? parseFloat(match[0].replace(/,/g, "")) : 0;
}

function startOfRange(period: string): number {
  const now = new Date();
  if (period === "Today") {
    return new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime();
  }
  if (period === "This Week") {
    const day = now.getDay();
    const mondayOffset = day === 0 ? 6 : day - 1;
    const start = new Date(now);
    start.setDate(now.getDate() - mondayOffset);
    return new Date(start.getFullYear(), start.getMonth(), start.getDate()).getTime();
  }
  if (period === "This Month") {
    return new Date(now.getFullYear(), now.getMonth(), 1).getTime();
  }
  // This Year
  return new Date(now.getFullYear(), 0, 1).getTime();
}

export function RevenueStatCard() {
  const { dashboardPeriod, packages } = useDashboard();
  // Only the vouchers inside the dashboard filter (everything, by default).
  const { vouchers } = useDashboardScope();
  const label = PERIOD_LABEL[dashboardPeriod] ?? PERIOD_LABEL.Today;

  const priceByPackage = Object.fromEntries(packages.map((p) => [p.name, parsePrice(p.price)]));
  const packageTypeByName = Object.fromEntries(
    packages.map((p) => [p.name, p.hotspotEnabled ? "voucher" : p.pppoeEnabled ? "package" : "voucher"]),
  );

  const rangeStart = startOfRange(dashboardPeriod);
  const soldInRange = vouchers.filter((v) => v.status === "Used" && v.generatedAtMs >= rangeStart);

  let voucherRevenue = 0;
  let packageRevenue = 0;
  soldInRange.forEach((v) => {
    const amount = priceByPackage[v.packageName] ?? 0;
    if (packageTypeByName[v.packageName] === "package") {
      packageRevenue += amount;
    } else {
      voucherRevenue += amount;
    }
  });
  const total = voucherRevenue + packageRevenue;

  return (
    <Link
      href="/dashboards/analytics"
      className="min-h-[150px] rounded-2xl border border-[#e2e8f0] bg-white p-5 shadow-[0_8px_24px_rgba(37,99,235,0.06)] transition-all duration-300 hover:-translate-y-1 hover:shadow-lg"
    >
      <div className="flex items-center gap-4">
        <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-full bg-[#fff8df] text-[#b7791f]">
          <Banknote size={27} />
        </div>
        <div className="min-w-0 flex-1">
          <p className="text-sm font-medium text-[#64748b]">{label}</p>
          <p className="mt-2 truncate text-2xl font-bold">{sym()} {total.toLocaleString()}</p>

          <div className="mt-3 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs">
            <span className="inline-flex items-center gap-1 font-semibold text-blue-600">
              <Ticket size={11} />
              Vouchers: {sym()} {voucherRevenue.toLocaleString()}
            </span>
            <span className="inline-flex items-center gap-1 font-semibold text-emerald-600">
              <PackageIcon size={11} />
              Packages: {sym()} {packageRevenue.toLocaleString()}
            </span>
          </div>
        </div>
      </div>
    </Link>
  );
}
