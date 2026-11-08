// This file lists what shows up in the agent portal's left sidebar menu.
// Each item has a label, icon, the permission key that must be "Allowed"
// for the agent to see it at all, and either a real href or null (shown,
// but not built yet — clicking it says so honestly instead of pretending).
// hrefs starting with "/agent-portal/" get the agent's own ID spliced in
// by Sidebar.tsx; hrefs starting with "/dashboards/" go to the shared
// admin-side page (e.g. voucher creation) as-is.
// To add, remove, or rename a sidebar link, edit this list.

import {
  LayoutDashboard,
  Users,
  ShoppingCart,
  Ticket,
  Package,
  FileBarChart,
  Mail,
  Headphones,
  Settings,
  } from "lucide-react";

export const navigation = [
  {
    heading: "Main",
    items: [
      { label: "Dashboard", icon: LayoutDashboard, permissionKey: "dashboard.view", href: "/agent-portal/" },
      { label: "Active Users", icon: Users, permissionKey: "users.view", href: "/agent-portal/{id}/users" },
      { label: "Sales", icon: ShoppingCart, permissionKey: "sales.viewOwn", href: "/agent-portal/{id}/sales" },
      { label: "Vouchers", icon: Ticket, permissionKey: "voucher.view", href: "/agent-portal/{id}/vouchers" },
      { label: "Packages", icon: Package, permissionKey: "packages.view", href: "/agent-portal/{id}/packages" },
      { label: "Reports", icon: FileBarChart, permissionKey: "reports.view", href: "/agent-portal/{id}/reports" },
    ],
  },
  {
    heading: "Tools",
    items: [
      { label: "SMS", icon: Mail, permissionKey: "sms.view", href: "/agent-portal/{id}/sms" },
      { label: "Support Tickets", icon: Headphones, permissionKey: "supportTickets.view", href: "/agent-portal/{id}/support" },
      { label: "My Profile", icon: Settings, permissionKey: "settings.viewProfile", href: "/agent-portal/{id}/profile" },
    ],
  },
];
