"use client";

// Lets the admin broadcast the current (unsaved) form to other businesses —
// either hand-picked ones or all of them. Only shows up if there's more
// than one business to choose from.

import { useState } from "react";

import type { BusinessLocation } from "@/components/dashboard/shared/types";

export function ApplyToSitesPanel({
  businessLocations,
  onApplyToSelected,
  onApplyToAll,
}: {
  businessLocations: BusinessLocation[];
  onApplyToSelected: (siteIds: string[]) => void;
  onApplyToAll: () => void;
}) {
  const [showPicker, setShowPicker] = useState(false);
  const [targetIds, setTargetIds] = useState<string[]>([]);

  if (businessLocations.length <= 1) return null;

  function toggleTarget(siteId: string) {
    setTargetIds((current) =>
      current.includes(siteId) ? current.filter((id) => id !== siteId) : [...current, siteId],
    );
  }

  return (
    <div className="rounded-xl border border-[#f1f5f9] bg-[#ffffff] p-4">
      <button
        type="button"
        onClick={() => setShowPicker((current) => !current)}
        className="text-sm font-semibold text-[#2563eb] hover:underline"
      >
        Apply this setup to other sites too ▾
      </button>

      {showPicker && (
        <div className="mt-3">
          <p className="mb-2 text-xs text-[#64748b]">
            Choose which businesses/sites should get this same captive
            portal setup:
          </p>
          <div className="mb-3 flex flex-wrap gap-2">
            {businessLocations.map((site) => (
              <label
                key={site.id}
                className={`inline-flex cursor-pointer items-center gap-2 rounded-full border px-3 py-1.5 text-xs font-semibold ${
                  targetIds.includes(site.id)
                    ? "border-[#2563eb] bg-[#f1f5f9] text-[#2563eb]"
                    : "border-[#e2e8f0] bg-white text-[#64748b]"
                }`}
              >
                <input
                  type="checkbox"
                  checked={targetIds.includes(site.id)}
                  onChange={() => toggleTarget(site.id)}
                  className="hidden"
                />
                {site.name}
              </label>
            ))}
          </div>
          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              onClick={() => {
                if (targetIds.length === 0) return;
                onApplyToSelected(targetIds);
                setTargetIds([]);
                setShowPicker(false);
              }}
              disabled={targetIds.length === 0}
              className="rounded-lg bg-[#2563eb] px-4 py-2 text-xs font-bold text-white hover:bg-[#1d4ed8] disabled:cursor-not-allowed disabled:bg-[#e2e8f0] disabled:text-[#94a3b8]"
            >
              Apply to Selected
            </button>
            <button
              type="button"
              onClick={() => {
                onApplyToAll();
                setShowPicker(false);
              }}
              className="rounded-lg border border-[#e2e8f0] bg-white px-4 py-2 text-xs font-bold text-[#475569] hover:bg-[#ffffff]"
            >
              Apply to All Sites
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
