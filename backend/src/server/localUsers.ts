// Push voucher logins onto the MikroTik itself (/ip hotspot user).
// The router then accepts those codes even when it cannot reach this server.
// Every user gets a finite uptime and speed from its package, so a local
// login cannot stay online forever. Local mode does not ask the cloud.

import { getState, setState } from "./store";
import { type Pkg, type Vch, findPackageByName, list, packageBytes, packageSeconds, routerAllowsPackage, voucherCountFrom, voucherLimitBy } from "./packages";

const BATCH = 40;

function quote(value: string) {
  return `"${value.replace(/[\\"$\r\n]/g, "")}"`;
}

function rosDuration(seconds: number) {
  const s = Math.max(60, Math.round(seconds));
  if (s % 86400 === 0) return `${s / 86400}d`;
  if (s % 3600 === 0) return `${s / 3600}h`;
  if (s % 60 === 0) return `${s / 60}m`;
  return `${s}s`;
}

function userName(code: string) {
  return code.trim().replace(/[^A-Za-z0-9_-]/g, "").slice(0, 32);
}

function profileName(pkg: Pkg | null, fallback: string) {
  const raw = (pkg?.id || fallback).replace(/[^A-Za-z0-9]/g, "");
  return ("h" + (raw || "default")).slice(0, 16);
}

function rate(pkg: Pkg | null) {
  const kbps = (n: number | undefined) => `${Math.max(1, Math.round((n ?? 5) * 1000))}k`;
  return `${kbps(pkg?.uploadMbps)}/${kbps(pkg?.downloadMbps)}`;
}

type SyncFile = Record<string, { codes: string[]; at: number }>;

function syncFile(): SyncFile {
  const value = getState("routerUserSync")?.value;
  if (!value || typeof value !== "object" || Array.isArray(value)) return {};
  return value as SyncFile;
}

function wanted(routerIp: string, now: number) {
  const out: { name: string; password: string; pkg: Pkg | null; limitBy: "days" | "data" | "both"; countFrom: "signin" | "usage" }[] = [];
  const seen = new Set<string>();
  for (const voucher of list<Vch>("vouchers")) {
    if (!voucher || voucher.status === "Expired") continue;
    if (voucher.expiresAtMs && voucher.expiresAtMs <= now) continue;
    const pkg = findPackageByName(voucher.packageName);
    if (pkg && !routerAllowsPackage(pkg, routerIp)) continue;
    const name = userName(voucher.code || "");
    if (!name || seen.has(name)) continue;
    seen.add(name);
    out.push({
      name,
      password: voucher.password || voucher.code || name,
      pkg,
      limitBy: voucherLimitBy(voucher),
      countFrom: voucherCountFrom(voucher),
    });
  }
  return out;
}

/** Cloud mode deletes the on-router copies, so the next local check-in sends them again. */
export function forgetLocalUsers(token: string) {
  const file = syncFile();
  if (!file[token]) return;
  delete file[token];
  setState("routerUserSync", file, "server");
}

/** RouterOS lines that add the current vouchers and drop ones that no longer exist. Sent on every check-in, so a missed copy is tried again. */
export function localUserLines(token: string, routerIp: string, now = Date.now()): string[] {
  const file = syncFile();
  const previous = file[token]?.codes ?? [];
  const users = wanted(routerIp, now).slice(0, BATCH);
  const desired = new Set(users.map((u) => u.name));
  const remove = previous.filter((code) => !desired.has(code)).slice(0, BATCH);
  const add = users;
  const nextCodes = users.map((u) => u.name);
  const same = nextCodes.length === previous.length && nextCodes.every((code, index) => code === previous[index]);
  if (!same) {
    file[token] = { codes: nextCodes, at: now };
    setState("routerUserSync", file, "server");
  }

  const lines: string[] = ["# HotspotPro local vouchers (kept on this router; each one has a time limit)"];
  const profiles = new Set<string>();
  for (const user of add) {
    const name = profileName(user.pkg, user.name);
    if (profiles.has(name)) continue;
    profiles.add(name);
    const seconds = user.pkg ? packageSeconds(user.pkg) : 86400;
    const devices = user.pkg?.devices && user.pkg.devices > 0 ? user.pkg.devices : 1;
    // session-timeout=0s is the RouterOS default: no extra session cap. A cap
    // equal to the bundle was logging phones out, and the 2-minute keepalive
    // then made a fresh voucher look finished. The phone may leave and come
    // back until limit-uptime and the data cap run out.
    const limit = `rate-limit=${rate(user.pkg)} shared-users=${devices} session-timeout=0s idle-timeout=none keepalive-timeout=none mac-cookie-timeout=${rosDuration(seconds)}`;
    lines.push(`:do { /ip hotspot user profile set [find where name=${quote(name)}] ${limit} } on-error={ }`);
    lines.push(`:do { :if ([:len [/ip hotspot user profile find where name=${quote(name)}]] = 0) do={ /ip hotspot user profile add name=${quote(name)} ${limit} comment="HotspotPro" } } on-error={ }`);
  }
  for (const user of add) {
    const seconds = user.pkg ? packageSeconds(user.pkg) : 86400;
    const cap = (user.pkg ? packageBytes(user.pkg) : 0) ?? 0;
    // Days: the router counts connected time, and pauses it when they disconnect.
    // A sign-in voucher also gets a calendar day from the server, so the day
    // keeps running after they sign off. Data-only vouchers have no time cap.
    // 0 means unlimited on the router.
    const uptime = user.limitBy === "data" ? "0s" : rosDuration(seconds);
    const bytes = user.limitBy === "days" ? 0 : cap;
    const limits = `limit-uptime=${uptime} limit-bytes-total=${bytes}`;
    const profile = quote(profileName(user.pkg, user.name));
    lines.push(
      `:do { :if ([:len [/ip hotspot user find where name=${quote(user.name)}]] = 0) do={ /ip hotspot user add name=${quote(user.name)} password=${quote(user.password)} profile=${profile} ${limits} comment="HotspotPro" } else={ /ip hotspot user set [find where name=${quote(user.name)}] password=${quote(user.password)} profile=${profile} ${limits} disabled=no } } on-error={ }`,
    );
  }
  for (const code of remove) {
    lines.push(`:do { /ip hotspot user remove [find where name=${quote(code)} comment="HotspotPro"] } on-error={ }`);
  }
  return lines;
}
