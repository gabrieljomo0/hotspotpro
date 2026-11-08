"use client";

// A clear, consistent "which business am I editing right now" banner for
// any settings panel that can apply differently per business (Loyalty,
// Notifications, Branding, etc). Drop this at the top of a panel, right
// below its own toggle for "same for everyone" vs "per business" — this
// banner is what's shown once "per business" is chosen, so admin always
// sees exactly which business's settings are on screen.
//
// This is deliberately visual and hard to miss: a colored border, a
// building icon, and the business name in bold — matching the same
// "always know where you are" pattern used for the payment gateway and
// hotspot/captive portal settings, so it feels consistent everywhere.

import { Building2 } from "lucide-react";

import type { BusinessLocation } from "../shared/types";

export function BusinessScopeBanner({
  businessLocations,
  selectedBusinessId,
  onSelectBusiness,
}: {
  businessLocations: BusinessLocation[];
  selectedBusinessId: string;
  onSelectBusiness: (businessId: string) => void;
}) {
  const selected = businessLocations.find((b) => b.id === selectedBusinessId);

  return (
    <div className="mb-5 rounded-xl border-2 border-[#1a1a1a] bg-[#f4f4f4] p-4">
      <div className="flex flex-wrap items-center gap-3">
        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-[#1a1a1a] text-white">
          <Building2 size={18} />
        </div>
        <div className="min-w-[220px] flex-1">
          <p className="text-xs font-bold uppercase tracking-wide text-[#1a1a1a]">
            Now editing settings for
          </p>
          <select
            value={selectedBusinessId}
            onChange={(event) => onSelectBusiness(event.target.value)}
            className="mt-1 h-10 w-full max-w-sm rounded-lg border border-[#1a1a1a] bg-white px-3 text-sm font-bold text-[#1a1a1a] outline-none"
          >
            {businessLocations.map((business) => (
              <option key={business.id} value={business.id}>
                {business.name}
              </option>
            ))}
          </select>
        </div>
        {selected && (
          <span className="rounded-full bg-white px-3 py-1.5 text-xs font-bold text-[#1a1a1a]">
            {selected.name}
          </span>
        )}
      </div>
    </div>
  );
}
