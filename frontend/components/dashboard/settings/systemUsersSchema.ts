// System Users & Access Roles — staff accounts that log into this admin
// dashboard, and the roles that govern what each of them can see and do.
// This is a newer, simpler (on/off) permission model than the legacy
// Roles & Permissions page (adminPermissionSchema.ts / adminTeam), kept
// alongside it so neither feature disturbs the other.

export type AccessPermissionDef = { key: string; label: string };
export type AccessPermissionGroup = {
  key: string;
  label: string;
  permissions: AccessPermissionDef[];
};

// Tabs shown when editing an Access Role.
export const ACCESS_PERMISSION_GROUPS: AccessPermissionGroup[] = [
  {
    key: "financeSales",
    label: "Finance & Sales",
    permissions: [
      { key: "finance.viewRevenueWalletSummaries", label: "View revenue and wallet summaries" },
      { key: "finance.viewPaymentDetails", label: "View payment details" },
      { key: "finance.viewVouchers", label: "View vouchers" },
      { key: "finance.createVouchers", label: "Create vouchers" },
      { key: "finance.deleteVouchers", label: "Delete vouchers" },
      { key: "finance.viewPackageDetails", label: "View package details" },
      { key: "finance.editPackages", label: "Edit packages" },
      { key: "finance.viewExpenseDetails", label: "View expense details" },
      { key: "finance.editExpenses", label: "Edit expenses" },
      { key: "finance.openPartnerReports", label: "Open partner reports" },
      { key: "finance.requestWithdrawals", label: "Request and view withdrawals" },
      { key: "finance.viewSubscriptionPaymentHistory", label: "View subscription payment history" },
      { key: "finance.viewVoucherAgents", label: "View voucher agents" },
      { key: "finance.editVoucherAgents", label: "Edit voucher agents" },
      { key: "finance.viewPayments", label: "View payments" },
      { key: "finance.recordPayments", label: "Record payments" },
      { key: "finance.viewVoucherDetails", label: "View voucher details" },
      { key: "finance.editVouchers", label: "Edit vouchers" },
      { key: "finance.viewPackages", label: "View packages" },
      { key: "finance.createPackages", label: "Create packages" },
      { key: "finance.viewExpenses", label: "View expenses" },
      { key: "finance.recordExpenses", label: "Record expenses" },
      { key: "finance.openFinancialAnalytics", label: "Open financial analytics" },
      { key: "finance.openRevenueHistory", label: "Open revenue history" },
      { key: "finance.manageBillingSubscription", label: "Manage billing and subscription" },
      { key: "finance.viewAgentPurchases", label: "View agent purchases" },
      { key: "finance.createVoucherAgents", label: "Create voucher agents" },
    ],
  },
  {
    key: "customersSupport",
    label: "Customers & Support",
    permissions: [
      { key: "support.viewCustomers", label: "View customers" },
      { key: "support.createCustomers", label: "Create customers" },
      { key: "support.deleteCustomers", label: "Delete customers" },
      { key: "support.openExpiredUsers", label: "Open expired users" },
      { key: "support.viewTickets", label: "View tickets" },
      { key: "support.createTickets", label: "Create tickets" },
      { key: "support.viewBlockedDevices", label: "View blocked devices" },
      { key: "support.blockDevices", label: "Block devices" },
      { key: "support.viewCustomerFeedback", label: "View customer feedback" },
      { key: "support.viewCustomerDetails", label: "View customer details" },
      { key: "support.editCustomers", label: "Edit customers" },
      { key: "support.openActiveUsers", label: "Open active users" },
      { key: "support.openCustomerAnalytics", label: "Open customer analytics" },
      { key: "support.viewTicketDetails", label: "View ticket details" },
      { key: "support.updateTickets", label: "Update tickets" },
      { key: "support.viewBlockedDeviceDetails", label: "View blocked-device details" },
      { key: "support.unblockDevices", label: "Unblock devices" },
    ],
  },
  {
    key: "network",
    label: "Network",
    permissions: [
      { key: "network.viewMikroTikRouters", label: "View MikroTik routers" },
      { key: "network.linkRouters", label: "Link routers" },
      { key: "network.deleteRouters", label: "Delete routers" },
      { key: "network.viewAccessPointDetails", label: "View access-point details" },
      { key: "network.editAccessPoints", label: "Edit access points" },
      { key: "network.viewPppoeUserDetails", label: "View PPPoE user details" },
      { key: "network.editPppoeUsers", label: "Edit PPPoE users" },
      { key: "network.viewIpBindingDetails", label: "View IP binding details" },
      { key: "network.editIpBindings", label: "Edit IP bindings" },
      { key: "network.viewEquipment", label: "View equipment" },
      { key: "network.addEquipment", label: "Add equipment" },
      { key: "network.viewRouterDetails", label: "View router details" },
      { key: "network.editRouters", label: "Edit routers" },
      { key: "network.viewAccessPoints", label: "View access points" },
      { key: "network.addAccessPoints", label: "Add access points" },
      { key: "network.viewPppoeUsers", label: "View PPPoE users" },
      { key: "network.createPppoeUsers", label: "Create PPPoE users" },
      { key: "network.viewIpBindings", label: "View IP bindings" },
      { key: "network.createBindings", label: "Create bindings" },
      { key: "network.deleteIpBindings", label: "Delete IP bindings" },
      { key: "network.viewEquipmentDetails", label: "View equipment details" },
      { key: "network.editEquipment", label: "Edit equipment" },
    ],
  },
  {
    key: "communication",
    label: "Communication",
    permissions: [
      { key: "communication.viewMessages", label: "View messages" },
      { key: "communication.editMessages", label: "Edit messages" },
      { key: "communication.createCampaigns", label: "Create campaigns" },
      { key: "communication.viewLeads", label: "View leads" },
      { key: "communication.editLeads", label: "Edit leads" },
      { key: "communication.createAdvertisements", label: "Create advertisements" },
      { key: "communication.sendMessages", label: "Send messages" },
      { key: "communication.viewCampaigns", label: "View campaigns" },
      { key: "communication.editCampaigns", label: "Edit campaigns" },
      { key: "communication.createLeads", label: "Create leads" },
      { key: "communication.viewAdvertisements", label: "View advertisements" },
      { key: "communication.editAdvertisements", label: "Edit advertisements" },
    ],
  },
  {
    key: "settingsTeam",
    label: "Settings & Team",
    permissions: [
      { key: "settingsTeam.manageTenantSettings", label: "Manage tenant settings" },
      { key: "settingsTeam.manageStaffAccessRoles", label: "Manage staff and access roles" },
      { key: "settingsTeam.viewReferrals", label: "View referrals" },
    ],
  },
  {
    key: "dashboardWidgets",
    label: "Dashboard Widgets",
    permissions: [
      { key: "widgets.overviewStatistics", label: "Overview statistics" },
      { key: "widgets.paymentTrends", label: "Payment trends" },
      { key: "widgets.activeUserChart", label: "Active-user chart" },
      { key: "widgets.smsChart", label: "SMS chart" },
      { key: "widgets.withdrawalStatistics", label: "Withdrawal statistics" },
      { key: "widgets.balanceOperationalStatistics", label: "Balance and operational statistics" },
      { key: "widgets.packagePerformance", label: "Package performance" },
      { key: "widgets.userRegistrationsChart", label: "User registrations chart" },
      { key: "widgets.referralStatistics", label: "Referral statistics" },
    ],
  },
];

export type AccessRolePermissions = Record<string, boolean>;

export type AccessRolePreset = {
  key: string;
  name: string;
  description: string;
  locked: boolean; // system role — always full access, can't be restricted or deleted
  build: () => AccessRolePermissions;
};

function setGroups(groupKeys: string[], value: boolean): AccessRolePermissions {
  const result: AccessRolePermissions = {};
  ACCESS_PERMISSION_GROUPS.forEach((group) => {
    if (groupKeys.includes(group.key)) {
      group.permissions.forEach((perm) => {
        result[perm.key] = value;
      });
    }
  });
  return result;
}

function allPermissions(value: boolean): AccessRolePermissions {
  const result: AccessRolePermissions = {};
  ACCESS_PERMISSION_GROUPS.forEach((group) => {
    group.permissions.forEach((perm) => {
      result[perm.key] = value;
    });
  });
  return result;
}

export const ACCESS_ROLE_PRESETS: AccessRolePreset[] = [
  {
    key: "administrator",
    name: "Administrator",
    description: "Full tenant access. This role cannot be restricted.",
    locked: true,
    build: () => allPermissions(true),
  },
  {
    key: "customer-support",
    name: "Customer Support",
    description: "Customers, active sessions, voucher assistance and tickets. No financial access.",
    locked: false,
    build: () => ({
      ...setGroups(["customersSupport"], true),
      "support.deleteCustomers": false,
      "finance.viewVouchers": true,
      "finance.viewVoucherDetails": true,
      "finance.editVouchers": true,
      "finance.viewPackageDetails": true,
      "finance.viewPackages": true,
      "widgets.overviewStatistics": true,
      "widgets.activeUserChart": true,
      "widgets.userRegistrationsChart": true,
    }),
  },
  {
    key: "finance-sales",
    name: "Finance & Sales",
    description: "Payments, vouchers, packages, expenses and revenue. No withdrawals or gateway credentials by default.",
    locked: false,
    build: () => ({
      ...setGroups(["financeSales"], true),
      "finance.requestWithdrawals": false,
      "widgets.overviewStatistics": true,
      "widgets.paymentTrends": true,
      "widgets.balanceOperationalStatistics": true,
      "widgets.packagePerformance": true,
    }),
  },
  {
    key: "network-technician",
    name: "Network Technician",
    description: "Routers, access points, PPPoE, IP bindings and equipment. No financial access.",
    locked: false,
    build: () => ({
      ...setGroups(["network"], true),
      "widgets.overviewStatistics": true,
    }),
  },
];

export function countAccessPermissions(permissions: AccessRolePermissions, groupKey?: string) {
  const relevantKeys = groupKey
    ? ACCESS_PERMISSION_GROUPS.find((g) => g.key === groupKey)?.permissions.map((p) => p.key) ?? []
    : ACCESS_PERMISSION_GROUPS.flatMap((g) => g.permissions.map((p) => p.key));

  let allowed = 0;
  relevantKeys.forEach((key) => {
    if (permissions[key]) allowed += 1;
  });
  return { allowed, total: relevantKeys.length };
}

export type SystemUser = {
  id: string;
  name: string;
  email: string;
  phone: string;
  accessRoleKey: string;
  twoFactorEnabled: boolean;
  isOwner: boolean;
  avatarDataUrl: string | null;
  createdAt: string;
};

export const INITIAL_SYSTEM_USERS: SystemUser[] = [
  {
    id: "sysuser-owner",
    name: "gabriel jomo",
    email: "mrjomolin@gmail.com",
    phone: "233241948202",
    accessRoleKey: "administrator",
    twoFactorEnabled: false,
    isOwner: true,
    avatarDataUrl: null,
    createdAt: "01 Jan 2026",
  },
];

// --- Removing users -----------------------------------------------------
//
// Two rules, kept here so the Users screen and the data layer always agree:
//   1. The last remaining user can never be removed — someone has to be
//      able to run the dashboard. Add another user first.
//   2. Once there are two or more, anyone can be removed, including the
//      account owner. When the owner goes, the next user takes over as
//      admin (and becomes the owner).

export const ONLY_USER_MESSAGE =
  "You're the only user, so you can't be removed. Add another user first.";

export function canRemoveSystemUser(users: SystemUser[], id: string): boolean {
  return users.length > 1 && users.some((user) => user.id === id);
}

// Who inherits the admin role when `removedId` is taken out: an existing
// Administrator comes first (the longest-standing one), otherwise whoever
// was added earliest. Users are kept in the order they were added, so
// "earliest" is simply the first one found.
export function pickSuccessor(users: SystemUser[], removedId: string): SystemUser | null {
  const remaining = users.filter((user) => user.id !== removedId);
  return remaining.find((user) => user.accessRoleKey === "administrator") ?? remaining[0] ?? null;
}
