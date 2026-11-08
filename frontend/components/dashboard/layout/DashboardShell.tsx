"use client";

import type { ReactNode } from "react";

import { DashboardSidebar } from "./DashboardSidebar";
import { DashboardTopbar } from "./DashboardTopbar";
import { ConfirmationDialog } from "../dialogs/ConfirmationDialog";
import { RouterTaskHost } from "../routers/RouterTaskHost";
import { ConfirmHost } from "../shared/ConfirmHost";
import { RouterEditHost } from "../routers/RouterEditHost";
import { DashboardLoader } from "../shared/DashboardLoader";
import { Toast } from "../shared/Toast";
import { CurrencyGate } from "../shared/CurrencyGate";
import { NewApplicationPopup } from "../agents/application/NewApplicationPopup";
import { useDashboard } from "../context/DashboardContext";

export function DashboardShell({ children }: { children: ReactNode }) {
  const controller = useDashboard();

  if (!controller.themeLoaded) {
    return <DashboardLoader />;
  }

  return (
    <div
      id="dashboard-root"
      className={`flex min-h-screen bg-[#f1f5f9] text-[#0f172a] transition-colors duration-300 ${
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

        <main className="p-4 md:p-6 print:p-0">{children}</main>
      </div>

      <ConfirmationDialog
        confirmAction={controller.confirmAction}
        onCancel={controller.cancelConfirmAction}
        onConfirm={controller.confirmDialogAction}
      />
      <RouterTaskHost />
      <RouterEditHost />
      <ConfirmHost />

      <Toast message={controller.toastMessage} />
      <NewApplicationPopup />
      <CurrencyGate />
    </div>
  );
}
