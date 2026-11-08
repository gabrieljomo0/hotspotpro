"use client";

// Lets admin set, once, how long Used/Expired vouchers stick around
// before being cleared automatically — an account-wide default, with an
// optional override per router. A voucher generated afterwards just
// picks up whichever policy applies to its router; nothing needs to be
// set again when creating a voucher. Clicking "Done" saves the policy
// AND runs a cleanup pass immediately, rather than waiting for the next
// scheduled background check.

import { useState } from "react";
import { Trash2, RotateCcw } from "lucide-react";

import { useDashboard } from "../context/DashboardContext";

export function VoucherCleanupSettingsPanel() {
  const {
    defaultVoucherCleanupPolicy,
    updateDefaultVoucherCleanupPolicy,
    routerVoucherCleanupPolicies,
    updateRouterVoucherCleanupPolicy,
    clearRouterVoucherCleanupOverride,
    runVoucherCleanup,
    routers,
    showToast,
  } = useDashboard();

  const [selectedRouterIp, setSelectedRouterIp] = useState(routers[0]?.ip ?? "");
  const routerOverride = routerVoucherCleanupPolicies[selectedRouterIp];
  const effectiveForRouter = routerOverride ?? defaultVoucherCleanupPolicy;

  function handleDone() {
    const removed = runVoucherCleanup();
    showToast(
      removed > 0
        ? `Policy saved — cleared ${removed} voucher(s) that already qualified.`
        : "Policy saved. It will keep running automatically from now on.",
    );
  }

  return (
    <article className="rounded-2xl border border-[#e6e6e6] bg-white p-6 shadow-[0_8px_24px_rgba(26,26,26,0.06)] md:p-8">
      <div className="mb-6 flex items-center gap-3">
        <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-red-100 text-red-600">
          <Trash2 size={20} />
        </div>
        <div>
          <h3 className="text-lg font-bold text-[#1a1a1a]">Voucher Cleanup</h3>
          <p className="text-sm text-[#737373]">
            Set once, applies automatically. Used and Expired vouchers older
            than this are cleared out on their own — no need to specify
            anything when creating a voucher.
          </p>
        </div>
      </div>

      <article className="mb-5 rounded-xl border border-[#f4f4f4] bg-[#ffffff] p-4">
        <div className="mb-3 flex items-center justify-between gap-3">
          <p className="text-sm font-bold text-[#1a1a1a]">Account-wide default</p>
          <button
            type="button"
            onClick={() => updateDefaultVoucherCleanupPolicy({ enabled: !defaultVoucherCleanupPolicy.enabled })}
            className={`relative h-6 w-11 shrink-0 rounded-full transition ${
              defaultVoucherCleanupPolicy.enabled ? "bg-emerald-500" : "bg-[#e6e6e6]"
            }`}
          >
            <span
              className={`absolute top-0.5 h-5 w-5 rounded-full bg-white shadow transition-transform ${
                defaultVoucherCleanupPolicy.enabled ? "translate-x-5" : "translate-x-0.5"
              }`}
            />
          </button>
        </div>
        {defaultVoucherCleanupPolicy.enabled && (
          <label className="flex items-center gap-2 text-sm text-[#525252]">
            Clear used/expired vouchers after
            <input
              type="number"
              min={1}
              value={defaultVoucherCleanupPolicy.clearAfterDays}
              onChange={(event) =>
                updateDefaultVoucherCleanupPolicy({ clearAfterDays: Number(event.target.value) })
              }
              className="h-9 w-20 rounded-lg border border-[#e6e6e6] bg-white px-2 text-center text-sm outline-none focus:border-[#1a1a1a]"
            />
            days
          </label>
        )}
      </article>

      {routers.length > 0 && (
        <article className="mb-6 rounded-xl border border-[#f4f4f4] p-4">
          <p className="mb-3 text-sm font-bold text-[#1a1a1a]">Override for a specific router</p>
          <select
            value={selectedRouterIp}
            onChange={(event) => setSelectedRouterIp(event.target.value)}
            className="mb-3 h-10 w-full max-w-sm rounded-lg border border-[#e6e6e6] bg-white px-3 text-sm outline-none focus:border-[#1a1a1a]"
          >
            {routers.map((r) => (
              <option key={r.ip} value={r.ip}>{r.name}</option>
            ))}
          </select>

          <div className="flex flex-wrap items-center gap-3">
            <button
              type="button"
              onClick={() =>
                updateRouterVoucherCleanupPolicy(selectedRouterIp, { enabled: !effectiveForRouter.enabled })
              }
              className={`relative h-6 w-11 shrink-0 rounded-full transition ${
                effectiveForRouter.enabled ? "bg-emerald-500" : "bg-[#e6e6e6]"
              }`}
            >
              <span
                className={`absolute top-0.5 h-5 w-5 rounded-full bg-white shadow transition-transform ${
                  effectiveForRouter.enabled ? "translate-x-5" : "translate-x-0.5"
                }`}
              />
            </button>

            {effectiveForRouter.enabled && (
              <label className="flex items-center gap-2 text-sm text-[#525252]">
                Clear after
                <input
                  type="number"
                  min={1}
                  value={effectiveForRouter.clearAfterDays}
                  onChange={(event) =>
                    updateRouterVoucherCleanupPolicy(selectedRouterIp, { clearAfterDays: Number(event.target.value) })
                  }
                  className="h-9 w-20 rounded-lg border border-[#e6e6e6] bg-white px-2 text-center text-sm outline-none focus:border-[#1a1a1a]"
                />
                days
              </label>
            )}

            {routerOverride && (
              <button
                type="button"
                onClick={() => clearRouterVoucherCleanupOverride(selectedRouterIp)}
                className="inline-flex shrink-0 items-center gap-1 text-xs font-semibold text-[#1a1a1a] hover:underline"
              >
                <RotateCcw size={12} /> Use default
              </button>
            )}
          </div>
          <p className="mt-2 text-xs text-[#a3a3a3]">
            {routerOverride ? "This router has its own override." : "This router currently follows the account-wide default."}
          </p>
        </article>
      )}

      <div className="flex justify-end">
        <button
          type="button"
          onClick={handleDone}
          className="rounded-xl bg-[#1a1a1a] px-6 py-3 text-sm font-bold text-white hover:bg-[#111111]"
        >
          Done
        </button>
      </div>
    </article>
  );
}
