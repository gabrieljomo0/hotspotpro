"use client";

import type { VoucherCountFrom, VoucherLimitBy } from "../shared/types";

const box = (on: boolean) =>
  `rounded-xl border-2 p-3 text-left transition ${on ? "border-[#1a1a1a] bg-[#f4f4f4]" : "border-[#e6e6e6] bg-white hover:bg-[#ffffff]"}`;

/** Days, data, or both — and whether the day starts at sign-in or only while they are online. */
export function VoucherAllowanceFields({
  limitBy,
  countFrom,
  hasData,
  onLimitBy,
  onCountFrom,
}: {
  limitBy: VoucherLimitBy;
  countFrom: VoucherCountFrom;
  hasData: boolean;
  onLimitBy: (value: VoucherLimitBy) => void;
  onCountFrom: (value: VoucherCountFrom) => void;
}) {
  return (
    <div className="space-y-4">
      <div>
        <span className="mb-2 block text-sm font-semibold text-[#525252]">
          What the voucher uses <span className="text-red-500">*</span>
        </span>
        <div className="grid gap-2 sm:grid-cols-3">
          {(
            [
              ["days", "Days", "The time on the package. No data cap."],
              ["data", "Data", "The gigabytes on the package. No day limit."],
              ["both", "Days and data", "It ends when either one runs out."],
            ] as const
          ).map(([id, title, detail]) => (
            <button key={id} type="button" onClick={() => onLimitBy(id)} className={box(limitBy === id)}>
              <p className="text-sm font-bold text-[#1a1a1a]">{title}</p>
              <p className="text-xs text-[#737373]">{detail}</p>
            </button>
          ))}
        </div>
        {limitBy !== "days" && !hasData && (
          <p className="mt-2 text-xs text-[#737373]">This package has no data cap, so data will not stop the voucher. Add a data cap on the package, or choose Days.</p>
        )}
      </div>

      <div>
        <span className="mb-2 block text-sm font-semibold text-[#525252]">
          When it starts counting <span className="text-red-500">*</span>
        </span>
        <div className="grid gap-2 sm:grid-cols-2">
          <button type="button" onClick={() => onCountFrom("signin")} className={box(countFrom === "signin")}>
            <p className="text-sm font-bold text-[#1a1a1a]">Starts at sign-in</p>
            <p className="text-xs text-[#737373]">The day starts the first time they connect and keeps running if they sign off. Data counts as they browse.</p>
          </button>
          <button type="button" onClick={() => onCountFrom("usage")} className={box(countFrom === "usage")}>
            <p className="text-sm font-bold text-[#1a1a1a]">Counts while in use</p>
            <p className="text-xs text-[#737373]">The day runs only while they are online, and pauses when they sign off. Data counts as they browse.</p>
          </button>
        </div>
        {limitBy === "data" && (
          <p className="mt-2 text-xs text-[#737373]">This voucher has no day limit. The data starts when they first sign in and counts only as they browse.</p>
        )}
      </div>
    </div>
  );
}
