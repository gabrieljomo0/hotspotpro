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
};

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
