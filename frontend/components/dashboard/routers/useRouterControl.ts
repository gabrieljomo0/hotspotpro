"use client";

import { useEffect, useState } from "react";
import type { ControlInfo } from "./routerConnection";

/** Polls /api/routers/control for every router (or one router, with `ip`). */
export function useRouterControl(ip?: string, intervalMs = 8000) {
  const [all, setAll] = useState<Record<string, ControlInfo>>({});
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    let alive = true;
    async function load() {
      try {
        const response = await fetch(`/api/routers/control${ip ? `?ip=${encodeURIComponent(ip)}` : ""}`, { cache: "no-store", credentials: "same-origin" });
        if (!response.ok) return;
        const json = (await response.json()) as { routers?: Record<string, ControlInfo> } & Partial<ControlInfo>;
        if (!alive) return;
        setAll(ip ? { [ip]: json as ControlInfo } : (json.routers ?? {}));
        setLoaded(true);
      } catch {
        /* keep what we have */
      }
    }
    void load();
    const id = window.setInterval(() => { if (!document.hidden) void load(); }, intervalMs);
    return () => { alive = false; window.clearInterval(id); };
  }, [ip, intervalMs]);

  return { control: all, loaded };
}
