"use client";

// ONE compact card for the agent's sales: total, vouchers sold and commission
// together, with a small filter (daily, a date, days, week or month).
// It sits in the row of summary cards. Only shown when the agent may see sales.

import { sym } from "@/components/dashboard/shared/currency";
import { useMemo } from "react";
import { Banknote } from "lucide-react";

import { useDashboard } from "@/components/dashboard/context/DashboardContext";
import { settingsOf } from "@/components/dashboard/agents/agentSettings";
import {
  periodError,
  periodLabel,
  type PeriodKind,
  type RevenuePeriod,
} from "@/components/dashboard/agents/directory/revenuePeriod";
import type { AgentProfile } from "@/components/dashboard/shared/types";

import { getAgentSales, salesInPeriodList, todayInputValue } from "./salesData";

function money(value: number) {
  return value.toLocaleString(undefined, { minimumFractionDigits: 0, maximumFractionDigits: 2 });
}

// The numbers for the chosen period.
export function useAgentPeriodSales(agent: AgentProfile, period: RevenuePeriod) {
  const { agents, vouchers, voucherBatches, packages } = useDashboard();
  const all = useMemo(
    () => getAgentSales(agent, agents, vouchers, voucherBatches, packages),
    [agent, agents, vouchers, voucherBatches, packages],
  );
  return useMemo(() => {
    const error = periodError(period);
    const inside = error ? [] : salesInPeriodList(all, period);
    const total = inside.reduce((sum, s) => sum + s.amount, 0);
    const rate = agent.commissionRatePercent ?? 0;
    return { all, inside, error, total, count: inside.length, rate, commission: (total * rate) / 100 };
  }, [all, period, agent.commissionRatePercent]);
}

const KIND_OPTIONS: Array<{ kind: PeriodKind; label: string }> = [
  { kind: "today", label: "Daily (today)" },
  { kind: "yesterday", label: "Yesterday" },
  { kind: "day", label: "A date" },
  { kind: "range", label: "Days (from – to)" },
  { kind: "week", label: "This week" },
  { kind: "month", label: "This month" },
  { kind: "month-pick", label: "A month" },
];

function daysAgoInput(days: number) {
  const d = new Date();
  d.setDate(d.getDate() - days);
  return todayInputValue(d);
}

const inputClass =
  "h-8 min-w-0 rounded-lg border border-[#d4d4d4] bg-white px-2 text-xs outline-none focus:border-[#1a1a1a]";

export function SalesOverview({
  agent,
  period,
  onPeriodChange,
}: {
  agent: AgentProfile;
  period: RevenuePeriod;
  onPeriodChange: (next: RevenuePeriod) => void;
}) {
  const canViewTeam = agent.permissions["sales.viewTeam"] === "Allowed";
  const showCommission = settingsOf(agent).allowViewSalesCommission;
  const { error, total, count, rate, commission } = useAgentPeriodSales(agent, period);

  function changeKind(kind: PeriodKind) {
    const next: RevenuePeriod = { ...period, kind, timeFrom: "", timeTo: "" };
    if (kind === "day" && !next.day) next.day = todayInputValue();
    if (kind === "month-pick" && !next.month) next.month = todayInputValue().slice(0, 7);
    if (kind === "range" && (!next.from || !next.to)) {
      next.from = daysAgoInput(6);
      next.to = todayInputValue();
    }
    onPeriodChange(next);
  }

  return (
    <article
      data-testid="sales-overview"
      className="rounded-xl bg-white p-3 shadow-sm col-span-2"
    >
      <div className="flex flex-wrap items-center justify-between gap-2">
        <p className="flex items-center gap-1.5 text-sm font-semibold text-[#1a1a1a]">
          <span className="flex h-7 w-7 items-center justify-center rounded-full bg-[#f4f4f4] text-[#1a1a1a]">
            <Banknote size={15} />
          </span>
          {canViewTeam ? "Team sales" : "Sales"}
        </p>

        <div className="flex flex-wrap items-center gap-1.5">
          <select
            data-testid="period-kind"
            aria-label="Sales period"
            value={period.kind}
            onChange={(event) => changeKind(event.target.value as PeriodKind)}
            className={inputClass}
          >
            {KIND_OPTIONS.map((option) => (
              <option key={option.kind} value={option.kind}>
                {option.label}
              </option>
            ))}
          </select>
          {period.kind === "day" && (
            <input
              data-testid="period-day"
              type="date"
              aria-label="Date"
              value={period.day}
              onChange={(event) => onPeriodChange({ ...period, day: event.target.value })}
              className={inputClass}
            />
          )}
          {period.kind === "month-pick" && (
            <input
              data-testid="period-month"
              type="month"
              aria-label="Month"
              value={period.month}
              onChange={(event) => onPeriodChange({ ...period, month: event.target.value })}
              className={inputClass}
            />
          )}
          {period.kind === "range" && (
            <>
              <input
                data-testid="period-from"
                type="date"
                aria-label="From date"
                value={period.from}
                onChange={(event) => onPeriodChange({ ...period, from: event.target.value })}
                className={inputClass}
              />
              <span className="text-xs text-[#a3a3a3]">–</span>
              <input
                data-testid="period-to"
                type="date"
                aria-label="To date"
                value={period.to}
                onChange={(event) => onPeriodChange({ ...period, to: event.target.value })}
                className={inputClass}
              />
            </>
          )}
        </div>
      </div>

      <p data-testid="period-summary" className="mt-1 text-[11px] text-[#a3a3a3]">
        {error ?? periodLabel(period)}
      </p>

      <div className={`mt-2 grid gap-2 ${showCommission ? "grid-cols-3" : "grid-cols-2"}`}>
        <div>
          <p className="text-xs text-[#737373]">Total sales</p>
          <p data-testid="period-total" className="mt-0.5 truncate text-base font-black text-[#1a1a1a]">
            {sym()} {money(error ? 0 : total)}
          </p>
        </div>
        <div>
          <p className="text-xs text-[#737373]">Vouchers sold</p>
          <p data-testid="period-count" className="mt-0.5 truncate text-base font-black text-[#1a1a1a]">
            {error ? 0 : count}
          </p>
        </div>
        {showCommission && (
          <div>
            <p className="text-xs text-[#737373]">Commission ({rate}%)</p>
            <p data-testid="period-commission" className="mt-0.5 truncate text-base font-black text-[#1a1a1a]">
              {sym()} {money(error ? 0 : commission)}
            </p>
          </div>
        )}
      </div>
    </article>
  );
}
