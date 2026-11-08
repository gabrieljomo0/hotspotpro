"use client";

import { useState } from "react";
import { Trash2, TriangleAlert } from "lucide-react";

export function ClearDataUsageHistoryButton({
  resetAt,
  onClear,
}: {
  resetAt: string | null;
  onClear: () => void;
}) {
  const [confirming, setConfirming] = useState(false);

  function handleConfirm() {
    onClear();
    setConfirming(false);
  }

  return (
    <div className="rounded-xl border border-red-200 bg-red-50 p-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <p className="flex items-center gap-2 text-sm font-bold text-[#1a1a1a]">
            <TriangleAlert size={16} className="text-red-500" />
            Data Usage History
          </p>
          <p className="mt-1 text-xs text-[#737373]">
            {resetAt
              ? `History was last cleared on ${resetAt}. Charts only reflect usage from this point on.`
              : "This clears all recorded data usage since the software was first set up. This cannot be undone."}
          </p>
        </div>

        {confirming ? (
          <div className="flex shrink-0 gap-2">
            <button
              type="button"
              onClick={() => setConfirming(false)}
              className="rounded-lg border border-[#e6e6e6] bg-white px-3 py-2 text-xs font-semibold text-[#525252] hover:bg-[#ffffff]"
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={handleConfirm}
              className="rounded-lg bg-red-600 px-3 py-2 text-xs font-bold text-white hover:bg-red-700"
            >
              Yes, clear everything
            </button>
          </div>
        ) : (
          <button
            type="button"
            onClick={() => setConfirming(true)}
            className="inline-flex shrink-0 items-center gap-1.5 rounded-lg border border-red-300 bg-white px-3 py-2 text-xs font-bold text-red-600 hover:bg-red-50"
          >
            <Trash2 size={14} />
            Clear History
          </button>
        )}
      </div>
    </div>
  );
}
