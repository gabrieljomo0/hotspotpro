"use client";

// Reprint the vouchers an agent still hasn't sold — pick the package and
// batch, choose one of your voucher card designs, and print from the browser.
// It uses the same card designs and print method as a batch's own Print.

import { useEffect, useMemo, useState } from "react";
import { createPortal } from "react-dom";

import { useDashboard } from "../../context/DashboardContext";
import { localizeAmountString } from "../../shared/currency";
import { PRINT_DESIGNS, VoucherCardPreview, type PrintDesignId } from "../../vouchers/VoucherCardPreview";
import type { Voucher, VoucherBatch } from "../../shared/types";
import { ModalFrame } from "./ModalFrame";

export function filterUnsold(
  unsold: Voucher[],
  packageName: string,
  batchKey: string,
  batches: VoucherBatch[],
): Voucher[] {
  const known = new Set(batches.map((batch) => batch.id));
  return unsold.filter((voucher) => {
    if (packageName !== "all" && voucher.packageName !== packageName) return false;
    if (batchKey === "all") return true;
    if (batchKey === "__none__") return !voucher.batchId || !known.has(voucher.batchId);
    return voucher.batchId === batchKey;
  });
}

export function ReprintVouchersModal({
  agentId,
  agentName,
  unsold,
  onClose,
}: {
  agentId: string;
  agentName: string;
  unsold: Voucher[];
  onClose: () => void;
}) {
  const { voucherBatches, packages, branding, logActivity, showToast } = useDashboard();
  const [packageName, setPackageName] = useState("all");
  const [batchKey, setBatchKey] = useState("all");
  const [design, setDesign] = useState<PrintDesignId>("micro-strip");
  const [printing, setPrinting] = useState<Voucher[] | null>(null);

  const packageNames = useMemo(() => [...new Set(unsold.map((v) => v.packageName))].sort(), [unsold]);
  const batchOptions = useMemo(() => {
    const ids = [...new Set(unsold.map((v) => v.batchId ?? "__none__"))];
    return ids.map((id) => {
      const batch = voucherBatches.find((b) => b.id === id);
      return { key: batch ? id : "__none__", label: batch ? batch.reference : "No batch" };
    }).filter((option, index, all) => all.findIndex((o) => o.key === option.key) === index);
  }, [unsold, voucherBatches]);

  const selected = filterUnsold(unsold, packageName, batchKey, voucherBatches);
  const countFor = (pkg: string, batch: string) => filterUnsold(unsold, pkg, batch, voucherBatches).length;

  const priceFor = (name: string) => localizeAmountString(packages.find((p) => p.name === name)?.price ?? "—");

  // Print once the sheet is on the page, then close the window.
  useEffect(() => {
    if (!printing) return;
    const frame = requestAnimationFrame(() => {
      window.print();
      logActivity("Voucher", `Reprinted ${printing.length} unsold voucher${printing.length === 1 ? "" : "s"} for agent "${agentName}".`);
      showToast(`Sent ${printing.length} voucher${printing.length === 1 ? "" : "s"} to print.`);
      setPrinting(null);
      onClose();
    });
    return () => cancelAnimationFrame(frame);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [printing]);

  const selectClass =
    "h-11 w-full rounded-xl border border-[#e2e8f0] bg-white px-3.5 text-sm outline-none focus:border-[#2563eb]";

  return (
    <>
      <ModalFrame
        title="Reprint Unsold Vouchers"
        subtitle={`Print unsold vouchers ${agentName} still holds`}
        onClose={onClose}
        testId="reprint-modal"
      >
        {unsold.length === 0 ? (
          <p data-testid="reprint-empty" className="rounded-xl bg-[#f8fafc] px-4 py-6 text-center text-sm text-[#64748b]">
            {agentName} has no unsold vouchers to print.
          </p>
        ) : (
          <form
            className="space-y-4"
            onSubmit={(event) => {
              event.preventDefault();
              if (selected.length > 0) setPrinting(selected);
            }}
          >
            <label className="block">
              <span className="mb-1.5 block text-sm font-semibold text-[#475569]">
                Package <span className="text-red-500">*</span>
              </span>
              <select value={packageName} onChange={(event) => setPackageName(event.target.value)} aria-label="Package" className={selectClass}>
                <option value="all">All Packages ({countFor("all", batchKey)} vouchers)</option>
                {packageNames.map((name) => (
                  <option key={name} value={name}>
                    {name} ({countFor(name, batchKey)} vouchers)
                  </option>
                ))}
              </select>
              <span className="mt-1 block text-xs text-[#94a3b8]">Select which package vouchers to print</span>
            </label>

            <label className="block">
              <span className="mb-1.5 block text-sm font-semibold text-[#475569]">Batch</span>
              <select value={batchKey} onChange={(event) => setBatchKey(event.target.value)} aria-label="Batch" className={selectClass}>
                <option value="all">All Batches ({countFor(packageName, "all")} vouchers)</option>
                {batchOptions.map((option) => (
                  <option key={option.key} value={option.key}>
                    {option.label} ({countFor(packageName, option.key)} vouchers)
                  </option>
                ))}
              </select>
              <span className="mt-1 block text-xs text-[#94a3b8]">Filter by batch (optional)</span>
            </label>

            <label className="block">
              <span className="mb-1.5 block text-sm font-semibold text-[#475569]">
                Print Template <span className="text-red-500">*</span>
              </span>
              <select value={design} onChange={(event) => setDesign(event.target.value as PrintDesignId)} aria-label="Print template" className={selectClass}>
                {PRINT_DESIGNS.map((option) => (
                  <option key={option.id} value={option.id}>
                    {option.name} ({option.tags[0]})
                  </option>
                ))}
              </select>
            </label>

            <label className="block">
              <span className="mb-1.5 block text-sm font-semibold text-[#475569]">Output</span>
              <select aria-label="Output" defaultValue="browser" className={selectClass}>
                <option value="browser">Print in Browser</option>
                <option value="pdf" disabled>
                  Download as PDF — not available yet
                </option>
              </select>
            </label>

            <div className="flex gap-3 pt-1">
              <button
                type="submit"
                disabled={selected.length === 0}
                className="rounded-xl bg-amber-500 px-6 py-3 text-sm font-bold text-white hover:bg-amber-600 disabled:cursor-not-allowed disabled:opacity-50"
              >
                {selected.length > 0 ? `Print ${selected.length} voucher${selected.length === 1 ? "" : "s"}` : "Nothing to print"}
              </button>
              <button type="button" onClick={onClose} className="rounded-xl border border-[#e2e8f0] bg-white px-5 py-3 text-sm font-semibold text-[#475569] hover:bg-[#ffffff]">
                Cancel
              </button>
            </div>
          </form>
        )}
      </ModalFrame>

      {/* Only exists while printing. Everything else is hidden by the print
          rules below, the same way a batch's own Print page does it. */}
      {printing &&
        createPortal(
          <>
            <style>{`
              @media print {
                body * { visibility: hidden; }
                #voucher-print-area, #voucher-print-area * { visibility: visible; }
                #voucher-print-area { position: absolute; left: 0; top: 0; width: 100%; }
              }
            `}</style>
            <div id="voucher-print-area" data-agent-id={agentId} className="hidden print:block">
              <div className="grid grid-cols-4 gap-3">
                {printing.map((voucher, index) => (
                  <div key={voucher.code} className="break-inside-avoid">
                    <VoucherCardPreview
                      design={design}
                      number={index + 1}
                      code={voucher.code}
                      password={voucher.password}
                      packageName={voucher.packageName}
                      price={priceFor(voucher.packageName)}
                      businessName={branding.businessName}
                    />
                  </div>
                ))}
              </div>
            </div>
          </>,
          document.body,
        )}
    </>
  );
}
