"use client";

import { CalendarDays, Clock, X } from "lucide-react";

import {
  PERIOD_OPTIONS,
  defaultPeriod,
  periodError,
  periodLabel,
  type PeriodKind,
  type RevenuePeriod,
} from "./revenuePeriod";

const inputClass =
  "h-10 rounded-lg border border-[#e6e6e6] bg-white px-3 text-sm text-[#1a1a1a] outline-none focus:border-[#1a1a1a]";

// Chooses which sales the revenue figures on the All Agents tab count: a
// preset, one day, one month or a date range — optionally only within a
// time of day.
export function RevenueFilter({
  period,
  onChange,
  soldCount,
  label = "Revenue for",
  note,
}: {
  period: RevenuePeriod;
  onChange: (next: RevenuePeriod) => void;
  soldCount: number;
  label?: string;
  // Replaces the admin-specific sentence about Remaining/Owed (e.g. on the
  // agent's own Sales page, where those columns don't exist).
  note?: string;
}) {
  const error = periodError(period);
  const set = (patch: Partial<RevenuePeriod>) => onChange({ ...period, ...patch });
  const hasTime = Boolean(period.timeFrom || period.timeTo);

  return (
    <div
      data-testid="revenue-filter"
      className="mb-5 rounded-xl border border-[#e6e6e6] bg-white p-4 shadow-[0_8px_24px_rgba(26,26,26,0.04)]"
    >
      <div className="flex flex-wrap items-end gap-3">
        <label className="block">
          <span className="mb-1 flex items-center gap-1.5 text-[11px] font-bold uppercase tracking-wide text-[#737373]">
            <CalendarDays size={12} /> {label}
          </span>
          <select
            data-testid="period-kind"
            value={period.kind}
            onChange={(event) => set({ kind: event.target.value as PeriodKind })}
            className={`${inputClass} min-w-[170px]`}
          >
            {PERIOD_OPTIONS.map((option) => (
              <option key={option.kind} value={option.kind}>
                {option.label}
              </option>
            ))}
          </select>
        </label>

        {period.kind === "day" && (
          <label className="block">
            <span className="mb-1 block text-[11px] font-bold uppercase tracking-wide text-[#737373]">Day</span>
            <input
              type="date"
              data-testid="period-day"
              value={period.day}
              onChange={(event) => set({ day: event.target.value })}
              className={inputClass}
            />
          </label>
        )}

        {period.kind === "month-pick" && (
          <label className="block">
            <span className="mb-1 block text-[11px] font-bold uppercase tracking-wide text-[#737373]">Month</span>
            <input
              type="month"
              data-testid="period-month"
              value={period.month}
              onChange={(event) => set({ month: event.target.value })}
              className={inputClass}
            />
          </label>
        )}

        {period.kind === "range" && (
          <>
            <label className="block">
              <span className="mb-1 block text-[11px] font-bold uppercase tracking-wide text-[#737373]">From</span>
              <input
                type="date"
                data-testid="period-from"
                value={period.from}
                onChange={(event) => set({ from: event.target.value })}
                className={inputClass}
              />
            </label>
            <label className="block">
              <span className="mb-1 block text-[11px] font-bold uppercase tracking-wide text-[#737373]">To</span>
              <input
                type="date"
                data-testid="period-to"
                value={period.to}
                onChange={(event) => set({ to: event.target.value })}
                className={inputClass}
              />
            </label>
          </>
        )}

        <div className="flex items-end gap-2">
          <label className="block">
            <span className="mb-1 flex items-center gap-1.5 text-[11px] font-bold uppercase tracking-wide text-[#737373]">
              <Clock size={12} /> Time from
            </span>
            <input
              type="time"
              data-testid="period-time-from"
              value={period.timeFrom}
              onChange={(event) => set({ timeFrom: event.target.value })}
              className={inputClass}
            />
          </label>
          <label className="block">
            <span className="mb-1 block text-[11px] font-bold uppercase tracking-wide text-[#737373]">to</span>
            <input
              type="time"
              data-testid="period-time-to"
              value={period.timeTo}
              onChange={(event) => set({ timeTo: event.target.value })}
              className={inputClass}
            />
          </label>
          {hasTime && (
            <button
              type="button"
              data-testid="period-time-clear"
              aria-label="Clear time of day"
              onClick={() => set({ timeFrom: "", timeTo: "" })}
              className="flex h-10 w-10 items-center justify-center rounded-lg border border-[#e6e6e6] bg-white text-[#737373] hover:bg-[#ffffff]"
            >
              <X size={14} />
            </button>
          )}
        </div>

        <button
          type="button"
          data-testid="period-reset"
          onClick={() => onChange(defaultPeriod())}
          className="h-10 rounded-lg border border-[#e6e6e6] bg-white px-3 text-xs font-semibold text-[#525252] hover:bg-[#ffffff]"
        >
          Reset to today
        </button>
      </div>

      <p data-testid="period-summary" className={`mt-3 text-xs ${error ? "font-semibold text-red-600" : "text-[#737373]"}`}>
        {error ?? (
          <>
            Showing <strong className="text-[#1a1a1a]">{periodLabel(period)}</strong> · {soldCount} voucher
            {soldCount === 1 ? "" : "s"} sold.
            {note ?? " Revenue, Sold and the card above follow this filter; Remaining and Owed always show the current position."}
          </>
        )}
      </p>
    </div>
  );
}
