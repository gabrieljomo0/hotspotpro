"use client";

import { Wifi } from "lucide-react";

export function BrandHeader() {
  return (
    <div className="text-center">
      <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-[#f4f4f4]">
        <Wifi
          size={35}
          strokeWidth={3}
          className="text-[#2563eb]"
        />
      </div>

      <h1 className="mt-3 text-3xl font-black tracking-tight text-[#2563eb]">
        Hotspot
        <span className="text-[#2563eb]">
          Pro
        </span>
      </h1>

      <p className="mt-1 text-sm text-[#737373]">
        Fast. Secure. Reliable Internet
      </p>
    </div>
  );
}

