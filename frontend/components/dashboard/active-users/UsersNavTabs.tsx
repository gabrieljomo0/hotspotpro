"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  Activity,
  Ban,
  BarChart3,
  Clock,
  Gift,
  Link2,
  PauseCircle,
  RadioTower,
} from "lucide-react";

const TABS = [
  { href: "/dashboards/users", label: "Active Users", icon: Activity },
  { href: "/dashboards/users/inactive", label: "Connected but Inactive", icon: PauseCircle },
  { href: "/dashboards/users/expired", label: "Expired", icon: Clock },
  { href: "/dashboards/users/ip-bindings", label: "IP Bindings", icon: Link2 },
  { href: "/dashboards/users/pppoe", label: "PPPoE Users", icon: RadioTower },
  { href: "/dashboards/users/traffic", label: "Traffic Analytics", icon: BarChart3 },
  { href: "/dashboards/users/blocked", label: "Blocked Devices", icon: Ban },
  { href: "/dashboards/users/loyalty-points", label: "Loyalty Points", icon: Gift },
];

export function UsersNavTabs() {
  const pathname = usePathname();

  return (
    <nav className="mb-6 flex flex-wrap gap-2 border-b border-[#f1f5f9] pb-4">
      {TABS.map((tab) => {
        const Icon = tab.icon;
        const isActive = pathname === tab.href;

        return (
          <Link
            key={tab.href}
            href={tab.href}
            className={`inline-flex items-center gap-1.5 rounded-lg px-3 py-2 text-xs font-semibold transition ${
              isActive
                ? "bg-[#f1f5f9] text-[#2563eb]"
                : "text-[#64748b] hover:bg-[#ffffff] hover:text-[#475569]"
            }`}
          >
            <Icon size={14} />
            {tab.label}
          </Link>
        );
      })}
    </nav>
  );
}
