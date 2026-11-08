import { useState } from "react";

import type { MomoIntegrationSettings } from "../shared/types";

const initialMomoSettings: MomoIntegrationSettings = {
  enabled: false,
  provider: "MTN Mobile Money",
  environment: "sandbox",
  merchantId: "",
  apiKey: "",
  apiSecret: "",
  callbackUrl: "https://hotspotpro.example.com/api/webhooks/momo",
  allowVoucherPurchase: true,
  allowPackagePurchase: true,
  minAmount: 1,
  maxAmount: 5000,
  lastTestedAt: null,
  lastTestStatus: null,
  autoRenewEnabled: false,
  autoRenewOnLowData: true,
  autoRenewOnExpiry: true,
  autoRenewDataThresholdPercent: 10,
  autoRenewBeforeExpiryMinutes: 15,
  autoRenewMaxPerCustomerPerDay: 2,
  autoRenewCooldownMinutes: 60,
};

export function useMomoIntegrationState(
  showToast: (message: string) => void,
  logActivity: (category: "Settings", message: string) => void,
) {
  const [momoSettings, setMomoSettings] = useState<MomoIntegrationSettings>(initialMomoSettings);
  // Customers who've been individually cut off from auto-renew — e.g. it
  // kept firing too often on their account — identified by phone number
  // since that's how ActiveUser records are keyed.
  const [autoRenewDisabledPhones, setAutoRenewDisabledPhones] = useState<string[]>([]);

  function updateMomoSettings(updates: Partial<MomoIntegrationSettings>) {
    setMomoSettings((current) => ({ ...current, ...updates }));
  }

  function saveMomoSettings() {
    showToast("Mobile Money settings saved.");
    logActivity("Settings", `Updated Mobile Money integration (${momoSettings.provider}, ${momoSettings.environment}).`);
  }

  function testMomoConnection() {
    const hasCredentials = momoSettings.merchantId.trim() && momoSettings.apiKey.trim() && momoSettings.apiSecret.trim();
    const now = new Date().toLocaleString("en-GB", {
      day: "2-digit",
      month: "short",
      hour: "2-digit",
      minute: "2-digit",
    });

    if (!hasCredentials) {
      setMomoSettings((current) => ({ ...current, lastTestedAt: now, lastTestStatus: "failed" }));
      showToast("Connection test failed — fill in Merchant ID, API Key and API Secret first.");
      return;
    }

    setMomoSettings((current) => ({ ...current, lastTestedAt: now, lastTestStatus: "success" }));
    showToast(`Connected to ${momoSettings.provider} (${momoSettings.environment}) successfully.`);
    logActivity("Settings", `Tested Mobile Money connection (${momoSettings.provider}) — success.`);
  }

  function disableAutoRenewForCustomer(phone: string) {
    setAutoRenewDisabledPhones((current) => (current.includes(phone) ? current : [...current, phone]));
    showToast(`Auto-renew turned off for ${phone}.`);
    logActivity("Settings", `Disabled Mobile Money auto-renew for customer ${phone}.`);
  }

  function enableAutoRenewForCustomer(phone: string) {
    setAutoRenewDisabledPhones((current) => current.filter((p) => p !== phone));
    showToast(`Auto-renew turned back on for ${phone}.`);
    logActivity("Settings", `Re-enabled Mobile Money auto-renew for customer ${phone}.`);
  }

  return {
    momoSettings,
    updateMomoSettings,
    saveMomoSettings,
    testMomoConnection,
    autoRenewDisabledPhones,
    disableAutoRenewForCustomer,
    enableAutoRenewForCustomer,
  };
}

