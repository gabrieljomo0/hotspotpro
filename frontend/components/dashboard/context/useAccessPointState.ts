import { useState } from "react";

import type { AccessPointDevice, AccessPointStatus } from "../shared/types";

const initialAccessPoints: AccessPointDevice[] = [];

export function useAccessPointState(
  showToast: (message: string) => void,
  logActivity: (category: "Router" | "Settings", message: string) => void,
) {
  const [accessPoints, setAccessPoints] = useState<AccessPointDevice[]>(initialAccessPoints);

  function findAccessPoint(id: string) {
    return accessPoints.find((ap) => ap.id === id);
  }

  function addAccessPoint(input: {
    name: string;
    macAddress: string;
    ipAddress: string;
    model: string;
    siteId: string | null;
    routerIp: string | null;
  }) {
    const newAccessPoint: AccessPointDevice = {
      id: `ap-${Date.now()}`,
      name: input.name,
      macAddress: input.macAddress,
      ipAddress: input.ipAddress,
      model: input.model,
      siteId: input.siteId,
      routerIp: input.routerIp,
      status: "Offline",
      clients: 0,
      createdAt: new Date().toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric" }),
    };
    setAccessPoints((current) => [newAccessPoint, ...current]);
    showToast(`"${input.name}" added.${input.routerIp ? "" : " Not linked to a router — connected standalone."}`);
    logActivity("Router", `Added access point "${input.name}".`);
    return newAccessPoint;
  }

  function updateAccessPoint(
    id: string,
    updates: Partial<Pick<AccessPointDevice, "name" | "macAddress" | "ipAddress" | "model" | "siteId" | "routerIp">>,
  ) {
    setAccessPoints((current) => current.map((ap) => (ap.id === id ? { ...ap, ...updates } : ap)));
    const ap = accessPoints.find((a) => a.id === id);
    showToast(`"${ap?.name ?? "Access point"}" updated.`);
    logActivity("Router", `Updated access point "${ap?.name ?? id}".`);
  }

  function deleteAccessPoint(id: string) {
    const ap = accessPoints.find((a) => a.id === id);
    setAccessPoints((current) => current.filter((a) => a.id !== id));
    showToast(`"${ap?.name ?? "Access point"}" removed.`);
    logActivity("Router", `Removed access point "${ap?.name ?? id}".`);
  }

  function setAccessPointStatus(id: string, status: AccessPointStatus) {
    setAccessPoints((current) => current.map((ap) => (ap.id === id ? { ...ap, status } : ap)));
  }

  return {
    accessPoints,
    findAccessPoint,
    addAccessPoint,
    updateAccessPoint,
    deleteAccessPoint,
    setAccessPointStatus,
  };
}
