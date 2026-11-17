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

export function routerAllowsPackage(pkg: Pkg, routerIp: string | null) {
  if (pkg.status && pkg.status !== "Active") return false;
  if (!routerIp || pkg.applyToAllSites || !pkg.routerIps || pkg.routerIps.length === 0) return true;
  return pkg.routerIps.includes(routerIp);
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
