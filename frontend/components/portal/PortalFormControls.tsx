"use client";

import { compressImage } from "./compressImage";
import type { ReactNode } from "react";
import { LoaderCircle, X } from "lucide-react";

import type { IconComponent } from "./types";

export function InputField({
  label,
  value,
  placeholder,
  icon: Icon,
  type = "text",
  required = false,
  inputMode,
  onChange,
  rightElement,
}: {
  label: string;
  value: string;
  placeholder: string;
  icon: IconComponent;
  type?: string;
  required?: boolean;
  inputMode?: "text" | "tel" | "email" | "numeric" | "decimal";
  onChange: (value: string) => void;
  rightElement?: ReactNode;
}) {
  return (
    <label className="block">
      <span className="mb-2 block text-sm font-bold text-[#0f172a]">{label}</span>

      <div className="relative">
        <Icon size={18} className="absolute left-4 top-1/2 -translate-y-1/2 text-[#94a3b8]" />

        <input
          required={required}
          type={type}
          inputMode={inputMode}
          value={value}
          placeholder={placeholder}
          onChange={(event) => onChange(event.target.value)}
          className="w-full rounded-xl border border-[#cbd5e1] bg-white py-3.5 pl-12 pr-12 text-base text-[#0f172a] outline-none transition placeholder:text-[#94a3b8] focus:border-[#2563eb] focus:ring-4 focus:ring-blue-100"
        />

        {rightElement}
      </div>
    </label>
  );
}

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
      className="flex w-full items-center justify-center gap-2 rounded-xl bg-[#2563eb] px-5 py-3.5 text-base font-black text-white shadow-lg shadow-blue-500/20 transition hover:-translate-y-0.5 hover:bg-[#1d4ed8] hover:shadow-xl disabled:cursor-not-allowed disabled:opacity-50"
    >
      {loading && <LoaderCircle size={19} className="animate-spin" />}
      {children}
    </button>
  );
}

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
            <h2 className="text-lg font-black text-[#0f172a]">{title}</h2>
            {subtitle && <p className="mt-1 text-xs leading-5 text-[#64748b]">{subtitle}</p>}
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

        <div className="min-h-0 flex-1 overflow-y-auto bg-white p-5">{children}</div>
      </section>
    </div>
  );
}

export function FileCaptureField({
  label,
  icon: Icon,
  fileName,
  preview,
  onSelect,
  capture,
}: {
  label: string;
  icon: IconComponent;
  fileName: string;
  // A small picture of what was chosen, so the person can see it took.
  preview?: string;
  // The picture is passed along (already shrunk) with the file's name.
  onSelect: (fileName: string, preview: string) => void;
  capture?: "user" | "environment";
}) {
  const inputId = `file-${label.replace(/\s+/g, "-").toLowerCase()}`;

  return (
    <label htmlFor={inputId} className="block cursor-pointer">
      <span className="mb-1.5 block text-xs font-semibold text-[#475569]">{label}</span>
      <div className="flex items-center gap-3 rounded-xl border border-dashed border-[#cbd5e1] bg-[#ffffff] px-4 py-3">
        {preview ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={preview} alt={`${label} preview`} className="h-10 w-14 shrink-0 rounded-md object-cover" />
        ) : (
          <Icon size={18} className="shrink-0 text-[#2563eb]" />
        )}
        <span className="truncate text-sm text-[#64748b]">{fileName || "Tap to upload or take a photo"}</span>
      </div>
      <input
        id={inputId}
        type="file"
        accept="image/*"
        capture={capture}
        className="hidden"
        onChange={async (event) => {
          const file = event.target.files?.[0];
          if (!file) return;
          const picture = await compressImage(file);
          onSelect(file.name, picture ?? "");
        }}
      />
    </label>
  );
}
