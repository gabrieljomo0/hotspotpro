// Mock/sample data powering the reseller dashboard preview.
// Swap these for real API data once the backend is wired up.

import {
  Activity,
  CreditCard,
  FileBarChart,
  Headphones,
  LayoutDashboard,
  LockKeyhole,
  Mail,
  Package,
  Router,
  Settings,
  ShoppingCart,
  Signal,
  Ticket,
  UserRound,
  Users,
  Wifi,
  CircleDot,
} from "lucide-react";

export const navigation = [
 {
  heading: "Main",
  items: [
   {
    label: "Dashboard",
    icon: LayoutDashboard,
    active: true,
   },
   {
    label: "Users / Connections",
    icon: Users,
   },
   {
    label: "Sales",
    icon: ShoppingCart,
   },
   {
    label: "Vouchers",
    icon: Ticket,
   },
   {
    label: "Packages",
    icon: Package,
   },
   {
    label: "Transactions",
    icon: CreditCard,
   },
   {
    label: "Reports",
    icon: FileBarChart,
   },
  ],
 },
 {
  heading: "Tools",
  items: [
   {
    label: "SMS",
    icon: Mail,
   },
   {
    label: "Support Tickets",
    icon: Headphones,
   },
   {
    label: "Profile Settings",
    icon: Settings,
   },
   {
    label: "Change Password",
    icon: LockKeyhole,
   },
  ],
 },
];

export const summaryCards = [
 {
  title: "Users Online",
  value: "487",
  subtitle: "Now connected",
  change: "12.5%",
  positive: true,
  icon: Users,
  iconClass:
   "bg-[#f1f5f9] text-[#2563eb] ",
 },
 {
  title: "Total Sessions",
  value: "563",
  subtitle: "Today",
  change: "8.7%",
  positive: true,
  icon: Wifi,
  iconClass:
   "bg-[#e9fbf3] text-[#0f9f6e] ",
 },
 {
  title: "Active Data Usage",
  value: "34.6 GB",
  subtitle: "Live usage",
  change: "15.2%",
  positive: true,
  icon: Activity,
  iconClass:
   "bg-[#f1f5f9] text-[#475569] dark:text-[#475569]",
 },
 {
  title: "Expiring Soon",
  value: "22",
  subtitle: "Within 30 minutes",
  change: "4.3%",
  positive: false,
  icon: CircleDot,
  iconClass:
   "bg-[#fff5e8] text-[#d97706] ",
 },
 {
  title: "Network Uptime",
  value: "99.8%",
  subtitle: "All routers",
  change: "0.4%",
  positive: true,
  icon: Signal,
  iconClass:
   "bg-[#f1f5f9] text-[#475569] dark:text-[#475569]",
 },
];

export const liveUsers = [
 {
  phone: "055 123 4567",
  ip: "192.168.88.45",
  router: "Main Router",
  login: "10:35 AM",
  duration: "1h 42m",
  data: "1.2 GB",
  status: "Online",
  package: "Daily Plan",
 },
 {
  phone: "024 987 6543",
  ip: "192.168.88.23",
  router: "Floor 2 Router",
  login: "09:50 AM",
  duration: "3h 15m",
  data: "560 MB",
  status: "Idle",
  package: "Weekly Plan",
 },
 {
  phone: "050 765 4321",
  ip: "192.168.88.12",
  router: "Café Router",
  login: "11:20 AM",
  duration: "25m",
  data: "2.8 GB",
  status: "Expiring Soon",
  package: "Voucher HS-9PLM",
 },
 {
  phone: "057 345 6789",
  ip: "192.168.88.33",
  router: "Main Router",
  login: "08:15 AM",
  duration: "—",
  data: "—",
  status: "Disconnected",
  package: "—",
 },
 {
  phone: "020 112 3344",
  ip: "192.168.88.67",
  router: "Floor 1 Router",
  login: "Yesterday 11:45 PM",
  duration: "—",
  data: "—",
  status: "Expired",
  package: "Voucher HS-7JHD",
 },
 {
  phone: "024 556 7788",
  ip: "192.168.88.78",
  router: "Outdoors AP",
  login: "10:05 AM",
  duration: "5h 10m",
  data: "340 MB",
  status: "Blocked",
  package: "Monthly Plan",
 },
];

export const connectionActivity = [
 { time: "12 AM", users: 90 },
 { time: "2 AM", users: 145 },
 { time: "4 AM", users: 215 },
 { time: "6 AM", users: 205 },
 { time: "8 AM", users: 335 },
 { time: "10 AM", users: 385 },
 { time: "12 PM", users: 420 },
 { time: "2 PM", users: 395 },
 { time: "4 PM", users: 405 },
 { time: "6 PM", users: 280 },
 { time: "8 PM", users: 235 },
 { time: "10 PM", users: 300 },
];

export const statusData = [
 {
  name: "Online",
  value: 487,
  percentage: "65.4%",
  color: "#10b981",
 },
 {
  name: "Idle",
  value: 121,
  percentage: "16.2%",
  color: "#2563eb",
 },
 {
  name: "Expiring Soon",
  value: 22,
  percentage: "2.9%",
  color: "#f59e0b",
 },
 {
  name: "Disconnected",
  value: 98,
  percentage: "13.1%",
  color: "#94a3b8",
 },
 {
  name: "Blocked",
  value: 12,
  percentage: "1.6%",
  color: "#ef4444",
 },
];

export const topUsers = [
 {
  phone: "055 123 4567",
  usage: "3.6 GB",
 },
 {
  phone: "024 987 6543",
  usage: "2.9 GB",
 },
 {
  phone: "050 765 4321",
  usage: "2.4 GB",
 },
 {
  phone: "057 345 6789",
  usage: "1.8 GB",
 },
 {
  phone: "020 112 3344",
  usage: "1.2 GB",
 },
];

export const recentEvents = [
 {
  title: "User 055 123 4567 logged in",
  subtitle: "IP: 192.168.88.45 · Main Router",
  time: "10:35 AM",
  icon: UserRound,
  iconClass: "bg-[#e9fbf3] text-[#0f9f6e]",
 },
 {
  title: "User 050 765 4321 package will expire soon",
  subtitle: "Voucher HS-9PLM-22XB",
  time: "11:20 AM",
  icon: Ticket,
  iconClass: "bg-[#fff5e8] text-[#d97706]",
 },
 {
  title: "User 024 987 6543 logged in",
  subtitle: "IP: 192.168.88.23 · Floor 2 Router",
  time: "09:50 AM",
  icon: Users,
  iconClass: "bg-[#f1f5f9] text-[#2563eb]",
 },
 {
  title: "User 020 112 3344 disconnected",
  subtitle: "Session expired",
  time: "Yesterday, 11:45 PM",
  icon: Router,
  iconClass: "bg-[#f1f5f9] text-[#64748b]",
 },
 {
  title: "User 024 556 7788 blocked",
  subtitle: "Blocked by administrator",
  time: "May 11, 10:05 PM",
  icon: LockKeyhole,
  iconClass: "bg-[#fff0f0] text-[#dc2626]",
 },
];

/* -------------------------------------------------------------------------- */
/*                 HELPERS                  */
/* -------------------------------------------------------------------------- */

