// A small RADIUS server (RFC 2865 / 2866) so MikroTik hotspot routers can ask
// "may this voucher get online, and for how long / how much / how fast?".
//
//  - Access-Request  (UDP 1812): PAP or CHAP login with the voucher code (and
//    password for "credentials" vouchers). The first successful login starts
//    the voucher's clock. The reply carries Session-Timeout (time left),
//    Mikrotik-Total-Limit (data left) and Mikrotik-Rate-Limit (speed), so the
//    ROUTER itself cuts the user off when time or data run out.
//  - Accounting      (UDP 1813): start / interim / stop records add up the
//    data a voucher has used, and keep the dashboard's Active Users in step.
//
// Shared secret: HOTSPOTPRO_RADIUS_SECRET, or a random one created once
// (shown in the router setup script). Ports: HOTSPOTPRO_RADIUS_PORT (1812),
// HOTSPOTPRO_RADIUS_ACCT_PORT (1813); set HOTSPOTPRO_RADIUS=off to disable.

import crypto from "node:crypto";
import dgram from "node:dgram";
import {
  type RadiusSession,
  addUsage, allSessions, getSession, nasKeyOf, noteNas, saveSession, secretFor, sessionsFor,
} from "./store";
import {
  type Pkg, type Vch, findPackageByName, findVoucher, list, packageBytes, packageSeconds, updateVoucher, voucherLimitBy, voucherUsesCalendar,
} from "./packages";
import { forEachTenant, getState, getTenant, listTenants, setState, tenantsForVoucher, withTenant } from "./store";
import { switchedOffRouter } from "./control";
import { limited } from "./limit";
import { accessDecision } from "./accessGate";

export const ACCESS_REQUEST = 1, ACCESS_ACCEPT = 2, ACCESS_REJECT = 3, ACCT_REQUEST = 4, ACCT_RESPONSE = 5;
const A = {
  UserName: 1, UserPassword: 2, ChapPassword: 3, NasIp: 4, FramedIp: 8, ReplyMessage: 18, VendorSpecific: 26,
  SessionTimeout: 27, CalledStation: 30, CallingStation: 31, NasIdentifier: 32, AcctStatusType: 40, AcctInputOctets: 42, AcctOutputOctets: 43,
  AcctSessionId: 44, AcctSessionTime: 46, AcctInputGiga: 52, AcctOutputGiga: 53, ChapChallenge: 60, AcctInterim: 85,
};
const MIKROTIK = 14988;

export function radiusSecret() {
  return process.env.HOTSPOTPRO_RADIUS_SECRET || secretFor("radius", () => crypto.randomBytes(12).toString("hex"));
}

// ---- packet encoding -------------------------------------------------------------

export type Attr = { type: number; value: Buffer };
export type Packet = { code: number; id: number; auth: Buffer; attrs: Attr[] };

export function parsePacket(msg: Buffer): Packet | null {
  if (msg.length < 20) return null;
  const length = msg.readUInt16BE(2);
  if (length < 20 || length > msg.length) return null;
  const attrs: Attr[] = [];
  let i = 20;
  while (i + 2 <= length) {
    const type = msg[i], len = msg[i + 1];
    if (len < 2 || i + len > length) return null;
    attrs.push({ type, value: msg.subarray(i + 2, i + len) });
    i += len;
  }
  return { code: msg[0], id: msg[1], auth: msg.subarray(4, 20), attrs };
}

const attr = (type: number, value: Buffer | string | number) => {
  const v = typeof value === "number" ? Buffer.from([(value >>> 24) & 255, (value >>> 16) & 255, (value >>> 8) & 255, value & 255]) : Buffer.from(value);
  return { type, value: v.subarray(0, 253) } as Attr;
};
const mikrotik = (vtype: number, value: Buffer | string | number) => {
  const v = attr(vtype, value);
  const inner = Buffer.concat([Buffer.from([v.type, v.value.length + 2]), v.value]);
  const vendor = Buffer.alloc(4);
  vendor.writeUInt32BE(MIKROTIK);
  return { type: A.VendorSpecific, value: Buffer.concat([vendor, inner]) } as Attr;
};

export function buildResponse(code: number, request: Packet, attrs: Attr[], secret: string) {
  const body = Buffer.concat(attrs.map((a) => Buffer.concat([Buffer.from([a.type, a.value.length + 2]), a.value])));
  const header = Buffer.alloc(20);
  header[0] = code;
  header[1] = request.id;
  header.writeUInt16BE(20 + body.length, 2);
  request.auth.copy(header, 4);
  const auth = crypto.createHash("md5").update(header).update(body).update(secret).digest();
  auth.copy(header, 4);
  return Buffer.concat([header, body]);
}

const get = (p: Packet, type: number) => p.attrs.find((a) => a.type === type)?.value;
const text = (b?: Buffer) => (b ? b.toString("utf8") : "");

function decodePap(encrypted: Buffer, auth: Buffer, secret: string) {
  const out: Buffer[] = [];
  let prev = auth;
  for (let i = 0; i < encrypted.length; i += 16) {
    const block = encrypted.subarray(i, i + 16);
    const key = crypto.createHash("md5").update(secret).update(prev).digest();
    out.push(Buffer.from(block.map((byte, n) => byte ^ key[n])));
    prev = block;
  }
  return Buffer.concat(out).toString("utf8").replace(/\0+$/, "");
}

// ---- who may log in -----------------------------------------------------------------

export type Decision =
  | { ok: true; seconds: number; bytesLeft: number | null; rate: string; interim: number }
  | { ok: false; reason: string };

const OPEN_WINDOW_MS = 20 * 60 * 1000; // a session not heard from for 20 min no longer counts as "online"

export function usedBytes(username: string) {
  return sessionsFor(username).reduce((sum, s) => sum + s.bytesIn + s.bytesOut, 0);
}

export function openSessions(username: string, now = Date.now()) {
  return sessionsFor(username).filter((s) => !s.stoppedAt && now - Date.parse(s.updatedAt) < OPEN_WINDOW_MS);
}

export function decide(
  voucher: Vch | null,
  proof: (candidates: string[]) => boolean,
  station: string | undefined,
  now = Date.now(),
): Decision {
  if (!voucher) return { ok: false, reason: "Invalid voucher code." };
  const candidates = voucher.password ? [voucher.password] : [voucher.code, ""];
  if (!proof(candidates)) return { ok: false, reason: "Invalid voucher code or password." };
  if (voucher.status === "Expired") return { ok: false, reason: "This voucher has expired." };
  const limitBy = voucherLimitBy(voucher);
  const calendar = voucherUsesCalendar(voucher);
  if (calendar && voucher.expiresAtMs && voucher.expiresAtMs <= now) return { ok: false, reason: "This voucher has expired." };

  const pkg: Pkg | null = findPackageByName(voucher.packageName);
  const total = pkg ? packageSeconds(pkg) : 24 * 3600;
  const expires = calendar ? voucher.expiresAtMs ?? now + total * 1000 : now + (limitBy === "data" ? 30 * 86400 : total) * 1000;
  const seconds = Math.max(1, Math.floor((expires - now) / 1000));

  const cap = limitBy === "days" ? null : pkg ? packageBytes(pkg) : null;
  const used = Math.max(usedBytes(voucher.code), voucher.bytesUsed ?? 0);
  if (cap !== null && used >= cap) return { ok: false, reason: "Your data is finished." };

  const devices = pkg?.devices && pkg.devices > 0 ? pkg.devices : 1;
  const open = openSessions(voucher.code, now);
  const alreadyThisDevice = !!station && open.some((s) => s.callingStation === station);
  if (!alreadyThisDevice && open.length >= devices) return { ok: false, reason: `This voucher is already in use on ${devices} device${devices === 1 ? "" : "s"}.` };

  const mbps = (n: number | undefined) => `${Math.max(1, Math.round((n ?? 5) * 1000))}k`;
  return {
    ok: true,
    seconds,
    bytesLeft: cap === null ? null : cap - used,
    rate: pkg ? `${mbps(pkg.uploadMbps)}/${mbps(pkg.downloadMbps)}` : "5000k/5000k",
    interim: 60,
  };
}

/** First successful login starts the clock. */
function activate(voucher: Vch, now = Date.now()) {
  if (voucher.activatedAtMs) return;
  const pkg = findPackageByName(voucher.packageName);
  const seconds = pkg ? packageSeconds(pkg) : 24 * 3600;
  const calendar = voucherUsesCalendar(voucher);
  updateVoucher(voucher.code, {
    activatedAtMs: now,
    ...(calendar ? { expiresAtMs: now + seconds * 1000 } : {}),
    status: "Used",
    usedAtMs: voucher.usedAtMs ?? now,
  });
}

// ---- dashboard "Active Users" kept in step ---------------------------------------------

type ActiveRow = Record<string, unknown> & { voucherUsername?: string; macAddress?: string };

function fmtBytes(n: number) {
  if (n >= 1024 ** 3) return `${(n / 1024 ** 3).toFixed(2)} GB`;
  return `${(n / 1024 ** 2).toFixed(1)} MB`;
}
function fmtDuration(sec: number) {
  const d = Math.floor(sec / 86400), h = Math.floor((sec % 86400) / 3600), m = Math.floor((sec % 3600) / 60);
  return d ? `${d}d ${h}h` : h ? `${h}h ${m}m` : `${m}m`;
}

function syncActiveUser(session: RadiusSession, online: boolean) {
  const rows = list<ActiveRow>("activeUsers");
  const voucher = findVoucher(session.username);
  const mac = session.callingStation ?? "";
  const without = rows.filter((r) => !(r.voucherUsername === session.username && (r.macAddress ?? "") === mac));
  if (!online) {
    if (without.length !== rows.length) setState("activeUsers", without, "server");
    return;
  }
  const pkg = voucher ? findPackageByName(voucher.packageName) : null;
  const cap = pkg ? packageBytes(pkg) : null;
  const used = usedBytes(session.username);
  const left = voucher?.expiresAtMs ? Math.max(0, Math.floor((voucher.expiresAtMs - Date.now()) / 1000)) : 0;
  const row: ActiveRow = {
    phone: voucher?.redeemerPhone ?? "—",
    package: voucher?.packageName ?? "Unknown",
    accessType: "Hotspot",
    voucherUsername: session.username,
    voucherPassword: voucher?.password ?? "",
    duration: pkg ? fmtDuration(packageSeconds(pkg)) : "—",
    timeSpent: fmtDuration(session.seconds),
    timeLeft: fmtDuration(left),
    dataUsed: fmtBytes(used),
    dataLeft: cap === null ? "Unlimited" : fmtBytes(Math.max(0, cap - used)),
    expiresAt: voucher?.expiresAtMs ? new Date(voucher.expiresAtMs).toISOString().slice(0, 16).replace("T", " ") : "—",
    status: "Active",
    macAddress: mac,
    routerIp: session.routerIp,
    lastSeenMs: Date.now(),
  };
  setState("activeUsers", [row, ...without], "server");
}

// ---- request handling ----------------------------------------------------------------------

/** Which businesses have a voucher with this code? (Codes are random; a clash between two businesses is possible but rare.) */
function businessesWithVoucher(name: string) {
  const found: { id: string; suspended: boolean }[] = [];
  for (const id of tenantsForVoucher(name)) {
    const tenant = getTenant(id);
    if (tenant) found.push({ id: tenant.id, suspended: tenant.status === "suspended" });
  }
  return found;
}

const LOOPBACK = /^(127\.|0\.0\.0\.0|::1$)/;

/** Remember the address a router actually sends RADIUS from, so usage and Disconnect match it after the first session. */
function rememberRouterAddress(source: string, identifier?: string) {
  if (!identifier || !source || LOOPBACK.test(source)) return;
  const value = getState("routers")?.value;
  if (!Array.isArray(value)) return;
  const id = identifier.trim().toLowerCase();
  let changed = false;
  const next = value.map((row) => {
    if (!row || typeof row !== "object") return row;
    const name = String((row as { name?: string }).name ?? "").trim().toLowerCase();
    if (name !== id) return row;
    if ((row as { wanAddress?: string }).wanAddress === source) return row;
    changed = true;
    return { ...(row as Record<string, unknown>), wanAddress: source };
  });
  if (changed) setState("routers", next, "radius");
}

export function handleAccess(request: Packet, source: string, secret: string): Buffer {
  const name = text(get(request, A.UserName)).trim();
  const station = text(get(request, A.CallingStation)) || undefined;
  const reject = (reason: string) => buildResponse(ACCESS_REJECT, request, [attr(A.ReplyMessage, reason)], secret);

  const pap = get(request, A.UserPassword);
  const chap = get(request, A.ChapPassword);
  const proof = (candidates: string[]) => {
    if (pap) return candidates.some((c) => decodePap(pap, request.auth, secret) === c);
    if (chap && chap.length === 17) {
      const challenge = get(request, A.ChapChallenge) ?? request.auth;
      return candidates.some((c) =>
        crypto.createHash("md5").update(chap.subarray(0, 1)).update(c).update(challenge).digest().equals(chap.subarray(1)),
      );
    }
    return false;
  };

  // RADIUS packets don't say which business they belong to, so find the business that issued this voucher.
  const owners = name ? businessesWithVoucher(name) : [];
  if (owners.length === 0) return reject("Invalid voucher code.");
  const owner =
    owners.length === 1
      ? owners[0]
      : owners.find((o) => withTenant(o.id, () => decide(findVoucher(name), proof, station).ok)) ?? owners[0];
  if (owner.suspended) return reject("This service is currently suspended. Contact the provider.");
  return withTenant(owner.id, () => serveAccess(request, source, secret, name, station, proof, reject));
}

function serveAccess(
  request: Packet, source: string, secret: string, name: string, station: string | undefined,
  proof: (candidates: string[]) => boolean, reject: (reason: string) => Buffer,
): Buffer {
  if (accessDecision().locked) return reject("This network is locked until online access is renewed.");
  // Internet switched off for this whole router: nobody new gets online through it.
  const nasIpRaw = get(request, A.NasIp);
  const off = switchedOffRouter(source, text(get(request, A.NasIdentifier)).trim() || undefined, nasIpRaw?.length === 4 ? [...nasIpRaw].join(".") : undefined);
  if (off) return reject("Internet is switched off on this router.");

  const voucher = name ? findVoucher(name) : null;
  const decision = decide(voucher, proof, station);
  if (!decision.ok) return reject(decision.reason);

  activate(voucher!);
  const attrs: Attr[] = [
    attr(A.SessionTimeout, decision.seconds),
    attr(A.AcctInterim, decision.interim),
    mikrotik(8, decision.rate),
  ];
  if (decision.bytesLeft !== null) {
    const bytes = Math.max(1, decision.bytesLeft);
    attrs.push(mikrotik(17, bytes % 2 ** 32));
    attrs.push(mikrotik(18, Math.floor(bytes / 2 ** 32)));
  }
  attrs.push(attr(A.ReplyMessage, "Welcome"));
  void source;
  return buildResponse(ACCESS_ACCEPT, request, attrs, secret);
}

export function handleAccounting(request: Packet, source: string): void {
  const sessionId = text(get(request, A.AcctSessionId));
  const user = text(get(request, A.UserName)).trim();
  if (!sessionId || !user) return;
  // The voucher's business owns the session. Fall back to a scan only when the code is already gone
  // (the customer is still online) so a stop record is not dropped.
  const key = `${source}|${sessionId}`;
  const owners = businessesWithVoucher(user);
  let tenantId: string | null = null;
  if (owners.length === 1) tenantId = owners[0].id;
  else if (owners.length > 1) tenantId = owners.find((o) => withTenant(o.id, () => !!getSession(key)))?.id ?? owners[0].id;
  if (!tenantId) {
    forEachTenant((t) => { if (!tenantId && getSession(key)) tenantId = t.id; }, { includeSuspended: true });
  }
  if (!tenantId || !getTenant(tenantId)) return; // unknown voucher and no known session: not ours to record
  withTenant(tenantId, () => recordAccounting(request, source));
}

function recordAccounting(request: Packet, source: string): void {
  const status = get(request, A.AcctStatusType)?.readUInt32BE(0);
  const id = text(get(request, A.AcctSessionId));
  const username = text(get(request, A.UserName)).trim();
  if (!id || !username) return;
  const int = (t: number) => get(request, t)?.readUInt32BE(0) ?? 0;
  const bytesIn = int(A.AcctInputOctets) + int(A.AcctInputGiga) * 2 ** 32;
  const bytesOut = int(A.AcctOutputOctets) + int(A.AcctOutputGiga) * 2 ** 32;
  const nowMs = Date.now();
  const now = new Date(nowMs).toISOString();
  const key = `${source}|${id}`;
  const previous = getSession(key);
  const nasIdentifier = text(get(request, A.NasIdentifier)).trim() || undefined;
  const nasIpAttr = get(request, A.NasIp);
  const nasIp = nasIpAttr?.length === 4 ? [...nasIpAttr].join(".") : undefined;
  const session: RadiusSession = {
    id: key,
    username,
    routerIp: source,
    nasIdentifier,
    nasIp,
    startedAt: previous?.startedAt ?? now,
    updatedAt: now,
    bytesIn: status === 1 ? previous?.bytesIn ?? 0 : bytesIn,
    bytesOut: status === 1 ? previous?.bytesOut ?? 0 : bytesOut,
    seconds: int(A.AcctSessionTime),
    callingStation: text(get(request, A.CallingStation)) || previous?.callingStation,
    framedIp: get(request, A.FramedIp)?.length === 4 ? [...get(request, A.FramedIp)!].join(".") : previous?.framedIp,
  };
  if (status === 2) session.stoppedAt = now;

  // Per-router data usage: how much was used since the last record of this session, added to the current hour.
  // (A counter that went DOWN means the router restarted the session, so the new value is all new data.)
  const prevIn = previous?.bytesIn ?? 0, prevOut = previous?.bytesOut ?? 0;
  const dIn = session.bytesIn >= prevIn ? session.bytesIn - prevIn : session.bytesIn;
  const dOut = session.bytesOut >= prevOut ? session.bytesOut - prevOut : session.bytesOut;
  const nasKey = nasKeyOf(source, nasIdentifier);
  noteNas(nasKey, { source, identifier: nasIdentifier, ip: nasIp, lastSeen: now });
  rememberRouterAddress(source, nasIdentifier);
  addUsage(nasKey, nowMs, dOut, dIn, previous ? 0 : 1);
  const elapsed = previous ? Math.max(0, (nowMs - Date.parse(previous.updatedAt)) / 1000) : 0;
  if (previous && elapsed >= 1 && status !== 1) {
    session.rateDown = dOut / elapsed;
    session.rateUp = dIn / elapsed;
  } else if (previous) {
    session.rateDown = previous.rateDown;
    session.rateUp = previous.rateUp;
  }
  if (status === 2) { session.rateDown = 0; session.rateUp = 0; }
  saveSession(session);

  if (status === 1 || status === 3) syncActiveUser(session, true);
  if (status === 2) {
    syncActiveUser(session, false);
    const used = usedBytes(username);
    const voucher = findVoucher(username);
    if (voucher) {
      const pkg = findPackageByName(voucher.packageName);
      const cap = voucherLimitBy(voucher) === "days" ? null : pkg ? packageBytes(pkg) : null;
      updateVoucher(username, { bytesUsed: used, ...(cap !== null && used >= cap ? { status: "Expired" as const } : {}) });
    }
  }
}

// ---- UDP server ------------------------------------------------------------------------------

type Holder = { auth?: dgram.Socket; acct?: dgram.Socket };
const g = globalThis as unknown as { __hotspotproRadius?: Holder };

export function startRadius() {
  if (g.__hotspotproRadius || process.env.HOTSPOTPRO_RADIUS === "off") return;
  const holder: Holder = (g.__hotspotproRadius = {});
  const authPort = Number(process.env.HOTSPOTPRO_RADIUS_PORT || 1812);
  const acctPort = Number(process.env.HOTSPOTPRO_RADIUS_ACCT_PORT || 1813);
  const secret = radiusSecret();

  function open(kind: "auth" | "acct", port: number) {
    const socket = dgram.createSocket("udp4");
    socket.on("error", (error) => {
      console.error(`[hotspotpro] RADIUS ${kind} could not start on UDP ${port}: ${(error as Error).message}`);
      socket.close();
    });
    socket.on("message", (msg, rinfo) => {
      try {
        const packet = parsePacket(msg);
        if (!packet) return;
        if (kind === "auth" && packet.code === ACCESS_REQUEST) {
          // One router shares one source address for every customer, so the cap is per router, not per phone.
          if (limited(`radius|${rinfo.address}`, 200, 10_000)) {
            socket.send(buildResponse(ACCESS_REJECT, packet, [attr(A.ReplyMessage, "Too many attempts. Wait a moment.")], secret), rinfo.port, rinfo.address);
            return;
          }
          socket.send(handleAccess(packet, rinfo.address, secret), rinfo.port, rinfo.address);
        } else if (kind === "acct" && packet.code === ACCT_REQUEST) {
          // Verify the Request Authenticator so strangers can't forge usage records.
          const zeroed = Buffer.from(msg.subarray(0, msg.readUInt16BE(2)));
          Buffer.alloc(16).copy(zeroed, 4);
          const expected = crypto.createHash("md5").update(zeroed).update(secret).digest();
          if (!expected.equals(packet.auth)) return;
          handleAccounting(packet, rinfo.address);
          socket.send(buildResponse(ACCT_RESPONSE, packet, [], secret), rinfo.port, rinfo.address);
        }
      } catch (error) {
        console.error("[hotspotpro] RADIUS error:", error);
      }
    });
    socket.on("listening", () => console.log(`[hotspotpro] RADIUS ${kind} listening on UDP ${port}`));
    socket.bind(port);
    holder[kind] = socket;
  }
  open("auth", authPort);
  open("acct", acctPort);
}

export function liveSessionCount() {
  return forEachTenant(
    () => allSessions().filter((s) => !s.simulated && !s.stoppedAt && Date.now() - Date.parse(s.updatedAt) < OPEN_WINDOW_MS).length,
    { includeSuspended: true },
  ).reduce((a, b) => a + b, 0);
}
void listTenants;
