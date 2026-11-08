"use client";

// Lets an installer or admin see exactly what a dispatched client will get
// — the real dashboard layout, plus a summary of what they can do on it —
// without needing to actually dispatch anyone first. Every dispatched
// client is created with the "Associate Admin" role (see
// dispatchToClient in DashboardContext), so this preview uses that same
// role's permission set.

import Link from "next/link";
import { Eye, ArrowLeft, ShieldCheck } from "lucide-react";

import { useDashboard } from "@/components/dashboard/context/DashboardContext";
import { AgentPortalBody } from "@/components/agent-portal/AgentPortalBody";
import { PERMISSION_GROUPS, PERMISSION_PRESETS } from "@/components/dashboard/agents/permissionSchema";
import type { AgentProfile } from "@/components/dashboard/shared/types";

export default function AgentPortalPreviewPage() {
  const { routers } = useDashboard();

  const previewAgent: AgentProfile = {
    id: "preview-agent",
    agentCode: "PREVIEW",
    name: "Sample Client",
    email: "client@example.com",
    username: "sample.client",
    role: "Associate Admin",
    status: "Active",
    isDefault: false,
    createdAt: "—",
    routerIp: routers[0]?.ip ?? null,
    assignedAdminId: null,
    lastLogin: "Never",
    walletBalance: 0,
    pendingCommission: 0,
    earnedCommission: 0,
    commissionRatePercent: 5,
    limits: {
      dailySalesLimit: 500,
      dailyVoucherLimit: 100,
      maxDevices: 2,
      maxConcurrentSessions: 10,
      creditLimit: 0,
      refundLimit: 20,
    },
    devices: [],
    permissions: PERMISSION_PRESETS["Associate Admin"],
    riskFlag: false,
    requiresWalletFunding: false,
    appliedViaPortal: false,
    phone: "024 000 0000",
    idFrontFileName: "ghana-card-front-preview.jpg",
    idBackFileName: "ghana-card-back-preview.jpg",
    faceCaptureFileName: "selfie-preview.jpg",
    whatsapp: "024 000 0000",
    location: "Accra, Greater Accra",
    ghanaCardNumber: "GHA-900000000-1",
    dateOfBirth: "01 Jan 1990",
    profileVerified: true,
    hasChangedDefaultPassword: true,
    password: "password123",
    maxResaleMarkupPercent: 5,
    resaleRuleAcknowledged: true,
    accessType: "Permanent",
    accessDispatchedAt: null,
    allowAdminAccess: true,
    allowWalletTopUp: false,
    dashboardMode: "custom",
    defaultPackageName: null,
  };

  const allowedCount = PERMISSION_GROUPS.flatMap((g) => g.permissions).filter(
    (p) => previewAgent.permissions[p.key] === "Allowed",
  ).length;
  const totalCount = PERMISSION_GROUPS.flatMap((g) => g.permissions).length;

  return (
    <div>
      <div className="sticky top-0 z-40 border-b bg-[#e2e8f0] px-4 py-3 text-[#0f172a] shadow-md">
        <div className="mx-auto flex max-w-[1400px] flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-2 text-sm font-bold">
            <Eye size={16} />
            PREVIEW MODE — this is exactly what a dispatched client will see. No real data, nothing you do here is saved.
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <span className="inline-flex items-center gap-1.5 rounded-full bg-white px-3 py-1.5 text-xs font-bold text-[#0f172a]">
              <ShieldCheck size={13} />
              {allowedCount}/{totalCount} permissions allowed ({previewAgent.role})
            </span>
            <Link
              href="/dashboards/installers/clients"
              className="inline-flex items-center gap-1.5 rounded-full bg-white px-3 py-1.5 text-xs font-bold text-[#0f172a] hover:bg-slate-100"
            >
              <ArrowLeft size={13} />
              Back to Installer Clients
            </Link>
          </div>
        </div>
      </div>

      <AgentPortalBody agent={previewAgent} />
    </div>
  );
}
