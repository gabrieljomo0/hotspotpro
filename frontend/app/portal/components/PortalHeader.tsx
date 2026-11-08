"use client";

import { Wifi, Headphones } from "lucide-react";

export function PortalHeader() {
  return (
    <header className="border-b border-[#cbd5e1] bg-[#f1f5f9]">
      <div className="flex h-16 items-center justify-between px-5">
        <div className="flex items-center gap-3">
          <Wifi
            size={28}
            strokeWidth={3}
            className="text-[#2563eb]"
          />

          <div>
            <p className="text-base font-black text-[#0f172a]">
              Hotspot
              <span className="text-[#2563eb]">
                Pro
              </span>
            </p>

            <p className="text-[10px] text-[#64748b]">
              WiFi Portal
            </p>
          </div>
        </div>

        <a
          href="tel:+233241234567"
          className="flex items-center gap-2 rounded-lg border border-[#cbd5e1] px-3 py-2 text-xs font-semibold text-[#0f172a] transition hover:border-[#ffcc00] hover:text-[#2563eb]"
        >
          <Headphones size={15} />
          Support
        </a>
      </div>
    </header>
  );
}

