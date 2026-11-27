// The HotspotPro database.
//
// MANY BUSINESSES, ONE SERVER. Every business that signs up gets its own TENANT: a completely
// separate partition holding its routers, vouchers, packages, payments, sessions and settings.
// All the functions below work on "the current tenant", which is set per request (see
// tenancy.ts / the HTTP adapter) with AsyncLocalStorage. Code that runs outside a tenant and
// touches tenant data throws instead of guessing, so one business can never see another's data.
// Platform-level things (accounts, the tenant list, the activity log, webhook events and the
// shared RADIUS secret) live at the top of the file.
//
// Storage: a single JSON file (data/db.json) kept in memory and written back to disk
// atomically (write to a temp file, then rename), so a crash can never leave
// a half-written file. When Supabase is configured, the same document is also
// saved there, so a host with a temporary disk (Render) does not lose it.
//
// It is built for ONE server process (which is how `npm run dev` / `npm
// start` run). When you outgrow that, replace the functions in this file
// with Postgres calls — nothing else in the app talks to the file directly.

import crypto from "node:crypto";
import fs from "node:fs";
import { AsyncLocalStorage } from "node:async_hooks";
import { pushDatabase } from "./supabaseRemote";
import path from "node:path";

export type StateDoc = { value: unknown; rev: number; seq: number; updatedAt: string; updatedBy: string };
export type AccountRecord = {
  id: string;
  email: string;
  passwordHash: string;
  /** "superadmin" runs the whole platform; "admin" owns one business (tenant). */
  role: "admin" | "superadmin";
  /** The business (tenant) this account belongs to. */
  tenantId: string;
  createdAt: string;
  lastLoginAt?: string;
  /** Owner's name and business, given when they registered. */
  name?: string;
  businessName?: string;
};
export type TenantRecord = {
  id: string;
  /** Short public code (used in links); never reveals anything else. */
  tag: string;
  name: string;
  ownerAccountId: string | null;
  createdAt: string;
  status: "active" | "suspended";
  suspendedAt?: string;
  suspendedReason?: string;
  /** Private notes written by the super admin. */
  notes?: string;
  /**
   * When online access stays paid until (ms). Unset means the business is still in its
   * free trial, counted from createdAt. The router locks the captive portal after this,
   * plus a short grace period.
   */
  accessUntilMs?: number;
};
export type AuditEntry = {
  id: string;
  at: string;
  type: string;
  text: string;
  tenantId?: string | null;
  actor?: string | null;
  ip?: string | null;
};
export type WebhookEvent = {
  id: string;
  source: "hubtel" | "whatsapp" | "other";
  /** The business the callback belonged to (when it could be worked out). */
  tenantId?: string | null;
  receivedAt: string;
  verified: boolean;
  headers: Record<string, string>;
  body: unknown;
};

export type PendingProvision = {
  config: Record<string, unknown>;
  createdAt: string;
  fetchedAt?: string;
  doneAt?: string;
};

export type PaymentRecord = {
  id: string; // our reference, also sent to the gateway as ClientReference
  gateway: string; // "hubtel" | "sandbox"
  status: "pending" | "paid" | "failed" | "expired";
  amount: number;
  currency: string;
  phone: string;
  network: string;
  packageId: string;
  packageName: string;
  routerIp: string | null;
  buyerType: "self" | "other" | "device";
  recipientPhone: string | null;
  deviceMac: string | null;
  providerTxId?: string;
  failureReason?: string;
  voucherCode?: string;
  voucherPassword?: string | null;
  commissionRate?: number;
  commission?: number;
  createdAt: string;
  paidAt?: string;
  log: { at: string; text: string }[];
};

export type SmsRecord = {
  id: string;
  to: string;
  text: string;
  gateway: string;
  status: "sent" | "failed" | "skipped";
  detail: string;
  createdAt: string;
};

export type RadiusSession = {
  id: string; // Acct-Session-Id
  username: string;
  routerIp: string;
  startedAt: string;
  updatedAt: string;
  stoppedAt?: string;
  bytesIn: number;
  bytesOut: number;
  seconds: number;
  callingStation?: string;
  framedIp?: string;
  /** Which router sent it: its name (RADIUS NAS-Identifier) and its own address (NAS-IP-Address). */
  nasIdentifier?: string;
  nasIp?: string;
  /** Latest speed seen for this session, in bytes per second (worked out from the last two accounting updates). */
  rateDown?: number;
  rateUp?: number;
  /** Sample data made by the "test with sample traffic" button; never real. */
  simulated?: boolean;
  simRate?: { down: number; up: number };
};

/** Data used in one hour (UTC) by the sessions of one router. down = to the customer, up = from the customer. */
export type UsageBucket = { down: number; up: number; starts: number };
/** A router as the RADIUS server sees it: where its packets came from and what it calls itself. */
export type NasInfo = { source: string; identifier?: string; ip?: string; simulatedFor?: string; lastSeen: string };

type TenantDb = {
  payments: Record<string, PaymentRecord>;
  smsLog: SmsRecord[];
  radiusSessions: Record<string, RadiusSession>;
  /** nasKey -> UTC hour ("2026-10-13T21") -> data used that hour */
  usage: Record<string, Record<string, UsageBucket>>;
  nas: Record<string, NasInfo>;
  /** nasKey -> router ip, set by hand when a router's packets can't be matched automatically */
  nasLinks: Record<string, string>;
  /** setup token -> when that router last asked for its internet on/off instruction */
  beats: Record<string, string>;
  /** setup token -> the last time the router went quiet for more than 2 minutes and then came back */
  outages: Record<string, { from: string; to: string }>;
  provisioning: Record<string, PendingProvision>;
  /** setup token -> RouterOS commands the owner queued from the site (newest first) */
  jobs?: Record<string, RouterJob[]>;
  seq: number;
  state: Record<string, StateDoc>;
};

type Root = {
  version: 2;
  /** Platform settings the super admin controls. */
  platform: { signupOpen: boolean };
  secrets: Record<string, string>;
  accounts: AccountRecord[];
  tenants: Record<string, TenantRecord>;
  data: Record<string, TenantDb>;
  events: WebhookEvent[];
  audit: AuditEntry[];
};

export const DATA_DIR = path.resolve(process.env.HOTSPOTPRO_DATA_DIR || path.join(process.cwd(), "data"));
const DB_FILE = path.join(DATA_DIR, "db.json");
const MAX_EVENTS = 1000;

type Holder = { db: Root; timer: ReturnType<typeof setTimeout> | null; hooked: boolean };
const g = globalThis as unknown as { __hotspotproDb?: Holder; __hotspotproTenant?: AsyncLocalStorage<string> };
const tenantStore = (g.__hotspotproTenant ??= new AsyncLocalStorage<string>());

function emptyTenantDb(): TenantDb {
  return { payments: {}, smsLog: [], radiusSessions: {}, usage: {}, nas: {}, nasLinks: {}, beats: {}, outages: {}, provisioning: {}, seq: 0, state: {} };
}
function emptyRoot(): Root {
  return { version: 2, platform: { signupOpen: true }, secrets: {}, accounts: [], tenants: {}, data: {}, events: [], audit: [] };
}

const newId = (prefix: string) => `${prefix}${crypto.randomBytes(5).toString("hex")}`;

/** Read an older single-business file (version 1) and turn it into the multi-business layout. */
function migrate(raw: Record<string, unknown>): Root {
  if (raw.version === 2) {
    const root = { ...emptyRoot(), ...(raw as Partial<Root>) } as Root;
    root.platform = { ...(root.platform ?? {}), signupOpen: root.platform?.signupOpen ?? true };
    return root;
  }
  const root = emptyRoot();
  const old = raw as Partial<TenantDb> & { secrets?: Record<string, string>; accounts?: Omit<AccountRecord, "tenantId">[]; events?: WebhookEvent[] };
  const tenantId = "t-main";
  const accounts = old.accounts ?? [];
  root.secrets = old.secrets ?? {};
  root.events = old.events ?? [];
  root.data[tenantId] = { ...emptyTenantDb(), ...old, provisioning: old.provisioning ?? {}, state: old.state ?? {} };
  delete (root.data[tenantId] as Partial<TenantDb> & { accounts?: unknown; events?: unknown; secrets?: unknown; version?: unknown }).accounts;
  delete (root.data[tenantId] as Partial<TenantDb> & { events?: unknown }).events;
  delete (root.data[tenantId] as Partial<TenantDb> & { secrets?: unknown }).secrets;
  delete (root.data[tenantId] as Partial<TenantDb> & { version?: unknown }).version;
  root.accounts = accounts.map((a, i) => ({ ...a, tenantId, role: i === 0 ? ("superadmin" as const) : ("admin" as const) }));
  if (accounts.length > 0 || Object.keys(old.state ?? {}).length > 0) {
    root.tenants[tenantId] = {
      id: tenantId,
      tag: "main",
      name: (accounts[0] as { businessName?: string } | undefined)?.businessName || "Main business",
      ownerAccountId: root.accounts[0]?.id ?? null,
      createdAt: root.accounts[0]?.createdAt ?? new Date().toISOString(),
      status: "active",
    };
  } else {
    delete root.data[tenantId];
  }
  return root;
}

function holder(): Holder {
  if (g.__hotspotproDb) return g.__hotspotproDb;
  fs.mkdirSync(DATA_DIR, { recursive: true });
  let db = emptyRoot();
  try {
    const raw = fs.readFileSync(DB_FILE, "utf8");
    db = migrate(JSON.parse(raw) as Record<string, unknown>);
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code !== "ENOENT") {
      // Unreadable file: keep it for inspection instead of overwriting it.
      try {
        fs.copyFileSync(DB_FILE, `${DB_FILE}.corrupt-${Date.now()}`);
      } catch {
        /* nothing to keep */
      }
    }
  }
  unlockExpiredTrials(db);
  const h: Holder = { db, timer: null, hooked: false };
  g.__hotspotproDb = h;
  if (!h.hooked) {
    h.hooked = true;
    process.on("exit", () => flushNow());
  }
  return h;
}

/**
 * Trial is 14 days + 3 grace. Businesses past that get access:locked on every
 * check-in — packages, vouchers, and the captive portal all stop. Grant 12 months
 * once so the portal can open again (subscription UI can renew later).
 */
function unlockExpiredTrials(db: Root) {
  const now = Date.now();
  const DAY = 24 * 60 * 60 * 1000;
  const TRIAL_DAYS = 14;
  const GRACE_DAYS = 3;
  let changed = false;
  for (const t of Object.values(db.tenants || {})) {
    if (!t || t.status === "suspended") continue;
    if (typeof t.accessUntilMs === "number" && t.accessUntilMs > now) continue;
    const created = Date.parse(t.createdAt) || now;
    const until = typeof t.accessUntilMs === "number" ? t.accessUntilMs : created + TRIAL_DAYS * DAY;
    const graceEnds = until + GRACE_DAYS * DAY;
    if (now <= graceEnds) continue;
    t.accessUntilMs = now + 365 * DAY;
    changed = true;
  }
  if (changed) {
    try {
      fs.mkdirSync(DATA_DIR, { recursive: true });
      fs.writeFileSync(DB_FILE, JSON.stringify(db));
    } catch {
      /* boot continues; in-memory unlock still applies until next flush */
    }
  }
}

// ---- tenants (businesses) -----------------------------------------------------------

/** Run something as one business. Everything inside (including awaits) sees only that business's data. */
export function withTenant<T>(tenantId: string, fn: () => T): T {
  return tenantStore.run(tenantId, fn);
}
export function currentTenantId(): string | null {
  return tenantStore.getStore() ?? null;
}
/** The current business's data. Throws when no business is selected (a bug, never silently shared). */
function T(): TenantDb {
  const id = tenantStore.getStore();
  if (!id) throw new Error("No business is selected for this request.");
  const { db } = holder();
  if (!db.tenants[id]) throw new Error(`Unknown business ${id}.`);
  return (db.data[id] ??= emptyTenantDb());
}

export function listTenants(): TenantRecord[] {
  return Object.values(holder().db.tenants).sort((a, b) => a.createdAt.localeCompare(b.createdAt));
}
export function getTenant(id: string): TenantRecord | null {
  return holder().db.tenants[id] ?? null;
}
export function tenantByTag(tag: string): TenantRecord | null {
  return listTenants().find((t) => t.tag === tag) ?? null;
}
export function createTenant(input: { name: string; ownerAccountId: string | null }): TenantRecord {
  const { db } = holder();
  let id = newId("t-");
  while (db.tenants[id]) id = newId("t-");
  const tenant: TenantRecord = {
    id,
    tag: id.slice(2),
    name: input.name,
    ownerAccountId: input.ownerAccountId,
    createdAt: new Date().toISOString(),
    status: "active",
  };
  db.tenants[id] = tenant;
  db.data[id] = emptyTenantDb();
  scheduleSave();
  return tenant;
}
export function updateTenant(id: string, patch: Partial<TenantRecord>) {
  const { db } = holder();
  if (!db.tenants[id]) return null;
  db.tenants[id] = { ...db.tenants[id], ...patch, id, tag: db.tenants[id].tag };
  scheduleSave();
  return db.tenants[id];
}
/** Permanently remove a business and everything it owns, including its accounts. */
export function deleteTenant(id: string) {
  const { db } = holder();
  delete db.tenants[id];
  delete db.data[id];
  db.accounts = db.accounts.filter((a) => a.tenantId !== id);
  voucherIndex = null;
  scheduleSave();
}
/** Run something once for every active business (used by RADIUS lookups and the super admin). */
export function forEachTenant<T>(fn: (tenant: TenantRecord) => T, opts: { includeSuspended?: boolean } = {}): T[] {
  const out: T[] = [];
  for (const tenant of listTenants()) {
    if (tenant.status === "suspended" && !opts.includeSuspended) continue;
    out.push(withTenant(tenant.id, () => fn(tenant)));
  }
  return out;
}

// ---- platform settings, audit log -----------------------------------------------------

export function platformSettings() {
  return holder().db.platform;
}
export function setPlatformSettings(patch: Partial<Root["platform"]>) {
  const { db } = holder();
  db.platform = { ...db.platform, ...patch };
  scheduleSave();
  return db.platform;
}
export function addAudit(entry: Omit<AuditEntry, "id" | "at">) {
  const { db } = holder();
  db.audit.unshift({ id: crypto.randomUUID(), at: new Date().toISOString(), ...entry });
  if (db.audit.length > 5000) db.audit.length = 5000;
  scheduleSave();
}
export function listAudit(limit = 200, tenantId?: string) {
  const all = holder().db.audit;
  return (tenantId ? all.filter((e) => e.tenantId === tenantId) : all).slice(0, limit);
}

function writeLocal() {
  const h = g.__hotspotproDb;
  if (!h) return;
  if (h.timer) {
    clearTimeout(h.timer);
    h.timer = null;
  }
  try {
    fs.mkdirSync(DATA_DIR, { recursive: true });
    const tmp = `${DB_FILE}.tmp`;
    fs.writeFileSync(tmp, JSON.stringify(h.db));
    fs.renameSync(tmp, DB_FILE);
  } catch (error) {
    console.error("[hotspotpro] could not save the database:", error);
  }
}

function flushNow() {
  writeLocal();
  const h = g.__hotspotproDb;
  if (h) void pushDatabase(h.db);
}

/** The whole database, used when saving a first copy to Supabase. */
export function currentDatabase(): Root {
  return holder().db;
}

/** Replace the in-memory database with a copy loaded from Supabase. */
export function adoptDatabase(raw: unknown) {
  const h = holder();
  if (!raw || typeof raw !== "object" || Array.isArray(raw)) return;
  h.db = migrate(raw as Record<string, unknown>);
  voucherIndex = null;
}

function scheduleSave() {
  const h = holder();
  if (h.timer) return;
  h.timer = setTimeout(flushNow, 120);
}

/** Force the pending write to disk now, and wait for Supabase when it is configured. */
export async function flush() {
  writeLocal();
  const h = g.__hotspotproDb;
  if (h) await pushDatabase(h.db);
}

// ---- app state (one JSON document per "slice", e.g. routers, vouchers) ----

export function getState(key: string): StateDoc | null {
  return T().state[key] ?? null;
}

export function getAllState(since = 0): { seq: number; docs: Record<string, StateDoc> } {
  const db = T();
  const docs: Record<string, StateDoc> = {};
  for (const [key, doc] of Object.entries(db.state)) {
    if (doc.seq > since) docs[key] = doc;
  }
  return { seq: db.seq, docs };
}

export function setState(key: string, value: unknown, by: string): StateDoc {
  const db = T();
  const previous = db.state[key];
  db.seq += 1;
  const doc: StateDoc = {
    value,
    rev: (previous?.rev ?? 0) + 1,
    seq: db.seq,
    updatedAt: new Date().toISOString(),
    updatedBy: by,
  };
  db.state[key] = doc;
  if (key === "vouchers") {
    const id = tenantStore.getStore();
    if (id) reindexTenantVouchers(id, value);
  }
  scheduleSave();
  return doc;
}

export function deleteAllState() {
  const db = T();
  db.state = {};
  db.seq += 1;
  scheduleSave();
}

// ---- accounts -------------------------------------------------------------

export function findAccountByEmail(email: string) {
  const wanted = email.trim().toLowerCase();
  return holder().db.accounts.find((a) => a.email.toLowerCase() === wanted) ?? null;
}

export function listAccounts() {
  return holder().db.accounts;
}

export function saveAccount(account: AccountRecord) {
  const { db } = holder();
  const index = db.accounts.findIndex((a) => a.id === account.id);
  if (index >= 0) db.accounts[index] = account;
  else db.accounts.push(account);
  scheduleSave();
}

// ---- webhook events -------------------------------------------------------

export function addEvent(event: WebhookEvent) {
  const { db } = holder();
  db.events.unshift({ tenantId: currentTenantId(), ...event });
  if (db.events.length > MAX_EVENTS) db.events.length = MAX_EVENTS;
  scheduleSave();
}

/** The current business's webhook callbacks. */
export function listEvents(limit = 100) {
  const id = currentTenantId();
  return holder().db.events.filter((e) => e.tenantId === id).slice(0, limit);
}
/** Every callback on the platform (super admin). */
export function listAllEvents(limit = 200) {
  return holder().db.events.slice(0, limit);
}

// ---- router setup links (registered before the router exists in the app) ---

export function registerProvision(token: string, config: Record<string, unknown>) {
  const db = T();
  const previous = db.provisioning[token];
  db.provisioning[token] = { ...previous, config, createdAt: previous?.createdAt ?? new Date().toISOString() };
  // Forget links older than 30 days so the file doesn't grow forever.
  const cutoff = Date.now() - 30 * 24 * 3600 * 1000;
  for (const [key, item] of Object.entries(db.provisioning)) {
    if (Date.parse(item.createdAt) < cutoff) delete db.provisioning[key];
  }
  scheduleSave();
}

export function getProvision(token: string) {
  return T().provisioning[token] ?? null;
}

export function touchProvision(token: string, field: "fetchedAt" | "doneAt") {
  const item = T().provisioning[token];
  if (!item) return;
  item[field] = new Date().toISOString();
  scheduleSave();
}

// ---- advanced commands queued from the site for a router ----------------------

export type RouterJob = {
  id: string;
  at: string;
  script: string;
  by: string;
  status: "queued" | "sent" | "ok" | "failed";
  sentAt?: string;
  finishedAt?: string;
  /** Captured RouterOS output from :execute / :put (Open in browser console). */
  output?: string;
};

export function queueJob(token: string, script: string, by: string): RouterJob {
  const db = T();
  db.jobs ??= {};
  const job: RouterJob = { id: `j${Date.now().toString(36)}${Math.random().toString(36).slice(2, 6)}`, at: new Date().toISOString(), script, by, status: "queued" };
  db.jobs[token] = [job, ...(db.jobs[token] ?? [])].slice(0, 30);
  scheduleSave();
  return job;
}

export function jobsFor(token: string): RouterJob[] {
  return T().jobs?.[token] ?? [];
}

/** Jobs waiting for the router. They are marked "sent" so they only run once, even if the router asks again. */
export function takeQueuedJobs(token: string): RouterJob[] {
  const list = T().jobs?.[token] ?? [];
  const queued = list.filter((j) => j.status === "queued").reverse(); // oldest first
  for (const job of queued) { job.status = "sent"; job.sentAt = new Date().toISOString(); }
  if (queued.length) scheduleSave();
  return queued;
}

export function jobById(token: string, id: string): RouterJob | null {
  return jobsFor(token).find((j) => j.id === id) ?? null;
}

export function finishJob(token: string, id: string, ok: boolean, output?: string): boolean {
  const job = jobById(token, id);
  if (!job) return false;
  job.status = ok ? "ok" : "failed";
  job.finishedAt = new Date().toISOString();
  if (typeof output === "string" && output.trim()) {
    job.output = output.replace(/\0/g, "").trim().slice(0, 20_000);
  }
  scheduleSave();
  return true;
}

// ---- payments ledger ---------------------------------------------------------

export function savePayment(payment: PaymentRecord) {
  T().payments[payment.id] = payment;
  scheduleSave();
}
export function getPayment(id: string) {
  return T().payments[id] ?? null;
}
export function listPayments(limit = 200) {
  return Object.values(T().payments)
    .sort((a, b) => b.createdAt.localeCompare(a.createdAt))
    .slice(0, limit);
}
export function allPayments() {
  return Object.values(T().payments);
}

// ---- SMS outbox ----------------------------------------------------------------

export function addSms(record: SmsRecord) {
  const db = T();
  db.smsLog.unshift(record);
  if (db.smsLog.length > 1000) db.smsLog.length = 1000;
  scheduleSave();
}
export function listSms(limit = 100) {
  return T().smsLog.slice(0, limit);
}

// ---- RADIUS sessions ---------------------------------------------------------

export function saveSession(session: RadiusSession) {
  const db = T();
  db.radiusSessions[session.id] = session;
  // Keep only the most recent 5000.
  const ids = Object.keys(db.radiusSessions);
  if (ids.length > 5000) {
    ids
      .sort((a, b) => db.radiusSessions[a].updatedAt.localeCompare(db.radiusSessions[b].updatedAt))
      .slice(0, ids.length - 5000)
      .forEach((id) => delete db.radiusSessions[id]);
  }
  scheduleSave();
}
export function getSession(id: string) {
  return T().radiusSessions[id] ?? null;
}
export function sessionsFor(username: string) {
  return Object.values(T().radiusSessions).filter((s) => s.username.toLowerCase() === username.toLowerCase());
}
export function allSessions() {
  return Object.values(T().radiusSessions);
}

// ---- per-router data usage ----------------------------------------------------

export const nasKeyOf = (source: string, identifier?: string) => `${source}|${identifier ?? ""}`;
const USAGE_KEEP_DAYS = 400;

export function hourKey(ms: number) {
  return new Date(ms).toISOString().slice(0, 13);
}

export function noteNas(key: string, info: NasInfo) {
  const db = T();
  db.nas[key] = { ...db.nas[key], ...info };
  scheduleSave();
}

export function addUsage(key: string, atMs: number, down: number, up: number, starts = 0) {
  if (down <= 0 && up <= 0 && starts <= 0) return;
  const db = T();
  const perHour = (db.usage[key] ??= {});
  const hour = hourKey(atMs);
  let bucket = perHour[hour];
  if (!bucket) {
    bucket = perHour[hour] = { down: 0, up: 0, starts: 0 };
    const cutoff = hourKey(Date.now() - USAGE_KEEP_DAYS * 86400000);
    for (const old of Object.keys(perHour)) if (old < cutoff) delete perHour[old];
  }
  bucket.down += Math.max(0, down);
  bucket.up += Math.max(0, up);
  bucket.starts += starts;
  scheduleSave();
}

/** Router check-in is ~10–15s; three missed beats ≈ lost contact. */
export const SILENT_MS = 45_000;

export function recordBeat(token: string) {
  const db = T();
  const now = new Date().toISOString();
  const previous = db.beats[token];
  if (previous && Date.parse(now) - Date.parse(previous) > SILENT_MS) db.outages[token] = { from: previous, to: now };
  db.beats[token] = now;
  scheduleSave();
}
export function outageOf(token: string) {
  return T().outages[token] ?? null;
}
export function beatOf(token: string): string | null {
  return T().beats[token] ?? null;
}

export function usageSnapshot() {
  const db = T();
  return { usage: db.usage, nas: db.nas, nasLinks: db.nasLinks };
}

export function linkNas(key: string, routerIp: string | null) {
  const db = T();
  if (routerIp) db.nasLinks[key] = routerIp;
  else delete db.nasLinks[key];
  scheduleSave();
}

/** Remove every sample (test) record made for one router. */
export function removeSimulated(routerIp: string) {
  const db = T();
  for (const [key, info] of Object.entries(db.nas)) {
    if (info.simulatedFor !== routerIp) continue;
    delete db.nas[key];
    delete db.usage[key];
  }
  for (const [id, s] of Object.entries(db.radiusSessions)) {
    if (s.simulated && s.nasIdentifier === routerIp) delete db.radiusSessions[id];
  }
  scheduleSave();
}

// ---- generated secrets (RADIUS shared secret, webhook secret) -------------------

export function secretFor(name: string, make: () => string) {
  const { db } = holder();
  if (!db.secrets[name]) {
    db.secrets[name] = make();
    scheduleSave();
  }
  return db.secrets[name];
}

// ---- finding which business something belongs to (for public/router/webhook requests) ----

type RouterRow = { provisioningToken?: string };

// Voucher code -> businesses that issued it. RADIUS looks this up on every login, so it stays in memory
// and is updated whenever a business saves its voucher list. Rebuilt from the file on first use.
type VoucherIndex = { byCode: Map<string, string[]>; byTenant: Map<string, string[]> };
let voucherIndex: VoucherIndex | null = null;

function voucherCodes(value: unknown): string[] {
  if (!Array.isArray(value)) return [];
  const codes: string[] = [];
  for (const row of value) {
    const code = row && typeof row === "object" && typeof (row as { code?: unknown }).code === "string"
      ? (row as { code: string }).code.trim().toLowerCase()
      : "";
    if (code) codes.push(code);
  }
  return codes;
}

function rebuildVoucherIndex() {
  const index: VoucherIndex = { byCode: new Map(), byTenant: new Map() };
  const { db } = holder();
  for (const [tenantId, data] of Object.entries(db.data)) {
    if (!db.tenants[tenantId]) continue;
    const codes = voucherCodes(data.state.vouchers?.value);
    index.byTenant.set(tenantId, codes);
    for (const code of codes) {
      const list = index.byCode.get(code);
      if (list) { if (!list.includes(tenantId)) list.push(tenantId); }
      else index.byCode.set(code, [tenantId]);
    }
  }
  voucherIndex = index;
}

function reindexTenantVouchers(tenantId: string, value: unknown) {
  if (!voucherIndex) return;
  for (const code of voucherIndex.byTenant.get(tenantId) ?? []) {
    const next = (voucherIndex.byCode.get(code) ?? []).filter((id) => id !== tenantId);
    if (next.length) voucherIndex.byCode.set(code, next);
    else voucherIndex.byCode.delete(code);
  }
  const codes = voucherCodes(value);
  voucherIndex.byTenant.set(tenantId, codes);
  for (const code of codes) {
    const list = voucherIndex.byCode.get(code);
    if (list) { if (!list.includes(tenantId)) list.push(tenantId); }
    else voucherIndex.byCode.set(code, [tenantId]);
  }
}

/** Businesses that issued this voucher code. Empty when nobody has it. */
export function tenantsForVoucher(code: string): string[] {
  const wanted = code.trim().toLowerCase();
  if (!wanted) return [];
  if (!voucherIndex) rebuildVoucherIndex();
  return voucherIndex?.byCode.get(wanted) ?? [];
}

/** The business a router's setup token belongs to. */
export function tenantOfToken(token: string): string | null {
  if (!token) return null;
  const { db } = holder();
  for (const [id, data] of Object.entries(db.data)) {
    if (!db.tenants[id]) continue;
    if (data.provisioning[token]) return id;
    const routers = data.state.routers?.value;
    if (Array.isArray(routers) && (routers as RouterRow[]).some((r) => r && r.provisioningToken === token)) return id;
  }
  return null;
}

/** The business a payment reference belongs to. */
export function tenantOfPayment(reference: string): string | null {
  if (!reference) return null;
  const { db } = holder();
  for (const [id, data] of Object.entries(db.data)) {
    if (db.tenants[id] && data.payments[reference]) return id;
  }
  return null;
}

/** Plain counts for the super admin (no tenant context needed). */
export function tenantData(id: string): TenantDb | null {
  return holder().db.data[id] ?? null;
}
