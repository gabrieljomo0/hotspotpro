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

/** WinBox → User Profiles name: prefer the package title (Daily, Weekly…), not a cryptic id.
 * Also used as Mikrotik-Group in Access-Accept (HotSpot default profile for RADIUS users). */
export function profileName(pkg: Pkg | null, fallback: string) {
  const raw = (pkg?.name || fallback)
    .replace(/[^A-Za-z0-9 _-]/g, "")
    .replace(/\s+/g, " ")
    .trim()
    .slice(0, 32);
  if (!raw) return "HotspotPro";
  // MikroTik profile names should start with a letter.
  return /^[A-Za-z]/.test(raw) ? raw : (`P${raw}`).slice(0, 32);
}

function rate(pkg: Pkg | null) {
  const kbps = (n: number | undefined) => `${Math.max(1, Math.round((n ?? 5) * 1000))}k`;
  return `${kbps(pkg?.uploadMbps)}/${kbps(pkg?.downloadMbps)}`;
}

type SyncRow = {
  codes: string[];
  at: number;
  offset?: number;
  /** Fingerprint of what was last sent per voucher, so edits (password, package, limits, MAC) are re-sent. */
  sigs?: Record<string, string>;
  /** Codes waiting to be removed from the router → first attempt (ms). Retried while the user is still online. */
  removing?: Record<string, number>;
  /** Last time removal lines were sent (retries are spaced out, not sent every 10s check-in). */
  removeAt?: number;
};

/** Spacing between removal retries. */
const REMOVE_EVERY_MS = 5 * 60_000;

/** How long a removal is retried before giving up (the voucher's own limits end the session anyway). */
const REMOVE_RETRY_MS = 3 * 86400_000;
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
  const label = (pkg?.name || fallbackName || name).replace(/[\\"$\r\n]/g, "").slice(0, 48);
  const q = quote(name);
  // Stepwise create/set — a single long `add` with every property fails silently on some ROS
  // builds (unknown attr → whole add aborted → User Profiles stays empty except default).
  lines.push(`:do { :if ([:len [/ip hotspot user profile find where name=${q}]] = 0) do={ /ip hotspot user profile add name=${q} comment="HotspotPro:${label}"; :put ("HotspotPro: User Profile " . ${q} . " created") } } on-error={ :log warning ("HotspotPro: User Profile add failed for " . ${q}) }`);
  lines.push(`:do { /ip hotspot user profile set [find where name=${q}] rate-limit=${rate(pkg)} } on-error={ }`);
  lines.push(`:do { /ip hotspot user profile set [find where name=${q}] shared-users=${devices} } on-error={ }`);
  lines.push(`:do { /ip hotspot user profile set [find where name=${q}] session-timeout=0s } on-error={ }`);
  lines.push(`:do { /ip hotspot user profile set [find where name=${q}] idle-timeout=none } on-error={ }`);
  lines.push(`:do { /ip hotspot user profile set [find where name=${q}] keepalive-timeout=none } on-error={ }`);
  lines.push(`:do { /ip hotspot user profile set [find where name=${q}] mac-cookie-timeout=${rosDuration(seconds)} } on-error={ }`);
  lines.push(`:do { /ip hotspot user profile set [find where name=${q}] comment="HotspotPro:${label}" } on-error={ }`);
  lines.push(`:do { /ip hotspot user profile set [find where name=${q}] on-logout=hotspotpro-logout } on-error={ }`);
  return name;
}

/**
 * Remove User Profiles HotspotPro made for packages that are gone from the site.
 * Only profiles with a "HotspotPro:" comment are touched (never default or the owner's own), and a
 * profile a hotspot user on the router still points at is kept until that user is gone.
 * Callers skip this when the site has no packages, so a missing package list never empties the router.
 */
function staleProfileCleanupLine(keep: string[]) {
  const list = keep.map(quote).join(";");
  return `:do { :local hpKeep {${list}}; :foreach p in=[/ip hotspot user profile find where comment~"^HotspotPro:"] do={ :local n [/ip hotspot user profile get $p name]; :if ([:typeof [:find $hpKeep $n]] = "nil" && [:len [/ip hotspot user find where profile=$n]] = 0) do={ :do { /ip hotspot user profile remove $p; :put ("HotspotPro: removed User Profile " . $n . " (package deleted on the site)") } on-error={ } } } } on-error={ }`;
}

/** Push Hotspot user profiles for every active package on this router (WinBox → User Profiles). */
function emitPackageProfiles(routerIp: string, lines: string[]) {
  // Active + Hidden both need User Profiles (Hidden still sells via vouchers/agents).
  const active = list<Pkg>("packages").filter(
    (pkg) => pkg && (!pkg.status || pkg.status === "Active" || pkg.status === "Hidden"),
  );
  let pkgs = active.filter((pkg) => routerAllowsPackage(pkg, routerIp));
  // After pending-* → linked-*, scoped packages can miss the new id — still show packages in WinBox.
  if (pkgs.length === 0 && active.length > 0) pkgs = active;
  // Prefer every usable package on check-in so User Profiles is never empty when the site has packages.
  if (active.length > pkgs.length) pkgs = active;
  const seen = new Set<string>();
  for (const pkg of pkgs) {
    const name = profileName(pkg, pkg.name || pkg.id || "default");
    if (seen.has(name)) continue;
    seen.add(name);
    emitProfile(pkg, pkg.name || pkg.id || "default", lines);
  }
  if (seen.size > 0) {
    lines.push(`:put ("HotspotPro: ${seen.size} package profile(s) on this router")`);
    lines.push(staleProfileCleanupLine([...seen]));
  }
  // Prove to the log / job output how many HotspotPro profiles actually exist after the push.
  lines.push(
    `:do { :local n [:len [/ip hotspot user profile find where comment~"HotspotPro"]]; :put ("HotspotPro: WinBox User Profiles with HotspotPro comment = " . $n) } on-error={ :put "HotspotPro: could not count User Profiles — is the hotspot package installed?" }`,
  );
}

/**
 * RouterOS lines that create/update one User Profile per package.
 * Always safe to run (local or cloud RADIUS) — WinBox → Hotspot → User Profiles.
 */
export function packageProfileLines(routerIp: string): string[] {
  const lines: string[] = ["# HotspotPro packages → Hotspot User Profiles"];
  emitPackageProfiles(routerIp || "", lines);
  if (lines.length === 1) {
    lines.push(`:put "HotspotPro: no packages yet — create a package on the site to fill User Profiles"`);
  }
  return lines;
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
/** Everything emitUsers writes for one voucher. A change means the router copy is stale. */
function userSig(user: WantedUser, pin: boolean) {
  const seconds = user.pkg ? packageSeconds(user.pkg) : 86400;
  const cap = (user.pkg ? packageBytes(user.pkg) : 0) ?? 0;
  return [
    pin ? user.name : user.password || user.name,
    profileName(user.pkg, user.name),
    user.limitBy === "data" ? "0s" : rosDuration(seconds),
    user.limitBy === "days" ? 0 : cap,
    user.mac,
  ].join("|");
}

export function localUserLines(token: string, routerIp: string, now = Date.now()): string[] {
  const file = syncFile();
  const row = file[token];
  const previous = row?.codes ?? [];
  const prevSigs = row?.sigs ?? {};
  const pin = voucherOnlyLogin(token);
  const all = wanted(routerIp, now);
  const allCodes = codesOf(all);
  const allDesired = new Set(allCodes);

  // Removals: codes that left HotspotPro. The router skips a user who is still online, and it cannot
  // tell us, so keep retrying for REMOVE_RETRY_MS instead of forgetting the code after one try
  // (which left deleted vouchers usable on the router forever).
  const removing: Record<string, number> = {};
  for (const [code, first] of Object.entries(row?.removing ?? {})) {
    if (!allDesired.has(code) && now - first < REMOVE_RETRY_MS) removing[code] = first;
  }
  let fresh = false;
  for (const code of previous) {
    if (!allDesired.has(code) && !(code in removing)) {
      removing[code] = now;
      fresh = true;
    }
  }
  const sendRemovals = fresh || now - (row?.removeAt ?? 0) >= REMOVE_EVERY_MS;
  const remove = sendRemovals ? Object.keys(removing).slice(0, BATCH) : [];
  const removeAt = remove.length > 0 ? now : row?.removeAt;

  // Missing = not on the router yet, or changed since it was sent.
  const sigs: Record<string, string> = {};
  for (const user of all) sigs[user.name] = userSig(user, pin);
  const missing = all.filter((u) => !previous.includes(u.name) || prevSigs[u.name] !== sigs[u.name]);
  const source = missing.length > 0 ? missing : all;
  const { slice: batch, nextOffset } = roundRobin(source, row?.offset ?? 0, BATCH);
  const batchCodes = codesOf(batch);
  const kept = previous.filter((code) => allDesired.has(code));
  const nextCodes = [...new Set([...kept, ...batchCodes])];
  const fullySynced = missing.length === 0 && allCodes.every((code) => previous.includes(code));

  // Only what was actually sent counts as synced; the rest keeps its old fingerprint.
  const nextSigs: Record<string, string> = {};
  for (const name of Object.keys(sigs)) if (prevSigs[name] !== undefined) nextSigs[name] = prevSigs[name];
  if (!fullySynced) for (const user of batch) nextSigs[user.name] = sigs[user.name];

  const changed =
    !fullySynced ||
    nextCodes.length !== previous.length ||
    nextCodes.some((c, i) => c !== previous[i]) ||
    JSON.stringify(removing) !== JSON.stringify(row?.removing ?? {}) ||
    removeAt !== row?.removeAt ||
    Object.keys(nextSigs).length !== Object.keys(prevSigs).length;
  if (changed) {
    file[token] = { codes: nextCodes, at: now, offset: nextOffset, sigs: nextSigs, removing, removeAt };
    setState("routerUserSync", file, "server");
  }

  const lines: string[] = fullySynced
    ? ["# HotspotPro local vouchers already in sync"]
    : ["# HotspotPro local vouchers (kept on this router; each one has a time limit)"];
  // Package profiles always refresh so WinBox User Profiles stay in step after package edits.
  emitPackageProfiles(routerIp, lines);
  if (!fullySynced) emitUsers(batch, pin, lines);
  for (const code of remove) {
    // Only clear idle vouchers. Anyone still online is retried on a later check-in.
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
  // No `host remove [find where authorized=no]`: MAC login is off, and wiping hosts resets the CHAP
  // challenge of every other phone that is on the login page, so their vouchers bounce.
  lines.push(`:put ("HotspotPro: voucher " . ${quote(user.name)} . " is on the router for login")`);
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
    // Password must match the login ticket / hp-go.html (do not overwrite with PIN-only secret).
    const matchTicket =
      ticket &&
      (ticket.username === userName(code) || ticket.username.toLowerCase() === code.trim().toLowerCase());
    const part = ensureOneLocalUser(token, routerIp, code, now, {
      password: matchTicket ? ticket.password : undefined,
    });
    if (part.length > 1) {
      lines.push(...part);
      done.push(userName(code));
    }
  }
  // Soft fetch on check-in — hard :error would abort packages/jobs for the whole poll.
  if (origin && ticket) lines.push(...autoLoginFetchLines(origin, token, ticket.id, false));
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
