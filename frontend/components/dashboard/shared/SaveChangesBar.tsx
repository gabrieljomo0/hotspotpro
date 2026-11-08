"use client";

import { useState } from "react";
import { Save, RotateCcw, AlertTriangle, X } from "lucide-react";

export function SaveChangesBar({
  dirty,
  onSave,
  onDiscard,
  changeCount,
  confirmMessage,
}: {
  dirty: boolean;
  onSave: () => void;
  onDiscard: () => void;
  /** Optional: "3 permissions changed" instead of the generic message. */
  changeCount?: number;
  /** Optional: customize what the confirm dialog says these changes will do. */
  confirmMessage?: string;
}) {
  const [confirmOpen, setConfirmOpen] = useState(false);

  if (!dirty) return null;

  return (
    <>
      <div className="sticky bottom-4 z-30 mt-6">
        <div className="mx-auto flex max-w-3xl flex-wrap items-center justify-between gap-3 rounded-2xl border-2 border-amber-300 bg-white px-5 py-4 shadow-2xl">
          <p className="flex items-center gap-2 text-sm font-bold text-[#1a1a1a]">
            <AlertTriangle size={16} className="text-amber-500" />
            {changeCount ? `${changeCount} unsaved change${changeCount === 1 ? "" : "s"}` : "You have unsaved changes"}
          </p>
          <div className="flex gap-2">
            <button
              type="button"
              onClick={onDiscard}
              className="inline-flex items-center gap-1.5 rounded-xl border border-[#e6e6e6] bg-white px-4 py-2.5 text-sm font-bold text-[#525252] hover:bg-[#ffffff]"
            >
              <RotateCcw size={14} />
              Discard
            </button>
            <button
              type="button"
              onClick={() => setConfirmOpen(true)}
              className="inline-flex items-center gap-1.5 rounded-xl bg-emerald-600 px-5 py-2.5 text-sm font-bold text-white  hover:bg-emerald-700"
            >
              <Save size={14} />
              Save Changes
            </button>
          </div>
        </div>
      </div>

      {confirmOpen && (
        <div className="fixed inset-0 z-[200] flex items-center justify-center bg-slate-950/60 p-4">
          <button
            type="button"
            aria-label="Close"
            className="absolute inset-0"
            onClick={() => setConfirmOpen(false)}
          />
          <section className="relative z-10 w-full max-w-md rounded-2xl border border-[#e6e6e6] bg-white p-6 shadow-2xl">
            <div className="mb-4 flex items-start justify-between">
              <div className="flex h-12 w-12 items-center justify-center rounded-full bg-amber-100 text-amber-600">
                <Save size={22} />
              </div>
              <button
                type="button"
                onClick={() => setConfirmOpen(false)}
                className="text-[#a3a3a3] hover:text-[#525252]"
              >
                <X size={18} />
              </button>
            </div>
            <h3 className="text-lg font-black text-[#1a1a1a]">Save these changes?</h3>
            <p className="mt-2 text-sm leading-6 text-[#737373]">
              {confirmMessage ??
                "This will apply your changes right away — everyone affected will see the update immediately."}
            </p>
            <div className="mt-6 flex flex-col-reverse gap-3 sm:flex-row sm:justify-end">
              <button
                type="button"
                onClick={() => setConfirmOpen(false)}
                className="rounded-xl border border-[#e6e6e6] px-5 py-3 text-sm font-semibold text-[#525252] hover:bg-[#ffffff]"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={() => {
                  onSave();
                  setConfirmOpen(false);
                }}
                className="rounded-xl bg-emerald-600 px-5 py-3 text-sm font-bold text-white hover:bg-emerald-700"
              >
                Yes, Save Changes
              </button>
            </div>
          </section>
        </div>
      )}
    </>
  );
}
