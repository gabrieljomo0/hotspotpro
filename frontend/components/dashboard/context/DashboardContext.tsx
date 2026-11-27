"use client";

import type { MasterPortalSettings } from "../routers/masterPortal";
import {
  DEFAULT_ROUTER_CLEANUP,
  expiredVouchersFor,
  inactiveUsers,
  isDue,
  staleCookies,
  type RouterCleanupSettings,
} from "../routers/routerCleanup";
import { sym, localizeAmountString } from "@/components/dashboard/shared/currency";
import { useNotifications } from "./useNotifications";
import { useUiPreferences } from "./useUiPreferences";
import { useRouterState } from "./useRouterState";
import { useAccessPointState } from "./useAccessPointState";
import { useMomoIntegrationState } from "./useMomoIntegrationState";
import { useSubscriptionState } from "./useSubscriptionState";
import { useRevenueSettingsState } from "./useRevenueSettingsState";
import { useAgentState } from "./useAgentState";
import { usePackageState, initialPackages } from "./usePackageState";
import { makePackageGuard } from "../agents/agentPackages";
import { useAlertsState } from "./useAlertsState";
import { nowTimestamp, DEFAULT_AGENT_ID } from "./utils";
import { usePersistedState, useSyncReady } from "./usePersistedState";
import { queueRouterAction, queueRouterActionMany } from "./queueRouterAction";
import { persistNow } from "./syncClient";
import type { RouterTaskKind } from "../routers/routerTasks";
import { reconcileBatchesFromVouchers } from "../vouchers/reconcileBatches";
import { loginMethodForRouterIps } from "../vouchers/voucherLoginFromPortal";
import { VOUCHER_BATCH_MAX, resolveVoucherQuantity } from "../vouchers/voucherQuantity";
import { normalizeVoucherRouterIps } from "../vouchers/voucherRouterScope";
import {
  createContext,
  useContext,
  useEffect,
  useRef,
  useState,
  type ReactNode,
} from "react";

import {
  initialActiveUsers,
  routers as initialRoutersData,
  type ActiveUser,
  type RouterInfo,
  type RouterISPLink,
} from "../data/dashboard-data";
import {
  ADMIN_ROLE_PRESETS,
  type AdminPermissions,
  type AdminTeamMember,
} from "../settings/adminPermissionSchema";
import {
  type AccessRolePermissions,
  type SystemUser,
} from "../settings/systemUsersSchema";
import { useSystemUsersState } from "./useSystemUsersState";
import { useVoucherAlertLog } from "./useVoucherAlertLog";
import type { NewAgentErrors, NewAgentInput } from "../agents/agentSignup";
import { useAgentCollectionsState } from "./useAgentCollectionsState";
import type { AgentCollection, CollectionMethod } from "../agents/agentLedger";
import { EVERYTHING, siteIdOfScope, type DashboardScope } from "../overview/dashboardScope";
import {
  composeVoucherAlertMessage,
  resolveVoucherAlertDeliveries,
  validateCustomCredentials,
  settingsOf,
  type VoucherAlertLogEntry,
} from "../agents/agentSettings";
import {
  PERMISSION_PRESETS,
  presetNameForRole,
  type PermissionPresetName,
} from "../agents/permissionSchema";
import type {
  ConfirmAction,
  UserConnectionStateMap,
  Package,
  PackageInput,
  PackageStatus,
  Voucher,
  VoucherCodeFormat,
  VoucherLoginMethod,
  VoucherLimitBy,
  VoucherCountFrom,
  VoucherPreset,
  VoucherBatch,
  VoucherDelivery,
  VoucherSaleType,
  BrandingSettings,
  PortalControls,
  AgentProfile,
  AgentRole,
  AgentStatus,
  AgentPermissions,
  AgentLimits,
  AgentDevice,
  ApprovalRequest,
  ApprovalType,
  AgentMessageTrigger,
  AgentMessageTemplates,
  AgentEmail,
  AgentMessageLogEntry,
  SubscriptionPlan,
  BillingModel,
  HotspotSettings,
  ActivityLogEntry,
  AlertRule,
  AlertRuleType,
  AlertEvent,
  VoucherCleanupPolicy,
  HistoryRetention,
  LoyaltySettings,
  HotspotPolicySettings,
  CaptivePortalConfig,
  PaymentSettings,
  PaymentGatewayStrategy,
  PaymentGatewayRequest,
  SecuritySettings,
  SitesSettings,
  LinkedSite,
  BusinessLocation,
  AccessPointDevice,
  AccessPointStatus,
  MomoIntegrationSettings,
  SubscriptionSettings,
  RevenueSettings,
  InstallerProfile,
  InstallDispatch,
  NotificationSettings,
  ShopProduct,
  CommissionSettings,
  RouterConfig,
  AgentSettings,
} from "../shared/types";
import { defaultPermissionsForRole } from "../agents/permissionSchema";

type DashboardContextValue = {
  // sidebar / theme
  mobileSidebarOpen: boolean;
  setMobileSidebarOpen: (value: boolean) => void;
  sidebarCollapsed: boolean;
  setSidebarCollapsed: (updater: (current: boolean) => boolean) => void;
  darkMode: boolean;
  themeLoaded: boolean;
  toggleTheme: () => void;
  dashboardLanguage: string;
  dashboardPeriod: "Today" | "This Week" | "This Month" | "This Year";
  setDashboardPeriod: (period: "Today" | "This Week" | "This Month" | "This Year") => void;
  // What the main dashboard is showing: the whole business (the default) or
  // one site, router or agent. It lives here so the filter on the dashboard
  // and the site menu in the top bar are the same thing.
  dashboardScope: DashboardScope;
  setDashboardScope: (scope: DashboardScope) => void;
  // The site the dashboard is currently looking at ("all" = every site).
  selectedSiteId: string;
  setSelectedSiteId: (siteId: string) => void;
  updateDashboardLanguage: (language: string) => void;

  // users data
  users: ActiveUser[];
  findUser: (userId: string) => ActiveUser | undefined;
  userConnectionState: UserConnectionStateMap;
  getConnectionState: (userId: string) => {
    paused: boolean;
    disconnected: boolean;
    blocked: boolean;
  };
  togglePauseUser: (userId: string) => void;
  toggleDisconnectUser: (userId: string) => void;
  toggleBlockUser: (userId: string) => void;
  extendUserAccess: (userId: string, extension: string) => void;
  topUpUserData: (userId: string, extraGb: number) => void;
  dataRemainingMb: Record<string, number>;
  changeUserPackage: (userId: string, newPackage: string) => void;
  resetUserPassword: (userId: string) => string;
  deleteUser: (userId: string, reason?: string) => void;
  copyLoginDetails: (userId: string) => Promise<void>;

  // row action dropdowns
  openUserAction: string | null;
  openUserActions: (userId: string) => void;
  openRouterAction: string | null;
  openRouterActions: (ip: string) => void;
  closeAllActionMenus: () => void;

  // routers
  routerEnabled: Record<string, boolean>;
  routers: RouterInfo[];
  addRouter: (input: {
    name: string;
    ip?: string;
    hasWireless?: boolean;
    wanInterface?: string;
    managementPort?: string;
    lastPortFree?: boolean;
    adminFromWan?: boolean;
    wifiSsid?: string;
    routerType?: "New Router" | "Existing Router";
    hotspotEnabled?: boolean;
    loginMode?: "cloud" | "local";
    hotspotNetwork?: string;
    hotspotGatewayIp?: string;
    hotspotDnsServers?: string;
    hotspotLoginUrl?: string;
    pppoeEnabled?: boolean;
    pppoeNetwork?: string;
    dnsName?: string;
    siteId?: string;
    newSiteName?: string;
    provisioningToken?: string;
    provisioned?: boolean;
  }) => RouterInfo;
  businessLocations: BusinessLocation[];
  addBusinessLocation: (name: string) => BusinessLocation;
  updateBusinessLocationSsid: (
    siteId: string,
    updates: { ssidMode?: "perRouter" | "siteWide"; siteWideSsid?: string },
  ) => void;
  toggleSiteEnabled: (siteId: string) => void;
  accessPoints: AccessPointDevice[];
  findAccessPoint: (id: string) => AccessPointDevice | undefined;
  addAccessPoint: (input: {
    name: string;
    macAddress: string;
    ipAddress: string;
    model: string;
    siteId: string | null;
    routerIp: string | null;
  }) => AccessPointDevice;
  updateAccessPoint: (
    id: string,
    updates: Partial<Pick<AccessPointDevice, "name" | "macAddress" | "ipAddress" | "model" | "siteId" | "routerIp">>,
  ) => void;
  deleteAccessPoint: (id: string) => void;
  setAccessPointStatus: (id: string, status: AccessPointStatus) => void;
  momoSettings: MomoIntegrationSettings;
  updateMomoSettings: (updates: Partial<MomoIntegrationSettings>) => void;
  saveMomoSettings: () => void;
  testMomoConnection: () => void;
  autoRenewDisabledPhones: string[];
  disableAutoRenewForCustomer: (phone: string) => void;
  enableAutoRenewForCustomer: (phone: string) => void;
  subscription: SubscriptionSettings;
  renewSubscription: (input: { months: number; paymentMethod: string; phone: string }) => string;
  setBillingModel: (model: BillingModel) => void;
  payCommission: (input: { amount: number; paymentMethod: string; phone: string }) => string;
  revenueSettings: RevenueSettings;
  updateRevenueSettings: (updates: Partial<RevenueSettings>) => void;
  saveRevenueSettings: () => void;
  applyCaptivePortalToSites: (sourceRouterIp: string, targetSiteIds: string[] | "all") => void;
  installers: InstallerProfile[];
  addInstaller: (name: string, email: string, phone: string) => InstallerProfile;
  registerInstaller: (name: string, email: string, phone: string, password: string) => InstallerProfile | null;
  installDispatches: InstallDispatch[];
  assignInstallerToSite: (installerId: string, siteId: string, routerIp?: string | null) => void;
  dispatchToClient: (dispatchId: string, clientName: string, clientEmail: string, clientPhone: string) => void;
  inviteManagerToSite: (requestingAgentId: string, name: string, email: string) => AgentProfile | null;
  runRouterHealthCheck: (ip: string) => void;
  fullProvisionRouter: (ip: string) => void;
  routerTask: {
    kind: RouterTaskKind;
    ip: string;
    name: string;
    status: "confirm" | "running" | "done" | "failed";
    doneCount: number;
    error: string | null;
    jobId: string | null;
    startedAt: number;
  } | null;
  startRouterTask: (kind: RouterTaskKind, ip: string) => void;
  confirmRouterTask: () => void;
  closeRouterTask: () => void;
  regenerateApiCredentials: (ip: string) => void;
  regenerateWinboxAddress: (ip: string) => void;
  syncHotspotFiles: (ip: string) => void;
  syncRouterTime: (ip: string) => void;
  configureSnmp: (ip: string) => void;
  configureWalledGarden: (ip: string) => void;
  hardenServices: (ip: string) => void;
  updateRouterScript: (ip: string) => void;
  downloadRouterFile: (ip: string, kind: "provision-script" | "wireguard-config" | "winbox-config") => void;
  updateRouterNotificationContacts: (ip: string, phones: string[], emails: string[]) => void;
  updateMultiWanConfig: (ip: string, mode: RouterInfo["multiWanMode"], ispLinks: RouterISPLink[], silent?: boolean) => void;
  updateRouterDetails: (ip: string, updates: Partial<RouterInfo>) => void;
  applyRouterPatch: (ip: string, patch: Partial<RouterInfo>) => void;
  toggleRemoteAccess: (ip: string, enabled?: boolean) => void;
  updateConnectionMode: (ip: string, mode: RouterInfo["connectionMode"]) => void;
  deleteRouter: (ip: string) => void;
  syncRouter: (ip: string) => void;
  restartRouter: (ip: string) => void;
  toggleRouterPaused: (ip: string) => void;
  toggleRouterConnection: (ip: string) => void;
  getRouterConfig: (ip: string) => RouterConfig;
  getEffectiveSsid: (ip: string) => string;
  masterPortal: MasterPortalSettings;
  setMasterPortal: React.Dispatch<React.SetStateAction<MasterPortalSettings>>;
  updateRouterConfig: (ip: string, updates: Partial<RouterConfig>) => void;
  confirmAction: ConfirmAction | null;
  requestConfirmAction: (action: ConfirmAction) => void;
  cancelConfirmAction: () => void;
  confirmDialogAction: () => void;

  // toast
  toastMessage: string | null;
  showToast: (message: string) => void;

  // packages
  packages: Package[];
  findPackage: (id: string) => Package | undefined;
  // null when the acting agent hasn't been allowed to create packages.
  addPackage: (input: PackageInput) => Package | null;
  updatePackage: (id: string, input: PackageInput) => void;
  setPackageStatus: (id: string, status: PackageStatus) => void;
  deletePackage: (id: string) => void;
  duplicatePackage: (id: string) => Package | undefined;
  expirePackageVouchers: (packageName: string) => void;
  pushPackageToAgents: (packageId: string, agentIds: string[]) => void;
  removePackagePush: (packageId: string, agentId: string) => void;

  // vouchers
  vouchers: Voucher[];
  defaultVoucherCleanupPolicy: VoucherCleanupPolicy;
  routerVoucherCleanupPolicies: Record<string, VoucherCleanupPolicy>;
  getVoucherCleanupPolicy: (routerIp: string | null) => VoucherCleanupPolicy;
  updateDefaultVoucherCleanupPolicy: (updates: Partial<VoucherCleanupPolicy>) => void;
  updateRouterVoucherCleanupPolicy: (routerIp: string, updates: Partial<VoucherCleanupPolicy>) => void;
  clearRouterVoucherCleanupOverride: (routerIp: string) => void;
  runVoucherCleanup: () => number;
  routerCleanup: Record<string, RouterCleanupSettings>;
  getRouterCleanup: (routerIp: string) => RouterCleanupSettings;
  updateRouterCleanup: (routerIp: string, updates: Partial<RouterCleanupSettings>, quiet?: boolean) => void;
  runRouterCleanup: (routerIp: string) => { users: number; vouchers: number; cookies: number };
  findVoucher: (code: string) => Voucher | undefined;
  generateVouchers: (
    packageName: string,
    quantity: number,
    delivery: VoucherDelivery,
  ) => Voucher[];
  createVoucher: (
    packageName: string,
    delivery: VoucherDelivery,
    customCode?: string,
  ) => Voucher;
  assignVoucher: (
    code: string,
    customerId: string,
    phone: string,
    saleType: VoucherSaleType,
  ) => void;
  deleteVoucher: (code: string) => void;
  expireVouchers: (codes: string[]) => void;
  resendVoucherSms: (code: string) => void;
  bulkAssignVouchersToBatch: (codes: string[], batchRef: string | null) => void;
  bulkUpdateVoucherPackage: (codes: string[], newPackageName: string) => void;
  bulkAssignVouchersToAgents: (codes: string[], agentIds: string[]) => void;
  voucherBatches: VoucherBatch[];
  voucherPresets: VoucherPreset[];
  saveVoucherPreset: (
    input: Omit<VoucherPreset, "id" | "createdAt" | "pushedToAgentIds" | "ownerAgentId">,
    ownerAgentId?: string,
  ) => VoucherPreset;
  deleteVoucherPreset: (id: string) => void;
  updateVoucherPreset: (id: string, input: Omit<VoucherPreset, "id" | "createdAt" | "pushedToAgentIds" | "ownerAgentId">) => void;
  pushVoucherPresetToAgents: (presetId: string, agentIds: string[], grantAccess?: boolean) => void;
  removeVoucherPresetPush: (presetId: string, agentId: string) => void;
  deleteVoucherBatch: (batchId: string, keepVouchers?: boolean, preserveForPushedAgents?: boolean) => void;
  findBatch: (id: string) => VoucherBatch | undefined;
  generateVoucherBatch: (input: {
    packageName: string;
    reference: string;
    quantity: number;
    codeFormat: VoucherCodeFormat;
    codeLength: number;
    prefix: string;
    note: string;
    isGiveaway: boolean;
    routerIps: string[];
    assignedAgentIds: string[];
    loginMethod?: VoucherLoginMethod;
    limitBy?: VoucherLimitBy;
    countFrom?: VoucherCountFrom;
    actingAgentId?: string;
    // Only for a single voucher: the username (code) and/or password the
    // person creating it wants, instead of auto-generated ones. Agents can
    // only use these when the organization allows custom credentials.
    customCode?: string;
    customPassword?: string;
    /** When set, new codes are added to this batch instead of creating a new one. */
    appendToBatchId?: string;
  }) => VoucherBatch | null;
  isVoucherBatchVisibleToAgent: (batch: VoucherBatch, agentId: string) => boolean;
  getAgentsOnRouters: (routerIps: string[]) => AgentProfile[];
  getAssignedVoucherBatchesForAgent: (agentId: string) => VoucherBatch[];
  setBatchPrintDesign: (batchId: string, printDesign: string) => void;
  toggleWalletFundingRequirement: (agentId: string) => void;
  getMaxAffordableVouchers: (agentId: string, packageName: string) => number | null;

  // branding / settings
  branding: BrandingSettings;
  updateBranding: (updates: Partial<BrandingSettings>) => void;

  // portal-wide controls
  portalControls: PortalControls;
  updatePortalControls: (updates: Partial<PortalControls>) => void;

  // hotspot settings
  hotspotSettings: HotspotSettings;
  updateHotspotSettings: (updates: Partial<HotspotSettings>) => void;

  // agent profiles
  agents: AgentProfile[];
  currentAgentId: string;
  currentAgent: AgentProfile;
  findAgent: (id: string) => AgentProfile | undefined;
  addAgent: (
    name: string,
    email: string,
    role: AgentRole,
    routerIp?: string | null,
    extra?: {
      phone?: string;
      whatsapp?: string;
      location?: string;
      password?: string;
      username?: string;
      appliedViaPortal?: boolean;
      idFrontFileName?: string;
      idBackFileName?: string;
      faceCaptureFileName?: string;
      idFrontImage?: string;
      idBackImage?: string;
      faceCaptureImage?: string;
    },
  ) => AgentProfile;
  deleteAgent: (id: string) => void;
  switchCurrentAgent: (id: string) => void;
  actAsAgent: (id: string) => void;
  // True once saved data (from earlier visits / other tabs) has been loaded.
  storeReady: boolean;
  setAgentStatus: (id: string, status: AgentStatus) => void;
  dispatchAgentAccess: (id: string, accessType: "Permanent" | "Temporary", allowAdminAccess: boolean) => void;
  isAgentDashboardLockedForAdmin: (agent: AgentProfile) => boolean;
  revokeAgentAccess: (id: string) => void;
  setInstallerSupportAccess: (agentId: string, allow: boolean) => void;
  resetAgentPassword: (id: string) => void;
  resetAgentPin: (id: string) => void;
  updateAgentContactDetails: (
    id: string,
    updates: Partial<Pick<AgentProfile, "phone" | "whatsapp" | "email" | "location" | "idFrontFileName" | "idBackFileName" | "faceCaptureFileName">>,
  ) => void;
  setInitialIdentityDetails: (id: string, ghanaCardNumber: string, dateOfBirth: string) => void;
  requestAgentDetailChange: (id: string, field: "ghanaCardNumber" | "dateOfBirth", newValue: string) => void;
  changeAgentCredentials: (id: string, updates: { username?: string; password?: string }) => void;
  forceLogoutAgent: (id: string) => void;
  updateAgentProfile: (id: string, updates: { name?: string; email?: string; phone?: string | null }) => void;
  // The admin editing an agent's name, phone, location and private notes.
  updateAgentAdminDetails: (
    id: string,
    updates: { name: string; phone: string; location: string; notes: string; email?: string; username?: string },
  ) => boolean;
  // Money collected from agents for vouchers they sold from stock you gave them.
  agentCollections: AgentCollection[];
  recordAgentCollection: (input: {
    agentId: string;
    amount: number;
    method: CollectionMethod;
    collectedOnMs: number;
    reference: string;
    note: string;
  }) => AgentCollection | null;
  deleteAgentCollection: (id: string) => void;
  updateAgentPermissions: (id: string, permissions: AgentPermissions) => void;
  agentRolePermissions: Record<PermissionPresetName, AgentPermissions>;
  toggleAgentRolePermission: (presetName: PermissionPresetName, permissionKey: string) => void;
  resetAgentRolePermissions: (presetName: PermissionPresetName) => void;
  updateAgentLimits: (id: string, limits: AgentLimits) => void;
  updateAgentRouter: (id: string, routerIp: string) => void;
  adjustAgentWallet: (id: string, amount: number, note: string) => void;
  applyAgentDashboardMode: (
    agentId: string,
    mode: "viewOnly" | "voucherCreator" | "custom",
    defaultPackageName?: string | null,
  ) => void;
  toggleAgentWalletTopUp: (agentId: string) => void;
  setAgentDeviceStatus: (
    agentId: string,
    deviceId: string,
    status: AgentDevice["status"],
  ) => void;
  approvalRequests: ApprovalRequest[];
  submitApprovalRequest: (
    type: ApprovalType,
    agentId: string,
    agentName: string,
    summary: string,
  ) => ApprovalRequest;
  decideApproval: (
    id: string,
    decision: "Approved" | "Rejected",
    reason: string,
  ) => void;
  messageTemplates: AgentMessageTemplates;
  updateMessageTemplate: (trigger: AgentMessageTrigger, message: string) => void;
  agentMessageLog: AgentMessageLogEntry[];
  sendAgentMessage: (agent: AgentProfile, trigger: AgentMessageTrigger) => void;

  // subscription
  subscriptionPlan: SubscriptionPlan;
  setSubscriptionPlan: (plan: SubscriptionPlan) => void;

  // history
  activityLog: ActivityLogEntry[];
  alertRules: AlertRule[];
  updateAlertRule: (id: string, updates: Partial<AlertRule>) => void;
  addAlertRule: (rule: Omit<AlertRule, "id">) => AlertRule;
  deleteAlertRule: (id: string) => void;
  fireAlert: (
    type: AlertRuleType,
    message: string,
    context?: { routerIp?: string; businessId?: string; agentId?: string },
  ) => void;
  markAlertRead: (id: string) => void;
  getAdminAlerts: () => AlertEvent[];
  getAgentAlerts: (agentId: string) => AlertEvent[];
  logActivity: (category: ActivityLogEntry["category"], message: string) => void;
  clearHistory: () => void;
  historyRetention: HistoryRetention;
  updateHistoryRetention: (retention: HistoryRetention) => void;
  dataUsageResetAt: string | null;
  clearDataUsageHistory: () => void;

  // loyalty
  loyaltySettings: LoyaltySettings;
  updateLoyaltySettings: (updates: Partial<LoyaltySettings>) => void;
  loyaltyStrategy: "same" | "per-business";
  updateLoyaltyStrategy: (strategy: "same" | "per-business") => void;
  getLoyaltySettingsForBusiness: (businessId: string) => LoyaltySettings;
  updateBusinessLoyaltySettings: (businessId: string, updates: Partial<LoyaltySettings>) => void;
  hotspotPolicySettings: HotspotPolicySettings;
  updateHotspotPolicySettings: (updates: Partial<HotspotPolicySettings>) => void;
  adminRolePermissions: Record<string, AdminPermissions>;
  updateAdminRolePermission: (roleKey: string, permissionKey: string, state: AdminPermissions[string]) => void;
  resetAdminRoleToPreset: (roleKey: string) => void;
  adminTeam: AdminTeamMember[];
  addAdminTeamMember: (name: string, email: string, phone: string, roleKey: string) => AdminTeamMember;
  updateAdminTeamMemberRole: (id: string, roleKey: string) => void;
  setAdminTeamMemberStatus: (id: string, status: AdminTeamMember["status"]) => void;
  removeAdminTeamMember: (id: string) => void;
  systemUsers: SystemUser[];
  addSystemUser: (input: {
    name: string;
    email: string;
    phone: string;
    accessRoleKey: string;
    avatarDataUrl: string | null;
  }) => SystemUser;
  updateSystemUser: (
    id: string,
    updates: Partial<Pick<SystemUser, "name" | "email" | "phone" | "accessRoleKey" | "avatarDataUrl">>,
  ) => void;
  deleteSystemUser: (id: string) => void;
  toggleSystemUserTwoFactor: (id: string) => void;
  accessRolePermissions: Record<string, AccessRolePermissions>;
  toggleAccessRolePermission: (roleKey: string, permissionKey: string) => void;
  updateAccessRoleMeta: (roleKey: string, updates: { name?: string; description?: string }) => void;
  accessRoleOverrides: Record<string, { name: string; description: string }>;
  resetAccessRoleToDefault: (roleKey: string) => void;
  getCaptivePortalConfig: (routerIp: string) => CaptivePortalConfig;
  updateCaptivePortalConfig: (routerIp: string, updates: Partial<CaptivePortalConfig>) => void;
  getCaptivePortalConfigForSite: (siteId: string) => CaptivePortalConfig;
  updateCaptivePortalConfigForSite: (siteId: string, updates: Partial<CaptivePortalConfig>) => void;
  paymentSettings: PaymentSettings;
  updatePaymentSettings: (updates: Partial<PaymentSettings>) => void;
  paymentGatewayStrategy: PaymentGatewayStrategy;
  updatePaymentGatewayStrategy: (strategy: PaymentGatewayStrategy) => void;
  businessPaymentConfigs: Record<string, PaymentSettings>;
  getPaymentSettingsForBusiness: (businessId: string) => PaymentSettings;
  updateBusinessPaymentSettings: (businessId: string, updates: Partial<PaymentSettings>) => void;
  requestPaymentGateway: (request: Omit<PaymentGatewayRequest, "id" | "requestedAt">) => void;
  securitySettings: SecuritySettings;
  updateSecuritySettings: (updates: Partial<SecuritySettings>) => void;
  sitesSettings: SitesSettings;
  addLinkedSite: (name: string, subdomain: string) => void;
  removeLinkedSite: (id: string) => void;
  notificationSettings: NotificationSettings;
  updateNotificationSettings: (updates: Partial<NotificationSettings>) => void;
  getLoyaltyPoints: (userId: string) => number;
  redeemLoyaltyPoints: (userId: string) => void;

  // commission
  commissionSettings: CommissionSettings;
  maxAgentCommissionPercent: number;
  // Saves one agent's settings: what they may see and do, and how you hear
  // about what they do (the Settings tab on the agent's own page).
  updateAgentSettings: (id: string, next: AgentSettings) => void;
  setDefaultAgentLogin: (id: string, enabled: boolean) => void;
  setAgentPortalAccess: (id: string, enabled: boolean) => void;
  // You adding an agent from the Add agent window: active straight away, with
  // a temporary password to hand to them.
  createAgentByAdmin: (
    input: NewAgentInput,
  ) => { ok: true; agent: AgentProfile; password: string } | { ok: false; errors: NewAgentErrors };
  // The ID photos and selfie sent with captive-portal applications, by agent id.
  applicationFiles: Record<string, { idFront?: string; idBack?: string; face?: string }>;
  // Applications the admin has already been told about or has looked at.
  notifiedApplicationIds: string[];
  markApplicationsNotified: (ids: string[]) => void;
  agentEmails: AgentEmail[];
  markAgentEmailOpened: (id: string) => void;
  loadSampleApplications: () => number;
  removeSampleApplications: () => void;
  // A record of the "agent generated vouchers" summaries (email / SMS).
  voucherAlertLog: VoucherAlertLogEntry[];
  updateMaxAgentCommissionPercent: (percent: number) => void;
  setAgentCommissionRate: (id: string, ratePercent: number) => void;
  setAgentMaxResaleMarkup: (id: string, percent: number | null) => void;
  acknowledgeResaleRule: (id: string) => void;
  updateCommissionSettings: (updates: Partial<CommissionSettings>) => void;

  // shop
  shopProducts: ShopProduct[];
  likedProductIds: string[];
  toggleLikeProduct: (productId: string) => void;
  purchaseProduct: (productId: string) => void;
};

const DashboardContext = createContext<DashboardContextValue | null>(null);

// Set to true once the real backend is ready — while false, users are never
// auto-removed for running out of time or data, so test data stays put.
const AUTO_EXPIRY_ENABLED = false;

const initialPortalControls: PortalControls = {
  hotspotEnabled: true,
  pppoeEnabled: true,
  voucherSalesEnabled: true,
  resellerPortalEnabled: true,
  customerSelfRegistration: true,
  smsNotifications: false,
};

const initialLoyaltySettings: LoyaltySettings = {
  enabled: false,
  pointsPerHourOnline: 5,
  pointsToVoucherThreshold: 100,
  rewardPackageName: "Daily Plan",
};

const initialHotspotPolicySettings: HotspotPolicySettings = {
  mobileMoneyVoucherCodeLength: 8,
  printedVoucherDefaultLength: 5,
  printedVoucherDefaultFormat: "Alphanumeric (A-Z, 0-9)",
  voucherGenerationStyle: "Voucher Studio (new)",
  voucherCodePrefix: "",
  customerIdPrefix: "HS",

  pruneInactiveUsersAfterDays: 7,
  autoReconnectMethod: "MAC-Cookie (Recommended)",
  deviceRememberDurationDays: 30,

  agentPortalEnabled: true,
  allowAgentsToViewVoucherCodes: true,
  agentResellingEnabled: true,
  agentPricingModel: "Per Package — Set a custom agent price on each package",
  voucherMinQuantity: 1,
  voucherMaxQuantity: 100,
  smsVoucherSalesEnabled: false,

  pppoeSelfRegistrationEnabled: false,

  tetheringProtectionEnabled: true,
  tetheringAction: "Block Connection",
};

const initialPaymentSettings: PaymentSettings = {
  gateway: "Hubtel",
  sandboxMode: false,
  consumerKey: "",
  consumerSecret: "",
  ipnId: "",
};

const initialSecuritySettings: SecuritySettings = {
  orgTwoFactorEnabled: true,
  require2FAForAllUsers: false,
  trustDeviceDurationDays: 30,
  personalTwoFactorEnabled: false,
};

const initialSitesSettings: SitesSettings = {
  currentSiteName: "JNET",
  currentSiteDomain: "jnet.hotspotpro.com",
  linkedSites: [],
};

const initialNotificationSettings: NotificationSettings = {
  mikrotikStatusEnabled: true,
  mikrotikNotificationPhones: "",
  mikrotikNotificationEmails: "",

  sendVoucherCodeBySms: true,
  sendHotspotCredentialsMessage: true,
  hotspotCredentialsMessage:
    "@company_name WiFi\n\nVoucher: @password\nPackage: @package_name\nValidity: @validity",
  sendPaymentReceiptSms: true,

  sendExpiryNotification: true,
  hotspotExpiryMessage:
    "@company_name: Your internet package has expired.\nPackage: @package_name\nPlease renew at @portal_url to continue using the internet.\nSupport: @support_number",
  sendExpiryReminder: true,
  expiryReminderBefore: "30 minutes before",
  expiryReminderMessage:
    "@company_name: Your internet package expires in @hours_left!\nPackage: @package_name\nExpires: @expiry_date\nRenew now at @portal_url\nSupport: @support_number",

  sendPppoeExpiryReminder: true,
  pppoeReminderBefore: "24 hours before",
  pppoeReminderMessage:
    "@company_name: Your PPPoE subscription expires in @hours_left.\nAccount: @username\nPackage: @package_name\nExpires: @expiry_date\nRenew: @renew_url\nSupport: @support_number",
  sendPppoeExpiryNotification: true,
  pppoeExpiryMessage:
    "@company_name: Your internet subscription has expired.\nPackage: @package_name\nRenew here: @renew_url\nSupport: @support_number",

  otpVerificationMessage:
    "@company_name WiFi\n\nYour verification code is: @otp_code\nValid for @validity minutes.",

  businessPulseEnabled: true,
  businessPulseChannels: {
    dashboard: false,
    browserPush: true,
    sms: false,
    whatsapp: false,
    email: true,
  },
  ownerEmails: "",
  alertVoucherSales: true,
  alertPppoeRenewals: true,
  alertAgentVoucherSales: true,
  minimumSaleAmount: 0,
};

const shopProducts: ShopProduct[] = [
  {
    id: "prod-router-basic",
    name: "MikroTik hAP ac² Router",
    category: "Hardware",
    price: "GH₵ 650.00",
    description: "Dual-band router, ideal for small hotspot sites.",
  },
  {
    id: "prod-router-outdoor",
    name: "Ubiquiti NanoStation Outdoor AP",
    category: "Hardware",
    price: "GH₵ 980.00",
    description: "Long-range outdoor access point for wide coverage.",
  },
  {
    id: "prod-antenna",
    name: "High-Gain Omni Antenna",
    category: "Accessories",
    price: "GH₵ 220.00",
    description: "Boosts signal range for crowded areas.",
  },
  {
    id: "prod-cable",
    name: "50m Outdoor Cat6 Cable",
    category: "Accessories",
    price: "GH₵ 180.00",
    description: "Weatherproof cabling for outdoor router runs.",
  },
  {
    id: "prod-voucher-printer",
    name: "Thermal Voucher Printer",
    category: "Hardware",
    price: "GH₵ 450.00",
    description: "Print vouchers instantly at the counter.",
  },
  {
    id: "prod-branded-cap",
    name: "Branded Staff Cap",
    category: "Merchandise",
    price: "GH₵ 40.00",
    description: "Custom-branded cap for your field agents.",
  },
];

// Parses voucher/package time-left strings like "21h 45m", "5d 18h", "40m"
// into total minutes. This is what a real system's expiry would come from —
// the router/RADIUS session data tied to the voucher or package the user is
// on — so we use it to determine which users expire soonest.
function parseTimeLeftToMinutes(timeLeft: string) {
  const dayMatch = timeLeft.match(/(\d+)\s*d/);
  const hourMatch = timeLeft.match(/(\d+)\s*h/);
  const minMatch = timeLeft.match(/(\d+)\s*m/);

  const days = dayMatch ? Number(dayMatch[1]) : 0;
  const hours = hourMatch ? Number(hourMatch[1]) : 0;
  const minutes = minMatch ? Number(minMatch[1]) : 0;

  return days * 24 * 60 + hours * 60 + minutes;
}

function parseDataToMb(value: string) {
  const gbMatch = value.match(/([\d.]+)\s*GB/i);
  const mbMatch = value.match(/([\d.]+)\s*MB/i);
  if (gbMatch) return Number(gbMatch[1]) * 1024;
  if (mbMatch) return Number(mbMatch[1]);
  return 0;
}

function formatMbToDisplay(mb: number) {
  const safeMb = Math.max(0, mb);
  if (safeMb >= 1024) {
    return `${(safeMb / 1024).toFixed(1)} GB`;
  }
  return `${Math.round(safeMb)} MB`;
}

// Builds real expiry timestamps from each user's actual time-left, exactly
// as MikroTik/RADIUS would track a session's remaining time based on the
// package or voucher the user redeemed — no artificial compression. A user
// with "21h 45m" left will genuinely expire in ~21h 45m of real time.
function buildExpiryTimestamps(users: ActiveUser[]) {
  const now = Date.now();

  return Object.fromEntries(
    users.map((user) => [
      user.phone || user.voucherUsername,
      now + parseTimeLeftToMinutes(user.timeLeft) * 60 * 1000,
    ]),
  );
}


const initialVouchers: Voucher[] = [
  {
    code: "WK-8H2P9",
    password: null,
    packageName: "Weekly Plan",
    status: "Used",
    delivery: "Printed",
    saleType: "Counter Sale",
    usedByCustomerId: "CUS-1120",
    redeemerPhone: "055 123 4567",
    generatedAt: "08 Sep 2026, 07:53",
    generatedAtMs: new Date("2026-09-08T07:53:00").getTime(),
    agentId: DEFAULT_AGENT_ID,
    batchId: null,
  },
  {
    code: "6275906",
    password: null,
    packageName: "5GH",
    status: "Available",
    delivery: "Printed",
    saleType: "Unassigned",
    usedByCustomerId: null,
    redeemerPhone: null,
    generatedAt: "08 Sep 2026, 07:53",
    generatedAtMs: new Date("2026-09-08T07:53:00").getTime(),
    agentId: DEFAULT_AGENT_ID,
    batchId: null,
  },
  {
    code: "5741451",
    password: null,
    packageName: "Daily Plan",
    status: "Used",
    delivery: "SMS",
    saleType: "Online",
    usedByCustomerId: "CUS-1042",
    redeemerPhone: "055 123 4567",
    generatedAt: "07 Sep 2026, 14:10",
    generatedAtMs: new Date("2026-09-07T14:10:00").getTime(),
    agentId: DEFAULT_AGENT_ID,
    batchId: null,
  },
  {
    code: "7222230",
    password: null,
    packageName: "Weekly Plan",
    status: "Used",
    delivery: "Printed",
    saleType: "Counter Sale",
    usedByCustomerId: "CUS-0998",
    redeemerPhone: "024 987 6543",
    generatedAt: "05 Sep 2026, 09:32",
    generatedAtMs: new Date("2026-09-05T09:32:00").getTime(),
    agentId: DEFAULT_AGENT_ID,
    batchId: null,
  },
  {
    code: "3027139",
    password: null,
    packageName: "Monthly Plan",
    status: "Expired",
    delivery: "WhatsApp",
    saleType: "Giveaway",
    usedByCustomerId: null,
    redeemerPhone: "050 111 2233",
    generatedAt: "20 Aug 2026, 12:00",
    generatedAtMs: new Date("2026-08-20T12:00:00").getTime(),
    agentId: DEFAULT_AGENT_ID,
    batchId: null,
  },
];

const initialBranding: BrandingSettings = {
  businessName: "HotspotPro",
  brandColor: "#1a1a1a",
  supportNumber: "233241948202",
  secondSupportNumber: "",
  whatsappNumber: "",
  supportEmail: "support@hotspotpro.com",
  pppoePortalUrl: "https://hotspotpro.example.com/subscribe",
  logoFileName: null,
};

function generateVoucherCode() {
  return Math.floor(1000000 + Math.random() * 8999999).toString();
}


export function DashboardProvider({ children }: { children: ReactNode }) {
  // Toasts and the activity log live in their own hook (useNotifications.ts)
  // since almost every function below calls showToast/logActivity. This has
  // to run before useUiPreferences (and before any other function that
  // needs showToast/logActivity) since those are passed in as parameters.
  const { toastMessage, showToast, activityLog, logActivity, clearHistory, historyRetention, updateHistoryRetention } =
    useNotifications();

  // Reseller-editable role templates for agents — what an agent with a
  // given role (Sales Agent, Voucher Agent, etc.) can access. Seeded from
  // the static PERMISSION_PRESETS, then edited live from the Agents >
  // Roles & Permissions page. New agents pick up whatever's enabled here
  // for their role at the moment they're created.
  const [agentRolePermissions, setAgentRolePermissions] = useState<Record<PermissionPresetName, AgentPermissions>>(
    () =>
      Object.fromEntries(
        Object.entries(PERMISSION_PRESETS).map(([key, value]) => [key, { ...value }]),
      ) as Record<PermissionPresetName, AgentPermissions>,
  );

  function getAgentRolePermissionsForRole(role: AgentRole): AgentPermissions {
    const presetName = presetNameForRole(role);
    return agentRolePermissions[presetName] ?? PERMISSION_PRESETS[presetName];
  }

  function toggleAgentRolePermission(presetName: PermissionPresetName, permissionKey: string) {
    setAgentRolePermissions((current) => {
      const currentState = current[presetName]?.[permissionKey] ?? "Denied";
      return {
        ...current,
        [presetName]: {
          ...current[presetName],
          [permissionKey]: currentState === "Allowed" ? "Denied" : "Allowed",
        },
      };
    });
  }

  function resetAgentRolePermissions(presetName: PermissionPresetName) {
    setAgentRolePermissions((current) => ({ ...current, [presetName]: { ...PERMISSION_PRESETS[presetName] } }));
    showToast(`${presetName} reset to its default permissions.`);
    logActivity("Settings", `Reset the ${presetName} agent role to its default permissions.`);
  }


  // Pure UI/display preferences (sidebar, dark mode, language, dashboard
  // period) live in their own hook since they're never read by business
  // logic — see useUiPreferences.ts.
  const {
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
  } = useUiPreferences(showToast, logActivity);
  // Not saved on purpose: every visit starts on the whole business.
  const [dashboardScope, setDashboardScope] = useState<DashboardScope>(EVERYTHING);

  // Routers, business/site groupings, and captive portal configs all live
  // in their own hook — see useRouterState.ts.
  const {
    routerEnabled,
    setRouterEnabled,
    routers,
    setRouters,
    routerConfigs,
    getRouterConfig,
    updateRouterConfig,
    getEffectiveSsid,
    masterPortal,
    setMasterPortal,
    hotspotSettings,
    businessLocations,
    captivePortalConfigs,
    addRouter,
    isRouterReachable,
    fullProvisionRouter,
    routerTask,
    startRouterTask,
    confirmRouterTask,
    closeRouterTask,
    regenerateApiCredentials,
    regenerateWinboxAddress,
    syncHotspotFiles,
    syncRouterTime,
    configureSnmp,
    configureWalledGarden,
    hardenServices,
    updateRouterScript,
    downloadRouterFile,
    updateRouterNotificationContacts,
    updateMultiWanConfig,
    updateRouterDetails,
    applyRouterPatch,
    updateConnectionMode,
    toggleRemoteAccess,
    deleteRouter,
    runRouterHealthCheck,
    syncRouter,
    restartRouter,
    toggleRouterPaused,
    toggleRouterConnection,
    siteKeyForRouter,
    getCaptivePortalConfig,
    updateCaptivePortalConfig,
    getCaptivePortalConfigForSite,
    updateCaptivePortalConfigForSite,
    applyCaptivePortalToSites,
    updateHotspotSettings,
    addBusinessLocation,
    updateBusinessLocationSsid,
    toggleSiteEnabled,
  } = useRouterState(showToast, logActivity);

  const {
    accessPoints,
    findAccessPoint,
    addAccessPoint,
    updateAccessPoint,
    deleteAccessPoint,
    setAccessPointStatus,
  } = useAccessPointState(showToast, logActivity);

  const { momoSettings, updateMomoSettings, saveMomoSettings, testMomoConnection, autoRenewDisabledPhones, disableAutoRenewForCustomer, enableAutoRenewForCustomer } =
    useMomoIntegrationState(showToast, logActivity);

  const { subscription, renewSubscription, setBillingModel, payCommission } = useSubscriptionState(showToast, logActivity);
  const { revenueSettings, updateRevenueSettings, saveRevenueSettings } = useRevenueSettingsState(
    showToast,
    logActivity,
  );

  const [users, setUsers] = usePersistedState<ActiveUser[]>("activeUsers", initialActiveUsers);

  const [userConnectionState, setUserConnectionState] =
    usePersistedState<UserConnectionStateMap>("userConnectionState", 
      Object.fromEntries(
        initialActiveUsers.map((user) => [
          user.phone || user.voucherUsername,
          { paused: false, disconnected: false, blocked: false },
        ]),
      ),
    );

  // Real session-expiry timestamps, derived from each user's actual
  // remaining voucher/package time — this is what MikroTik/RADIUS would
  // track once a customer redeems a voucher. When it actually runs out,
  // the user is removed automatically — separate from the manual
  // Disconnect toggle, which stays reversible.
  const [sessionExpiresAt, setSessionExpiresAt] = useState<
    Record<string, number>
  >(buildExpiryTimestamps(initialActiveUsers));

  // Real remaining data allowance per user, in MB — decremented over time
  // while a user is online, and checked alongside the time-based expiry so
  // running out of data expires a session exactly like running out of time.
  const [dataRemainingMb, setDataRemainingMb] = useState<Record<string, number>>(
    Object.fromEntries(
      initialActiveUsers.map((user) => [
        user.phone || user.voucherUsername,
        parseDataToMb(user.dataLeft),
      ]),
    ),
  );

  const [openUserAction, setOpenUserAction] = useState<string | null>(null);
  const [openRouterAction, setOpenRouterAction] = useState<string | null>(
    null,
  );



  const [confirmAction, setConfirmAction] = useState<ConfirmAction | null>(
    null,
  );

  // packages/setPackages is declared here (not inside a hook) because
  // both useAgentState (reads it, for wallet-funding price checks) and
  // usePackageState (owns the actions on it) need it, and useAgentState
  // has to run first — see usePackageState.ts for the full explanation.
  const [packages, setPackages] = usePersistedState<Package[]>("packages", initialPackages);

  // Agents/resellers, approval requests, and messaging all live in their
  // own hook — see useAgentState.ts. It needs `packages` (to check a
  // package's price) and `routers` (to look up a router's name).
  const { voucherAlertLog, recordVoucherAlerts } = useVoucherAlertLog();

  const {
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
  } = useAgentState(
    showToast,
    logActivity,
    packages,
    routers,
    getAgentRolePermissionsForRole,
  );

  const { agentCollections, recordAgentCollection, deleteAgentCollection } = useAgentCollectionsState(
    showToast,
    logActivity,
    (agentId) => agents.find((agent) => agent.id === agentId)?.name ?? null,
  );

  const [vouchers, setVouchers] = usePersistedState<Voucher[]>("vouchers", initialVouchers);
  const [defaultVoucherCleanupPolicy, setDefaultVoucherCleanupPolicy] = useState<VoucherCleanupPolicy>({
    enabled: false,
    clearAfterDays: 90,
  });
  const [routerVoucherCleanupPolicies, setRouterVoucherCleanupPolicies] = useState<Record<string, VoucherCleanupPolicy>>({});
  const [voucherBatches, setVoucherBatches] = usePersistedState<VoucherBatch[]>("voucherBatches", []);
  const [routerCleanup, setRouterCleanup] = usePersistedState<Record<string, RouterCleanupSettings>>("routerCleanup", {});
  const [voucherPresets, setVoucherPresets] = usePersistedState<VoucherPreset[]>("voucherPresets", []);

  function saveVoucherPreset(
    input: Omit<VoucherPreset, "id" | "createdAt" | "pushedToAgentIds" | "ownerAgentId">,
    ownerAgentId: string = currentAgentId,
  ) {
    const newPreset: VoucherPreset = {
      ...input,
      id: `preset-${Date.now()}`,
      createdAt: new Date().toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric" }),
      ownerAgentId,
      pushedToAgentIds: [],
    };
    setVoucherPresets((current) => [newPreset, ...current]);
    showToast(`Preset "${input.name}" saved.`);
    const savedByLabel = ownerAgentId !== DEFAULT_AGENT_ID ? agents.find((a) => a.id === ownerAgentId)?.name : null;
    logActivity(
      "Voucher",
      `Saved voucher preset "${input.name}".${savedByLabel ? ` (by ${savedByLabel})` : ""}`,
    );
    return newPreset;
  }

  function deleteVoucherPreset(id: string) {
    const preset = voucherPresets.find((p) => p.id === id);
    setVoucherPresets((current) => current.filter((p) => p.id !== id));
    if (preset) {
      showToast(`Preset "${preset.name}" deleted.`);
      const deletedByLabel =
        currentAgentId !== DEFAULT_AGENT_ID ? agents.find((a) => a.id === currentAgentId)?.name : null;
      logActivity(
        "Voucher",
        `Deleted voucher preset "${preset.name}".${deletedByLabel ? ` (by ${deletedByLabel})` : ""}`,
      );
    }
  }

  function updateVoucherPreset(id: string, input: Omit<VoucherPreset, "id" | "createdAt" | "pushedToAgentIds" | "ownerAgentId">) {
    setVoucherPresets((current) =>
      current.map((p) => (p.id === id ? { ...p, ...input } : p)),
    );
    showToast(`Preset "${input.name}" updated.`);
  }

  function deleteVoucherBatch(
    batchId: string,
    keepVouchers: boolean = false,
    // When true and the batch was pushed to agents, the batch record is
    // kept exactly as-is (nothing about it changes) but gets flagged
    // hiddenFromAdmin — so it disappears from every admin-facing list
    // while those agents still see it completely normally in their own
    // portal, exactly as if admin had never touched it. Ignored (has no
    // effect) if nobody it was pushed to, since there'd be no one left
    // for "keep it visible for them" to mean anything for.
    preserveForPushedAgents: boolean = false,
  ) {
    const batch = voucherBatches.find((b) => b.id === batchId);
    if (!batch) return;

    if (preserveForPushedAgents && batch.assignedAgentIds.length > 0) {
      setVoucherBatches((current) =>
        current.map((b) => (b.id === batchId ? { ...b, hiddenFromAdmin: true } : b)),
      );
      const agentCount = batch.assignedAgentIds.length;
      showToast(
        `Removed batch "${batch.reference}" from your view — it's still visible to ${agentCount} agent${agentCount === 1 ? "" : "s"} it was pushed to.`,
      );
      logActivity(
        "Voucher",
        `Deleted voucher batch "${batch.reference}" from admin view, keeping it visible for ${agentCount} agent(s) it was pushed to.`,
      );
      return;
    }

    setVoucherBatches((current) => current.filter((b) => b.id !== batchId));
    if (keepVouchers) {
      // Un-link the vouchers from this batch instead of deleting them —
      // they still exist and can still be sold/redeemed, they just no
      // longer belong to any batch.
      setVouchers((current) =>
        current.map((v) => (v.batchId === batchId ? { ...v, batchId: null } : v)),
      );
      showToast(`Deleted batch "${batch.reference}" — its ${batch.count} voucher${batch.count === 1 ? "" : "s"} were kept.`);
      logActivity("Voucher", `Deleted voucher batch "${batch.reference}", keeping its ${batch.count} voucher(s).`);
    } else {
      setVouchers((current) => current.filter((v) => v.batchId !== batchId));
      showToast(`Deleted batch "${batch.reference}" and its ${batch.count} voucher${batch.count === 1 ? "" : "s"}.`);
      logActivity("Voucher", `Deleted voucher batch "${batch.reference}" (${batch.count} vouchers).`);
    }
  }

  // Hands a preset to specific agents. Agents can only open the presets
  // page with the "voucher.presets" permission, so a push to someone
  // without it would look like it worked while they still see a
  // "restricted" screen. grantAccess turns that permission on for them in
  // the same step (admin's explicit choice in the push panel).
  function pushVoucherPresetToAgents(presetId: string, agentIds: string[], grantAccess: boolean = false) {
    const preset = voucherPresets.find((p) => p.id === presetId);
    if (!preset || agentIds.length === 0) return;

    setVoucherPresets((current) =>
      current.map((p) =>
        p.id === presetId
          ? { ...p, pushedToAgentIds: Array.from(new Set([...p.pushedToAgentIds, ...agentIds])) }
          : p,
      ),
    );

    const lacking = agents.filter(
      (a) => agentIds.includes(a.id) && a.permissions["voucher.presets"] !== "Allowed",
    );
    let grantedCount = 0;
    if (grantAccess && lacking.length > 0) {
      const lackingIds = new Set(lacking.map((a) => a.id));
      grantedCount = lacking.length;
      setAgents((current) =>
        current.map((a) =>
          lackingIds.has(a.id)
            ? { ...a, permissions: { ...a.permissions, "voucher.presets": "Allowed" } }
            : a,
        ),
      );
    }
    const stillBlocked = grantAccess ? 0 : lacking.length;

    const grantNote = grantedCount > 0 ? ` Preset access turned on for ${grantedCount}.` : "";
    const blockedNote =
      stillBlocked > 0
        ? ` ${stillBlocked} of them can't open presets until you allow "Create, save & use voucher presets".`
        : "";
    showToast(
      `Pushed preset "${preset.name}" to ${agentIds.length} agent${agentIds.length === 1 ? "" : "s"}.${grantNote}${blockedNote}`,
    );
    logActivity(
      "Voucher",
      `Pushed voucher preset "${preset.name}" to ${agentIds.length} agent(s)${grantedCount > 0 ? `, granting preset access to ${grantedCount}` : ""}.`,
    );
  }

  function removeVoucherPresetPush(presetId: string, agentId: string) {
    const preset = voucherPresets.find((p) => p.id === presetId);
    const agent = agents.find((a) => a.id === agentId);
    setVoucherPresets((current) =>
      current.map((p) =>
        p.id === presetId
          ? { ...p, pushedToAgentIds: p.pushedToAgentIds.filter((id) => id !== agentId) }
          : p,
      ),
    );
    if (preset && agent) {
      showToast(`${agent.name} no longer has "${preset.name}".`);
      logActivity("Voucher", `Removed voucher preset "${preset.name}" from agent "${agent.name}".`);
    }
  }

  // Package actions (create/edit/hide/delete/duplicate/expire-vouchers)
  // live in their own hook — see usePackageState.ts. It needs
  // currentAgentId (just returned above) and setVouchers (just below).
  // actingAgentLabel lets its log messages say who did it when it isn't
  // the account owner — e.g. "Created package \"5GH\" (by Kwame Mensah)".
  const actingAgent = agents.find((a) => a.id === currentAgentId);
  const actingAgentLabel = actingAgent && actingAgent.id !== DEFAULT_AGENT_ID ? actingAgent.name : null;
  // Every package change is checked against what the acting agent has been
  // allowed, so the rule holds no matter which screen the change came from.
  // Admin (the owner profile) can always do everything.
  const canActOnPackage = makePackageGuard(actingAgent);
  const {
    findPackage,
    derivePackageDisplayFields,
    addPackage: addPackageBase,
    updatePackage: updatePackageBase,
    setPackageStatus,
    deletePackage,
    duplicatePackage,
    expirePackageVouchers,
    pushPackageToAgents,
    removePackagePush,
  } = usePackageState(showToast, logActivity, currentAgentId, packages, setPackages, setVouchers, setVoucherBatches, actingAgentLabel, canActOnPackage);

  function syncPackageProfilesToRouters(
    pkg: { routerIps?: string[]; applyToAllSites?: boolean; name?: string } | null | undefined,
    nextPackages: Package[],
  ) {
    void (async () => {
      // Persist first — router jobs/check-in read server state; a debounced save races the push.
      await persistNow("packages", nextPackages);
      const linked = routers
        .filter((r) => typeof r.provisioningToken === "string" && r.provisioningToken.length > 0)
        .map((r) => r.ip);
      if (linked.length === 0) {
        showToast(
          "Package saved. Connect/provision a MikroTik so User Profiles can sync (IP → Hotspot → User Profiles).",
        );
        return;
      }
      if (pkg?.applyToAllSites || !pkg?.routerIps?.length) {
        queueRouterActionMany(linked, "push-to-router");
      } else {
        const targets = pkg.routerIps.filter((ip) => linked.includes(ip));
        queueRouterActionMany(targets.length > 0 ? targets : linked, "push-to-router");
      }
      showToast(
        pkg?.name
          ? `“${pkg.name}” saved — pushing packages & vouchers to the selected router(s)…`
          : "Package saved — pushing packages & vouchers to the router(s)…",
      );
    })();
  }

  function addPackage(input: PackageInput) {
    const created = addPackageBase(input);
    if (created) syncPackageProfilesToRouters(created, [created, ...packages]);
    return created;
  }

  function updatePackage(id: string, input: PackageInput) {
    updatePackageBase(id, input);
    const nextPackages = packages.map((pkg) =>
      pkg.id === id
        ? {
            ...pkg,
            ...input,
            ...derivePackageDisplayFields(input),
          }
        : pkg,
    );
    syncPackageProfilesToRouters(
      { ...input, routerIps: input.routerIps, applyToAllSites: input.applyToAllSites, name: input.name },
      nextPackages,
    );
  }

  function setPackageStatusAndSync(id: string, status: PackageStatus) {
    setPackageStatus(id, status);
    const nextPackages = packages.map((pkg) => (pkg.id === id ? { ...pkg, status } : pkg));
    const row = nextPackages.find((pkg) => pkg.id === id);
    if (status === "Active" && row) syncPackageProfilesToRouters(row, nextPackages);
  }

  const {
    alertRules,
    updateAlertRule,
    addAlertRule,
    deleteAlertRule,
    fireAlert,
    markAlertRead,
    getAdminAlerts,
    getAgentAlerts,
  } = useAlertsState(showToast, logActivity, routers, agents);

  function findBatch(id: string) {
    return voucherBatches.find((batch) => batch.id === id);
  }
  const [branding, setBranding] = usePersistedState<BrandingSettings>("branding", initialBranding);
  const [portalControls, setPortalControls] = useState<PortalControls>(
    initialPortalControls,
  );
  const [installers, setInstallers] = usePersistedState<InstallerProfile[]>("installers", []);
  const [installDispatches, setInstallDispatches] = usePersistedState<InstallDispatch[]>("installDispatches", []);
  const [loyaltySettings, setLoyaltySettings] = useState<LoyaltySettings>(
    initialLoyaltySettings,
  );
  const [loyaltyStrategy, setLoyaltyStrategy] = useState<"same" | "per-business">("same");
  const [businessLoyaltyConfigs, setBusinessLoyaltyConfigs] = useState<Record<string, LoyaltySettings>>({});
  // Saved, so switches like "Enable Agent Portal" still apply on the login page.
  const [hotspotPolicySettings, setHotspotPolicySettings] =
    usePersistedState<HotspotPolicySettings>("hotspotPolicySettings", initialHotspotPolicySettings);
  const [adminRolePermissions, setAdminRolePermissions] = useState<Record<string, AdminPermissions>>(() => {
    const initial: Record<string, AdminPermissions> = {};
    ADMIN_ROLE_PRESETS.forEach((preset) => {
      initial[preset.key] = preset.build();
    });
    return initial;
  });
  const [adminTeam, setAdminTeam] = useState<AdminTeamMember[]>([
    {
      id: "admin-owner",
      name: "Admin",
      email: "admin@hotspotpro.com",
      phone: "",
      roleKey: "owner",
      status: "Active",
      isOwner: true,
      createdAt: "01 Jan 2026",
    },
  ]);
  const { systemUsers, addSystemUser, updateSystemUser, deleteSystemUser, toggleSystemUserTwoFactor, accessRolePermissions, toggleAccessRolePermission, updateAccessRoleMeta, accessRoleOverrides, resetAccessRoleToDefault } =
    useSystemUsersState(showToast, logActivity);
  const [paymentSettings, setPaymentSettings] = usePersistedState<PaymentSettings>(
    "paymentSettings",
    initialPaymentSettings,
  );
  const [paymentGatewayStrategy, setPaymentGatewayStrategy] =
    useState<PaymentGatewayStrategy>("same");
  const [businessPaymentConfigs, setBusinessPaymentConfigs] = useState<
    Record<string, PaymentSettings>
  >({});
  const [paymentGatewayRequests, setPaymentGatewayRequests] = useState<
    PaymentGatewayRequest[]
  >([]);
  const [securitySettings, setSecuritySettings] = useState<SecuritySettings>(
    initialSecuritySettings,
  );
  const [sitesSettings, setSitesSettings] = useState<SitesSettings>(
    initialSitesSettings,
  );
  const [notificationSettings, setNotificationSettings] =
    useState<NotificationSettings>(initialNotificationSettings);
  const [loyaltyPoints, setLoyaltyPoints] = useState<Record<string, number>>(
    Object.fromEntries(
      initialActiveUsers.map((user, index) => [
        user.phone || user.voucherUsername,
        (index + 1) * 18,
      ]),
    ),
  );
  const [dataUsageResetAt, setDataUsageResetAt] = useState<string | null>(
    null,
  );
  const [likedProductIds, setLikedProductIds] = useState<string[]>([]);
  const [subscriptionPlan, setSubscriptionPlan] =
    useState<SubscriptionPlan>("Growth");


  function findUser(userId: string) {
    return users.find(
      (user) => (user.phone || user.voucherUsername) === userId,
    );
  }

  function getConnectionState(userId: string) {
    return (
      userConnectionState[userId] ?? {
        paused: false,
        disconnected: false,
        blocked: false,
      }
    );
  }

  function closeAllActionMenus() {
    setOpenUserAction(null);
    setOpenRouterAction(null);
  }

  function openUserActions(userId: string) {
    setOpenRouterAction(null);
    setOpenUserAction((current) => (current === userId ? null : userId));
  }

  function openRouterActions(ip: string) {
    setOpenUserAction(null);
    setOpenRouterAction((current) => (current === ip ? null : ip));
  }

  function requestConfirmAction(action: ConfirmAction) {
    if (action.type === "remove-router" && !action.confirmCode) {
      const alphabet = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
      let code = "";
      for (let i = 0; i < 6; i++) code += alphabet[Math.floor(Math.random() * alphabet.length)];
      const router = routers.find((r) => r.ip === action.routerIp);
      const working = !!router && router.status === "Online" && !router.disconnected;
      setConfirmAction({ ...action, confirmCode: code, working });
      return;
    }
    setConfirmAction(action);
  }

  function cancelConfirmAction() {
    setConfirmAction(null);
  }

  function confirmDialogAction() {
    if (!confirmAction) {
      return;
    }

    if (confirmAction.type === "disable-router") {
      setRouterEnabled((current) => ({
        ...current,
        [confirmAction.routerIp]: false,
      }));
      // Cut internet on the MikroTik the same way Disconnect does.
      setRouters((current) =>
        current.map((r) =>
          r.ip === confirmAction.routerIp
            ? { ...r, status: "Offline", disconnected: true, lastSeen: "Disconnected", disconnectedAt: new Date().toISOString() }
            : r,
        ),
      );
      logActivity("Router", `Disabled router ${confirmAction.routerName}.`);
    }

    if (confirmAction.type === "enable-router") {
      setRouterEnabled((current) => ({
        ...current,
        [confirmAction.routerIp]: true,
      }));
      setRouters((current) =>
        current.map((r) =>
          r.ip === confirmAction.routerIp
            ? { ...r, status: "Online", disconnected: false, lastSeen: "Just now", reconnectedAt: new Date().toISOString() }
            : r,
        ),
      );
      logActivity("Router", `Enabled router ${confirmAction.routerName}.`);
    }

    if (confirmAction.type === "remove-router") {
      setRouters((current) =>
        current.filter((router) => router.ip !== confirmAction.routerIp),
      );
      setRouterEnabled((current) => {
        const next = { ...current };
        delete next[confirmAction.routerIp];
        return next;
      });
      showToast(`${confirmAction.routerName} deleted.`);
      logActivity("Router", `Deleted router ${confirmAction.routerName} (${confirmAction.routerIp}).`);
    }

    setConfirmAction(null);
    closeAllActionMenus();
  }






















  function extendUserAccess(userId: string, extension: string) {
    const dayMatch = extension.match(/(\d+)\s*Day/i);
    const hourMatch = extension.match(/(\d+)\s*Hour/i);
    const minuteMatch = extension.match(/(\d+)\s*Min/i);

    const extensionMs =
      (dayMatch ? Number(dayMatch[1]) * 24 * 60 * 60 * 1000 : 0) +
      (hourMatch ? Number(hourMatch[1]) * 60 * 60 * 1000 : 0) +
      (minuteMatch ? Number(minuteMatch[1]) * 60 * 1000 : 0) ||
      60 * 60 * 1000;

    setUsers((current) =>
      current.map((user) =>
        (user.phone || user.voucherUsername) === userId
          ? { ...user, timeLeft: `${user.timeLeft} + ${extension}` }
          : user,
      ),
    );
    setSessionExpiresAt((current) => ({
      ...current,
      [userId]: (current[userId] ?? Date.now()) + extensionMs,
    }));
    showToast(`Access extended by ${extension}.`);
    logActivity("User", `Extended access by ${extension} for ${userId}.`);
  }

  function topUpUserData(userId: string, extraGb: number) {
    const extraMb = extraGb * 1024;

    setDataRemainingMb((current) => ({
      ...current,
      [userId]: Math.max(0, current[userId] ?? 0) + extraMb,
    }));

    setUsers((current) =>
      current.map((user) => {
        if ((user.phone || user.voucherUsername) !== userId) return user;
        const newRemainingMb =
          Math.max(0, dataRemainingMb[userId] ?? 0) + extraMb;
        return { ...user, dataLeft: formatMbToDisplay(newRemainingMb) };
      }),
    );

    showToast(`Topped up ${extraGb} GB for ${userId}.`);
    logActivity("User", `Manually topped up ${extraGb} GB of data for ${userId}.`);
  }

  function changeUserPackage(userId: string, newPackage: string) {
    const user = findUser(userId);
    setUsers((current) =>
      current.map((row) =>
        (row.phone || row.voucherUsername) === userId ? { ...row, package: newPackage } : row,
      ),
    );
    if (user?.voucherUsername) {
      const nextVouchers = vouchers.map((v) =>
        v.code.toLowerCase() === user.voucherUsername.toLowerCase()
          ? { ...v, packageName: newPackage }
          : v,
      );
      setVouchers(nextVouchers);
      const ip = user.routerIp || routers.find((r) => (r.liveUsers ?? []).includes(user.voucherUsername))?.ip;
      void (async () => {
        await persistNow("vouchers", nextVouchers);
        if (ip) queueRouterAction(ip, "sync-vouchers");
      })();
    }
    showToast(`Package changed to ${newPackage}.`);
    logActivity("User", `Changed ${userId}'s package to ${newPackage}.`);
  }

  function resetUserPassword(userId: string) {
    const newPassword = Math.random().toString(36).slice(2, 8).toUpperCase();
    const user = findUser(userId);

    setUsers((current) =>
      current.map((row) =>
        (row.phone || row.voucherUsername) === userId
          ? { ...row, voucherPassword: newPassword }
          : row,
      ),
    );
    if (user?.voucherUsername) {
      const nextVouchers = vouchers.map((v) =>
        v.code.toLowerCase() === user.voucherUsername.toLowerCase()
          ? { ...v, password: newPassword }
          : v,
      );
      setVouchers(nextVouchers);
      const ip = user.routerIp || routers.find((r) => (r.liveUsers ?? []).includes(user.voucherUsername))?.ip;
      void (async () => {
        await persistNow("vouchers", nextVouchers);
        if (ip) {
          queueRouterAction(ip, "sync-vouchers");
          queueRouterAction(ip, "kick-user", { username: user.voucherUsername, mac: user.macAddress || undefined });
        }
      })();
    }

    showToast("Voucher password reset. User must reconnect with the new password.");
    logActivity("User", `Reset voucher password for ${userId}.`);
    return newPassword;
  }

  function deleteUser(userId: string, reason: string = "Deleted") {
    queueUserSessionAction(userId, "block-user");
    setUsers((current) =>
      current.filter(
        (user) => (user.phone || user.voucherUsername) !== userId,
      ),
    );
    setUserConnectionState((current) => {
      const next = { ...current };
      delete next[userId];
      return next;
    });
    setSessionExpiresAt((current) => {
      const next = { ...current };
      delete next[userId];
      return next;
    });
    setDataRemainingMb((current) => {
      const next = { ...current };
      delete next[userId];
      return next;
    });

    const isExpiry = reason === "Expired" || reason === "Data allowance used up";
    const expiryReasonText =
      reason === "Data allowance used up"
        ? "their data allowance ran out"
        : "their voucher/session time elapsed";

    showToast(
      isExpiry
        ? `${userId}'s session expired and was removed automatically.`
        : "User deleted.",
    );
    logActivity(
      "User",
      isExpiry
        ? `${userId} expired — ${expiryReasonText} — removed automatically.`
        : `Deleted user ${userId}.`,
    );
  }

  function expireUserSession(userId: string, reason: string = "Expired") {
    deleteUser(userId, reason);
  }


  async function copyLoginDetails(userId: string) {
    const user = findUser(userId);

    if (!user) {
      return;
    }

    const text = `Username: ${user.voucherUsername}\nPassword: ${user.voucherPassword}\nPhone: ${user.phone || "Not provided"}`;

    try {
      await navigator.clipboard.writeText(text);
      showToast("Login details copied to clipboard.");
    } catch {
      showToast("Could not copy automatically. Select and copy manually.");
    }
  }

  function queueUserSessionAction(userId: string, action: "kick-user" | "block-user" | "unblock-user") {
    const user = findUser(userId);
    if (!user) return;
    const ip = user.routerIp || routers.find((r) => (r.liveUsers ?? []).includes(user.voucherUsername))?.ip || "";
    if (!ip) {
      showToast("Could not find which router this user is on.");
      return;
    }
    queueRouterAction(ip, action, {
      username: user.voucherUsername,
      mac: user.macAddress || undefined,
    });
  }

  function togglePauseUser(userId: string) {
    const previous = getConnectionState(userId);
    const nextPaused = !previous.paused;
    setUserConnectionState((current) => ({
      ...current,
      [userId]: { ...previous, paused: nextPaused, disconnected: nextPaused ? true : previous.disconnected },
    }));
    // Pause = sign them out now; they stay blocked from auto-reconnect until resumed.
    if (nextPaused) queueUserSessionAction(userId, "kick-user");
    showToast(nextPaused ? "User paused and signed out on WiFi." : "User pause cleared.");
    logActivity("User", `${nextPaused ? "Paused" : "Resumed"} ${userId}.`);
  }

  function toggleDisconnectUser(userId: string) {
    const previous = getConnectionState(userId);
    const nextDisconnected = !previous.disconnected;
    setUserConnectionState((current) => ({
      ...current,
      [userId]: { ...previous, disconnected: nextDisconnected },
    }));
    if (nextDisconnected) {
      queueUserSessionAction(userId, "kick-user");
      showToast("User disconnected on the router.");
    } else {
      showToast("Disconnect cleared — user can log in again.");
    }
    logActivity("User", `${nextDisconnected ? "Disconnected" : "Reconnected"} ${userId}.`);
  }

  function toggleBlockUser(userId: string) {
    const previous = getConnectionState(userId);
    const nextBlocked = !previous.blocked;
    setUserConnectionState((current) => ({
      ...current,
      [userId]: {
        paused: nextBlocked ? false : previous.paused,
        disconnected: nextBlocked ? true : previous.disconnected,
        blocked: nextBlocked,
      },
    }));
    queueUserSessionAction(userId, nextBlocked ? "block-user" : "unblock-user");
    showToast(nextBlocked ? "User blocked on WiFi." : "User unblocked on WiFi.");
    logActivity("User", `${nextBlocked ? "Blocked" : "Unblocked"} ${userId}.`);
  }

  function clearDataUsageHistory() {
    setDataUsageResetAt(nowTimestamp());
    logActivity("Settings", "Cleared all historical data usage records.");
    showToast("Data usage history cleared.");
  }

  // --- Loyalty points ---------------------------------------------------

  function getLoyaltyPoints(userId: string) {
    return loyaltyPoints[userId] ?? 0;
  }

  // --- Shop -------------------------------------------------------------

  function toggleLikeProduct(productId: string) {
    setLikedProductIds((current) =>
      current.includes(productId)
        ? current.filter((id) => id !== productId)
        : [...current, productId],
    );
  }

  function purchaseProduct(productId: string) {
    const product = shopProducts.find((item) => item.id === productId);

    if (!product) {
      return;
    }

    showToast(`Order placed for ${product.name}.`);
    logActivity(
      "Settings",
      `Purchased ${product.name} (${localizeAmountString(product.price)}) from the shop.`,
    );
  }


  function updateLoyaltySettings(updates: Partial<LoyaltySettings>) {
    setLoyaltySettings((current) => ({ ...current, ...updates }));
    showToast("Loyalty programme settings saved.");
    logActivity("Settings", "Updated loyalty programme settings.");
  }

  // Same "same for everyone" vs "per-business" pattern as payment gateway
  // settings — resolves which loyalty rules a specific business should use.
  function getLoyaltySettingsForBusiness(businessId: string): LoyaltySettings {
    if (loyaltyStrategy === "per-business") {
      return businessLoyaltyConfigs[businessId] ?? loyaltySettings;
    }
    return loyaltySettings;
  }

  function updateBusinessLoyaltySettings(businessId: string, updates: Partial<LoyaltySettings>) {
    setBusinessLoyaltyConfigs((current) => ({
      ...current,
      [businessId]: { ...(current[businessId] ?? loyaltySettings), ...updates },
    }));
    const business = businessLocations.find((b) => b.id === businessId);
    showToast(`Loyalty programme settings saved for ${business?.name ?? "this business"}.`);
    logActivity("Settings", `Updated loyalty programme settings for "${business?.name ?? businessId}".`);
  }

  function updateLoyaltyStrategy(strategy: "same" | "per-business") {
    setLoyaltyStrategy(strategy);
    showToast(
      strategy === "same"
        ? "Every business will now use the same loyalty programme."
        : "Each business can now have its own loyalty programme.",
    );
    logActivity("Settings", `Changed loyalty programme strategy to ${strategy}.`);
  }

  function redeemLoyaltyPoints(userId: string) {
    const points = getLoyaltyPoints(userId);

    if (!loyaltySettings.enabled) {
      showToast("Enable the loyalty programme in Settings first.");
      return;
    }

    if (points < loyaltySettings.pointsToVoucherThreshold) {
      showToast("Not enough points to redeem yet.");
      return;
    }

    createVoucher(loyaltySettings.rewardPackageName, "Printed");
    setLoyaltyPoints((current) => ({
      ...current,
      [userId]: points - loyaltySettings.pointsToVoucherThreshold,
    }));
    showToast(`Redeemed points for a free ${loyaltySettings.rewardPackageName} voucher.`);
    logActivity(
      "User",
      `${userId} redeemed loyalty points for a ${loyaltySettings.rewardPackageName} voucher.`,
    );
  }

  // --- Packages -------------------------------------------------------









  // --- Vouchers ---------------------------------------------------------

  function findVoucher(code: string) {
    return vouchers.find((voucher) => voucher.code === code);
  }

  function generateVouchers(
    packageName: string,
    quantity: number,
    delivery: VoucherDelivery,
  ) {
    const now = new Date().toLocaleString("en-GB", {
      day: "2-digit",
      month: "short",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });

    const newVouchers: Voucher[] = Array.from({ length: quantity }, () => ({
      code: generateVoucherCode(),
      password: null,
      packageName,
      status: "Available",
      delivery,
      saleType: "Unassigned",
      usedByCustomerId: null,
      redeemerPhone: null,
      generatedAt: now,
      generatedAtMs: Date.now(),
      agentId: currentAgentId,
      batchId: null,
    }));

    setVouchers((current) => [...newVouchers, ...current]);
    showToast(
      `${quantity} voucher${quantity > 1 ? "s" : ""} generated for ${packageName}.`,
    );
    logActivity(
      "Voucher",
      `Generated ${quantity} voucher(s) for ${packageName}.`,
    );
    return newVouchers;
  }

  function generateVoucherBatch(input: {
    packageName: string;
    reference: string;
    quantity: number;
    codeFormat: VoucherCodeFormat;
    codeLength: number;
    prefix: string;
    note: string;
    isGiveaway: boolean;
    routerIps: string[];
    assignedAgentIds: string[];
    loginMethod?: VoucherLoginMethod;
    limitBy?: VoucherLimitBy;
    countFrom?: VoucherCountFrom;
    // Who is really generating — defaults to the context's acting agent,
    // but the agent portal passes its own agent so vouchers, wallet and
    // "created by" all land on the right person.
    actingAgentId?: string;
    customCode?: string;
    customPassword?: string;
    appendToBatchId?: string;
  }) {
    const actingId = input.actingAgentId ?? currentAgentId;
    const now = new Date().toLocaleString("en-GB", {
      day: "2-digit",
      month: "short",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });

    const pkg = packages.find((p) => p.name === input.packageName);
    const pricePerVoucher = pkg
      ? Number(pkg.price.replace(/[^0-9.]/g, "")) || 0
      : 0;
    // Demo/seed package IPs must not stick on the batch — map them to live linked routers.
    const scopedRouterIps = normalizeVoucherRouterIps(input.routerIps, routers);

    const currentAgent = agents.find((a) => a.id === actingId);
    let quantity = Math.min(VOUCHER_BATCH_MAX, resolveVoucherQuantity(input.quantity));

    // Organization-wide rules for agents. These are enforced here, not just
    // by hiding buttons, so nothing can get around them.
    const actorIsAgent = !!currentAgent && currentAgent.id !== DEFAULT_AGENT_ID;
    // This agent's own settings (and access): enforced here, not just by
    // hiding buttons, so nothing can get around them.
    const actorSettings = settingsOf(currentAgent);
    if (actorIsAgent && currentAgent.status !== "Active") {
      showToast("Your access has been disabled. Please contact admin to reactivate it.");
      return null;
    }
    if (actorIsAgent && !actorSettings.allowCreateVouchers) {
      showToast("Admin has turned off voucher creation for you.");
      return null;
    }

    const customCode = (input.customCode ?? "").trim();
    const customPassword = (input.customPassword ?? "").trim();
    const wantsCustomCredentials = customCode !== "" || customPassword !== "";
    if (wantsCustomCredentials) {
      if (actorIsAgent && !actorSettings.allowCustomVoucherCredentials) {
        showToast("Admin hasn't allowed you to set your own voucher credentials.");
        return null;
      }
      if (input.quantity !== 1) {
        showToast("A custom username or password can only be set when creating a single voucher.");
        return null;
      }
      const check = validateCustomCredentials(
        customCode,
        customPassword,
        vouchers.map((voucher) => voucher.code),
      );
      if (!check.ok) {
        showToast(check.error);
        return null;
      }
    }

    if (currentAgent && currentAgent.requiresWalletFunding && !input.isGiveaway) {
      const maxAffordable =
        pricePerVoucher > 0
          ? Math.floor(currentAgent.walletBalance / pricePerVoucher)
          : quantity;

      if (maxAffordable <= 0) {
        showToast(
          `Insufficient wallet balance. Load your wallet with at least ${sym()} ${pricePerVoucher.toFixed(2)} to generate a "${input.packageName}" voucher.`,
        );
        return null;
      }

      if (quantity > maxAffordable) {
        showToast(
          `Wallet balance only covers ${maxAffordable} voucher(s) at ${sym()} ${pricePerVoucher.toFixed(2)} each — generating ${maxAffordable} instead of ${quantity}.`,
        );
        quantity = maxAffordable;
      }
    }

    const existingBatch = input.appendToBatchId
      ? voucherBatches.find((b) => b.id === input.appendToBatchId)
      : null;
    const batchId = existingBatch?.id ?? `batch-${Date.now()}`;
    const reference = existingBatch
      ? existingBatch.reference
      : input.reference.trim() ||
        `BATCH-${new Date().toISOString().slice(0, 10).replace(/-/g, "")}-${Math.random()
          .toString(36)
          .slice(2, 6)
          .toUpperCase()}`;

    function makeCode() {
      const chars =
        input.codeFormat === "numeric"
          ? "0123456789"
          : input.codeFormat === "letters-lower"
            ? "abcdefghjkmnpqrstuvwxyz"
            : input.codeFormat === "lowercase"
              ? "abcdefghjkmnpqrstuvwxyz23456789"
              : input.codeFormat === "mixed"
                ? "ABCDEFGHJKLMNPQRSTUVWXYZabcdefghjkmnpqrstuvwxyz23456789"
                : "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
      let code = "";
      for (let i = 0; i < input.codeLength; i += 1) {
        code += chars[Math.floor(Math.random() * chars.length)];
      }
      const prefixCased =
        input.codeFormat === "lowercase" || input.codeFormat === "letters-lower"
          ? input.prefix.toLowerCase()
          : input.codeFormat === "mixed"
            ? input.prefix
            : input.prefix.toUpperCase();
      return `${input.prefix ? prefixCased : ""}${code}`;
    }

    const codes = wantsCustomCredentials
      ? [customCode || makeCode()]
      : Array.from({ length: quantity }, makeCode);
    // Voucher shape must match what that router's captive portal asks customers to type.
    // A custom password always means username + password for that one voucher.
    let loginMethod: VoucherLoginMethod;
    if (customPassword) {
      loginMethod = "credentials";
    } else {
      const fromPortal = loginMethodForRouterIps(scopedRouterIps, getCaptivePortalConfig);
      if (!fromPortal.ok) {
        showToast(fromPortal.message);
        return null;
      }
      loginMethod = fromPortal.loginMethod;
    }
    const limitBy: VoucherLimitBy = input.limitBy ?? "both";
    const countFrom: VoucherCountFrom = input.countFrom ?? "signin";
    // A separate, shorter password for credentials-mode vouchers — always
    // numeric so it's easy to read aloud or type on a phone keypad.
    function makePassword() {
      let pass = "";
      for (let i = 0; i < 6; i += 1) {
        pass += "0123456789"[Math.floor(Math.random() * 10)];
      }
      return pass;
    }

    const newVouchers: Voucher[] = codes.map((code) => ({
      code,
      password: loginMethod === "credentials" ? customPassword || makePassword() : null,
      packageName: input.packageName,
      status: "Available",
      delivery: "Printed",
      saleType: input.isGiveaway ? "Giveaway" : "Unassigned",
      usedByCustomerId: null,
      redeemerPhone: null,
      generatedAt: now,
      generatedAtMs: Date.now(),
      agentId: actingId,
      batchId,
      limitBy,
      countFrom,
    }));

    // What this batch costs the agent from their wallet (0 if it isn't paid
    // from a wallet), kept on the batch so the agent's prepaid total is exact.
    const walletCharged =
      currentAgent && currentAgent.requiresWalletFunding && !input.isGiveaway && pricePerVoucher > 0
        ? Math.round(quantity * pricePerVoucher * 100) / 100
        : 0;

    const newBatch: VoucherBatch = existingBatch
      ? {
          ...existingBatch,
          packageName: input.packageName || existingBatch.packageName,
          price: pkg?.price ?? existingBatch.price,
          count: existingBatch.count + quantity,
          codes: [...codes, ...existingBatch.codes],
          note: input.note.trim() ? `${existingBatch.note} ${input.note}`.trim() : existingBatch.note,
          routerIps:
            scopedRouterIps.length > 0
              ? Array.from(new Set([...existingBatch.routerIps, ...scopedRouterIps]))
              : existingBatch.routerIps,
          assignedAgentIds: Array.from(
            new Set([...existingBatch.assignedAgentIds, ...input.assignedAgentIds]),
          ),
          walletCharged: (existingBatch.walletCharged ?? 0) + walletCharged,
          loginMethod,
          limitBy,
          countFrom,
        }
      : {
          id: batchId,
          reference,
          packageName: input.packageName,
          price: pkg?.price ?? "—",
          count: quantity,
          isGiveaway: input.isGiveaway,
          note: input.note,
          printDesign: "micro-strip",
          loginMethod,
          limitBy,
          countFrom,
          createdAt: now,
          createdAtMs: Date.now(),
          codes,
          agentId: actingId,
          routerIps: scopedRouterIps,
          assignedAgentIds: input.assignedAgentIds,
          hiddenFromAdmin: false,
          walletCharged,
        };

    const nextVouchers = [...newVouchers, ...vouchers];
    const nextBatches = existingBatch
      ? voucherBatches.map((b) => (b.id === batchId ? newBatch : b))
      : [newBatch, ...voucherBatches];
    setVouchers(nextVouchers);
    setVoucherBatches(nextBatches);

    if (currentAgent && currentAgent.requiresWalletFunding && !input.isGiveaway && pricePerVoucher > 0) {
      const cost = quantity * pricePerVoucher;
      setAgents((current) =>
        current.map((agent) =>
          agent.id === actingId
            ? { ...agent, walletBalance: Math.max(0, agent.walletBalance - cost) }
            : agent,
        ),
      );
      logActivity(
        "Agent",
        `Deducted ${sym()} ${cost.toFixed(2)} from ${currentAgent.name}'s wallet for ${quantity} voucher(s).`,
      );
    }

    const scopeMessage =
      scopedRouterIps.length > 1
        ? ` Available on ${scopedRouterIps.length} routers.`
        : scopedRouterIps.length === 1
          ? ` Available on ${routers.find((r) => r.ip === scopedRouterIps[0])?.name.split(" (")[0] ?? "1 router"}.`
          : "";
    const pushMessage =
      input.assignedAgentIds.length > 0
        ? ` Pushed to ${input.assignedAgentIds.length} agent${input.assignedAgentIds.length === 1 ? "" : "s"}.`
        : "";
    showToast(
      existingBatch
        ? `Added ${quantity} voucher(s) to batch "${reference}".${scopeMessage}${pushMessage}`
        : `${quantity} vouchers generated in batch "${reference}".${scopeMessage}${pushMessage}`,
    );
    const generatedByLabel = actingId !== DEFAULT_AGENT_ID ? agents.find((a) => a.id === actingId)?.name : null;
    logActivity(
      "Voucher",
      `${existingBatch ? "Added to" : "Generated"} batch "${reference}" — ${quantity} voucher(s) for ${input.packageName}.${scopeMessage}${pushMessage}${
        generatedByLabel ? ` (by ${generatedByLabel})` : ""
      }`,
    );

    // Alert admin whenever an agent (not the account owner) generates
    // vouchers, and check both the agent's own remaining stock and the
    // package's overall stock against the configured thresholds.
    if (currentAgent && currentAgent.id !== DEFAULT_AGENT_ID) {
      fireAlert(
        "voucherGenerated",
        `${currentAgent.name} generated ${quantity} voucher(s) for "${input.packageName}" (batch "${reference}").`,
        { routerIp: currentAgent.routerIp ?? undefined, agentId: undefined },
      );

      // "Agent voucher alerts": a short summary for the admin by email
      // and/or SMS, when the organization has switched that on.
      const deliveries = resolveVoucherAlertDeliveries(actorSettings, {
        supportEmail: branding.supportEmail,
        supportNumber: branding.supportNumber,
      });
      if (deliveries.length > 0) {
        const walletAfter =
          currentAgent.requiresWalletFunding && !input.isGiveaway && pricePerVoucher > 0
            ? Math.max(0, currentAgent.walletBalance - quantity * pricePerVoucher)
            : currentAgent.walletBalance;
        const alertMessage = composeVoucherAlertMessage({
          agentName: currentAgent.name,
          quantity,
          packageName: input.packageName,
          reference,
          routerName: currentAgent.routerIp
            ? (routers.find((r) => r.ip === currentAgent.routerIp)?.name.split(" (")[0] ?? null)
            : null,
          walletBalance: walletAfter,
        });
        recordVoucherAlerts(
          deliveries.map((delivery) => ({
            agentId: currentAgent.id,
            agentName: currentAgent.name,
            channel: delivery.channel,
            to: delivery.to,
            message: alertMessage,
            status: delivery.to ? ("Logged" as const) : ("No destination" as const),
          })),
        );
        logActivity(
          "Agent",
          `Voucher alert (${deliveries.map((d) => d.channel).join(" + ")}) recorded for ${currentAgent.name}'s batch "${reference}".`,
        );
      }

      const agentAvailableCount = [...vouchers, ...newVouchers].filter(
        (v) => v.agentId === actingId && v.status === "Available",
      ).length;
      const agentStockRule = alertRules.find((r) => r.type === "agentStockLow" && r.enabled);
      if (agentStockRule?.thresholdValue !== null && agentStockRule?.thresholdValue !== undefined) {
        if (agentAvailableCount <= agentStockRule.thresholdValue) {
          fireAlert(
            "agentStockLow",
            `${currentAgent.name}'s available voucher stock is down to ${agentAvailableCount}.`,
            { routerIp: currentAgent.routerIp ?? undefined, agentId: currentAgent.id },
          );
        }
      }
    }

    const packageAvailableCount = [...vouchers, ...newVouchers].filter(
      (v) => v.packageName === input.packageName && v.status === "Available",
    ).length;
    if (packageAvailableCount <= 0) {
      fireAlert("voucherStockEmpty", `"${input.packageName}" vouchers are fully out of stock.`, {
        routerIp: currentAgent?.routerIp ?? undefined,
      });
    } else {
      const stockLowRule = alertRules.find((r) => r.type === "voucherStockLow" && r.enabled);
      if (
        stockLowRule?.thresholdValue !== null &&
        stockLowRule?.thresholdValue !== undefined &&
        packageAvailableCount <= stockLowRule.thresholdValue
      ) {
        fireAlert(
          "voucherStockLow",
          `"${input.packageName}" vouchers are running low — ${packageAvailableCount} remaining.`,
          { routerIp: currentAgent?.routerIp ?? undefined },
        );
      }
    }

    // Push the new codes onto the routers that should accept them (local login).
    // Persist vouchers first — jobs/portal read server state; a 300ms debounce would race login.
    const targetIps =
      scopedRouterIps.length > 0
        ? scopedRouterIps
        : currentAgent?.routerIp
          ? [currentAgent.routerIp]
          : routers.map((r) => r.ip);
    void (async () => {
      await persistNow("vouchers", nextVouchers);
      await persistNow("voucherBatches", nextBatches);
      queueRouterActionMany(targetIps, "sync-vouchers");
    })();

    return newBatch;
  }

  function isVoucherBatchVisibleToAgent(batch: VoucherBatch, agentId: string): boolean {
    if (batch.agentId === agentId) return true;
    const agent = agents.find((a) => a.id === agentId);
    if (!agent || !agent.routerIp) return false;
    return batch.routerIps.includes(agent.routerIp);
  }

  function getAgentsOnRouters(routerIps: string[]): AgentProfile[] {
    if (routerIps.length === 0) return [];
    return agents.filter((agent) => agent.routerIp && routerIps.includes(agent.routerIp));
  }

  function getAssignedVoucherBatchesForAgent(agentId: string): VoucherBatch[] {
    return voucherBatches.filter((batch) => batch.assignedAgentIds.includes(agentId));
  }

  function setBatchPrintDesign(batchId: string, printDesign: string) {
    setVoucherBatches((current) =>
      current.map((batch) =>
        batch.id === batchId ? { ...batch, printDesign } : batch,
      ),
    );
  }



  function createVoucher(
    packageName: string,
    delivery: VoucherDelivery,
    customCode?: string,
  ) {
    const now = new Date().toLocaleString("en-GB", {
      day: "2-digit",
      month: "short",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });

    const newVoucher: Voucher = {
      code: customCode?.trim() || generateVoucherCode(),
      password: null,
      packageName,
      status: "Available",
      delivery,
      saleType: "Unassigned",
      usedByCustomerId: null,
      redeemerPhone: null,
      generatedAt: now,
      generatedAtMs: Date.now(),
      agentId: currentAgentId,
      batchId: null,
    };

    setVouchers((current) => [newVoucher, ...current]);
    showToast(`Voucher ${newVoucher.code} created.`);
    logActivity("Voucher", `Created voucher ${newVoucher.code} (${packageName}).`);
    return newVoucher;
  }

  function assignVoucher(
    code: string,
    customerId: string,
    phone: string,
    saleType: VoucherSaleType,
  ) {
    setVouchers((current) =>
      current.map((voucher) =>
        voucher.code === code
          ? {
              ...voucher,
              status: "Used",
              usedByCustomerId: customerId,
              redeemerPhone: phone,
              saleType,
              usedAtMs: Date.now(),
            }
          : voucher,
      ),
    );
    showToast(`Voucher ${code} assigned.`);
    logActivity("Voucher", `Assigned voucher ${code} to ${customerId}.`);
  }

  function deleteVoucher(code: string) {
    const removed = vouchers.find((v) => v.code === code);
    setVouchers((current) => {
      const next = current.filter((voucher) => voucher.code !== code);
      setVoucherBatches((batches) => reconcileBatchesFromVouchers(batches, next, packages));
      return next;
    });
    if (removed?.batchId) {
      const batch = voucherBatches.find((b) => b.id === removed.batchId);
      if (batch?.routerIps?.length) queueRouterActionMany(batch.routerIps, "sync-vouchers");
    }
    showToast("Voucher deleted.");
    logActivity("Voucher", `Deleted voucher ${code}.`);
  }

  function expireVouchers(codes: string[]) {
    if (codes.length === 0) return;
    const affected = vouchers.filter((v) => codes.includes(v.code));
    setVouchers((current) => {
      const next = current.map((voucher) =>
        codes.includes(voucher.code) && voucher.status !== "Expired"
          ? { ...voucher, status: "Expired" as const }
          : voucher,
      );
      setVoucherBatches((batches) => reconcileBatchesFromVouchers(batches, next, packages));
      return next;
    });
    const ips = new Set<string>();
    for (const v of affected) {
      const batch = v.batchId ? voucherBatches.find((b) => b.id === v.batchId) : null;
      batch?.routerIps.forEach((ip) => ips.add(ip));
    }
    if (ips.size > 0) queueRouterActionMany([...ips], "sync-vouchers");
    showToast(`${codes.length} voucher(s) marked as expired.`);
    logActivity("Voucher", `Marked ${codes.length} voucher(s) as expired.`);
  }

  // --- Voucher cleanup ----------------------------------------------------
  // Set once (an account-wide default), with an optional override per
  // router. A voucher generated afterwards doesn't need this specified
  // again — cleanup always looks up whichever policy currently applies
  // to that voucher's router at the time it runs.

  function resolveVoucherRouterIp(voucher: Voucher): string | null {
    const agent = agents.find((a) => a.id === voucher.agentId);
    return agent?.routerIp ?? null;
  }

  function getVoucherCleanupPolicy(routerIp: string | null): VoucherCleanupPolicy {
    if (routerIp && routerVoucherCleanupPolicies[routerIp]) {
      return routerVoucherCleanupPolicies[routerIp];
    }
    return defaultVoucherCleanupPolicy;
  }

  function updateDefaultVoucherCleanupPolicy(updates: Partial<VoucherCleanupPolicy>) {
    setDefaultVoucherCleanupPolicy((current) => ({ ...current, ...updates }));
    showToast("Voucher cleanup policy saved.");
    logActivity("Voucher", "Updated the account-wide voucher cleanup policy.");
  }

  function updateRouterVoucherCleanupPolicy(routerIp: string, updates: Partial<VoucherCleanupPolicy>) {
    setRouterVoucherCleanupPolicies((current) => ({
      ...current,
      [routerIp]: {
        ...(current[routerIp] ?? defaultVoucherCleanupPolicy),
        ...updates,
      },
    }));
    const router = routers.find((r) => r.ip === routerIp);
    showToast(`Voucher cleanup policy saved for ${router?.name ?? "this router"}.`);
    logActivity("Voucher", `Updated the voucher cleanup policy for "${router?.name ?? routerIp}".`);
  }

  function clearRouterVoucherCleanupOverride(routerIp: string) {
    setRouterVoucherCleanupPolicies((current) => {
      const next = { ...current };
      delete next[routerIp];
      return next;
    });
    showToast("This router now follows the account-wide cleanup policy again.");
  }

  // Removes Used/Expired vouchers whose policy says they're old enough to
  // go. Runs automatically on an interval, and can be triggered manually.
  function runVoucherCleanup() {
    const now = Date.now();
    let removedCount = 0;

    setVouchers((current) =>
      current.filter((voucher) => {
        if (voucher.status !== "Used" && voucher.status !== "Expired") return true;

        const routerIp = resolveVoucherRouterIp(voucher);
        const policy = getVoucherCleanupPolicy(routerIp);
        if (!policy.enabled) return true;

        const ageDays = (now - voucher.generatedAtMs) / (1000 * 60 * 60 * 24);
        const shouldRemove = ageDays >= policy.clearAfterDays;
        if (shouldRemove) removedCount += 1;
        return !shouldRemove;
      }),
    );

    if (removedCount > 0) {
      logActivity("Voucher", `Cleared ${removedCount} used/expired voucher(s) per the voucher cleanup policy.`);
    }
    return removedCount;
  }

  // ---- Per-router automatic clean-up --------------------------------
  // Prunes inactive users, wipes expired vouchers and clears remembered-
  // device cookies for ONE router, using that router's own settings.
  function getRouterCleanup(routerIp: string): RouterCleanupSettings {
    return { ...DEFAULT_ROUTER_CLEANUP, ...(routerCleanup[routerIp] ?? {}) };
  }

  function updateRouterCleanup(routerIp: string, updates: Partial<RouterCleanupSettings>, quiet = false) {
    setRouterCleanup((current) => ({
      ...current,
      [routerIp]: { ...DEFAULT_ROUTER_CLEANUP, ...(current[routerIp] ?? {}), ...updates },
    }));
    if (!quiet) {
      const router = routers.find((r) => r.ip === routerIp);
      showToast(`Clean-up settings saved for ${router?.name.split(" (")[0] ?? "this router"}.`);
      logActivity("Router", `Updated the clean-up settings for "${router?.name ?? routerIp}".`);
    }
  }

  function runRouterCleanup(routerIp: string) {
    const settings = getRouterCleanup(routerIp);
    const now = Date.now();
    const result = { users: 0, vouchers: 0, cookies: 0 };
    const routerOf = (v: Voucher) => agents.find((a) => a.id === v.agentId)?.routerIp ?? null;

    if (settings.vouchersEnabled) {
      const gone = new Set(
        expiredVouchersFor(vouchers, voucherBatches, routerIp, settings.vouchersAfterDays, routerOf, now).map((v) => v.code),
      );
      result.vouchers = gone.size;
      if (gone.size) setVouchers((current) => current.filter((v) => !gone.has(v.code)));
    }
    if (settings.pruneEnabled) {
      const gone = new Set(inactiveUsers(users, routerIp, settings.pruneAfterDays, now).map((u) => u.voucherUsername));
      result.users = gone.size;
      if (gone.size) setUsers((current) => current.filter((u) => !(u.routerIp === routerIp && gone.has(u.voucherUsername))));
    }
    if (settings.cookiesEnabled) {
      const stale = new Set(staleCookies(users, routerIp, settings.cookiesAfterDays, now).map((u) => u.voucherUsername));
      result.cookies = stale.size;
      if (stale.size) {
        setUsers((current) =>
          current.map((u) => (u.routerIp === routerIp && stale.has(u.voucherUsername) ? { ...u, cookieSetAtMs: undefined } : u)),
        );
      }
    }
    setRouterCleanup((current) => ({ ...current, [routerIp]: { ...DEFAULT_ROUTER_CLEANUP, ...(current[routerIp] ?? {}), lastRunMs: now } }));
    const total = result.users + result.vouchers + result.cookies;
    if (total > 0) {
      const router = routers.find((r) => r.ip === routerIp);
      logActivity(
        "Router",
        `Clean-up on "${router?.name ?? routerIp}": removed ${result.users} inactive user(s), ${result.vouchers} expired voucher(s), cleared ${result.cookies} cookie(s).`,
      );
    }
    return result;
  }

  function resendVoucherSms(code: string) {
    const voucher = findVoucher(code);
    if (!voucher) return;
    if (!voucher.redeemerPhone) {
      showToast(`${code} has no phone number on file — cannot resend SMS.`);
      return;
    }
    showToast(`Voucher SMS resent to ${voucher.redeemerPhone}.`);
    logActivity("Voucher", `Resent voucher SMS for ${code} to ${voucher.redeemerPhone}.`);
  }

  // Reassign selected voucher codes to a different package's rules —
  // e.g. switching a batch of vouchers from a "Daily" plan to a "1GB"
  // plan after the fact — without touching any other voucher.
  function bulkUpdateVoucherPackage(codes: string[], newPackageName: string) {
    if (codes.length === 0) return;
    const pkg = packages.find((p) => p.name === newPackageName);
    if (!pkg) {
      showToast("Choose a package first.");
      return;
    }
    const codeSet = new Set(codes);
    const affected = vouchers.filter((v) => codeSet.has(v.code));
    setVouchers((current) => {
      const next = current.map((v) => (codeSet.has(v.code) ? { ...v, packageName: newPackageName } : v));
      setVoucherBatches((batches) => reconcileBatchesFromVouchers(batches, next, packages));
      return next;
    });
    const ips = new Set<string>(pkg.routerIps);
    for (const v of affected) {
      const batch = v.batchId ? voucherBatches.find((b) => b.id === v.batchId) : null;
      batch?.routerIps.forEach((ip) => ips.add(ip));
    }
    if (ips.size > 0) queueRouterActionMany([...ips], "sync-vouchers");
    showToast(`${codes.length} voucher(s) switched to "${newPackageName}".`);
    logActivity("Voucher", `Bulk-switched ${codes.length} voucher(s) to package "${newPackageName}".`);
  }

  function bulkAssignVouchersToBatch(codes: string[], batchRef: string | null) {
    if (codes.length === 0) return;

    let targetBatchId: string | null = null;
    const selected = vouchers.filter((v) => codes.includes(v.code));
    if (batchRef) {
      const existing = voucherBatches.find(
        (batch) => batch.reference.toLowerCase() === batchRef.toLowerCase(),
      );
      targetBatchId = existing?.id ?? `batch-${Date.now()}`;

      if (!existing) {
        const packageName = selected[0]?.packageName ?? "Mixed";
        const pkg = packages.find((p) => p.name === packageName);
        const routerIps = pkg?.routerIps?.length ? pkg.routerIps : [];
        const fromPortal = routerIps.length > 0 ? loginMethodForRouterIps(routerIps, getCaptivePortalConfig) : null;
        const batchLoginMethod =
          fromPortal?.ok
            ? fromPortal.loginMethod
            : selected.some((v) => v.password)
              ? "credentials"
              : "code";
        setVoucherBatches((current) => [
          {
            id: targetBatchId as string,
            reference: batchRef,
            packageName,
            price: pkg?.price ?? "—",
            count: codes.length,
            isGiveaway: false,
            note: "Created via Bulk Assign",
            printDesign: "micro-strip",
            loginMethod: batchLoginMethod,
            createdAt: new Date().toLocaleString("en-GB", {
              day: "2-digit",
              month: "short",
              year: "numeric",
              hour: "2-digit",
              minute: "2-digit",
            }),
            createdAtMs: Date.now(),
            codes,
            agentId: currentAgentId,
            routerIps,
            assignedAgentIds: [],
            hiddenFromAdmin: false,
          },
          ...current,
        ]);
      }
    }

    setVouchers((current) => {
      const next = current.map((voucher) =>
        codes.includes(voucher.code) ? { ...voucher, batchId: targetBatchId } : voucher,
      );
      setVoucherBatches((batches) => reconcileBatchesFromVouchers(batches, next, packages));
      return next;
    });

    showToast(
      batchRef
        ? `${codes.length} voucher(s) assigned to "${batchRef}".`
        : `${codes.length} voucher(s) removed from their batch.`,
    );
    logActivity(
      "Voucher",
      batchRef
        ? `Bulk-assigned ${codes.length} voucher(s) to batch "${batchRef}".`
        : `Bulk-removed ${codes.length} voucher(s) from their batch.`,
    );
  }

  // Pushes the batches these vouchers belong to onto each selected agent —
  // but only the agents whose own router is actually covered by that
  // batch. An agent linked to a router the batch doesn't cover is simply
  // skipped, so a mixed selection of agents across different routers on
  // the same site each only get what's actually theirs.
  function bulkAssignVouchersToAgents(codes: string[], agentIds: string[]) {
    if (codes.length === 0 || agentIds.length === 0) return;

    const affectedBatchIds = new Set(
      vouchers
        .filter((v) => codes.includes(v.code) && v.batchId)
        .map((v) => v.batchId as string),
    );

    if (affectedBatchIds.size === 0) {
      showToast("No matching vouchers to push.");
      return;
    }

    const matchedAgentIds = new Set<string>();

    setVoucherBatches((current) =>
      current.map((batch) => {
        if (!affectedBatchIds.has(batch.id)) return batch;
        const eligible = agentIds.filter((agentId) => {
          const agent = agents.find((a) => a.id === agentId);
          return !!agent?.routerIp && batch.routerIps.includes(agent.routerIp);
        });
        eligible.forEach((id) => matchedAgentIds.add(id));
        if (eligible.length === 0) return batch;
        return {
          ...batch,
          assignedAgentIds: Array.from(new Set([...batch.assignedAgentIds, ...eligible])),
        };
      }),
    );

    if (matchedAgentIds.size === 0) {
      showToast("None of the selected agents are linked to a router these vouchers cover.");
      return;
    }

    const skipped = agentIds.length - matchedAgentIds.size;
    const matchedNames = agentIds
      .filter((id) => matchedAgentIds.has(id))
      .map((id) => agents.find((a) => a.id === id)?.name)
      .filter(Boolean)
      .join(", ");

    showToast(
      `Pushed to ${matchedAgentIds.size} agent${matchedAgentIds.size === 1 ? "" : "s"}.${
        skipped > 0 ? ` ${skipped} skipped (router mismatch).` : ""
      }`,
    );
    logActivity(
      "Voucher",
      `Bulk-pushed vouchers to: ${matchedNames}.${
        skipped > 0 ? ` ${skipped} agent(s) skipped — their router isn't covered by these vouchers.` : ""
      }`,
    );
  }

  // --- Branding -----------------------------------------------------------

  function updateBranding(updates: Partial<BrandingSettings>) {
    setBranding((current) => ({ ...current, ...updates }));
    showToast("Settings saved.");
    logActivity("Settings", "Updated business branding settings.");
  }

  function updatePortalControls(updates: Partial<PortalControls>) {
    setPortalControls((current) => ({ ...current, ...updates }));
    showToast("Portal settings updated.");
    logActivity("Settings", "Updated portal feature controls.");
  }


  function updateHotspotPolicySettings(updates: Partial<HotspotPolicySettings>) {
    setHotspotPolicySettings((current) => ({ ...current, ...updates }));
    showToast("Hotspot settings saved.");
    logActivity("Settings", "Updated hotspot voucher/agent policy settings.");
  }

  function updateAdminRolePermission(roleKey: string, permissionKey: string, state: AdminPermissions[string]) {
    setAdminRolePermissions((current) => ({
      ...current,
      [roleKey]: { ...current[roleKey], [permissionKey]: state },
    }));
    const role = ADMIN_ROLE_PRESETS.find((r) => r.key === roleKey);
    logActivity("Settings", `Updated "${permissionKey}" permission for the ${role?.label ?? roleKey} role.`);
  }

  function resetAdminRoleToPreset(roleKey: string) {
    const preset = ADMIN_ROLE_PRESETS.find((r) => r.key === roleKey);
    if (!preset) return;
    setAdminRolePermissions((current) => ({ ...current, [roleKey]: preset.build() }));
    showToast(`${preset.label} reset to its default permissions.`);
    logActivity("Settings", `Reset the ${preset.label} role to its default permissions.`);
  }

  function addAdminTeamMember(name: string, email: string, phone: string, roleKey: string) {
    const newMember: AdminTeamMember = {
      id: `admin-${Date.now()}`,
      name,
      email,
      phone,
      roleKey,
      status: "Pending",
      isOwner: false,
      createdAt: new Date().toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric" }),
    };
    setAdminTeam((current) => [...current, newMember]);
    const role = ADMIN_ROLE_PRESETS.find((r) => r.key === roleKey);
    showToast(`${name} invited as ${role?.label ?? roleKey}. They'll appear as Pending until they accept.`);
    logActivity("Settings", `Added "${name}" to the admin team as ${role?.label ?? roleKey}.`);
    return newMember;
  }

  function updateAdminTeamMemberRole(id: string, roleKey: string) {
    setAdminTeam((current) => current.map((m) => (m.id === id ? { ...m, roleKey } : m)));
    const member = adminTeam.find((m) => m.id === id);
    const role = ADMIN_ROLE_PRESETS.find((r) => r.key === roleKey);
    showToast(`${member?.name ?? "Admin"}'s role changed to ${role?.label ?? roleKey}.`);
    logActivity("Settings", `Changed "${member?.name ?? id}"'s admin role to ${role?.label ?? roleKey}.`);
  }

  function setAdminTeamMemberStatus(id: string, status: AdminTeamMember["status"]) {
    const member = adminTeam.find((m) => m.id === id);
    if (member?.isOwner) {
      showToast("The account owner can't be suspended.");
      return;
    }
    setAdminTeam((current) => current.map((m) => (m.id === id ? { ...m, status } : m)));
    showToast(`${member?.name ?? "Admin"} is now ${status}.`);
    logActivity("Settings", `Set "${member?.name ?? id}"'s admin account to ${status}.`);
  }

  function removeAdminTeamMember(id: string) {
    const member = adminTeam.find((m) => m.id === id);
    if (member?.isOwner) {
      showToast("The account owner can't be removed.");
      return;
    }
    setAdminTeam((current) => current.filter((m) => m.id !== id));
    showToast(`${member?.name ?? "Admin"} removed from the admin team.`);
    logActivity("Settings", `Removed "${member?.name ?? id}" from the admin team.`);
  }

  // Captive portal / hotspot config is scoped per router. Routers without
  // a saved config yet fall back to sensible defaults.





  function addInstaller(name: string, email: string, phone: string) {
    const newInstaller: InstallerProfile = {
      id: `installer-${Date.now()}`,
      name,
      email,
      phone,
      status: "Active",
      assignedSiteId: null,
      assignedRouterIp: null,
      password: null,
      createdAt: new Date().toLocaleDateString("en-GB", {
        day: "2-digit",
        month: "short",
        year: "numeric",
      }),
    };
    setInstallers((current) => [...current, newInstaller]);
    return newInstaller;
  }

  // Self-registration from the Reseller Portal gateway page -- an
  // installer creating their own login, distinct from admin adding one
  // manually above (which has no password). Not assigned to any site
  // yet; admin does that from the Installers page once they're ready.
  function registerInstaller(name: string, email: string, phone: string, password: string) {
    if (installers.some((i) => i.email.toLowerCase() === email.toLowerCase())) {
      showToast("An installer with that email already has an account.");
      return null;
    }
    const newInstaller: InstallerProfile = {
      id: `installer-${Date.now()}`,
      name,
      email,
      phone,
      status: "Active",
      assignedSiteId: null,
      assignedRouterIp: null,
      password,
      createdAt: new Date().toLocaleDateString("en-GB", {
        day: "2-digit",
        month: "short",
        year: "numeric",
      }),
    };
    setInstallers((current) => [...current, newInstaller]);
    showToast(`Welcome, ${name.split(" ")[0]}! Your installer account is ready.`);
    logActivity("Settings", `New installer "${name}" self-registered from the Reseller Portal.`);
    return newInstaller;
  }

  function assignInstallerToSite(installerId: string, siteId: string, routerIp: string | null = null) {
    const installer = installers.find((i) => i.id === installerId);
    const site = businessLocations.find((s) => s.id === siteId);
    if (!installer || !site) return;

    setInstallers((current) =>
      current.map((i) => (i.id === installerId ? { ...i, assignedSiteId: siteId, assignedRouterIp: routerIp } : i)),
    );

    setInstallDispatches((current) => {
      const existing = current.find((d) => d.installerId === installerId && d.siteId === siteId);
      if (existing) return current;
      const newDispatch: InstallDispatch = {
        id: `dispatch-${Date.now()}`,
        installerId,
        siteId,
        clientAgentId: null,
        status: "In Progress",
        dispatchedAt: null,
        notes: "",
        createdAt: new Date().toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric" }),
      };
      return [newDispatch, ...current];
    });

    showToast(`${installer.name} assigned to ${site.name}.`);
    logActivity("Settings", `Assigned installer "${installer.name}" to "${site.name}".`);
  }

  function dispatchToClient(
    dispatchId: string,
    clientName: string,
    clientEmail: string,
    clientPhone: string,
  ) {
    const dispatch = installDispatches.find((d) => d.id === dispatchId);
    if (!dispatch) return;
    const site = businessLocations.find((s) => s.id === dispatch.siteId);
    const installer = installers.find((i) => i.id === dispatch.installerId);

    // The client only ever gets an Agent record — the same restricted
    // agent-portal experience every agent gets, with zero access to admin
    // configuration. This is what makes "dispatch" safe: handing off never
    // grants admin/config access, only their own agent dashboard.
    const clientAgent = addAgent(clientName, clientEmail, "Associate Admin", installer?.assignedRouterIp ?? null);
    setAgentStatus(clientAgent.id, "Active");

    // Hybrid access: the client gets full, unrestricted use of their own
    // dashboard, and the installer/admin keeps permanent, transparent
    // standing access alongside them — not a workaround, a real recorded
    // relationship the client can see and revoke themselves at any time.
    dispatchAgentAccess(clientAgent.id, "Permanent", true);

    setInstallDispatches((current) =>
      current.map((d) =>
        d.id === dispatchId
          ? {
              ...d,
              status: "Dispatched",
              clientAgentId: clientAgent.id,
              dispatchedAt: new Date().toLocaleString("en-GB", {
                day: "2-digit", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit",
              }),
            }
          : d,
      ),
    );

    showToast(`Dispatched "${site?.name ?? "site"}" to ${clientName} — they now have their own agent dashboard.`);
    logActivity(
      "Agent",
      `${installer?.name ?? "An installer"} dispatched "${site?.name ?? dispatch.siteId}" to client ${clientName} (${clientPhone}).`,
    );
  }




  function updatePaymentSettings(updates: Partial<PaymentSettings>) {
    setPaymentSettings((current) => ({ ...current, ...updates }));
    showToast("Payment gateway settings saved.");
    logActivity("Settings", `Updated payment gateway settings (${updates.gateway ?? paymentSettings.gateway}).`);
  }

  // Resolves which gateway/credentials a specific business should use:
  // its own override if one exists and the strategy is "per-business",
  // otherwise the shared account-wide settings.
  function getPaymentSettingsForBusiness(businessId: string): PaymentSettings {
    if (paymentGatewayStrategy === "per-business") {
      return businessPaymentConfigs[businessId] ?? paymentSettings;
    }
    return paymentSettings;
  }

  function updateBusinessPaymentSettings(businessId: string, updates: Partial<PaymentSettings>) {
    setBusinessPaymentConfigs((current) => ({
      ...current,
      [businessId]: { ...(current[businessId] ?? paymentSettings), ...updates },
    }));
    const business = businessLocations.find((b) => b.id === businessId);
    showToast(`Payment settings saved for ${business?.name ?? "this business"}.`);
    logActivity("Settings", `Updated payment gateway settings for "${business?.name ?? businessId}".`);
  }

  function updatePaymentGatewayStrategy(strategy: PaymentGatewayStrategy) {
    setPaymentGatewayStrategy(strategy);
    showToast(
      strategy === "same"
        ? "Every business will now use the same payment gateway."
        : "Each business can now have its own payment gateway.",
    );
    logActivity("Settings", `Changed payment gateway strategy to ${strategy}.`);
  }

  function requestPaymentGateway(request: Omit<PaymentGatewayRequest, "id" | "requestedAt">) {
    const entry: PaymentGatewayRequest = {
      ...request,
      id: `pgr-${Date.now()}`,
      requestedAt: new Date().toLocaleDateString("en-GB", {
        day: "2-digit",
        month: "short",
        year: "numeric",
      }),
    };
    setPaymentGatewayRequests((current) => [entry, ...current]);
    showToast(`Request submitted for "${request.gatewayName}". We'll be in touch once it's added.`);
    logActivity("Settings", `Requested new payment gateway "${request.gatewayName}".`);
  }

  function updateSecuritySettings(updates: Partial<SecuritySettings>) {
    setSecuritySettings((current) => ({ ...current, ...updates }));
    showToast("Security settings saved.");
    logActivity("Settings", "Updated security / 2FA settings.");
  }

  function addLinkedSite(name: string, subdomain: string) {
    const site: LinkedSite = { id: `site-${Date.now()}`, name, subdomain };
    setSitesSettings((current) => ({
      ...current,
      linkedSites: [...current.linkedSites, site],
    }));
    showToast(`Site "${name}" added.`);
    logActivity("Settings", `Added linked site "${name}" (${subdomain}.hotspotpro.com).`);
  }

  function removeLinkedSite(id: string) {
    setSitesSettings((current) => ({
      ...current,
      linkedSites: current.linkedSites.filter((site) => site.id !== id),
    }));
    showToast("Linked site removed.");
    logActivity("Settings", "Removed a linked site.");
  }

  function updateNotificationSettings(updates: Partial<NotificationSettings>) {
    setNotificationSettings((current) => ({ ...current, ...updates }));
    showToast("Notification settings saved.");
    logActivity("Settings", "Updated notification settings.");
  }

  // --- Agent profiles -------------------------------------------------




  // Hand the agent/client portal over to whoever is set up on this agent
  // profile. "Permanent" vs "Temporary" is only a label for intent — both
  // are revoked the same manual way, via setAgentStatus/revokeAgentAccess.
  // allowAdminAccess controls whether the admin/installer keeps the ability
  // to open this agent's dashboard after a Permanent dispatch.

  // Whether the admin/installer is currently allowed to open this agent's
  // dashboard themselves. Locked only when access was dispatched as
  // Permanent without allowAdminAccess.


  // Lets the CLIENT themselves turn their installer/admin's standing
  // support access on or off, without touching their own account status.
  // This is the client-facing half of the hybrid access model: full,
  // unaffected use of their own dashboard either way.












  // Check every 10 seconds for any session whose real time has run out, and
  // remove it automatically — this is separate from the manual Disconnect
  // toggle, which stays reversible.
  //
  // TEMPORARILY DISABLED at the user's request while they finish backend
  // work — flip AUTO_EXPIRY_ENABLED (top of file) back to true to re-enable
  // real time/data-based expiry.
  useEffect(() => {
    if (!AUTO_EXPIRY_ENABLED) return;

    const interval = window.setInterval(() => {
      const now = Date.now();
      (Object.entries(sessionExpiresAt) as [string, number][]).forEach(([userId, expiresAt]) => {
        if (expiresAt <= now) {
          expireUserSession(userId);
        }
      });
    }, 10000);

    return () => window.clearInterval(interval);
  }, [sessionExpiresAt]);

  // Simulates real data consumption for online users, and expires anyone
  // whose data allowance (from their voucher/package) runs out — exactly
  // like running out of time. Also disabled while AUTO_EXPIRY_ENABLED is
  // false.
  useEffect(() => {
    if (!AUTO_EXPIRY_ENABLED) return;

    const interval = window.setInterval(() => {
      setDataRemainingMb((current) => {
        const next = { ...current };

        users.forEach((user) => {
          const userId = user.phone || user.voucherUsername;
          const state = getConnectionState(userId);
          if (state.blocked || state.paused || next[userId] === undefined) {
            return;
          }

          const remaining = next[userId];
          if (remaining <= 0) {
            return;
          }

          const consumedMb = 5 + Math.random() * 25;
          next[userId] = Math.max(0, remaining - consumedMb);
        });

        return next;
      });
    }, 10000);

    return () => window.clearInterval(interval);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [users, userConnectionState]);

  useEffect(() => {
    if (!AUTO_EXPIRY_ENABLED) return;

    (Object.entries(dataRemainingMb) as [string, number][]).forEach(
      ([userId, remainingMb]) => {
        if (remainingMb <= 0) {
          expireUserSession(userId, "Data allowance used up");
        }
      },
    );
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [dataRemainingMb]);

  // Watches every router's online/offline status and fires the
  // routerOffline/routerOnline alerts whenever one actually flips —
  // comparing against the previous snapshot so this fires once per real
  // transition, not on every render.
  const previousRouterEnabledRef = useRef<Record<string, boolean>>(routerEnabled);
  useEffect(() => {
    const previous = previousRouterEnabledRef.current;
    Object.entries(routerEnabled).forEach(([ip, isEnabled]) => {
      const wasEnabled = previous[ip];
      if (wasEnabled === undefined || wasEnabled === isEnabled) return;

      const router = routers.find((r) => r.ip === ip);
      if (!router) return;

      if (isEnabled) {
        fireAlert("routerOnline", `${router.name} is back online.`, { routerIp: ip });
      } else {
        fireAlert("routerOffline", `${router.name} has gone offline.`, { routerIp: ip });
      }
    });
    previousRouterEnabledRef.current = routerEnabled;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [routerEnabled]);

  // Each router's own clean-up runs once a day at the time set for it.
  useEffect(() => {
    const interval = window.setInterval(() => {
      routers.forEach((r) => {
        if (isDue(getRouterCleanup(r.ip))) runRouterCleanup(r.ip);
      });
    }, 60 * 1000);
    return () => window.clearInterval(interval);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [routers, routerCleanup, users, vouchers, voucherBatches, agents]);

  // Runs the voucher cleanup policy automatically every few minutes, so
  // admin doesn't have to remember to clear old vouchers manually.
  useEffect(() => {
    const interval = window.setInterval(() => {
      runVoucherCleanup();
    }, 3 * 60 * 1000);
    return () => window.clearInterval(interval);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [defaultVoucherCleanupPolicy, routerVoucherCleanupPolicies, agents]);

  // Flips to true in the same render in which every saved slice (declared
  // above) has been loaded — its effect is registered after theirs, so
  // React applies them all together. Screens wait on this so they never
  // flash "not found" for something that exists in saved data.
  // With the server in play it also waits for the server's copy of the data
  // (or for the server to turn out unavailable) before saying "ready".
  const [storeReady, setStoreReady] = useState(false);
  const syncReady = useSyncReady();
  useEffect(() => {
    if (syncReady) setStoreReady(true);
  }, [syncReady]);

  const selectedSiteId = siteIdOfScope(dashboardScope, routers, agents) ?? "all";
  function setSelectedSiteId(siteId: string) {
    setDashboardScope(
      siteId === "all" ? EVERYTHING : { kind: "site", siteId, routerIp: null, agentId: null },
    );
  }

  const value: DashboardContextValue = {
    mobileSidebarOpen,
    setMobileSidebarOpen,
    sidebarCollapsed,
    setSidebarCollapsed,
    darkMode,
    themeLoaded,
    toggleTheme,
    dashboardLanguage,
    dashboardPeriod,
    setDashboardPeriod,
    dashboardScope,
    setDashboardScope,
    selectedSiteId,
    setSelectedSiteId,
    updateDashboardLanguage,
    users,
    findUser,
    userConnectionState,
    getConnectionState,
    togglePauseUser,
    toggleDisconnectUser,
    toggleBlockUser,
    extendUserAccess,
    topUpUserData,
    dataRemainingMb,
    changeUserPackage,
    resetUserPassword,
    deleteUser,
    copyLoginDetails,
    openUserAction,
    openUserActions,
    openRouterAction,
    openRouterActions,
    closeAllActionMenus,
    routerEnabled,
    routers,
    addRouter,
    businessLocations,
    addBusinessLocation,
    updateBusinessLocationSsid,
    toggleSiteEnabled,
    accessPoints,
    findAccessPoint,
    addAccessPoint,
    updateAccessPoint,
    deleteAccessPoint,
    setAccessPointStatus,
    momoSettings,
    updateMomoSettings,
    saveMomoSettings,
    testMomoConnection,
    autoRenewDisabledPhones,
    disableAutoRenewForCustomer,
    enableAutoRenewForCustomer,
    subscription,
    renewSubscription,
    setBillingModel,
    payCommission,
    revenueSettings,
    updateRevenueSettings,
    saveRevenueSettings,
    applyCaptivePortalToSites,
    installers,
    registerInstaller,
    addInstaller,
    installDispatches,
    assignInstallerToSite,
    dispatchToClient,
    inviteManagerToSite,
    runRouterHealthCheck,
    fullProvisionRouter,
    routerTask,
    startRouterTask,
    confirmRouterTask,
    closeRouterTask,
    regenerateApiCredentials,
    regenerateWinboxAddress,
    syncHotspotFiles,
    syncRouterTime,
    configureSnmp,
    configureWalledGarden,
    hardenServices,
    updateRouterScript,
    downloadRouterFile,
    updateRouterNotificationContacts,
    updateMultiWanConfig,
    updateRouterDetails,
    applyRouterPatch,
    toggleRemoteAccess,
    updateConnectionMode,
    deleteRouter,
    syncRouter,
    restartRouter,
    toggleRouterPaused,
    toggleRouterConnection,
    getRouterConfig,
    updateRouterConfig,
    getEffectiveSsid,
    masterPortal,
    setMasterPortal,
    confirmAction,
    requestConfirmAction,
    cancelConfirmAction,
    confirmDialogAction,
    toastMessage,
    showToast,
    packages,
    findPackage,
    addPackage,
    updatePackage,
    setPackageStatus: setPackageStatusAndSync,
    deletePackage,
    duplicatePackage,
    expirePackageVouchers,
    pushPackageToAgents,
    removePackagePush,
    vouchers,
    defaultVoucherCleanupPolicy,
    routerVoucherCleanupPolicies,
    getVoucherCleanupPolicy,
    updateDefaultVoucherCleanupPolicy,
    updateRouterVoucherCleanupPolicy,
    clearRouterVoucherCleanupOverride,
    runVoucherCleanup,
    routerCleanup,
    getRouterCleanup,
    updateRouterCleanup,
    runRouterCleanup,
    findVoucher,
    generateVouchers,
    createVoucher,
    assignVoucher,
    deleteVoucher,
    expireVouchers,
    resendVoucherSms,
    bulkAssignVouchersToBatch,
    bulkUpdateVoucherPackage,
    bulkAssignVouchersToAgents,
    voucherBatches,
    voucherPresets,
    saveVoucherPreset,
    deleteVoucherPreset,
    updateVoucherPreset,
    pushVoucherPresetToAgents,
    removeVoucherPresetPush,
    deleteVoucherBatch,
    findBatch,
    generateVoucherBatch,
    isVoucherBatchVisibleToAgent,
    getAgentsOnRouters,
    getAssignedVoucherBatchesForAgent,
    setBatchPrintDesign,
    toggleWalletFundingRequirement,
    getMaxAffordableVouchers,
    branding,
    updateBranding,
    portalControls,
    updatePortalControls,
    hotspotSettings,
    updateHotspotSettings,
    agents,
    currentAgentId,
    currentAgent: findAgent(currentAgentId) ?? agents[0],
    findAgent,
    addAgent,
    deleteAgent,
    switchCurrentAgent,
    actAsAgent,
    storeReady,
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
    agentCollections,
    recordAgentCollection,
    deleteAgentCollection,
    updateAgentPermissions,
    agentRolePermissions,
    toggleAgentRolePermission,
    resetAgentRolePermissions,
    updateAgentLimits,
    updateAgentRouter,
    adjustAgentWallet,
    applyAgentDashboardMode,
    toggleAgentWalletTopUp,
    setAgentDeviceStatus,
    approvalRequests,
    submitApprovalRequest,
    decideApproval,
    messageTemplates,
    updateMessageTemplate,
    agentMessageLog,
    sendAgentMessage,
    subscriptionPlan,
    setSubscriptionPlan,
    activityLog,
    alertRules,
    updateAlertRule,
    addAlertRule,
    deleteAlertRule,
    fireAlert,
    markAlertRead,
    getAdminAlerts,
    getAgentAlerts,
    logActivity,
    clearHistory,
    historyRetention,
    updateHistoryRetention,
    dataUsageResetAt,
    clearDataUsageHistory,
    loyaltySettings,
    loyaltyStrategy,
    updateLoyaltyStrategy,
    getLoyaltySettingsForBusiness,
    updateBusinessLoyaltySettings,
    updateLoyaltySettings,
    hotspotPolicySettings,
    updateHotspotPolicySettings,
    adminRolePermissions,
    updateAdminRolePermission,
    resetAdminRoleToPreset,
    adminTeam,
    addAdminTeamMember,
    updateAdminTeamMemberRole,
    setAdminTeamMemberStatus,
    removeAdminTeamMember,
    systemUsers,
    addSystemUser,
    updateSystemUser,
    deleteSystemUser,
    toggleSystemUserTwoFactor,
    accessRolePermissions,
    toggleAccessRolePermission,
    updateAccessRoleMeta,
    accessRoleOverrides,
    resetAccessRoleToDefault,
    getCaptivePortalConfig,
    updateCaptivePortalConfig,
    getCaptivePortalConfigForSite,
    updateCaptivePortalConfigForSite,
    paymentSettings,
    updatePaymentSettings,
    paymentGatewayStrategy,
    updatePaymentGatewayStrategy,
    businessPaymentConfigs,
    getPaymentSettingsForBusiness,
    updateBusinessPaymentSettings,
    requestPaymentGateway,
    securitySettings,
    updateSecuritySettings,
    sitesSettings,
    addLinkedSite,
    removeLinkedSite,
    notificationSettings,
    updateNotificationSettings,
    getLoyaltyPoints,
    redeemLoyaltyPoints,
    commissionSettings,
    maxAgentCommissionPercent,
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
    voucherAlertLog,
    updateMaxAgentCommissionPercent,
    setAgentCommissionRate,
    setAgentMaxResaleMarkup,
    acknowledgeResaleRule,
    updateCommissionSettings,
    shopProducts,
    likedProductIds,
    toggleLikeProduct,
    purchaseProduct,
  };

  return (
    <DashboardContext.Provider value={value}>
      {children}
    </DashboardContext.Provider>
  );
}

export function useDashboard() {
  const context = useContext(DashboardContext);

  if (!context) {
    throw new Error("useDashboard must be used within a DashboardProvider");
  }

  return context;
}
