// "Master settings": one set of hotspot and captive-portal settings that,
// while switched on, overrides what every router has saved for itself.
// Each router's own values are left untouched underneath, so switching the
// master off puts them straight back.

import type { CaptivePortalConfig } from "../shared/types";

// What the router's "Hotspot" tab controls.
export const HOTSPOT_KEYS = [
  "ssid", "wifiPassword", "bandwidthLimit", "sessionTimeout", "idleTimeout",
  "defaultThrottleEnabled", "defaultThrottleAtValue", "defaultThrottleAtUnit", "defaultThrottleSpeedMbps",
  "adsEnabled",
  "freeTrialEnabled", "freeTrialButtonText", "freeTrialsPerDevice", "freeTrialMode",
  "freeTrialButtonPosition", "freeTrialCooldownEnabled", "freeTrialBlockMessage",
] as const satisfies readonly (keyof CaptivePortalConfig)[];

// What the router's "Captive Portal" tab controls.
export const PORTAL_KEYS = [
  "template", "primaryColorOverride", "secondaryColorOverride", "logoSizePx", "portalFont", "portalLanguage",
  "businessNameOverride", "logoText", "logoImageDataUrl", "backgroundImageDataUrl",
  "authMethod",
  "showPackages", "showPackageDeviceLimits", "showDeviceMac", "showFeedbackButton", "allowOnlinePurchases",
  "showPackageTime", "buyForOtherDevice", "redirectUrlAfterLogin", "phoneCollectionOnActivation",
  "physicalVoucherLocation", "showBuyOnlineVouchers", "showResellerApplication",
] as const satisfies readonly (keyof CaptivePortalConfig)[];

export type MasterPortalSettings = {
  hotspotOverride: boolean;
  portalOverride: boolean;
  config: CaptivePortalConfig;
};

export type MasterSection = "hotspot" | "portal";

export function masterIsOn(master: Pick<MasterPortalSettings, "hotspotOverride" | "portalOverride">, section: MasterSection) {
  return section === "hotspot" ? master.hotspotOverride : master.portalOverride;
}

function pick(config: CaptivePortalConfig, keys: readonly (keyof CaptivePortalConfig)[]) {
  const out: Partial<CaptivePortalConfig> = {};
  for (const key of keys) (out as Record<string, unknown>)[key] = config[key];
  return out;
}

// The settings a router really runs with.
export function applyMaster(own: CaptivePortalConfig, master: MasterPortalSettings): CaptivePortalConfig {
  let result = own;
  if (master.hotspotOverride) result = { ...result, ...pick(master.config, HOTSPOT_KEYS) };
  if (master.portalOverride) result = { ...result, ...pick(master.config, PORTAL_KEYS) };
  return result;
}
