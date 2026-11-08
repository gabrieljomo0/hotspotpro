import type { AgentPermissionState } from "../shared/types";

export type AdminPermissionDef = { key: string; label: string };
export type AdminPermissionGroup = {
  key: string;
  label: string;
  permissions: AdminPermissionDef[];
};

export type AdminPermissions = Record<string, AgentPermissionState>;

// Every module of the entire site, organized into categories. This is the
// single source of truth for "what can be controlled" — any new admin-side
// capability should get a line here so it's covered by Roles & Permissions.
export const ADMIN_PERMISSION_GROUPS: AdminPermissionGroup[] = [
  {
    key: "dashboard",
    label: "Dashboard & Overview",
    permissions: [
      { key: "dashboard.view", label: "View main dashboard" },
      { key: "dashboard.viewRevenue", label: "View revenue figures" },
      { key: "dashboard.viewQuickActions", label: "Use quick actions" },
    ],
  },
  {
    key: "users",
    label: "Active Users & Sessions",
    permissions: [
      { key: "users.view", label: "View active users & sessions" },
      { key: "users.extendAccess", label: "Extend user access time/data" },
      { key: "users.pauseDisconnectBlock", label: "Pause, disconnect, or block a user" },
      { key: "users.deleteUser", label: "Permanently delete a user" },
      { key: "users.changePackage", label: "Change a user's package" },
      { key: "users.resetPassword", label: "Reset a user's login/password" },
      { key: "users.viewAdvancedDetails", label: "View advanced session/device details" },
    ],
  },
  {
    key: "vouchers",
    label: "Vouchers",
    permissions: [
      { key: "vouchers.view", label: "View vouchers & batches" },
      { key: "vouchers.generate", label: "Generate new vouchers" },
      { key: "vouchers.bulkAssign", label: "Bulk-assign or reassign vouchers" },
      { key: "vouchers.delete", label: "Delete vouchers" },
      { key: "vouchers.print", label: "Print / download voucher batches" },
    ],
  },
  {
    key: "packages",
    label: "Packages",
    permissions: [
      { key: "packages.view", label: "View packages" },
      { key: "packages.create", label: "Create a new package" },
      { key: "packages.edit", label: "Edit or duplicate a package" },
      { key: "packages.disableDelete", label: "Disable or delete a package" },
    ],
  },
  {
    key: "routers",
    label: "Routers & Hotspot Configuration",
    permissions: [
      { key: "routers.view", label: "View routers" },
      { key: "routers.addEdit", label: "Add or edit a router" },
      { key: "routers.delete", label: "Delete a router" },
      { key: "routers.remoteActions", label: "Reboot, sync, or run remote actions" },
      { key: "routers.multiWan", label: "Configure Multi-WAN" },
      { key: "routers.hotspotNetwork", label: "Edit hotspot network settings (SSID, bandwidth, timeouts)" },
    ],
  },
  {
    key: "captivePortal",
    label: "Captive Portal Design",
    permissions: [
      { key: "captivePortal.view", label: "View captive portal setup" },
      { key: "captivePortal.editTemplate", label: "Change template or design" },
      { key: "captivePortal.editCustomerExperience", label: "Edit customer-experience toggles" },
      { key: "captivePortal.applyToSites", label: "Apply setup to other sites" },
    ],
  },
  {
    key: "agents",
    label: "Agents & Resellers",
    permissions: [
      { key: "agents.view", label: "View agents" },
      { key: "agents.create", label: "Add a new agent" },
      { key: "agents.approve", label: "Approve or reject applications" },
      { key: "agents.managePermissions", label: "Manage an agent's permissions" },
      { key: "agents.manageWallet", label: "Adjust an agent's wallet" },
      { key: "agents.suspendDelete", label: "Suspend, deactivate, or delete an agent" },
      { key: "agents.dispatchAccess", label: "Dispatch or revoke agent-portal access" },
    ],
  },
  {
    key: "installers",
    label: "Installers",
    permissions: [
      { key: "installers.view", label: "View installers" },
      { key: "installers.add", label: "Add an installer" },
      { key: "installers.assign", label: "Assign an installer to a site" },
      { key: "installers.dispatch", label: "Dispatch a site to a client" },
    ],
  },
  {
    key: "payments",
    label: "Payments & Billing",
    permissions: [
      { key: "payments.view", label: "View transactions & payments" },
      { key: "payments.configureGateway", label: "Configure payment gateways" },
      { key: "payments.requestGateway", label: "Request a new gateway" },
      { key: "payments.manageSubscription", label: "Manage HotspotPro subscription/billing" },
    ],
  },
  {
    key: "reports",
    label: "Reports & Analytics",
    permissions: [
      { key: "reports.view", label: "View analytics & reports" },
      { key: "reports.export", label: "Export report data" },
    ],
  },
  {
    key: "messages",
    label: "Messages (SMS & Email)",
    permissions: [
      { key: "messages.send", label: "Send SMS/email to customers" },
      { key: "messages.editTemplates", label: "Edit agent message templates" },
    ],
  },
  {
    key: "loyalty",
    label: "Loyalty Programme",
    permissions: [
      { key: "loyalty.view", label: "View loyalty points" },
      { key: "loyalty.editSettings", label: "Edit loyalty programme settings" },
      { key: "loyalty.redeem", label: "Redeem points on a customer's behalf" },
    ],
  },
  {
    key: "settings",
    label: "Settings & Branding",
    permissions: [
      { key: "settings.viewGeneral", label: "View general settings" },
      { key: "settings.editBranding", label: "Edit branding" },
      { key: "settings.editHotspotPolicy", label: "Edit hotspot/voucher policy" },
      { key: "settings.editSecurity", label: "Edit security settings" },
      { key: "settings.editNotifications", label: "Edit notification settings" },
      { key: "settings.editSites", label: "Manage linked sites" },
    ],
  },
  {
    key: "rolesPermissions",
    label: "Roles & Permissions",
    permissions: [
      { key: "rolesPermissions.view", label: "View roles & permissions" },
      { key: "rolesPermissions.edit", label: "Edit role permission matrices" },
    ],
  },
  {
    key: "activityLogs",
    label: "Activity Logs",
    permissions: [
      { key: "activityLogs.view", label: "View activity logs" },
      { key: "activityLogs.clear", label: "Clear activity history" },
    ],
  },
];

export function countAdminByState(permissions: AdminPermissions, groupKey?: string) {
  const relevantKeys = groupKey
    ? ADMIN_PERMISSION_GROUPS.find((g) => g.key === groupKey)?.permissions.map((p) => p.key) ?? []
    : ADMIN_PERMISSION_GROUPS.flatMap((g) => g.permissions.map((p) => p.key));

  let allowed = 0;
  let denied = 0;
  let approval = 0;
  relevantKeys.forEach((key) => {
    const state = permissions[key];
    if (state === "Allowed") allowed += 1;
    else if (state === "Denied") denied += 1;
    else if (state === "Approval Required") approval += 1;
  });
  return { allowed, denied, approval, total: relevantKeys.length };
}

export type AdminRolePreset = {
  key: string;
  label: string;
  description: string;
  build: () => AdminPermissions;
};

function allGroups(state: AgentPermissionState): AdminPermissions {
  const result: AdminPermissions = {};
  ADMIN_PERMISSION_GROUPS.forEach((group) => {
    group.permissions.forEach((perm) => {
      result[perm.key] = state;
    });
  });
  return result;
}

function only(groupKeys: string[], state: AgentPermissionState, fallback: AgentPermissionState = "Denied"): AdminPermissions {
  const result = allGroups(fallback);
  ADMIN_PERMISSION_GROUPS.forEach((group) => {
    if (groupKeys.includes(group.key)) {
      group.permissions.forEach((perm) => {
        result[perm.key] = state;
      });
    }
  });
  return result;
}

export type AdminTeamMember = {
  id: string;
  name: string;
  email: string;
  phone: string;
  roleKey: string;
  status: "Active" | "Suspended" | "Pending";
  isOwner: boolean;
  createdAt: string;
};

export const ADMIN_ROLE_PRESETS: AdminRolePreset[] = [
  {
    key: "owner",
    label: "Owner",
    description: "Full, unrestricted control over every module on the site.",
    build: () => allGroups("Allowed"),
  },
  {
    key: "operations",
    label: "Operations Manager",
    description: "Runs day-to-day operations — users, vouchers, packages, routers, agents, installers — without billing or role-editing access.",
    build: () =>
      only(
        ["dashboard", "users", "vouchers", "packages", "routers", "captivePortal", "agents", "installers", "reports", "messages", "loyalty"],
        "Allowed",
      ),
  },
  {
    key: "support",
    label: "Support Staff",
    description: "Helps customers and agents day-to-day, with view access to most areas and limited edit rights.",
    build: () => {
      const result = only(["dashboard", "users", "vouchers", "agents", "messages"], "Allowed");
      ["packages", "routers", "captivePortal", "payments", "reports", "loyalty"].forEach((key) => {
        ADMIN_PERMISSION_GROUPS.find((g) => g.key === key)?.permissions.forEach((p) => {
          result[p.key] = "Approval Required";
        });
      });
      return result;
    },
  },
  {
    key: "billing",
    label: "Billing / Finance Staff",
    description: "Payments, subscription, and reports only — no access to user, router, or agent controls.",
    build: () => only(["dashboard", "payments", "reports"], "Allowed"),
  },
  {
    key: "readonly",
    label: "Read-Only Auditor",
    description: "Can view every module for auditing purposes, but cannot change anything.",
    build: () => allGroups("Denied"),
  },
];
