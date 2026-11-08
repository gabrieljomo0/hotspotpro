"use client";

// The pop-up shown before a voucher preset is deleted. It spells out what
// is actually removed, what is left alone, and who else is affected —
// so nobody deletes a preset without knowing what comes after.

import { useEffect } from "react";
import { Trash2, CheckCircle2, AlertTriangle, X } from "lucide-react";

import type { VoucherPreset } from "../shared/types";

export function DeletePresetDialog({
  preset,
  sharedNames,
  sharedCount,
  audience,
  onCancel,
  onConfirm,
}: {
  preset: VoucherPreset | null;
  // Names of the agents this preset was pushed to, when the viewer is
  // allowed to see them (admin). Otherwise only the count is shown.
  sharedNames?: string[];
  sharedCount: number;
  audience: "admin" | "agent";
  onCancel: () => void;
  onConfirm: () => void;
}) {
  useEffect(() => {
    if (!preset) return;
    function onKey(event: KeyboardEvent) {
      if (event.key === "Escape") onCancel();
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [preset, onCancel]);

  if (!preset) return null;

  const loginLabel = preset.loginMethod === "credentials" ? "username & password" : "single code";
  const whoLosesIt =
    sharedNames && sharedNames.length > 0
      ? sharedNames.join(", ")
      : `${sharedCount} other agent${sharedCount === 1 ? "" : "s"}`;

  return (
    <div className="fixed inset-0 z-[240] flex items-center justify-center bg-slate-950/50 p-4">
      <button type="button" aria-label="Close" className="absolute inset-0 cursor-default" onClick={onCancel} />

      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="delete-preset-title"
        className="relative z-10 max-h-[90vh] w-full max-w-lg overflow-y-auto rounded-2xl bg-white shadow-2xl"
      >
        <div className="flex items-start justify-between gap-3 border-b border-[#f4f4f4] px-6 py-5">
          <div className="flex items-center gap-3">
            <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-red-100 text-red-600">
              <Trash2 size={20} />
            </span>
            <div>
              <h3 id="delete-preset-title" className="text-base font-bold text-[#1a1a1a]">
                Delete this preset?
              </h3>
              <p className="text-sm font-semibold text-[#525252]">{preset.name}</p>
            </div>
          </div>
          <button
            type="button"
            onClick={onCancel}
            aria-label="Close"
            className="rounded-lg p-1.5 text-[#737373] hover:bg-[#ffffff]"
          >
            <X size={18} />
          </button>
        </div>

        <div className="space-y-3 px-6 py-5 text-sm">
          <div className="rounded-xl border border-red-200 bg-red-50 p-4">
            <p className="flex items-center gap-2 font-bold text-red-700">
              <AlertTriangle size={15} />
              What gets deleted
            </p>
            <p className="mt-1.5 text-red-700">
              This saved setup only: <strong>{preset.packageName}</strong>, {preset.quantity} codes, {preset.codeFormat}{" "}
              format at {preset.codeLength} characters, {loginLabel} login
              {preset.routerIps.length > 0
                ? `, and its ${preset.routerIps.length} router${preset.routerIps.length === 1 ? "" : "s"}`
                : ""}
              .
            </p>
          </div>

          <div className="rounded-xl border border-emerald-200 bg-white p-4">
            <p className="flex items-center gap-2 font-bold text-emerald-700">
              <CheckCircle2 size={15} />
              What stays exactly as it is
            </p>
            <p className="mt-1.5 text-emerald-700">
              Every voucher already generated from this preset — they keep working and stay in their batches. Nothing
              you&apos;ve sold or printed is touched.
            </p>
          </div>

          <div className="rounded-xl border border-[#e6e6e6] bg-[#ffffff] p-4">
            <p className="font-bold text-[#1a1a1a]">What happens next</p>
            <ul className="mt-1.5 list-disc space-y-1.5 pl-5 text-[#525252]">
              <li>It disappears from the presets list straight away and can&apos;t be brought back.</li>
              <li>
                {audience === "admin"
                  ? "You won't be able to generate from it or push it again — you'd need to create a new preset."
                  : "You won't be able to generate from it again — you'd need to create a new preset."}
              </li>
              <li>
                {sharedCount > 0 ? (
                  <>
                    <strong>{whoLosesIt}</strong> will lose it immediately and it will vanish from their Generate from
                    Preset list. Vouchers they already made from it are not affected.
                  </>
                ) : (
                  "It hasn't been pushed to any agents, so nobody else is affected."
                )}
              </li>
            </ul>
          </div>
        </div>

        <div className="flex gap-3 border-t border-[#f4f4f4] px-6 py-4">
          <button
            type="button"
            onClick={onConfirm}
            className="flex-1 rounded-xl bg-red-600 px-5 py-3 text-sm font-bold text-white hover:bg-red-700"
          >
            Yes, delete preset
          </button>
          <button
            type="button"
            onClick={onCancel}
            autoFocus
            className="rounded-xl border border-[#e6e6e6] bg-white px-5 py-3 text-sm font-bold text-[#525252] hover:bg-[#ffffff]"
          >
            Keep it
          </button>
        </div>
      </div>
    </div>
  );
}
