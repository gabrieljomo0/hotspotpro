"use client";

// Packages deleted in the last 3 days, with Restore. Shown under the packages table only when there
// is something to restore.

import { useEffect, useState } from "react";
import { RotateCcw, Trash2 } from "lucide-react";

import { useDashboard } from "../context/DashboardContext";
import { packageVoucherUsage } from "../context/usePackageTrash";
import { PACKAGE_RESTORE_MS } from "../shared/types";

function timeLeft(ms: number) {
  const hours = Math.max(0, Math.floor(ms / 3_600_000));
  if (hours >= 24) return `${Math.floor(hours / 24)}d ${hours % 24}h left`;
  if (hours >= 1) return `${hours}h left`;
  return `${Math.max(1, Math.floor(ms / 60_000))}m left`;
}

export function RecentlyDeletedPackages() {
  const { deletedPackages, restoreDeletedPackage, purgeDeletedPackage, vouchers } = useDashboard();
  // A clock that ticks each minute, so "time left" counts down and expired entries drop off.
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    const timer = setInterval(() => setNow(Date.now()), 60_000);
    return () => clearInterval(timer);
  }, []);
  const restorable = deletedPackages.filter((d) => now - d.deletedAtMs < PACKAGE_RESTORE_MS);
  if (restorable.length === 0) return null;

  return (
    <article className="mt-6 overflow-hidden rounded-2xl border border-[#e6e6e6] bg-white shadow-[0_8px_24px_rgba(26,26,26,0.06)]">
      <div className="border-b border-[#e6e6e6] px-5 py-4">
        <h2 className="text-sm font-bold text-[#1a1a1a]">Recently deleted</h2>
        <p className="text-xs text-[#737373]">Restore a package within 3 days of deleting it.</p>
      </div>
      <ul>
        {restorable.map((entry) => {
          const kept = entry.keepCustomers ? packageVoucherUsage(vouchers, [entry.pkg.name], now).inUse.length : 0;
          return (
            <li key={entry.pkg.id} className="flex flex-wrap items-center gap-3 border-t border-[#f4f4f4] px-5 py-3 first:border-t-0">
              <span className="rounded-full bg-slate-100 px-3 py-1.5 text-xs font-bold text-slate-700">{entry.pkg.name}</span>
              <span className="text-xs text-[#525252]">
                Deleted {new Date(entry.deletedAtMs).toLocaleString()} ·{" "}
                {entry.keepCustomers
                  ? kept > 0
                    ? `${kept} customer${kept === 1 ? "" : "s"} still online on it`
                    : "customers were kept"
                  : `${entry.endedVouchers.length} voucher${entry.endedVouchers.length === 1 ? "" : "s"} ended`}
              </span>
              <span className="text-xs font-semibold text-amber-700">{timeLeft(entry.deletedAtMs + PACKAGE_RESTORE_MS - now)}</span>
              <span className="ml-auto flex gap-2">
                <button
                  type="button"
                  onClick={() => restoreDeletedPackage(entry.pkg.id)}
                  className="inline-flex items-center gap-1.5 rounded-lg border border-emerald-200 bg-white px-3 py-2 text-xs font-semibold text-emerald-700 hover:bg-emerald-50"
                >
                  <RotateCcw size={13} />
                  Restore
                </button>
                <button
                  type="button"
                  onClick={() => purgeDeletedPackage(entry.pkg.id)}
                  disabled={kept > 0}
                  title={kept > 0 ? "Customers kept on it still have time left" : "Delete for good now"}
                  className="inline-flex items-center gap-1.5 rounded-lg border border-red-200 bg-white px-3 py-2 text-xs font-semibold text-red-600 hover:bg-red-50 disabled:cursor-not-allowed disabled:opacity-40"
                >
                  <Trash2 size={13} />
                  Delete now
                </button>
              </span>
            </li>
          );
        })}
      </ul>
    </article>
  );
}
