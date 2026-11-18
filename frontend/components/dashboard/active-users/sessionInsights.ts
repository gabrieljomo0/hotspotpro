// Shared logic for the Active Users section: which router a user is on,
// their connection status, and the usage/device figures shown on the
// session page. Kept in one place so the router summary cards, the users
// table and the session details page can never disagree with each other.

import type { ActiveUser, RouterInfo } from "../data/dashboard-data";
import { hashString } from "./advanced-details/helpers";
import { getUserId } from "./userLinks";

export type ConnectionState = { paused: boolean; disconnected: boolean; blocked: boolean };
export type ConnectionStatus = "Online" | "Paused" | "Disconnected" | "Blocked";

export function connectionStatus(state: ConnectionState): ConnectionStatus {
  if (state.blocked) return "Blocked";
  if (state.disconnected) return "Disconnected";
  if (state.paused) return "Paused";
  return "Online";
}

/** Prefer the router IP reported by RADIUS / check-in; hash only as last-resort fallback. */
export function routerForUser(
  userOrId: ActiveUser | string,
  routers: RouterInfo[],
): RouterInfo | null {
  if (routers.length === 0) return null;
  if (typeof userOrId !== "string") {
    const ip = (userOrId.routerIp || "").trim();
    if (ip) {
      const match = routers.find((r) => r.ip === ip);
      if (match) return match;
    }
  }
  const id = typeof userOrId === "string" ? userOrId : getUserId(userOrId);
  return routers[hashString(id) % routers.length] ?? null;
}

export function routerIsUp(router: RouterInfo) {
  return router.status === "Online";
}

export type RouterSessionSummary = {
  router: RouterInfo;
  up: boolean;
  active: number;
};

export function summariseRouters(
  users: ActiveUser[],
  routers: RouterInfo[],
  getState: (userId: string) => ConnectionState,
): { perRouter: RouterSessionSummary[]; totalActive: number; upCount: number; downCount: number } {
  const perRouter = routers.map((router) => {
    const up = routerIsUp(router);
    const active = up
      ? users.filter((user) => {
          const id = getUserId(user);
          return routerForUser(user, routers)?.ip === router.ip && connectionStatus(getState(id)) === "Online";
        }).length
      : 0;
    return { router, up, active };
  });
  const upCount = perRouter.filter((entry) => entry.up).length;
  return {
    perRouter,
    totalActive: perRouter.reduce((sum, entry) => sum + entry.active, 0),
    upCount,
    downCount: perRouter.length - upCount,
  };
}

export function parseDataToMb(value: string): number {
  const match = value.replace(/,/g, "").match(/([\d.]+)\s*(TB|GB|MB|KB|B)?/i);
  if (!match) return 0;
  const amount = parseFloat(match[1]);
  switch ((match[2] ?? "MB").toUpperCase()) {
    case "TB":
      return amount * 1024 * 1024;
    case "GB":
      return amount * 1024;
    case "KB":
      return amount / 1024;
    case "B":
      return amount / (1024 * 1024);
    default:
      return amount;
  }
}

export function formatMb(mb: number): string {
  if (mb >= 1024) return `${(mb / 1024).toFixed(2)} GB`;
  if (mb >= 1) return `${mb.toFixed(2)} MB`;
  return `${Math.round(mb * 1024)} KB`;
}

export function dataUsedPercent(user: ActiveUser): number | null {
  const used = parseDataToMb(user.dataUsed);
  if (!/\d/.test(user.dataLeft)) return null;
  const left = parseDataToMb(user.dataLeft);
  const total = used + left;
  if (total <= 0) return null;
  return Math.min(100, Math.round((used / total) * 100));
}

export function usageSplit(user: ActiveUser) {
  const total = parseDataToMb(user.dataUsed);
  const downShare = 0.85 + (hashString(getUserId(user)) % 9) / 100;
  const down = total * downShare;
  return { totalMb: total, downMb: down, upMb: total - down };
}

const DEVICE_NAMES: Record<string, string[]> = {
  "Android Phone": ["TECNO-SPARK-40-Pro", "Galaxy-A14", "Infinix-Hot-30", "Redmi-Note-12"],
  iPhone: ["iPhone-13", "iPhone-12", "iPhone-14-Pro"],
  "Windows Laptop": ["DESKTOP-4KQ2LM", "LAPTOP-HP-ProBook"],
  MacBook: ["MacBook-Air", "MacBook-Pro-M2"],
  "Smart TV": ["Samsung-Smart-TV", "LG-webOS-TV"],
};

export function sessionDevice(user: ActiveUser) {
  const id = getUserId(user);
  const seed = hashString(id);
  const type = user.deviceType ?? Object.keys(DEVICE_NAMES)[seed % Object.keys(DEVICE_NAMES).length];
  const names = DEVICE_NAMES[type] ?? DEVICE_NAMES["Android Phone"];
  const hex = (n: number) => (n % 256).toString(16).toUpperCase().padStart(2, "0");
  const mac =
    user.macAddress ||
    [seed * 7 + 2, seed * 13 + 59, seed * 3 + 71, seed * 11 + 5, seed * 17 + 9, seed * 19 + 33].map(hex).join(":");
  const routerHost = (user.routerIp || "").replace(/\.\d+$/, "") || "10.10.0";
  return {
    type,
    name: names[seed % names.length],
    mac,
    ip: `${routerHost}.${10 + (seed % 200)}`,
  };
}

export function windowFactor(window: "today" | "7days") {
  return window === "today" ? 1 : 6.4;
}
