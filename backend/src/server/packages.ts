// Reading the saved packages / vouchers / settings the way the dashboard saved them.

import crypto from "node:crypto";
import { getState, setState } from "./store";

export type Pkg = {
  id: string; name: string; price: string; description?: string; validity?: string;
  durationValue: number; durationUnit: "Minutes" | "Hours" | "Days" | "Weeks" | "Months";
  downloadMbps: number; uploadMbps: number;
  fupValue: number | null; fupUnit: "MB" | "GB";
  devices?: number; status?: string; routerIps?: string[]; applyToAllSites?: boolean;
  download?: string; upload?: string;
};

export type Vch = {
  code: string; password: string | null; packageName: string;
  status: "Available" | "Used" | "Expired"; delivery: string; saleType: string;
  usedByCustomerId: string | null; redeemerPhone: string | null;
  generatedAt: string; generatedAtMs: number; usedAtMs?: number;
  agentId: string; batchId: string | null;
  // set by the server when the voucher is first used to log in
  activatedAtMs?: number; expiresAtMs?: number; bytesUsed?: number; serverIssuedMs?: number;
  /** First phone that used this voucher. Another phone cannot use the same code. */
  boundMac?: string;
  /** days, data, or both. Missing means both. */
  limitBy?: "days" | "data" | "both";
  /** signin: the day runs from the first login. usage: the day runs only while online. Missing means signin. */
  countFrom?: "signin" | "usage";
};

export function voucherLimitBy(voucher: { limitBy?: string }): "days" | "data" | "both" {
  return voucher.limitBy === "days" || voucher.limitBy === "data" ? voucher.limitBy : "both";
}

export function voucherCountFrom(voucher: { countFrom?: string }): "signin" | "usage" {
  return voucher.countFrom === "usage" ? "usage" : "signin";
}

/** A running calendar day, which keeps going after they disconnect. Data-only and usage vouchers do not have one. */
export function voucherUsesCalendar(voucher: { limitBy?: string; countFrom?: string }) {
  return voucherLimitBy(voucher) !== "data" && voucherCountFrom(voucher) === "signin";
}

export function list<T>(key: string): T[] {
  const v = getState(key)?.value;
  return Array.isArray(v) ? (v as T[]) : [];
}

export function priceOf(pkg: Pkg) {
  const n = Number(String(pkg.price).replace(/[^0-9.]/g, ""));
  return Number.isFinite(n) ? n : 0;
}

export function packageSeconds(pkg: Pkg) {
  const unit = { Minutes: 60, Hours: 3600, Days: 86400, Weeks: 604800, Months: 2592000 }[pkg.durationUnit] ?? 86400;
  return Math.round((pkg.durationValue || 1) * unit);
}

export function packageBytes(pkg: Pkg): number | null {
  if (!pkg.fupValue) return null;
  return Math.round(pkg.fupValue * (pkg.fupUnit === "GB" ? 1024 ** 3 : 1024 ** 2));
}

export function findPackageByName(name: string) {
  return list<Pkg>("packages").find((p) => p.name === name) ?? null;
}

type RouterIdRow = {
  ip?: string;
  provisioningToken?: string;
  provisioningStatus?: string;
  siteId?: string | null;
};

type BatchRow = { id?: string; routerIps?: string[] };

function routerRows(): RouterIdRow[] {
  const routers = getState("routers")?.value;
  return Array.isArray(routers) ? (routers as RouterIdRow[]) : [];
}

/** Same physical MikroTik when the stored id flipped pending-* ↔ linked-* or duplicate rows share a token. */
export function sameRouterIdentity(a: string, b: string): boolean {
  if (!a || !b) return false;
  if (a === b) return true;
  const rows = routerRows();
  const ra = rows.find((r) => r.ip === a);
  const rb = rows.find((r) => r.ip === b);
  if (ra?.provisioningToken && rb?.provisioningToken && ra.provisioningToken === rb.provisioningToken) return true;
  if (rb?.provisioningToken && a === `linked-${rb.provisioningToken.slice(0, 12)}`) return true;
  if (ra?.provisioningToken && b === `linked-${ra.provisioningToken.slice(0, 12)}`) return true;
  return false;
}

/**
 * Does this live router fall inside an allowed IP list?
 * Also accepts: same provisioning token, fully orphaned lists (routers removed),
 * and demo/seed scope (no linked tokens) when the live router is a real linked MikroTik.
 */
export function routerIpListAllows(allowed: string[] | null | undefined, liveIp: string | null): boolean {
  if (!liveIp || !allowed || allowed.length === 0) return true;
  if (allowed.some((ip) => sameRouterIdentity(ip, liveIp))) return true;

  const rows = routerRows();
  const live = rows.find((r) => r.ip === liveIp);
  if (!live) return false;

  const allowedRows = allowed
    .map((ip) => rows.find((r) => r.ip === ip))
    .filter((r): r is RouterIdRow => !!r);
  const anyAllowedLinked = allowedRows.some(
    (r) => typeof r.provisioningToken === "string" && r.provisioningToken.length > 0,
  );
  // Same site after pending-* → linked-* (or duplicate rows for one location).
  if (live.siteId && allowedRows.some((r) => r.siteId && r.siteId === live.siteId)) return true;
  // Package/batch still points at demo seed routers; this phone is on a real provisioned unit.
  if (live.provisioningToken && !anyAllowedLinked) return true;
  // Every target router was deleted/replaced — don't block the live network.
  if (allowedRows.length === 0) return true;
  // Only one live MikroTik on this business — site-scoped packages belong there.
  const provisioned = rows.filter((r) => typeof r.provisioningToken === "string" && r.provisioningToken.length > 0);
  if (live.provisioningToken && provisioned.length === 1) return true;
  return false;
}

export function routerAllowsPackage(pkg: Pkg, routerIp: string | null) {
  if (pkg.status && pkg.status !== "Active") return false;
  if (!routerIp || pkg.applyToAllSites || !pkg.routerIps || pkg.routerIps.length === 0) return true;
  return routerIpListAllows(pkg.routerIps, routerIp);
}

/** Portal + local-user sync: batch scope wins (what the voucher was issued for). */
export function voucherAllowedOnRouter(
  batchId: string | null | undefined,
  packageName: string,
  routerIp: string | null,
): boolean {
  if (!routerIp) return true;
  if (batchId) {
    const batches = getState("voucherBatches")?.value;
    if (Array.isArray(batches)) {
      const batch = (batches as BatchRow[]).find((b) => b && b.id === batchId);
      if (batch && Array.isArray(batch.routerIps) && batch.routerIps.length > 0) {
        return routerIpListAllows(batch.routerIps, routerIp);
      }
    }
  }
  const pkg = findPackageByName(packageName);
  if (pkg && !routerAllowsPackage(pkg, routerIp)) return false;
  return true;
}

export function findVoucher(code: string) {
  const wanted = code.trim().toLowerCase();
  return list<Vch>("vouchers").find((v) => v.code.toLowerCase() === wanted) ?? null;
}

/** AA:BB:CC:DD:EE:FF for RouterOS, or "" when the value is not a MAC. */
export function normalizeMac(value: string | null | undefined): string {
  const hex = (value || "").toLowerCase().replace(/[^a-f0-9]/g, "");
  if (hex.length !== 12) return "";
  return (hex.match(/.{2}/g) || []).join(":").toUpperCase();
}

/** First time a voucher is seen online, the calendar starts. Buying it does not. */
export function noteLiveVouchers(names: string[], now = Date.now()) {
  if (names.length === 0) return;
  const wanted = new Set(names.map((name) => name.toLowerCase()));
  let changed = false;
  const next = list<Vch>("vouchers").map((voucher) => {
    if (!wanted.has(voucher.code.toLowerCase()) || voucher.status === "Expired" || voucher.activatedAtMs) return voucher;
    const pkg = findPackageByName(voucher.packageName);
    const seconds = pkg ? packageSeconds(pkg) : 24 * 3600;
    changed = true;
    const calendar = voucherUsesCalendar(voucher);
    return {
      ...voucher,
      activatedAtMs: now,
      ...(calendar ? { expiresAtMs: now + seconds * 1000 } : {}),
      status: voucher.status === "Available" ? "Used" as const : voucher.status,
      usedAtMs: voucher.usedAtMs ?? now,
    };
  });
  if (changed) setState("vouchers", next, "server");
}

export function updateVoucher(code: string, patch: Partial<Vch>) {
  const wanted = code.toLowerCase();
  const next = list<Vch>("vouchers").map((v) => (v.code.toLowerCase() === wanted ? { ...v, ...patch } : v));
  setState("vouchers", next, "server");
}

export function addVoucher(voucher: Vch) {
  setState("vouchers", [voucher, ...list<Vch>("vouchers")], "server");
}

export function randomCode(length = 8) {
  const alphabet = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789"; // no 0/O/1/I to avoid misreading
  let out = "";
  const bytes = crypto.randomBytes(length);
  for (let i = 0; i < length; i += 1) out += alphabet[bytes[i] % alphabet.length];
  return out;
}

export function uniqueCode(prefix = "") {
  for (let i = 0; i < 20; i += 1) {
    const code = prefix + randomCode(8);
    if (!findVoucher(code)) return code;
  }
  return prefix + randomCode(12);
}
