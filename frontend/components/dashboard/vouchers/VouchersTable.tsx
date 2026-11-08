"use client";

// The main vouchers table: search, checkboxes for selecting multiple
// vouchers, bulk actions (copy codes, delete), and per-voucher actions via
// a dropdown menu (copy, view the user who redeemed it, delete).

import { useState, type MouseEvent } from "react";
import { Check, Copy, Download, MoreVertical, Search, Trash2 } from "lucide-react";

import { useDashboard } from "../context/DashboardContext";
import type { Voucher } from "../shared/types";
import { DropdownMenuPortal } from "../shared/DropdownMenuPortal";
import { ActiveUserActionsMenu } from "../active-users/ActiveUserActionsMenu";
import { getUserId } from "../active-users/userLinks";

type VoucherBulkAction =
  | "extend"
  | "topup"
  | "resend-sms"
  | "expire"
  | "export"
  | "copy"
  | "delete";

const VOUCHER_BULK_ACTIONS: Array<{ key: VoucherBulkAction; label: string }> = [
  { key: "extend", label: "Extend time by…" },
  { key: "topup", label: "Top up data by…" },
  { key: "resend-sms", label: "Resend voucher SMS" },
  { key: "expire", label: "Mark as expired" },
  { key: "export", label: "Export selected (CSV)" },
  { key: "copy", label: "Copy codes" },
  { key: "delete", label: "Delete selected" },
];

const EXTEND_UNITS = ["Minutes", "Hours", "Days"];

export function VouchersTable({
  vouchers,
  onDelete,
}: {
  vouchers: Voucher[];
  onDelete: (code: string) => void;
}) {
  const { findAgent, users, showToast, extendUserAccess, topUpUserData, resendVoucherSms, expireVouchers } =
    useDashboard();
  const [copiedCode, setCopiedCode] = useState<string | null>(null);
  const [openMenu, setOpenMenu] = useState<string | null>(null);
  const [menuRect, setMenuRect] = useState<DOMRect | null>(null);
  const [query, setQuery] = useState("");
  const [selectedCodes, setSelectedCodes] = useState<string[]>([]);
  const [bulkAction, setBulkAction] = useState<VoucherBulkAction>("extend");
  const [extendAmount, setExtendAmount] = useState("1");
  const [extendUnit, setExtendUnit] = useState("Hours");
  const [topUpAmount, setTopUpAmount] = useState("1");

  const visibleVouchers = vouchers.filter(
    (v) =>
      !query ||
      v.code.toLowerCase().includes(query.toLowerCase()) ||
      v.packageName.toLowerCase().includes(query.toLowerCase()),
  );

  const allVisibleSelected =
    visibleVouchers.length > 0 &&
    visibleVouchers.every((v) => selectedCodes.includes(v.code));

  function linkedUserIdFor(code: string) {
    const linkedUser = users.find((user) => user.voucherUsername === code);
    return linkedUser ? getUserId(linkedUser) : null;
  }

  function toggleSelectAllVisible() {
    const visibleCodesList = visibleVouchers.map((v) => v.code);
    if (allVisibleSelected) {
      setSelectedCodes((current) =>
        current.filter((code) => !visibleCodesList.includes(code)),
      );
    } else {
      setSelectedCodes((current) => [
        ...new Set([...current, ...visibleCodesList]),
      ]);
    }
  }

  function toggleSelectOne(code: string) {
    setSelectedCodes((current) =>
      current.includes(code)
        ? current.filter((c) => c !== code)
        : [...current, code],
    );
  }

  async function handleBulkCopy() {
    try {
      await navigator.clipboard.writeText(selectedCodes.join("\n"));
      showToast(`${selectedCodes.length} voucher code(s) copied.`);
    } catch {
      // clipboard unavailable
    }
  }

  function handleBulkExport() {
    const rows = vouchers.filter((v) => selectedCodes.includes(v.code));
    const header = "Code,Package,Status,Delivery,Sale Type,Customer,Phone,Generated";
    const csv = [
      header,
      ...rows.map((v) =>
        [v.code, v.packageName, v.status, v.delivery, v.saleType, v.usedByCustomerId ?? "", v.redeemerPhone ?? "", v.generatedAt]
          .map((field) => `"${String(field).replace(/"/g, '""')}"`)
          .join(","),
      ),
    ].join("\n");

    const blob = new Blob([csv], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `vouchers-export-${Date.now()}.csv`;
    link.click();
    URL.revokeObjectURL(url);
    showToast(`${rows.length} voucher(s) exported.`);
  }

  function applyBulkAction() {
    if (selectedCodes.length === 0) return;

    if (bulkAction === "extend") {
      const amount = Number(extendAmount);
      if (!amount || amount <= 0) {
        showToast("Enter a valid amount to extend time by.");
        return;
      }
      const label = `${amount} ${extendUnit}`;
      const targets = selectedCodes.map((code) => linkedUserIdFor(code)).filter((id): id is string => !!id);
      targets.forEach((userId) => extendUserAccess(userId, label));
      const skipped = selectedCodes.length - targets.length;
      showToast(
        `Extended time by ${label} for ${targets.length} voucher(s)${skipped ? ` — ${skipped} skipped (no active session)` : ""}.`,
      );
      setSelectedCodes([]);
      return;
    }

    if (bulkAction === "topup") {
      const amount = Number(topUpAmount);
      if (!amount || amount <= 0) {
        showToast("Enter a valid amount of data to top up by.");
        return;
      }
      const targets = selectedCodes.map((code) => linkedUserIdFor(code)).filter((id): id is string => !!id);
      targets.forEach((userId) => topUpUserData(userId, amount));
      const skipped = selectedCodes.length - targets.length;
      showToast(
        `Topped up ${amount} GB for ${targets.length} voucher(s)${skipped ? ` — ${skipped} skipped (no active session)` : ""}.`,
      );
      setSelectedCodes([]);
      return;
    }

    if (bulkAction === "resend-sms") {
      selectedCodes.forEach((code) => resendVoucherSms(code));
      setSelectedCodes([]);
      return;
    }

    if (bulkAction === "expire") {
      expireVouchers(selectedCodes);
      setSelectedCodes([]);
      return;
    }

    if (bulkAction === "export") {
      handleBulkExport();
      return;
    }

    if (bulkAction === "copy") {
      handleBulkCopy();
      return;
    }

    if (bulkAction === "delete") {
      selectedCodes.forEach((code) => onDelete(code));
      showToast(`${selectedCodes.length} voucher(s) deleted.`);
      setSelectedCodes([]);
    }
  }

  async function handleCopy(code: string) {
    try {
      await navigator.clipboard.writeText(code);
      setCopiedCode(code);
      window.setTimeout(() => setCopiedCode(null), 1500);
    } catch {
      // clipboard unavailable — code is still visible in the table
    }
  }

  function handleOpenMenu(code: string, event: React.MouseEvent<HTMLElement>) {
    const rect = (event.currentTarget as HTMLElement).getBoundingClientRect();
    setMenuRect(rect);
    setOpenMenu((current) => (current === code ? null : code));
  }

  function closeMenu() {
    setOpenMenu(null);
  }

  return (
    <article className="overflow-hidden rounded-2xl border border-[#e6e6e6] bg-white shadow-[0_8px_24px_rgba(26,26,26,0.06)]">
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-[#e6e6e6] px-5 py-4">
        <div>
          <h3 className="text-base font-bold">
            Voucher List ({vouchers.length})
          </h3>
          <p className="mt-1 text-xs text-[#737373]">
            Vouchers currently in use show the full session actions menu.
          </p>
        </div>

        <div className="relative">
          <Search
            size={14}
            className="absolute left-3 top-1/2 -translate-y-1/2 text-[#a3a3a3]"
          />
          <input
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="Search code or package..."
            className="h-10 w-60 rounded-lg border border-[#e6e6e6] bg-white pl-8 pr-3 text-sm outline-none focus:border-[#1a1a1a]"
          />
        </div>
      </div>

      {selectedCodes.length > 0 && (
        <div className="flex flex-wrap items-center gap-3 border-b border-blue-200 bg-blue-50 px-5 py-3">
          <strong className="text-sm text-blue-900">
            {selectedCodes.length} selected
          </strong>

          <select
            value={bulkAction}
            onChange={(event) => setBulkAction(event.target.value as VoucherBulkAction)}
            className="h-9 rounded-lg border border-blue-200 bg-white px-3 text-xs outline-none focus:border-[#1a1a1a]"
          >
            {VOUCHER_BULK_ACTIONS.map((action) => (
              <option key={action.key} value={action.key}>
                {action.label}
              </option>
            ))}
          </select>

          {bulkAction === "extend" && (
            <div className="flex items-center gap-1.5">
              <input
                type="number"
                min={1}
                value={extendAmount}
                onChange={(event) => setExtendAmount(event.target.value)}
                className="h-9 w-16 rounded-lg border border-blue-200 bg-white px-2 text-xs outline-none focus:border-[#1a1a1a]"
              />
              <select
                value={extendUnit}
                onChange={(event) => setExtendUnit(event.target.value)}
                className="h-9 rounded-lg border border-blue-200 bg-white px-2 text-xs outline-none focus:border-[#1a1a1a]"
              >
                {EXTEND_UNITS.map((unit) => (
                  <option key={unit} value={unit}>
                    {unit}
                  </option>
                ))}
              </select>
            </div>
          )}
          {bulkAction === "topup" && (
            <div className="flex items-center gap-1.5">
              <input
                type="number"
                min={0.1}
                step={0.1}
                value={topUpAmount}
                onChange={(event) => setTopUpAmount(event.target.value)}
                className="h-9 w-16 rounded-lg border border-blue-200 bg-white px-2 text-xs outline-none focus:border-[#1a1a1a]"
              />
              <span className="text-xs font-semibold text-blue-900">GB</span>
            </div>
          )}

          <button
            type="button"
            onClick={applyBulkAction}
            className="inline-flex items-center gap-1.5 rounded-lg bg-blue-600 px-4 py-2 text-xs font-bold text-white hover:bg-blue-700"
          >
            {bulkAction === "export" && <Download size={13} />}
            {bulkAction === "copy" && <Copy size={13} />}
            {bulkAction === "delete" && <Trash2 size={13} />}
            Apply
          </button>

          <button
            type="button"
            onClick={() => setSelectedCodes([])}
            className="ml-auto text-xs font-semibold text-blue-700 hover:underline"
          >
            Deselect all
          </button>
        </div>
      )}


      <div className="overflow-x-auto">
        <table className="w-full min-w-[1300px] text-left text-sm">
          <thead className="bg-[#ffffff] text-[#737373]">
            <tr>
              <th className="px-5 py-4">
                <input
                  type="checkbox"
                  checked={allVisibleSelected}
                  onChange={toggleSelectAllVisible}
                  aria-label="Select all visible vouchers"
                />
              </th>
              <th className="px-4 py-4 font-semibold">Voucher Code</th>
              <th className="px-4 py-4 font-semibold">Package</th>
              <th className="px-4 py-4 font-semibold">Status</th>
              <th className="px-4 py-4 font-semibold">Delivery</th>
              <th className="px-4 py-4 font-semibold">Sale Type</th>
              <th className="px-4 py-4 font-semibold">Customer</th>
              <th className="px-4 py-4 font-semibold">Phone</th>
              <th className="px-4 py-4 font-semibold">Agent</th>
              <th className="px-4 py-4 font-semibold">Generated</th>
              <th className="px-4 py-4 text-center font-semibold">Actions</th>
            </tr>
          </thead>

          <tbody>
            {visibleVouchers.length === 0 && (
              <tr>
                <td
                  colSpan={11}
                  className="px-5 py-10 text-center text-sm text-[#a3a3a3]"
                >
                  No vouchers match this filter.
                </td>
              </tr>
            )}

            {visibleVouchers.map((voucher) => {
              const agent = findAgent(voucher.agentId);
              const linkedUser = users.find(
                (user) => user.voucherUsername === voucher.code,
              );
              const linkedUserId = linkedUser ? getUserId(linkedUser) : null;

              return (
                <tr
                  key={voucher.code}
                  className={`border-t border-[#f4f4f4] transition hover:bg-[#ffffff] ${
                    selectedCodes.includes(voucher.code) ? "bg-[#ffffff]" : ""
                  }`}
                >
                  <td className="px-5 py-4">
                    <input
                      type="checkbox"
                      checked={selectedCodes.includes(voucher.code)}
                      onChange={() => toggleSelectOne(voucher.code)}
                      aria-label={`Select ${voucher.code}`}
                    />
                  </td>
                  <td className="px-4 py-4 font-mono font-semibold text-[#1a1a1a]">
                    {voucher.code}
                  </td>
                  <td className="px-4 py-4">
                    <span className="rounded-full bg-blue-100 px-2.5 py-1 text-xs font-semibold text-blue-700">
                      {voucher.packageName}
                    </span>
                  </td>
                  <td className="px-4 py-4">
                    <span
                      className={`rounded-full px-3 py-1.5 text-xs font-semibold ${
                        voucher.status === "Available"
                          ? "bg-emerald-100 text-emerald-700"
                          : voucher.status === "Used"
                            ? "bg-slate-200 text-slate-700"
                            : "bg-red-100 text-red-700"
                      }`}
                    >
                      {voucher.status}
                    </span>
                  </td>
                  <td className="px-4 py-4">
                    <span className="rounded-full border border-[#e6e6e6] px-2.5 py-1 text-xs font-semibold text-[#525252]">
                      {voucher.delivery}
                    </span>
                  </td>
                  <td className="px-4 py-4 text-[#525252]">
                    {voucher.saleType}
                  </td>
                  <td className="px-4 py-4 font-mono text-[#525252]">
                    {voucher.usedByCustomerId ?? "—"}
                  </td>
                  <td className="px-4 py-4 text-[#525252]">
                    {voucher.redeemerPhone ?? "—"}
                  </td>
                  <td className="px-4 py-4 text-[#525252]">
                    {agent?.name ?? "—"}
                  </td>
                  <td className="px-4 py-4 whitespace-nowrap text-[#737373]">
                    {voucher.generatedAt}
                  </td>
                  <td className="px-4 py-4 text-center">
                    <div className="flex items-center justify-center gap-1">
                      <button
                        type="button"
                        onClick={() => handleCopy(voucher.code)}
                        className="rounded-lg border border-[#e6e6e6] p-2 text-[#525252] hover:bg-[#f4f4f4]"
                        aria-label="Copy voucher code"
                        title="Copy code"
                      >
                        {copiedCode === voucher.code ? (
                          <Check size={16} className="text-emerald-600" />
                        ) : (
                          <Copy size={16} />
                        )}
                      </button>

                      <button
                        type="button"
                        onClick={(event) => handleOpenMenu(voucher.code, event)}
                        className="rounded-lg border border-[#e6e6e6] p-2 text-[#525252] hover:bg-[#f4f4f4]"
                        aria-label="More actions"
                      >
                        <MoreVertical size={16} />
                      </button>
                    </div>

                    {openMenu === voucher.code && linkedUserId && (
                      <ActiveUserActionsMenu
                        userId={linkedUserId}
                        anchorRect={menuRect}
                        onClose={closeMenu}
                      />
                    )}

                    {openMenu === voucher.code && !linkedUserId && (
                      <DropdownMenuPortal
                        anchorRect={menuRect}
                        onClose={closeMenu}
                        width={200}
                      >
                        <button
                          type="button"
                          onClick={() => {
                            onDelete(voucher.code);
                            closeMenu();
                          }}
                          className="flex w-full items-center gap-2 px-4 py-2.5 text-sm font-semibold text-red-600 hover:bg-red-50"
                        >
                          <Trash2 size={15} />
                          Delete Voucher
                        </button>
                      </DropdownMenuPortal>
                    )}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </article>
  );
}
