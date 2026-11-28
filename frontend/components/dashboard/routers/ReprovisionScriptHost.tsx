"use client";

// Mounted once in the dashboard shell. One Reprovision for every menu:
//  - The router is checking in right now → run the setup on it (RouterTaskHost shows the loader
//    and closes on success). No paste.
//  - It is not → show the WinBox paste script straight away, with the reason.
// Either way the setup is a soft update: people online, vouchers on the router and package
// User Profiles are kept.

import { useEffect, useState } from "react";

import { useDashboard } from "@/components/dashboard/context/DashboardContext";
import { REPROVISION_SCRIPT_EVENT, type ReprovisionOpenMode } from "@/components/dashboard/shared/editEvents";
import { ReprovisionScriptModal } from "./ReprovisionScriptModal";

/** Ask the server whether the router has checked in recently (live, not the saved status). */
async function routerIsCheckingIn(ip: string): Promise<boolean | null> {
  try {
    const response = await fetch(`/api/routers/control?ip=${encodeURIComponent(ip)}`, { cache: "no-store", credentials: "same-origin" });
    if (!response.ok) return null;
    const status = (await response.json()) as { enforced?: boolean };
    return status.enforced === true;
  } catch {
    return null;
  }
}

export function ReprovisionScriptHost() {
  const { routers, startRouterTask } = useDashboard();
  const [ip, setIp] = useState<string | null>(null);
  const [offline, setOffline] = useState(false);

  useEffect(() => {
    let alive = true;
    async function onOpen(event: Event) {
      const detail = (event as CustomEvent<{ ip: string; mode?: ReprovisionOpenMode }>).detail;
      if (detail.mode === "paste") {
        setOffline(false);
        setIp(detail.ip);
        return;
      }
      const live = await routerIsCheckingIn(detail.ip);
      if (!alive) return;
      const saved = routers.find((r) => r.ip === detail.ip);
      // If the live check could not be made, fall back to the saved status.
      const online = live ?? (saved?.status === "Online");
      if (online) {
        setIp(null);
        startRouterTask("full-provision", detail.ip, { live: true });
        return;
      }
      setOffline(true);
      setIp(detail.ip);
    }
    const listener = (event: Event) => void onOpen(event);
    window.addEventListener(REPROVISION_SCRIPT_EVENT, listener);
    return () => {
      alive = false;
      window.removeEventListener(REPROVISION_SCRIPT_EVENT, listener);
    };
  }, [routers, startRouterTask]);

  const router = ip ? routers.find((r) => r.ip === ip) : undefined;
  if (!ip || !router) return null;
  return (
    <ReprovisionScriptModal
      key={`${router.ip}-paste`}
      router={router}
      mode="paste"
      offline={offline}
      onClose={() => setIp(null)}
    />
  );
}
