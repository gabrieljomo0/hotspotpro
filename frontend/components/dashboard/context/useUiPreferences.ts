"use client";

// Pure display-preference state: whether the mobile sidebar is open, the
// sidebar collapsed state, dark mode, the admin's own dashboard language,
// and which date-range period the main dashboard is showing. None of this
// is read by business logic (vouchers, agents, routers, etc) — it only
// controls how the dashboard looks and is laid out.
//
// showToast/logActivity are passed in rather than imported directly,
// since this hook is called from inside DashboardProvider after
// useNotifications() has already run.

import { useEffect, useState } from "react";

type Period = "Today" | "This Week" | "This Month" | "This Year";

export function useUiPreferences(
  showToast: (message: string) => void,
  logActivity: (category: "Settings", message: string) => void,
) {
  const [mobileSidebarOpen, setMobileSidebarOpen] = useState(false);
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [darkMode, setDarkMode] = useState(false);
  const [themeLoaded, setThemeLoaded] = useState(false);
  const [dashboardLanguage, setDashboardLanguage] = useState("English");
  const [dashboardPeriod, setDashboardPeriod] = useState<Period>("This Week");

  // Load the saved theme preference once, on first mount, from the browser.
  useEffect(() => {
    const savedTheme = localStorage.getItem("hotspotpro-theme");

    // Default to light mode regardless of system preference; dark mode is
    // strictly opt-in via the theme toggle.
    const shouldUseDark = savedTheme === "dark";

    setDarkMode(shouldUseDark);
    setThemeLoaded(true);
  }, []);

  function toggleTheme() {
    const nextDarkMode = !darkMode;
    setDarkMode(nextDarkMode);
    localStorage.setItem("hotspotpro-theme", nextDarkMode ? "dark" : "light");
  }

  function updateDashboardLanguage(language: string) {
    setDashboardLanguage(language);
    showToast(
      language === "English"
        ? "Dashboard language set to English."
        : `Dashboard language preference saved as ${language}. Full ${language} translation of every screen is still in progress — most text will remain in English for now.`,
    );
    logActivity("Settings", `Changed dashboard language preference to ${language}.`);
  }

  return {
    mobileSidebarOpen,
    setMobileSidebarOpen,
    sidebarCollapsed,
    setSidebarCollapsed,
    darkMode,
    themeLoaded,
    toggleTheme,
    dashboardLanguage,
    updateDashboardLanguage,
    dashboardPeriod,
    setDashboardPeriod,
  };
}
