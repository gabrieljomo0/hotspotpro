"use client";

// Everything about agents/resellers: the agent list, approval requests,
// message templates + log, commission settings, and every action that can
// be taken on an agent (create, approve, suspend, adjust wallet, dispatch
// access, permissions, limits, and so on).
//
// showToast/logActivity are passed in (from useNotifications). packages
// and routers are also passed in since a couple of functions need to read
// them (checking a package's price, or a router's name) without this hook
// owning that state itself.

import { sym } from "@/components/dashboard/shared/currency";
import { useState } from "react";
import { normalizeAgentSettings, settingsOf } from "../agents/agentSettings";
import {
  emailProblem,
  freeUsername,
  generateTemporaryPassword,
  normalizeUsername,
  usernameProblem,
  validateNewAgent,
  type NewAgentErrors,
  type NewAgentInput,
} from "../agents/agentSignup";
import type { AgentSettings } from "../shared/types";
import { buildAgentEmail, type AgentEmailKind } from "../agents/agentEmails";
import { buildSampleApplications, isSampleId } from "../agents/application/sampleApplications";
import { usePersistedState } from "./usePersistedState";

import { defaultPermissionsForRole, PERMISSION_PRESETS, BASE_AGENT_PERMISSIONS } from "../agents/permissionSchema";
import { DEFAULT_AGENT_ID } from "./utils";
import { isAgentProfileComplete } from "../agents/agentPackages";
import type {
  AgentProfile,
  AgentRole,
  AgentStatus,
  AgentPermissions,
  AgentLimits,
  AgentDevice,
  AgentMessageTemplates,
  AgentEmail,
  AgentMessageTrigger,
  AgentMessageLogEntry,
  ApprovalRequest,
  ApprovalType,
  CommissionSettings,
  Package,
} from "../shared/types";
import { routers as initialRoutersData, type RouterInfo } from "../data/dashboard-data";

const initialAgents: AgentProfile[] = [
  {
    id: DEFAULT_AGENT_ID,
    agentCode: "AGT-0001",
    name: "Admin User",
    email: "admin@hotspotpro.com",
    username: "admin",
    role: "Owner",
    status: "Active",
    isDefault: true,
    createdAt: "01 Jan 2026",
    routerIp: initialRoutersData[0]?.ip ?? null,
    assignedAdminId: null,
    lastLogin: "Just now",
    walletBalance: 0,
    pendingCommission: 0,
    earnedCommission: 0,
    commissionRatePercent: 0,
    limits: {
      dailySalesLimit: 0,
      dailyVoucherLimit: 0,
      maxDevices: 10,
      maxConcurrentSessions: 100,
      creditLimit: 0,
      refundLimit: 0,
    },
    devices: [
      {
        id: "dev-admin-1",
        deviceName: "Owner's MacBook Pro",
        browser: "Chrome on macOS",
        lastActive: "Just now",
        status: "Active",
      },
    ],
    permissions: defaultPermissionsForRole("Owner"),
    riskFlag: false,
    requiresWalletFunding: false,
    appliedViaPortal: false,
    phone: null,
    idFrontFileName: "ghana-card-front-owner.jpg",
    idBackFileName: "ghana-card-back-owner.jpg",
    faceCaptureFileName: "selfie-owner.jpg",
    whatsapp: "020 500 1000",
    location: "Accra, Greater Accra",
    ghanaCardNumber: "GHA-000111222-3",
    dateOfBirth: "05 Jan 1988",
    profileVerified: true,
    hasChangedDefaultPassword: true,
    password: "password123",
    maxResaleMarkupPercent: 5,
    resaleRuleAcknowledged: true,
    accessType: "Permanent",
    accessDispatchedAt: "01 Jan 2026",
    allowAdminAccess: true,
    allowWalletTopUp: false,
    dashboardMode: "custom",
    defaultPackageName: null,
  },
  {
    id: "agent-grace",
    agentCode: "AGT-0002",
    name: "Grace Owusu",
    email: "grace@hotspotpro.com",
    username: "grace.owusu",
    role: "Associate Admin",
    status: "Active",
    isDefault: false,
    createdAt: "15 Mar 2026",
    routerIp: initialRoutersData[1]?.ip ?? null,
    assignedAdminId: null,
    lastLogin: "2 hours ago",
    walletBalance: 340,
    pendingCommission: 85,
    earnedCommission: 1240,
    commissionRatePercent: 10,
    limits: {
      dailySalesLimit: 800,
      dailyVoucherLimit: 150,
      maxDevices: 3,
      maxConcurrentSessions: 20,
      creditLimit: 150,
      refundLimit: 30,
    },
    devices: [
      {
        id: "dev-grace-1",
        deviceName: "Grace's iPhone 14",
        browser: "Safari on iOS",
        lastActive: "2 hours ago",
        status: "Active",
      },
    ],
    permissions: defaultPermissionsForRole("Associate Admin"),
    riskFlag: false,
    requiresWalletFunding: true,
    appliedViaPortal: false,
    phone: "055 812 3344",
    idFrontFileName: "ghana-card-front-grace.jpg",
    idBackFileName: "ghana-card-back-grace.jpg",
    faceCaptureFileName: "selfie-grace.jpg",
    whatsapp: "055 812 3344",
    location: "Accra, Greater Accra",
    ghanaCardNumber: "GHA-100222333-4",
    dateOfBirth: "12 Mar 1994",
    profileVerified: true,
    hasChangedDefaultPassword: true,
    password: "password123",
    maxResaleMarkupPercent: 5,
    resaleRuleAcknowledged: true,
    accessType: "Permanent",
    accessDispatchedAt: "01 Jan 2026",
    allowAdminAccess: true,
    allowWalletTopUp: false,
    dashboardMode: "custom",
    defaultPackageName: null,
  },
  {
    id: "agent-kwame",
    agentCode: "AGT-0003",
    name: "Kwame Asante",
    email: "kwame@hotspotpro.com",
    username: "kwame.asante",
    role: "Field Agent",
    status: "Active",
    isDefault: false,
    createdAt: "02 Jun 2026",
    routerIp: initialRoutersData[2]?.ip ?? null,
    assignedAdminId: "agent-grace",
    lastLogin: "18 minutes ago",
    walletBalance: 62,
    pendingCommission: 22,
    earnedCommission: 410,
    commissionRatePercent: 7,
    limits: {
      dailySalesLimit: 500,
      dailyVoucherLimit: 100,
      maxDevices: 2,
      maxConcurrentSessions: 10,
      creditLimit: 100,
      refundLimit: 20,
    },
    devices: [
      {
        id: "dev-kwame-1",
        deviceName: "Kwame's Android Phone",
        browser: "Chrome on Android",
        lastActive: "18 minutes ago",
        status: "Active",
      },
    ],
    permissions: defaultPermissionsForRole("Field Agent"),
    riskFlag: false,
    requiresWalletFunding: true,
    appliedViaPortal: false,
    phone: "020 447 8821",
    idFrontFileName: "ghana-card-front-kwame.jpg",
    idBackFileName: "ghana-card-back-kwame.jpg",
    faceCaptureFileName: "selfie-kwame.jpg",
    whatsapp: "020 447 8821",
    location: "Accra, Greater Accra",
    ghanaCardNumber: "GHA-200333444-5",
    dateOfBirth: "23 Jul 1997",
    profileVerified: true,
    hasChangedDefaultPassword: true,
    password: "password123",
    maxResaleMarkupPercent: 5,
    resaleRuleAcknowledged: true,
    accessType: "Permanent",
    accessDispatchedAt: "01 Jan 2026",
    allowAdminAccess: true,
    allowWalletTopUp: false,
    dashboardMode: "custom",
    defaultPackageName: null,
  },
  {
    id: "agent-yaw",
    agentCode: "AGT-0004",
    name: "Yaw Boateng",
    email: "yaw.boateng@hotspotpro.com",
    username: "yaw.boateng",
    role: "Associate Admin",
    status: "Active",
    isDefault: false,
    createdAt: "20 Feb 2026",
    routerIp: initialRoutersData[5]?.ip ?? null,
    assignedAdminId: null,
    lastLogin: "40 minutes ago",
    walletBalance: 510,
    pendingCommission: 120,
    earnedCommission: 2180,
    commissionRatePercent: 10,
    limits: {
      dailySalesLimit: 900,
      dailyVoucherLimit: 180,
      maxDevices: 3,
      maxConcurrentSessions: 20,
      creditLimit: 200,
      refundLimit: 40,
    },
    devices: [
      {
        id: "dev-yaw-1",
        deviceName: "Yaw's Samsung S23",
        browser: "Chrome on Android",
        lastActive: "40 minutes ago",
        status: "Active",
      },
    ],
    permissions: defaultPermissionsForRole("Associate Admin"),
    riskFlag: false,
    requiresWalletFunding: true,
    appliedViaPortal: false,
    phone: "024 662 1190",
    idFrontFileName: "ghana-card-front-yaw.jpg",
    idBackFileName: "ghana-card-back-yaw.jpg",
    faceCaptureFileName: "selfie-yaw.jpg",
    whatsapp: "024 662 1190",
    location: "Kumasi, Ashanti",
    ghanaCardNumber: "GHA-300444555-6",
    dateOfBirth: "09 Sep 1992",
    profileVerified: true,
    hasChangedDefaultPassword: true,
    password: "password123",
    maxResaleMarkupPercent: 5,
    resaleRuleAcknowledged: true,
    accessType: "Permanent",
    accessDispatchedAt: "20 Feb 2026",
    allowAdminAccess: true,
    allowWalletTopUp: true,
    dashboardMode: "custom",
    defaultPackageName: null,
  },
  {
    id: "agent-adjoa",
    agentCode: "AGT-0005",
    name: "Adjoa Mensah",
    email: "adjoa.mensah@hotspotpro.com",
    username: "adjoa.mensah",
    role: "Field Agent",
    status: "Active",
    isDefault: false,
    createdAt: "22 Feb 2026",
    routerIp: initialRoutersData[6]?.ip ?? null,
    assignedAdminId: "agent-yaw",
    lastLogin: "3 hours ago",
    walletBalance: 45,
    pendingCommission: 18,
    earnedCommission: 305,
    commissionRatePercent: 7,
    limits: {
      dailySalesLimit: 500,
      dailyVoucherLimit: 100,
      maxDevices: 2,
      maxConcurrentSessions: 10,
      creditLimit: 100,
      refundLimit: 20,
    },
    devices: [
      {
        id: "dev-adjoa-1",
        deviceName: "Adjoa's Infinix Note",
        browser: "Chrome on Android",
        lastActive: "3 hours ago",
        status: "Active",
      },
    ],
    permissions: defaultPermissionsForRole("Field Agent"),
    riskFlag: false,
    requiresWalletFunding: true,
    appliedViaPortal: true,
    phone: "054 219 7765",
    idFrontFileName: "ghana-card-front-adjoa.jpg",
    idBackFileName: "ghana-card-back-adjoa.jpg",
    faceCaptureFileName: "selfie-adjoa.jpg",
    whatsapp: "054 219 7765",
    location: "Kumasi, Ashanti",
    ghanaCardNumber: "GHA-400555666-7",
    dateOfBirth: "17 Nov 1998",
    profileVerified: true,
    hasChangedDefaultPassword: true,
    password: "password123",
    maxResaleMarkupPercent: 5,
    resaleRuleAcknowledged: true,
    accessType: "Permanent",
    accessDispatchedAt: "22 Feb 2026",
    allowAdminAccess: true,
    allowWalletTopUp: false,
    dashboardMode: "voucherCreator",
    defaultPackageName: null,
  },
  {
    id: "agent-esi",
    agentCode: "AGT-0006",
    name: "Esi Arthur",
    email: "esi.arthur@hotspotpro.com",
    username: "esi.arthur",
    role: "Manager",
    status: "Active",
    isDefault: false,
    createdAt: "07 Apr 2026",
    routerIp: initialRoutersData[7]?.ip ?? null,
    assignedAdminId: null,
    lastLogin: "1 hour ago",
    walletBalance: 275,
    pendingCommission: 60,
    earnedCommission: 980,
    commissionRatePercent: 10,
    limits: {
      dailySalesLimit: 800,
      dailyVoucherLimit: 150,
      maxDevices: 3,
      maxConcurrentSessions: 20,
      creditLimit: 150,
      refundLimit: 30,
    },
    devices: [
      {
        id: "dev-esi-1",
        deviceName: "Esi's iPhone 13",
        browser: "Safari on iOS",
        lastActive: "1 hour ago",
        status: "Active",
      },
    ],
    permissions: defaultPermissionsForRole("Manager"),
    riskFlag: false,
    requiresWalletFunding: true,
    appliedViaPortal: false,
    phone: "050 338 4471",
    idFrontFileName: "ghana-card-front-esi.jpg",
    idBackFileName: "ghana-card-back-esi.jpg",
    faceCaptureFileName: "selfie-esi.jpg",
    whatsapp: "050 338 4471",
    location: "Takoradi, Western",
    ghanaCardNumber: "GHA-500666777-8",
    dateOfBirth: "02 Feb 1990",
    profileVerified: true,
    hasChangedDefaultPassword: true,
    password: "password123",
    maxResaleMarkupPercent: 5,
    resaleRuleAcknowledged: true,
    accessType: "Permanent",
    accessDispatchedAt: "07 Apr 2026",
    allowAdminAccess: true,
    allowWalletTopUp: true,
    dashboardMode: "custom",
    defaultPackageName: null,
  },
  {
    id: "agent-nana",
    agentCode: "AGT-0007",
    name: "Nana Prempeh",
    email: "nana.prempeh@hotspotpro.com",
    username: "nana.prempeh",
    role: "Field Agent",
    status: "Active",
    isDefault: false,
    createdAt: "09 Apr 2026",
    routerIp: initialRoutersData[8]?.ip ?? null,
    assignedAdminId: "agent-esi",
    lastLogin: "25 minutes ago",
    walletBalance: 88,
    pendingCommission: 30,
    earnedCommission: 520,
    commissionRatePercent: 7,
    limits: {
      dailySalesLimit: 500,
      dailyVoucherLimit: 100,
      maxDevices: 2,
      maxConcurrentSessions: 10,
      creditLimit: 100,
      refundLimit: 20,
    },
    devices: [
      {
        id: "dev-nana-1",
        deviceName: "Nana's Tecno Camon",
        browser: "Chrome on Android",
        lastActive: "25 minutes ago",
        status: "Active",
      },
    ],
    permissions: defaultPermissionsForRole("Field Agent"),
    riskFlag: false,
    requiresWalletFunding: true,
    appliedViaPortal: true,
    phone: "027 905 6612",
    idFrontFileName: "ghana-card-front-nana.jpg",
    idBackFileName: "ghana-card-back-nana.jpg",
    faceCaptureFileName: "selfie-nana.jpg",
    whatsapp: "027 905 6612",
    location: "Takoradi, Western",
    ghanaCardNumber: "GHA-600777888-9",
    dateOfBirth: "30 Apr 1996",
    profileVerified: true,
    hasChangedDefaultPassword: true,
    password: "password123",
    maxResaleMarkupPercent: 5,
    resaleRuleAcknowledged: true,
    accessType: "Permanent",
    accessDispatchedAt: "09 Apr 2026",
    allowAdminAccess: true,
    allowWalletTopUp: false,
    dashboardMode: "custom",
    defaultPackageName: null,
  },
  {
    id: "agent-linda",
    agentCode: "AGT-0008",
    name: "Linda Owusu-Ansah",
    email: "linda.oa@hotspotpro.com",
    username: "linda.oa",
    role: "Sub-Agent",
    status: "Active",
    isDefault: false,
    createdAt: "24 Jun 2026",
    routerIp: initialRoutersData[9]?.ip ?? null,
    assignedAdminId: null,
    lastLogin: "10 minutes ago",
    walletBalance: 130,
    pendingCommission: 40,
    earnedCommission: 675,
    commissionRatePercent: 8,
    limits: {
      dailySalesLimit: 600,
      dailyVoucherLimit: 120,
      maxDevices: 2,
      maxConcurrentSessions: 12,
      creditLimit: 120,
      refundLimit: 25,
    },
    devices: [
      {
        id: "dev-linda-1",
        deviceName: "Linda's iPhone 12",
        browser: "Safari on iOS",
        lastActive: "10 minutes ago",
        status: "Active",
      },
    ],
    permissions: defaultPermissionsForRole("Sub-Agent"),
    riskFlag: false,
    requiresWalletFunding: true,
    appliedViaPortal: false,
    phone: "059 774 3308",
    idFrontFileName: "ghana-card-front-linda.jpg",
    idBackFileName: "ghana-card-back-linda.jpg",
    faceCaptureFileName: "selfie-linda.jpg",
    whatsapp: "059 774 3308",
    location: "East Legon, Greater Accra",
    ghanaCardNumber: "GHA-700888999-0",
    dateOfBirth: "14 Jun 1995",
    profileVerified: true,
    hasChangedDefaultPassword: true,
    password: "password123",
    maxResaleMarkupPercent: 5,
    resaleRuleAcknowledged: true,
    accessType: "Permanent",
    accessDispatchedAt: "24 Jun 2026",
    allowAdminAccess: true,
    allowWalletTopUp: false,
    dashboardMode: "voucherCreator",
    defaultPackageName: null,
  },
];

const initialApprovalRequests: ApprovalRequest[] = [
  {
    id: "appr-1",
    type: "Credit Request",
    agentId: "agent-kwame",
    agentName: "Kwame Asante",
    summary: "Requesting a temporary credit limit increase to GH₵ 200.",
    status: "Pending",
    createdAt: "08 Sep 2026, 09:12",
    decidedAt: null,
    decidedBy: null,
    reason: null,
  },
  {
    id: "appr-2",
    type: "Refund Above Limit",
    agentId: "agent-kwame",
    agentName: "Kwame Asante",
    summary: "Refund of GH₵ 45.00 for a duplicate voucher purchase — above his GH₵ 20 auto-approval limit.",
    status: "Pending",
    createdAt: "09 Sep 2026, 14:40",
    decidedAt: null,
    decidedBy: null,
    reason: null,
  },
  {
    id: "appr-3",
    type: "Voucher Allocation",
    agentId: "agent-grace",
    agentName: "Grace Owusu",
    summary: "Requesting an allocation of 200 vouchers for the Weekly Plan.",
    status: "Approved",
    createdAt: "05 Sep 2026, 11:00",
    decidedAt: "05 Sep 2026, 15:20",
    decidedBy: "Admin User",
    reason: "Stock available, approved for weekend promotion.",
  },
];

const initialCommissionSettings: CommissionSettings = {
  enabled: false,
  ratePercent: 10,
};



export function useAgentState(
  showToast: (message: string) => void,
  logActivity: (category: "Agent" | "Settings", message: string) => void,
  packages: Package[],
  routers: RouterInfo[],
  getPermissionsForRole?: (role: AgentRole) => AgentPermissions,
) {

  const [commissionSettings, setCommissionSettings] =
    usePersistedState<CommissionSettings>("commissionSettings", initialCommissionSettings);

  // The policy ceiling on any individual agent's commission rate below —
  // e.g. admin sets this to 5, meaning no agent's rate can be set above
  // 5% no matter what, keeping what agents effectively earn on a deposit
  // (and by extension what they should be charging customers) in check.
  const [maxAgentCommissionPercent, setMaxAgentCommissionPercent] = usePersistedState<number>(
    "maxAgentCommissionPercent",
    5,
  );

  function updateMaxAgentCommissionPercent(percent: number) {
    const clamped = Math.max(0, Math.min(100, percent));
    setMaxAgentCommissionPercent(clamped);
    showToast(`Maximum agent commission rate set to ${clamped}%.`);
    logActivity("Settings", `Set the maximum allowed agent commission rate to ${clamped}%.`);
  }

  // Admin sets what ONE agent's rate is, capped at the ceiling above —
  // can't accidentally (or deliberately) hand out more than policy allows.
  function setAgentCommissionRate(id: string, ratePercent: number) {
    const agent = findAgent(id);
    if (!agent) return;
    if (ratePercent > maxAgentCommissionPercent) {
      showToast(
        `${ratePercent}% is above the platform maximum of ${maxAgentCommissionPercent}%. Raise the maximum first if you really need this.`,
      );
      return;
    }
    const clamped = Math.max(0, ratePercent);
    setAgents((current) =>
      current.map((a) => (a.id === id ? { ...a, commissionRatePercent: clamped } : a)),
    );
    showToast(`${agent.name}'s commission rate set to ${clamped}%.`);
    logActivity("Agent", `Set commission rate for agent "${agent.name}" to ${clamped}%.`);
  }

  // The most this agent may charge a customer above a package's base
  // price when reselling it. null clears the cap entirely -- nothing is
  // enforced until admin sets one.
  function setAgentMaxResaleMarkup(id: string, percent: number | null) {
    const agent = findAgent(id);
    if (!agent) return;
    const clamped = percent === null ? null : Math.max(0, percent);
    setAgents((current) =>
      current.map((a) => (a.id === id ? { ...a, maxResaleMarkupPercent: clamped } : a)),
    );
    showToast(
      clamped === null
        ? `Resale markup cap removed for ${agent.name} -- no limit enforced.`
        : `${agent.name} can now charge at most ${clamped}% above a package's base price.`,
    );
    logActivity(
      "Agent",
      clamped === null
        ? `Removed the resale markup cap for agent "${agent.name}".`
        : `Set agent "${agent.name}"'s resale markup cap to ${clamped}%.`,
    );
  }

  function acknowledgeResaleRule(id: string) {
    setAgents((current) =>
      current.map((a) => (a.id === id ? { ...a, resaleRuleAcknowledged: true } : a)),
    );
  }

  const [agents, setAgents] = usePersistedState<AgentProfile[]>("agents", initialAgents);
  // Which applications the admin has already been told about (by the
  // dashboard pop-up) or has looked at on the Applications tab — so the
  // pop-up only appears for ones they haven't seen. Saved, so it survives
  // a reload and is shared between tabs.
  const [notifiedApplicationIds, setNotifiedApplicationIds] = usePersistedState<string[]>(
    "notifiedApplications",
    [],
  );

  function markApplicationsNotified(ids: string[]) {
    if (ids.length === 0) return;
    setNotifiedApplicationIds((current) => {
      const next = new Set(current);
      ids.forEach((id) => next.add(id));
      return next.size === current.length ? current : Array.from(next).slice(-500);
    });
  }

  const [approvalRequests, setApprovalRequests] = usePersistedState<ApprovalRequest[]>("approvalRequests", 
    initialApprovalRequests,
  );
  const [currentAgentId, setCurrentAgentId] = useState(DEFAULT_AGENT_ID);

  const [messageTemplates, setMessageTemplates] = useState<AgentMessageTemplates>({
    Applied: "Hi {name}, thanks for applying to become an agent with HotspotPro! We've received your application and will review it shortly.",
    Approved: "Hi {name}, great news — your agent application has been approved! You can now log in and start selling vouchers.",
    Suspended: "Hi {name}, your agent account has been temporarily suspended. Please contact support for more information.",
  });
  const [agentMessageLog, setAgentMessageLog] = useState<AgentMessageLogEntry[]>([]);

  function toggleWalletFundingRequirement(agentId: string) {
    setAgents((current) =>
      current.map((agent) =>
        agent.id === agentId
          ? { ...agent, requiresWalletFunding: !agent.requiresWalletFunding }
          : agent,
      ),
    );
    const agent = findAgent(agentId);
    const next = !agent?.requiresWalletFunding;
    showToast(
      `${agent?.name ?? "Agent"} ${next ? "must now load their wallet" : "can now generate vouchers freely"} before creating vouchers.`,
    );
    logActivity(
      "Agent",
      `${next ? "Enabled" : "Disabled"} wallet-funding requirement for ${agent?.name ?? agentId}.`,
    );
  }

  function getMaxAffordableVouchers(agentId: string, packageName: string) {
    const agent = findAgent(agentId);
    if (!agent || !agent.requiresWalletFunding) return null;

    const pkg = packages.find((p) => p.name === packageName);
    const price = pkg ? Number(pkg.price.replace(/[^0-9.]/g, "")) || 0 : 0;
    if (price <= 0) return null;

    return Math.floor(agent.walletBalance / price);
  }

  function inviteManagerToSite(requestingAgentId: string, name: string, email: string) {
    const requester = agents.find((a) => a.id === requestingAgentId);
    if (!requester) return null;

    if (requester.permissions["agentManagement.inviteManager"] !== "Allowed") {
      showToast("Your admin hasn't enabled manager invites for your account yet.");
      return null;
    }

    const newManager = addAgent(name, email, "Manager", requester.routerIp);
    setAgents((current) =>
      current.map((a) => (a.id === newManager.id ? { ...a, assignedAdminId: requester.id } : a)),
    );
    showToast(`Invited ${name} as a manager — pending admin approval.`);
    logActivity("Agent", `${requester.name} invited ${name} as a manager, pending approval.`);
    return newManager;
  }

  function findAgent(id: string) {
    return agents.find((agent) => agent.id === id);
  }

  // The ID photos and selfie from a captive-portal application. Kept under their
  // own saved key — pictures are large, and if the browser ever runs out of
  // room they must not take the agents list down with them.
  const [applicationFiles, setApplicationFiles] = usePersistedState<
    Record<string, { idFront?: string; idBack?: string; face?: string }>
  >("agentApplicationFiles", {});

  // Emails written for agents, waiting for the admin to send them from Gmail.
  const [agentEmails, setAgentEmails] = usePersistedState<AgentEmail[]>("agentEmails", []);

  function queueAgentEmail(agent: AgentProfile, kind: AgentEmailKind, password: string | null) {
    const built = buildAgentEmail({
      kind,
      name: agent.name,
      email: agent.email,
      username: agent.username,
      password,
      agentId: agent.id,
      origin: typeof window !== "undefined" ? window.location.origin : "",
    });
    const entry: AgentEmail = {
      id: `email-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
      agentId: agent.id,
      agentName: agent.name,
      kind,
      ...built,
      createdAt: new Date().toLocaleString("en-GB", {
        day: "2-digit",
        month: "short",
        year: "numeric",
        hour: "2-digit",
        minute: "2-digit",
      }),
      openedAt: null,
    };
    setAgentEmails((current) => [entry, ...current]);
    logActivity("Agent", `Prepared a "${kind === "Applied" ? "application received" : "approved"}" email for ${agent.name} (${agent.email}).`);
  }

  function markAgentEmailOpened(id: string) {
    const openedAt = new Date().toLocaleString("en-GB", {
      day: "2-digit",
      month: "short",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
    setAgentEmails((current) => current.map((email) => (email.id === id ? { ...email, openedAt } : email)));
  }

  // Example applications so the Agent Applications tab has something to show.
  function loadSampleApplications(): number {
    const template = agents.find((agent) => !agent.isDefault) ?? agents[0];
    if (!template) return 0;
    const bundle = buildSampleApplications(template, agents);
    if (bundle.agents.length === 0) return 0;
    setAgents((current) => [...current, ...bundle.agents]);
    setApprovalRequests((current) => [...bundle.requests, ...current]);
    setApplicationFiles((current) => ({ ...current, ...bundle.files }));
    // They're examples, not news — no pop-up for them.
    setNotifiedApplicationIds((current) => [...new Set([...current, ...bundle.requests.map((r) => r.id)])]);
    return bundle.agents.length;
  }

  function removeSampleApplications() {
    setAgents((current) => current.filter((agent) => !isSampleId(agent.id)));
    setApprovalRequests((current) => current.filter((request) => !isSampleId(request.id)));
    setApplicationFiles((current) =>
      Object.fromEntries(Object.entries(current).filter(([id]) => !isSampleId(id))),
    );
    setAgentEmails((current) => current.filter((email) => !isSampleId(email.agentId)));
    showToast("Sample applications removed.");
  }

  function addAgent(
    name: string,
    email: string,
    role: AgentRole,
    routerIp: string | null = null,
    extra?: {
      phone?: string;
      whatsapp?: string;
      location?: string;
      password?: string;
      appliedViaPortal?: boolean;
      idFrontFileName?: string;
      idBackFileName?: string;
      faceCaptureFileName?: string;
      // What they chose on the form (used if free), and compressed pictures.
      username?: string;
      idFrontImage?: string;
      idBackImage?: string;
      faceCaptureImage?: string;
    },
  ) {
    const nextCode = `AGT-${String(agents.length + 1).padStart(4, "0")}`;

    const newAgent: AgentProfile = {
      id: `agent-${Date.now()}`,
      agentCode: nextCode,
      name,
      email,
      // The username the applicant chose; if it's missing or taken, one made
      // from their email instead.
      username:
        extra?.username && !usernameProblem(extra.username, agents)
          ? normalizeUsername(extra.username)
          : freeUsername(email.split("@")[0], agents),
      role,
      status: "Pending",
      isDefault: false,
      createdAt: new Date().toLocaleDateString("en-GB", {
        day: "2-digit",
        month: "short",
        year: "numeric",
      }),
      routerIp,
      assignedAdminId: null,
      lastLogin: "Never",
      walletBalance: 0,
      pendingCommission: 0,
      earnedCommission: 0,
      // New agents start at 5%, never above the platform maximum; you can
      // change it for them any time from their Commission tab.
      commissionRatePercent: Math.min(5, maxAgentCommissionPercent),
      limits: {
        dailySalesLimit: 500,
        dailyVoucherLimit: 100,
        maxDevices: 2,
        maxConcurrentSessions: 10,
        creditLimit: 0,
        refundLimit: 20,
      },
      devices: [],
      permissions: (getPermissionsForRole ?? defaultPermissionsForRole)(role),
      riskFlag: false,
      requiresWalletFunding: true,
      appliedViaPortal: extra?.appliedViaPortal ?? false,
      phone: extra?.phone ?? null,
      idFrontFileName: extra?.idFrontFileName ?? null,
      idBackFileName: extra?.idBackFileName ?? null,
      faceCaptureFileName: extra?.faceCaptureFileName ?? null,
      whatsapp: extra?.whatsapp ?? null,
      location: extra?.location ?? null,
      ghanaCardNumber: null,
      dateOfBirth: null,
      profileVerified: false,
      hasChangedDefaultPassword: false,
      password: extra?.password ?? null,
      maxResaleMarkupPercent: null,
      resaleRuleAcknowledged: false,
      accessType: null,
      accessDispatchedAt: null,
      allowAdminAccess: true,
      allowWalletTopUp: false,
      dashboardMode: "custom",
      defaultPackageName: null,
    };

    setAgents((current) => [...current, newAgent]);
    if (extra?.idFrontImage || extra?.idBackImage || extra?.faceCaptureImage) {
      setApplicationFiles((current) => ({
        ...current,
        [newAgent.id]: { idFront: extra.idFrontImage, idBack: extra.idBackImage, face: extra.faceCaptureImage },
      }));
    }
    submitApprovalRequest(
      "New Agent",
      newAgent.id,
      newAgent.name,
      `New agent "${name}" (${role}) awaiting approval before activation.`,
    );
    sendAgentMessage(newAgent, "Applied");
    // A portal applicant is congratulated and given their sign-in details.
    if (extra?.appliedViaPortal) queueAgentEmail(newAgent, "Applied", extra.password ?? null);
    showToast(`Agent "${name}" added — pending approval.`);
    logActivity("Agent", `Added agent "${name}" (${role}).`);
    return newAgent;
  }

  // You adding an agent yourself: no application to approve — they're active
  // straight away with a temporary password you hand to them.
  function createAgentByAdmin(
    input: NewAgentInput,
  ): { ok: true; agent: AgentProfile; password: string } | { ok: false; errors: NewAgentErrors } {
    const errors = validateNewAgent(input, agents, maxAgentCommissionPercent);
    if (Object.keys(errors).length > 0) return { ok: false, errors };

    const password = input.password.trim() || generateTemporaryPassword();
    const created = new Date().toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric" });
    const nextCode = `AGT-${String(agents.length + 1).padStart(4, "0")}`;

    const newAgent: AgentProfile = {
      id: `agent-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
      agentCode: nextCode,
      name: input.name.trim(),
      email: input.email.trim(),
      username: normalizeUsername(input.username),
      role: input.role,
      status: "Active",
      isDefault: false,
      createdAt: created,
      routerIp: input.routerIp,
      assignedAdminId: input.assignedAdminId ?? null,
      lastLogin: "Never",
      walletBalance: 0,
      pendingCommission: 0,
      earnedCommission: 0,
      commissionRatePercent: Number(input.commissionPercent),
      limits: {
        dailySalesLimit: 500,
        dailyVoucherLimit: 100,
        maxDevices: 2,
        maxConcurrentSessions: 10,
        creditLimit: 0,
        refundLimit: 20,
      },
      devices: [],
      permissions: (getPermissionsForRole ?? defaultPermissionsForRole)(input.role),
      riskFlag: false,
      requiresWalletFunding: true,
      appliedViaPortal: false,
      phone: input.phone.trim(),
      idFrontFileName: null,
      idBackFileName: null,
      faceCaptureFileName: null,
      whatsapp: input.whatsapp.trim() || null,
      location: input.location.trim() || null,
      ghanaCardNumber: null,
      dateOfBirth: null,
      profileVerified: false,
      hasChangedDefaultPassword: false,
      password,
      maxResaleMarkupPercent: null,
      resaleRuleAcknowledged: false,
      accessType: null,
      accessDispatchedAt: null,
      allowAdminAccess: true,
      allowWalletTopUp: false,
      dashboardMode: "custom",
      defaultPackageName: null,
    };

    setAgents((current) => [...current, newAgent]);
    sendAgentMessage(newAgent, "Approved");
    queueAgentEmail(newAgent, "Approved", password);
    showToast(`Agent "${newAgent.name}" added.`);
    logActivity("Agent", `Added agent "${newAgent.name}" (${newAgent.role}).`);
    return { ok: true, agent: newAgent, password };
  }

  function deleteAgent(id: string) {
    const agent = findAgent(id);

    if (agent?.isDefault) {
      showToast("The default owner profile cannot be deleted.");
      return;
    }

    setAgents((current) => current.filter((a) => a.id !== id));
    setApplicationFiles((current) => {
      if (!(id in current)) return current;
      const { [id]: _removed, ...rest } = current;
      void _removed;
      return rest;
    });

    if (currentAgentId === id) {
      setCurrentAgentId(DEFAULT_AGENT_ID);
    }

    showToast("Agent removed.");
    logActivity("Agent", `Removed agent "${agent?.name ?? id}".`);
  }

  // Same as switching profile, but silent — used by an agent's own
  // dashboard to make everything in that tab act as that agent (created
  // by, wallet, permissions) without a "switched profile" toast, and to put
  // things back when the tab leaves the portal.
  function actAsAgent(id: string) {
    setCurrentAgentId(id);
  }

  function switchCurrentAgent(id: string) {
    if (findAgent(id)) {
      setCurrentAgentId(id);
      showToast(`Switched to ${findAgent(id)?.name}'s profile.`);
    }
  }

  function updateMessageTemplate(trigger: AgentMessageTrigger, message: string) {
    setMessageTemplates((current) => ({ ...current, [trigger]: message }));
    showToast(`"${trigger}" message template updated.`);
    logActivity("Settings", `Updated the "${trigger}" agent message template.`);
  }

  function sendAgentMessage(agent: AgentProfile, trigger: AgentMessageTrigger) {
    const template = messageTemplates[trigger];
    const message = template.replace(/\{name\}/g, agent.name);
    const channel: "SMS" | "Email" = agent.phone ? "SMS" : "Email";

    const entry: AgentMessageLogEntry = {
      id: `msg-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
      agentId: agent.id,
      agentName: agent.name,
      trigger,
      channel,
      message,
      sentAt: new Date().toLocaleString("en-GB", {
        day: "2-digit",
        month: "short",
        year: "numeric",
        hour: "2-digit",
        minute: "2-digit",
      }),
    };

    setAgentMessageLog((current) => [entry, ...current]);
    logActivity(
      "Agent",
      `Sent "${trigger}" ${channel} to ${agent.name}: "${message}"`,
    );
  }

  function setAgentStatus(id: string, status: AgentStatus) {
    setAgents((current) =>
      current.map((agent) => (agent.id === id ? { ...agent, status } : agent)),
    );
    const agent = findAgent(id);
    showToast(`${agent?.name ?? "Agent"} marked as ${status}.`);
    logActivity("Agent", `Marked agent "${agent?.name ?? id}" as ${status}.`);

    if (agent && status === "Suspended") {
      sendAgentMessage(agent, "Suspended");
    }
    if (agent && status === "Active" && agent.status !== "Active") {
      sendAgentMessage(agent, "Approved");
    }
  }

  function dispatchAgentAccess(
    id: string,
    accessType: "Permanent" | "Temporary",
    allowAdminAccess: boolean,
  ) {
    const agent = findAgent(id);
    if (!agent) return;

    const dispatchedAt = new Date().toLocaleDateString("en-GB", {
      day: "2-digit",
      month: "short",
      year: "numeric",
    });

    setAgents((current) =>
      current.map((a) =>
        a.id === id
          ? { ...a, status: "Active", accessType, accessDispatchedAt: dispatchedAt, allowAdminAccess }
          : a,
      ),
    );
    showToast(
      `${accessType} access to the agent portal dispatched to ${agent.name}.` +
        (accessType === "Permanent" && !allowAdminAccess
          ? " You will no longer be able to open their dashboard."
          : ""),
    );
    logActivity(
      "Agent",
      `Dispatched ${accessType.toLowerCase()} agent-portal access to "${agent.name}" (admin access ${allowAdminAccess ? "kept" : "revoked"}).`,
    );
    sendAgentMessage(agent, "Approved");
  }

  function isAgentDashboardLockedForAdmin(agent: AgentProfile) {
    return agent.accessType === "Permanent" && !agent.allowAdminAccess;
  }

  function revokeAgentAccess(id: string) {
    const agent = findAgent(id);
    if (!agent) return;

    setAgents((current) =>
      current.map((a) => (a.id === id ? { ...a, status: "Suspended" } : a)),
    );
    showToast(`Agent-portal access revoked for ${agent.name}.`);
    logActivity("Agent", `Revoked agent-portal access for "${agent.name}".`);
    sendAgentMessage(agent, "Suspended");
  }

  function setInstallerSupportAccess(agentId: string, allow: boolean) {
    const agent = findAgent(agentId);
    if (!agent) return;

    setAgents((current) =>
      current.map((a) => (a.id === agentId ? { ...a, allowAdminAccess: allow } : a)),
    );
    showToast(
      allow
        ? "Installer support access turned back on."
        : "Installer support access turned off — they can no longer open your dashboard.",
    );
    logActivity("Agent", `${agent.name} ${allow ? "re-enabled" : "revoked"} installer support access.`);
  }

  function resetAgentPassword(id: string) {
    const agent = findAgent(id);
    showToast(`Password reset link sent for ${agent?.name ?? "agent"}. They'll set a new password on next login.`);
    logActivity("Agent", `Reset password for agent "${agent?.name ?? id}".`);
  }

  function resetAgentPin(id: string) {
    const agent = findAgent(id);
    showToast(`PIN reset for ${agent?.name ?? "agent"}. A new PIN has been securely issued.`);
    logActivity("Agent", `Reset PIN for agent "${agent?.name ?? id}".`);
  }

  // Self-service profile fields — phone, WhatsApp, email, location, and
  // the identity documents (if not submitted at application time) — an
  // agent can update these themselves any time, immediately, no approval
  // needed. Ghana Card number and date of birth are handled separately
  // below, since those are locked once set.
  function updateAgentContactDetails(
    id: string,
    updates: Partial<Pick<AgentProfile, "phone" | "whatsapp" | "email" | "location" | "idFrontFileName" | "idBackFileName" | "faceCaptureFileName">>,
  ) {
    setAgents((current) =>
      current.map((a) => {
        if (a.id !== id) return a;
        const merged = { ...a, ...updates };
        // Auto-flips on the moment every required item is present — the
        // agent doesn't have to separately "submit" anything once the
        // last field is filled in.
        return { ...merged, profileVerified: isAgentProfileComplete(merged) };
      }),
    );
    showToast("Profile updated.");
    logActivity("Agent", `${findAgent(id)?.name ?? id} updated their profile details.`);
  }

  // Ghana Card number and date of birth: settable freely exactly once —
  // the first time, since nothing was there to get wrong. After that,
  // changing either goes through requestAgentDetailChange instead, which
  // needs admin's approval before it actually takes effect.
  function setInitialIdentityDetails(id: string, ghanaCardNumber: string, dateOfBirth: string) {
    const agent = findAgent(id);
    if (!agent || agent.ghanaCardNumber || agent.dateOfBirth) return;
    setAgents((current) =>
      current.map((a) => {
        if (a.id !== id) return a;
        const merged = { ...a, ghanaCardNumber, dateOfBirth };
        return { ...merged, profileVerified: isAgentProfileComplete(merged) };
      }),
    );
    showToast("Ghana Card number and date of birth saved.");
    logActivity("Agent", `${agent.name} set their Ghana Card number and date of birth.`);
  }

  // Ghana Card number and date of birth, once set, can only be changed
  // through here — it raises a "Sensitive Account Change" admin has to
  // approve; the agent's record doesn't change until they do.
  function requestAgentDetailChange(
    id: string,
    field: "ghanaCardNumber" | "dateOfBirth",
    newValue: string,
  ) {
    const agent = findAgent(id);
    if (!agent) return;
    const fieldLabel = field === "ghanaCardNumber" ? "Ghana Card number" : "date of birth";
    submitApprovalRequest(
      "Sensitive Account Change",
      id,
      agent.name,
      `${agent.name} requests changing their ${fieldLabel} from "${agent[field] ?? "—"}" to "${newValue}".`,
      { field, newValue },
    );
    showToast(`Change request sent to admin — your current ${fieldLabel} stays in place until it's approved.`);
  }

  // Self-service password/username change — the agent's way out of the
  // default password admin gave them at approval. No admin step needed.
  function changeAgentCredentials(id: string, updates: { username?: string; password?: string }) {
    setAgents((current) =>
      current.map((a) =>
        a.id === id
          ? {
              ...a,
              ...(updates.username ? { username: updates.username } : {}),
              ...(updates.password ? { password: updates.password } : {}),
              hasChangedDefaultPassword: true,
            }
          : a,
      ),
    );
    showToast("Login details updated. Use them next time you sign in.");
    logActivity("Agent", `${findAgent(id)?.name ?? id} changed their own login password.`);
  }

  function forceLogoutAgent(id: string) {
    const agent = findAgent(id);
    setAgents((current) =>
      current.map((a) =>
        a.id === id
          ? { ...a, devices: a.devices.map((d) => ({ ...d, status: "Blocked" as const })) }
          : a,
      ),
    );
    showToast(`${agent?.name ?? "Agent"} has been logged out of all devices.`);
    logActivity("Agent", `Force-logged-out agent "${agent?.name ?? id}" from all devices.`);
  }

  function updateAgentProfile(id: string, updates: { name?: string; email?: string; phone?: string | null }) {
    setAgents((current) =>
      current.map((agent) => (agent.id === id ? { ...agent, ...updates } : agent)),
    );
    showToast("Profile updated.");
    logActivity("Agent", `Updated profile details for "${updates.name ?? id}".`);
  }

  // The admin editing an agent's details (the agent can't change these
  // themselves from their own portal except what Profile Settings allows).
  function updateAgentAdminDetails(
    id: string,
    updates: { name: string; phone: string; location: string; notes: string; email?: string; username?: string },
  ): boolean {
    const name = updates.name.trim();
    if (!name) {
      showToast("An agent needs a name.");
      return false;
    }
    const email = updates.email?.trim();
    if (email !== undefined) {
      const problem = emailProblem(email, agents, id);
      if (problem) {
        showToast(problem);
        return false;
      }
    }
    const username = updates.username !== undefined ? normalizeUsername(updates.username) : undefined;
    if (username !== undefined) {
      const problem = usernameProblem(username, agents, id);
      if (problem) {
        showToast(problem);
        return false;
      }
    }
    setAgents((current) =>
      current.map((agent) =>
        agent.id === id
          ? {
              ...agent,
              name,
              phone: updates.phone.trim() || null,
              location: updates.location.trim() || null,
              notes: updates.notes.trim(),
              ...(email !== undefined ? { email } : {}),
              ...(username !== undefined ? { username } : {}),
            }
          : agent,
      ),
    );
    showToast(`${name} updated.`);
    logActivity("Agent", `Edited details for agent "${name}".`);
    return true;
  }

  const SETTING_LABELS: Record<keyof AgentSettings, string> = {
    allowCreateVouchers: "Create vouchers",
    allowCustomVoucherCredentials: "Custom voucher credentials",
    allowViewSalesCommission: "View sales & commission",
    allowViewAssignedRouters: "View assigned routers",
    notifyOnVoucherGeneration: "Voucher alerts",
    notifyByEmail: "Alerts by email",
    notifyBySms: "Alerts by SMS",
    notifyEmailOverride: "Alert email",
    notifyPhoneOverride: "Alert phone",
    payoutNotes: "Payout notes",
  };

  // Saves ONE agent's settings (what they may see and do, and how you hear
  // about what they do).
  // The default (admin) agent's sign-in switch. Off by default: until it is
  // turned on, nobody can sign in with the admin agent's login details.
  function setDefaultAgentLogin(id: string, enabled: boolean) {
    const agent = findAgent(id);
    if (!agent?.isDefault) return;
    setAgents((current) => current.map((a) => (a.id === id ? { ...a, portalLoginEnabled: enabled } : a)));
    showToast(enabled ? "Sign-in with the admin agent's login details is ON." : "Sign-in with the admin agent's login details is OFF.");
    logActivity("Agent", `Turned ${enabled ? "on" : "off"} sign-in with the admin agent's login details.`);
  }

  // "Allow agent dashboard" - lets this one agent open (or not) their own dashboard.
  function setAgentPortalAccess(id: string, enabled: boolean) {
    const agent = findAgent(id);
    if (!agent) return;
    setAgents((current) => current.map((a) => (a.id === id ? { ...a, portalAccessEnabled: enabled } : a)));
    showToast(enabled ? `${agent.name} can now open their dashboard.` : `${agent.name}'s dashboard is switched off.`);
    logActivity("Agent", `${enabled ? "Allowed" : "Blocked"} ${agent.name}'s agent dashboard.`);
  }

  function updateAgentSettings(id: string, next: AgentSettings) {
    const agent = findAgent(id);
    if (!agent) return;
    const before = settingsOf(agent);
    const cleaned = normalizeAgentSettings({
      ...next,
      notifyEmailOverride: next.notifyEmailOverride.trim(),
      notifyPhoneOverride: next.notifyPhoneOverride.trim(),
      payoutNotes: next.payoutNotes.trim(),
    });
    const changes = (Object.keys(cleaned) as Array<keyof AgentSettings>)
      .filter((key) => cleaned[key] !== before[key])
      .map((key) => {
        const value = cleaned[key];
        const shown = typeof value === "boolean" ? (value ? "on" : "off") : key === "payoutNotes" ? "updated" : value || "(organization default)";
        return `${SETTING_LABELS[key]} → ${shown}`;
      });

    setAgents((current) => current.map((a) => (a.id === id ? { ...a, settings: cleaned } : a)));

    if (changes.length === 0) {
      showToast(`${agent.name}'s settings are already up to date.`);
      return;
    }
    showToast(`${agent.name}'s settings saved.`);
    logActivity("Agent", `Updated settings for agent "${agent.name}": ${changes.join("; ")}.`);
  }

  function updateAgentPermissions(id: string, permissions: AgentPermissions) {
    setAgents((current) =>
      current.map((agent) => (agent.id === id ? { ...agent, permissions } : agent)),
    );
    const agent = findAgent(id);
    showToast(`Permissions updated for ${agent?.name ?? "agent"}.`);
    logActivity("Agent", `Updated permissions for agent "${agent?.name ?? id}".`);
  }

  function updateAgentLimits(id: string, limits: AgentLimits) {
    setAgents((current) =>
      current.map((agent) => (agent.id === id ? { ...agent, limits } : agent)),
    );
    const agent = findAgent(id);
    showToast(`Limits updated for ${agent?.name ?? "agent"}.`);
    logActivity("Agent", `Updated limits for agent "${agent?.name ?? id}".`);
  }

  function updateAgentRouter(id: string, routerIp: string) {
    setAgents((current) =>
      current.map((agent) => (agent.id === id ? { ...agent, routerIp } : agent)),
    );
    const agent = findAgent(id);
    const router = routers.find((r) => r.ip === routerIp);
    showToast(`${agent?.name ?? "Agent"} assigned to ${router?.name ?? "router"}.`);
    logActivity("Agent", `Assigned agent "${agent?.name ?? id}" to router "${router?.name ?? routerIp}".`);
  }

  function adjustAgentWallet(id: string, amount: number, note: string) {
    const agent = findAgent(id);

    // A genuine deposit (positive amount) gets topped up with the
    // agent's commission rate as bonus value on top of what was actually
    // paid in — e.g. a 15% rate on a GH₵20 deposit credits GH₵23, so the
    // extra voucher value IS their commission, taken automatically at the
    // moment they fund their wallet rather than tracked separately.
    // Debits (topping down, corrections) always apply exactly as given.
    // Needs the wallet.commissionBonus permission; without it, or with no
    // rate set, a deposit credits at face value like it always did.
    const hasBonusPermission = agent?.permissions["wallet.commissionBonus"] === "Allowed";
    const rate = agent?.commissionRatePercent ?? 0;
    const bonusApplies = amount > 0 && hasBonusPermission && rate > 0;
    const bonusAmount = bonusApplies ? Math.round(amount * (rate / 100) * 100) / 100 : 0;
    const creditedAmount = amount + bonusAmount;

    setAgents((current) =>
      current.map((a) => (a.id === id ? { ...a, walletBalance: a.walletBalance + creditedAmount } : a)),
    );

    if (bonusApplies) {
      showToast(
        `Credited ${sym()} ${amount.toFixed(2)} + ${sym()} ${bonusAmount.toFixed(2)} commission bonus (${rate}%) = ${sym()} ${creditedAmount.toFixed(2)} to ${agent?.name ?? "agent"}'s wallet.`,
      );
      logActivity(
        "Agent",
        `Wallet top-up of ${sym()} ${amount.toFixed(2)} for agent "${agent?.name ?? id}" — ${note}. Commission bonus ${sym()} ${bonusAmount.toFixed(2)} (${rate}%) applied, ${sym()} ${creditedAmount.toFixed(2)} credited.`,
      );
    } else {
      showToast(
        `${amount >= 0 ? "Credited" : "Debited"} ${sym()} ${Math.abs(amount).toFixed(2)} ${
          amount >= 0 ? "to" : "from"
        } ${agent?.name ?? "agent"}'s wallet.`,
      );
      logActivity(
        "Agent",
        `Wallet adjustment of ${sym()} ${amount.toFixed(2)} for agent "${agent?.name ?? id}" — ${note}.`,
      );
    }
  }

  // The minimal permission set for "Voucher Creator" — can see their own
  // dashboard and sell/print vouchers, nothing else. Which package they
  // can sell is locked separately via defaultPackageName.
  function buildVoucherCreatorPermissions() {
    const result: Record<string, "Allowed" | "Denied" | "Approval Required"> = {};
    for (const key of Object.keys(PERMISSION_PRESETS["Read Only"])) {
      result[key] = "Denied";
    }
    ["dashboard.view", "dashboard.viewOwnKpis", "voucher.view", "voucher.sell", "voucher.print", "settings.viewProfile"].forEach(
      (key) => {
        result[key] = "Allowed";
      },
    );
    BASE_AGENT_PERMISSIONS.forEach((key) => {
      result[key] = "Allowed";
    });
    return result;
  }

  function applyAgentDashboardMode(
    agentId: string,
    mode: "viewOnly" | "voucherCreator" | "custom",
    defaultPackageName?: string | null,
  ) {
    setAgents((current) =>
      current.map((agent) => {
        if (agent.id !== agentId) return agent;
        if (mode === "viewOnly") {
          return {
            ...agent,
            dashboardMode: mode,
            defaultPackageName: null,
            permissions: { ...PERMISSION_PRESETS["Read Only"] },
          };
        }
        if (mode === "voucherCreator") {
          return {
            ...agent,
            dashboardMode: mode,
            defaultPackageName: defaultPackageName ?? agent.defaultPackageName ?? null,
            permissions: buildVoucherCreatorPermissions(),
          };
        }
        // "custom": hand over to whatever the admin sets in the granular
        // permissions editor. If they're moving off a stricter tier, start
        // them from a sensible fuller baseline instead of leaving them
        // stuck on Read Only / voucher-only permissions.
        const wasRestricted = agent.dashboardMode !== "custom";
        return {
          ...agent,
          dashboardMode: mode,
          defaultPackageName: null,
          permissions: wasRestricted ? { ...PERMISSION_PRESETS["Associate Admin"] } : agent.permissions,
        };
      }),
    );
    const agent = findAgent(agentId);
    const modeLabel = mode === "viewOnly" ? "Viewer Only" : mode === "voucherCreator" ? "Voucher Creator" : "Custom";
    showToast(`${agent?.name ?? "Agent"}'s dashboard set to "${modeLabel}".`);
    logActivity("Agent", `Set dashboard mode for "${agent?.name ?? agentId}" to ${modeLabel}.`);
  }

  function toggleAgentWalletTopUp(agentId: string) {
    setAgents((current) =>
      current.map((agent) =>
        agent.id === agentId ? { ...agent, allowWalletTopUp: !agent.allowWalletTopUp } : agent,
      ),
    );
    const agent = findAgent(agentId);
    showToast(
      `Wallet top-up ${agent?.allowWalletTopUp ? "disabled" : "enabled"} for ${agent?.name ?? "agent"}.`,
    );
    logActivity(
      "Agent",
      `${agent?.allowWalletTopUp ? "Disabled" : "Enabled"} self wallet top-up for "${agent?.name ?? agentId}".`,
    );
  }

  function setAgentDeviceStatus(
    agentId: string,
    deviceId: string,
    status: AgentDevice["status"],
  ) {
    setAgents((current) =>
      current.map((agent) =>
        agent.id === agentId
          ? {
              ...agent,
              devices: agent.devices.map((device) =>
                device.id === deviceId ? { ...device, status } : device,
              ),
            }
          : agent,
      ),
    );
    showToast(`Device ${status === "Blocked" ? "blocked" : "unblocked"}.`);
    logActivity("Agent", `${status === "Blocked" ? "Blocked" : "Unblocked"} a device for agent ${agentId}.`);
  }

  function submitApprovalRequest(
    type: ApprovalType,
    agentId: string,
    agentName: string,
    summary: string,
    payload?: ApprovalRequest["payload"],
  ) {
    const newRequest: ApprovalRequest = {
      id: `appr-${Date.now()}`,
      type,
      agentId,
      agentName,
      summary,
      status: "Pending",
      createdAt: new Date().toLocaleString("en-GB", {
        day: "2-digit",
        month: "short",
        year: "numeric",
        hour: "2-digit",
        minute: "2-digit",
      }),
      decidedAt: null,
      decidedBy: null,
      reason: null,
      payload,
    };
    setApprovalRequests((current) => [newRequest, ...current]);
    logActivity("Agent", `New approval request: ${type} for ${agentName}.`);
    return newRequest;
  }

  function decideApproval(
    id: string,
    decision: "Approved" | "Rejected",
    reason: string,
  ) {
    const request = approvalRequests.find((r) => r.id === id);
    if (!request) return;

    const decidedByName = findAgent(currentAgentId)?.name ?? "Admin";
    const decidedAt = new Date().toLocaleString("en-GB", {
      day: "2-digit",
      month: "short",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });

    setApprovalRequests((current) =>
      current.map((r) =>
        r.id === id
          ? { ...r, status: decision, decidedAt, decidedBy: decidedByName, reason }
          : r,
      ),
    );

    if (request.type === "New Agent" && decision === "Approved") {
      setAgentStatus(request.agentId, "Active");
      const approved = findAgent(request.agentId);
      if (approved) queueAgentEmail(approved, "Approved", approved.password);
    } else if (request.type === "New Agent" && decision === "Rejected") {
      setAgentStatus(request.agentId, "Deactivated");
    }

    if (request.type === "Sensitive Account Change" && decision === "Approved" && request.payload) {
      const { field, newValue } = request.payload;
      setAgents((current) =>
        current.map((a) => (a.id === request.agentId ? { ...a, [field]: newValue } : a)),
      );
    }

    showToast(`Request ${decision.toLowerCase()}.`);
    logActivity(
      "Agent",
      `${decision} approval request "${request.type}" for ${request.agentName}.`,
    );
  }

  function updateCommissionSettings(updates: Partial<CommissionSettings>) {
    setCommissionSettings((current) => ({ ...current, ...updates }));
    showToast("Commission settings saved.");
    logActivity("Settings", "Updated agent commission settings.");
  }

  return {
    agents,
    setAgents,
    approvalRequests,
    currentAgentId,
    messageTemplates,
    agentMessageLog,
    commissionSettings,
    maxAgentCommissionPercent,
    updateMaxAgentCommissionPercent,
    setAgentCommissionRate,
    setAgentMaxResaleMarkup,
    acknowledgeResaleRule,
    updateCommissionSettings,
    toggleWalletFundingRequirement,
    getMaxAffordableVouchers,
    findAgent,
    addAgent,
    deleteAgent,
    switchCurrentAgent,
    actAsAgent,
    updateMessageTemplate,
    sendAgentMessage,
    setAgentStatus,
    dispatchAgentAccess,
    isAgentDashboardLockedForAdmin,
    revokeAgentAccess,
    setInstallerSupportAccess,
    resetAgentPassword,
    resetAgentPin,
    updateAgentContactDetails,
    setInitialIdentityDetails,
    requestAgentDetailChange,
    changeAgentCredentials,
    forceLogoutAgent,
    updateAgentProfile,
    updateAgentAdminDetails,
    updateAgentSettings,
    setDefaultAgentLogin,
    setAgentPortalAccess,
    createAgentByAdmin,
    applicationFiles,
    notifiedApplicationIds,
    markApplicationsNotified,
    agentEmails,
    markAgentEmailOpened,
    loadSampleApplications,
    removeSampleApplications,
    updateAgentPermissions,
    updateAgentLimits,
    updateAgentRouter,
    adjustAgentWallet,
    applyAgentDashboardMode,
    toggleAgentWalletTopUp,
    setAgentDeviceStatus,
    inviteManagerToSite,
    submitApprovalRequest,
    decideApproval,
  };
}
