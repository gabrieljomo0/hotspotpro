import { useState } from "react";

import type { RevenueSettings } from "../shared/types";

const initialRevenueSettings: RevenueSettings = {
  defaultTimeframe: "Daily",
  lowRevenueAlertEnabled: false,
  lowRevenueAlertThreshold: 100,
  monthlyRevenueGoal: 5000,
  includeGiveawaysInReports: false,
};

export function useRevenueSettingsState(
  showToast: (message: string) => void,
  logActivity: (category: "Settings", message: string) => void,
) {
  const [revenueSettings, setRevenueSettings] = useState<RevenueSettings>(initialRevenueSettings);

  function updateRevenueSettings(updates: Partial<RevenueSettings>) {
    setRevenueSettings((current) => ({ ...current, ...updates }));
  }

  function saveRevenueSettings() {
    showToast("Revenue settings saved.");
    logActivity("Settings", "Updated revenue controls.");
  }

  return {
    revenueSettings,
    updateRevenueSettings,
    saveRevenueSettings,
  };
}
