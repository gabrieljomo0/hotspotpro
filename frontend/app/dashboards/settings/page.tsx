"use client";

import { SettingsTabs } from "@/components/dashboard/settings/SettingsTabs";
import { BrandingForm } from "@/components/dashboard/settings/BrandingForm";
import { PortalControlPanel } from "@/components/dashboard/settings/PortalControlPanel";
import { CommissionSettingsPanel } from "@/components/dashboard/settings/CommissionSettingsPanel";
import { CurrencySettingsPanel } from "@/components/dashboard/settings/CurrencySettingsPanel";
import { ResetDemoDataPanel } from "@/components/dashboard/settings/ResetDemoDataPanel";
import { BackLink } from "@/components/dashboard/shared/BackLink";

export default function SettingsPage() {
  return (
    <section className="w-full">
      <BackLink />
      <h2 className="mb-1 text-3xl font-bold tracking-tight md:text-4xl">
        Settings
      </h2>
      <p className="mb-6 text-sm text-[#64748b] md:text-base">
        Configure your HotspotPro business settings.
      </p>

      <SettingsTabs activeTab="general" />
      <BrandingForm />
      <CurrencySettingsPanel />
      <PortalControlPanel />
      <CommissionSettingsPanel />
      <ResetDemoDataPanel />
    </section>
  );
}
