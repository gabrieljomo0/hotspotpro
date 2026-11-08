"use client";

// Draws the pop-up for askConfirm(). Mounted once in the dashboard shell.

import { useEffect, useState } from "react";

import { ConfirmDialog } from "./ConfirmDialog";
import { CONFIRM_EVENT, setHostMounted, type ConfirmRequest } from "./askConfirm";

export function ConfirmHost() {
  const [request, setRequest] = useState<ConfirmRequest | null>(null);

  useEffect(() => {
    setHostMounted(true);
    function onAsk(event: Event) {
      setRequest((current) => {
        current?.resolve(false);
        return (event as CustomEvent<ConfirmRequest>).detail;
      });
    }
    window.addEventListener(CONFIRM_EVENT, onAsk);
    return () => {
      window.removeEventListener(CONFIRM_EVENT, onAsk);
      setHostMounted(false);
    };
  }, []);

  if (!request) return null;

  // "Reset Ama's PIN? A new PIN will be issued." -> title + one point.
  const cut = request.message.indexOf("? ");
  const title = cut >= 0 ? request.message.slice(0, cut + 1) : request.message;
  const rest = cut >= 0 ? request.message.slice(cut + 2).trim() : "";

  function answer(ok: boolean) {
    request?.resolve(ok);
    setRequest(null);
  }

  return (
    <div data-testid="confirm-host">
      <ConfirmDialog
        open
        title={title}
        points={rest ? [rest] : []}
        confirmLabel={request.confirmLabel ?? "Yes, continue"}
        onConfirm={() => answer(true)}
        onCancel={() => answer(false)}
      />
    </div>
  );
}
