"use client";

import { Wifi, Headphones } from "lucide-react";

export function PortalHeader() {
  return (
    <header className="border-b border-[#d4d4d4] bg-[#f4f4f4]">
      <div className="flex h-16 items-center justify-between px-5">
        <div className="flex items-center gap-3">
          <Wifi
            size={28}
            strokeWidth={3}
            className="text-[#1a1a1a]"
          />

          <div>
            <p className="text-base font-black text-[#1a1a1a]">
              Hotspot
              <span className="text-[#1a1a1a]">
                Pro
              </span>
            </p>

            <p className="text-[10px] text-[#737373]">
              WiFi Portal
            </p>
          </div>
        </div>

        <a
          href="tel:+233241234567"
          className="flex items-center gap-2 rounded-lg border border-[#d4d4d4] px-3 py-2 text-xs font-semibold text-[#1a1a1a] transition hover:border-[#1a1a1a] hover:text-[#1a1a1a]"
        >
          <Headphones size={15} />
          Support
        </a>
      </div>
    </header>
  );
}

