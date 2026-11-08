"use client";

import type { IconComponent } from "../types";

export function FileCaptureField({
  label,
  icon: Icon,
  fileName,
  onSelect,
  capture,
}: {
  label: string;
  icon: IconComponent;
  fileName: string;
  onSelect: (fileName: string) => void;
  capture?: "user" | "environment";
}) {
  const inputId = `file-${label.replace(/\s+/g, "-").toLowerCase()}`;

  return (
    <label htmlFor={inputId} className="block cursor-pointer">
      <span className="mb-1.5 block text-xs font-semibold text-[#475569]">
        {label}
      </span>
      <div className="flex items-center gap-3 rounded-xl border border-dashed border-[#cbd5e1] bg-[#ffffff] px-4 py-3">
        <Icon size={18} className="shrink-0 text-[#2563eb]" />
        <span className="truncate text-sm text-[#64748b]">
          {fileName || "Tap to upload or take a photo"}
        </span>
      </div>
      <input
        id={inputId}
        type="file"
        accept="image/*"
        capture={capture}
        className="hidden"
        onChange={(event) => {
          const file = event.target.files?.[0];
          if (file) onSelect(file.name);
        }}
      />
    </label>
  );
}
