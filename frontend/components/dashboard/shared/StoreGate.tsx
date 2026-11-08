"use client";

// Holds a screen back until saved data (from earlier visits or other tabs)
// has been loaded, so an agent's dashboard opened in a fresh tab never
// flashes "agent not found" for someone who exists in the saved data.

import type { ReactNode } from "react";

import { useDashboard } from "../context/DashboardContext";

export function StoreGate({ children }: { children: ReactNode }) {
  const { storeReady } = useDashboard();

  if (!storeReady) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-[#f1f5f9] text-sm text-[#64748b]">
        Loading your dashboard…
      </div>
    );
  }

  return <>{children}</>;
}
