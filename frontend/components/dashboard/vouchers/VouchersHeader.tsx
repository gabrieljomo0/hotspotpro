"use client";

import Link from "next/link";
import { Sparkles, FilePlus2, Users2, BarChart3, Bookmark } from "lucide-react";

import type { Voucher } from "../shared/types";

export function VouchersHeader({
  vouchers,
  activeFilter,
  onFilterChange,
  onGenerateClick,
}: {
  vouchers: Voucher[];
  activeFilter: string;
  onFilterChange: (filter: string) => void;
  onGenerateClick: () => void;
}) {
  const inStock = vouchers.filter((v) => v.status === "Available").length;
  const webOrders = vouchers.filter(
    (v) => v.saleType === "Online" && v.status === "Used",
  ).length;
  const counterSales = vouchers.filter(
    (v) => v.saleType === "Counter Sale" && v.status === "Used",
  ).length;
  const trialCodes = vouchers.filter((v) => v.saleType === "Free Trial").length;
  const lapsed = vouchers.filter((v) => v.status === "Expired").length;
  const complimentary = vouchers.filter((v) => v.saleType === "Giveaway").length;

  const tabs = [
    { key: "All", label: "All", count: vouchers.length },
    { key: "Available", label: "Available", count: inStock },
    { key: "Online", label: "Online Sales", count: webOrders },
    { key: "Walk-in", label: "Walk-in Sales", count: counterSales },
    { key: "Free Trial", label: "Free Trial", count: trialCodes },
    { key: "Expired", label: "Expired", count: lapsed },
    { key: "Giveaway", label: "Giveaways", count: complimentary },
  ] as const;

  return (
    <div className="mb-6">
      <div className="flex flex-col justify-between gap-4 md:flex-row md:items-start">
        <div>
          <h2 className="text-3xl font-bold tracking-tight md:text-4xl">
            Vouchers
          </h2>
          <p className="mt-2 max-w-xl text-sm text-[#64748b] md:text-base">
            Manage prepaid voucher codes customers buy and redeem for internet
            access.
          </p>
        </div>

        <div className="flex flex-wrap gap-3">
          <button
            type="button"
            onClick={onGenerateClick}
            className="inline-flex items-center gap-2 rounded-xl bg-[#2563eb] px-4 py-3 text-sm font-bold text-white shadow-sm transition hover:bg-[#1d4ed8]"
          >
            <Sparkles size={17} />
            Generate Vouchers
          </button>
          <Link
            href="/dashboards/vouchers/presets"
            className="inline-flex items-center gap-2 rounded-xl border border-blue-300 bg-white px-4 py-3 text-sm font-bold text-blue-700 shadow-sm transition hover:bg-blue-100"
          >
            <Bookmark size={17} />
            Generate from Preset
          </Link>
          <Link
            href="/dashboards/vouchers/tracking"
            className="inline-flex items-center gap-2 rounded-xl border border-[#e2e8f0] bg-white px-4 py-3 text-sm font-bold text-[#475569] shadow-sm transition hover:bg-[#ffffff]"
          >
            <BarChart3 size={17} />
            Batch Tracking
          </Link>
          <Link
            href="/dashboards/vouchers/create"
            className="inline-flex items-center gap-2 rounded-xl border border-[#e2e8f0] bg-white px-4 py-3 text-sm font-bold text-[#475569] shadow-sm transition hover:bg-[#ffffff]"
          >
            <FilePlus2 size={17} />
            New Voucher
          </Link>
          <Link
            href="/dashboards/vouchers/bulk-assign"
            className="inline-flex items-center gap-2 rounded-xl border border-[#e2e8f0] bg-white px-4 py-3 text-sm font-bold text-[#475569] shadow-sm transition hover:bg-[#ffffff]"
          >
            <Users2 size={17} />
            Assign to Customer
          </Link>
        </div>
      </div>

      <div className="mt-5 flex flex-wrap gap-2">
        {tabs.map((tab) => {
          const isActive = activeFilter === tab.key;
          return (
            <button
              type="button"
              key={tab.key}
              onClick={() => onFilterChange(tab.key)}
              className={`inline-flex items-center gap-2 rounded-full border px-4 py-2 text-sm font-semibold transition ${
                isActive
                  ? "border-[#2563eb] bg-[#f1f5f9] text-[#2563eb]"
                  : "border-[#e2e8f0] bg-white text-[#475569] hover:bg-[#ffffff]"
              }`}
            >
              {tab.label}
              <span
                className={`rounded-full px-2 py-0.5 text-xs font-bold ${
                  isActive ? "bg-[#2563eb] text-white" : "bg-[#f1f5f9] text-[#64748b]"
                }`}
              >
                {tab.count}
              </span>
            </button>
          );
        })}
      </div>
    </div>
  );
}
