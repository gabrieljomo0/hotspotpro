// Push voucher logins onto the MikroTik itself (/ip hotspot user).
// The router then accepts those codes even when it cannot reach this server.
// Every user gets a finite uptime and speed from its package, so a local
// login cannot stay online forever. Local mode does not ask the cloud.

import { voucherOnlyLogin } from "./hotspotPages";
import { getState, setState } from "./store";
import { type Pkg, type Vch, findPackageByName, list, normalizeMac, packageBytes, packageSeconds, voucherAllowedOnRouter, voucherCountFrom, voucherLimitBy } from "./packages";

/** How many voucher accounts one check-in may add/remove. Kept modest so weak links stay fast. */
const BATCH = 80;

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

type SyncRow = { codes: string[]; at: number; offset?: number };
type SyncFile = Record<string, SyncRow>;

type WantedUser = {
  name: string;
  password: string;
  pkg: Pkg | null;
  limitBy: "days" | "data" | "both";
  countFrom: "signin" | "usage";
  mac: string;
  rank: number;
};

function syncFile(): SyncFile {
  const value = getState("routerUserSync")?.value;
  if (!value || typeof value !== "object" || Array.isArray(value)) return {};
  return value as SyncFile;
}

function packageMap() {
  const map = new Map<string, Pkg>();
  for (const pkg of list<Pkg>("packages")) {
    if (pkg?.name) map.set(pkg.name, pkg);
  }
  return map;
}

function codesOf(users: WantedUser[]) {
  return [
    ...users.map((u) => u.name),
    ...users.filter((u) => u.mac).map((u) => u.mac),
  ];
}

function wanted(routerIp: string, now: number) {
  const packages = packageMap();
  const out: WantedUser[] = [];
  const seen = new Set<string>();
  for (const voucher of list<Vch>("vouchers")) {
    if (!voucher || voucher.status === "Expired") continue;
    if (voucher.expiresAtMs && voucher.expiresAtMs <= now) continue;
    const pkg = packages.get(voucher.packageName) ?? findPackageByName(voucher.packageName);
    if (!voucherAllowedOnRouter(voucher.batchId, voucher.packageName, routerIp)) continue;
    const name = userName(voucher.code || "");
    if (!name || seen.has(name)) continue;
    seen.add(name);
    // Prefer already-used / bound vouchers so busy routers keep current customers first.
    const rank = voucher.status === "Used" || voucher.boundMac || voucher.activatedAtMs ? 0 : 1;
    out.push({
      name,
      password: voucher.password || voucher.code || name,
      pkg,
      limitBy: voucherLimitBy(voucher),
      countFrom: voucherCountFrom(voucher),
      mac: normalizeMac(voucher.boundMac),
      rank,
    });
  }
  out.sort((a, b) => a.rank - b.rank || a.name.localeCompare(b.name));
  return out;
}

function roundRobin<T>(items: T[], offset: number, size: number): { slice: T[]; nextOffset: number } {
  if (items.length === 0) return { slice: [], nextOffset: 0 };
  const start = ((offset % items.length) + items.length) % items.length;
  const slice: T[] = [];
  for (let i = 0; i < Math.min(size, items.length); i += 1) {
    slice.push(items[(start + i) % items.length]);
  }
  return { slice, nextOffset: (start + slice.length) % items.length };
}

function macBindLine() {
  return `:do { :foreach i in=[/ip hotspot active find] do={ :local u [/ip hotspot active get $i user]; :local m [/ip hotspot active get $i mac-address]; :if ([:len $u] > 0 && [:len $m] > 0 && [:len [/ip hotspot user find where name=$u comment="HotspotPro"]] > 0) do={ :local cur ""; :do { :set cur [/ip hotspot user get [find where name=$u comment="HotspotPro"] mac-address] } on-error={ }; :if ([:len $cur] = 0) do={ /ip hotspot user set [find where name=$u comment="HotspotPro"] mac-address=$m } } } } on-error={ }`;
}

function emitUsers(users: WantedUser[], pin: boolean, lines: string[]) {
  const profiles = new Set<string>();
  for (const user of users) {
    const name = profileName(user.pkg, user.name);
    if (profiles.has(name)) continue;
    profiles.add(name);
    const seconds = user.pkg ? packageSeconds(user.pkg) : 86400;
    const devices = user.pkg?.devices && user.pkg.devices > 1 ? Math.floor(user.pkg.devices) : 1;
    const limit = `rate-limit=${rate(user.pkg)} shared-users=${devices} session-timeout=0s idle-timeout=none keepalive-timeout=none mac-cookie-timeout=${rosDuration(seconds)} on-logout=hotspotpro-logout`;
    lines.push(`:do { /ip hotspot user profile set [find where name=${quote(name)}] ${limit} } on-error={ }`);
    lines.push(`:do { :if ([:len [/ip hotspot user profile find where name=${quote(name)}]] = 0) do={ /ip hotspot user profile add name=${quote(name)} ${limit} comment="HotspotPro" } } on-error={ }`);
  }
  for (const user of users) {
    const seconds = user.pkg ? packageSeconds(user.pkg) : 86400;
    const cap = (user.pkg ? packageBytes(user.pkg) : 0) ?? 0;
    const uptime = user.limitBy === "data" ? "0s" : rosDuration(seconds);
    const bytes = user.limitBy === "days" ? 0 : cap;
    const limits = `limit-uptime=${uptime} limit-bytes-total=${bytes}`;
    const profile = quote(profileName(user.pkg, user.name));
    const secret = quote(pin ? user.name : user.password || user.name);
    const macSet = user.mac ? ` mac-address=${user.mac}` : "";
    lines.push(
      `:do { :if ([:len [/ip hotspot user find where name=${quote(user.name)}]] = 0) do={ /ip hotspot user add name=${quote(user.name)} password=${secret} profile=${profile} ${limits}${macSet} comment="HotspotPro" } else={ /ip hotspot user set [find where name=${quote(user.name)}] password=${secret} profile=${profile} ${limits}${macSet} disabled=no } } on-error={ }`,
    );
    if (user.mac) {
      const macName = quote(user.mac);
      lines.push(
        `:do { :if ([:len [/ip hotspot user find where name=${macName}]] = 0) do={ /ip hotspot user add name=${macName} password=${macName} profile=${profile} ${limits} mac-address=${user.mac} comment="HotspotPro" } else={ /ip hotspot user set [find where name=${macName}] password=${macName} profile=${profile} ${limits} mac-address=${user.mac} disabled=no } } on-error={ }`,
      );
    }
  }
}

/** Cloud mode clears sync tracking so the next local check-in sends copies again. */
export function forgetLocalUsers(token: string) {
  const file = syncFile();
  if (!file[token]) return;
  delete file[token];
  setState("routerUserSync", file, "server");
}

/**
 * RouterOS lines that upsert a rotating batch of vouchers and drop only codes that
 * are truly gone (not merely outside this batch). Safe for large voucher inventories.
 */
export function localUserLines(token: string, routerIp: string, now = Date.now()): string[] {
  const file = syncFile();
  const row = file[token];
  const previous = row?.codes ?? [];
  const all = wanted(routerIp, now);
  const allCodes = codesOf(all);
  const allDesired = new Set(allCodes);
  // Only remove vouchers that no longer exist in HotspotPro — never remove valid codes
  // just because they are outside the current batch window.
  const remove = previous.filter((code) => !allDesired.has(code)).slice(0, BATCH);
  const missing = all.filter((u) => !previous.includes(u.name));
  const source = missing.length > 0 ? missing : all;
  const { slice: batch, nextOffset } = roundRobin(source, row?.offset ?? 0, BATCH);
  const batchCodes = codesOf(batch);
  const kept = previous.filter((code) => allDesired.has(code));
  const nextCodes = [...new Set([...kept, ...batchCodes])];
  const fullySynced = missing.length === 0 && remove.length === 0 && allCodes.every((code) => previous.includes(code));

  if (!fullySynced || nextCodes.length !== previous.length || nextCodes.some((c, i) => c !== previous[i])) {
    file[token] = { codes: nextCodes, at: now, offset: nextOffset };
    setState("routerUserSync", file, "server");
  }

  if (fullySynced) {
    return ["# HotspotPro local vouchers already in sync", macBindLine()];
  }

  const pin = voucherOnlyLogin(token);
  const lines: string[] = ["# HotspotPro local vouchers (kept on this router; each one has a time limit)"];
  emitUsers(batch, pin, lines);
  for (const code of remove) {
    // Only clear idle expired vouchers. Skip anyone still online.
    lines.push(
      `:do { :if ([:len [/ip hotspot active find where user=${quote(code)}]] = 0) do={ :do { /ip hotspot cookie remove [find where user=${quote(code)}] } on-error={ }; :do { /ip hotspot user remove [find where name=${quote(code)} comment="HotspotPro"] } on-error={ } } } on-error={ }`,
    );
  }
  lines.push(macBindLine());
  return lines;
}

/** Tiny script that ensures one voucher is on the router (portal login) without wiping sync state. */
export function ensureOneLocalUser(token: string, routerIp: string, code: string, now = Date.now()): string[] {
  const name = userName(code);
  if (!name) return [];
  const user = wanted(routerIp, now).find((u) => u.name === name);
  if (!user) return [];
  const file = syncFile();
  const previous = file[token]?.codes ?? [];
  if (!previous.includes(name)) {
    file[token] = {
      codes: [...previous, name, ...(user.mac && !previous.includes(user.mac) ? [user.mac] : [])],
      at: now,
      offset: file[token]?.offset ?? 0,
    };
    setState("routerUserSync", file, "server");
  }
  const lines: string[] = ["# HotspotPro ensure one voucher"];
  emitUsers([user], voucherOnlyLogin(token), lines);
  return lines;
}
