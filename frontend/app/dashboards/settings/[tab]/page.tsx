"use client";

import { use } from "react";

import { SettingsTabs } from "@/components/dashboard/settings/SettingsTabs";
import { SettingsComingSoon } from "@/components/dashboard/settings/SettingsComingSoon";
import { LoyaltySettingsPanel } from "@/components/dashboard/settings/LoyaltySettingsPanel";
import { HotspotPolicySettingsPanel } from "@/components/dashboard/settings/HotspotPolicySettingsPanel";
import { PaymentSettingsPanel } from "@/components/dashboard/settings/PaymentSettingsPanel";
import { SecuritySettingsPanel } from "@/components/dashboard/settings/SecuritySettingsPanel";
import { SitesSettingsPanel } from "@/components/dashboard/settings/SitesSettingsPanel";
import { NotificationsSettingsPanel } from "@/components/dashboard/settings/NotificationsSettingsPanel";
import { CaptivePortalSettingsPanel } from "@/components/dashboard/settings/CaptivePortalSettingsPanel";
import { AlertsSettingsPanel } from "@/components/dashboard/settings/AlertsSettingsPanel";
import { VoucherCleanupSettingsPanel } from "@/components/dashboard/settings/VoucherCleanupSettingsPanel";
import { DomainSettingsPanel } from "@/components/dashboard/settings/DomainSettingsPanel";
import { SmsSettingsPanel } from "@/components/dashboard/settings/SmsSettingsPanel";
import { WhatsAppSettingsPanel } from "@/components/dashboard/settings/WhatsAppSettingsPanel";
import { BackLink } from "@/components/dashboard/shared/BackLink";

const TAB_LABELS: Record<string, string> = {
  payments: "Payments",
  hotspot: "Hotspot",
  "captive-portal": "Captive Portal",
  domain: "Domain",
  loyalty: "Loyalty Programme",
  sms: "SMS",
  whatsapp: "WhatsApp",
  notifications: "Notifications",
  security: "Security",
  sites: "Sites",
  alerts: "Alerts",
  "voucher-cleanup": "Voucher Cleanup",
};

export default function SettingsTabPage({
  params,
}: {
  params: Promise<{ tab: string }>;
}) {
  const { tab } = use(params);
  const label = TAB_LABELS[tab] ?? "This";

  return (
    <section className="w-full">
      <BackLink />
      <h2 className="mb-1 text-3xl font-bold tracking-tight md:text-4xl">
        Settings
      </h2>
      <p className="mb-6 text-sm text-[#64748b] md:text-base">
        Configure your HotspotPro business settings.
      </p>

      <SettingsTabs activeTab={tab} />
      {tab === "loyalty" ? (
        <LoyaltySettingsPanel />
      ) : tab === "hotspot" ? (
        <HotspotPolicySettingsPanel />
      ) : tab === "payments" ? (
        <PaymentSettingsPanel />
      ) : tab === "security" ? (
        <SecuritySettingsPanel />
      ) : tab === "sites" ? (
        <SitesSettingsPanel />
      ) : tab === "notifications" ? (
        <NotificationsSettingsPanel />
      ) : tab === "captive-portal" ? (
        <CaptivePortalSettingsPanel />
      ) : tab === "alerts" ? (
        <AlertsSettingsPanel />
      ) : tab === "whatsapp" ? (
        <WhatsAppSettingsPanel />
      ) : tab === "sms" ? (
        <SmsSettingsPanel />
      ) : tab === "domain" ? (
        <DomainSettingsPanel />
      ) : tab === "voucher-cleanup" ? (
        <VoucherCleanupSettingsPanel />
      ) : (
        <SettingsComingSoon tabLabel={label} />
      )}
    </section>
  );
}
