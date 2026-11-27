"use client";

import { useEffect, useState } from "react";
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
  const [typedCode, setTypedCode] = useState("");

  useEffect(() => {
    setTypedCode("");
  }, [confirmAction?.routerIp, confirmAction?.type, confirmAction?.confirmCode]);

  if (!confirmAction) {
    return null;
  }

  const isEnable = confirmAction.type === "enable-router";
  const isRemove = confirmAction.type === "remove-router";
  const needsCode = isRemove && !!confirmAction.confirmCode;
  const codeOk = !needsCode || typedCode.trim().toUpperCase() === confirmAction.confirmCode!.toUpperCase();

  const title =
    confirmAction.type === "remove-router"
      ? confirmAction.working
        ? "Delete this working router?"
        : "Remove this router?"
      : confirmAction.type === "disable-router"
        ? "Disable router connection?"
        : "Enable router connection?";

  const description =
    confirmAction.type === "remove-router"
      ? confirmAction.working
        ? `${confirmAction.routerName} is Online and in use. Deleting it removes it from HotspotPro permanently — customers on it will lose managed access. Type the confirmation code below to continue.`
        : `You are about to remove ${confirmAction.routerName} from HotspotPro. This router will no longer be managed by the system. Type the confirmation code below to continue.`
      : confirmAction.type === "disable-router"
        ? `You are about to disable the connection for ${confirmAction.routerName}. Connected users may lose internet access.`
        : `You are about to enable the connection for ${confirmAction.routerName}. The router will be allowed to serve users again.`;

  const confirmLabel =
    confirmAction.type === "remove-router"
      ? "Yes, Delete Router"
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

      <section
        data-testid="confirm-dialog"
        className="relative z-10 w-full max-w-md rounded-2xl border border-[#e6e6e6] bg-white p-6 shadow-2xl"
      >
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

        {needsCode && (
          <div className="mt-5 space-y-2">
            <p className="text-xs font-semibold text-[#525252]">
              Confirmation code — type it exactly to unlock Delete
            </p>
            <p
              data-testid="confirm-code"
              className="rounded-xl bg-[#1a1a1a] px-4 py-3 text-center font-mono text-xl font-black tracking-[0.35em] text-white"
            >
              {confirmAction.confirmCode}
            </p>
            <input
              data-testid="confirm-code-input"
              type="text"
              autoComplete="off"
              autoFocus
              spellCheck={false}
              value={typedCode}
              onChange={(event) => setTypedCode(event.target.value)}
              placeholder="Type the code here"
              className="h-11 w-full rounded-xl border border-[#e6e6e6] bg-white px-3 font-mono text-sm tracking-widest text-[#1a1a1a] outline-none focus:border-[#1a1a1a]"
            />
            {typedCode && !codeOk && (
              <p className="text-xs font-semibold text-red-600">Code does not match yet.</p>
            )}
          </div>
        )}

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
            data-testid="confirm-dialog-ok"
            disabled={!codeOk}
            onClick={() => {
              if (!codeOk) return;
              onConfirm();
            }}
            className={`rounded-xl px-5 py-3 text-sm font-semibold text-white disabled:cursor-not-allowed disabled:opacity-40 ${
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
