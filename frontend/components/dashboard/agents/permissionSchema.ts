// The full catalog of what an agent/reseller can be allowed or denied.
// The groups below are deliberately the same modules an agent actually
// sees in their own reseller dashboard (app/reseller/dashboard) — Dashboard,
// Users / Connections, Sales, Vouchers, Packages, Transactions, Reports,
// SMS, Support Tickets, and Settings (their own profile/password, plus
// inviting a manager to their site). Anything that isn't part of the
// agent's own dashboard — wallet/commission oversight, inventory,
// approving other agents, resetting someone else's PIN, and so on — is a
// system-level concern and lives under the admin side instead (Settings >
// System Users > Access Roles, components/dashboard/settings/systemUsersSchema.ts),
// not here.
//
// Every agent gets BASE_AGENT_PERMISSIONS on by default no matter their
// role — they can always see their own dashboard. Everything else is an
// additional permission layered on top by their role.
//
// Each permission's state is one of: "Allowed" | "Denied" | "Approval Required".

import type { AgentPermissionState, AgentPermissions, AgentRole } from "../shared/types";

export type PermissionDef = { key: string; label: string };
export type PermissionGroup = {
  key: string;
  label: string;
  permissions: PermissionDef[];
};

// Always on for every agent, regardless of role — an agent can always see
// their own dashboard. These two checkboxes show as locked/on in both
// permission editors; everything else is an "additional permission".
export const BASE_AGENT_PERMISSIONS: string[] = ["dashboard.view", "dashboard.viewOwnKpis"];

export const PERMISSION_GROUPS: PermissionGroup[] = [
  {
    key: "dashboard",
    label: "Dashboard",
    permissions: [
      { key: "dashboard.view", label: "View dashboard" },
      { key: "dashboard.viewOwnKpis", label: "View own KPIs" },
      { key: "dashboard.viewAccountKpis", label: "View account-wide KPIs" },
    ],
  },
  {
    key: "users",
    label: "Users / Connections",
    permissions: [
      { key: "users.view", label: "View users / connections" },
      { key: "users.add", label: "Add a user" },
      { key: "users.edit", label: "Edit a user" },
      { key: "users.block", label: "Block a user" },
      { key: "users.viewSessions", label: "View live sessions" },
      { key: "users.terminateOwn", label: "Terminate own sessions" },
      { key: "users.terminateOther", label: "Terminate other sessions" },
    ],
  },
  {
    key: "sales",
    label: "Sales",
    permissions: [
      { key: "sales.viewOwn", label: "View own sales" },
      { key: "sales.viewTeam", label: "View team sales" },
      { key: "sales.export", label: "Export sales" },
      { key: "sales.refund", label: "Issue approved refunds" },
    ],
  },
  {
    key: "voucher",
    label: "Vouchers",
    permissions: [
      { key: "voucher.view", label: "View" },
      { key: "voucher.generate", label: "Generate" },
      { key: "voucher.allocate", label: "Allocate" },
      { key: "voucher.sell", label: "Sell" },
      { key: "voucher.cancel", label: "Cancel" },
      { key: "voucher.print", label: "Print / Share" },
      { key: "voucher.bulk", label: "Bulk generation" },
      { key: "voucher.viewAssignedByAdmin", label: "View vouchers assigned by admin" },
      { key: "voucher.presets", label: "Create, save & use voucher presets" },
      { key: "voucher.presetsManage", label: "Edit & delete their own voucher presets" },
    ],
  },
  {
    key: "wallet",
    label: "Wallet",
    permissions: [
      {
        key: "wallet.commissionBonus",
        label: "Get commission bonus value when topping up their wallet",
      },
    ],
  },
  {
    key: "packages",
    label: "Packages",
    permissions: [
      { key: "packages.view", label: "View available packages" },
      { key: "packages.viewPricing", label: "View package pricing & commission rates" },
      { key: "packages.sell", label: "Sell a package directly to a customer" },
      { key: "packages.create", label: "Create a new package" },
      { key: "packages.edit", label: "Edit a package they created" },
      { key: "packages.editPushed", label: "Edit a package admin created or pushed to them" },
      { key: "packages.duplicate", label: "Duplicate a package (the copy becomes theirs)" },
      { key: "packages.disableDelete", label: "Disable or delete a package they created" },
      { key: "packages.disableDeletePushed", label: "Disable or delete a package admin created or pushed to them" },
      { key: "packages.setOwnPricing", label: "Set their own resale price / markup" },
      { key: "packages.applyToRouter", label: "Apply a package to their own router/site" },
      { key: "packages.viewSubscribers", label: "View how many customers are on a package" },
    ],
  },
  {
    key: "transactions",
    label: "Transactions",
    permissions: [
      { key: "transactions.recordCash", label: "Record cash" },
      { key: "transactions.recordMomo", label: "Record MoMo" },
      { key: "transactions.viewStatus", label: "View payment status" },
      { key: "transactions.viewHistory", label: "View transaction history" },
      { key: "transactions.export", label: "Export transactions" },
    ],
  },
  {
    key: "reports",
    label: "Reports",
    permissions: [
      { key: "reports.view", label: "View reports" },
      { key: "reports.export", label: "Export reports" },
      { key: "reports.viewFinancial", label: "View financial reports" },
    ],
  },
  {
    key: "sms",
    label: "SMS",
    permissions: [
      { key: "sms.view", label: "View SMS history" },
      { key: "sms.send", label: "Send SMS to customers" },
      { key: "sms.editTemplates", label: "Edit SMS templates" },
    ],
  },
  {
    key: "supportTickets",
    label: "Support Tickets",
    permissions: [
      { key: "supportTickets.view", label: "View support tickets" },
      { key: "supportTickets.respond", label: "Respond to tickets" },
      { key: "supportTickets.close", label: "Close tickets" },
      { key: "supportTickets.escalate", label: "Escalate to admin" },
    ],
  },
  {
    key: "settings",
    label: "Settings",
    permissions: [
      { key: "settings.viewProfile", label: "View profile settings" },
      { key: "settings.editProfile", label: "Edit profile settings" },
      { key: "settings.changePassword", label: "Change password" },
      { key: "agentManagement.inviteManager", label: "Invite a manager to their own site" },
    ],
  },
];

export const ALL_PERMISSION_KEYS = PERMISSION_GROUPS.flatMap((group) =>
  group.permissions.map((p) => p.key),
);

function buildPermissions(
  allowedKeys: string[],
  approvalKeys: string[] = [],
): AgentPermissions {
  const result: AgentPermissions = {};
  ALL_PERMISSION_KEYS.forEach((key) => {
    result[key] = allowedKeys.includes(key)
      ? "Allowed"
      : approvalKeys.includes(key)
        ? "Approval Required"
        : "Denied";
  });
  // The base dashboard-access permissions are always on, whatever the
  // preset says — every agent can see their own dashboard by default.
  BASE_AGENT_PERMISSIONS.forEach((key) => {
    result[key] = "Allowed";
  });
  return result;
}

export type PermissionPresetName =
  | "Full Agent"
  | "Sales Agent"
  | "Voucher Agent"
  | "Support Agent"
  | "Associate Admin"
  | "Read Only";

export const PERMISSION_PRESETS: Record<PermissionPresetName, AgentPermissions> = {
  "Full Agent": buildPermissions(ALL_PERMISSION_KEYS),
  "Sales Agent": buildPermissions(
    [
      "dashboard.view", "dashboard.viewOwnKpis",
      "users.view", "users.add",
      "sales.viewOwn",
      "voucher.view", "voucher.sell", "voucher.print",
      "packages.view", "packages.sell",
      "transactions.recordCash", "transactions.recordMomo", "transactions.viewStatus",
      "reports.view",
      "sms.view",
      "supportTickets.view",
      "settings.viewProfile", "settings.editProfile", "settings.changePassword",
    ],
    ["sales.refund"],
  ),
  "Voucher Agent": buildPermissions(
    [
      "dashboard.view", "dashboard.viewOwnKpis",
      "voucher.view", "voucher.generate", "voucher.sell", "voucher.print",
      "sales.viewOwn",
      "packages.view",
      "transactions.recordCash", "transactions.recordMomo",
      "settings.viewProfile", "settings.editProfile", "settings.changePassword",
    ],
    ["voucher.bulk", "voucher.cancel"],
  ),
  "Support Agent": buildPermissions(
    [
      "dashboard.view",
      "users.view", "users.edit", "users.viewSessions",
      "users.terminateOwn",
      "voucher.view",
      "reports.view",
      "sms.view",
      "supportTickets.view", "supportTickets.respond", "supportTickets.close",
      "settings.viewProfile", "settings.editProfile", "settings.changePassword",
    ],
    ["users.block", "users.terminateOther", "supportTickets.escalate"],
  ),
  "Associate Admin": buildPermissions(
    [
      "dashboard.view", "dashboard.viewOwnKpis", "dashboard.viewAccountKpis",
      "users.view", "users.add", "users.edit", "users.viewSessions", "users.terminateOwn",
      "sales.viewOwn", "sales.viewTeam", "sales.export",
      "voucher.view", "voucher.generate", "voucher.allocate", "voucher.sell", "voucher.print", "voucher.bulk",
      "packages.view", "packages.viewPricing", "packages.sell",
      "packages.setOwnPricing", "packages.applyToRouter", "packages.viewSubscribers",
      "transactions.recordCash", "transactions.recordMomo", "transactions.viewStatus", "transactions.viewHistory",
      "reports.view", "reports.export", "reports.viewFinancial",
      "sms.view", "sms.send",
      "supportTickets.view", "supportTickets.respond", "supportTickets.close",
      "settings.viewProfile", "settings.editProfile", "settings.changePassword", "agentManagement.inviteManager",
    ],
    ["users.block", "users.terminateOther", "voucher.cancel", "sales.refund", "supportTickets.escalate", "packages.disableDelete"],
  ),
  "Read Only": buildPermissions(
    [
      "dashboard.view", "dashboard.viewOwnKpis",
      "users.view",
      "sales.viewOwn",
      "voucher.view",
      "packages.view", "packages.viewPricing",
      "transactions.viewStatus",
      "reports.view",
      "sms.view",
      "supportTickets.view",
      "settings.viewProfile",
    ],
  ),
};

export const PRESET_DESCRIPTIONS: Record<PermissionPresetName, string> = {
  "Full Agent": "Every module, unrestricted. Reserved for the reseller/owner account.",
  "Sales Agent": "Sell vouchers and packages, add customers, record payments. No refunds by default.",
  "Voucher Agent": "Generate and sell vouchers day-to-day. No bulk generation or cancellations by default.",
  "Support Agent": "Help customers, view sessions, handle support tickets. No blocking or escalation by default.",
  "Associate Admin": "Runs most of the reseller dashboard — team, reports, tickets — without approving high-risk actions.",
  "Read Only": "Can view every module for oversight, but can't change anything.",
};

export function presetNameForRole(role: AgentRole): PermissionPresetName {
  switch (role) {
    case "Owner":
      return "Full Agent";
    case "Associate Admin":
      return "Associate Admin";
    case "Manager":
      return "Associate Admin";
    case "Sub-Agent":
      return "Voucher Agent";
    case "Viewer":
      return "Read Only";
    case "Field Agent":
    default:
      return "Sales Agent";
  }
}

export function defaultPermissionsForRole(role: AgentRole): AgentPermissions {
  return PERMISSION_PRESETS[presetNameForRole(role)];
}

export function countByState(
  permissions: AgentPermissions,
  state: AgentPermissionState,
) {
  return Object.values(permissions).filter((v) => v === state).length;
}
