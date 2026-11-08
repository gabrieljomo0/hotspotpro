"use client";

import { useState } from "react";
import { CalendarDays, ChevronDown, Check, RotateCcw } from "lucide-react";

import { useDashboard } from "../context/DashboardContext";

type Period = "Today" | "This Week" | "This Month" | "This Year";

const PERIODS: Period[] = ["Today", "This Week", "This Month", "This Year"];

function formatDate(date: Date) {
  return date.toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

function toInputValue(date: Date) {
  return date.toISOString().slice(0, 10);
}

function getRangeFor(period: Period) {
  const now = new Date();
  const start = new Date(now);

  if (period === "Today") {
    return { start: formatDate(now), end: formatDate(now) };
  }

  if (period === "This Week") {
    const day = now.getDay();
    const mondayOffset = day === 0 ? 6 : day - 1;
    start.setDate(now.getDate() - mondayOffset);
    const end = new Date(start);
    end.setDate(start.getDate() + 6);
    return { start: formatDate(start), end: formatDate(end) };
  }

  if (period === "This Month") {
    start.setDate(1);
    const end = new Date(now.getFullYear(), now.getMonth() + 1, 0);
    return { start: formatDate(start), end: formatDate(end) };
  }

  // This Year
  const yearStart = new Date(now.getFullYear(), 0, 1);
  const yearEnd = new Date(now.getFullYear(), 11, 31);
  return { start: formatDate(yearStart), end: formatDate(yearEnd) };
}

export function DashboardHeader() {
  const { dashboardPeriod: period, setDashboardPeriod: setPeriod } = useDashboard();
  const [menuOpen, setMenuOpen] = useState(false);
  const today = new Date();
  const [selectedDate, setSelectedDate] = useState(today);
  const isToday = toInputValue(selectedDate) === toInputValue(today);

  const range = getRangeFor(period);

  return (
    <div className="mb-6 flex flex-col justify-between gap-4 md:flex-row md:items-center">
      <div>
        <h2 className="text-3xl font-bold tracking-tight md:text-4xl">
          Dashboard
        </h2>

        <p className="mt-2 text-sm text-[#737373]  md:text-base">
          Welcome back, Admin! Here&apos;s what&apos;s happening with your
          hotspot.
        </p>
      </div>

      <div className="flex flex-wrap gap-3">
        <div className="relative">
          <button
            type="button"
            onClick={() => setMenuOpen((current) => !current)}
            className="flex items-center gap-4 rounded-xl border border-[#e6e6e6] bg-white px-4 py-3 text-sm font-semibold shadow-sm transition hover:bg-[#ffffff]   "
          >
            {period}
            <ChevronDown size={16} />
          </button>

          {menuOpen && (
            <>
              <button
                type="button"
                aria-label="Close period menu"
                className="fixed inset-0 z-40 cursor-default"
                onClick={() => setMenuOpen(false)}
              />
              <div className="absolute left-0 top-14 z-50 w-44 overflow-hidden rounded-xl border border-[#e6e6e6] bg-white py-2 shadow-2xl">
                {PERIODS.map((option) => (
                  <button
                    type="button"
                    key={option}
                    onClick={() => {
                      setPeriod(option);
                      setMenuOpen(false);
                    }}
                    className="flex w-full items-center justify-between px-4 py-2.5 text-sm text-[#525252] hover:bg-[#f4f4f4]"
                  >
                    {option}
                    {period === option && (
                      <Check size={15} className="text-[#1a1a1a]" />
                    )}
                  </button>
                ))}
              </div>
            </>
          )}
        </div>

        <label className="flex items-center gap-3 rounded-xl border border-[#e6e6e6] bg-white px-4 py-3 text-sm font-semibold shadow-sm transition hover:bg-[#ffffff]">
          <CalendarDays size={17} className="text-[#737373]" />
          <input
            type="date"
            value={toInputValue(selectedDate)}
            max={toInputValue(today)}
            onChange={(event) => {
              if (!event.target.value) return;
              setSelectedDate(new Date(event.target.value + "T00:00:00"));
            }}
            className="bg-transparent outline-none [color-scheme:light]"
          />
          {!isToday && (
            <button
              type="button"
              onClick={() => setSelectedDate(today)}
              title="Back to today"
              className="flex items-center gap-1 rounded-lg bg-[#f4f4f4] px-2 py-1 text-xs font-bold text-[#1a1a1a] hover:bg-[#f4f4f4]"
            >
              <RotateCcw size={11} />
              Today
            </button>
          )}
        </label>

        {period !== "Today" && (
          <div className="flex items-center gap-3 rounded-xl border border-dashed border-[#e6e6e6] bg-white px-4 py-3 text-xs text-[#737373]">
            {period} range: {range.start} – {range.end}
          </div>
        )}
      </div>
    </div>
  );
}

