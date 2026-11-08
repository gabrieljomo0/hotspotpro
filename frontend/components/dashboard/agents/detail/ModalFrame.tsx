"use client";

// A plain pop-up window: dim background, a titled card, Esc / ✕ / clicking
// outside closes it. Used by the agent page's Record Collection, Reprint and
// Edit windows so they all behave the same.

import { useEffect, type ReactNode } from "react";
import { X } from "lucide-react";

export function ModalFrame({
  title,
  subtitle,
  onClose,
  children,
  widthClass = "max-w-lg",
  testId,
}: {
  title: string;
  subtitle?: string;
  onClose: () => void;
  children: ReactNode;
  widthClass?: string;
  testId?: string;
}) {
  useEffect(() => {
    function onKey(event: KeyboardEvent) {
      if (event.key === "Escape") onClose();
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);

  return (
    <div
      className="fixed inset-0 z-[80] flex items-start justify-center overflow-y-auto bg-black/40 px-4 py-10"
      onMouseDown={(event) => {
        if (event.target === event.currentTarget) onClose();
      }}
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-label={title}
        data-testid={testId}
        className={`w-full ${widthClass} rounded-2xl border border-[#e6e6e6] bg-white p-6 shadow-2xl`}
      >
        <div className="mb-5 flex items-start justify-between gap-4">
          <div>
            <h3 className="text-lg font-bold text-[#1a1a1a]">{title}</h3>
            {subtitle && <p className="mt-0.5 text-sm text-[#737373]">{subtitle}</p>}
          </div>
          <button
            type="button"
            aria-label="Close"
            onClick={onClose}
            className="rounded-lg p-1.5 text-[#a3a3a3] hover:bg-[#f4f4f4] hover:text-[#525252]"
          >
            <X size={18} />
          </button>
        </div>
        {children}
      </div>
    </div>
  );
}
