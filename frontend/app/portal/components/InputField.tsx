"use client";

import type { ReactNode } from "react";

import type { IconComponent } from "../types";

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
  inputMode?:
    | "text"
    | "tel"
    | "email"
    | "numeric"
    | "decimal";
  onChange: (value: string) => void;
  rightElement?: ReactNode;
}) {
  return (
    <label className="block">
      <span className="mb-2 block text-sm font-bold text-[#0f172a]">
        {label}
      </span>

      <div className="relative">
        <Icon
          size={18}
          className="absolute left-4 top-1/2 -translate-y-1/2 text-[#94a3b8]"
        />

        <input
          required={required}
          type={type}
          inputMode={inputMode}
          value={value}
          placeholder={placeholder}
          onChange={(event) =>
            onChange(event.target.value)
          }
          className="w-full rounded-xl border border-[#cbd5e1] bg-white py-3.5 pl-12 pr-12 text-base text-[#0f172a] outline-none transition placeholder:text-[#94a3b8] focus:border-[#2563eb] focus:ring-4 focus:ring-blue-100"
        />

        {rightElement}
      </div>
    </label>
  );
}

