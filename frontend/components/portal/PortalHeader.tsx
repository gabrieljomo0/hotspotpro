"use client";

import { Wifi, Headphones } from "lucide-react";

export function PortalHeader() {
  return (
    <header className="border-b border-[#d4d4d4] bg-[#f4f4f4]">
      <div className="flex h-16 items-center justify-between px-5">
        <div className="flex items-center gap-3">
          <Wifi size={28} strokeWidth={3} className="text-[#2563eb]" />

          <div>
            <p className="text-base font-black text-[#2563eb]">
              Hotspot<span className="text-[#2563eb]">Pro</span>
            </p>
            <p className="text-[10px] text-[#737373]">WiFi Portal</p>
          </div>
        </div>

        <a
          href="tel:+233241234567"
          className="flex items-center gap-2 rounded-lg border border-[#d4d4d4] px-3 py-2 text-xs font-semibold text-[#2563eb] transition hover:border-[#2563eb] hover:text-[#2563eb]"
        >
          <Headphones size={15} />
          Support
        </a>
      </div>
    </header>
  );
}

export function BrandHeader() {
  return (
    <div className="text-center">
      <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-[#f4f4f4]">
        <Wifi size={35} strokeWidth={3} className="text-[#2563eb]" />
      </div>

      <h1 className="mt-3 text-3xl font-black tracking-tight text-[#2563eb]">
        Hotspot<span className="text-[#2563eb]">Pro</span>
      </h1>

      <p className="mt-1 text-sm text-[#737373]">Fast. Secure. Reliable Internet</p>
    </div>
  );
}
