"use client";

// A pop-up (not a browser prompt) that says what is about to happen and
// what comes after, and only acts when the person confirms.

import { useEffect, type ReactNode } from "react";
import { AlertTriangle, X } from "lucide-react";

export function ConfirmDialog({
  open,
  title,
  subtitle,
  points,
  confirmLabel,
  cancelLabel = "Cancel",
  onConfirm,
  onCancel,
}: {
  open: boolean;
  title: string;
  subtitle?: string;
  // Plain-language consequences, shown as a list under "What happens next".
  points: ReactNode[];
  confirmLabel: string;
  cancelLabel?: string;
  onConfirm: () => void;
  onCancel: () => void;
}) {
  useEffect(() => {
    if (!open) return;
    function onKey(event: KeyboardEvent) {
      if (event.key === "Escape") onCancel();
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, onCancel]);

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-[240] flex items-center justify-center bg-slate-950/50 p-4">
      <button type="button" aria-label="Close" className="absolute inset-0 cursor-default" onClick={onCancel} />

      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="confirm-dialog-title"
        className="relative z-10 max-h-[90vh] w-full max-w-md overflow-y-auto rounded-2xl bg-white shadow-2xl"
      >
        <div className="flex items-start justify-between gap-3 border-b border-[#f1f5f9] px-6 py-5">
          <div className="flex items-center gap-3">
            <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-red-100 text-red-600">
              <AlertTriangle size={20} />
            </span>
            <div>
              <h3 id="confirm-dialog-title" className="text-base font-bold text-[#0f172a]">
                {title}
              </h3>
              {subtitle && <p className="text-sm font-semibold text-[#475569]">{subtitle}</p>}
            </div>
          </div>
          <button
            type="button"
            onClick={onCancel}
            aria-label="Close"
            className="rounded-lg p-1.5 text-[#64748b] hover:bg-[#ffffff]"
          >
            <X size={18} />
          </button>
        </div>

        {points.length > 0 && (
        <div className="px-6 py-5 text-sm">
          <div className="rounded-xl border border-[#e2e8f0] bg-[#ffffff] p-4">
            <p className="font-bold text-[#0f172a]">What happens next</p>
            <ul className="mt-1.5 list-disc space-y-1.5 pl-5 text-[#475569]">
              {points.map((point, index) => (
                <li key={index}>{point}</li>
              ))}
            </ul>
          </div>
        </div>
        )}

        <div className="flex gap-3 border-t border-[#f1f5f9] px-6 py-4">
          <button
            type="button"
            onClick={onConfirm}
            className="flex-1 rounded-xl bg-red-600 px-5 py-3 text-sm font-bold text-white hover:bg-red-700"
          >
            {confirmLabel}
          </button>
          <button
            type="button"
            onClick={onCancel}
            autoFocus
            className="rounded-xl border border-[#e2e8f0] bg-white px-5 py-3 text-sm font-bold text-[#475569] hover:bg-[#ffffff]"
          >
            {cancelLabel}
          </button>
        </div>
      </div>
    </div>
  );
}
