"use client";

// Talks to the HotspotPro server (/api/state) so every slice of saved data
// lives on the server instead of only in one browser.
//
//  - On load, ONE request fetches every saved slice (bootstrap()).
//  - Changes are sent to the server a moment after they happen (queueSave()).
//  - A light poll (every few seconds, and when the tab regains focus) pulls in
//    changes made elsewhere — another admin, an agent, or the router calling
//    back after it finished its setup script.
//
// If the server can't be reached or the visitor isn't signed in, everything
// quietly falls back to browser-only storage, exactly as before.

export type ServerDoc = { value: unknown; rev: number; seq: number; updatedAt: string };

const POLL_MS = 5000;
const SAVE_DELAY_MS = 300;

import { checkCacheScope } from "./localCache";

let online = false;
let bootPromise: Promise<void> | null = null;
let docs: Record<string, ServerDoc> = {};
let seq = 0;
let pollTimer: ReturnType<typeof setInterval> | null = null;

const known = new Map<string, string>(); // last JSON the server is known to have, per slice
const pending = new Map<string, unknown>(); // values waiting to be saved
const timers = new Map<string, ReturnType<typeof setTimeout>>();
const listeners = new Map<string, Set<(value: unknown) => void>>();
const readyWaiters = new Set<() => void>();
let ready = false;

export function isOnline() {
  return online;
}

export function isSyncReady() {
  return ready;
}

export function onSyncReady(cb: () => void) {
  if (ready) cb();
  else readyWaiters.add(cb);
  return () => readyWaiters.delete(cb);
}

function markReady() {
  ready = true;
  readyWaiters.forEach((cb) => cb());
  readyWaiters.clear();
}

async function fetchJson(url: string, init?: RequestInit, timeoutMs = 5000) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  try {
    return await fetch(url, { ...init, signal: controller.signal, credentials: "same-origin" });
  } finally {
    clearTimeout(timer);
  }
}

/** Loads every saved slice from the server once; resolves with the slices (or null when offline). */
export function bootstrap(): Promise<Record<string, ServerDoc> | null> {
  if (!bootPromise) {
    bootPromise = (async () => {
      try {
        const response = await fetchJson("/api/state");
        if (response.ok) {
          const data = (await response.json()) as { seq: number; docs: Record<string, ServerDoc>; scope?: string };
          if (checkCacheScope(data.scope)) {
            window.location.reload();
            return new Promise<void>(() => undefined); // wait for the reload
          }
          docs = data.docs;
          seq = data.seq;
          online = true;
          startPolling();
        }
      } catch {
        online = false;
      }
      markReady();
    })();
  }
  return bootPromise.then(() => (online ? docs : null));
}

export function serverDoc(name: string) {
  return docs[name];
}

export function remember(name: string, json: string) {
  known.set(name, json);
}

export function isKnown(name: string, json: string) {
  return known.get(name) === json;
}

export function subscribe(name: string, cb: (value: unknown) => void) {
  let set = listeners.get(name);
  if (!set) listeners.set(name, (set = new Set()));
  set.add(cb);
  return () => set!.delete(cb);
}

async function poll() {
  if (!online || document.visibilityState === "hidden") return;
  try {
    const response = await fetchJson(`/api/state?since=${seq}`);
    if (response.status === 401) {
      online = false;
      stopPolling();
      return;
    }
    if (!response.ok) return;
    const data = (await response.json()) as { seq: number; docs: Record<string, ServerDoc> };
    seq = Math.max(seq, data.seq);
    for (const [name, doc] of Object.entries(data.docs)) {
      docs[name] = doc;
      // Never overwrite something this tab hasn't finished saving yet.
      if (pending.has(name)) continue;
      const json = JSON.stringify(doc.value);
      if (known.get(name) === json) continue;
      known.set(name, json);
      listeners.get(name)?.forEach((cb) => cb(doc.value));
    }
  } catch {
    // Server unreachable for a moment — try again next tick.
  }
}

function startPolling() {
  if (pollTimer || typeof window === "undefined") return;
  pollTimer = setInterval(poll, POLL_MS);
  document.addEventListener("visibilitychange", () => {
    if (document.visibilityState === "visible") void poll();
  });
  window.addEventListener("pagehide", flushSaves);
}

function stopPolling() {
  if (pollTimer) clearInterval(pollTimer);
  pollTimer = null;
}

async function send(name: string, value: unknown, keepalive = false) {
  try {
    const response = await fetchJson(
      `/api/state/${encodeURIComponent(name)}`,
      {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ value }),
        keepalive,
      },
      15000,
    );
    if (response.status === 401) {
      online = false;
      stopPolling();
      return;
    }
    if (!response.ok) return;
    const result = (await response.json()) as { seq: number };
    // The poll hands our own change back; that's fine, it matches `known`.
    void result;
  } catch {
    // Not saved this time; the next change retries, and the browser copy is intact.
    known.delete(name);
  }
}

/** Save `value` for slice `name` shortly (merges rapid changes into one request). */
export function queueSave(name: string, value: unknown) {
  if (!online) return;
  const json = JSON.stringify(value);
  if (known.get(name) === json) return;
  pending.set(name, value);
  const old = timers.get(name);
  if (old) clearTimeout(old);
  timers.set(
    name,
    setTimeout(async () => {
      timers.delete(name);
      const latest = pending.get(name);
      pending.delete(name);
      if (latest === undefined) return;
      known.set(name, JSON.stringify(latest));
      await send(name, latest);
    }, SAVE_DELAY_MS),
  );
}

export function flushSaves() {
  if (!online) return;
  for (const [name, timer] of timers) {
    clearTimeout(timer);
    const value = pending.get(name);
    pending.delete(name);
    timers.delete(name);
    if (value !== undefined) {
      known.set(name, JSON.stringify(value));
      void send(name, value, true);
    }
  }
}

/** Admin: wipe every slice on the server (Reset demo data). */
export async function wipeServerData() {
  try {
    await fetchJson("/api/state", { method: "DELETE" });
  } catch {
    /* offline — local wipe still happens */
  }
}
