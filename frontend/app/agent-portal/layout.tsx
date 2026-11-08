"use client";

import type { ReactNode } from "react";

import { useDashboard } from "@/components/dashboard/context/DashboardContext";
import { StoreGate } from "@/components/dashboard/shared/StoreGate";
import { Toast } from "@/components/dashboard/shared/Toast";

function ToastHost() {
  // The admin shell shows these; the agent portal needs its own so agents
  // actually see what happened ("12 vouchers generated", "wallet doesn't
  // cover that", "preset saved", …).
  const { toastMessage } = useDashboard();
  return <Toast message={toastMessage} />;
}

// Every agent-portal screen waits for saved data first, so a dashboard
// opened in its own tab shows the agent's real, current details.
function ThemedPortal({ children }: { children: ReactNode }) {
  const { darkMode } = useDashboard();
  return (
    <div id="dashboard-root" className={darkMode ? "dark" : undefined}>
      {children}
    </div>
  );
}

export default function AgentPortalLayout({ children }: { children: ReactNode }) {
  return (
    <StoreGate>
      <ThemedPortal>{children}</ThemedPortal>
      <ToastHost />
    </StoreGate>
  );
}
