// Push voucher logins onto the MikroTik itself (/ip hotspot user).
// The router then accepts those codes even when it cannot reach this server.
// Every user gets a finite uptime and speed from its package, so a local
// login cannot stay online forever. Local mode does not ask the cloud.

import { voucherOnlyLogin } from "./hotspotPages";
import { autoLoginFetchLines, latestTicketForToken } from "./portalLogin";
import { getState, setState } from "./store";
import { type Pkg, type Vch, findPackageByName, findVoucher, list, normalizeMac, packageBytes, packageSeconds, routerAllowsPackage, voucherAllowedOnRouter, voucherCountFrom, voucherLimitBy } from "./packages";

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

/** WinBox → User Profiles name: prefer the package title (Daily, Weekly…), not a cryptic id. */
function profileName(pkg: Pkg | null, fallback: string) {
  const raw = (pkg?.name || fallback)
    .replace(/[^A-Za-z0-9]/g, "")
    .slice(0, 15);
  if (!raw) return "HotspotPro";
  return /^[A-Za-z]/.test(raw) ? raw.slice(0, 16) : (`P${raw}`).slice(0, 16);
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

function emitProfile(pkg: Pkg | null, fallbackName: string, lines: string[]) {
  const name = profileName(pkg, fallbackName);
  const seconds = pkg ? packageSeconds(pkg) : 86400;
  const devices = pkg?.devices && pkg.devices > 1 ? Math.floor(pkg.devices) : 1;
  // Create without on-logout first — if the logout script is missing, the whole add used to fail
  // and User Profiles stayed empty (only "default").
  const limit = `rate-limit=${rate(pkg)} shared-users=${devices} session-timeout=0s idle-timeout=none keepalive-timeout=none mac-cookie-timeout=${rosDuration(seconds)}`;
  const label = (pkg?.name || fallbackName || name).replace(/[\\"$\r\n]/g, "").slice(0, 48);
  lines.push(
    `:do { :if ([:len [/ip hotspot user profile find where name=${quote(name)}]] = 0) do={ /ip hotspot user profile add name=${quote(name)} ${limit} comment="HotspotPro:${label}" } else={ /ip hotspot user profile set [find where name=${quote(name)}] ${limit} comment="HotspotPro:${label}" } } on-error={ }`,
  );
  lines.push(`:do { /ip hotspot user profile set [find where name=${quote(name)}] on-logout=hotspotpro-logout } on-error={ }`);
  return name;
}

/** Push Hotspot user profiles for every active package on this router (WinBox → User Profiles). */
function emitPackageProfiles(routerIp: string, lines: string[]) {
  const active = list<Pkg>("packages").filter((pkg) => pkg && (!pkg.status || pkg.status === "Active"));
  let pkgs = active.filter((pkg) => routerAllowsPackage(pkg, routerIp));
  // After pending-* → linked-*, scoped packages can miss the new id — still show packages in WinBox.
  if (pkgs.length === 0 && active.length > 0) pkgs = active;
  const seen = new Set<string>();
  for (const pkg of pkgs) {
    const name = profileName(pkg, pkg.name || pkg.id || "default");
    if (seen.has(name)) continue;
    seen.add(name);
    emitProfile(pkg, pkg.name || pkg.id || "default", lines);
  }
}

function emitUsers(users: WantedUser[], pin: boolean, lines: string[]) {
  const profiles = new Set<string>();
  for (const user of users) {
    const name = profileName(user.pkg, user.name);
    if (profiles.has(name)) continue;
    profiles.add(name);
    emitProfile(user.pkg, user.name, lines);
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
    // Still refresh package profiles so WinBox User Profiles stay in step after package edits.
    const refresh: string[] = ["# HotspotPro local vouchers already in sync"];
    emitPackageProfiles(routerIp, refresh);
    refresh.push(macBindLine());
    return refresh;
  }

  const pin = voucherOnlyLogin(token);
  const lines: string[] = ["# HotspotPro local vouchers (kept on this router; each one has a time limit)"];
  emitPackageProfiles(routerIp, lines);
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

type PortalPushFile = Record<string, { codes: string[]; at: number; waves?: number }>;

function portalPushFile(): PortalPushFile {
  const value = getState("portalPush")?.value;
  if (!value || typeof value !== "object" || Array.isArray(value)) return {};
  return value as PortalPushFile;
}

/** Remember a voucher that must be upserted on the next check-ins (portal Connect). */
export function queuePortalPush(token: string, code: string, now = Date.now()) {
  const name = userName(code);
  if (!token || !name) return;
  const file = portalPushFile();
  for (const [key, entry] of Object.entries(file)) {
    if (now - (entry.at || 0) > 10 * 60_000) delete file[key];
  }
  const row = file[token] ?? { codes: [], at: now, waves: 0 };
  if (!row.codes.includes(name)) row.codes.push(name);
  row.at = now;
  row.waves = 0;
  file[token] = { codes: row.codes.slice(-40), at: row.at, waves: 0 };
  setState("portalPush", file, "server");
}

export function portalPushCodes(token: string, now = Date.now()): string[] {
  const row = portalPushFile()[token];
  if (!row || now - (row.at || 0) > 10 * 60_000) return [];
  return row.codes.filter(Boolean);
}

export function clearPortalPush(token: string, codes: string[]) {
  if (!codes.length) return;
  const file = portalPushFile();
  const row = file[token];
  if (!row) return;
  const drop = new Set(codes);
  row.codes = row.codes.filter((c) => !drop.has(c));
  if (row.codes.length === 0) delete file[token];
  else file[token] = row;
  setState("portalPush", file, "server");
}

/**
 * RouterOS lines that upsert one voucher now (portal Connect / check-in inject).
 * Uses profile=default so Connect does not depend on a package User Profile existing yet.
 * Optional password override must match the portal ticket / hp-go.html credentials.
 */
export function ensureOneLocalUser(
  token: string,
  routerIp: string,
  code: string,
  now = Date.now(),
  opts?: { password?: string; origin?: string; ticketId?: string },
): string[] {
  const name = userName(code);
  if (!name) return [];
  let user = wanted(routerIp, now).find((u) => u.name === name);
  if (!user) {
    // Portal already validated this voucher — still push even if batch/router scope filtering skipped it in wanted().
    const voucher = findVoucher(code) || findVoucher(name);
    if (!voucher || voucher.status === "Expired") return [];
    if (voucher.expiresAtMs && voucher.expiresAtMs <= now) return [];
    user = {
      name,
      password: voucher.password || voucher.code || name,
      pkg: findPackageByName(voucher.packageName),
      limitBy: voucherLimitBy(voucher),
      countFrom: voucherCountFrom(voucher),
      mac: normalizeMac(voucher.boundMac),
      rank: 0,
    };
  }
  const pin = voucherOnlyLogin(token);
  const secret = quote(opts?.password || (pin ? user.name : user.password || user.name));
  const seconds = user.pkg ? packageSeconds(user.pkg) : 86400;
  const cap = (user.pkg ? packageBytes(user.pkg) : 0) ?? 0;
  const uptime = user.limitBy === "data" ? "0s" : rosDuration(seconds);
  const bytes = user.limitBy === "days" ? 0 : cap;
  const limits = `limit-uptime=${uptime} limit-bytes-total=${bytes}`;
  const macSet = user.mac ? ` mac-address=${user.mac}` : "";
  const lines: string[] = ["# HotspotPro ensure one voucher (Connect)"];
  // Package profile when possible (speed limits); login still works on default if it is missing.
  if (user.pkg) emitProfile(user.pkg, user.name, lines);
  const profile = user.pkg ? quote(profileName(user.pkg, user.name)) : `"default"`;
  lines.push(
    `:do { :if ([:len [/ip hotspot user find where name=${quote(user.name)}]] = 0) do={ /ip hotspot user add name=${quote(user.name)} password=${secret} profile=${profile} ${limits}${macSet} comment="HotspotPro" } else={ /ip hotspot user set [find where name=${quote(user.name)}] password=${secret} profile=${profile} ${limits}${macSet} disabled=no } } on-error={ }`,
  );
  // If the package profile is missing, fall back so /login still accepts the voucher.
  lines.push(
    `:do { :if ([:len [/ip hotspot user profile find where name=${profile}]] = 0) do={ /ip hotspot user set [find where name=${quote(user.name)}] profile=default } } on-error={ }`,
  );
  lines.push(`:do { /ip hotspot cookie remove [find where user=${quote(user.name)}] } on-error={ }`);
  if (opts?.origin && opts?.ticketId) {
    lines.push(...autoLoginFetchLines(opts.origin, token, opts.ticketId));
  }
  return lines;
}

/** Inline into the check-in script so Connect does not depend on a separate job download. */
export function portalPushLines(token: string, routerIp: string, origin?: string, now = Date.now()): string[] {
  const codes = portalPushCodes(token, now);
  const ticket = latestTicketForToken(token);
  if (codes.length === 0 && !ticket) return [];
  const lines: string[] = ["# HotspotPro portal push (Connect)"];
  const done: string[] = [];
  for (const code of codes) {
    const part = ensureOneLocalUser(token, routerIp, code, now);
    if (part.length > 1) {
      lines.push(...part);
      done.push(userName(code));
    }
  }
  // Download HTTP auto-login page so the phone can leave HTTPS and POST on the gateway.
  if (origin && ticket) lines.push(...autoLoginFetchLines(origin, token, ticket.id));
  // Re-emit on two check-ins so a flaky import still lands the user, then clear.
  const file = portalPushFile();
  const row = file[token];
  if (row) {
    row.waves = (row.waves || 0) + 1;
    if (row.waves >= 2 && done.length) clearPortalPush(token, done);
    else {
      file[token] = row;
      setState("portalPush", file, "server");
    }
  }
  return lines;
}
