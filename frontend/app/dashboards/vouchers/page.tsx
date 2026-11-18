"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import dynamic from "next/dynamic";
import Link from "next/link";
import { BarChart3, X } from "lucide-react";

import { useDashboard } from "@/components/dashboard/context/DashboardContext";
import { VouchersHeader } from "@/components/dashboard/vouchers/VouchersHeader";
import { VouchersTable } from "@/components/dashboard/vouchers/VouchersTable";
import { RecentBatchesList } from "@/components/dashboard/vouchers/RecentBatchesList";
import { ConnectedAgentBanner } from "@/components/dashboard/agents/ConnectedAgentBanner";
import { BackLink } from "@/components/dashboard/shared/BackLink";
import { computeOverallSales } from "@/components/dashboard/vouchers/batchSales";
import { money } from "@/components/dashboard/shared/currency";

// Only ever needed once the "Generate Vouchers" button is clicked, so it's
// loaded on demand instead of shipping in this page's initial JS.
const GenerateVouchersModal = dynamic(
  () => import("@/components/dashboard/vouchers/GenerateVouchersModal").then((m) => m.GenerateVouchersModal),
  { ssr: false },
);

export default function VouchersPage() {
  const router = useRouter();
  const { vouchers, voucherBatches, deleteVoucher, routers, businessLocations, packages } = useDashboard();
  const [filter, setFilter] = useState("All");
  const [generateOpen, setGenerateOpen] = useState(false);
  // Defaults to the primary/first site — the person can widen it to "Any
  // site" (or pick another) whenever they actually want to.
  const [siteFilter, setSiteFilter] = useState(businessLocations[0]?.id ?? "");
  const [routerFilter, setRouterFilter] = useState("");
  const [packageFilter, setPackageFilter] = useState("");
  const [batchQuery, setBatchQuery] = useState("");
  const [fromDate, setFromDate] = useState("");
  const [toDate, setToDate] = useState("");

  const batchById = new Map<string, (typeof voucherBatches)[number]>(
    voucherBatches.map((b) => [b.id, b]),
  );
  const routersForSiteFilter = siteFilter ? routers.filter((r) => r.siteId === siteFilter) : routers;
  const hasAnyFilter = siteFilter || routerFilter || packageFilter || batchQuery || fromDate || toDate;

  const fromMs = fromDate ? new Date(fromDate + "T00:00:00").getTime() : null;
  const toMs = toDate ? new Date(toDate + "T23:59:59").getTime() : null;

  const filteredVouchers = vouchers.filter((voucher) => {
    if (filter === "Available" && voucher.status !== "Available") return false;
    if (filter === "Expired" && voucher.status !== "Expired") return false;
    if (filter === "Online" && !(voucher.saleType === "Online" && voucher.status === "Used")) return false;
    if (filter === "Walk-in" && !(voucher.saleType === "Counter Sale" && voucher.status === "Used")) return false;
    if (filter === "Free Trial" && voucher.saleType !== "Free Trial") return false;
    if (filter === "Giveaway" && voucher.saleType !== "Giveaway") return false;

    if (packageFilter && voucher.packageName !== packageFilter) return false;
    if (fromMs !== null && voucher.generatedAtMs < fromMs) return false;
    if (toMs !== null && voucher.generatedAtMs > toMs) return false;

    // Searching by a specific batch ID/reference is a precise, deliberate
    // lookup — it takes priority over the site/router scope so it always
    // finds every voucher in that batch, even if the batch belongs to a
    // site other than whichever one happens to be selected right now.
    if (batchQuery) {
      const batch = voucher.batchId ? batchById.get(voucher.batchId) : null;
      if (!batch) return false;
      const q = batchQuery.toLowerCase();
      if (!batch.reference.toLowerCase().includes(q) && !batch.id.toLowerCase().includes(q)) {
        return false;
      }
    } else if (routerFilter || siteFilter) {
      const batch = voucher.batchId ? batchById.get(voucher.batchId) : null;
      if (!batch) return false;
      if (routerFilter && !batch.routerIps.includes(routerFilter)) return false;
      if (siteFilter && !routerFilter) {
        const siteRouterIps = routers.filter((r) => r.siteId === siteFilter).map((r) => r.ip);
        if (!batch.routerIps.some((ip) => siteRouterIps.includes(ip))) return false;
      }
    }
    return true;
  });

  function clearAllFilters() {
    setSiteFilter("");
    setRouterFilter("");
    setPackageFilter("");
    setBatchQuery("");
    setFromDate("");
    setToDate("");
  }

  // Status tabs follow the active site/router/package/batch filters so overall
  // manage matches what the table shows; sales tiles stay account-wide.
  const scopedForTabs = vouchers.filter((voucher) => {
    if (packageFilter && voucher.packageName !== packageFilter) return false;
    if (fromMs !== null && voucher.generatedAtMs < fromMs) return false;
    if (toMs !== null && voucher.generatedAtMs > toMs) return false;
    if (batchQuery) {
      const batch = voucher.batchId ? batchById.get(voucher.batchId) : null;
      if (!batch) return false;
      const q = batchQuery.toLowerCase();
      if (!batch.reference.toLowerCase().includes(q) && !batch.id.toLowerCase().includes(q)) return false;
    } else if (routerFilter || siteFilter) {
      const batch = voucher.batchId ? batchById.get(voucher.batchId) : null;
      if (!batch) return false;
      if (routerFilter && !batch.routerIps.includes(routerFilter)) return false;
      if (siteFilter && !routerFilter) {
        const siteRouterIps = routers.filter((r) => r.siteId === siteFilter).map((r) => r.ip);
        if (!batch.routerIps.some((ip) => siteRouterIps.includes(ip))) return false;
      }
    }
    return true;
  });

  const overallSales = useMemo(
    () => computeOverallSales(vouchers, voucherBatches, packages),
    [vouchers, voucherBatches, packages],
  );

  return (
    <section className="w-full">
      <BackLink />
      <VouchersHeader
        vouchers={scopedForTabs}
        activeFilter={filter}
        onFilterChange={setFilter}
        onGenerateClick={() => setGenerateOpen(true)}
      />
      <ConnectedAgentBanner />

      <div className="mb-5 grid gap-3 sm:grid-cols-3">
        <div className="rounded-2xl border border-[#e6e6e6] bg-white p-4">
          <p className="text-xs font-semibold text-[#737373]">Overall voucher sales</p>
          <p className="mt-1 text-2xl font-black text-[#1a1a1a]">{money(overallSales.revenue)}</p>
          <p className="mt-0.5 text-xs text-[#737373]">{overallSales.sold} used of {overallSales.total}</p>
        </div>
        <div className="rounded-2xl border border-[#e6e6e6] bg-white p-4">
          <p className="text-xs font-semibold text-[#737373]">Batches on this account</p>
          <p className="mt-1 text-2xl font-black text-[#1a1a1a]">
            {voucherBatches.filter((b) => !b.hiddenFromAdmin).length}
          </p>
          <p className="mt-0.5 text-xs text-[#737373]">Manage each batch for sales and print</p>
        </div>
        <Link
          href="/dashboards/vouchers/tracking"
          className="flex items-center gap-3 rounded-2xl border border-[#e6e6e6] bg-white p-4 transition hover:border-[#1a1a1a]"
        >
          <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-[#1a1a1a] text-white">
            <BarChart3 size={18} />
          </span>
          <div>
            <p className="text-sm font-bold text-[#1a1a1a]">Batch tracking report</p>
            <p className="text-xs text-[#737373]">Used, available, expired and revenue per batch</p>
          </div>
        </Link>
      </div>

      <div className="mb-5 flex flex-wrap items-center gap-2 border-b border-[#e6e6e6] pb-4">
        <span className="mr-1 text-xs font-semibold text-[#a3a3a3]">Filter:</span>

        <select
          value={siteFilter}
          onChange={(event) => {
            setSiteFilter(event.target.value);
            setRouterFilter("");
          }}
          className="h-9 rounded-lg border border-[#e6e6e6] bg-white px-2.5 text-xs font-medium text-[#525252] outline-none focus:border-[#1a1a1a]"
        >
          <option value="">Any site / business</option>
          {businessLocations.map((site) => (
            <option key={site.id} value={site.id}>
              {site.name}
            </option>
          ))}
        </select>

        <select
          value={routerFilter}
          onChange={(event) => setRouterFilter(event.target.value)}
          className="h-9 rounded-lg border border-[#e6e6e6] bg-white px-2.5 text-xs font-medium text-[#525252] outline-none focus:border-[#1a1a1a]"
        >
          <option value="">Any router</option>
          {routersForSiteFilter.map((r) => (
            <option key={r.ip} value={r.ip}>
              {r.name.split(" (")[0]}
            </option>
          ))}
        </select>

        <select
          value={packageFilter}
          onChange={(event) => setPackageFilter(event.target.value)}
          className="h-9 rounded-lg border border-[#e6e6e6] bg-white px-2.5 text-xs font-medium text-[#525252] outline-none focus:border-[#1a1a1a]"
        >
          <option value="">Any package</option>
          {packages.map((pkg) => (
            <option key={pkg.id} value={pkg.name}>
              {pkg.name}
            </option>
          ))}
        </select>

        <input
          value={batchQuery}
          onChange={(event) => setBatchQuery(event.target.value)}
          placeholder="Batch ID / reference"
          className="h-9 w-40 rounded-lg border border-[#e6e6e6] bg-white px-2.5 text-xs font-medium text-[#525252] outline-none placeholder:font-normal placeholder:text-[#a3a3a3] focus:border-[#1a1a1a]"
        />

        <input
          type="date"
          value={fromDate}
          onChange={(event) => setFromDate(event.target.value)}
          className="h-9 rounded-lg border border-[#e6e6e6] bg-white px-2 text-xs font-medium text-[#525252] outline-none focus:border-[#1a1a1a]"
        />
        <span className="text-xs text-[#a3a3a3]">to</span>
        <input
          type="date"
          value={toDate}
          onChange={(event) => setToDate(event.target.value)}
          className="h-9 rounded-lg border border-[#e6e6e6] bg-white px-2 text-xs font-medium text-[#525252] outline-none focus:border-[#1a1a1a]"
        />

        {hasAnyFilter && (
          <button
            type="button"
            onClick={clearAllFilters}
            className="inline-flex items-center gap-1 rounded-lg border border-[#e6e6e6] px-2.5 py-1.5 text-xs font-semibold text-[#737373] hover:bg-[#ffffff]"
          >
            <X size={12} />
            Clear
          </button>
        )}
        <span className="ml-auto text-xs text-[#a3a3a3]">
          {filteredVouchers.length} voucher{filteredVouchers.length === 1 ? "" : "s"}
        </span>
      </div>

      <RecentBatchesList batches={voucherBatches.filter((b) => !b.hiddenFromAdmin)} />

      <VouchersTable vouchers={filteredVouchers} onDelete={deleteVoucher} />

      <GenerateVouchersModal
        open={generateOpen}
        onClose={() => setGenerateOpen(false)}
        onGenerated={(batchId) => {
          setGenerateOpen(false);
          router.push(`/dashboards/vouchers/batch/${batchId}`);
        }}
      />
    </section>
  );
}
