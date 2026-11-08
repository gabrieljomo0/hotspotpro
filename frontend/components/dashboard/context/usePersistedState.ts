"use client";

// A drop-in replacement for useState that also:
//   1. saves the value to localStorage whenever it changes, and
//   2. follows changes made in OTHER browser tabs.
//
// That is what lets the admin dashboard, an agent's dashboard and a
// client's dashboard each live in their own tab and still show the same
// live data — an agent generating vouchers in one tab shows up in the
// admin's tab, and an admin changing a permission reaches the agent's tab.
//
// Loading happens in an effect (not in the initial state) on purpose: the
// server and the first client render must both start from the built-in
// data, otherwise React reports a hydration mismatch. DashboardProvider
// exposes `storeReady` so screens can wait for the saved data to land.
//
// When the HotspotPro server is reachable and the visitor is signed in, the
// same value is ALSO saved on the server (see syncClient.ts) and refreshed
// from it every few seconds; the localStorage copy then acts as a cache and
// as the fallback when the server is unavailable.
//
// If the shape of any saved data changes in a way old copies can't cope
// with, bump STORAGE_VERSION — old copies are then simply ignored.

import { useEffect, useState, type Dispatch, type SetStateAction } from "react";
import {
  bootstrap,
  isOnline,
  isSyncReady,
  onSyncReady,
  queueSave,
  remember,
  subscribe,
  wipeServerData,
} from "./syncClient";
import { purgeLocalCache } from "./localCache";

// v2: packages gained pushedToAgentIds, vouchers gained password, batches
// gained loginMethod, and voucher presets + new permissions were added —
// copies saved by earlier builds would be missing those fields.
const STORAGE_VERSION = "v2";
const PREFIX = `hotspotpro:${STORAGE_VERSION}:`;

/** True once the saved data has been loaded from the server (or the server turned out to be unavailable). */
export function useSyncReady() {
  const [ready, setReady] = useState(isSyncReady());
  useEffect(() => {
    void bootstrap();
    return onSyncReady(() => setReady(true));
  }, []);
  return ready;
}

// A NEW business starts with an empty workspace (no sample routers, vouchers, customers or
// agents) instead of the built-in demo data. These are the lists that start empty; the owner's
// own profile and the settings/packages keep their sensible defaults.
const START_EMPTY = new Set([
  "routers", "packages", "vouchers", "activeUsers", "voucherBatches", "activityLog", "alertEvents", "approvalRequests",
  "installDispatches", "agentTickets", "agentEmails", "agentSmsLog", "agentVoucherAlertLog", "agentCollections",
  "businessLocations", "systemUsers", "installers",
]);

function startingValue<T>(name: string, initial: T | (() => T)): T {
  const base = typeof initial === "function" ? (initial as () => T)() : initial;
  if (START_EMPTY.has(name) && Array.isArray(base)) return [] as unknown as T;
  if (name === "agents" && Array.isArray(base)) return (base as Array<{ isDefault?: boolean }>).filter((a) => a?.isDefault) as unknown as T;
  return base;
}

export function usePersistedState<T>(
  name: string,
  initial: T | (() => T),
): [T, Dispatch<SetStateAction<T>>] {
  const key = PREFIX + name;
  const [value, setValue] = useState<T>(initial);
  const [hydrated, setHydrated] = useState(false);

  // 1) Pick up whatever was saved: this browser's copy first (instant), then
  //    the server's copy, which wins when there is one.
  useEffect(() => {
    let cancelled = false;
    let hadLocalCopy = false;
    try {
      const raw = window.localStorage.getItem(key);
      if (raw !== null) {
        hadLocalCopy = true;
        setValue(JSON.parse(raw) as T);
      }
    } catch {
      // Corrupt or unavailable storage — carry on with the built-in data.
    }
    void bootstrap().then((docs) => {
      if (cancelled) return;
      const doc = docs?.[name];
      if (doc) {
        remember(name, JSON.stringify(doc.value));
        setValue(doc.value as T);
      } else if (docs && !hadLocalCopy) {
        // Signed in, but this business has never saved this list: start clean, not with sample data.
        setValue(startingValue(name, initial));
      }
      // No server copy yet -> whatever is on screen (this browser's saved data
      // or the built-in demo data) gets uploaded by step 2 as the first version.
      setHydrated(true);
    });
    return () => {
      cancelled = true;
    };
  }, [key, name]);

  // 2) Save every change — but only once the saved copy has been loaded,
  //    so the built-in data can never overwrite it.
  useEffect(() => {
    if (!hydrated) return;
    try {
      window.localStorage.setItem(key, JSON.stringify(value));
    } catch {
      // Storage full or blocked — the app keeps working, just unsaved.
    }
    queueSave(name, value);
  }, [key, name, value, hydrated]);

  // 3a) Follow changes other people / the router made on the server.
  useEffect(() => {
    return subscribe(name, (incoming) => setValue(incoming as T));
  }, [name]);

  // 3b) Follow changes made in other tabs of this browser (used when the
  //     server isn't available).
  useEffect(() => {
    function onStorage(event: StorageEvent) {
      if (isOnline()) return;
      if (event.storageArea !== window.localStorage || event.key !== key) return;
      if (event.newValue === null) return;
      try {
        setValue(JSON.parse(event.newValue) as T);
      } catch {
        // Ignore a malformed update.
      }
    }
    window.addEventListener("storage", onStorage);
    return () => window.removeEventListener("storage", onStorage);
  }, [key]);

  return [value, setValue];
}

// Wipes everything the app has saved (in this browser and on the server), so
// the next load starts from the built-in demo data again.
export async function clearSavedData() {
  await wipeServerData();
  purgeLocalCache();
}
