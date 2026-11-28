// Router actions still use a confirm dialog (not a separate page)
export type ConfirmAction = {
  type: "disable-router" | "enable-router" | "remove-router";
  routerIp: string;
  routerName: string;
  /** When set (delete), user must type this exact code before Confirm is enabled. */
  confirmCode?: string;
  /** True when the router was Online / in use — stronger delete warning. */
  working?: boolean;
};

export type UserConnectionState = {
  paused: boolean;
  disconnected: boolean;
  blocked: boolean;
};

export type UserConnectionStateMap = Record<string, UserConnectionState>;

// --- Packages -------------------------------------------------------------

export type PackageStatus = "Active" | "Hidden" | "Disabled";

export type PackageDurationUnit = "Minutes" | "Hours" | "Days" | "Weeks" | "Months";
export type FupUnit = "MB" | "GB";

export type Package = {
  id: string;
  name: string;
  description: string;
  price: string;
  validity: string;
  durationValue: number;
  durationUnit: PackageDurationUnit;
  download: string;
  upload: string;
  downloadMbps: number;
  uploadMbps: number;
  fupValue: number | null;
  fupUnit: FupUnit;
  // Data throttling: once a user on this package crosses the threshold
  // below, their speed is reduced to throttleSpeedMbps instead of being
  // cut off — distinct from fupValue above, which is a hard cutoff.
  throttleEnabled: boolean;
  throttleAtValue: number | null;
  throttleAtUnit: FupUnit;
  throttleSpeedMbps: number;
  devices: number;
  customers: number;
  status: PackageStatus;
  freeTrial: boolean;
  burstEnabled: boolean;
  scheduleEnabled: boolean;
  pppoeEnabled: boolean;
  hotspotEnabled: boolean;
  agentResellingEnabled: boolean;
  agentPrice: string;
  featured: boolean;
  displayOrder: number;
  agentId: string;
  routerIps: string[];
  // If set, this package was applied to every router under this business
  // site rather than picked router-by-router — routerIps is kept in sync
  // with that site's routers. Null means the routers were hand-picked (or
  // applyToAllSites is true).
  applySiteId: string | null;
  // If true, this package applies to every router across every site —
  // routerIps is kept in sync with the full router list. Lets one package
  // (e.g. a standard "5GH Daily" plan) be sold from any site/router,
  // including ones created after the package was.
  applyToAllSites: boolean;
  // If true, every agent — including ones added later — can sell this
  // package, whichever router they're on.
  applyToAllAgents?: boolean;
  // Agents explicitly granted access to sell this package, beyond
  // whoever already qualifies by router. Lets admin hand one specific
  // agent a package even if their router isn't in routerIps, and lets an
  // agent without packages.create still sell something admin pushed them.
  pushedToAgentIds: string[];
};

export type PackageInput = {
  name: string;
  description: string;
  durationValue: number;
  durationUnit: PackageDurationUnit;
  uploadMbps: number;
  downloadMbps: number;
  fupValue: number | null;
  fupUnit: FupUnit;
  throttleEnabled: boolean;
  throttleAtValue: number | null;
  throttleAtUnit: FupUnit;
  throttleSpeedMbps: number;
  price: string;
  devices: number;
  freeTrial: boolean;
  burstEnabled: boolean;
  scheduleEnabled: boolean;
  pppoeEnabled: boolean;
  hotspotEnabled: boolean;
  agentResellingEnabled: boolean;
  agentPrice: string;
  status: PackageStatus;
  featured: boolean;
  displayOrder: number;
  routerIps: string[];
  applySiteId: string | null;
  applyToAllSites: boolean;
  applyToAllAgents?: boolean;
};

// --- Vouchers ---------------------------------------------------------------

export type VoucherStatus = "Available" | "Used" | "Expired";
export type VoucherDelivery = "Printed" | "SMS" | "WhatsApp" | "Online";
export type VoucherSaleType =
  | "Counter Sale"
  | "Online"
  | "Free Trial"
  | "Giveaway"
  | "Unassigned";

export type VoucherCodeFormat =
  | "uppercase"
  | "lowercase"
  | "letters-lower"
  | "mixed"
  | "numeric";
/** days: time only. data: gigabytes only. both: the voucher ends when either runs out. */
export type VoucherLimitBy = "days" | "data" | "both";
/** signin: the day starts at the first login and keeps running. usage: the day runs only while they are online. */
export type VoucherCountFrom = "signin" | "usage";

export type Voucher = {
  code: string;
  // Only set when the batch's login method is "credentials" — the
  // customer logs in with code (as username) + password instead of a
  // single code.
  password: string | null;
  packageName: string;
  status: VoucherStatus;
  delivery: VoucherDelivery;
  saleType: VoucherSaleType;
  usedByCustomerId: string | null;
  redeemerPhone: string | null;
  generatedAt: string;
  // A real numeric timestamp alongside the display string above — needed
  // so voucher cleanup can actually compute "how many days old is this."
  generatedAtMs: number;
  // When the voucher was actually used (sold). Older vouchers never recorded
  // this, so anything reading it falls back to generatedAtMs.
  usedAtMs?: number;
  agentId: string;
  batchId: string | null;
  /** Missing on older vouchers: both the day and the data, starting at sign-in. */
  limitBy?: VoucherLimitBy;
  countFrom?: VoucherCountFrom;
};

export type VoucherLoginMethod = "code" | "credentials";

/** How long a deleted package can still be restored. */
export const PACKAGE_RESTORE_MS = 3 * 24 * 60 * 60 * 1000;

/**
 * A package deleted on the site, kept so it can be restored within PACKAGE_RESTORE_MS.
 * keepCustomers: customers already on it carry on until their time runs out (the server still reads
 * the package for their vouchers). Otherwise their vouchers were ended and they were signed out;
 * endedVouchers remembers each voucher's status before, so a restore gives them back.
 */
export type DeletedPackage = {
  pkg: Package;
  deletedAtMs: number;
  keepCustomers: boolean;
  endedVouchers: { code: string; status: VoucherStatus }[];
};

// A saved set of voucher-generation settings — pick it next time instead
// of reconfiguring package, code format, router scope, etc. from scratch.
export type VoucherPreset = {
  id: string;
  name: string;
  packageName: string;
  quantity: number;
  codeFormat: VoucherCodeFormat;
  codeLength: number;
  prefix: string;
  loginMethod: VoucherLoginMethod;
  limitBy?: VoucherLimitBy;
  countFrom?: VoucherCountFrom;
  isGiveaway: boolean;
  routerIps: string[];
  createdAt: string;
  // Who created it — an agent's own preset is theirs to use right away;
  // everyone else needs it pushed to them by admin first.
  ownerAgentId: string;
  // Agents this preset has been pushed to — they can use it straight
  // from their own agent portal to generate vouchers with these exact
  // settings, without needing admin to do it for them each time.
  pushedToAgentIds: string[];
};

export type VoucherBatch = {
  id: string;
  reference: string;
  packageName: string;
  price: string;
  count: number;
  isGiveaway: boolean;
  note: string;
  printDesign: string;
  // How customers on this batch log in — a single code, or a
  // username + password pair (code doubles as the username either way).
  loginMethod: VoucherLoginMethod;
  limitBy?: VoucherLimitBy;
  countFrom?: VoucherCountFrom;
  createdAt: string;
  // Real numeric timestamp alongside the display string — needed for
  // actual "created within X" time-period filtering.
  createdAtMs: number;
  codes: string[];
  agentId: string;
  // The router(s) these vouchers were generated for — picked explicitly
  // at creation time, either one router, several, or every router on a
  // site at once. Other agents linked to any of these routers can use
  // vouchers from this batch.
  routerIps: string[];
  // Agents this batch was explicitly pushed to by whoever created it.
  // Only agents with the "voucher.viewAssignedByAdmin" permission can see
  // batches assigned to them on their own portal.
  assignedAgentIds: string[];
  // Admin "deleted" this batch, but chose to keep it visible for the
  // agents it was pushed to — so it's hidden from every admin-facing
  // list (and admin's own direct URL to it 404s) while still showing up
  // normally in those agents' own portals. Only meaningful alongside a
  // non-empty assignedAgentIds; otherwise there'd be nobody left to keep
  // it visible for, so a normal delete just removes it outright.
  hiddenFromAdmin: boolean;
  // What the agent paid from their wallet when generating this batch, in
  // GH₵. Only recorded for batches generated from now on.
  walletCharged?: number;
};

// --- Branding / Settings ---------------------------------------------------

export type BrandingSettings = {
  businessName: string;
  brandColor: string;
  supportNumber: string;
  secondSupportNumber: string;
  whatsappNumber: string;
  supportEmail: string;
  pppoePortalUrl: string;
  logoFileName: string | null;
};

export type HistoryRetention = "Never" | "30 Days" | "90 Days" | "1 Year";

export type ActivityLogEntry = {
  id: string;
  timestamp: string;
  category:
    | "Voucher"
    | "Package"
    | "Router"
    | "Agent"
    | "User"
    | "Settings";
  message: string;
};

export type BillingModel = "Subscription" | "Commission";

export type SubscriptionPlan = "Starter" | "Growth" | "Pro";

// The flat-fee monthly billing relationship between this tenant and
// HotspotPro itself — separate from SubscriptionPlan above (which is the
// older tiered-feature picker). This is a prepaid, pay-ahead model: paid
// until a date, with a grace period after the billing day before the
// account is considered past due.
export type BillingPaymentMethod = "Card or Mobile Money" | "Bank Transfer";
export type BillingRecordStatus = "completed" | "pending" | "failed";

export type BillingHistoryRecord = {
  id: string;
  date: string;
  reference: string;
  method: string;
  amount: number;
  status: BillingRecordStatus;
};

export type BillingSubscription = {
  status: "Active" | "Past Due" | "Suspended";
  monthlyFee: number;
  memberSince: string;
  paidUntilIso: string;
  billingDay: number;
  graceDays: number;
  history: BillingHistoryRecord[];
};


export type HotspotSettings = {
  ssid: string;
  ssidStrategy: "same" | "per-router";
  wifiPassword: string;
  bandwidthLimit: string;
  sessionTimeout: string;
  idleTimeout: string;
  redirectUrl: string;
};


export type PortalControls = {
  hotspotEnabled: boolean;
  pppoeEnabled: boolean;
  voucherSalesEnabled: boolean;
  resellerPortalEnabled: boolean;
  customerSelfRegistration: boolean;
  smsNotifications: boolean;
};

// --- Agent profiles ---------------------------------------------------------
// Every voucher and package is created under an agent profile. New accounts
// get an automatic, undeletable "Owner" agent profile so vouchers can be
// created immediately; more agents can be added afterwards.

export type RouterConfig = {
  ssid: string;
  wifiPassword: string;
  bandwidthDownMbps: number;
  bandwidthUpMbps: number;
  adminUsername: string;
  vlanId: string;
};

export type CommissionSettings = {
  enabled: boolean;
  ratePercent: number;
};

export type LoyaltySettings = {
  enabled: boolean;
  pointsPerHourOnline: number;
  pointsToVoucherThreshold: number;
  rewardPackageName: string;
};

export type HotspotPolicySettings = {
  mobileMoneyVoucherCodeLength: number;
  printedVoucherDefaultLength: number;
  printedVoucherDefaultFormat: "Alphanumeric (A-Z, 0-9)" | "Numeric (0-9)" | "Letters (A-Z)";
  voucherGenerationStyle: "Voucher Studio (new)" | "Classic";
  voucherCodePrefix: string;
  customerIdPrefix: string;

  // Session management
  pruneInactiveUsersAfterDays: number;
  autoReconnectMethod: "MAC-Cookie (Recommended)" | "IP Binding";
  deviceRememberDurationDays: number;

  // Agent settings
  agentPortalEnabled: boolean;
  allowAgentsToViewVoucherCodes: boolean;
  agentResellingEnabled: boolean;
  agentPricingModel: "Per Package — Set a custom agent price on each package" | "Percentage Discount" | "Fixed Markup";
  voucherMinQuantity: number;
  voucherMaxQuantity: number;
  smsVoucherSalesEnabled: boolean;

  // PPPoE self-registration
  pppoeSelfRegistrationEnabled: boolean;

  // Tethering protection
  tetheringProtectionEnabled: boolean;
  tetheringAction: "Block Connection" | "Log Only";
};

export type PaymentSettings = {
  gateway: string;
  sandboxMode: boolean;
  consumerKey: string;
  consumerSecret: string;
  ipnId: string;
  // Hubtel only: sent as merchantAccountNumber and used in the status-check URL.
  collectionAccountNumber?: string;
};

// "same" = one gateway/credentials for every business on the account.
// "per-business" = each business/site can have its own gateway and its
// own credentials — e.g. one business uses MTN Mobile Money with its own
// merchant details, another uses PesaPal with different ones.
export type PaymentGatewayStrategy = "same" | "per-business";

export type PaymentGatewayRequest = {
  id: string;
  gatewayName: string;
  loginUrl: string;
  testUsername: string;
  reason: string;
  requestedAt: string;
};

// A dedicated Mobile Money setup — separate from the generic multi-gateway
// Payments settings — so customers can buy vouchers/packages via MoMo.
// Lives under Configuration, not Settings, since it's account-wide gear
// setup rather than a business policy choice.
export type MomoProvider =
  | "MTN Mobile Money"
  | "Vodafone Cash"
  | "AirtelTigo Money"
  | "Aggregator (Hubtel/Paystack/Flutterwave)";

export type MomoIntegrationSettings = {
  enabled: boolean;
  provider: MomoProvider;
  environment: "sandbox" | "live";
  merchantId: string;
  apiKey: string;
  apiSecret: string;
  callbackUrl: string;
  allowVoucherPurchase: boolean;
  allowPackagePurchase: boolean;
  minAmount: number;
  maxAmount: number;
  lastTestedAt: string | null;
  lastTestStatus: "success" | "failed" | null;
  // Auto-renew: automatically charge the customer's Mobile Money to renew
  // their package/voucher instead of making them come back and buy again.
  autoRenewEnabled: boolean;
  autoRenewOnLowData: boolean;
  autoRenewOnExpiry: boolean;
  autoRenewDataThresholdPercent: number;
  autoRenewBeforeExpiryMinutes: number;
  // Safety controls so it can't fire uncontrollably on one customer.
  autoRenewMaxPerCustomerPerDay: number;
  autoRenewCooldownMinutes: number;
};

export type BillingHistoryEntry = {
  id: string;
  date: string;
  timestamp: number;
  reference: string;
  method: string;
  amount: number;
  status: "completed" | "failed" | "pending";
};

// The admin's own HotspotPro account subscription — separate from
// anything a reseller/agent charges their customers.
export type SubscriptionSettings = {
  status: "Active" | "Suspended" | "Cancelled";
  memberSince: string;
  monthlyFee: number;
  // "Subscription" = flat monthly fee. "Commission" = a share of each
  // router's sales, billed in arrears.
  billingModel: BillingModel;
  // Percentage of sales HotspotPro takes on the commission model.
  commissionRate: number;
  // Commission already paid towards what has been earned so far.
  commissionPaid: number;
  // When commission billing began (sales before this are not charged).
  commissionSinceMs: number | null;
  paidUntil: string;
  daysRemaining: number;
  billingDay: number;
  nextBillingDate: string;
  gracePeriodDays: number;
  totalPaid: number;
  successfulPayments: number;
  lastPaymentDate: string | null;
  thisMonthSales: number;
  totalSales: number;
  billingHistory: BillingHistoryEntry[];
};

// Controls for how the Revenue Overview page behaves and what it flags —
// separate from Commission Settings, which lives on General Settings.
export type RevenueSettings = {
  defaultTimeframe: "Today" | "Daily" | "Monthly" | "Yearly";
  lowRevenueAlertEnabled: boolean;
  lowRevenueAlertThreshold: number;
  monthlyRevenueGoal: number;
  includeGiveawaysInReports: boolean;
};

export type SecuritySettings = {
  orgTwoFactorEnabled: boolean;
  require2FAForAllUsers: boolean;
  trustDeviceDurationDays: number;
  personalTwoFactorEnabled: boolean;
};

export type LinkedSite = {
  id: string;
  name: string;
  subdomain: string;
};

export type SitesSettings = {
  currentSiteName: string;
  currentSiteDomain: string;
  linkedSites: LinkedSite[];
};

// A business location groups one or more routers under one name — the unit
// that captive portal design and hotspot settings are scoped to. Distinct
// from LinkedSite above, which is about switching between separate billing
// accounts, not organizing routers within one account.
export type BusinessLocation = {
  id: string;
  name: string;
  createdAt: string;
  // "perRouter": each router keeps its own SSID (set on the router itself).
  // "siteWide": every router under this site broadcasts the same SSID —
  // siteWideSsid, which defaults to the site's own name.
  ssidMode: "perRouter" | "siteWide";
  siteWideSsid: string;
  // Master switch for the whole site's hotspot service — a home for this
  // and any future site-wide control (applies to every router under it).
  enabled: boolean;
};

// A physical WiFi access point — separate from a router. It can extend a
// router's network, but doesn't have to: it can be connected standalone
// (e.g. on a site with no MikroTik/router set up yet).
export type AccessPointStatus = "Online" | "Offline";
export type AccessPointDevice = {
  id: string;
  name: string;
  macAddress: string;
  ipAddress: string;
  model: string;
  siteId: string | null;
  routerIp: string | null;
  status: AccessPointStatus;
  clients: number;
  createdAt: string;
};

export type InstallerProfile = {
  id: string;
  name: string;
  email: string;
  phone: string;
  status: "Active" | "Suspended";
  assignedSiteId: string | null;
  assignedRouterIp: string | null;
  createdAt: string;
  // Set only when the installer signed themselves up from the Reseller
  // Portal gateway page. Admin-added installers (via the Installers page)
  // have no password and can't log in until they set one themselves —
  // there's no "default password" for installers the way there is for
  // agents, since admin doesn't hand them one at creation time.
  password: string | null;
};

export type InstallDispatchStatus = "In Progress" | "Dispatched";

export type InstallDispatch = {
  id: string;
  installerId: string;
  siteId: string;
  clientAgentId: string | null;
  status: InstallDispatchStatus;
  dispatchedAt: string | null;
  notes: string;
  createdAt: string;
};

export type NotificationSettings = {
  // MikroTik status
  mikrotikStatusEnabled: boolean;
  mikrotikNotificationPhones: string;
  mikrotikNotificationEmails: string;

  // Voucher & payment
  sendVoucherCodeBySms: boolean;
  sendHotspotCredentialsMessage: boolean;
  hotspotCredentialsMessage: string;
  sendPaymentReceiptSms: boolean;

  // Hotspot expiry
  sendExpiryNotification: boolean;
  hotspotExpiryMessage: string;
  sendExpiryReminder: boolean;
  expiryReminderBefore: string;
  expiryReminderMessage: string;

  // PPPoE expiry
  sendPppoeExpiryReminder: boolean;
  pppoeReminderBefore: string;
  pppoeReminderMessage: string;
  sendPppoeExpiryNotification: boolean;
  pppoeExpiryMessage: string;

  // OTP
  otpVerificationMessage: string;

  // Business Pulse
  businessPulseEnabled: boolean;
  businessPulseChannels: {
    dashboard: boolean;
    browserPush: boolean;
    sms: boolean;
    whatsapp: boolean;
    email: boolean;
  };
  ownerEmails: string;
  alertVoucherSales: boolean;
  alertPppoeRenewals: boolean;
  alertAgentVoucherSales: boolean;
  minimumSaleAmount: number;
};

export type CaptivePortalTemplate =
  | "Classic"
  | "Dark"
  | "Ocean Blue"
  | "Sunset";

export type CaptivePortalConfig = {
  // Network (this router's WiFi)
  ssid: string;
  wifiPassword: string;
  bandwidthLimit: string;
  sessionTimeout: string;
  idleTimeout: string;

  // Default data throttle for every user on this business/router — used
  // when a package doesn't define its own throttle rule (see Package's
  // throttleEnabled/throttleAtValue/etc, which take priority when set).
  defaultThrottleEnabled: boolean;
  defaultThrottleAtValue: number | null;
  defaultThrottleAtUnit: FupUnit;
  defaultThrottleSpeedMbps: number;

  // Template & Design
  template: CaptivePortalTemplate;
  primaryColorOverride: string;
  secondaryColorOverride: string;
  logoSizePx: number | null;
  portalFont: string;
  portalLanguage: string;
  businessNameOverride: string;
  logoText: string;
  logoImageDataUrl: string;
  backgroundImageDataUrl: string;

  // Authentication
  authMethod: "PIN Only" | "Username & Password";

  // Customer Experience
  showPackages: boolean;
  showPackageDeviceLimits: boolean;
  showDeviceMac: boolean;
  showFeedbackButton: boolean;
  allowOnlinePurchases: boolean;
  showPackageTime: boolean;
  buyForOtherDevice: boolean;
  redirectUrlAfterLogin: string;
  phoneCollectionOnActivation: "Off" | "Optional" | "Required";
  physicalVoucherLocation: string;
  showBuyOnlineVouchers: boolean;
  showResellerApplication: boolean;

  // Advertisements
  adsEnabled: boolean;

  // Free Trial
  freeTrialEnabled: boolean;
  freeTrialButtonText: string;
  freeTrialsPerDevice: number;
  freeTrialMode: "One click" | "Phone verification";
  freeTrialButtonPosition: "Top" | "Bottom";
  freeTrialCooldownEnabled: boolean;
  freeTrialBlockMessage: string;
};

export type ShopProduct = {
  id: string;
  name: string;
  category: string;
  price: string;
  description: string;
};

export type AgentRole =
  | "Owner"
  | "Manager"
  | "Field Agent"
  | "Associate Admin"
  | "Sub-Agent"
  | "Viewer";

export type AgentStatus = "Active" | "Suspended" | "Pending" | "Deactivated";

export type AgentPermissionState = "Allowed" | "Denied" | "Approval Required";

export type AgentPermissions = Record<string, AgentPermissionState>;

// What THIS agent may see and do, on top of their permissions, plus how you
// want to hear about what they do. Each agent has their own.
export type AgentSettings = {
  allowCreateVouchers: boolean;
  allowCustomVoucherCredentials: boolean;
  allowViewSalesCommission: boolean;
  allowViewAssignedRouters: boolean;
  // A short summary to you whenever this agent generates vouchers.
  notifyOnVoucherGeneration: boolean;
  notifyByEmail: boolean;
  notifyBySms: boolean;
  // Leave empty to use the organization's own email / business phone.
  notifyEmailOverride: string;
  notifyPhoneOverride: string;
  // Your private notes about how this agent is paid out.
  payoutNotes: string;
};

export type AgentLimits = {
  dailySalesLimit: number;
  dailyVoucherLimit: number;
  maxDevices: number;
  maxConcurrentSessions: number;
  creditLimit: number;
  refundLimit: number;
};

export type AgentDevice = {
  id: string;
  deviceName: string;
  browser: string;
  lastActive: string;
  status: "Active" | "Blocked";
};

export type AgentProfile = {
  id: string;
  agentCode: string;
  name: string;
  email: string;
  username: string;
  role: AgentRole;
  status: AgentStatus;
  isDefault: boolean;
  createdAt: string;
  routerIp: string | null;
  assignedAdminId: string | null;
  lastLogin: string;
  walletBalance: number;
  pendingCommission: number;
  earnedCommission: number;
  commissionRatePercent: number;
  // The most an agent may charge a customer above a package's base
  // price when reselling it (their "Agent price"), e.g. 5 means at most
  // 5% over. null = admin hasn't set a cap, so nothing is enforced.
  maxResaleMarkupPercent: number | null;
  // Whether the resale-markup notice has been shown and acknowledged —
  // shown once, prominently, right after approval; still reachable from
  // their profile after that.
  resaleRuleAcknowledged: boolean;
  limits: AgentLimits;
  devices: AgentDevice[];
  permissions: AgentPermissions;
  riskFlag: boolean;
  requiresWalletFunding: boolean;
  appliedViaPortal: boolean;
  phone: string | null;
  whatsapp: string | null;
  location: string | null;
  // The admin's private notes about this agent — agents never see them.
  notes?: string;
  // This agent's own settings. Missing values fall back to the defaults.
  settings?: Partial<AgentSettings>;
  // What the applicant typed on the captive-portal form, kept as written.
  // (Email and username are separate fields above.)
  idFrontFileName: string | null;
  idBackFileName: string | null;
  faceCaptureFileName: string | null;
  // Ghana Card number and date of birth are identity-critical, so once
  // set they can't be changed by the agent directly — only by submitting
  // a change request admin has to approve (see AgentChangeRequest below).
  ghanaCardNumber: string | null;
  dateOfBirth: string | null;
  // The post-approval "finish your profile before you can sell" gate —
  // separate from being Active. An agent can be approved (Active) but
  // still blocked from generating/selling vouchers until this is true.
  profileVerified: boolean;
  // Set once, the first time the agent successfully logs in with the
  // default password admin gave them. Used to prompt them to set their
  // own password/email on first login rather than forcing it, since the
  // account is already usable with the default the whole time.
  hasChangedDefaultPassword: boolean;
  // The agent's login credential. Set from what they chose when applying
  // (their "default" password, in the sense that it's what they can log
  // in with straight away); changeAgentCredentials updates it after that.
  // This is a demo-fidelity credential only — there's no real backend, so
  // it's checked client-side against this same in-memory/localStorage
  // list, same as everything else in this app.
  password: string | null;

  // Portal access dispatch — set when an admin hands the agent-portal
  // over to this agent/client. Both types are revoked the same manual way
  // (status -> Suspended/Deactivated); the label just communicates intent.
  accessType: "Permanent" | "Temporary" | null;
  accessDispatchedAt: string | null;
  // When true, the admin/installer keeps access to this agent's dashboard
  // even after a Permanent dispatch. When false and accessType is
  // "Permanent", the admin loses access to the agent dashboard entirely
  // until access is revoked.
  allowAdminAccess: boolean;
  // Whether this agent is allowed to top up their own wallet from their
  // portal — independent of their access level/role, admin switches this
  // on a per-agent basis for any of the three access tiers.
  allowWalletTopUp: boolean;
  // The three preset dashboard modes an admin can hand an agent: strictly
  // read-only, allowed to sell vouchers from one locked default package
  // only, or a fully custom permission set (edited via the granular
  // permissions editor). Choosing a tier here sets `permissions` to match;
  // "custom" leaves whatever the admin has configured in place.
  dashboardMode: "viewOnly" | "voucherCreator" | "custom";
  // Only used when dashboardMode is "voucherCreator" — the single package
  // this agent is allowed to sell, with no picker shown on their side.
  defaultPackageName: string | null;
  // The default (admin) agent can only be signed in to with its own login
  // details while this is switched on. Off (or missing) = nobody can.
  portalLoginEnabled?: boolean;
  // "Allow agent dashboard" switch on the agent's own page. Missing = allowed.
  portalAccessEnabled?: boolean;
};

export type AgentMessageTrigger = "Applied" | "Approved" | "Suspended";

export type AgentMessageTemplates = Record<AgentMessageTrigger, string>;

export type AgentMessageLogEntry = {
  id: string;
  agentId: string;
  agentName: string;
  trigger: AgentMessageTrigger;
  channel: "SMS" | "Email";
  message: string;
  sentAt: string;
};

// An email written for an agent and waiting in the outbox. Nothing is sent
// automatically (no mail server is connected yet) — the admin sends it from
// Gmail with one click, which marks it as opened.
export type AgentEmail = {
  id: string;
  agentId: string;
  agentName: string;
  kind: "Applied" | "Approved";
  to: string;
  subject: string;
  body: string;
  createdAt: string;
  openedAt: string | null;
};

export type ApprovalType =
  | "New Agent"
  | "PIN/Credential Request"
  | "Voucher Allocation"
  | "Inventory Allocation"
  | "Credit Request"
  | "Refund Above Limit"
  | "Permission Change"
  | "Commission Change"
  | "Device Registration"
  | "Balance Adjustment"
  | "Sensitive Account Change";

export type ApprovalStatus =
  | "Pending"
  | "Under Review"
  | "Approved"
  | "Rejected"
  | "Cancelled";

export type ApprovalRequest = {
  id: string;
  type: ApprovalType;
  agentId: string;
  agentName: string;
  summary: string;
  status: ApprovalStatus;
  createdAt: string;
  decidedAt: string | null;
  decidedBy: string | null;
  reason: string | null;
  // Only set for "Sensitive Account Change" requests — which locked field
  // the agent wants changed, and to what. Applied to the agent's record
  // only once admin approves; the field stays as-is until then.
  payload?: { field: "ghanaCardNumber" | "dateOfBirth"; newValue: string };
};

// ---------------------------------------------------------------------
// Operational alerts — separate from NotificationSettings above, which
// covers customer-facing SMS/email (OTP, expiry reminders). These are
// internal alerts for the admin and agents themselves: a router going
// offline/online, voucher stock running low, an agent generating
// vouchers, an agent's own stock running low.
// ---------------------------------------------------------------------

export type AlertRuleType =
  | "routerOffline"
  | "routerOnline"
  | "voucherStockLow"
  | "voucherStockEmpty"
  | "voucherGenerated"
  | "agentStockLow"
  | "resellerApplied";

// "all" = every business/router on the account. "business"/"router" scope
// to one specific BusinessLocation id or router ip — the more specific
// rule (router, then business) wins over "all" when more than one rule
// could apply to the same event.
export type AlertScopeType = "all" | "business" | "router";

export type AlertRule = {
  id: string;
  type: AlertRuleType;
  enabled: boolean;
  scopeType: AlertScopeType;
  scopeId: string | null;
  // Used by voucherStockLow and agentStockLow only — how many vouchers
  // remaining triggers the alert.
  thresholdValue: number | null;
  notifyAdmin: boolean;
  notifyAgents: boolean;
};

export type AlertEvent = {
  id: string;
  ruleType: AlertRuleType;
  message: string;
  timestamp: string;
  audience: "admin" | "agent";
  // Set when audience is "agent" — which agent this alert is for.
  agentId: string | null;
  read: boolean;
};

// ---------------------------------------------------------------------
// Voucher cleanup — how long Used and Expired vouchers stick around
// before being cleared out automatically. Set once (an account-wide
// default), with an optional override per router — a voucher generated
// afterwards just picks up whichever policy applies to its router at
// cleanup time, without needing to be specified again per batch.
// ---------------------------------------------------------------------

export type VoucherCleanupPolicy = {
  enabled: boolean;
  // How many days after a voucher becomes Used or Expired before it's
  // cleared. Only meaningful when enabled is true.
  clearAfterDays: number;
};



