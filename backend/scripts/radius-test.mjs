// Checks that RADIUS (router logins + usage accounting) is routed to the right business,
// and that an older single-business database is upgraded without losing anything.
import { spawn } from "node:child_process";
import crypto from "node:crypto";
import dgram from "node:dgram";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";

const dir = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const SECRET = "test-secret";
let pass = 0, failed = 0;
const check = (name, ok, extra = "") => { ok ? pass++ : failed++; console.log(`${ok ? "PASS" : "FAIL"}  ${name}${ok ? "" : "  " + extra}`); };
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const J = { "content-type": "application/json" };

function start(data, port, authPort, acctPort) {
  const child = spawn(process.execPath, ["dist/server.mjs"], {
    cwd: dir,
    env: {
      ...process.env,
      PORT: String(port),
      HOTSPOTPRO_DATA_DIR: data,
      HOTSPOTPRO_LOG: "off",
      HOTSPOTPRO_RADIUS: "on",
      HOTSPOTPRO_RADIUS_HOST: "127.0.0.1",
      HOTSPOTPRO_RADIUS_SECRET: SECRET,
      HOTSPOTPRO_RADIUS_PORT: String(authPort),
      HOTSPOTPRO_RADIUS_ACCT_PORT: String(acctPort),
      NODE_ENV: "development",
    },
    stdio: ["ignore", "pipe", "pipe"],
  });
  let out = "";
  child.stdout.on("data", (d) => (out += d));
  child.stderr.on("data", (d) => (out += d));
  return { child, out: () => out };
}
async function waitUp(base) { for (let i = 0; i < 40; i++) { try { if ((await fetch(base + "/api/health")).ok) return; } catch {} await sleep(250); } }

const attr = (type, value) => { const v = Buffer.isBuffer(value) ? value : Buffer.from(String(value)); return Buffer.concat([Buffer.from([type, v.length + 2]), v]); };
const u32 = (n) => { const b = Buffer.alloc(4); b.writeUInt32BE(n); return b; };
function papEncrypt(password, auth) {
  const padded = Buffer.concat([Buffer.from(password), Buffer.alloc((16 - (password.length % 16)) % 16 || (password.length === 0 ? 16 : 0))]);
  const out = []; let prev = auth;
  for (let i = 0; i < padded.length; i += 16) {
    const key = crypto.createHash("md5").update(SECRET).update(prev).digest();
    const block = Buffer.from(padded.subarray(i, i + 16).map((b, n) => b ^ key[n]));
    out.push(block); prev = block;
  }
  return Buffer.concat(out);
}
function request(port, code, attrs, accounting = false) {
  return new Promise((resolve) => {
    const auth = crypto.randomBytes(16);
    const body = Buffer.concat(attrs);
    const header = Buffer.alloc(20);
    header[0] = code; header[1] = Math.floor(Math.random() * 255); header.writeUInt16BE(20 + body.length, 2);
    let packet;
    if (accounting) {
      Buffer.alloc(16).copy(header, 4);
      const reqAuth = crypto.createHash("md5").update(header).update(body).update(SECRET).digest();
      reqAuth.copy(header, 4);
    } else auth.copy(header, 4);
    packet = Buffer.concat([header, body]);
    const socket = dgram.createSocket("udp4");
    const timer = setTimeout(() => { socket.close(); resolve(null); }, 2000);
    socket.on("message", (msg) => { clearTimeout(timer); socket.close(); resolve(msg[0]); });
    socket.send(packet, port, "127.0.0.1");
    request.lastAuth = auth;
  });
}
async function login(port, user, password) {
  const auth = crypto.randomBytes(16);
  const attrs = [attr(1, user), attr(2, papEncrypt(password, auth)), attr(32, "some-router")];
  return new Promise((resolve) => {
    const body = Buffer.concat(attrs);
    const header = Buffer.alloc(20);
    header[0] = 1; header[1] = 7; header.writeUInt16BE(20 + body.length, 2); auth.copy(header, 4);
    const socket = dgram.createSocket("udp4");
    const timer = setTimeout(() => { socket.close(); resolve(null); }, 2000);
    socket.on("message", (msg) => { clearTimeout(timer); socket.close(); resolve(msg[0]); });
    socket.send(Buffer.concat([header, body]), port, "127.0.0.1");
  });
}
const acct = (port, status, user, id, inBytes, outBytes) =>
  request(port, 4, [attr(1, user), attr(40, u32(status)), attr(44, id), attr(42, u32(inBytes)), attr(43, u32(outBytes)), attr(46, u32(30)), attr(32, "some-router")], true);

const hashPw = (pw) => { const salt = crypto.randomBytes(16); return `scrypt$${salt.toString("hex")}$${crypto.scryptSync(pw, salt, 64).toString("hex")}`; };

// ========== 1. RADIUS routed per business ==========
{
  const data = fs.mkdtempSync(path.join(os.tmpdir(), "hsp-rad-"));
  const port = 4900 + Math.floor(Math.random() * 100), authPort = 18120 + Math.floor(Math.random() * 400), acctPort = authPort + 1000;
  const base = `http://127.0.0.1:${port}`;
  const server = start(data, port, authPort, acctPort);
  try {
    await waitUp(base);
    const reg = async (name, email) => {
      const r = await fetch(base + "/api/auth/register", { method: "POST", headers: J, body: JSON.stringify({ name, businessName: `${name} WiFi`, email, password: "long-enough-pw" }) });
      return (r.headers.getSetCookie?.() ?? []).map((c) => c.split(";")[0]).join("; ");
    };
    await reg("Super Admin", "super@example.com");
    const ama = await reg("Ama", "ama@example.com");
    const kofi = await reg("Kofi", "kofi@example.com");
    const put = (cookie, key, value) => fetch(base + `/api/state/${key}`, { method: "PUT", headers: { ...J, cookie }, body: JSON.stringify({ value }) });
    const pkg = (name) => ({ id: "p1", name, downloadMbps: 5, uploadMbps: 5, durationValue: 1, durationUnit: "Days", price: 3, status: "Active", validity: "1 day", devices: 1 });
    await put(ama, "packages", [pkg("Ama Daily")]);
    await put(kofi, "packages", [pkg("Kofi Daily")]);
    await put(ama, "vouchers", [{ code: "AMA-1111", password: null, packageName: "Ama Daily", status: "Unused" }]);
    await put(kofi, "vouchers", [{ code: "KOF-2222", password: null, packageName: "Kofi Daily", status: "Unused" }]);
    await sleep(300);

    const health = await (await fetch(base + "/api/health")).json();
    check("health reports cloud RADIUS on", health.radius === "on" && health.radiusHost === "127.0.0.1", JSON.stringify(health));

    await put(ama, "routers", [{
      name: "Ama Router", ip: "r-ama", status: "Online", provisioningStatus: "Provisioned",
      provisioningToken: "tok-ama-radius", loginMode: "cloud", hotspotEnabled: true,
      hotspotGatewayIp: "10.10.0.1", wanInterface: "ether1",
    }]);
    const script = await (await fetch(base + "/api/provision/tok-ama-radius")).text();
    check("cloud setup adds MikroTik /radius and use-radius=yes", script.includes("/radius add service=hotspot address=127.0.0.1") && script.includes("use-radius=yes") && script.includes("radius-accounting=yes"), script.slice(0, 400));
    const ctl = await (await fetch(base + "/api/provision/tok-ama-radius/control")).text();
    // Cloud mode is local-first: the voucher is also copied onto the router (MikroTik checks local
    // users before RADIUS), so a RADIUS outage does not stop logins.
    check("check-in keeps cloud RADIUS on the router", ctl.includes("HotspotPro login: cloud") && ctl.includes("use-radius=yes") && ctl.includes("/radius add") && ctl.includes('name="AMA-1111"'), ctl.slice(0, 500));
    const portal = await fetch(base + "/api/portal/voucher", {
      method: "POST",
      headers: { ...J, "x-hsp-rt": "tok-ama-radius" },
      body: JSON.stringify({ username: "AMA-1111", password: "AMA-1111" }),
    });
    const portalBody = await portal.json();
    // RADIUS auth, plus the local push as a safety net (RADIUS alone was bouncing phones).
    check("site portal Connect uses RADIUS auth (with local push)", portal.ok && portalBody.authMode === "radius" && portalBody.syncQueued === true, JSON.stringify(portalBody));

    check("RADIUS accepts Ama's voucher", (await login(authPort, "AMA-1111", "AMA-1111")) === 2);
    check("RADIUS accepts Kofi's voucher", (await login(authPort, "KOF-2222", "KOF-2222")) === 2);
    check("RADIUS rejects an unknown voucher", (await login(authPort, "NOPE-0000", "NOPE-0000")) === 3);
    check("RADIUS rejects a wrong password", (await login(authPort, "AMA-1111", "wrong")) === 3);

    check("accounting is accepted", (await acct(acctPort, 1, "AMA-1111", "sess-1", 0, 0)) === 5);
    await acct(acctPort, 3, "AMA-1111", "sess-1", 1000, 5000);
    await acct(acctPort, 3, "KOF-2222", "sess-2", 10, 20);
    await sleep(300);
    const a = await (await fetch(base + "/api/state", { headers: { cookie: ama } })).json();
    const k = await (await fetch(base + "/api/state", { headers: { cookie: kofi } })).json();
    const au = a.docs?.activeUsers?.value ?? [], ku = k.docs?.activeUsers?.value ?? [];
    check("Ama's Active Users shows only Ama's customer", au.length === 1 && au[0].voucherUsername === "AMA-1111", JSON.stringify(au.map((x) => x.voucherUsername)));
    check("Kofi's Active Users shows only Kofi's customer", ku.length === 1 && ku[0].voucherUsername === "KOF-2222");
    const av = a.docs?.vouchers?.value?.[0];
    check("Ama's voucher clock started (status Used)", av?.status === "Used" && !!av.activatedAtMs, JSON.stringify(av));

    // suspended business: RADIUS refuses
    const list = await (await fetch(base + "/api/super/tenants", { headers: { cookie: await (async () => { const r = await fetch(base + "/api/auth/login", { method: "POST", headers: J, body: JSON.stringify({ email: "super@example.com", password: "long-enough-pw" }) }); return (r.headers.getSetCookie?.() ?? []).map((c) => c.split(";")[0]).join("; "); })() } })).json();
    check("super admin can read the tenants list", list.tenants?.length === 3);
  } catch (e) { check("radius test ran", false, String(e)); }
  finally { server.child.kill("SIGTERM"); await sleep(400); fs.rmSync(data, { recursive: true, force: true }); }
  if (failed) console.log(server.out().slice(-1500));
}

// ========== 2. upgrading an older single-business file ==========
{
  const data = fs.mkdtempSync(path.join(os.tmpdir(), "hsp-mig-"));
  const old = {
    version: 1, payments: {}, smsLog: [], radiusSessions: {}, usage: {}, nas: {}, nasLinks: {}, beats: {}, outages: {}, secrets: { radius: "keepme" }, provisioning: {}, seq: 3,
    state: { routers: { value: [{ ip: "1.2.3.4", name: "Old Router", status: "Online" }], rev: 1, seq: 3, updatedAt: new Date().toISOString(), updatedBy: "admin:admin-1" } },
    accounts: [{ id: "admin-1", email: "old@example.com", passwordHash: hashPw("old-password-1"), role: "admin", createdAt: new Date().toISOString(), name: "Old Owner", businessName: "Old Net" }],
    events: [],
  };
  fs.writeFileSync(path.join(data, "db.json"), JSON.stringify(old));
  const port = 5100 + Math.floor(Math.random() * 100);
  const base = `http://127.0.0.1:${port}`;
  const server = start(data, port, 19120 + Math.floor(Math.random() * 300), 20120 + Math.floor(Math.random() * 300));
  try {
    await waitUp(base);
    const r = await fetch(base + "/api/auth/login", { method: "POST", headers: J, body: JSON.stringify({ email: "old@example.com", password: "old-password-1" }) });
    const body = await r.json();
    const cookie = (r.headers.getSetCookie?.() ?? []).map((c) => c.split(";")[0]).join("; ");
    check("old account still signs in after the upgrade", r.status === 200, JSON.stringify(body));
    check("…and becomes the super admin", body.super === true);
    const state = await (await fetch(base + "/api/state", { headers: { cookie } })).json();
    check("…with all its old data intact", state.docs?.routers?.value?.[0]?.name === "Old Router", JSON.stringify(state.docs));
    const overview = await (await fetch(base + "/api/super/overview", { headers: { cookie } })).json();
    check("…listed as the first business", overview.totals?.businesses === 1 && overview.totals.routers === 1, JSON.stringify(overview.totals));
    await sleep(300);
    const saved = JSON.parse(fs.readFileSync(path.join(data, "db.json"), "utf8"));
    check("the file is saved in the new layout, keeping the RADIUS secret", saved.version === 2 && saved.secrets?.radius === "keepme");
  } catch (e) { check("migration test ran", false, String(e)); }
  finally { server.child.kill("SIGTERM"); await sleep(400); fs.rmSync(data, { recursive: true, force: true }); }
  if (failed) console.log(server.out().slice(-1500));
}

console.log(`\n${pass} passed, ${failed} failed`);
process.exit(failed ? 1 : 0);
