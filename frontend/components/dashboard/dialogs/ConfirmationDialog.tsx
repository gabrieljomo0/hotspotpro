"use client";

import { Router } from "lucide-react";

import type { ConfirmAction } from "../shared/types";

export function ConfirmationDialog({
  confirmAction,
  onCancel,
  onConfirm,
}: {
  confirmAction: ConfirmAction | null;
  onCancel: () => void;
  onConfirm: () => void;
}) {
  if (!confirmAction) {
    return null;
  }

  const isEnable = confirmAction.type === "enable-router";

  const title =
    confirmAction.type === "remove-router"
      ? "Remove this router?"
      : confirmAction.type === "disable-router"
        ? "Disable router connection?"
        : "Enable router connection?";

  const description =
    confirmAction.type === "remove-router"
      ? `You are about to remove ${confirmAction.routerName} from HotspotPro. This router will no longer be managed by the system.`
      : confirmAction.type === "disable-router"
        ? `You are about to disable the connection for ${confirmAction.routerName}. Connected users may lose internet access.`
        : `You are about to enable the connection for ${confirmAction.routerName}. The router will be allowed to serve users again.`;

  const confirmLabel =
    confirmAction.type === "remove-router"
      ? "Yes, Remove Router"
      : confirmAction.type === "disable-router"
        ? "Yes, Disable Router"
        : "Yes, Enable Router";

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-slate-950/60 p-4">
      <button
        type="button"
        aria-label="Close confirmation"
        className="absolute inset-0"
        onClick={onCancel}
      />

      <section className="relative z-10 w-full max-w-md rounded-2xl border border-[#e6e6e6] bg-white p-6 shadow-2xl">
        <div
          className={`flex h-12 w-12 items-center justify-center rounded-full ${
            isEnable
              ? "bg-emerald-100 text-emerald-700"
              : "bg-red-100 text-red-600"
          }`}
        >
          <Router size={23} />
        </div>

        <h3 className="mt-5 text-xl font-black text-[#1a1a1a]">{title}</h3>

        <p className="mt-3 text-sm leading-6 text-[#737373]">{description}</p>

        <div className="mt-6 flex flex-col-reverse gap-3 sm:flex-row sm:justify-end">
          <button
            type="button"
            onClick={onCancel}
            className="rounded-xl border border-[#e6e6e6] px-5 py-3 text-sm font-semibold text-[#525252] hover:bg-[#ffffff]"
          >
            Cancel
          </button>

          <button
            type="button"
            onClick={onConfirm}
            className={`rounded-xl px-5 py-3 text-sm font-semibold text-white ${
              isEnable
                ? "bg-emerald-600 hover:bg-emerald-700"
                : "bg-red-600 hover:bg-red-700"
            }`}
          >
            {confirmLabel}
          </button>
        </div>
      </section>
    </div>
  );
}
