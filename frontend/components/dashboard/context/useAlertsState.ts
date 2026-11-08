"use client";

// Operational alerts: router offline/online, voucher stock running low or
// empty, an agent generating vouchers, an agent's own stock running low.
// This is separate from NotificationSettings (customer-facing SMS/email)
// — these alerts go to the admin and/or the agents themselves, inside the
// app (and, in principle, wherever a real backend later wires up push/SMS
// for them).
//
// The core idea: a set of RULES (configured by the admin — enabled,
// scoped to all/one business/one router, who gets notified) and a log of
// EVENTS (the actual alerts that have fired, one per admin or per agent).
// fireAlert() is called from other hooks/actions when something relevant
// happens; it looks up the most specific matching rule and, if enabled,
// creates the right events.

import { useState } from "react";
import { usePersistedState } from "./usePersistedState";

import type { AlertRule, AlertRuleType, AlertEvent, AgentProfile } from "../shared/types";
import type { RouterInfo } from "../data/dashboard-data";
import { nowTimestamp } from "./utils";

const DEFAULT_RULES: AlertRule[] = [
  {
    id: "rule-router-offline",
    type: "routerOffline",
    enabled: true,
    scopeType: "all",
    scopeId: null,
    thresholdValue: null,
    notifyAdmin: true,
    notifyAgents: true,
  },
  {
    id: "rule-router-online",
    type: "routerOnline",
    enabled: true,
    scopeType: "all",
    scopeId: null,
    thresholdValue: null,
    notifyAdmin: true,
    notifyAgents: true,
  },
  {
    id: "rule-voucher-stock-low",
    type: "voucherStockLow",
    enabled: true,
    scopeType: "all",
    scopeId: null,
    thresholdValue: 20,
    notifyAdmin: true,
    notifyAgents: false,
  },
  {
    id: "rule-voucher-stock-empty",
    type: "voucherStockEmpty",
    enabled: true,
    scopeType: "all",
    scopeId: null,
    thresholdValue: 0,
    notifyAdmin: true,
    notifyAgents: false,
  },
  {
    id: "rule-voucher-generated",
    type: "voucherGenerated",
    enabled: true,
    scopeType: "all",
    scopeId: null,
    thresholdValue: null,
    notifyAdmin: true,
    notifyAgents: false,
  },
  {
    id: "rule-agent-stock-low",
    type: "agentStockLow",
    enabled: true,
    scopeType: "all",
    scopeId: null,
    thresholdValue: 10,
    notifyAdmin: true,
    notifyAgents: true,
  },
  {
    id: "rule-reseller-applied",
    type: "resellerApplied",
    enabled: true,
    scopeType: "all",
    scopeId: null,
    thresholdValue: null,
    notifyAdmin: true,
    notifyAgents: false,
  },
];

export function useAlertsState(
  showToast: (message: string) => void,
  logActivity: (category: "Settings", message: string) => void,
  routers: RouterInfo[],
  agents: AgentProfile[],
) {
  const [alertRules, setAlertRules] = useState<AlertRule[]>(DEFAULT_RULES);
  const [alertEvents, setAlertEvents] = usePersistedState<AlertEvent[]>("alertEvents", []);

  function updateAlertRule(id: string, updates: Partial<AlertRule>) {
    setAlertRules((current) => current.map((rule) => (rule.id === id ? { ...rule, ...updates } : rule)));
    showToast("Alert rule updated.");
    logActivity("Settings", `Updated the "${id}" alert rule.`);
  }

  function addAlertRule(rule: Omit<AlertRule, "id">) {
    const newRule: AlertRule = { ...rule, id: `rule-${Date.now()}` };
    setAlertRules((current) => [...current, newRule]);
    showToast("Alert rule added.");
    logActivity("Settings", `Added a new ${rule.type} alert rule.`);
    return newRule;
  }

  function deleteAlertRule(id: string) {
    setAlertRules((current) => current.filter((rule) => rule.id !== id));
    showToast("Alert rule removed.");
  }

  // Finds the most specific enabled rule for a given type + context.
  // A router-scoped rule beats a business-scoped rule, which beats an
  // "all" rule — so admin can set a broad default and still override it
  // for one troublesome router or one specific business.
  function findMatchingRule(
    type: AlertRuleType,
    context: { routerIp?: string; businessId?: string },
  ): AlertRule | null {
    const candidates = alertRules.filter((rule) => rule.type === type && rule.enabled);

    const routerMatch = context.routerIp
      ? candidates.find((rule) => rule.scopeType === "router" && rule.scopeId === context.routerIp)
      : undefined;
    if (routerMatch) return routerMatch;

    const businessMatch = context.businessId
      ? candidates.find((rule) => rule.scopeType === "business" && rule.scopeId === context.businessId)
      : undefined;
    if (businessMatch) return businessMatch;

    return candidates.find((rule) => rule.scopeType === "all") ?? null;
  }

  function pushEvent(ruleType: AlertRuleType, message: string, audience: "admin" | "agent", agentId: string | null) {
    const event: AlertEvent = {
      id: `alert-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
      ruleType,
      message,
      timestamp: nowTimestamp(),
      audience,
      agentId,
      read: false,
    };
    setAlertEvents((current) => [event, ...current]);
  }

  // The main entry point other parts of the app call when something
  // alert-worthy happens. Resolves the right rule, then notifies admin
  // and/or the agent(s) assigned to the affected router, per that rule.
  function fireAlert(
    type: AlertRuleType,
    message: string,
    context: { routerIp?: string; businessId?: string; agentId?: string } = {},
  ) {
    const businessId = context.businessId ?? routers.find((r) => r.ip === context.routerIp)?.siteId ?? undefined;
    const rule = findMatchingRule(type, { routerIp: context.routerIp, businessId });
    if (!rule) return;

    if (rule.notifyAdmin) {
      pushEvent(type, message, "admin", null);
    }

    if (rule.notifyAgents) {
      if (context.agentId) {
        // A specific agent's own event (e.g. their own stock running low).
        pushEvent(type, message, "agent", context.agentId);
      } else if (context.routerIp) {
        // Every agent assigned to the affected router.
        agents
          .filter((agent) => agent.routerIp === context.routerIp)
          .forEach((agent) => pushEvent(type, message, "agent", agent.id));
      }
    }
  }

  function markAlertRead(id: string) {
    setAlertEvents((current) => current.map((event) => (event.id === id ? { ...event, read: true } : event)));
  }

  function getAdminAlerts() {
    return alertEvents.filter((event) => event.audience === "admin");
  }

  function getAgentAlerts(agentId: string) {
    return alertEvents.filter((event) => event.audience === "agent" && event.agentId === agentId);
  }

  return {
    alertRules,
    alertEvents,
    updateAlertRule,
    addAlertRule,
    deleteAlertRule,
    fireAlert,
    markAlertRead,
    getAdminAlerts,
    getAgentAlerts,
  };
}
