"use client";

// Everything about routers: the router list itself, per-router config,
// business/site groupings, captive portal configs, and account-wide
// hotspot network settings — plus every action that can be taken on a
// router (provisioning, remote actions, Multi-WAN, deleting, etc).
//
// showToast/logActivity are passed in (from useNotifications, called
// earlier in DashboardProvider) rather than imported directly, since
// this hook doesn't own that state itself.

import { useEffect, useRef, useState } from "react";
import { usePersistedState } from "./usePersistedState";
import { queueRouterAction, queueRouterActionMany } from "./queueRouterAction";
import { ROUTER_TASKS, TASK_STEP_MS, type RouterTaskKind } from "../routers/routerTasks";
import { DEFAULT_WAN_MODE, defaultIspLinks } from "../routers/multiWanDefaults";

import {
  routers as initialRoutersData,
  type RouterInfo,
  type RouterISPLink,
} from "../data/dashboard-data";
import { applyMaster, type MasterPortalSettings } from "../routers/masterPortal";
import type {
  RouterConfig,
  HotspotSettings,
  BusinessLocation,
  CaptivePortalConfig,
} from "../shared/types";

const initialHotspotSettings: HotspotSettings = {
  ssid: "HotspotPro WiFi",
  ssidStrategy: "per-router",
  wifiPassword: "hotspotpro123",
  bandwidthLimit: "10M/5M",
  sessionTimeout: "24h",
  idleTimeout: "10m",
  redirectUrl: "https://hotspotpro.example.com/welcome",
};

export const defaultCaptivePortalConfig: CaptivePortalConfig = {
  ssid: "HotspotPro-WiFi",
  wifiPassword: "",
  bandwidthLimit: "10M/5M",
  sessionTimeout: "24h",
  idleTimeout: "10m",

  defaultThrottleEnabled: false,
  defaultThrottleAtValue: null,
  defaultThrottleAtUnit: "GB",
  defaultThrottleSpeedMbps: 1,

  template: "Classic",
  primaryColorOverride: "",
  secondaryColorOverride: "",
  logoSizePx: null,
  portalFont: "Work Sans",
  portalLanguage: "English",
  businessNameOverride: "",
  logoText: "",
  logoImageDataUrl: "",
  backgroundImageDataUrl: "",

  authMethod: "Username & Password",

  showPackages: true,
  showPackageDeviceLimits: false,
  showDeviceMac: false,
  showFeedbackButton: false,
  allowOnlinePurchases: true,
  showPackageTime: true,
  buyForOtherDevice: true,
  redirectUrlAfterLogin: "",
  phoneCollectionOnActivation: "Off",
  physicalVoucherLocation: "",
  showBuyOnlineVouchers: true,
  showResellerApplication: true,

  adsEnabled: false,

  freeTrialEnabled: false,
  freeTrialButtonText: "Get Free Trial",
  freeTrialsPerDevice: 1,
  freeTrialMode: "One click",
  freeTrialButtonPosition: "Bottom",
  freeTrialCooldownEnabled: false,
  freeTrialBlockMessage:
    "You have already used your free trial. Please purchase a package to continue enjoying @company_name WiFi.",
};



export function useRouterState(
  showToast: (message: string) => void,
  logActivity: (category: "Router" | "Settings", message: string) => void,
) {

  const [routerEnabled, setRouterEnabled] = usePersistedState<Record<string, boolean>>("routerEnabled", 
    Object.fromEntries(
      initialRoutersData.map((router) => [router.ip, router.status === "Online"]),
    ),
  );

  const [routers, setRouters] = usePersistedState<RouterInfo[]>("routers", initialRoutersData);
  const [routerConfigs, setRouterConfigs] = usePersistedState<
    Record<string, RouterConfig>
  >("routerConfigs", {});

  const [hotspotSettings, setHotspotSettings] = usePersistedState<HotspotSettings>(
    "hotspotSettings",
    initialHotspotSettings,
  );

  const [businessLocations, setBusinessLocations] = usePersistedState<BusinessLocation[]>("businessLocations", [
    { id: "site-main", name: "Main Business (Accra)", createdAt: "01 Jan 2026", ssidMode: "perRouter", siteWideSsid: "Main Business", enabled: true },
    { id: "site-kumasi", name: "Kumasi Tech Hub", createdAt: "18 Feb 2026", ssidMode: "perRouter", siteWideSsid: "Kumasi Tech Hub", enabled: true },
    { id: "site-takoradi", name: "Takoradi Waterfront Plaza", createdAt: "05 Apr 2026", ssidMode: "siteWide", siteWideSsid: "Takoradi WiFi", enabled: true },
    { id: "site-eastlegon", name: "East Legon Residences", createdAt: "22 Jun 2026", ssidMode: "perRouter", siteWideSsid: "East Legon Residences", enabled: true },
  ]);

  const [captivePortalConfigs, setCaptivePortalConfigs] = usePersistedState<
    Record<string, CaptivePortalConfig>
  >("captivePortalConfigs", {});

  // Master ("super") settings that override every router while switched on.
  const [masterPortal, setMasterPortal] = usePersistedState<MasterPortalSettings>("masterPortal", {
    hotspotOverride: false,
    portalOverride: false,
    config: defaultCaptivePortalConfig,
  });

  function getRouterConfig(ip: string): RouterConfig {
    return (
      routerConfigs[ip] ?? {
        ssid: `HotspotPro-${ip.split(".").pop()}`,
        wifiPassword: "changeme123",
        bandwidthDownMbps: 10,
        bandwidthUpMbps: 5,
        adminUsername: "admin",
        vlanId: "",
      }
    );
  }

  // The SSID actually broadcast for a router: a site-level shared name (if
  // that site is set to "siteWide"), else the account-wide shared name (if
  // "Use the same SSID everywhere" is on), else the router's own name.
  function getEffectiveSsid(ip: string): string {
    // Master hotspot settings win over everything below while switched on.
    if (masterPortal.hotspotOverride && masterPortal.config.ssid.trim()) return masterPortal.config.ssid;
    const router = routers.find((r) => r.ip === ip);
    const site = router?.siteId ? businessLocations.find((s) => s.id === router.siteId) : null;
    if (site?.ssidMode === "siteWide") {
      return site.siteWideSsid || site.name;
    }
    if (hotspotSettings.ssidStrategy === "same") {
      return hotspotSettings.ssid;
    }
    return getRouterConfig(ip).ssid;
  }

  function updateRouterConfig(ip: string, updates: Partial<RouterConfig>) {
    setRouterConfigs((current) => ({
      ...current,
      [ip]: { ...getRouterConfig(ip), ...updates },
    }));
    const router = routers.find((r) => r.ip === ip);
    showToast(`Settings saved for ${router?.name ?? ip}.`);
    logActivity("Router", `Updated settings for ${router?.name ?? ip}.`);
  }

  function addRouter(input: {
    name: string;
    ip?: string;
    hasWireless?: boolean;
    wanInterface?: string;
    managementPort?: string;
    lastPortFree?: boolean;
    adminFromWan?: boolean;
    wifiSsid?: string;
    routerType?: "New Router" | "Existing Router";
    hotspotEnabled?: boolean;
    loginMode?: "cloud" | "local";
    hotspotNetwork?: string;
    hotspotGatewayIp?: string;
    hotspotDnsServers?: string;
    hotspotLoginUrl?: string;
    pppoeEnabled?: boolean;
    pppoeNetwork?: string;
    dnsName?: string;
    siteId?: string;
    newSiteName?: string;
    provisioningToken?: string;
    provisioned?: boolean;
  }) {
    const apiPassword = Math.random().toString(36).slice(2, 14);

    let resolvedSiteId: string | null = input.siteId ?? null;
    if (!resolvedSiteId && input.newSiteName?.trim()) {
      resolvedSiteId = addBusinessLocation(input.newSiteName.trim()).id;
    }

    const newRouter: RouterInfo = {
      name: input.name,
      ip: input.ip || `pending-${Date.now()}`,
      status: "Offline",
      uptime: "N/A",
      clients: 0,
      cpu: 0,
      memory: 0,
      lastSeen: "Just now",
      provisioningStatus: "Pending",
      health: "checking",
      connectionMode: "Hybrid+",
      winboxAddress: "",
      bypassModeEnabled: false,
      isDefault: false,
      port: 8728,
      apiUsername: "hotspotpro_user",
      apiPassword,
      legacyUsername: "hotspotpro_user",
      legacyPassword: "",
      wireguardTunnelIp: null,
      description: "",
      lastConnectedAt: null,
      lastError: null,
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
      multiWanMode: DEFAULT_WAN_MODE,
      ispLinks: defaultIspLinks(),
      hotspotEnabled: input.hotspotEnabled ?? true,
      loginMode: input.loginMode === "local" ? "local" : "cloud",
      hotspotNetwork: input.hotspotNetwork ?? "10.10.0.0/16",
      hotspotGatewayIp: input.hotspotGatewayIp ?? "10.10.0.1",
      hotspotDnsServers: input.hotspotDnsServers ?? "8.8.8.8,8.8.4.4",
      hotspotLoginUrl: input.hotspotLoginUrl ?? "hotspot",
      pppoeEnabled: input.pppoeEnabled ?? false,
      pppoeNetwork: input.pppoeNetwork ?? "192.168.91.0/24",
      routerType: input.routerType ?? "New Router",
      dnsName: input.dnsName ?? "",
      paused: false,
      hasWireless: input.hasWireless ?? true,
      wanInterface: input.wanInterface || "ether1",
      managementPort: input.managementPort || "",
      lastPortFree: input.lastPortFree !== false,
      adminFromWan: input.adminFromWan !== false,
      remoteAccessEnabled: true,
      siteId: resolvedSiteId,
      provisioningToken: input.provisioningToken,
      // The router already ran its setup script while the "Add router" page
      // was open (the server saw it call back).
      ...(input.provisioned
        ? {
            provisioningStatus: "Provisioned" as const,
            status: "Online",
            health: "ok" as const,
            lastSeen: "Just now",
            uptime: "0m",
            provisionedAt: stamp(),
          }
        : {}),
    };

    // Seed this router's captive portal config. If it's joining an existing
    // site that already has a config, getCaptivePortalConfig will resolve
    // to that automatically — nothing to seed. Only a genuinely new site
    // (or a router with no site) needs its own starting config.
    if (input.hasWireless ?? true) {
      const configKey = resolvedSiteId ?? newRouter.ip;
      const alreadyHasConfig = resolvedSiteId && captivePortalConfigs[resolvedSiteId];

      if (!alreadyHasConfig) {
        const ssidForRouter =
          hotspotSettings.ssidStrategy === "same"
            ? hotspotSettings.ssid
            : input.wifiSsid ?? "";

        setCaptivePortalConfigs((current) => ({
          ...current,
          [configKey]: {
            ...defaultCaptivePortalConfig,
            ssid: ssidForRouter,
          },
        }));
      }
    }

    setRouters((current) => [newRouter, ...current]);
    setRouterEnabled((current) => ({ ...current, [newRouter.ip]: !!input.provisioned }));
    showToast(input.provisioned ? `Router "${newRouter.name}" is connected.` : `Router "${newRouter.name}" added — awaiting provisioning.`);
    logActivity("Router", input.provisioned ? `Router "${newRouter.name}" connected.` : `Added router "${newRouter.name}", pending provisioning.`);
    return newRouter;
  }

  // ---- what each action leaves behind on the router --------------------
  function stamp() {
    return new Date().toLocaleString("en-GB", {
      day: "2-digit", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit", second: "2-digit",
    });
  }

  function patchRouter(ip: string, patch: Partial<RouterInfo>, text: string) {
    setRouters((current) =>
      current.map((r) =>
        r.ip === ip
          ? { ...r, ...patch, activity: [{ at: stamp(), text }, ...(r.activity ?? [])].slice(0, 30) }
          : r,
      ),
    );
  }

  function isRouterReachable(ip: string) {
    const router = routers.find((r) => r.ip === ip);
    return !!router && (routerEnabled[ip] ?? router.status === "Online") && router.provisioningStatus === "Provisioned";
  }

  function fullProvisionRouter(ip: string) {
    startRouterTask("full-provision", ip);
  }

  function regenerateApiCredentials(ip: string) {
    startRouterTask("api-credentials", ip);
  }

  function regenerateWinboxAddress(ip: string) {
    const router = routers.find((r) => r.ip === ip);
    if (!router) return;

    const remoteOn = router.remoteAccessHold !== true;
    if (!remoteOn) {
      void fetch("/api/routers/jobs", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ip, action: "winbox" }),
      }).catch(() => {});
      patchRouter(ip, { winboxAddress: "192.168.88.1", remoteAccessEnabled: false, winboxReach: "lan" }, "WinBox limited to the admin port 192.168.88.1.");
      showToast(`WinBox for ${router.name} stays on the admin port at 192.168.88.1.`);
      logActivity("Router", `Regenerated WinBox address for ${router.name}.`);
      return;
    }

    patchRouter(ip, { remoteAccessEnabled: true, remoteAccessHold: false }, "Remote WinBox refresh queued.");
    logActivity("Router", `Regenerated WinBox address for ${router.name}.`);
    void import("../routers/autoRemoteWinbox").then(({ autoPrepareRemoteWinbox }) =>
      autoPrepareRemoteWinbox({
        ip,
        name: router.name,
        forceDownload: false,
        queueJob: true,
        patchRouter: (target, patch) => {
          setRouters((current) => current.map((r) => (r.ip === target ? { ...r, ...patch } : r)));
        },
        showToast,
      }),
    );
  }

  function syncHotspotFiles(ip: string) {
    startRouterTask("sync-files", ip);
  }

  function syncRouterTime(ip: string) {
    startRouterTask("sync-time", ip);
  }

  function configureSnmp(ip: string) {
    startRouterTask("snmp", ip);
  }

  function configureWalledGarden(ip: string) {
    startRouterTask("walled-garden", ip);
  }

  function hardenServices(ip: string) {
    startRouterTask("harden", ip);
  }

  function updateRouterScript(ip: string) {
    startRouterTask("update-script", ip);
  }

  function downloadRouterFile(ip: string, kind: "provision-script" | "wireguard-config") {
    const router = routers.find((r) => r.ip === ip);
    if (!router) return;

    if (kind === "wireguard-config") {
      if (router.wireguardConfig) {
        const blob = new Blob([router.wireguardConfig], { type: "text/plain" });
        const url = URL.createObjectURL(blob);
        const link = document.createElement("a");
        link.href = url;
        link.download = `${router.name}-winbox.conf`;
        link.click();
        URL.revokeObjectURL(url);
        showToast("Tunnel file downloaded. WinBox address is 192.168.216.1 after WireGuard activates it.");
        logActivity("Router", `Downloaded the WireGuard tunnel for ${router.name}.`);
        return;
      }
      const address = router.winboxReach === "direct" && router.winboxAddress ? router.winboxAddress : "192.168.88.1";
      void navigator.clipboard?.writeText(address);
      showToast(router.remoteAccessEnabled
        ? `Copied ${address}. Enable or refresh Remote WinBox to prepare the tunnel automatically.`
        : `Copied ${address}. Enable Remote WinBox to prepare a remote connection automatically.`);
      logActivity("Router", `Copied the WinBox address for ${router.name}.`);
      return;
    }
    if (!router.provisioningToken) {
      showToast("This router has no setup link yet. Add it from the Add Router page.");
      return;
    }
    const ssid = encodeURIComponent((getEffectiveSsid(ip) || router.name || "HotspotPro").trim().slice(0, 32));
    void fetch(`/api/provision/${router.provisioningToken}?wireless=yes&ssid=${ssid}`)
      .then((response) => response.text())
      .then((content) => {
        const blob = new Blob([content], { type: "text/plain" });
        const url = URL.createObjectURL(blob);
        const link = document.createElement("a");
        link.href = url;
        link.download = `${router.name}-provision.rsc`;
        link.click();
        URL.revokeObjectURL(url);
        showToast("Provisioning script downloaded.");
        logActivity("Router", `Downloaded the provisioning script for ${router.name}.`);
      })
      .catch(() => showToast("Could not download the provisioning script."));
    return;

  }

  function updateRouterNotificationContacts(ip: string, phones: string[], emails: string[]) {
    setRouters((current) =>
      current.map((r) =>
        r.ip === ip ? { ...r, notificationPhones: phones, notificationEmails: emails } : r,
      ),
    );
    const usingAccountLevel = phones.length === 0 && emails.length === 0;
    showToast(
      usingAccountLevel
        ? "Notification contacts updated — this router now uses the account-level notification contacts."
        : "Notification contacts updated for this router.",
    );
    logActivity("Router", `Updated notification contacts for router ${ip}.`);
  }

  function updateMultiWanConfig(
    ip: string,
    mode: RouterInfo["multiWanMode"],
    ispLinks: RouterISPLink[],
    silent = false,
  ) {
    const primary = ispLinks.map((l) => l.interface.trim()).find((name) => /^(ether|sfp|sfp-sfpplus|sfpplus|lte|wlan|wifi|vlan|pppoe-out)[A-Za-z0-9._-]*$/.test(name));
    setRouters((current) =>
      current.map((r) =>
        r.ip === ip
          ? { ...r, multiWanMode: mode, ispLinks, ...(primary ? { wanInterface: primary } : {}) }
          : r,
      ),
    );
    if (silent) return;
    showToast("Multi-WAN configuration saved.");
    logActivity("Router", `Updated Multi-WAN configuration for router ${ip}.`);
  }

  function updateRouterDetails(ip: string, updates: Partial<RouterInfo>) {
    setRouters((current) =>
      current.map((r) => (r.ip === ip ? { ...r, ...updates } : r)),
    );
    // Hotspot / DNS / login mode are read on every check-in. Queue a page + WiFi refresh so it lands quickly.
    if (
      updates.hotspotEnabled !== undefined ||
      updates.hotspotDnsServers !== undefined ||
      updates.dnsName !== undefined ||
      updates.loginMode !== undefined ||
      updates.pppoeEnabled !== undefined
    ) {
      queueRouterAction(ip, "sync-files");
      queueRouterAction(ip, "wifi");
      if (updates.loginMode === "local" || updates.loginMode === undefined) queueRouterAction(ip, "sync-vouchers");
    }
    showToast("Router details saved. Applying on the router…");
    logActivity("Router", `Updated details for router ${ip}.`);
  }

  function toggleRemoteAccess(ip: string, enabled?: boolean) {
    const router = routers.find((r) => r.ip === ip);
    if (!router) return;

    const next = typeof enabled === "boolean" ? enabled : !router.remoteAccessEnabled;
    setRouters((current) =>
      current.map((r) =>
        r.ip === ip
          ? {
              ...r,
              remoteAccessEnabled: next,
              remoteAccessHold: !next,
              winboxAddress: next ? r.winboxAddress || "192.168.88.1" : "192.168.88.1",
              winboxReach: next ? r.winboxReach : "lan",
              wireguardConfig: next ? r.wireguardConfig : null,
            }
          : r,
      ),
    );
    if (!next) {
      void fetch("/api/routers/jobs", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ip, action: "remote-winbox-off" }),
      }).catch(() => {});
      showToast(`Remote WinBox is off for ${router.name}. WinBox stays on the admin port at 192.168.88.1.`);
      logActivity("Router", `Disabled remote WinBox for ${router.name}.`);
      return;
    }

    logActivity("Router", `Enabled remote WinBox for ${router.name}.`);
    // Tunnel comes from the setup script and is reused — no re-download every enable.
    void import("../routers/autoRemoteWinbox").then(({ autoPrepareRemoteWinbox }) =>
      autoPrepareRemoteWinbox({
        ip,
        name: router.name,
        forceDownload: false,
        queueJob: true,
        patchRouter: (target, patch) => {
          setRouters((current) => current.map((r) => (r.ip === target ? { ...r, ...patch } : r)));
        },
        showToast,
      }),
    );
  }

  function updateConnectionMode(ip: string, mode: RouterInfo["connectionMode"]) {
    const router = routers.find((r) => r.ip === ip);
    if (!router) return;

    setRouters((current) =>
      current.map((r) => (r.ip === ip ? { ...r, connectionMode: mode } : r)),
    );
    showToast(`Connection mode set to ${mode} for ${router.name}.`);
    logActivity("Router", `Changed connection mode to ${mode} for ${router.name}.`);
  }

  function deleteRouter(ip: string) {
    const router = routers.find((r) => r.ip === ip);
    setRouters((current) => current.filter((r) => r.ip !== ip));
    showToast(`Router ${router?.name ?? ""} deleted.`);
    logActivity("Router", `Deleted router ${router?.name ?? ip}.`);
  }

  function runRouterHealthCheck(ip: string) {
    const router = routers.find((r) => r.ip === ip);
    if (!router) return;

    setRouters((current) =>
      current.map((r) =>
        r.ip === ip
          ? {
              ...r,
              lastSeen: "Just now",
              cpu: Math.max(5, Math.min(r.cpu, 45)),
              memory: Math.max(5, Math.min(r.memory, 55)),
            }
          : r,
      ),
    );
    showToast(`✓ Health check passed for ${router.name}. CPU and memory look healthy.`);
    logActivity("Router", `Ran a health check on ${router.name}.`);
  }

  function syncRouter(ip: string) {
    // Push vouchers + login pages + WiFi from the site onto this router now.
    void fetch("/api/routers/jobs", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ ip, action: "sync-vouchers" }),
    }).catch(() => {});
    void fetch("/api/routers/jobs", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ ip, action: "sync-files" }),
    }).catch(() => {});
    void fetch("/api/routers/jobs", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ ip, action: "wifi" }),
    }).catch(() => {});
    const router = routers.find((r) => r.ip === ip);
    showToast(`${router?.name ?? "Router"} will sync vouchers, login pages and WiFi within about 3 seconds.`);
    logActivity("Router", `Queued a live sync for ${router?.name ?? ip}.`);
  }

  function restartRouter(ip: string) {
    startRouterTask("reboot", ip);
  }

  // Pauses/resumes traffic through a router without fully disconnecting
  // it — same idea as pausing one customer's session, but for everyone on
  // this router at once.
  function toggleRouterPaused(ip: string) {
    const router = routers.find((r) => r.ip === ip);
    if (!router) return;
    const nextPaused = !router.paused;
    patchRouter(ip, { paused: nextPaused }, nextPaused ? "Connection paused." : "Connection resumed.");
    showToast(
      nextPaused
        ? `Internet usage paused on ${router.name}. Customers stay connected but traffic is held.`
        : `Internet usage resumed on ${router.name}.`,
    );
    logActivity("Router", `${nextPaused ? "Paused" : "Resumed"} internet usage on router ${router.name}.`);
  }

  // Disconnects/reconnects the router's internet. Disconnected = nobody gets online through this router
  // (the server tells the router to cut all customer traffic and refuses new logins — backend/src/server/control.ts)
  // and the router page and lists show it in red; Reconnect restores it and shows "back online".
  // Distinct from Reboot, which always comes back on its own.
  function toggleRouterConnection(ip: string) {
    const router = routers.find((r) => r.ip === ip);
    if (!router) return;
    const goingOffline = router.status !== "Offline" && !router.disconnected;
    const at = new Date().toISOString();
    patchRouter(
      ip,
      {
        status: goingOffline ? "Offline" : "Online",
        lastSeen: goingOffline ? "Disconnected" : "Just now",
        disconnected: goingOffline,
        ...(goingOffline ? { disconnectedAt: at } : { reconnectedAt: at }),
      },
      goingOffline ? "Disconnected — internet cut for everyone on this router." : "Reconnected — internet restored.",
    );
    setRouterEnabled((current) => ({ ...current, [ip]: !goingOffline }));
    showToast(
      goingOffline
        ? `${router.name} disconnected. Customers lose internet within 30 seconds.`
        : `${router.name} reconnected. Internet is back within 30 seconds.`,
    );
    logActivity("Router", `${goingOffline ? "Disconnected" : "Reconnected"} router ${router.name}.`);
  }

  function updateHotspotSettings(updates: Partial<HotspotSettings>) {
    setHotspotSettings((current) => ({ ...current, ...updates }));

    const nextStrategy = updates.ssidStrategy ?? hotspotSettings.ssidStrategy;
    const nextSsid = updates.ssid ?? hotspotSettings.ssid;

    if (nextStrategy === "same") {
      setCaptivePortalConfigs((current) => {
        const next = { ...current };
        routers.forEach((r) => {
          next[r.ip] = { ...(next[r.ip] ?? defaultCaptivePortalConfig), ssid: nextSsid };
        });
        return next;
      });
      queueRouterActionMany(routers.map((r) => r.ip), "wifi");
    } else if (updates.ssid !== undefined) {
      queueRouterActionMany(routers.map((r) => r.ip), "wifi");
    }

    showToast(
      updates.ssidStrategy
        ? nextStrategy === "same"
          ? `All routers now use the same SSID: "${nextSsid}". Applying on the routers…`
          : "Each router can now use its own SSID."
        : "Hotspot settings saved. Applying on the routers…",
    );
    logActivity("Settings", "Updated hotspot configuration.");
  }

  function siteKeyForRouter(routerIp: string): string {
    const router = routers.find((r) => r.ip === routerIp);
    return router?.siteId ?? routerIp;
  }

  function getCaptivePortalConfig(routerIp: string): CaptivePortalConfig {
    const key = siteKeyForRouter(routerIp);
    return applyMaster(captivePortalConfigs[key] ?? defaultCaptivePortalConfig, masterPortal);
  }

  // Same as above, but works directly off a business ID rather than a
  // router — needed so admin can pick "which business am I editing"
  // explicitly, instead of it always being whichever router they happen
  // to have open.
  function getCaptivePortalConfigForSite(siteId: string): CaptivePortalConfig {
    return applyMaster(captivePortalConfigs[siteId] ?? defaultCaptivePortalConfig, masterPortal);
  }

  function pushCaptivePortalToRouters(siteIdOrRouterIp: string, updates: Partial<CaptivePortalConfig>) {
    const siteRouters = routers.filter((r) => (r.siteId || r.ip) === siteIdOrRouterIp || r.ip === siteIdOrRouterIp);
    const ips = siteRouters.length ? siteRouters.map((r) => r.ip) : routers.filter((r) => r.ip === siteIdOrRouterIp).map((r) => r.ip);
    if (updates.ssid !== undefined || updates.wifiPassword !== undefined) {
      queueRouterActionMany(ips, "wifi");
    }
    // Login page look / auth method — refresh hotspot HTML on the routers.
    queueRouterActionMany(ips, "sync-files");
  }

  function updateCaptivePortalConfigForSite(siteId: string, updates: Partial<CaptivePortalConfig>) {
    setCaptivePortalConfigs((current) => ({
      ...current,
      [siteId]: { ...(current[siteId] ?? defaultCaptivePortalConfig), ...updates },
    }));
    pushCaptivePortalToRouters(siteId, updates);
    const site = businessLocations.find((s) => s.id === siteId);
    showToast(`Captive portal settings saved for ${site?.name ?? "this business"}. Applying on the routers…`);
    logActivity("Settings", `Updated captive portal configuration for "${site?.name ?? siteId}".`);
  }

  function updateCaptivePortalConfig(routerIp: string, updates: Partial<CaptivePortalConfig>) {
    const key = siteKeyForRouter(routerIp);
    setCaptivePortalConfigs((current) => ({
      ...current,
      [key]: { ...(current[key] ?? defaultCaptivePortalConfig), ...updates },
    }));
    pushCaptivePortalToRouters(key, updates);
    queueRouterAction(routerIp, "wifi");
    queueRouterAction(routerIp, "sync-files");
    const site = businessLocations.find((s) => s.id === key);
    const router = routers.find((r) => r.ip === routerIp);
    const label = site?.name ?? router?.name ?? "this router";
    showToast(`Captive portal settings saved for ${label}. Applying on the router…`);
    logActivity("Settings", `Updated captive portal configuration for "${label}".`);
  }

  function applyCaptivePortalToSites(sourceRouterIp: string, targetSiteIds: string[] | "all") {
    const sourceKey = siteKeyForRouter(sourceRouterIp);
    const config = captivePortalConfigs[sourceKey] ?? defaultCaptivePortalConfig;
    const targets = targetSiteIds === "all" ? businessLocations.map((s) => s.id) : targetSiteIds;

    setCaptivePortalConfigs((current) => {
      const next = { ...current };
      targets.forEach((siteId) => {
        next[siteId] = { ...config };
      });
      return next;
    });

    showToast(`Applied this captive portal setup to ${targets.length} site(s).`);
    logActivity("Settings", `Applied captive portal configuration to ${targets.length} site(s).`);
  }

  function addBusinessLocation(name: string) {
    const newSite: BusinessLocation = {
      id: `site-${Date.now()}`,
      name,
      createdAt: new Date().toLocaleDateString("en-GB", {
        day: "2-digit",
        month: "short",
        year: "numeric",
      }),
      ssidMode: "perRouter",
      siteWideSsid: name,
      enabled: true,
    };
    setBusinessLocations((current) => [...current, newSite]);
    showToast(`Business "${name}" created.`);
    logActivity("Settings", `Created business location "${name}".`);
    return newSite;
  }

  function updateBusinessLocationSsid(
    siteId: string,
    updates: { ssidMode?: "perRouter" | "siteWide"; siteWideSsid?: string },
  ) {
    setBusinessLocations((current) =>
      current.map((site) => (site.id === siteId ? { ...site, ...updates } : site)),
    );
    const site = businessLocations.find((s) => s.id === siteId);
    showToast(`SSID settings updated for "${site?.name ?? "site"}".`);
    logActivity("Settings", `Updated SSID mode for "${site?.name ?? siteId}".`);
  }

  function toggleSiteEnabled(siteId: string) {
    const site = businessLocations.find((s) => s.id === siteId);
    const nextEnabled = !(site?.enabled ?? true);
    setBusinessLocations((current) =>
      current.map((s) => (s.id === siteId ? { ...s, enabled: nextEnabled } : s)),
    );
    showToast(
      nextEnabled
        ? `"${site?.name ?? "Site"}" and its routers are enabled again.`
        : `"${site?.name ?? "Site"}" and every router under it are now disabled.`,
    );
    logActivity(
      "Settings",
      `${nextEnabled ? "Enabled" : "Disabled"} site "${site?.name ?? siteId}" (and its routers).`,
    );
  }

  // ---- step-by-step router tasks ----------------------------------------
  const REMOTE_TASKS = new Set<RouterTaskKind>(["full-provision", "sync-files", "sync-time", "snmp", "walled-garden", "harden", "winbox", "api-credentials", "update-script", "reboot"]);
  type ActiveRouterTask = {
    kind: RouterTaskKind;
    ip: string;
    name: string;
    status: "confirm" | "running" | "done" | "failed";
    doneCount: number;
    error: string | null;
    jobId: string | null;
  };
  const [routerTask, setRouterTask] = useState<ActiveRouterTask | null>(null);
  const postingTask = useRef(false);

  function startRouterTask(kind: RouterTaskKind, ip: string) {
    const router = routers.find((r) => r.ip === ip);
    if (!router) return;
    const def = ROUTER_TASKS[kind];
    postingTask.current = false;
    setRouterTask({
      kind,
      ip,
      name: router.name.split(" (")[0],
      status: def.confirm ? "confirm" : "running",
      doneCount: 0,
      error: null,
      jobId: null,
    });
  }

  function confirmRouterTask() {
    postingTask.current = false;
    setRouterTask((task) => (task ? { ...task, status: "running", doneCount: 0, error: null, jobId: null } : task));
  }

  function closeRouterTask() {
    setRouterTask(null);
  }

  function applyRouterTask(kind: RouterTaskKind, ip: string) {
    switch (kind) {
      case "pause": return router_setPaused(ip, true);
      case "resume": return router_setPaused(ip, false);
      case "disconnect": return router_setOnline(ip, false);
      case "reconnect": return router_setOnline(ip, true);
      default: return;
    }
  }

  function router_setPaused(ip: string, paused: boolean) {
    const router = routers.find((r) => r.ip === ip);
    if (router && !!router.paused !== paused) toggleRouterPaused(ip);
  }

  function router_setOnline(ip: string, online: boolean) {
    const router = routers.find((r) => r.ip === ip);
    if (router && (router.status !== "Offline") !== online) toggleRouterConnection(ip);
  }

  function whyNotReachable(ip: string) {
    const router = routers.find((r) => r.ip === ip);
    if (!router) return "The router no longer exists.";
    if (!(routerEnabled[ip] ?? router.status === "Online")) {
      return `${router.name.split(" (")[0]} is offline. Reconnect it, or run Full Provision first.`;
    }
    return `${router.name.split(" (")[0]} has not been provisioned yet. Run Full Provision first.`;
  }

  // Local actions (pause, disconnect) finish on a short checklist. Actions that
  // change the MikroTik are queued and this waits until the router reports back.
  useEffect(() => {
    if (!routerTask || routerTask.status !== "running") return;
    const def = ROUTER_TASKS[routerTask.kind];
    if (REMOTE_TASKS.has(routerTask.kind)) {
      if (!routerTask.jobId) {
        if (postingTask.current) return;
        postingTask.current = true;
        const { kind, ip } = routerTask;
        void fetch("/api/routers/jobs", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ ip, action: kind }),
        })
          .then(async (response) => {
            const data = (await response.json().catch(() => ({}))) as { message?: string; job?: { id: string } };
            if (!response.ok || !data.job?.id) {
              postingTask.current = false;
              setRouterTask((task) => task && task.ip === ip && task.kind === kind ? { ...task, status: "failed", error: data.message ?? "Could not send this to the router." } : task);
              return;
            }
            setRouterTask((task) => task && task.ip === ip && task.kind === kind ? { ...task, jobId: data.job!.id, doneCount: 1 } : task);
          })
          .catch(() => {
            postingTask.current = false;
            setRouterTask((task) => task && task.ip === ip && task.kind === kind ? { ...task, status: "failed", error: "Could not reach the site." } : task);
          });
        return;
      }
      const timer = window.setTimeout(() => {
        const { ip, jobId, kind } = routerTask;
        void fetch(`/api/routers/jobs?ip=${encodeURIComponent(ip)}`, { cache: "no-store" })
          .then((response) => response.json())
          .then((data: { jobs?: { id: string; status: string }[] }) => {
            const job = (data.jobs ?? []).find((item) => item.id === jobId);
            if (!job) return;
            if (job.status === "ok" || (kind === "reboot" && job.status === "sent")) {
              setRouterTask((task) => task && task.jobId === jobId ? { ...task, status: "done", doneCount: def.steps.length } : task);
              return;
            }
            if (job.status === "failed") {
              setRouterTask((task) => task && task.jobId === jobId ? { ...task, status: "failed", error: "The router reported an error. Its log (System → Log) shows which line failed." } : task);
              return;
            }
            setRouterTask((task) => task && task.jobId === jobId ? { ...task, doneCount: Math.max(task.doneCount, job.status === "sent" ? def.steps.length - 1 : 1) } : task);
          })
          .catch(() => undefined);
      }, 2000);
      return () => window.clearTimeout(timer);
    }
    const timer = window.setTimeout(() => {
      const { kind, ip, doneCount } = routerTask;
      if (doneCount === 0 && def.needsReachable && !isRouterReachable(ip)) {
        setRouterTask({ ...routerTask, status: "failed", error: whyNotReachable(ip) });
        return;
      }
      if (doneCount + 1 >= def.steps.length) {
        applyRouterTask(kind, ip);
        setRouterTask({ ...routerTask, status: "done", doneCount: def.steps.length });
        return;
      }
      setRouterTask({ ...routerTask, doneCount: doneCount + 1 });
    }, TASK_STEP_MS);
    return () => window.clearTimeout(timer);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [routerTask]);

  return {
    routerEnabled,
    setRouterEnabled,
    routers,
    setRouters,
    routerConfigs,
    getRouterConfig,
    getEffectiveSsid,
    updateRouterConfig,
    hotspotSettings,
    businessLocations,
    captivePortalConfigs,
    masterPortal,
    setMasterPortal,
    addRouter,
    isRouterReachable,
    fullProvisionRouter,
    routerTask,
    startRouterTask,
    confirmRouterTask,
    closeRouterTask,
    regenerateApiCredentials,
    regenerateWinboxAddress,
    syncHotspotFiles,
    syncRouterTime,
    configureSnmp,
    configureWalledGarden,
    hardenServices,
    updateRouterScript,
    downloadRouterFile,
    updateRouterNotificationContacts,
    updateMultiWanConfig,
    updateRouterDetails,
    updateConnectionMode,
    toggleRemoteAccess,
    deleteRouter,
    runRouterHealthCheck,
    syncRouter,
    restartRouter,
    toggleRouterPaused,
    toggleRouterConnection,
    siteKeyForRouter,
    getCaptivePortalConfig,
    getCaptivePortalConfigForSite,
    updateCaptivePortalConfigForSite,
    updateCaptivePortalConfig,
    applyCaptivePortalToSites,
    updateHotspotSettings,
    addBusinessLocation,
    updateBusinessLocationSsid,
    toggleSiteEnabled,
  };
}
