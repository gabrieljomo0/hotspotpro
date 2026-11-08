"use client";

import type { ReactNode } from "react";

import { DashboardShell } from "@/components/dashboard/layout/DashboardShell";
import { SuperAdminBar } from "@/components/dashboard/layout/SuperAdminBar";
import { StoreGate } from "@/components/dashboard/shared/StoreGate";

export default function DashboardsLayout({
  children,
}: {
  children: ReactNode;
}) {
  return (
    <StoreGate>
      <SuperAdminBar />
      <DashboardShell>{children}</DashboardShell>
    </StoreGate>
  );
}
