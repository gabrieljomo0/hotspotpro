"use client";

import { useState } from "react";
import { CalendarClock } from "lucide-react";

export function DateRangeSelector({
  onApply,
}: {
  onApply: (from: string, to: string) => void;
}) {
  const [fromDate, setFromDate] = useState("");
  const [fromTime, setFromTime] = useState("00:00");
  const [toDate, setToDate] = useState("");
  const [toTime, setToTime] = useState("23:59");

  const canApply = Boolean(fromDate && toDate);

  function handleApply() {
    if (!canApply) return;
    onApply(`${fromDate}T${fromTime}`, `${toDate}T${toTime}`);
  }

  return (
    <div className="rounded-xl border border-[#f1f5f9] p-4">
      <div className="mb-3 flex items-center gap-2">
        <CalendarClock size={16} className="text-[#2563eb]" />
        <p className="text-sm font-bold text-[#0f172a]">
          Check a specific date &amp; time range
        </p>
      </div>

      <div className="flex flex-wrap items-end gap-3">
        <div className="flex flex-col gap-1">
          <span className="text-xs font-semibold text-[#64748b]">From</span>
          <div className="flex gap-2">
            <input
              type="date"
              value={fromDate}
              onChange={(event) => setFromDate(event.target.value)}
              className="h-10 cursor-pointer rounded-lg border border-[#e2e8f0] bg-white px-3 text-sm outline-none focus:border-[#2563eb]"
            />
            <input
              type="time"
              value={fromTime}
              onChange={(event) => setFromTime(event.target.value)}
              className="h-10 w-28 cursor-pointer rounded-lg border border-[#e2e8f0] bg-white px-3 text-sm outline-none focus:border-[#2563eb]"
            />
          </div>
        </div>

        <div className="flex flex-col gap-1">
          <span className="text-xs font-semibold text-[#64748b]">To</span>
          <div className="flex gap-2">
            <input
              type="date"
              value={toDate}
              onChange={(event) => setToDate(event.target.value)}
              className="h-10 cursor-pointer rounded-lg border border-[#e2e8f0] bg-white px-3 text-sm outline-none focus:border-[#2563eb]"
            />
            <input
              type="time"
              value={toTime}
              onChange={(event) => setToTime(event.target.value)}
              className="h-10 w-28 cursor-pointer rounded-lg border border-[#e2e8f0] bg-white px-3 text-sm outline-none focus:border-[#2563eb]"
            />
          </div>
        </div>

        <button
          type="button"
          disabled={!canApply}
          onClick={handleApply}
          className="h-10 rounded-lg bg-[#2563eb] px-4 text-sm font-bold text-white hover:bg-[#1d4ed8] disabled:cursor-not-allowed disabled:bg-[#e2e8f0] disabled:text-[#94a3b8]"
        >
          Check usage
        </button>
      </div>

      {!canApply && (
        <p className="mt-2 text-xs text-[#94a3b8]">
          Click the calendar icon in each date field (or type directly) to
          pick a start and end date.
        </p>
      )}
    </div>
  );
}
