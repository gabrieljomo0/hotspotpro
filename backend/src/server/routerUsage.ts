// Data usage for ONE router, worked out from the RADIUS accounting the router
// sends (start / every minute / stop for each customer session):
//   - live: who is online on it right now and how fast, from the last two updates
//   - history: data used per hour, which the page turns into today / week / month / charts
//   - top users, usage by package, recent sessions
//
// Which router a record belongs to: the router's own address (or the one it
// reports about itself), else its name — the setup script gives a new router
// its name as its identity, and MikroTik sends that identity with every packet.
// If neither matches, the admin can link the source by hand (nasLinks).

import {
  type NasInfo, type RadiusSession, type UsageBucket,
  addUsage, allSessions, getState, hourKey, linkNas, nasKeyOf, noteNas, removeSimulated, saveSession, usageSnapshot,
} from "./store";
import { findPackageByName, findVoucher, packageBytes } from "./packages";

type RouterRow = { ip: string; name: string; wanAddress?: string | null };

const FRESH_MS = 3 * 60 * 1000; // a session not heard from for 3 minutes (accounting comes every minute) is not "live"
const OPEN_MS = 20 * 60 * 1000; // ...and not heard from for 20 minutes is not "online" at all
const DAY = 86400000;

const clean = (s: string | undefined) => (s ?? "").replace(/[\\"$\r\n]/g, "").trim().toLowerCase();

export function routerRows(): RouterRow[] {
  const rows = getState("routers")?.value;
  return Array.isArray(rows) ? (rows as RouterRow[]).filter((r) => r && typeof r.ip === "string") : [];
}

/** Which router (its ip) a RADIUS source belongs to, or null. */
export function routerForNas(key: string, nas: NasInfo, links: Record<string, string>, routers: RouterRow[]): string | null {
  const linked = links[key];
  if (linked && routers.some((r) => r.ip === linked)) return linked;
  if (nas.simulatedFor) return routers.some((r) => r.ip === nas.simulatedFor) ? nas.simulatedFor : null;
  const byAddress = routers.find((r) => r.ip === nas.source || (nas.ip && r.ip === nas.ip) || (r.wanAddress && (r.wanAddress === nas.source || r.wanAddress === nas.ip)));
  if (byAddress) return byAddress.ip;
  const id = clean(nas.identifier);
  if (id) {
    const byName = routers.find((r) => clean(r.name) === id);
    if (byName) return byName.ip;
  }
  return null;
}

const sessionNasKey = (s: RadiusSession) => nasKeyOf(s.routerIp, s.nasIdentifier);

export type RouterUsage = {
  router: { ip: string; name: string } | null;
  now: number;
  /** Whether any accounting from this router has been linked to it. */
  linked: boolean;
  lastAccountingAt: string | null;
  unlinked: { key: string; source: string; identifier: string | null; lastSeen: string }[];
  canSimulate: boolean;
  simulating: boolean;
  live: {
    online: number;
    downBytesPerSec: number;
    upBytesPerSec: number;
    sessionDown: number;
    sessionUp: number;
    fresh: boolean;
  };
  allTime: { down: number; up: number };
  hours: { h: string; down: number; up: number; starts: number }[];
  avgSessionSeconds: number;
  sessions30d: number;
  online: {
    id: string; username: string; phone: string; package: string; mac: string; ip: string;
    startedAt: string; updatedAt: string; seconds: number; down: number; up: number;
    rateDown: number; rateUp: number; dataLeft: number | null; expiresAtMs: number | null;
  }[];
  topUsers: { username: string; phone: string; package: string; down: number; up: number; sessions: number; lastSeen: string }[];
  byPackage: { name: string; down: number; up: number; sessions: number }[];
  recent: { id: string; username: string; package: string; startedAt: string; seconds: number; down: number; up: number; ended: boolean }[];
};

export function simulationAllowed() {
  return process.env.NODE_ENV !== "production" || process.env.HOTSPOTPRO_ALLOW_SIMULATE === "1";
}

export function routerUsage(routerIp: string): RouterUsage {
  const now = Date.now();
  const routers = routerRows();
  const router = routers.find((r) => r.ip === routerIp) ?? null;
  const { usage, nas, nasLinks } = usageSnapshot();

  const mine = new Set<string>();
  const unlinked: RouterUsage["unlinked"] = [];
  for (const [key, info] of Object.entries(nas)) {
    const owner = routerForNas(key, info, nasLinks, routers);
    if (owner === routerIp) mine.add(key);
    else if (!owner && !info.simulatedFor) unlinked.push({ key, source: info.source, identifier: info.identifier ?? null, lastSeen: info.lastSeen });
  }

  // Hourly history (last 35 days sent; the page works out today / week / month in the viewer's own time zone).
  const merged = new Map<string, UsageBucket>();
  let allDown = 0, allUp = 0;
  for (const key of mine) {
    for (const [h, b] of Object.entries(usage[key] ?? {})) {
      allDown += b.down;
      allUp += b.up;
      const m = merged.get(h) ?? { down: 0, up: 0, starts: 0 };
      m.down += b.down; m.up += b.up; m.starts += b.starts;
      merged.set(h, m);
    }
  }
  const since = hourKey(now - 35 * DAY);
  const hours = [...merged.entries()]
    .filter(([h]) => h >= since)
    .sort(([a], [b]) => (a < b ? -1 : 1))
    .map(([h, b]) => ({ h, ...b }));

  const sessions = allSessions().filter((s) => mine.has(sessionNasKey(s)) || (s.simulated && s.nasIdentifier === routerIp));
  const vouchersOf = (name: string) => findVoucher(name);

  const open = sessions.filter((s) => !s.stoppedAt && now - Date.parse(s.updatedAt) < OPEN_MS);
  const freshOpen = open.filter((s) => now - Date.parse(s.updatedAt) < FRESH_MS);

  const onlineRows: RouterUsage["online"] = open
    .sort((a, b) => b.startedAt.localeCompare(a.startedAt))
    .slice(0, 200)
    .map((s) => {
      const v = vouchersOf(s.username);
      const pkg = v ? findPackageByName(v.packageName) : null;
      const cap = pkg ? packageBytes(pkg) : null;
      const used = sessions.filter((x) => x.username === s.username).reduce((n, x) => n + x.bytesIn + x.bytesOut, 0);
      const fresh = now - Date.parse(s.updatedAt) < FRESH_MS;
      return {
        id: s.id, username: s.username, phone: v?.redeemerPhone ?? "", package: v?.packageName ?? (s.simulated ? "Sample package" : "Unknown"),
        mac: s.callingStation ?? "", ip: s.framedIp ?? "", startedAt: s.startedAt, updatedAt: s.updatedAt, seconds: s.seconds,
        down: s.bytesOut, up: s.bytesIn,
        rateDown: fresh ? s.rateDown ?? 0 : 0, rateUp: fresh ? s.rateUp ?? 0 : 0,
        dataLeft: cap === null ? null : Math.max(0, cap - used),
        expiresAtMs: v?.expiresAtMs ?? null,
      };
    });

  // The last 30 days of sessions: top users, usage by package, average length.
  const recentCut = now - 30 * DAY;
  const last30 = sessions.filter((s) => Date.parse(s.updatedAt) >= recentCut);
  const finished = last30.filter((s) => s.stoppedAt && s.seconds > 0);
  const avgSessionSeconds = finished.length ? Math.round(finished.reduce((n, s) => n + s.seconds, 0) / finished.length) : 0;

  const byUser = new Map<string, { down: number; up: number; sessions: number; lastSeen: string }>();
  const byPackage = new Map<string, { down: number; up: number; sessions: number }>();
  for (const s of last30) {
    const u = byUser.get(s.username) ?? { down: 0, up: 0, sessions: 0, lastSeen: "" };
    u.down += s.bytesOut; u.up += s.bytesIn; u.sessions += 1;
    if (s.updatedAt > u.lastSeen) u.lastSeen = s.updatedAt;
    byUser.set(s.username, u);
    const name = vouchersOf(s.username)?.packageName ?? (s.simulated ? "Sample package" : "Unknown");
    const p = byPackage.get(name) ?? { down: 0, up: 0, sessions: 0 };
    p.down += s.bytesOut; p.up += s.bytesIn; p.sessions += 1;
    byPackage.set(name, p);
  }
  const topUsers = [...byUser.entries()]
    .sort((a, b) => b[1].down + b[1].up - (a[1].down + a[1].up))
    .slice(0, 10)
    .map(([username, u]) => {
      const v = vouchersOf(username);
      return { username, phone: v?.redeemerPhone ?? "", package: v?.packageName ?? "—", ...u };
    });

  const recent = [...sessions]
    .sort((a, b) => b.updatedAt.localeCompare(a.updatedAt))
    .slice(0, 15)
    .map((s) => ({
      id: s.id, username: s.username, package: vouchersOf(s.username)?.packageName ?? (s.simulated ? "Sample package" : "—"),
      startedAt: s.startedAt, seconds: s.seconds, down: s.bytesOut, up: s.bytesIn, ended: !!s.stoppedAt,
    }));

  let lastAccountingAt: string | null = null;
  for (const key of mine) {
    const seen = nas[key]?.lastSeen;
    if (seen && (!lastAccountingAt || seen > lastAccountingAt)) lastAccountingAt = seen;
  }

  const simulating = [...mine].some((k) => nas[k]?.simulatedFor === routerIp);
  return {
    router: router ? { ip: router.ip, name: router.name } : null,
    now,
    linked: mine.size > 0,
    lastAccountingAt,
    unlinked: unlinked.sort((a, b) => b.lastSeen.localeCompare(a.lastSeen)).slice(0, 5),
    canSimulate: simulationAllowed(),
    simulating,
    live: {
      online: open.length,
      downBytesPerSec: freshOpen.reduce((n, s) => n + (s.rateDown ?? 0), 0),
      upBytesPerSec: freshOpen.reduce((n, s) => n + (s.rateUp ?? 0), 0),
      sessionDown: open.reduce((n, s) => n + s.bytesOut, 0),
      sessionUp: open.reduce((n, s) => n + s.bytesIn, 0),
      fresh: freshOpen.length > 0,
    },
    allTime: { down: allDown, up: allUp },
    hours,
    avgSessionSeconds,
    sessions30d: last30.length,
    online: onlineRows,
    topUsers,
    byPackage: [...byPackage.entries()].map(([name, p]) => ({ name, ...p })).sort((a, b) => b.down + b.up - (a.down + a.up)).slice(0, 8),
    recent,
  };
}

export function linkRouterSource(routerIp: string, key: string) {
  linkNas(key, routerIp);
}

// ---- sample traffic, so the page can be tried with no router at all ----------------------------

const SAMPLE_USERS = ["kwame", "ama", "kofi", "akosua", "yaw", "abena", "kojo", "efua", "nana", "esi", "kwesi", "adwoa"];
const rand = (min: number, max: number) => min + Math.random() * (max - min);
// Busier in the evening, quiet at night (hour of day in Ghana time = UTC).
const HOUR_WEIGHT = [0.15, 0.1, 0.08, 0.06, 0.08, 0.15, 0.3, 0.5, 0.6, 0.65, 0.7, 0.75, 0.8, 0.8, 0.85, 0.9, 1, 1.1, 1.25, 1.3, 1.2, 0.95, 0.6, 0.3];

function simKey(routerIp: string) {
  return nasKeyOf("SIM", routerIp);
}

/** Replace any earlier sample data for this router with a fresh two weeks of it, plus a few customers "online now". */
export function startSimulation(routerIp: string) {
  removeSimulated(routerIp);
  const key = simKey(routerIp);
  const now = Date.now();
  noteNas(key, { source: "SIM", identifier: routerIp, simulatedFor: routerIp, lastSeen: new Date(now).toISOString() });

  // 14 days of hourly history
  for (let h = 14 * 24; h >= 1; h -= 1) {
    const at = now - h * 3600000;
    const weight = HOUR_WEIGHT[new Date(at).getUTCHours()];
    const down = rand(150, 420) * 1e6 * weight;
    addUsage(key, at, down, down * rand(0.08, 0.18), Math.round(rand(0, 1.6) * weight));
  }

  // finished sessions over the last week
  for (let i = 0; i < 40; i += 1) {
    const startedMs = now - rand(0.2, 7) * DAY;
    const seconds = Math.round(rand(600, 6 * 3600));
    const down = Math.round(rand(20, 900) * 1e6);
    const stopped = new Date(startedMs + seconds * 1000);
    saveSession({
      id: `SIM|${routerIp}|done-${i}`, username: `${SAMPLE_USERS[i % SAMPLE_USERS.length]}${100 + (i % 7)}`, routerIp: "SIM", nasIdentifier: routerIp,
      startedAt: new Date(startedMs).toISOString(), updatedAt: stopped.toISOString(), stoppedAt: stopped.toISOString(),
      bytesOut: down, bytesIn: Math.round(down * rand(0.08, 0.2)), seconds, simulated: true,
      callingStation: macFor(i), framedIp: `10.10.0.${20 + i}`,
    });
  }

  // customers online right now; their numbers move every time the page asks (see tickSimulation)
  for (let i = 0; i < 6; i += 1) {
    const startedMs = now - rand(2, 90) * 60000;
    const seconds = Math.round((now - startedMs) / 1000);
    const down = Math.round(rand(5, 200) * 1e6);
    const simRate = { down: rand(0.15, 2.2) * 125000, up: rand(0.03, 0.4) * 125000 };
    saveSession({
      id: `SIM|${routerIp}|live-${i}`, username: `${SAMPLE_USERS[(i * 2) % SAMPLE_USERS.length]}${200 + i}`, routerIp: "SIM", nasIdentifier: routerIp,
      startedAt: new Date(startedMs).toISOString(), updatedAt: new Date(now).toISOString(),
      bytesOut: down, bytesIn: Math.round(down * rand(0.08, 0.2)), seconds, simulated: true,
      callingStation: macFor(100 + i), framedIp: `10.10.1.${10 + i}`,
      simRate, rateDown: simRate.down, rateUp: simRate.up, // bytes per second
    });
  }
}

function macFor(n: number) {
  return ["02", "AB", "CD", "EF", (n >> 8 & 255).toString(16).padStart(2, "0"), (n & 255).toString(16).padStart(2, "0")].join(":").toUpperCase();
}

/** Move the sample "online now" customers forward to the present, like an accounting update would. */
export function tickSimulation(routerIp: string) {
  const key = simKey(routerIp);
  if (!usageSnapshot().nas[key]) return; // no sample traffic was started for this router
  const now = Date.now();
  for (const s of allSessions()) {
    if (!s.simulated || s.stoppedAt || !s.simRate || s.nasIdentifier !== routerIp) continue;
    const dt = Math.min(120, Math.max(0, (now - Date.parse(s.updatedAt)) / 1000));
    if (dt < 1) continue;
    const jitter = () => rand(0.5, 1.5);
    const down = s.simRate.down * dt * jitter();
    const up = s.simRate.up * dt * jitter();
    addUsage(key, now, down, up);
    saveSession({
      ...s, updatedAt: new Date(now).toISOString(), seconds: s.seconds + Math.round(dt),
      bytesOut: s.bytesOut + Math.round(down), bytesIn: s.bytesIn + Math.round(up),
      rateDown: down / dt, rateUp: up / dt,
    });
  }
  noteNas(key, { source: "SIM", identifier: routerIp, simulatedFor: routerIp, lastSeen: new Date(now).toISOString() });
}

export function stopSimulation(routerIp: string) {
  removeSimulated(routerIp);
}
