"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import type { RouterUsage } from "./routerUsageTypes";

/** Polls /api/routers/usage for one router. `act` runs a button action (sample traffic, link a source) and shows the result straight away. */
export function useRouterUsage(routerIp: string, intervalMs = 5000) {
  const [data, setData] = useState<RouterUsage | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const alive = useRef(true);

  const load = useCallback(async () => {
    try {
      const response = await fetch(`/api/routers/usage?ip=${encodeURIComponent(routerIp)}`, { cache: "no-store", credentials: "same-origin" });
      if (response.status === 401) throw new Error("Please sign in again to see usage.");
      if (!response.ok) throw new Error("Could not load usage from the server.");
      const next = (await response.json()) as RouterUsage;
      if (alive.current) { setData(next); setError(null); }
    } catch (e) {
      if (alive.current) setError((e as Error).message || "Could not reach the server.");
    }
  }, [routerIp]);

  useEffect(() => {
    alive.current = true;
    void load();
    const id = window.setInterval(() => { if (!document.hidden) void load(); }, intervalMs);
    return () => { alive.current = false; window.clearInterval(id); };
  }, [load, intervalMs]);

  const act = useCallback(async (body: { action: "simulate" | "clear-test" | "link"; key?: string }) => {
    setBusy(true);
    try {
      const response = await fetch(`/api/routers/usage?ip=${encodeURIComponent(routerIp)}`, {
        method: "POST", credentials: "same-origin", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body),
      });
      const json = (await response.json().catch(() => ({}))) as RouterUsage & { message?: string };
      if (!response.ok) throw new Error(json.message || "That did not work.");
      if (alive.current) { setData(json); setError(null); }
    } catch (e) {
      if (alive.current) setError((e as Error).message);
    } finally {
      if (alive.current) setBusy(false);
    }
  }, [routerIp]);

  return { data, error, busy, act, reload: load };
}
