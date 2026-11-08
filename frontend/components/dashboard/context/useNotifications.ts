"use client";

// Toasts (the little "Saved!" popups) and the activity log are used from
// almost every other part of the dashboard's state — generating a voucher,
// adding a router, approving an agent, all of them show a toast and write
// a log entry. Because of that, this hook has to exist independently of
// every other domain (routers, agents, vouchers, ...) rather than living
// inside one of them, and it has to be called before anything that uses
// showToast/logActivity.
//
// Usage in the main provider:
//   const notifications = useNotifications();
//   const { showToast, logActivity } = notifications;
//   // ...later, spread notifications into the context value.

import { useState } from "react";
import { usePersistedState } from "./usePersistedState";

import type { ActivityLogEntry, HistoryRetention } from "../shared/types";
import { nowTimestamp } from "./utils";

export function useNotifications() {
  const [toastMessage, setToastMessage] = useState<string | null>(null);
  const [activityLog, setActivityLog] = usePersistedState<ActivityLogEntry[]>("activityLog", []);
  const [historyRetention, setHistoryRetention] = useState<HistoryRetention>("Never");

  function showToast(message: string) {
    setToastMessage(message);
    window.setTimeout(() => setToastMessage(null), 2500);
  }

  function logActivity(category: ActivityLogEntry["category"], message: string) {
    const entry: ActivityLogEntry = {
      id: `log-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
      timestamp: nowTimestamp(),
      category,
      message,
    };
    setActivityLog((current) => [entry, ...current]);
  }

  function clearHistory() {
    setActivityLog([]);
    showToast("History cleared.");
  }

  function updateHistoryRetention(retention: HistoryRetention) {
    setHistoryRetention(retention);
    showToast(`History will now be kept: ${retention}.`);
  }

  return {
    toastMessage,
    showToast,
    activityLog,
    logActivity,
    clearHistory,
    historyRetention,
    updateHistoryRetention,
  };
}
