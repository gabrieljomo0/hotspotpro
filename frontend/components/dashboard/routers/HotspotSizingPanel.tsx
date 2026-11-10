"use client";

// Four small choices for how many people are online at once. The address
// plan is chosen from that and is not typed here.

import { PEAK_PLANS, type PeakChoice } from "./hotspotSizing";

const TIER_BLURB: Record<PeakChoice, string> = {
  "200": "Café or shop",
  "500": "Hotel or venue",
  "1000": "Mall or estate",
  "1000+": "Campus",
};

export function HotspotSizingPanel({
  peak,
  onPeak,
}: {
  peak: PeakChoice;
  onPeak: (peak: PeakChoice) => void;
}) {
  return (
    <div data-testid="hotspot-sizing" className="mt-4">
      <p className="text-sm font-bold text-[#1a1a1a]">Network size</p>
      <p className="text-xs text-[#737373]">How many people will be online at the same time.</p>
      <div role="radiogroup" aria-label="Users at peak" className="mt-2 grid grid-cols-2 gap-2 sm:grid-cols-4">
        {PEAK_PLANS.map((tier) => {
          const active = peak === tier.id;
          return (
            <button
              key={tier.id}
              type="button"
              role="radio"
              aria-checked={active}
              data-testid={`peak-${tier.id}`}
              onClick={() => onPeak(tier.id)}
              className={`rounded-xl border px-2.5 py-2 text-left ${
                active ? "border-[#1a1a1a] bg-[#f4f4f4]" : "border-[#e6e6e6] bg-white"
              }`}
            >
              <p className="text-xs font-bold text-[#1a1a1a]">{tier.label.replace("Up to ", "")}</p>
              <p className="text-[11px] leading-4 text-[#737373]">{TIER_BLURB[tier.id]}</p>
            </button>
          );
        })}
      </div>
    </div>
  );
}
