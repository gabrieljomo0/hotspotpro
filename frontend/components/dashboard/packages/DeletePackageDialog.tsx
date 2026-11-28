"use client";

// Asked before a package is deleted. Says how many customers are on it and offers two ways:
// delete only the package (customers stay online until their time ends), or delete it and end the
// vouchers linked to it (those customers are signed out). Either way it can be restored for 3 days.

import { useEffect } from "react";
import { AlertTriangle, Trash2, UserX, X } from "lucide-react";

import type { Package, Voucher } from "../shared/types";
import { packageVoucherUsage } from "../context/usePackageTrash";

export function DeletePackageDialog({
  packages,
  vouchers,
  onDelete,
  onCancel,
}: {
  packages: Package[] | null;
  vouchers: Voucher[];
  onDelete: (keepCustomers: boolean) => void;
  onCancel: () => void;
}) {
  useEffect(() => {
    if (!packages) return;
    function onKey(event: KeyboardEvent) {
      if (event.key === "Escape") onCancel();
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [packages, onCancel]);

  if (!packages || packages.length === 0) return null;

  const { inUse, unused } = packageVoucherUsage(vouchers, packages.map((pkg) => pkg.name));
  const name = packages.length === 1 ? `"${packages[0].name}"` : `${packages.length} packages`;
  const people = inUse.length === 1 ? "1 person is" : `${inUse.length} people are`;

  return (
    <div className="fixed inset-0 z-[240] flex items-center justify-center bg-slate-950/50 p-4">
      <button type="button" aria-label="Close" className="absolute inset-0 cursor-default" onClick={onCancel} />

      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="delete-package-title"
        className="relative z-10 max-h-[90vh] w-full max-w-lg overflow-y-auto rounded-2xl bg-white shadow-2xl"
      >
        <div className="flex items-start justify-between gap-3 border-b border-[#f4f4f4] px-6 py-5">
          <div className="flex items-center gap-3">
            <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-red-100 text-red-600">
              <AlertTriangle size={20} />
            </span>
            <div>
              <h3 id="delete-package-title" className="text-base font-bold text-[#1a1a1a]">
                {inUse.length > 0 ? `${people} using ${name}` : `Delete ${name}?`}
              </h3>
              <p className="text-sm text-[#525252]">You can restore it from Recently deleted for 3 days.</p>
            </div>
          </div>
          <button type="button" onClick={onCancel} aria-label="Close" className="rounded-lg p-1.5 text-[#737373] hover:bg-[#f4f4f4]">
            <X size={18} />
          </button>
        </div>

        <div className="space-y-3 px-6 py-5 text-sm">
          {(inUse.length > 0 || unused > 0) && (
            <p className="rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-amber-800">
              {inUse.length > 0 && <>{inUse.length} customer{inUse.length === 1 ? " has" : "s have"} time left on {name}. </>}
              {unused > 0 && <>{unused} voucher{unused === 1 ? " is" : "s are"} sold or printed but not used yet.</>}
            </p>
          )}

          <button
            type="button"
            onClick={() => onDelete(true)}
            className="flex w-full items-start gap-3 rounded-xl border border-[#e6e6e6] px-4 py-3 text-left hover:border-[#1a1a1a]"
          >
            <Trash2 size={18} className="mt-0.5 shrink-0 text-[#525252]" />
            <span>
              <span className="block font-bold text-[#1a1a1a]">Delete the package only</span>
              <span className="block text-[#525252]">
                It can&apos;t be sold any more. Customers already on it stay online, and vouchers already sold still work, with the same speed and time until they run out.
              </span>
            </span>
          </button>

          <button
            type="button"
            onClick={() => onDelete(false)}
            className="flex w-full items-start gap-3 rounded-xl border border-red-200 px-4 py-3 text-left hover:border-red-500 hover:bg-red-50"
          >
            <UserX size={18} className="mt-0.5 shrink-0 text-red-600" />
            <span>
              <span className="block font-bold text-red-700">
                Delete the package and its customers&apos; vouchers
                {inUse.length > 0 ? ` (signs out ${inUse.length})` : ""}
              </span>
              <span className="block text-[#525252]">
                Every voucher linked to it stops working{inUse.length > 0 ? " and anyone online on it is signed out now" : ""}, even if they paid. Restoring gives the vouchers back.
              </span>
            </span>
          </button>
        </div>

        <div className="flex justify-end border-t border-[#f4f4f4] px-6 py-4">
          <button
            type="button"
            onClick={onCancel}
            autoFocus
            className="rounded-xl border border-[#e6e6e6] bg-white px-5 py-3 text-sm font-bold text-[#525252] hover:bg-[#f4f4f4]"
          >
            Cancel
          </button>
        </div>
      </div>
    </div>
  );
}
