"use client";

// Everything you do in the dashboard is saved in this browser and shared
// between tabs, so it survives reloads. This is the way back to the
// clean starting point — an in-app confirmation, not a browser prompt.

import { useState } from "react";
import { RotateCcw, AlertTriangle } from "lucide-react";

import { clearSavedData } from "../context/usePersistedState";

export function ResetDemoDataPanel() {
  const [confirming, setConfirming] = useState(false);

  async function handleReset() {
    await clearSavedData();
    window.location.reload();
  }

  return (
    <section className="mt-6 rounded-2xl border border-[#e2e8f0] bg-white p-6 shadow-[0_8px_24px_rgba(37,99,235,0.06)]">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div className="max-w-xl">
          <h3 className="flex items-center gap-2 text-base font-bold text-[#0f172a]">
            <RotateCcw size={16} className="text-[#64748b]" />
            Start over (clear all data)
          </h3>
          <p className="mt-1 text-sm text-[#64748b]">
            Your changes are saved in this browser and shared with any other dashboard tabs you have open (admin,
            agents, clients). Start over to clear everything and begin again with a clean workspace.
          </p>
        </div>

        {!confirming ? (
          <button
            type="button"
            onClick={() => setConfirming(true)}
            className="rounded-xl border border-red-200 px-4 py-2.5 text-sm font-bold text-red-600 hover:bg-red-50"
          >
            Start over
          </button>
        ) : null}
      </div>

      {confirming && (
        <div className="mt-4 rounded-xl border border-red-200 bg-red-50 p-4">
          <p className="flex items-center gap-2 text-sm font-bold text-red-700">
            <AlertTriangle size={15} />
            Reset everything?
          </p>
          <p className="mt-1 text-sm text-red-700">
            Every agent, package, voucher, batch and preset you&apos;ve created or changed here is removed and the
            workspace starts clean again. Open agent and client tabs will reload with it. This can&apos;t be undone.
          </p>
          <div className="mt-3 flex gap-2">
            <button
              type="button"
              onClick={handleReset}
              className="rounded-xl bg-red-600 px-4 py-2.5 text-sm font-bold text-white hover:bg-red-700"
            >
              Yes, reset everything
            </button>
            <button
              type="button"
              onClick={() => setConfirming(false)}
              autoFocus
              className="rounded-xl border border-[#e2e8f0] bg-white px-4 py-2.5 text-sm font-bold text-[#475569] hover:bg-[#ffffff]"
            >
              Keep my data
            </button>
          </div>
        </div>
      )}
    </section>
  );
}
