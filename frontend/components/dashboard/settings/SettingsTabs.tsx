"use client";

// The settings page's tab bar: two clearly bordered groups, each with its
// own heading and a one-line description of what it covers, and its tabs
// listed inside. Side by side on wider screens, stacking on narrow ones.
//
// "Account Settings" — things that affect you, the admin, and your whole
// account, regardless of how many businesses/sites you run. Nothing here
// can be set differently per business.
//
// "Business Settings" — things that CAN be applied to a specific
// business/site/organization (or the same for all of them) — Payments,
// Hotspot, Captive Portal, and Loyalty Programme all support picking
// "same for everyone" or "per business" from within their own panel.

import Link from "next/link";
import {
  Settings,
  CreditCard,
  Wifi,
  Globe,
  Star,
  MessageSquare,
  MessageCircle,
  Bell,
  Shield,
  Link2,
  Trash2,
  Receipt,
  History,
} from "lucide-react";

const ACCOUNT_SETTINGS_TABS = [
  { key: "general", label: "General Settings", icon: Settings },
  { key: "domain", label: "Domain", icon: Globe },
  { key: "subscription", label: "Subscription & Billing", icon: Receipt },
  { key: "payment-history", label: "Payment History", icon: History },
  { key: "sms", label: "SMS", icon: MessageSquare },
  { key: "whatsapp", label: "WhatsApp", icon: MessageCircle },
  { key: "notifications", label: "Notifications", icon: Bell },
  { key: "alerts", label: "Alerts", icon: Bell },
  { key: "security", label: "Security", icon: Shield },
  { key: "sites", label: "Sites", icon: Link2 },
];

const BUSINESS_SETTINGS_TABS = [
  { key: "payments", label: "Payments", icon: CreditCard },
  { key: "hotspot", label: "Hotspot", icon: Wifi },
  { key: "captive-portal", label: "Captive Portal", icon: Globe },
  { key: "loyalty", label: "Loyalty Programme", icon: Star },
  { key: "voucher-cleanup", label: "Voucher Cleanup", icon: Trash2 },
];

function TabGroup({
  title,
  description,
  cardClass,
  titleClass,
  tabActiveClass,
  tabs,
  activeTab,
}: {
  title: string;
  description: string;
  cardClass: string;
  titleClass: string;
  tabActiveClass: string;
  tabs: typeof ACCOUNT_SETTINGS_TABS;
  activeTab: string;
}) {
  return (
    <div className={`flex-1 rounded-2xl border-2 p-5 ${cardClass}`}>
      <p className={`text-base font-bold ${titleClass}`}>{title}</p>
      <p className="mb-4 mt-1 text-xs text-[#737373]">{description}</p>

      <div className="flex flex-wrap gap-2">
        {tabs.map((tab) => {
          const Icon = tab.icon;
          const isActive = tab.key === activeTab;
          const href =
            tab.key === "general"
              ? "/dashboards/settings"
              : `/dashboards/settings/${tab.key}`;

          return (
            <Link
              key={tab.key}
              href={href}
              className={`inline-flex items-center gap-2 rounded-xl px-3 py-2.5 text-sm font-semibold transition ${
                isActive
                  ? tabActiveClass
                  : "text-[#737373] hover:bg-white hover:text-[#525252]"
              }`}
            >
              <Icon size={16} className="shrink-0" />
              {tab.label}
            </Link>
          );
        })}
      </div>
    </div>
  );
}

export function SettingsTabs({ activeTab }: { activeTab: string }) {
  return (
    <div className="mb-6 flex flex-col gap-4 lg:flex-row">
      <TabGroup
        title="Account Settings"
        description="Applies to your whole admin account, no matter how many businesses/sites you run."
        cardClass="border-slate-300 bg-slate-100"
        titleClass="text-slate-700"
        tabActiveClass="bg-white text-[#1a1a1a] shadow-sm ring-1 ring-slate-300"
        tabs={ACCOUNT_SETTINGS_TABS}
        activeTab={activeTab}
      />
      <TabGroup
        title="Business Settings"
        description="Can be set the same for every business, or differently for each one."
        cardClass="border-[#1a1a1a] bg-[#f4f4f4]"
        titleClass="text-[#1a1a1a]"
        tabActiveClass="bg-white text-[#1a1a1a] shadow-sm ring-1 ring-[#1a1a1a]"
        tabs={BUSINESS_SETTINGS_TABS}
        activeTab={activeTab}
      />
    </div>
  );
}
