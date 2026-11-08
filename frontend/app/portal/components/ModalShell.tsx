"use client";

import type { ReactNode } from "react";
import { X } from "lucide-react";

export function ModalShell({
  title,
  subtitle,
  children,
  onClose,
  preventClose = false,
}: {
  title: string;
  subtitle?: string;
  children: ReactNode;
  onClose: () => void;
  preventClose?: boolean;
}) {
  return (
    <div className="fixed inset-0 z-[100] flex items-end justify-center bg-[#0f172a]/65 p-0 backdrop-blur-sm sm:items-center sm:p-4">
      <button
        type="button"
        aria-label="Close popup background"
        onClick={() => {
          if (!preventClose) {
            onClose();
          }
        }}
        className="absolute inset-0"
      />

      <section className="relative z-10 flex max-h-[94vh] w-full max-w-[430px] flex-col overflow-hidden rounded-t-[28px] bg-white shadow-2xl sm:rounded-[28px]">
        <header className="flex shrink-0 items-start gap-3 border-b border-[#cbd5e1] bg-[#f1f5f9] px-5 py-4">
          <div className="min-w-0 flex-1">
            <h2 className="text-lg font-black text-[#0f172a]">
              {title}
            </h2>

            {subtitle && (
              <p className="mt-1 text-xs leading-5 text-[#64748b]">
                {subtitle}
              </p>
            )}
          </div>

          {!preventClose && (
            <button
              type="button"
              onClick={onClose}
              className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full border border-[#cbd5e1] bg-white text-[#475569] transition hover:border-[#2563eb] hover:text-[#2563eb]"
              aria-label="Close popup"
            >
              <X size={19} />
            </button>
          )}
        </header>

        <div className="min-h-0 flex-1 overflow-y-auto bg-white p-5">
          {children}
        </div>
      </section>
    </div>
  );
}
