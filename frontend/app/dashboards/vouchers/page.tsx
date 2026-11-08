"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import dynamic from "next/dynamic";
import { X } from "lucide-react";

import { useDashboard } from "@/components/dashboard/context/DashboardContext";
import { VouchersHeader } from "@/components/dashboard/vouchers/VouchersHeader";
import { VouchersTable } from "@/components/dashboard/vouchers/VouchersTable";
import { RecentBatchesList } from "@/components/dashboard/vouchers/RecentBatchesList";
import { ConnectedAgentBanner } from "@/components/dashboard/agents/ConnectedAgentBanner";
import { BackLink } from "@/components/dashboard/shared/BackLink";

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
    if (filter === "Walk-in" && !(voucher.saleType === "Walk-in" && voucher.status === "Used")) return false;
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

  return (
    <section className="w-full">
      <BackLink />
      <VouchersHeader
        vouchers={vouchers}
        activeFilter={filter}
        onFilterChange={setFilter}
        onGenerateClick={() => setGenerateOpen(true)}
      />
      <ConnectedAgentBanner />

      <div className="mb-5 flex flex-wrap items-center gap-2 border-b border-[#e2e8f0] pb-4">
        <span className="mr-1 text-xs font-semibold text-[#94a3b8]">Filter:</span>

        <select
          value={siteFilter}
          onChange={(event) => {
            setSiteFilter(event.target.value);
            setRouterFilter("");
          }}
          className="h-9 rounded-lg border border-[#e2e8f0] bg-white px-2.5 text-xs font-medium text-[#475569] outline-none focus:border-[#2563eb]"
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
          className="h-9 rounded-lg border border-[#e2e8f0] bg-white px-2.5 text-xs font-medium text-[#475569] outline-none focus:border-[#2563eb]"
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
          className="h-9 rounded-lg border border-[#e2e8f0] bg-white px-2.5 text-xs font-medium text-[#475569] outline-none focus:border-[#2563eb]"
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
          className="h-9 w-40 rounded-lg border border-[#e2e8f0] bg-white px-2.5 text-xs font-medium text-[#475569] outline-none placeholder:font-normal placeholder:text-[#94a3b8] focus:border-[#2563eb]"
        />

        <input
          type="date"
          value={fromDate}
          onChange={(event) => setFromDate(event.target.value)}
          className="h-9 rounded-lg border border-[#e2e8f0] bg-white px-2 text-xs font-medium text-[#475569] outline-none focus:border-[#2563eb]"
        />
        <span className="text-xs text-[#94a3b8]">to</span>
        <input
          type="date"
          value={toDate}
          onChange={(event) => setToDate(event.target.value)}
          className="h-9 rounded-lg border border-[#e2e8f0] bg-white px-2 text-xs font-medium text-[#475569] outline-none focus:border-[#2563eb]"
        />

        {hasAnyFilter && (
          <button
            type="button"
            onClick={clearAllFilters}
            className="inline-flex items-center gap-1 rounded-lg border border-[#e2e8f0] px-2.5 py-1.5 text-xs font-semibold text-[#64748b] hover:bg-[#ffffff]"
          >
            <X size={12} />
            Clear
          </button>
        )}
        <span className="ml-auto text-xs text-[#94a3b8]">
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
