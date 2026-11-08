"use client";

// Everything about routers: the router list itself, per-router config,
// business/site groupings, captive portal configs, and account-wide
// hotspot network settings — plus every action that can be taken on a
// router (provisioning, remote actions, Multi-WAN, deleting, etc).
//
// showToast/logActivity are passed in (from useNotifications, called
// earlier in DashboardProvider) rather than imported directly, since
// this hook doesn't own that state itself.

import { useEffect, useState } from "react";
import { usePersistedState } from "./usePersistedState";
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
      remoteAccessEnabled: false,
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
      adminFromWan: input.adminFromWan ?? false,
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
    setRouterEnabled((current) => ({ ...current, [newRouter.ip]: false }));
    showToast(`Router "${newRouter.name}" added — awaiting provisioning.`);
    logActivity("Router", `Added router "${newRouter.name}", pending provisioning.`);
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
    const router = routers.find((r) => r.ip === ip);
    if (!router) return;

    setRouters((current) =>
      current.map((r) =>
        r.ip === ip
          ? {
              ...r,
              provisioningStatus: "Provisioned",
              status: "Online",
              health: "ok" as const,
              lastConnectedAt: new Date().toLocaleString("en-GB", {
                day: "2-digit", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit",
              }),
              lastError: null,
              winboxAddress: r.winboxAddress || `remote.hotspotpro.com:${41000 + Math.floor(Math.random() * 999)}`,
              remoteAccessEnabled: true,
              routerOSVersion: r.routerOSVersion === "Unknown" ? "7.15.2" : r.routerOSVersion,
              hardwareModel: r.hardwareModel === "Unknown" ? "RB951Ui-2HnD" : r.hardwareModel,
              architecture: r.architecture === "Unknown" ? "mipsbe" : r.architecture,
              cpuCount: r.cpuCount === "Unknown" ? "1" : r.cpuCount,
              uptime30Day: r.uptime30Day ?? 100,
              uptime7Day: r.uptime7Day ?? 100,
              wireguardTunnelIp: r.wireguardTunnelIp ?? `10.77.0.${10 + Math.floor(Math.random() * 200)}`,
              radiusAddress: r.radiusAddress ?? "radius.hotspotpro.com",
              snmpConfigured: true,
              walledGardenConfigured: true,
              servicesHardened: true,
              hotspotFilesSyncedAt: stamp(),
              timeSyncedAt: stamp(),
              provisionedAt: stamp(),
              paused: false,
              uptime: r.uptime === "N/A" ? "0m" : r.uptime,
              lastSeen: "Just now",
              activity: [{ at: stamp(), text: "Fully provisioned (SNMP, RADIUS, services, walled garden, hotspot files, clock)." }, ...(r.activity ?? [])].slice(0, 30),
            }
          : r,
      ),
    );
    setRouterEnabled((current) => ({ ...current, [ip]: true }));
    showToast(`${router.name} fully provisioned — SNMP, RADIUS, services, and walled garden configured.`);
    logActivity("Router", `Fully provisioned ${router.name}.`);
  }

  function regenerateApiCredentials(ip: string) {
    const router = routers.find((r) => r.ip === ip);
    if (!router) return;

    if (!isRouterReachable(ip)) {
      showToast("Failed to regenerate credentials — unable to connect to router or update credentials.");
      return;
    }

    const newPassword = Math.random().toString(36).slice(2, 14);
    patchRouter(ip, { apiPassword: newPassword }, "API credentials regenerated.");
    showToast(`API credentials regenerated for ${router.name}.`);
    logActivity("Router", `Regenerated API credentials for ${router.name}.`);
  }

  function regenerateWinboxAddress(ip: string) {
    const router = routers.find((r) => r.ip === ip);
    if (!router) return;

    if (!isRouterReachable(ip)) {
      showToast("Failed to regenerate WinBox address — unable to connect to router.");
      return;
    }

    const newPort = 41000 + Math.floor(Math.random() * 999);
    patchRouter(ip, { winboxAddress: `remote.hotspotpro.com:${newPort}` }, `WinBox address changed to remote.hotspotpro.com:${newPort}.`);
    showToast(`WinBox address regenerated for ${router.name}.`);
    logActivity("Router", `Regenerated WinBox address for ${router.name}.`);
  }

  function syncHotspotFiles(ip: string) {
    const router = routers.find((r) => r.ip === ip);
    if (!router) return;

    if (!isRouterReachable(ip)) {
      showToast("Failed to sync hotspot files — unable to connect to router or verify hotspot configuration.");
      return;
    }
    patchRouter(ip, { hotspotFilesSyncedAt: stamp() }, "Hotspot files synced.");
    showToast(`Hotspot files synced for ${router.name}.`);
    logActivity("Router", `Synced hotspot files for ${router.name}.`);
  }

  function syncRouterTime(ip: string) {
    const router = routers.find((r) => r.ip === ip);
    if (!router) return;

    if (!isRouterReachable(ip)) {
      showToast("Failed to sync router time — unable to connect to router or update time.");
      return;
    }
    patchRouter(ip, { timeSyncedAt: stamp() }, "Router clock synced.");
    showToast(`Router time synced for ${router.name}.`);
    logActivity("Router", `Synced router time for ${router.name}.`);
  }

  function configureSnmp(ip: string) {
    const router = routers.find((r) => r.ip === ip);
    if (!router) return;

    if (!isRouterReachable(ip)) {
      showToast("Failed to configure SNMP — unable to connect to router or configure SNMP.");
      return;
    }
    patchRouter(ip, { snmpConfigured: true }, "SNMP configured.");
    showToast(`SNMP configured for ${router.name}.`);
    logActivity("Router", `Configured SNMP for ${router.name}.`);
  }

  function configureWalledGarden(ip: string) {
    const router = routers.find((r) => r.ip === ip);
    if (!router) return;

    if (!isRouterReachable(ip)) {
      showToast("Failed to configure walled garden — unable to add all walled garden rules.");
      return;
    }
    patchRouter(ip, { walledGardenConfigured: true }, "Walled garden configured.");
    showToast(`Walled garden configured for ${router.name}.`);
    logActivity("Router", `Configured walled garden for ${router.name}.`);
  }

  function hardenServices(ip: string) {
    const router = routers.find((r) => r.ip === ip);
    if (!router) return;

    if (!isRouterReachable(ip)) {
      showToast("Failed to harden services — unable to connect to router.");
      return;
    }
    patchRouter(ip, { servicesHardened: true }, "Services hardened (Telnet, FTP and SSL off).");
    showToast(`Services hardened for ${router.name} — Telnet, FTP, and SSL disabled; only API remains enabled.`);
    logActivity("Router", `Hardened services for ${router.name}.`);
  }

  function updateRouterScript(ip: string) {
    const router = routers.find((r) => r.ip === ip);
    if (!router) return;

    if (!isRouterReachable(ip)) {
      showToast("Failed to update script — unable to connect to router.");
      return;
    }
    patchRouter(ip, { scriptUpdatedAt: stamp() }, "Provisioning script updated.");
    showToast(`Provisioning script updated for ${router.name}.`);
    logActivity("Router", `Updated provisioning script for ${router.name}.`);
  }

  function downloadRouterFile(ip: string, kind: "provision-script" | "wireguard-config") {
    const router = routers.find((r) => r.ip === ip);
    if (!router) return;

    const content =
      kind === "provision-script"
        ? `# HotspotPro provisioning script for ${router.name}\n/tool fetch mode=https url="https://jnet.hotspotpro.com/provision/${router.ip}"\n`
        : `[Interface]\nPrivateKey = (hidden)\nAddress = ${router.wireguardTunnelIp ?? "10.77.0.2"}/32\n\n[Peer]\nPublicKey = (hidden)\nEndpoint = vpn.hotspotpro.com:51820\nAllowedIPs = 10.77.0.0/24\n`;

    const blob = new Blob([content], { type: "text/plain" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = kind === "provision-script" ? `${router.name}-provision.rsc` : `${router.name}-wireguard.conf`;
    link.click();
    URL.revokeObjectURL(url);

    showToast(`${kind === "provision-script" ? "Provisioning script" : "WireGuard config"} downloaded.`);
    logActivity("Router", `Downloaded ${kind} for ${router.name}.`);
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
    setRouters((current) =>
      current.map((r) => (r.ip === ip ? { ...r, multiWanMode: mode, ispLinks } : r)),
    );
    if (silent) return;
    showToast("Multi-WAN configuration saved.");
    logActivity("Router", `Updated Multi-WAN configuration for router ${ip}.`);
  }

  function updateRouterDetails(ip: string, updates: Partial<RouterInfo>) {
    setRouters((current) =>
      current.map((r) => (r.ip === ip ? { ...r, ...updates } : r)),
    );
    showToast("Router details saved.");
    logActivity("Router", `Updated details for router ${ip}.`);
  }

  function toggleRemoteAccess(ip: string) {
    const router = routers.find((r) => r.ip === ip);
    if (!router) return;

    const next = !router.remoteAccessEnabled;
    setRouters((current) =>
      current.map((r) =>
        r.ip === ip
          ? {
              ...r,
              remoteAccessEnabled: next,
              winboxAddress: next && !r.winboxAddress
                ? `remote.hotspotpro.com:${41000 + Math.floor(Math.random() * 999)}`
                : r.winboxAddress,
            }
          : r,
      ),
    );
    showToast(`Remote access ${next ? "enabled" : "disabled"} for ${router.name}.`);
    logActivity("Router", `${next ? "Enabled" : "Disabled"} remote access for ${router.name}.`);
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
    const router = routers.find((r) => r.ip === ip);
    if (!router) return;

    setRouters((current) =>
      current.map((r) =>
        r.ip === ip
          ? {
              ...r,
              lastSeen: "Just now",
              clients: Math.max(0, r.clients + Math.round((Math.random() - 0.5) * 6)),
            }
          : r,
      ),
    );
    showToast(`${router.name} synced — client and status data refreshed.`);
    logActivity("Router", `Synced router ${router.name}.`);
  }

  function restartRouter(ip: string) {
    const router = routers.find((r) => r.ip === ip);
    if (!router) return;

    showToast(`${router.name} is restarting — it will be back in a few seconds...`);
    logActivity("Router", `Restarted router ${router.name}.`);

    // Visibly go offline while "rebooting", then come back — makes the
    // restart action unmistakably different from Health Check / Sync.
    setRouterEnabled((current) => ({ ...current, [ip]: false }));
    setRouters((current) =>
      current.map((r) =>
        r.ip === ip ? { ...r, uptime: "0m", lastSeen: "Restarting…" } : r,
      ),
    );

    window.setTimeout(() => {
      setRouterEnabled((current) => ({ ...current, [ip]: true }));
      setRouters((current) =>
        current.map((r) =>
          r.ip === ip ? { ...r, uptime: "0m", lastSeen: "Just now" } : r,
        ),
      );
      showToast(`${router.name} is back online.`);
    }, 3000);
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
    }

    showToast(
      updates.ssidStrategy
        ? nextStrategy === "same"
          ? `All routers now use the same SSID: "${nextSsid}".`
          : "Each router can now use its own SSID."
        : "Hotspot settings saved.",
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

  function updateCaptivePortalConfigForSite(siteId: string, updates: Partial<CaptivePortalConfig>) {
    setCaptivePortalConfigs((current) => ({
      ...current,
      [siteId]: { ...(current[siteId] ?? defaultCaptivePortalConfig), ...updates },
    }));
    const site = businessLocations.find((s) => s.id === siteId);
    showToast(`Captive portal settings saved for ${site?.name ?? "this business"}.`);
    logActivity("Settings", `Updated captive portal configuration for "${site?.name ?? siteId}".`);
  }

  function updateCaptivePortalConfig(routerIp: string, updates: Partial<CaptivePortalConfig>) {
    const key = siteKeyForRouter(routerIp);
    setCaptivePortalConfigs((current) => ({
      ...current,
      [key]: { ...(current[key] ?? defaultCaptivePortalConfig), ...updates },
    }));
    const site = businessLocations.find((s) => s.id === key);
    const router = routers.find((r) => r.ip === routerIp);
    const label = site?.name ?? router?.name ?? "this router";
    showToast(`Captive portal settings saved for ${label}.`);
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
  type ActiveRouterTask = {
    kind: RouterTaskKind;
    ip: string;
    name: string;
    status: "confirm" | "running" | "done" | "failed";
    doneCount: number;
    error: string | null;
  };
  const [routerTask, setRouterTask] = useState<ActiveRouterTask | null>(null);

  function startRouterTask(kind: RouterTaskKind, ip: string) {
    const router = routers.find((r) => r.ip === ip);
    if (!router) return;
    const def = ROUTER_TASKS[kind];
    setRouterTask({
      kind,
      ip,
      name: router.name.split(" (")[0],
      status: def.confirm ? "confirm" : "running",
      doneCount: 0,
      error: null,
    });
  }

  function confirmRouterTask() {
    setRouterTask((task) => (task ? { ...task, status: "running", doneCount: 0, error: null } : task));
  }

  function closeRouterTask() {
    setRouterTask(null);
  }

  function applyRouterTask(kind: RouterTaskKind, ip: string) {
    switch (kind) {
      case "full-provision": return fullProvisionRouter(ip);
      case "sync-files": return syncHotspotFiles(ip);
      case "sync-time": return syncRouterTime(ip);
      case "snmp": return configureSnmp(ip);
      case "walled-garden": return configureWalledGarden(ip);
      case "harden": return hardenServices(ip);
      case "winbox": return regenerateWinboxAddress(ip);
      case "api-credentials": return regenerateApiCredentials(ip);
      case "update-script": return updateRouterScript(ip);
      case "reboot":
        setRouterEnabled((current) => ({ ...current, [ip]: true }));
        patchRouter(ip, { uptime: "0m", lastSeen: "Just now", status: "Online" }, "Rebooted — back online.");
        showToast("Router is back online.");
        return;
      case "pause": return router_setPaused(ip, true);
      case "resume": return router_setPaused(ip, false);
      case "disconnect": return router_setOnline(ip, false);
      case "reconnect": return router_setOnline(ip, true);
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

  // Tick the checklist; the real change is made when the last step finishes.
  useEffect(() => {
    if (!routerTask || routerTask.status !== "running") return;
    const def = ROUTER_TASKS[routerTask.kind];
    const timer = window.setTimeout(() => {
      const { kind, ip, doneCount } = routerTask;
      if (doneCount === 0 && def.needsReachable && !isRouterReachable(ip)) {
        setRouterTask({ ...routerTask, status: "failed", error: whyNotReachable(ip) });
        return;
      }
      if (kind === "reboot" && doneCount === 1) {
        // The router really goes offline while it restarts.
        setRouterEnabled((current) => ({ ...current, [ip]: false }));
        patchRouter(ip, { lastSeen: "Restarting…" }, "Rebooting…");
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
