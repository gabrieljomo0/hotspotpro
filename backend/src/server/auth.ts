// Passwords and sessions.
//
// - Passwords are stored as scrypt hashes (never as plain text).
// - A session is a signed cookie: base64url(payload).HMAC-SHA256 signature.
//   The signing secret is HOTSPOTPRO_SESSION_SECRET, or — if that isn't set —
//   a random one created once and kept in data/secret.key. Because the cookie
//   is self-contained it can be checked anywhere (the page guard in proxy.ts
//   and every API route) without touching the database.

import crypto from "node:crypto";
import fs from "node:fs";
import path from "node:path";
import { DATA_DIR, type AccountRecord, createTenant, findAccountByEmail, getTenant, listAccounts, platformSettings, saveAccount, updateTenant } from "./store";

/** Set only for the super admin while "viewing as" one business. */
export const VIEW_COOKIE = "hotspotpro_view";
export const SESSION_COOKIE = "hotspotpro_session";
export const SESSION_SECONDS = 60 * 60 * 24 * 7;

export type Role = "admin" | "agent" | "installer";
export type Session = {
  sub: string;
  role: Role;
  email: string;
  exp: number;
  /** The business (tenant) this person belongs to. */
  tid?: string;
  /** True for the platform's super admin (their role is still "admin" inside their own business). */
  sup?: boolean;
};

// ---- passwords ------------------------------------------------------------

export function hashPassword(password: string): string {
  const salt = crypto.randomBytes(16);
  const hash = crypto.scryptSync(password, salt, 64);
  return `scrypt$${salt.toString("hex")}$${hash.toString("hex")}`;
}

export function verifyPassword(password: string, stored: string): boolean {
  const [scheme, saltHex, hashHex] = stored.split("$");
  if (scheme !== "scrypt" || !saltHex || !hashHex) return false;
  const expected = Buffer.from(hashHex, "hex");
  const actual = crypto.scryptSync(password, Buffer.from(saltHex, "hex"), expected.length);
  return crypto.timingSafeEqual(actual, expected);
}

/** Constant-time comparison for plain strings (agent / installer passwords). */
export function safeEqual(a: string, b: string): boolean {
  const ha = crypto.createHash("sha256").update(a).digest();
  const hb = crypto.createHash("sha256").update(b).digest();
  return crypto.timingSafeEqual(ha, hb);
}

/** The super admin: the first account ever made on this installation. */
export function superAdminExists(): boolean {
  ensureAdminAccount();
  return listAccounts().some((a) => a.role === "superadmin");
}

/** Make an account and the business it owns. The first account on a fresh install is the super admin. */
export function createAccountWithBusiness(input: {
  email: string;
  password: string;
  name?: string;
  businessName?: string;
  role: "admin" | "superadmin";
  id?: string;
}): AccountRecord {
  const id = input.id ?? `admin-${crypto.randomBytes(4).toString("hex")}`;
  const tenant = createTenant({ name: input.businessName || input.name || input.email, ownerAccountId: id });
  const account: AccountRecord = {
    id,
    email: input.email.trim().toLowerCase(),
    passwordHash: hashPassword(input.password),
    role: input.role,
    tenantId: tenant.id,
    createdAt: new Date().toISOString(),
    name: input.name,
    businessName: input.businessName || undefined,
  };
  saveAccount(account);
  return account;
}

/**
 * A super admin account made from the .env settings, but ONLY when the server's owner has
 * explicitly set HOTSPOTPRO_ADMIN_PASSWORD. Otherwise a fresh install has no account at all
 * and the first visitor creates the super admin on the sign-up page (see auth/register).
 * There is deliberately no built-in default password: a public site must never ship one.
 */
export function ensureAdminAccount() {
  if (listAccounts().length > 0) return;
  const password = process.env.HOTSPOTPRO_ADMIN_PASSWORD;
  if (!password) return;
  createAccountWithBusiness({
    id: "admin-1",
    email: process.env.HOTSPOTPRO_ADMIN_EMAIL || "admin@hotspotpro.com",
    password,
    name: "Super admin",
    role: "superadmin",
  });
}

/** Is a business allowed to sign in / be served right now? */
export function tenantAllowed(tenantId: string | undefined | null): boolean {
  if (!tenantId) return false;
  const tenant = getTenant(tenantId);
  return !!tenant && tenant.status === "active";
}

export function signupOpen(): boolean {
  return !superAdminExists() || platformSettings().signupOpen;
}
void updateTenant;

export function verifyAdmin(email: string, password: string) {
  ensureAdminAccount();
  const account = findAccountByEmail(email);
  // Always do the hashing work so a wrong email takes as long as a wrong password.
  const ok = verifyPassword(password, account?.passwordHash ?? "scrypt$00$00");
  return account && ok ? account : null;
}

// ---- sessions -------------------------------------------------------------

let cachedSecret: string | null = null;

function secret(): string {
  if (process.env.HOTSPOTPRO_SESSION_SECRET) return process.env.HOTSPOTPRO_SESSION_SECRET;
  if (cachedSecret) return cachedSecret;
  const file = path.join(DATA_DIR, "secret.key");
  try {
    cachedSecret = fs.readFileSync(file, "utf8").trim();
    if (cachedSecret) return cachedSecret;
  } catch {
    /* create it below */
  }
  cachedSecret = crypto.randomBytes(32).toString("hex");
  fs.mkdirSync(DATA_DIR, { recursive: true });
  fs.writeFileSync(file, cachedSecret, { mode: 0o600 });
  return cachedSecret;
}

function sign(payload: string) {
  return crypto.createHmac("sha256", secret()).update(payload).digest("base64url");
}

export function createSessionToken(input: { sub: string; role: Role; email: string; tid?: string; sup?: boolean }): string {
  const session: Session = { ...input, exp: Math.floor(Date.now() / 1000) + SESSION_SECONDS };
  const payload = Buffer.from(JSON.stringify(session)).toString("base64url");
  return `${payload}.${sign(payload)}`;
}

export function readSessionToken(token: string | undefined | null): Session | null {
  if (!token) return null;
  const [payload, signature] = token.split(".");
  if (!payload || !signature) return null;
  const expected = sign(payload);
  const a = Buffer.from(signature);
  const b = Buffer.from(expected);
  if (a.length !== b.length || !crypto.timingSafeEqual(a, b)) return null;
  try {
    const session = JSON.parse(Buffer.from(payload, "base64url").toString("utf8")) as Session;
    if (!session.exp || session.exp < Date.now() / 1000) return null;
    return session;
  } catch {
    return null;
  }
}

function cookieFrom(header: string | null, name: string) {
  if (!header) return undefined;
  for (const part of header.split(";")) {
    const [k, ...rest] = part.trim().split("=");
    if (k === name) return decodeURIComponent(rest.join("="));
  }
  return undefined;
}

export function sessionFromRequest(request: Request): Session | null {
  return readSessionToken(cookieFrom(request.headers.get("cookie"), SESSION_COOKIE));
}

/** Only the super admin: the signed-in session if it is one, else null. */
export function superSession(request: Request): Session | null {
  const session = sessionFromRequest(request);
  if (!session || !session.sup || session.role !== "admin") return null;
  // The account must still exist and still be a super admin (the cookie alone is not enough).
  const account = findAccountByEmail(session.email);
  return account && account.role === "superadmin" ? session : null;
}

/** The business a super admin is currently "viewing as" (set by the View-as button), if any. */
export function viewTenantFromRequest(request: Request): string | null {
  return cookieFrom(request.headers.get("cookie"), VIEW_COOKIE) ?? null;
}

export function sessionCookie(token: string, maxAge = SESSION_SECONDS) {
  return {
    name: SESSION_COOKIE,
    value: token,
    httpOnly: true,
    secure: process.env.NODE_ENV === "production" && process.env.HOTSPOTPRO_INSECURE_COOKIES !== "1",
    sameSite: "lax" as const,
    path: "/",
    maxAge,
  };
}

// ---- simple login rate limit (per email + IP) -------------------------------

const attempts = new Map<string, { count: number; first: number }>();
const WINDOW_MS = 10 * 60 * 1000;
const MAX_ATTEMPTS = 10;

export function tooManyAttempts(key: string): boolean {
  const entry = attempts.get(key);
  if (!entry) return false;
  if (Date.now() - entry.first > WINDOW_MS) {
    attempts.delete(key);
    return false;
  }
  return entry.count >= MAX_ATTEMPTS;
}
export function recordFailedAttempt(key: string) {
  const entry = attempts.get(key);
  if (!entry || Date.now() - entry.first > WINDOW_MS) attempts.set(key, { count: 1, first: Date.now() });
  else entry.count += 1;
}
export function clearAttempts(key: string) {
  attempts.delete(key);
}
