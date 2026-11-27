import os from "node:os";
import { duplicateRouterMessage, findHardwareConflict, markDuplicateRouterAttempt } from "./hardwareId";
import { type ProvisionRouter, buildProvisionScript } from "./routeros";
import { radiusCloudEnabled, radiusPorts, radiusPublicHost, radiusSecret } from "./radius";
import { getProvision, getState, setState, touchProvision } from "./store";

export type StoredRouter = ProvisionRouter & { ip: string; provisioningToken?: string };

export function findRouterByToken(token: string): StoredRouter | null {
  const routers = getState("routers")?.value;
  if (!Array.isArray(routers)) return null;
  return (routers as StoredRouter[]).find((r) => r.provisioningToken === token) ?? null;
}

/** The router the setup link belongs to: already added to the app, or still being added (link registered by the "Add router" page). */
export function routerForToken(token: string): ProvisionRouter | null {
  return findRouterByToken(token) ?? ((getProvision(token)?.config as ProvisionRouter | undefined) ?? null);
}

/** The port the WEBSITE (customer portal pages) is served on. The router sends customers there to log in. */
export const WEB_PORT = String(process.env.HOTSPOTPRO_WEB_PORT || 3000);

/**
 * The address customers' phones open for the portal page. Prefer HOTSPOTPRO_PORTAL_URL when the website
 * and API are hosted separately (e.g. Vercel + Render). HOTSPOTPRO_PUBLIC_URL alone is fine when one
 * https address serves everything; locally this is the website port (3000), not the backend's (4000).
 */
/** True when this host is the API only — phones must open the Vercel website for /portal. */
function isApiOnlyHost(hostname: string) {
  return (
    /\.onrender\.com$/i.test(hostname) ||
    /\.fly\.dev$/i.test(hostname) ||
    /^hotspotpro-api(\.|$)/i.test(hostname)
  );
}

export function portalOrigin(origin: string) {
  const dedicated = (process.env.HOTSPOTPRO_PORTAL_URL || process.env.HOTSPOTPRO_SITE_URL || "").replace(/\/+$/, "");
  if (dedicated) {
    try {
      // Never send customers to the API host even if PORTAL_URL was mis-set to fly/render.
      if (isApiOnlyHost(new URL(dedicated).hostname)) return "https://hotspotpro-mu.vercel.app";
    } catch {
      /* use dedicated */
    }
    return dedicated;
  }
  const configured = (process.env.HOTSPOTPRO_PUBLIC_URL || "").replace(/\/+$/, "");
  if (configured) {
    try {
      // API-only hosts must not be used as the customer portal — phones need the website UI.
      if (isApiOnlyHost(new URL(configured).hostname)) {
        return "https://hotspotpro-mu.vercel.app";
      }
    } catch {
      /* keep configured */
    }
    return configured;
  }
  try {
    const url = new URL(origin);
    if (isApiOnlyHost(url.hostname)) return "https://hotspotpro-mu.vercel.app";
    url.port = WEB_PORT;
    return url.origin;
  } catch {
    return origin;
  }
}

/** The port this backend listens on (routers are told to call it directly). */
export const BACKEND_PORT = String(process.env.PORT || process.env.HOTSPOTPRO_BACKEND_PORT || 4000);

const isLoopback = (host: string) => /^(localhost|127\.|\[::1\]|0\.0\.0\.0)/.test(host);

/**
 * The address a ROUTER can use to reach this backend.
 * HOTSPOTPRO_PUBLIC_URL if set; otherwise the address the request came in on; and when that is only
 * "localhost" (the web page talks to the backend through its own proxy), this computer's network address.
 */
export function publicOrigin(request: Request) {
  const configured = process.env.HOTSPOTPRO_PUBLIC_URL;
  if (configured) return configured.replace(/\/+$/, "");
  const url = new URL(request.url);
  const proto = request.headers.get("x-forwarded-proto") ?? url.protocol.replace(":", "");
  const host = request.headers.get("x-forwarded-host") ?? request.headers.get("host") ?? url.host;
  if (isLoopback(host)) {
    const lan = lanOrigins(BACKEND_PORT, proto)[0];
    if (lan) return lan.origin;
  }
  return `${proto}://${host}`;
}

function apiPasswordFor(token: string): string {
  const row = findRouterByToken(token);
  if (row && typeof (row as { apiPassword?: string }).apiPassword === "string" && /^[A-Za-z0-9]{12,32}$/.test((row as { apiPassword: string }).apiPassword)) {
    return (row as { apiPassword: string }).apiPassword;
  }
  const item = getProvision(token);
  const saved = item?.config && typeof item.config.apiPassword === "string" ? item.config.apiPassword : "";
  if (/^[A-Za-z0-9]{12,32}$/.test(saved)) return saved;
  const alphabet = "ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz23456789";
  let password = "";
  for (let i = 0; i < 16; i++) password += alphabet[Math.floor(Math.random() * alphabet.length)];
  if (item) {
    item.config.apiPassword = password;
    item.config.apiUsername = "hotspotpro";
    item.config.port = 8728;
    touchProvision(token, "fetchedAt");
  }
  return password;
}

function isPlaceholderSsid(value: string | undefined) {
  const n = (value || "")
    .trim()
    .toLowerCase()
    .replace(/[-_]+/g, " ")
    .replace(/\s+/g, " ");
  return !n || n === "hotspotpro" || n === "hotspotpro wifi" || n === "hotspotprowifi";
}

function wifiFromStore(
  router: ProvisionRouter & { ip?: string; siteId?: string | null; name?: string; wifiSsid?: string },
  options: { wireless?: boolean; ssid?: string },
) {
  if (options.wireless === false) return { wireless: false as const, ssid: undefined };
  if (router.hasWireless === false && options.wireless !== true) return { wireless: false as const, ssid: undefined };
  const configs = getState("captivePortalConfigs")?.value as Record<string, { ssid?: string }> | undefined;
  const key = router.siteId || router.ip || "";
  const saved = (key && configs?.[key]?.ssid ? configs[key].ssid : "").trim().slice(0, 32);
  const asked = (options.ssid || "").trim().slice(0, 32);
  const onRouter = (router.wifiSsid || "").trim().slice(0, 32);
  const fallback = (router.name || "HotspotPro").replace(/[^\w\s-]/g, "").trim().slice(0, 32) || "HotspotPro";
  // Prefer the SSID typed at setup / on the router — never stick on stock "HotspotPro WiFi".
  const ssid =
    (asked && !isPlaceholderSsid(asked) ? asked : "") ||
    (onRouter && !isPlaceholderSsid(onRouter) ? onRouter : "") ||
    (saved && !isPlaceholderSsid(saved) ? saved : "") ||
    fallback;
  // Reprovision / wireless=yes must always configure WiFi onto the hotspot bridge (captive portal).
  if (options.wireless === true || !!saved || !!onRouter || router.hasWireless === true || router.routerType !== "Existing Router") {
    return { wireless: true as const, ssid };
  }
  return { wireless: false as const, ssid: undefined };
}

/** The setup script for a registered link, built for a given address (the address the ROUTER will use to reach this server). */
export function scriptFor(token: string, options: { origin: string; wireless?: boolean; ssid?: string }): string | null {
  const router = routerForToken(token);
  if (!router) return null;
  const wifi = wifiFromStore(router as ProvisionRouter & { ip?: string; siteId?: string | null }, options);
  return buildProvisionScript({
    router,
    origin: options.origin,
    portalOrigin: portalOrigin(options.origin),
    token,
    apiPassword: apiPasswordFor(token),
    wireless: wifi.wireless,
    ssid: wifi.ssid,
    existing: router.routerType === "Existing Router",
    radius:
      router.loginMode === "cloud" && radiusCloudEnabled()
        ? {
            host: radiusPublicHost(new URL(options.origin).hostname),
            secret: radiusSecret(),
            ...radiusPorts(),
          }
        : undefined,
  });
}

/** This computer's addresses on its networks, e.g. http://192.168.1.50:3000 — what a router on the same network can use. */
export function lanOrigins(port: string, protocol = "http") {
  const out: { address: string; origin: string; interface: string }[] = [];
  for (const [name, list] of Object.entries(os.networkInterfaces())) {
    for (const item of list ?? []) {
      if (item.family === "IPv4" && !item.internal) out.push({ address: item.address, origin: `${protocol}://${item.address}${port ? `:${port}` : ""}`, interface: name });
    }
  }
  // Best first: the factory-default router network (192.168.88.x), then other private networks; virtual adapters
  // (VMware, VirtualBox, WSL, Docker...) last, because a router can never be on those.
  const score = (item: { address: string; interface: string }) =>
    (/vmware|virtualbox|vethernet|wsl|docker|hyper-v|vbox|vmnet|loopback|tailscale|zerotier/i.test(item.interface) ? 100 : 0) +
    (item.address.startsWith("192.168.88.") ? 0 : item.address.startsWith("192.168.") || item.address.startsWith("10.") || /^172\.(1[6-9]|2\d|3[01])\./.test(item.address) ? 10 : 50);
  return out.sort((a, b) => score(a) - score(b));
}

/** The router ran its script (or a test pretended it did): mark it set up in the saved data. */
export function completeProvision(
  token: string,
  details: {
    failed: number;
    sourceIp: string | null;
    simulated?: boolean;
    deviceMode?: "blocked" | null;
    wan?: boolean;
    net?: boolean;
    serial?: string | null;
    softwareId?: string | null;
  },
): true | false | "duplicate" {
  const pending = getProvision(token);
  const routers = getState("routers")?.value;
  const now = new Date().toLocaleString("en-GB", {
    day: "2-digit", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit", second: "2-digit",
  });
  const { failed, sourceIp, simulated, deviceMode, wan: wanDown, net: netDown, serial, softwareId } = details;
  const wanAddress = sourceIp && !/^(127\.|0\.0\.0\.0|::1$)/.test(sourceIp) ? sourceIp : null;

  // Same board already linked to another dashboard router — refuse until that row is deleted.
  const conflict = findHardwareConflict(token, { serial, softwareId });
  if (conflict) {
    markDuplicateRouterAttempt(token, conflict);
    // If the wizard already created a pending row, keep the error on it; never create a second Online router.
    if (Array.isArray(routers) && (routers as { provisioningToken?: string }[]).some((r) => r.provisioningToken === token)) {
      touchProvision(token, "fetchedAt");
      touchProvision(token, "doneAt");
      return "duplicate";
    }
    if (pending) {
      // Create a visible failed row so the owner sees the message, then mark it duplicate.
      const config = (pending.config ?? {}) as Record<string, unknown>;
      const text = (value: unknown, fallback = "") => (typeof value === "string" && value.trim() ? value.trim() : fallback);
      const created = {
        name: text(config.name, "Router"),
        ip: `linked-${token.slice(0, 12)}`,
        status: "Offline",
        uptime: "0m",
        clients: 0,
        cpu: 0,
        memory: 0,
        lastSeen: "Just now",
        provisioningStatus: "Pending" as const,
        health: "error" as const,
        connectionMode: "On the router",
        remoteAccessEnabled: false,
        winboxAddress: "192.168.88.1",
        apiUsername: "hotspotpro",
        apiPassword: typeof config.apiPassword === "string" ? config.apiPassword : "",
        port: 8728,
        lastConnectedAt: now,
        lastError: duplicateRouterMessage(conflict),
        deviceMode: null,
        provisionedAt: null,
        hotspotEnabled: config.hotspotEnabled !== false,
        loginMode: config.loginMode === "cloud" && radiusCloudEnabled() ? "cloud" : "local",
        hotspotNetwork: text(config.hotspotNetwork, "10.10.0.0/16"),
        hotspotGatewayIp: text(config.hotspotGatewayIp, "10.10.0.1"),
        hotspotDnsServers: text(config.hotspotDnsServers, "8.8.8.8,8.8.4.4"),
        pppoeEnabled: config.pppoeEnabled === true,
        pppoeNetwork: text(config.pppoeNetwork, "192.168.91.0/24"),
        routerType: text(config.routerType, "New Router"),
        dnsName: text(config.dnsName),
        wanInterface: text(config.wanInterface, "ether1"),
        managementPort: text(config.managementPort),
        adminFromWan: config.adminFromWan !== false,
        hasWireless: config.hasWireless === true,
        provisioningToken: token,
        activity: [{ at: now, text: duplicateRouterMessage(conflict) }],
      };
      const current = Array.isArray(routers) ? (routers as Record<string, unknown>[]) : [];
      setState("routers", [created, ...current], "router");
      touchProvision(token, "fetchedAt");
      touchProvision(token, "doneAt");
      return "duplicate";
    }
    return "duplicate";
  }

  let found = false;
  if (Array.isArray(routers)) {
    const next = (routers as Record<string, unknown>[]).map((r) => {
      if (r.provisioningToken !== token) return r;
      found = true;
      const activity = Array.isArray(r.activity) ? (r.activity as unknown[]) : [];
      return {
        ...r,
        provisioningStatus: "Provisioned",
        status: "Online",
        lastSeen: "Just now",
        ...(wanAddress ? { wanAddress } : {}),
        ...(serial ? { hardwareSerial: serial } : {}),
        ...(softwareId ? { softwareId } : {}),
        ...(typeof pending?.config?.apiPassword === "string" && /^[A-Za-z0-9]{12,32}$/.test(pending.config.apiPassword)
          ? { apiUsername: "hotspotpro", apiPassword: pending.config.apiPassword, port: 8728 }
          : {}),
        lastConnectedAt: now,
        provisionedAt: now,
        lastError: deviceMode === "blocked"
          ? "The router's device-mode is home, or downloads are switched off. HotspotPro asked it to switch to advanced. Press the reset button briefly (or switch the power off and on) within 5 minutes, then paste the HotspotPro command again."
          : wanDown
            ? "The router is set up, but its ISP port has no address from your ISP yet. Check the internet cable and modem on that port (ether1 unless you chose another), then wait a minute."
            : netDown
              ? "The router is set up, but it cannot reach the internet (ping failed). Customers will not get online until the internet works on the ISP port."
              : failed ? `${failed} setup step${failed === 1 ? "" : "s"} failed on the router — see the router's log (System → Log) for "HotspotPro step failed".` : null,
        deviceMode: deviceMode ?? null,
        health: failed || deviceMode || wanDown || netDown ? "error" : "ok",
        activity: [
          { at: now, text: `${simulated ? "TEST: pretended the router" : "Router"} ran its setup script${sourceIp ? ` (from ${sourceIp})` : ""}${failed ? ` — ${failed} step(s) failed` : " — all steps succeeded"}${deviceMode === "blocked" ? ". Device-mode needs confirming on the router" : ""}.` },
          ...activity,
        ].slice(0, 30),
      };
    });
    if (found) setState("routers", next, "router");
  }
  if (!found && pending) {
    const config = (pending.config ?? {}) as Record<string, unknown>;
    const text = (value: unknown, fallback = "") => (typeof value === "string" && value.trim() ? value.trim() : fallback);
    // Default on-router when this host cannot receive RADIUS UDP.
    const onRouter = config.loginMode !== "cloud" || !radiusCloudEnabled();
    const ip = `linked-${token.slice(0, 12)}`;
    const created = {
      name: text(config.name, "Router"),
      ip,
      status: "Online",
      uptime: "0m",
      clients: 0,
      cpu: 0,
      memory: 0,
      lastSeen: "Just now",
      provisioningStatus: "Provisioned",
      health: deviceMode || wanDown || netDown || failed ? "error" : "ok",
      connectionMode: "On the router",
      remoteAccessEnabled: true,
      winboxAddress: "192.168.88.1",
      apiUsername: "hotspotpro",
      apiPassword: typeof config.apiPassword === "string" ? config.apiPassword : "",
      port: 8728,
      lastConnectedAt: now,
      lastError: deviceMode === "blocked"
        ? "The router's device-mode is home, or downloads are switched off. HotspotPro asked it to switch to advanced. Press the reset button briefly (or switch the power off and on) within 5 minutes, then paste the device-mode command again."
        : wanDown
          ? "The router is set up, but its ISP port has no address from your ISP yet. Check the internet cable and modem on that port (ether1 unless you chose another), then wait a minute."
          : netDown
            ? "The router is set up, but it cannot reach the internet (ping failed). Customers will not get online until the internet works on the ISP port."
            : failed ? `${failed} setup step${failed === 1 ? "" : "s"} failed on the router — see the router's log (System → Log) for "HotspotPro step failed".` : null,
      deviceMode: deviceMode ?? null,
      provisionedAt: now,
      ...(wanAddress ? { wanAddress } : {}),
      ...(serial ? { hardwareSerial: serial } : {}),
      ...(softwareId ? { softwareId } : {}),
      hotspotEnabled: config.hotspotEnabled !== false,
      loginMode: onRouter ? "local" : "cloud",
      hotspotNetwork: text(config.hotspotNetwork, "10.10.0.0/16"),
      hotspotGatewayIp: text(config.hotspotGatewayIp, "10.10.0.1"),
      hotspotDnsServers: text(config.hotspotDnsServers, "8.8.8.8,8.8.4.4"),
      pppoeEnabled: config.pppoeEnabled === true,
      pppoeNetwork: text(config.pppoeNetwork, "192.168.91.0/24"),
      routerType: text(config.routerType, "New Router"),
      dnsName: text(config.dnsName),
      wanInterface: text(config.wanInterface, "ether1"),
      managementPort: text(config.managementPort),
      ...(typeof config.lastPortFree === "boolean" ? { lastPortFree: config.lastPortFree } : {}),
      adminFromWan: config.adminFromWan !== false,
      hasWireless: config.hasWireless === true,
      ...(typeof config.wifiSsid === "string" && config.wifiSsid.trim()
        ? { wifiSsid: String(config.wifiSsid).trim().slice(0, 32) }
        : {}),
      provisioningToken: token,
      activity: [{ at: now, text: `Router ran its setup script${sourceIp ? ` (from ${sourceIp})` : ""} and connected.` }],
    };
    const current = Array.isArray(routers) ? (routers as Record<string, unknown>[]) : [];
    setState("routers", [created, ...current], "router");
    found = true;
  }
  if (!found && !pending) return false;
  touchProvision(token, "fetchedAt");
  touchProvision(token, "doneAt");
  return true;
}
