"use client";

// The main packages table: search, status filter, checkboxes for bulk
// actions (activate/hide/disable/delete many at once), and a per-package
// dropdown menu (view, edit, duplicate, hide/unhide, enable/disable,
// expire its vouchers, delete).

import { localizeAmountString } from "@/components/dashboard/shared/currency";
import { useState, type MouseEvent } from "react";
import Link from "next/link";
import {
  Search,
  Eye,
  Pencil,
  Copy,
  EyeOff,
  Ban,
  CheckCircle2,
  CircleSlash,
  Trash2,
  MoreVertical,
  UserCheck,
} from "lucide-react";

import { useDashboard } from "../context/DashboardContext";
import type { Package, PackageStatus } from "../shared/types";
import type { RouterInfo } from "../data/dashboard-data";
import { DropdownMenuPortal } from "../shared/DropdownMenuPortal";

type StatusFilter = "All" | PackageStatus;

export function PackagesTable({
  packages,
  routers,
  onSetStatus,
  onDelete,
}: {
  packages: Package[];
  routers: RouterInfo[];
  onSetStatus: (id: string, status: Package["status"]) => void;
  onDelete: (id: string) => void;
}) {
  const { duplicatePackage, expirePackageVouchers, showToast, businessLocations } = useDashboard();

  const [openMenu, setOpenMenu] = useState<string | null>(null);
  const [menuRect, setMenuRect] = useState<DOMRect | null>(null);
  const [query, setQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<StatusFilter>("All");
  const [selectedIds, setSelectedIds] = useState<string[]>([]);

  const visiblePackages = packages.filter((pkg) => {
    const matchesQuery =
      !query || pkg.name.toLowerCase().includes(query.toLowerCase());
    const matchesStatus = statusFilter === "All" || pkg.status === statusFilter;
    return matchesQuery && matchesStatus;
  });

  const allVisibleSelected =
    visiblePackages.length > 0 &&
    visiblePackages.every((pkg) => selectedIds.includes(pkg.id));

  function toggleSelectAllVisible() {
    const visibleIds = visiblePackages.map((pkg) => pkg.id);
    if (allVisibleSelected) {
      setSelectedIds((current) => current.filter((id) => !visibleIds.includes(id)));
    } else {
      setSelectedIds((current) => [...new Set([...current, ...visibleIds])]);
    }
  }

  function toggleSelectOne(id: string) {
    setSelectedIds((current) =>
      current.includes(id) ? current.filter((i) => i !== id) : [...current, id],
    );
  }

  function handleBulkStatus(status: PackageStatus) {
    selectedIds.forEach((id) => onSetStatus(id, status));
    showToast(`${selectedIds.length} package(s) marked as ${status}.`);
    setSelectedIds([]);
  }

  function handleBulkDelete() {
    selectedIds.forEach((id) => onDelete(id));
    showToast(`${selectedIds.length} package(s) deleted.`);
    setSelectedIds([]);
  }

  function handleOpenMenu(id: string, event: React.MouseEvent<HTMLElement>) {
    const rect = (event.currentTarget as HTMLElement).getBoundingClientRect();
    setMenuRect(rect);
    setOpenMenu((current) => (current === id ? null : id));
  }

  function closeMenu() {
    setOpenMenu(null);
  }

  function routerNameFor(ip: string) {
    return routers.find((r) => r.ip === ip)?.name.split(" (")[0] ?? "Unknown";
  }

  return (
    <article className="overflow-hidden rounded-2xl border border-[#e2e8f0] bg-white shadow-[0_8px_24px_rgba(37,99,235,0.06)]">
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-[#e2e8f0] px-5 py-4">
        <div className="relative">
          <Search
            size={14}
            className="absolute left-3 top-1/2 -translate-y-1/2 text-[#94a3b8]"
          />
          <input
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="Search package name..."
            className="h-10 w-60 rounded-lg border border-[#e2e8f0] bg-white pl-8 pr-3 text-sm outline-none focus:border-[#2563eb]"
          />
        </div>

        <select
          value={statusFilter}
          onChange={(event) => setStatusFilter(event.target.value as StatusFilter)}
          className="h-10 rounded-lg border border-[#e2e8f0] bg-white px-3 text-sm outline-none focus:border-[#2563eb]"
        >
          {(["All", "Active", "Hidden", "Disabled"] as StatusFilter[]).map(
            (option) => (
              <option key={option} value={option}>
                {option === "All" ? "All Statuses" : option}
              </option>
            ),
          )}
        </select>

        <span className="text-xs text-[#94a3b8]">
          Showing {visiblePackages.length} of {packages.length}
        </span>
      </div>

      {selectedIds.length > 0 && (
        <div className="flex flex-wrap items-center gap-3 border-b border-[#e2e8f0] bg-[#ffffff] px-5 py-3">
          <strong className="text-sm text-[#0f172a]">
            {selectedIds.length} selected
          </strong>
          <button
            type="button"
            onClick={() => handleBulkStatus("Active")}
            className="inline-flex items-center gap-1.5 rounded-lg border border-emerald-200 bg-white px-3 py-2 text-xs font-semibold text-emerald-700 hover:bg-white"
          >
            <CheckCircle2 size={13} />
            Activate
          </button>
          <button
            type="button"
            onClick={() => handleBulkStatus("Hidden")}
            className="inline-flex items-center gap-1.5 rounded-lg border border-amber-200 bg-white px-3 py-2 text-xs font-semibold text-amber-700 hover:bg-white"
          >
            <EyeOff size={13} />
            Hide
          </button>
          <button
            type="button"
            onClick={() => handleBulkStatus("Disabled")}
            className="inline-flex items-center gap-1.5 rounded-lg border border-amber-200 bg-white px-3 py-2 text-xs font-semibold text-amber-700 hover:bg-amber-50"
          >
            <Ban size={13} />
            Disable
          </button>
          <button
            type="button"
            onClick={handleBulkDelete}
            className="inline-flex items-center gap-1.5 rounded-lg border border-red-200 bg-white px-3 py-2 text-xs font-semibold text-red-600 hover:bg-red-50"
          >
            <Trash2 size={13} />
            Delete
          </button>
          <button
            type="button"
            onClick={() => setSelectedIds([])}
            className="ml-auto text-xs font-semibold text-[#2563eb] hover:underline"
          >
            Deselect all
          </button>
        </div>
      )}

      <div className="overflow-x-auto">
        <table className="w-full min-w-[1020px] text-left text-sm">
          <thead className="bg-[#ffffff] text-xs text-[#64748b]">
            <tr>
              <th className="px-5 py-4">
                <input
                  type="checkbox"
                  checked={allVisibleSelected}
                  onChange={toggleSelectAllVisible}
                  aria-label="Select all visible packages"
                />
              </th>
              <th className="px-4 py-4 font-semibold">Package Name</th>
              <th className="px-4 py-4 font-semibold">Router</th>
              <th className="px-4 py-4 font-semibold">Price</th>
              <th className="px-4 py-4 font-semibold">Validity</th>
              <th className="px-4 py-4 font-semibold">Download</th>
              <th className="px-4 py-4 font-semibold">Upload</th>
              <th className="px-4 py-4 font-semibold">Customers</th>
              <th className="px-4 py-4 font-semibold">Status</th>
              <th className="px-4 py-4 text-center font-semibold">Actions</th>
            </tr>
          </thead>

          <tbody>
            {visiblePackages.length === 0 && (
              <tr>
                <td
                  colSpan={10}
                  className="px-5 py-10 text-center text-sm text-[#94a3b8]"
                >
                  No packages match this filter.
                </td>
              </tr>
            )}

            {visiblePackages.map((pkg) => (
              <tr
                key={pkg.id}
                className={`border-t border-[#f1f5f9] transition hover:bg-[#ffffff] ${
                  selectedIds.includes(pkg.id) ? "bg-[#ffffff]" : ""
                }`}
              >
                <td className="px-5 py-4">
                  <input
                    type="checkbox"
                    checked={selectedIds.includes(pkg.id)}
                    onChange={() => toggleSelectOne(pkg.id)}
                    aria-label={`Select ${pkg.name}`}
                  />
                </td>
                <td className="px-4 py-4">
                  <span className="rounded-full bg-blue-100 px-3 py-1.5 text-xs font-bold text-blue-700">
                    {pkg.name}
                  </span>
                  {pkg.freeTrial && (
                    <span className="ml-2 rounded-full bg-blue-100 px-2.5 py-1 text-[11px] font-bold text-blue-700">
                      Free Trial
                    </span>
                  )}
                  {pkg.featured && (
                    <span className="ml-2 rounded-full bg-amber-100 px-2.5 py-1 text-[11px] font-bold text-amber-700">
                      Featured
                    </span>
                  )}
                </td>
                <td className="px-4 py-4">
                  {pkg.applyToAllAgents && (
                    <span data-testid="all-agents-badge" className="mb-1 mr-1 inline-flex items-center rounded-full bg-emerald-100 px-2.5 py-1 text-xs font-semibold text-emerald-700">
                      All agents
                    </span>
                  )}
                  {pkg.applyToAllSites ? (
                    <span className="inline-flex items-center gap-1 rounded-full bg-blue-100 px-2.5 py-1 text-xs font-semibold text-blue-700">
                      Universal
                    </span>
                  ) : pkg.applySiteId ? (
                    (() => {
                      const site = businessLocations.find((s) => s.id === pkg.applySiteId);
                      const siteTotalRouters = routers.filter((r) => r.siteId === pkg.applySiteId).length;
                      const isWholeSite = siteTotalRouters > 0 && pkg.routerIps.length === siteTotalRouters;
                      return (
                        <span className="inline-flex items-center gap-1 rounded-full bg-blue-100 px-2.5 py-1 text-xs font-semibold text-blue-700">
                          {site?.name ?? "Unknown site"}
                          {isWholeSite
                            ? ` (all ${siteTotalRouters})`
                            : ` (${pkg.routerIps.length} of ${siteTotalRouters})`}
                        </span>
                      );
                    })()
                  ) : pkg.routerIps.length === 0 ? (
                    <span className="text-xs text-[#94a3b8]">Unassigned</span>
                  ) : pkg.routerIps.length <= 2 ? (
                    <div className="flex flex-wrap gap-1">
                      {pkg.routerIps.map((ip) => (
                        <span key={ip} className="rounded-full bg-slate-100 px-2.5 py-1 text-xs font-semibold text-slate-700">
                          {routerNameFor(ip)}
                        </span>
                      ))}
                    </div>
                  ) : (
                    <span
                      className="rounded-full bg-slate-100 px-2.5 py-1 text-xs font-semibold text-slate-700"
                      title={pkg.routerIps.map(routerNameFor).join(", ")}
                    >
                      {routerNameFor(pkg.routerIps[0])} +{pkg.routerIps.length - 1} more
                    </span>
                  )}
                </td>
                <td className="px-4 py-4 font-semibold text-[#0f172a]">
                  {localizeAmountString(pkg.price)}
                </td>
                <td className="px-4 py-4">
                  <span className="rounded-full bg-amber-100 px-2.5 py-1 text-xs font-semibold text-amber-700">
                    {pkg.validity}
                  </span>
                </td>
                <td className="px-4 py-4">
                  <span className="rounded-full border border-[#e2e8f0] px-2.5 py-1 text-xs font-semibold text-[#475569]">
                    {pkg.download}
                  </span>
                </td>
                <td className="px-4 py-4">
                  <span className="rounded-full border border-[#e2e8f0] px-2.5 py-1 text-xs font-semibold text-[#475569]">
                    {pkg.upload}
                  </span>
                </td>
                <td className="px-4 py-4 font-semibold text-[#2563eb]">
                  {pkg.customers}
                </td>
                <td className="px-4 py-4">
                  <span
                    className={`rounded-full px-3 py-1.5 text-xs font-semibold ${
                      pkg.status === "Active"
                        ? "bg-emerald-100 text-emerald-700"
                        : pkg.status === "Hidden"
                          ? "bg-amber-100 text-amber-700"
                          : "bg-red-100 text-red-700"
                    }`}
                  >
                    {pkg.status}
                  </span>
                </td>
                <td className="px-4 py-4 text-center">
                  <button
                    type="button"
                    onClick={(event) => handleOpenMenu(pkg.id, event)}
                    className="rounded-lg border border-[#e2e8f0] p-2 text-[#475569] hover:bg-[#f1f5f9]"
                    aria-label="Package actions"
                  >
                    <MoreVertical size={16} />
                  </button>

                  {openMenu === pkg.id && (
                    <DropdownMenuPortal
                      anchorRect={menuRect}
                      onClose={closeMenu}
                      width={230}
                    >
                      <Link
                        href={`/dashboards/packages/${pkg.id}`}
                        className="flex items-center gap-2 px-4 py-2.5 text-sm text-[#475569] hover:bg-[#f1f5f9]"
                        onClick={closeMenu}
                      >
                        <Eye size={15} />
                        View Package
                      </Link>

                      <Link
                        href={`/dashboards/packages/${pkg.id}`}
                        className="flex items-center gap-2 px-4 py-2.5 text-sm text-[#475569] hover:bg-[#f1f5f9]"
                        onClick={closeMenu}
                      >
                        <Pencil size={15} />
                        Edit Package
                      </Link>

                      <button
                        type="button"
                        onClick={() => {
                          duplicatePackage(pkg.id);
                          closeMenu();
                        }}
                        className="flex w-full items-center gap-2 px-4 py-2.5 text-sm text-[#475569] hover:bg-[#f1f5f9]"
                      >
                        <Copy size={15} />
                        Duplicate Package
                      </button>

                      <Link
                        href={`/dashboards/packages/${pkg.id}#push-to-agents`}
                        className="flex items-center gap-2 px-4 py-2.5 text-sm text-amber-700 hover:bg-amber-50"
                        onClick={closeMenu}
                      >
                        <UserCheck size={15} />
                        Push to Agents
                      </Link>

                      <div className="my-2 border-t border-[#f1f5f9]" />

                      <button
                        type="button"
                        onClick={() => {
                          onSetStatus(
                            pkg.id,
                            pkg.status === "Hidden" ? "Active" : "Hidden",
                          );
                          closeMenu();
                        }}
                        className="flex w-full items-center gap-2 px-4 py-2.5 text-sm text-amber-700 hover:bg-amber-50"
                      >
                        {pkg.status === "Hidden" ? (
                          <Eye size={15} />
                        ) : (
                          <EyeOff size={15} />
                        )}
                        {pkg.status === "Hidden" ? "Unhide" : "Hide"} Package
                      </button>

                      <button
                        type="button"
                        onClick={() => {
                          onSetStatus(
                            pkg.id,
                            pkg.status === "Disabled" ? "Active" : "Disabled",
                          );
                          closeMenu();
                        }}
                        className={`flex w-full items-center gap-2 px-4 py-2.5 text-sm ${
                          pkg.status === "Disabled"
                            ? "text-emerald-700 hover:bg-emerald-50"
                            : "text-amber-600 hover:bg-amber-50"
                        }`}
                      >
                        {pkg.status === "Disabled" ? (
                          <CheckCircle2 size={15} />
                        ) : (
                          <Ban size={15} />
                        )}
                        {pkg.status === "Disabled" ? "Enable" : "Disable"}{" "}
                        Package
                      </button>

                      <div className="my-2 border-t border-[#f1f5f9]" />

                      <button
                        type="button"
                        onClick={() => {
                          expirePackageVouchers(pkg.name);
                          closeMenu();
                        }}
                        className="flex w-full items-center gap-2 px-4 py-2.5 text-sm text-red-600 hover:bg-red-50"
                      >
                        <CircleSlash size={15} />
                        Expire Package Vouchers
                      </button>

                      <button
                        type="button"
                        onClick={() => {
                          onDelete(pkg.id);
                          closeMenu();
                        }}
                        className="flex w-full items-center gap-2 px-4 py-2.5 text-sm font-semibold text-red-600 hover:bg-red-50"
                      >
                        <Trash2 size={15} />
                        Delete Package
                      </button>
                    </DropdownMenuPortal>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </article>
  );
}
