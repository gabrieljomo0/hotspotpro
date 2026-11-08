import type { LucideIcon } from "lucide-react";

import {
  Activity,
  BarChart3,
  Building2,
  Banknote,
  CreditCard,
  FileText,
  Gift,
  LayoutDashboard,
  Mail,
  MessageSquare,
  Package,
  RadioTower,
  ReceiptText,
  Router,
  Settings,
  ShieldCheck,
  ShoppingCart,
  Smartphone,
  Store,
  UserCog,
  UserPlus,
  Users,
  Wifi,
} from "lucide-react";

/* -------------------------------------------------------------------------- */
/*                                   TYPES                                    */
/* -------------------------------------------------------------------------- */

export type NavigationItem = {
  label: string;
  icon: LucideIcon;
  active?: boolean;
  badge?: string;
  href?: string;
  // Draws a separator line under this item (used to split the top links
  // from the collapsible groups below).
  dividerAfter?: boolean;
};

export type NavigationGroup = {
  title: string;
  // Draws a separator line under the whole group.
  dividerAfter?: boolean;
  items: NavigationItem[];
};

export type QuickAction = {
  title: string;
  subtitle: string;
  icon: LucideIcon;
  iconClass: string;
  href?: string;
};

export type StatisticCard = {
  title: string;
  value: string;
  detail: string;
  icon: LucideIcon;
  iconClass: string;
  isNeutral?: boolean;
  href?: string;
};

export type ActiveUser = {
  phone: string;
  package: string;
  accessType: string;
  voucherUsername: string;
  voucherPassword: string;
  duration: string;
  timeSpent: string;
  timeLeft: string;
  dataUsed: string;
  dataLeft: string;
  expiresAt: string;
  status: string;
  deviceType?: string;
  macAddress?: string;
  // Used by the per-router clean-up: which router the user is on, when they
  // were last seen, and when their remembered-device cookie was set.
  routerIp?: string;
  lastSeenMs?: number;
  cookieSetAtMs?: number;
};

export type Transaction = {
  reference: string;
  customer: string;
  package: string;
  method: string;
  amount: string;
  status: string;
};

export type RouterISPLink = {
  id: string;
  label: string;
  interface: string;
  connectionType: "DHCP" | "Static";
  gateway: string;
  dnsServers: string;
  healthCheckIp: string;
  allowRemovalFromBridge: boolean;
};

export type RouterInfo = {
  name: string;
  ip: string;
  status: string;
  uptime: string;
  clients: number;
  /** Voucher names signed in on the router, reported on its check-in. */
  liveUsers?: string[];
  cpu: number;
  memory: number;
  lastSeen: string;

  // Provisioning / connection
  provisioningStatus: "Provisioned" | "Pending" | "Not Started";
  health: "ok" | "checking" | "error";
  connectionMode: "Hybrid+" | "Standard" | "Alternative";
  remoteAccessEnabled: boolean;
  winboxAddress: string;
  bypassModeEnabled: boolean;
  isDefault: boolean;

  // API / legacy credentials
  port: number;
  apiUsername: string;
  apiPassword: string;
  legacyUsername: string;
  legacyPassword: string;
  wireguardTunnelIp: string | null;

  // Status / diagnostics
  description: string;
  lastConnectedAt: string | null;
  lastError: string | null;

  // Set by Disconnect / Reconnect: internet cut for the whole router (ISO times)
  disconnected?: boolean;
  disconnectedAt?: string;
  reconnectedAt?: string;

  // RADIUS
  radiusAddress: string | null;
  radiusSecret: string;
  radiusAccountingPort: number;
  radiusAuthPort: number;

  // Device info
  routerOSVersion: string;
  hardwareModel: string;
  architecture: string;
  cpuCount: string;
  uptime30Day: number | null;
  uptime7Day: number | null;

  // Notification overrides (empty = use account-level)
  notificationPhones: string[];
  notificationEmails: string[];

  // Multi-WAN
  multiWanMode: "Single WAN" | "Load Balancing" | "Failover" | "Load Balancing + Failover";
  ispLinks: RouterISPLink[];

  // Hotspot service setup (captured at onboarding)
  hotspotEnabled: boolean;
  hotspotNetwork: string;
  hotspotGatewayIp: string;
  hotspotDnsServers: string;
  hotspotLoginUrl: string;

  // PPPoE service, configurable alongside Hotspot on the same router
  pppoeEnabled: boolean;
  pppoeNetwork: string;

  // Onboarding path — affects how much the provisioning step touches
  routerType: "New Router" | "Existing Router";

  // Only one is active. Cloud checks every login here. Local keeps the vouchers on the MikroTik.
  loginMode?: "cloud" | "local";

  // Wireless capability (actual SSID lives in captivePortalConfigs per router)
  hasWireless: boolean;

  // The port the internet (ISP) cable goes into; ether1 unless the owner chose another.
  wanInterface?: string;
  // The port the owner's computer is plugged into (kept out of the hotspot).
  managementPort?: string;
  // WinBox allowed from the private network on the ISP port.
  adminFromWan?: boolean;

  // Which business location this router belongs to — captive portal and
  // hotspot config are shared across every router in the same location.
  siteId: string | null;

  // Captive portal DNS name captured at onboarding
  dnsName?: string;

  // Admin-initiated pause — traffic through this router is suspended
  // without fully disconnecting it, same idea as pausing a single
  // customer's session but for the whole router.
  paused: boolean;

  // What has been done to this router from the dashboard — shown on its
  // System Information tab.
  snmpConfigured?: boolean;
  walledGardenConfigured?: boolean;
  servicesHardened?: boolean;
  hotspotFilesSyncedAt?: string | null;
  timeSyncedAt?: string | null;
  scriptUpdatedAt?: string | null;
  provisionedAt?: string | null;
  // Secret in this router's setup link (/api/provision/<token>); the server
  // uses it to find the router when it downloads its script.
  provisioningToken?: string;
  activity?: Array<{ at: string; text: string }>;
};

/* -------------------------------------------------------------------------- */
/*                                    DATA                                    */
/* -------------------------------------------------------------------------- */

export const navigationGroups: NavigationGroup[] = [
  {
    title: "Main",
    items: [
      { label: "Dashboard", icon: LayoutDashboard, href: "/dashboards" },
      { label: "Vouchers", icon: Gift, href: "/dashboards/vouchers" },
      { label: "Packages", icon: Package, href: "/dashboards/packages" },
      { label: "Active Users", icon: Activity, href: "/dashboards/users" },
      // Agents, with everything about agents (overview, revenue, SMS & email,
      // applications…) inside its page as tabs.
      { label: "Agents", icon: Users, href: "/dashboards/agents" },
    ],
  },
  {
    title: "Configuration",
    // Draws the separator line under this group (it sits right under Agents).
    dividerAfter: true,
    items: [
      {
        label: "PPPoE",
        icon: RadioTower,
        href: "/dashboards/configuration/pppoe",
      },
      {
        label: "Routers",
        icon: Router,
        href: "/dashboards/configuration/routers",
      },
      {
        label: "Access Points",
        icon: Wifi,
        href: "/dashboards/configuration/access-points",
      },
      {
        label: "MoMo Integration",
        icon: Smartphone,
        href: "/dashboards/configuration/momo-integration",
      },
      {
        label: "Sites",
        icon: Building2,
        href: "/dashboards/configuration/sites",
      },
    ],
  },
  {
    title: "Revenue",
    items: [
      {
        label: "Revenue Overview",
        icon: Banknote,
        href: "/dashboards/revenue",
      },
      {
        label: "Router & Agent Revenue",
        icon: Router,
        href: "/dashboards/revenue/router-agent-breakdown",
      },
      {
        label: "Subscription",
        icon: CreditCard,
        href: "/dashboards/subscription",
      },
      {
        label: "Transactions",
        icon: ReceiptText,
        href: "/dashboards/transactions",
      },
    ],
  },
  {
    title: "Analysis",
    items: [
      {
        label: "Analytics Overview",
        icon: BarChart3,
        href: "/dashboards/analytics",
      },
      {
        label: "Usage Reports",
        icon: BarChart3,
        href: "/dashboards/analytics/usage",
      },
    ],
  },
  {
    title: "Marketing",
    items: [
      { label: "Point of Sale", icon: Store, href: "/dashboards/point-of-sale" },
      { label: "Orders", icon: ShoppingCart, href: "/dashboards/orders" },
      {
        label: "Transactions",
        icon: ReceiptText,
        href: "/dashboards/marketing-transactions",
      },
      { label: "Top Sellers", icon: Users, href: "/dashboards/top-sellers" },
      { label: "Reports", icon: BarChart3, href: "/dashboards/reports" },
    ],
  },
  {
    title: "Installers",
    items: [
      {
        label: "Clients",
        icon: UserPlus,
        href: "/dashboards/installers/clients",
      },
    ],
  },
  {
    title: "Settings",
    items: [
      {
        label: "System Settings",
        icon: Settings,
        href: "/dashboards/settings",
      },
      {
        label: "System Users",
        icon: UserCog,
        href: "/dashboards/settings/users",
      },
      {
        label: "Roles & Permissions",
        icon: ShieldCheck,
        href: "/dashboards/settings/roles",
      },
      {
        label: "SMS & Email",
        icon: Mail,
        href: "/dashboards/settings/sms-email",
      },
      {
        label: "Activity Logs",
        icon: FileText,
        href: "/dashboards/settings/activity-logs",
      },
      {
        label: "Feedback",
        icon: MessageSquare,
        href: "/dashboards/users/feedback",
      },
      { label: "Leads", icon: UserPlus, href: "/dashboards/users/leads" },
      {
        label: "Documentation",
        icon: FileText,
        href: "/dashboards/documentation",
      },
    ],
  },
];

export const quickActions: QuickAction[] = [
  {
    title: "Generate Voucher",
    subtitle: "Create a new voucher",
    icon: Gift,
    iconClass: "bg-[#f4f4f4] text-[#1a1a1a] ",
    href: "/dashboards/vouchers",
  },
  {
    title: "Packages",
    subtitle: "Manage internet packages",
    icon: Package,
    iconClass: "bg-[#f3f1ec] text-[#1a1a1a] ",
    href: "/dashboards/packages",
  },
  {
    title: "Add Router",
    subtitle: "Register a new router",
    icon: Router,
    iconClass: "bg-[#f4f4f4] text-[#1a1a1a] ",
    href: "/dashboards/configuration/routers",
  },
  {
    title: "Add Reseller",
    subtitle: "Register a new reseller",
    icon: UserPlus,
    iconClass: "bg-[#f3f1ec] text-[#1a1a1a] ",
    href: "/dashboards/agents?add=1",
  },
  {
    title: "Send SMS",
    subtitle: "Send customer messages",
    icon: Mail,
    iconClass: "bg-[#f4f4f4] text-[#1a1a1a] ",
    href: "/dashboards/settings/sms-email",
  },
];

export const statistics: StatisticCard[] = [
  {
    title: "Today's Revenue",
    value: "GH₵ 6,100.00",
    detail: "See full trend in Analysis",
    icon: Banknote,
    iconClass: "bg-[#f3f1ec] text-[#1a1a1a] ",
    href: "/dashboards/analytics",
  },
  {
    title: "Total Vouchers",
    value: "0",
    detail: "View all vouchers",
    icon: Gift,
    iconClass: "bg-[#f4f4f4] text-[#1a1a1a] ",
    href: "/dashboards/vouchers",
  },
  {
    title: "Data Usage",
    value: "2.35 TB",
    detail: "View usage breakdown",
    icon: Gift,
    iconClass: "bg-[#f4f4f4] text-[#1a1a1a] ",
    href: "/dashboards/analytics/data-usage",
  },
  {
    title: "Routers Online",
    value: "4 / 5",
    detail: "80% online",
    icon: Router,
    iconClass: "bg-[#f3f1ec] text-[#1a1a1a] ",
    isNeutral: true,
  },
];

export const revenueData = [
  { date: "May 12", revenue: 900 },
  { date: "May 13", revenue: 2800 },
  { date: "May 14", revenue: 4000 },
  { date: "May 15", revenue: 3500 },
  { date: "May 16", revenue: 2100 },
  { date: "May 17", revenue: 3600 },
  { date: "May 18", revenue: 6100 },
];

export const initialActiveUsers: ActiveUser[] = [
  {
    phone: "055 123 4567",
    package: "Daily Plan",
    accessType: "Package",
    voucherUsername: "PKG-055123",
    voucherPassword: "DLY-4821",
    duration: "24 Hours",
    timeSpent: "2h 15m",
    timeLeft: "21h 45m",
    dataUsed: "1.2 GB",
    dataLeft: "4.8 GB",
    expiresAt: "22 Jul 2026, 8:30 PM",
    status: "Online",
  },
  {
    phone: "",
    package: "Direct Voucher",
    accessType: "Voucher",
    voucherUsername: "WK-8H2P9",
    voucherPassword: "734921",
    duration: "7 Days",
    timeSpent: "1d 6h",
    timeLeft: "5d 18h",
    dataUsed: "890 MB",
    dataLeft: "9.1 GB",
    expiresAt: "27 Jul 2026, 4:20 PM",
    status: "Online",
  },
  {
    phone: "059 234 5678",
    package: "Monthly Plan",
    accessType: "Package",
    voucherUsername: "PKG-059234",
    voucherPassword: "MTH-6158",
    duration: "30 Days",
    timeSpent: "5d 18h",
    timeLeft: "24d 06h",
    dataUsed: "2.3 GB",
    dataLeft: "27.7 GB",
    expiresAt: "15 Aug 2026, 9:10 AM",
    status: "Online",
  },
  {
    phone: "",
    package: "Direct Voucher",
    accessType: "Voucher",
    voucherUsername: "DAY-7M4K2",
    voucherPassword: "592814",
    duration: "24 Hours",
    timeSpent: "12h 40m",
    timeLeft: "11h 20m",
    dataUsed: "320 MB",
    dataLeft: "1.68 GB",
    expiresAt: "22 Jul 2026, 10:05 AM",
    status: "Online",
  },
  {
    phone: "",
    package: "Direct Voucher",
    accessType: "Voucher",
    voucherUsername: "2HR-6Q8T1",
    voucherPassword: "843260",
    duration: "2 Hours",
    timeSpent: "1h 20m",
    timeLeft: "40m",
    dataUsed: "660 MB",
    dataLeft: "340 MB",
    expiresAt: "21 Jul 2026, 7:20 AM",
    status: "Online",
  },
  {
    phone: "024 555 1020",
    package: "Weekly Plan",
    accessType: "Package",
    voucherUsername: "PKG-024555",
    voucherPassword: "WK-3029",
    duration: "7 Days",
    timeSpent: "20h 30m",
    timeLeft: "6d 04h",
    dataUsed: "1.7 GB",
    dataLeft: "8.3 GB",
    expiresAt: "27 Jul 2026, 11:45 AM",
    status: "Online",
  },
  {
    phone: "",
    package: "Direct Voucher",
    accessType: "Voucher",
    voucherUsername: "NIGHT-9P2D",
    voucherPassword: "184630",
    duration: "12 Hours",
    timeSpent: "4h 45m",
    timeLeft: "7h 15m",
    dataUsed: "780 MB",
    dataLeft: "2.22 GB",
    expiresAt: "21 Jul 2026, 1:15 PM",
    status: "Online",
  },
  {
    phone: "050 441 2209",
    package: "Daily Plan",
    accessType: "Package",
    voucherUsername: "PKG-050441",
    voucherPassword: "DLY-7395",
    duration: "24 Hours",
    timeSpent: "5h 55m",
    timeLeft: "18h 05m",
    dataUsed: "540 MB",
    dataLeft: "5.46 GB",
    expiresAt: "22 Jul 2026, 4:10 PM",
    status: "Online",
  },
  {
    phone: "",
    package: "Direct Voucher",
    accessType: "Voucher",
    voucherUsername: "CAFE-4N6S",
    voucherPassword: "665903",
    duration: "3 Hours",
    timeSpent: "1h 48m",
    timeLeft: "1h 12m",
    dataUsed: "1.1 GB",
    dataLeft: "900 MB",
    expiresAt: "21 Jul 2026, 8:02 AM",
    status: "Online",
  },
  {
    phone: "053 800 1122",
    package: "Monthly Plan",
    accessType: "Package",
    voucherUsername: "PKG-053800",
    voucherPassword: "MTH-4086",
    duration: "30 Days",
    timeSpent: "1d 14h",
    timeLeft: "28d 10h",
    dataUsed: "3.8 GB",
    dataLeft: "46.2 GB",
    expiresAt: "18 Aug 2026, 5:40 PM",
    status: "Online",
  },
  {
    phone: "",
    package: "Direct Voucher",
    accessType: "Voucher",
    voucherUsername: "HS-7F3K-2M",
    voucherPassword: "290174",
    duration: "6 Hours",
    timeSpent: "2h 32m",
    timeLeft: "3h 28m",
    dataUsed: "430 MB",
    dataLeft: "1.57 GB",
    expiresAt: "21 Jul 2026, 10:18 AM",
    status: "Online",
  },
  {
    phone: "020 901 7744",
    package: "Weekly Plan",
    accessType: "Package",
    voucherUsername: "PKG-020901",
    voucherPassword: "WK-5502",
    duration: "7 Days",
    timeSpent: "2d 15h",
    timeLeft: "4d 09h",
    dataUsed: "4.2 GB",
    dataLeft: "15.8 GB",
    expiresAt: "25 Jul 2026, 3:30 PM",
    status: "Online",
  },
];

export const transactions: Transaction[] = [
  {
    reference: "PAY-0551234567",
    customer: "055 123 4567",
    package: "Daily Plan",
    method: "MoMo",
    amount: "GH₵ 10.00",
    status: "Success",
  },
  {
    reference: "PAY-0249876543",
    customer: "024 987 6543",
    package: "Weekly Plan",
    method: "MoMo",
    amount: "GH₵ 45.00",
    status: "Success",
  },
  {
    reference: "PAY-0592345678",
    customer: "059 234 5678",
    package: "Monthly Plan",
    method: "Card",
    amount: "GH₵ 120.00",
    status: "Success",
  },
  {
    reference: "PAY-0501112233",
    customer: "050 111 2233",
    package: "2 Hours Plan",
    method: "MoMo",
    amount: "GH₵ 5.00",
    status: "Success",
  },
  {
    reference: "PAY-0242223344",
    customer: "024 222 3344",
    package: "Daily Plan",
    method: "Cash",
    amount: "GH₵ 10.00",
    status: "Pending",
  },
  {
    reference: "PAY-0533334455",
    customer: "053 333 4455",
    package: "Weekly Plan",
    method: "MoMo",
    amount: "GH₵ 20.00",
    status: "Failed",
  },
];

export const routers: RouterInfo[] = [
  {
    name: "Main Router (RB4011)",
    ip: "192.168.88.1",
    status: "Online",
    uptime: "3d 14h 24m",
    clients: 124,
    cpu: 45,
    memory: 62,
    lastSeen: "1 min ago",
    provisioningStatus: "Provisioned",
    health: "ok",
    connectionMode: "Hybrid+",
    remoteAccessEnabled: true,
    winboxAddress: "remote.hotspotpro.com:41337",
    bypassModeEnabled: false,
    isDefault: true,
    port: 8728,
    apiUsername: "hotspotpro_user",
    apiPassword: "aZ9kLm3Qxr7T",
    legacyUsername: "hotspotpro_user",
    legacyPassword: "aZ9kLm3Qxr7T",
    wireguardTunnelIp: "10.77.0.2",
    description: "",
    lastConnectedAt: "12 Sep 2026, 09:41",
    lastError: null,
    radiusAddress: "127.0.0.1",
    radiusSecret: "********",
    radiusAccountingPort: 1813,
    radiusAuthPort: 1812,
    routerOSVersion: "7.15.2",
    hardwareModel: "RB4011iGS+",
    architecture: "arm",
    cpuCount: "4",
    uptime30Day: 99.8,
    uptime7Day: 100,
    notificationPhones: [],
    notificationEmails: [],
    multiWanMode: "Single WAN",
    ispLinks: [],
    hotspotEnabled: true,
    hotspotNetwork: "10.10.0.0/16",
    hotspotGatewayIp: "10.10.0.1",
    hotspotDnsServers: "8.8.8.8,8.8.4.4",
    hotspotLoginUrl: "hotspot",
    pppoeEnabled: false,
    pppoeNetwork: "192.168.91.0/24",
    routerType: "New Router",
    hasWireless: true,
    siteId: "site-main",
    paused: false,
  },
  {
    name: "Floor 2 Router (hEX)",
    ip: "192.168.88.2",
    status: "Online",
    uptime: "2d 08h 12m",
    clients: 86,
    cpu: 88,
    memory: 92,
    lastSeen: "1 min ago",
    provisioningStatus: "Provisioned",
    health: "ok",
    connectionMode: "Hybrid+",
    remoteAccessEnabled: true,
    winboxAddress: "remote.hotspotpro.com:41338",
    bypassModeEnabled: false,
    isDefault: false,
    port: 8728,
    apiUsername: "hotspotpro_user",
    apiPassword: "bY4mNp8Wsq2K",
    legacyUsername: "hotspotpro_user",
    legacyPassword: "bY4mNp8Wsq2K",
    wireguardTunnelIp: "10.77.0.3",
    description: "",
    lastConnectedAt: "12 Sep 2026, 09:40",
    lastError: null,
    radiusAddress: "127.0.0.1",
    radiusSecret: "********",
    radiusAccountingPort: 1813,
    radiusAuthPort: 1812,
    routerOSVersion: "7.15.2",
    hardwareModel: "hEX (RB750Gr3)",
    architecture: "mmips",
    cpuCount: "1",
    uptime30Day: 99.2,
    uptime7Day: 100,
    notificationPhones: [],
    notificationEmails: [],
    multiWanMode: "Single WAN",
    ispLinks: [],
    hotspotEnabled: true,
    hotspotNetwork: "10.10.0.0/16",
    hotspotGatewayIp: "10.10.0.1",
    hotspotDnsServers: "8.8.8.8,8.8.4.4",
    hotspotLoginUrl: "hotspot",
    pppoeEnabled: false,
    pppoeNetwork: "192.168.91.0/24",
    routerType: "New Router",
    hasWireless: true,
    siteId: "site-main",
    paused: false,
  },
  {
    name: "Café Router (hAP ac²)",
    ip: "192.168.88.3",
    status: "Online",
    uptime: "1d 05h 41m",
    clients: 45,
    cpu: 32,
    memory: 48,
    lastSeen: "1 min ago",
    provisioningStatus: "Provisioned",
    health: "ok",
    connectionMode: "Standard",
    remoteAccessEnabled: true,
    winboxAddress: "remote.hotspotpro.com:41339",
    bypassModeEnabled: false,
    isDefault: false,
    port: 8728,
    apiUsername: "hotspotpro_user",
    apiPassword: "cX1nQr5Vtw9L",
    legacyUsername: "hotspotpro_user",
    legacyPassword: "cX1nQr5Vtw9L",
    wireguardTunnelIp: "10.77.0.4",
    description: "",
    lastConnectedAt: "12 Sep 2026, 09:39",
    lastError: null,
    radiusAddress: "127.0.0.1",
    radiusSecret: "********",
    radiusAccountingPort: 1813,
    radiusAuthPort: 1812,
    routerOSVersion: "7.14.3",
    hardwareModel: "hAP ac²",
    architecture: "arm",
    cpuCount: "2",
    uptime30Day: 98.6,
    uptime7Day: 100,
    notificationPhones: [],
    notificationEmails: [],
    multiWanMode: "Load Balancing + Failover",
    ispLinks: [
      {
        id: "isp-1",
        label: "ISP 1",
        interface: "ether1 - current WAN",
        connectionType: "DHCP",
        gateway: "",
        dnsServers: "8.8.8.8,1.1.1.1",
        healthCheckIp: "8.8.8.8",
        allowRemovalFromBridge: false,
      },
      {
        id: "isp-2",
        label: "ISP 2",
        interface: "ether2",
        connectionType: "DHCP",
        gateway: "",
        dnsServers: "8.8.8.8,1.1.1.1",
        healthCheckIp: "1.1.1.1",
        allowRemovalFromBridge: true,
      },
    ],
    hotspotEnabled: true,
    hotspotNetwork: "10.10.0.0/16",
    hotspotGatewayIp: "10.10.0.1",
    hotspotDnsServers: "8.8.8.8,8.8.4.4",
    hotspotLoginUrl: "cafe",
    pppoeEnabled: false,
    pppoeNetwork: "192.168.91.0/24",
    routerType: "New Router",
    hasWireless: true,
    siteId: "site-main",
    paused: false,
  },
  {
    name: "MikroTik-2",
    ip: "pending-mikrotik-2",
    status: "Offline",
    uptime: "N/A",
    clients: 0,
    cpu: 0,
    memory: 0,
    lastSeen: "6 min ago",
    provisioningStatus: "Pending",
    health: "checking",
    connectionMode: "Hybrid+",
    remoteAccessEnabled: false,
    winboxAddress: "",
    bypassModeEnabled: false,
    isDefault: false,
    port: 8728,
    apiUsername: "hotspotpro_user",
    apiPassword: "ufThn0fspuiKpt96",
    legacyUsername: "hotspotpro_user",
    legacyPassword: "",
    wireguardTunnelIp: null,
    description: "",
    lastConnectedAt: null,
    lastError: "Parameter 'host' has wrong type 'NULL' but should be 'string'",
    radiusAddress: null,
    radiusSecret: "********",
    radiusAccountingPort: 1813,
    radiusAuthPort: 1812,
    routerOSVersion: "Unknown",
    hardwareModel: "Unknown",
    architecture: "Unknown",
    cpuCount: "Unknown",
    uptime30Day: null,
    uptime7Day: null,
    notificationPhones: [],
    notificationEmails: [],
    multiWanMode: "Single WAN",
    ispLinks: [],
    hotspotEnabled: true,
    hotspotNetwork: "10.10.0.0/16",
    hotspotGatewayIp: "10.10.0.1",
    hotspotDnsServers: "8.8.8.8,8.8.4.4",
    hotspotLoginUrl: "hotspot",
    pppoeEnabled: false,
    pppoeNetwork: "192.168.91.0/24",
    routerType: "New Router",
    hasWireless: true,
    siteId: "site-kumasi",
    paused: false,
  },
  {
    name: "Outdoors Router (SXT)",
    ip: "192.168.88.5",
    status: "Online",
    uptime: "5d 02h 33m",
    clients: 33,
    cpu: 28,
    memory: 40,
    lastSeen: "1 min ago",
    provisioningStatus: "Provisioned",
    health: "ok",
    connectionMode: "Hybrid+",
    remoteAccessEnabled: true,
    winboxAddress: "remote.hotspotpro.com:41340",
    bypassModeEnabled: false,
    isDefault: false,
    port: 8728,
    apiUsername: "hotspotpro_user",
    apiPassword: "dW6pRs2Yuv4M",
    legacyUsername: "hotspotpro_user",
    legacyPassword: "dW6pRs2Yuv4M",
    wireguardTunnelIp: "10.77.0.5",
    description: "",
    lastConnectedAt: "12 Sep 2026, 09:38",
    lastError: null,
    radiusAddress: "127.0.0.1",
    radiusSecret: "********",
    radiusAccountingPort: 1813,
    radiusAuthPort: 1812,
    routerOSVersion: "7.13.5",
    hardwareModel: "SXT SQ Lite5",
    architecture: "mipsbe",
    cpuCount: "1",
    uptime30Day: 99.9,
    uptime7Day: 100,
    notificationPhones: [],
    notificationEmails: [],
    multiWanMode: "Single WAN",
    ispLinks: [],
    hotspotEnabled: true,
    hotspotNetwork: "10.10.0.0/16",
    hotspotGatewayIp: "10.10.0.1",
    hotspotDnsServers: "8.8.8.8,8.8.4.4",
    hotspotLoginUrl: "outdoor",
    pppoeEnabled: false,
    pppoeNetwork: "192.168.91.0/24",
    routerType: "New Router",
    hasWireless: true,
    siteId: "site-eastlegon",
    paused: false,
  },
  {
    name: "Kumasi Hub Router (hAP ax²)",
    ip: "192.168.89.1",
    status: "Online",
    uptime: "6d 11h 02m",
    clients: 97,
    cpu: 41,
    memory: 58,
    lastSeen: "1 min ago",
    provisioningStatus: "Provisioned",
    health: "ok",
    connectionMode: "Hybrid+",
    remoteAccessEnabled: true,
    winboxAddress: "remote.hotspotpro.com:41341",
    bypassModeEnabled: false,
    isDefault: false,
    port: 8728,
    apiUsername: "hotspotpro_user",
    apiPassword: "eR8tYu3Ipl6N",
    legacyUsername: "hotspotpro_user",
    legacyPassword: "eR8tYu3Ipl6N",
    wireguardTunnelIp: "10.77.0.6",
    description: "Kumasi Tech Hub — main coworking floor",
    lastConnectedAt: "12 Sep 2026, 09:35",
    lastError: null,
    radiusAddress: "127.0.0.1",
    radiusSecret: "********",
    radiusAccountingPort: 1813,
    radiusAuthPort: 1812,
    routerOSVersion: "7.15.2",
    hardwareModel: "hAP ax²",
    architecture: "arm64",
    cpuCount: "4",
    uptime30Day: 99.5,
    uptime7Day: 100,
    notificationPhones: [],
    notificationEmails: [],
    multiWanMode: "Single WAN",
    ispLinks: [],
    hotspotEnabled: true,
    hotspotNetwork: "10.11.0.0/16",
    hotspotGatewayIp: "10.11.0.1",
    hotspotDnsServers: "8.8.8.8,8.8.4.4",
    hotspotLoginUrl: "kumasi-hub",
    pppoeEnabled: false,
    pppoeNetwork: "192.168.93.0/24",
    routerType: "New Router",
    hasWireless: true,
    siteId: "site-kumasi",
    paused: false,
  },
  {
    name: "Kumasi Annex Router (hEX S)",
    ip: "192.168.89.2",
    status: "Online",
    uptime: "2d 19h 47m",
    clients: 52,
    cpu: 29,
    memory: 44,
    lastSeen: "1 min ago",
    provisioningStatus: "Provisioned",
    health: "ok",
    connectionMode: "Standard",
    remoteAccessEnabled: true,
    winboxAddress: "remote.hotspotpro.com:41342",
    bypassModeEnabled: false,
    isDefault: false,
    port: 8728,
    apiUsername: "hotspotpro_user",
    apiPassword: "fT2wEr9Opq5M",
    legacyUsername: "hotspotpro_user",
    legacyPassword: "fT2wEr9Opq5M",
    wireguardTunnelIp: "10.77.0.7",
    description: "Kumasi Tech Hub — annex building",
    lastConnectedAt: "12 Sep 2026, 09:33",
    lastError: null,
    radiusAddress: "127.0.0.1",
    radiusSecret: "********",
    radiusAccountingPort: 1813,
    radiusAuthPort: 1812,
    routerOSVersion: "7.14.3",
    hardwareModel: "hEX S (RB760iGS)",
    architecture: "mmips",
    cpuCount: "1",
    uptime30Day: 98.9,
    uptime7Day: 100,
    notificationPhones: [],
    notificationEmails: [],
    multiWanMode: "Single WAN",
    ispLinks: [],
    hotspotEnabled: true,
    hotspotNetwork: "10.11.0.0/16",
    hotspotGatewayIp: "10.11.0.1",
    hotspotDnsServers: "8.8.8.8,8.8.4.4",
    hotspotLoginUrl: "kumasi-annex",
    pppoeEnabled: false,
    pppoeNetwork: "192.168.93.0/24",
    routerType: "New Router",
    hasWireless: true,
    siteId: "site-kumasi",
    paused: false,
  },
  {
    name: "Waterfront Lobby Router (cAP ax)",
    ip: "192.168.90.1",
    status: "Online",
    uptime: "4d 03h 18m",
    clients: 68,
    cpu: 35,
    memory: 50,
    lastSeen: "1 min ago",
    provisioningStatus: "Provisioned",
    health: "ok",
    connectionMode: "Hybrid+",
    remoteAccessEnabled: true,
    winboxAddress: "remote.hotspotpro.com:41343",
    bypassModeEnabled: false,
    isDefault: false,
    port: 8728,
    apiUsername: "hotspotpro_user",
    apiPassword: "gU4xRt7Asd3P",
    legacyUsername: "hotspotpro_user",
    legacyPassword: "gU4xRt7Asd3P",
    wireguardTunnelIp: "10.77.0.8",
    description: "Takoradi Waterfront Plaza — main lobby",
    lastConnectedAt: "12 Sep 2026, 09:31",
    lastError: null,
    radiusAddress: "127.0.0.1",
    radiusSecret: "********",
    radiusAccountingPort: 1813,
    radiusAuthPort: 1812,
    routerOSVersion: "7.15.2",
    hardwareModel: "cAP ax",
    architecture: "arm",
    cpuCount: "2",
    uptime30Day: 99.6,
    uptime7Day: 100,
    notificationPhones: [],
    notificationEmails: [],
    multiWanMode: "Single WAN",
    ispLinks: [],
    hotspotEnabled: true,
    hotspotNetwork: "10.12.0.0/16",
    hotspotGatewayIp: "10.12.0.1",
    hotspotDnsServers: "8.8.8.8,8.8.4.4",
    hotspotLoginUrl: "waterfront-lobby",
    pppoeEnabled: false,
    pppoeNetwork: "192.168.94.0/24",
    routerType: "New Router",
    hasWireless: true,
    siteId: "site-takoradi",
    paused: false,
  },
  {
    name: "Waterfront Pool Router (wAP ac)",
    ip: "192.168.90.2",
    status: "Online",
    uptime: "1d 22h 05m",
    clients: 39,
    cpu: 26,
    memory: 37,
    lastSeen: "1 min ago",
    provisioningStatus: "Provisioned",
    health: "ok",
    connectionMode: "Standard",
    remoteAccessEnabled: true,
    winboxAddress: "remote.hotspotpro.com:41344",
    bypassModeEnabled: false,
    isDefault: false,
    port: 8728,
    apiUsername: "hotspotpro_user",
    apiPassword: "hV5yTu8Bfg1Q",
    legacyUsername: "hotspotpro_user",
    legacyPassword: "hV5yTu8Bfg1Q",
    wireguardTunnelIp: "10.77.0.9",
    description: "Takoradi Waterfront Plaza — poolside deck",
    lastConnectedAt: "12 Sep 2026, 09:29",
    lastError: null,
    radiusAddress: "127.0.0.1",
    radiusSecret: "********",
    radiusAccountingPort: 1813,
    radiusAuthPort: 1812,
    routerOSVersion: "7.13.5",
    hardwareModel: "wAP ac",
    architecture: "mipsbe",
    cpuCount: "1",
    uptime30Day: 97.8,
    uptime7Day: 99,
    notificationPhones: [],
    notificationEmails: [],
    multiWanMode: "Single WAN",
    ispLinks: [],
    hotspotEnabled: true,
    hotspotNetwork: "10.12.0.0/16",
    hotspotGatewayIp: "10.12.0.1",
    hotspotDnsServers: "8.8.8.8,8.8.4.4",
    hotspotLoginUrl: "waterfront-pool",
    pppoeEnabled: false,
    pppoeNetwork: "192.168.94.0/24",
    routerType: "New Router",
    hasWireless: true,
    siteId: "site-takoradi",
    paused: false,
  },
  {
    name: "Residences Gate Router (hEX)",
    ip: "192.168.92.1",
    status: "Online",
    uptime: "9d 07h 55m",
    clients: 156,
    cpu: 52,
    memory: 66,
    lastSeen: "1 min ago",
    provisioningStatus: "Provisioned",
    health: "ok",
    connectionMode: "Hybrid+",
    remoteAccessEnabled: true,
    winboxAddress: "remote.hotspotpro.com:41345",
    bypassModeEnabled: false,
    isDefault: false,
    port: 8728,
    apiUsername: "hotspotpro_user",
    apiPassword: "jW6zUi0Chk2R",
    legacyUsername: "hotspotpro_user",
    legacyPassword: "jW6zUi0Chk2R",
    wireguardTunnelIp: "10.77.0.10",
    description: "East Legon Residences — main gate & clubhouse",
    lastConnectedAt: "12 Sep 2026, 09:27",
    lastError: null,
    radiusAddress: "127.0.0.1",
    radiusSecret: "********",
    radiusAccountingPort: 1813,
    radiusAuthPort: 1812,
    routerOSVersion: "7.15.2",
    hardwareModel: "hEX (RB750Gr3)",
    architecture: "mmips",
    cpuCount: "1",
    uptime30Day: 99.7,
    uptime7Day: 100,
    notificationPhones: [],
    notificationEmails: [],
    multiWanMode: "Single WAN",
    ispLinks: [],
    hotspotEnabled: true,
    hotspotNetwork: "10.13.0.0/16",
    hotspotGatewayIp: "10.13.0.1",
    hotspotDnsServers: "8.8.8.8,8.8.4.4",
    hotspotLoginUrl: "eastlegon-gate",
    pppoeEnabled: true,
    pppoeNetwork: "192.168.95.0/24",
    routerType: "New Router",
    hasWireless: true,
    siteId: "site-eastlegon",
    paused: false,
  },
];
