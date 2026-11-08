"use client";

// A simple "are you sure?" popup with a title, message, Cancel, and Confirm.
// Rendered via a portal so it always appears on top of everything else,
// no matter where on the page it's triggered from.
import { createPortal } from "react-dom";

export type ConfirmDialogState = { title: string; message: string; onConfirm: () => void } | null;

export function RouterConfirmDialog({
  dialog,
  onCancel,
}: {
  dialog: ConfirmDialogState;
  onCancel: () => void;
}) {
  if (!dialog) return null;

  return createPortal(
    <div className="fixed inset-0 z-[500] flex items-center justify-center bg-slate-950/50 p-4">
      <div className="w-full max-w-sm rounded-2xl bg-white p-6 text-center shadow-2xl">
        <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-[#f1f5f9] text-[#2563eb]">
          ⚠
        </div>
        <h3 className="mb-2 text-lg font-bold text-[#0f172a]">{dialog.title}</h3>
        <p className="mb-5 text-sm text-[#64748b]">{dialog.message}</p>
        <div className="flex gap-3">
          <button type="button" onClick={onCancel} className="flex-1 rounded-xl border border-[#e2e8f0] bg-white px-4 py-2.5 text-sm font-bold text-[#475569] hover:bg-[#ffffff]">
            Cancel
          </button>
          <button
            type="button"
            onClick={() => { dialog.onConfirm(); onCancel(); }}
            className="flex-1 rounded-xl bg-[#2563eb] px-4 py-2.5 text-sm font-bold text-white hover:bg-[#1d4ed8]"
          >
            Confirm
          </button>
        </div>
      </div>
    </div>,
    document.body,
  );
}
