"use client";

import { useEffect, useState, type ReactNode } from "react";

import { DashboardSidebar } from "./DashboardSidebar";
import { DashboardTopbar } from "./DashboardTopbar";
import { ConfirmationDialog } from "../dialogs/ConfirmationDialog";
import { RouterTaskHost } from "../routers/RouterTaskHost";
import { ConfirmHost } from "../shared/ConfirmHost";
import { RouterEditHost } from "../routers/RouterEditHost";
import { InstallAppButton } from "@/components/InstallAppButton";
import { ReprovisionScriptHost } from "../routers/ReprovisionScriptHost";
import { DashboardLoader } from "../shared/DashboardLoader";
import { Toast } from "../shared/Toast";
import { CurrencyGate } from "../shared/CurrencyGate";
import { NewApplicationPopup } from "../agents/application/NewApplicationPopup";
import { useDashboard } from "../context/DashboardContext";

function WelcomeNote() {
  const [text, setText] = useState<string | null>(null);
  useEffect(() => {
    try {
      setText(window.sessionStorage.getItem("hotspotpro:welcome"));
    } catch {
      setText(null);
    }
  }, []);
  if (!text) return null;
  return (
    <p data-testid="welcome-email-note" className="mb-4 rounded-xl border border-[#1a1a1a] bg-[#1a1a1a] px-4 py-3 text-sm leading-6 text-white print:hidden">
      {text}
      <button
        type="button"
        className="ml-3 underline"
        onClick={() => {
          setText(null);
          try { window.sessionStorage.removeItem("hotspotpro:welcome"); } catch { /* already gone */ }
        }}
      >
        Dismiss
      </button>
    </p>
  );
}

export function DashboardShell({ children }: { children: ReactNode }) {
  const controller = useDashboard();

  if (!controller.themeLoaded) {
    return <DashboardLoader />;
  }

  return (
    <div
      id="dashboard-root"
      className={`flex min-h-screen bg-[#f4f4f4] text-[#1a1a1a] transition-colors duration-300 ${
        controller.darkMode ? "dark" : ""
      }`}
    >
      <div className="print:hidden">
        <DashboardSidebar
          mobileOpen={controller.mobileSidebarOpen}
          collapsed={controller.sidebarCollapsed}
          darkMode={controller.darkMode}
          onCloseMobile={() => controller.setMobileSidebarOpen(false)}
          onToggleCollapse={() =>
            controller.setSidebarCollapsed((current) => !current)
          }
          onToggleTheme={controller.toggleTheme}
        />
      </div>

      <div className="h-screen min-w-0 flex-1 overflow-y-auto print:h-auto print:overflow-visible">
        <div className="print:hidden">
          <DashboardTopbar
            onOpenMobile={() => controller.setMobileSidebarOpen(true)}
          />
        </div>

        <main className="p-4 md:p-6 print:p-0">
          <WelcomeNote />
          {children}
        </main>
      </div>

      <ConfirmationDialog
        confirmAction={controller.confirmAction}
        onCancel={controller.cancelConfirmAction}
        onConfirm={controller.confirmDialogAction}
      />
      <RouterTaskHost />
      <RouterEditHost />
      <ReprovisionScriptHost />
      <ConfirmHost />

      <Toast message={controller.toastMessage} />
      <NewApplicationPopup />
      <CurrencyGate />
      {/* Install stays at the bottom of the site only; users can close it. */}
      <InstallAppButton />
    </div>
  );
}
