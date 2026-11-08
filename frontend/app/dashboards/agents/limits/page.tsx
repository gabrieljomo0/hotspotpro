"use client";

import { sym } from "@/components/dashboard/shared/currency";
import { useState } from "react";

import { useDashboard } from "@/components/dashboard/context/DashboardContext";
import { BackLink } from "@/components/dashboard/shared/BackLink";
import type { AgentLimits } from "@/components/dashboard/shared/types";

const LIMIT_FIELDS: Array<{ key: keyof AgentLimits; label: string; unit: string }> = [
  { key: "dailySalesLimit", label: "Daily Sales Limit", unit: "CUR" },
  { key: "dailyVoucherLimit", label: "Daily Voucher Limit", unit: "vouchers" },
  { key: "maxDevices", label: "Maximum Active Devices", unit: "devices" },
  { key: "maxConcurrentSessions", label: "Maximum Concurrent Sessions", unit: "sessions" },
  { key: "creditLimit", label: "Credit Limit", unit: "CUR" },
  { key: "refundLimit", label: "Refund Limit (without approval)", unit: "CUR" },
];

export default function LimitsPoliciesPage() {
  const { agents, updateAgentLimits } = useDashboard();
  const [selectedAgentId, setSelectedAgentId] = useState(agents[0]?.id ?? "");
  const selectedAgent = agents.find((a) => a.id === selectedAgentId);
  const [draft, setDraft] = useState<AgentLimits>(
    selectedAgent?.limits ?? {
      dailySalesLimit: 0,
      dailyVoucherLimit: 0,
      maxDevices: 0,
      maxConcurrentSessions: 0,
      creditLimit: 0,
      refundLimit: 0,
    },
  );

  function handleSelect(id: string) {
    setSelectedAgentId(id);
    const agent = agents.find((a) => a.id === id);
    if (agent) setDraft(agent.limits);
  }

  return (
    <section className="w-full">
      <BackLink />
      <h2 className="mb-1 text-3xl font-bold tracking-tight md:text-4xl">
        Limits &amp; Policies
      </h2>
      <p className="mb-6 max-w-2xl text-sm text-[#64748b] md:text-base">
        Keep every agent within a safe operating scope — sales caps, voucher
        limits, device counts, credit, and refund thresholds.
      </p>


      <label className="mb-5 block max-w-xs">
        <span className="mb-2 block text-xs font-semibold text-[#64748b]">
          Editing limits for
        </span>
        <select
          value={selectedAgentId}
          onChange={(event) => handleSelect(event.target.value)}
          className="h-11 w-full rounded-xl border border-[#e2e8f0] bg-white px-3 text-sm outline-none focus:border-[#2563eb]"
        >
          {agents.map((agent) => (
            <option key={agent.id} value={agent.id}>
              {agent.name}
            </option>
          ))}
        </select>
      </label>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {LIMIT_FIELDS.map((field) => (
          <label key={field.key} className="block rounded-xl border border-[#f1f5f9] bg-white p-4">
            <span className="mb-2 block text-xs font-semibold text-[#64748b]">
              {field.label}
            </span>
            <div className="flex items-center gap-2">
              <input
                type="number"
                min={0}
                value={draft[field.key]}
                onChange={(event) =>
                  setDraft((current) => ({ ...current, [field.key]: Number(event.target.value) }))
                }
                className="h-10 w-full rounded-lg border border-[#e2e8f0] px-3 text-sm outline-none focus:border-[#2563eb]"
              />
              <span className="shrink-0 text-xs text-[#94a3b8]">{field.unit === "CUR" ? sym() : field.unit}</span>
            </div>
          </label>
        ))}
      </div>

      <button
        type="button"
        onClick={() => updateAgentLimits(selectedAgentId, draft)}
        className="mt-6 rounded-xl bg-[#2563eb] px-6 py-3 text-sm font-bold text-white hover:bg-[#1d4ed8]"
      >
        Save Limits for {selectedAgent?.name}
      </button>
    </section>
  );
}
