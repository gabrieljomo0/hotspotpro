"use client";

import type { ReactNode } from "react";
import { LoaderCircle } from "lucide-react";

export function PrimaryButton({
  children,
  type = "button",
  disabled = false,
  loading = false,
  onClick,
}: {
  children: ReactNode;
  type?: "button" | "submit";
  disabled?: boolean;
  loading?: boolean;
  onClick?: () => void;
}) {
  return (
    <button
      type={type}
      disabled={disabled || loading}
      onClick={onClick}
      className="flex w-full items-center justify-center gap-2 rounded-xl bg-[#1a1a1a] px-5 py-3.5 text-base font-black text-white shadow-lg shadow-blue-500/20 transition hover:-translate-y-0.5 hover:bg-[#111111] hover:shadow-xl disabled:cursor-not-allowed disabled:opacity-50"
    >
      {loading && (
        <LoaderCircle
          size={19}
          className="animate-spin"
        />
      )}

      {children}
    </button>
  );
}

