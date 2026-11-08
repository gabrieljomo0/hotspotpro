"use client";

// The prompt telling an agent the most they may charge a customer above
// a package's base price when reselling it. Shown prominently and
// undismissable the first time (right after approval, before they've
// acknowledged it), then as a smaller reminder after that that the agent can close.

import { sym } from "@/components/dashboard/shared/currency";
import { ShieldAlert, Check, X } from "lucide-react";

import { useDashboard } from "@/components/dashboard/context/DashboardContext";
import { usePersistedState } from "@/components/dashboard/context/usePersistedState";
import type { AgentProfile } from "@/components/dashboard/shared/types";

export function ResaleRuleBanner({ agent }: { agent: AgentProfile }) {
  const { acknowledgeResaleRule } = useDashboard();
  // Once the agent closes the small reminder it stays closed (per agent).
  const [reminderClosed, setReminderClosed] = usePersistedState<boolean>(`resaleReminderClosed:${agent.id}`, false);

  if (agent.maxResaleMarkupPercent === null) {
    // Admin hasn't set a cap — nothing to show or enforce.
    return null;
  }

  if (!agent.resaleRuleAcknowledged) {
    return (
      <div className="mb-5 overflow-hidden rounded-2xl border-2 bg-[#f4f4f4]">
        <div className="flex items-start gap-3 p-5">
          <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-[#1a1a1a] text-white">
            <ShieldAlert size={18} />
          </span>
          <div className="min-w-0 flex-1">
            <p className="text-sm font-bold text-[#1a1a1a]">Before you start selling</p>
            <p className="mt-1 text-sm text-[#1a1a1a]">
              You&apos;re only allowed to charge a customer up to{" "}
              <strong>{agent.maxResaleMarkupPercent}% above</strong> a package&apos;s base price. For example, on a
              {sym()}100 package you can charge at most {sym()}
              {(100 * (1 + agent.maxResaleMarkupPercent / 100)).toFixed(2)}. Charging more than this is not allowed.
            </p>
            <button
              type="button"
              onClick={() => acknowledgeResaleRule(agent.id)}
              className="mt-3 inline-flex items-center gap-1.5 rounded-xl bg-[#1a1a1a] px-4 py-2.5 text-sm font-bold text-white hover:bg-[#111111]"
            >
              <Check size={14} />
              I understand
            </button>
          </div>
        </div>
      </div>
    );
  }

  if (reminderClosed) return null;

  return (
    <p
      data-testid="resale-reminder"
      className="mb-5 flex items-center gap-2 rounded-xl bg-white px-4 py-2.5 text-xs font-semibold text-[#1a1a1a]"
    >
      <ShieldAlert size={13} className="shrink-0" />
      <span className="flex-1">
        Reminder: don&apos;t charge customers more than {agent.maxResaleMarkupPercent}% above a package&apos;s base
        price.
      </span>
      <button
        type="button"
        data-testid="resale-reminder-close"
        aria-label="Close reminder"
        onClick={() => setReminderClosed(true)}
        className="shrink-0 rounded-md p-1 text-[#1a1a1a] hover:bg-[#e6e6e6]"
      >
        <X size={13} />
      </button>
    </p>
  );
}
