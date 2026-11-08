"use client";

// Lets the admin control exactly which operational alerts fire, who
// they go to (admin and/or the agents on the affected router), and at
// what threshold — either for the whole account, one business, or one
// specific router. See useAlertsState.ts for how these rules are
// actually applied when something happens.

import { useState } from "react";
import { Bell, ChevronDown } from "lucide-react";

import { useDashboard } from "../context/DashboardContext";
import { Toggle } from "./SettingsFormControls";
import type { AlertRule, AlertRuleType } from "../shared/types";

const RULE_LABELS: Record<AlertRuleType, { title: string; description: string }> = {
  routerOffline: {
    title: "Router goes offline",
    description: "Alerts the admin and every agent assigned to that router the moment it drops.",
  },
  routerOnline: {
    title: "Router comes back online",
    description: "Alerts the admin and agents assigned to that router once it reconnects.",
  },
  voucherStockLow: {
    title: "Voucher stock running low",
    description: "Warns the admin before a package's vouchers fully run out.",
  },
  voucherStockEmpty: {
    title: "Voucher stock fully finished",
    description: "Tells the admin the moment a package has zero vouchers left.",
  },
  voucherGenerated: {
    title: "An agent generates vouchers",
    description: "Lets the admin/site owner know whenever an agent creates a new batch.",
  },
  agentStockLow: {
    title: "An agent's own stock is running low",
    description: "Alerts both the agent and the admin once that agent's available vouchers drop below the limit.",
  },
  resellerApplied: {
    title: "Someone applies to become a reseller",
    description: "Alerts the admin/site owner the moment someone submits the \"Apply as Reseller\" form on a captive portal.",
  },
};

export function AlertsSettingsPanel() {
  const { alertRules, updateAlertRule, businessLocations, routers } = useDashboard();
  const [expandedRuleId, setExpandedRuleId] = useState<string | null>(null);

  function scopeLabel(rule: AlertRule) {
    if (rule.scopeType === "all") return "All businesses & routers";
    if (rule.scopeType === "business") {
      return businessLocations.find((b) => b.id === rule.scopeId)?.name ?? "A business";
    }
    return routers.find((r) => r.ip === rule.scopeId)?.name ?? "A router";
  }

  return (
    <article className="rounded-2xl border border-[#e2e8f0] bg-white p-6 shadow-[0_8px_24px_rgba(37,99,235,0.06)] md:p-8">
      <div className="mb-6 flex items-center gap-3">
        <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-amber-100 text-amber-600">
          <Bell size={20} />
        </div>
        <div>
          <h3 className="text-lg font-bold text-[#0f172a]">Alerts</h3>
          <p className="text-sm text-[#64748b]">
            Decide what triggers an alert, who gets it, and for which businesses or routers.
          </p>
        </div>
      </div>

      <div className="space-y-3">
        {alertRules.map((rule) => {
          const label = RULE_LABELS[rule.type as AlertRuleType];
          const isExpanded = expandedRuleId === rule.id;

          return (
            <article key={rule.id} className="overflow-hidden rounded-xl border border-[#f1f5f9]">
              <div className="flex items-center justify-between gap-3 px-4 py-3">
                <button
                  type="button"
                  onClick={() => setExpandedRuleId(isExpanded ? null : rule.id)}
                  className="flex flex-1 items-center gap-3 text-left"
                >
                  <ChevronDown size={15} className={`shrink-0 text-[#94a3b8] transition-transform ${isExpanded ? "rotate-180" : ""}`} />
                  <div>
                    <p className="text-sm font-bold text-[#0f172a]">{label.title}</p>
                    <p className="text-xs text-[#94a3b8]">{label.description}</p>
                  </div>
                </button>
                <span className="hidden shrink-0 rounded-full bg-[#ffffff] px-2.5 py-1 text-[10px] font-bold text-[#64748b] sm:inline-block">
                  {scopeLabel(rule)}
                </span>
                <Toggle
                  checked={rule.enabled}
                  onChange={() => updateAlertRule(rule.id, { enabled: !rule.enabled })}
                />
              </div>

              {isExpanded && (
                <div className="grid gap-4 border-t border-[#f1f5f9] bg-[#ffffff] p-4 sm:grid-cols-2">
                  <label className="block sm:col-span-2">
                    <span className="mb-1.5 block text-xs font-semibold text-[#475569]">Applies to</span>
                    <div className="max-h-48 space-y-1 overflow-y-auto rounded-lg border border-[#e2e8f0] bg-white p-3">
                      <label className="flex items-center gap-2 rounded px-1.5 py-1 text-sm text-[#475569] hover:bg-[#ffffff]">
                        <input
                          type="checkbox"
                          checked={rule.scopeType === "all"}
                          onChange={() => updateAlertRule(rule.id, { scopeType: "all", scopeId: null })}
                          className="h-4 w-4 rounded border-[#e2e8f0] accent-[#2563eb]"
                        />
                        All businesses &amp; routers
                      </label>

                      {businessLocations.length > 0 && (
                        <>
                          <p className="mt-2 px-1.5 text-[10px] font-bold uppercase tracking-wide text-[#94a3b8]">
                            A specific business
                          </p>
                          {businessLocations.map((b) => (
                            <label
                              key={b.id}
                              className="flex items-center gap-2 rounded px-1.5 py-1 text-sm text-[#475569] hover:bg-[#ffffff]"
                            >
                              <input
                                type="checkbox"
                                checked={rule.scopeType === "business" && rule.scopeId === b.id}
                                onChange={() => updateAlertRule(rule.id, { scopeType: "business", scopeId: b.id })}
                                className="h-4 w-4 rounded border-[#e2e8f0] accent-[#2563eb]"
                              />
                              {b.name}
                            </label>
                          ))}
                        </>
                      )}

                      {routers.length > 0 && (
                        <>
                          <p className="mt-2 px-1.5 text-[10px] font-bold uppercase tracking-wide text-[#94a3b8]">
                            A specific router
                          </p>
                          {routers.map((r) => (
                            <label
                              key={r.ip}
                              className="flex items-center gap-2 rounded px-1.5 py-1 text-sm text-[#475569] hover:bg-[#ffffff]"
                            >
                              <input
                                type="checkbox"
                                checked={rule.scopeType === "router" && rule.scopeId === r.ip}
                                onChange={() => updateAlertRule(rule.id, { scopeType: "router", scopeId: r.ip })}
                                className="h-4 w-4 rounded border-[#e2e8f0] accent-[#2563eb]"
                              />
                              {r.name}
                            </label>
                          ))}
                        </>
                      )}
                    </div>
                  </label>

                  {(rule.type === "voucherStockLow" || rule.type === "agentStockLow") && (
                    <label className="block">
                      <span className="mb-1.5 block text-xs font-semibold text-[#475569]">
                        Alert when remaining stock drops to
                      </span>
                      <input
                        type="number"
                        min={0}
                        value={rule.thresholdValue ?? 0}
                        onChange={(event) => updateAlertRule(rule.id, { thresholdValue: Number(event.target.value) })}
                        className="h-10 w-full rounded-lg border border-[#e2e8f0] bg-white px-3 text-sm outline-none focus:border-[#2563eb]"
                      />
                    </label>
                  )}

                  <label className="flex items-center gap-2 text-sm text-[#475569]">
                    <input
                      type="checkbox"
                      checked={rule.notifyAdmin}
                      onChange={() => updateAlertRule(rule.id, { notifyAdmin: !rule.notifyAdmin })}
                      className="h-4 w-4"
                    />
                    Notify admin
                  </label>
                  <label className="flex items-center gap-2 text-sm text-[#475569]">
                    <input
                      type="checkbox"
                      checked={rule.notifyAgents}
                      onChange={() => updateAlertRule(rule.id, { notifyAgents: !rule.notifyAgents })}
                      className="h-4 w-4"
                    />
                    Notify the agent(s) on that router
                  </label>
                </div>
              )}
            </article>
          );
        })}
      </div>
    </article>
  );
}
