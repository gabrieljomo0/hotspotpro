// Who may see / change which saved slice.
//
// Admin: everything. Agents and installers: not the admin-only settings, and
// never other people's passwords (hidden on read, and kept as-is on write so
// an agent's screen saving the agent list can't change anyone's password).

import type { Session } from "./auth";

export const ADMIN_ONLY = new Set([
  "systemUsers", "subscription", "commissionSettings", "smsSettings", "whatsappSettings",
  "domainSettings", "paymentSettings", "masterPortal", "routerCleanup", "branding",
]);
const WITH_PASSWORDS = new Set(["agents", "installers", "systemUsers"]);

type Row = Record<string, unknown> & { id?: string };

export function canRead(session: Session, key: string) {
  return session.role === "admin" || !ADMIN_ONLY.has(key);
}

export function canWrite(session: Session, key: string) {
  if (session.role === "admin") return true;
  if (ADMIN_ONLY.has(key) || key === "hotspotPolicySettings") return false;
  if (key === "installers" || key === "systemUsers") return false;
  return true;
}

/** What this session is allowed to see of a slice's value. */
export function redactForRead(session: Session, key: string, value: unknown) {
  if (session.role === "admin" || !WITH_PASSWORDS.has(key) || !Array.isArray(value)) return value;
  return (value as Row[]).map((row) => (row && row.id !== session.sub && "password" in row ? { ...row, password: null } : row));
}

/** Keep stored passwords when a non-admin saves a list that contains them. */
type Vouch = Row & { code?: string; activatedAtMs?: number; serverIssuedMs?: number };

/** A stale save must not undo what the server itself just did to vouchers (a purchase issued a code, a login started its clock). */
function reconcileVouchers(incoming: Vouch[], stored: unknown): Vouch[] {
  const old = Array.isArray(stored) ? (stored as Vouch[]) : [];
  const byCode = new Map(incoming.map((v) => [String(v.code).toLowerCase(), v]));
  const result = incoming.map((v) => {
    const before = old.find((o) => o.code === v.code);
    if (before?.activatedAtMs && !v.activatedAtMs) {
      return { ...v, activatedAtMs: before.activatedAtMs, expiresAtMs: before.expiresAtMs, bytesUsed: before.bytesUsed, status: before.status };
    }
    return v;
  });
  const recent = Date.now() - 5 * 60 * 1000;
  for (const o of old) {
    if (o.serverIssuedMs && o.serverIssuedMs > recent && !byCode.has(String(o.code).toLowerCase())) result.unshift(o);
  }
  return result;
}

export function mergeForWrite(session: Session, key: string, incoming: unknown, stored: unknown) {
  if (key === "vouchers" && Array.isArray(incoming)) return reconcileVouchers(incoming as Vouch[], stored);
  if (session.role === "admin" || !WITH_PASSWORDS.has(key) || !Array.isArray(incoming)) return incoming;
  const old = new Map((Array.isArray(stored) ? (stored as Row[]) : []).map((r) => [r.id, r]));
  return (incoming as Row[]).map((row) => {
    const before = row && old.get(row.id);
    if (!before || !("password" in before)) return row;
    return row.id === session.sub ? row : { ...row, password: before.password };
  });
}
