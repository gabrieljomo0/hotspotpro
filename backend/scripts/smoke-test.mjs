// Starts the built backend on a throw-away port/data folder and checks the main flows,
// including that separate businesses can never see each other's data.
import { spawn } from "node:child_process";
import fs from "node:fs";
import http from "node:http";
import os from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";

const dir = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const data = fs.mkdtempSync(path.join(os.tmpdir(), "hsp-smoke-"));
const port = 4400 + Math.floor(Math.random() * 400);
const base = `http://127.0.0.1:${port}`;
// Stand-in for the WinBox relay sidecar: records the WireGuard confs it is asked to arm.
const relayArms = [];
const fakeRelay = http.createServer((req, res) => {
  let b = "";
  req.on("data", (d) => (b += d));
  req.on("end", () => {
    if (req.url === "/arm") { try { relayArms.push(JSON.parse(b).config); } catch {} }
    res.setHeader("content-type", "application/json");
    res.end(JSON.stringify({ ok: true, armed: relayArms.length > 0 }));
  });
});
await new Promise((r) => fakeRelay.listen(0, "127.0.0.1", r));
const relayUrl = `http://127.0.0.1:${fakeRelay.address().port}`;
const child = spawn(process.execPath, ["dist/server.mjs"], {
  cwd: dir,
  env: { ...process.env, PORT: String(port), HOTSPOTPRO_DATA_DIR: data, HOTSPOTPRO_LOG: "off", HOTSPOTPRO_RADIUS: "off", NODE_ENV: "development", HOTSPOTPRO_WINBOX_RELAY_URL: relayUrl },
  stdio: ["ignore", "pipe", "pipe"],
});
let out = "";
let restarted = null; // second API process for the restart check
child.stdout.on("data", (d) => (out += d));
child.stderr.on("data", (d) => (out += d));

let pass = 0, failed = 0;
const check = (name, ok, extra = "") => { ok ? pass++ : failed++; console.log(`${ok ? "PASS" : "FAIL"}  ${name}${ok ? "" : "  " + extra}`); };
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const J = { "content-type": "application/json" };
const send = (method, url, body, cookie = "", extra = {}) =>
  fetch(base + url, { method, headers: { ...J, ...(cookie ? { cookie } : {}), ...extra }, body: body === undefined ? undefined : JSON.stringify(body) });
const cookieOf = (r) => (r.headers.getSetCookie?.() ?? []).map((c) => c.split(";")[0]).filter((c) => !c.endsWith("=")).join("; ");
const json = async (r) => r.json().catch(() => ({}));

try {
  for (let i = 0; i < 40; i++) { try { if ((await fetch(base + "/api/health")).ok) break; } catch {} await sleep(250); }
  check("health", (await fetch(base + "/api/health")).status === 200);
  check("unknown route 404", (await fetch(base + "/api/nope")).status === 404);
  check("me without cookie is 401", (await fetch(base + "/api/auth/me")).status === 401);
  check("state needs a sign-in", (await fetch(base + "/api/state")).status === 401);

  // ---- first sign-up = super admin ----
  let info = await json(await fetch(base + "/api/auth/setup"));
  check("fresh site: first account is coming", info.firstAccount === true && info.signupOpen === true, JSON.stringify(info));
  check("no built-in default login", (await send("POST", "/api/auth/login", { email: "admin@hotspotpro.com", password: "password123" })).status === 401);
  check("register rejects bad input", (await send("POST", "/api/auth/register", { name: "A", email: "bad", password: "short" })).status === 400);
  let r = await send("POST", "/api/auth/register", { name: "Platform Owner", businessName: "Owner WiFi", email: "owner@example.com", password: "a-good-password" });
  const superCookie0 = cookieOf(r);
  let body = await json(r);
  check("first account becomes super admin", r.status === 200 && body.super === true && superCookie0.length > 5, JSON.stringify(body));
  r = await send("POST", "/api/auth/login", { email: "OWNER@example.com", password: "a-good-password" });
  const superCookie = cookieOf(r);
  body = await json(r);
  check("super admin signs in (email not case sensitive)", r.status === 200 && body.super === true);
  const me = await json(await send("GET", "/api/auth/me", undefined, superCookie));
  check("me says super admin", me.super === true && me.name === "Platform Owner", JSON.stringify(me));

  // ---- other businesses register (separate data) ----
  r = await send("POST", "/api/auth/register", { name: "Ama Boateng", businessName: "Ama Net", email: "ama@example.com", password: "ama-password-1" });
  const amaCookie = cookieOf(r);
  body = await json(r);
  check("a second business can register", r.status === 200 && body.super === false, JSON.stringify(body));
  r = await send("POST", "/api/auth/register", { name: "Kofi Mensah", businessName: "Kofi WiFi", email: "kofi@example.com", password: "kofi-password-1" });
  const kofiCookie = cookieOf(r);
  check("a third business can register", r.status === 200);
  check("duplicate email refused", (await send("POST", "/api/auth/register", { name: "Ama Again", email: "ama@example.com", password: "another-password" })).status === 409);

  // ---- isolation ----
  const routerA = [{ ip: "10.0.0.1", name: "Ama Router", status: "Online", provisioningToken: "tok-ama-12345678" }];
  const routerK = [{ ip: "10.0.0.1", name: "Kofi Router", status: "Online", provisioningToken: "tok-kofi-1234567" }];
  check("Ama saves her routers", (await send("PUT", "/api/state/routers", { value: routerA }, amaCookie)).status === 200);
  check("Kofi saves his routers", (await send("PUT", "/api/state/routers", { value: routerK }, kofiCookie)).status === 200);
  const amaState = await json(await send("GET", "/api/state", undefined, amaCookie));
  const kofiState = await json(await send("GET", "/api/state", undefined, kofiCookie));
  check("Ama sees only her router", amaState.docs?.routers?.value?.[0]?.name === "Ama Router" && amaState.docs.routers.value.length === 1, JSON.stringify(amaState.docs?.routers?.value));
  check("Kofi sees only his router", kofiState.docs?.routers?.value?.[0]?.name === "Kofi Router");
  const ownState = await json(await send("GET", "/api/state", undefined, superCookie));
  check("super admin's own business is empty (separate too)", !ownState.docs?.routers);

  // portal: each router link opens ITS business only
  await send("PUT", "/api/state/packages", { value: [{ id: "p1", name: "Ama Daily", downloadMbps: 5, uploadMbps: 5, durationValue: 1, durationUnit: "Days", price: 3, status: "Active", validity: "1 day" }] }, amaCookie);
  await send("PUT", "/api/state/packages", { value: [{ id: "p1", name: "Kofi Weekly", downloadMbps: 5, uploadMbps: 5, durationValue: 7, durationUnit: "Days", price: 9, status: "Active", validity: "7 days" }] }, kofiCookie);
  const cfgA = await json(await fetch(base + "/api/portal/config?rt=tok-ama-12345678"));
  const cfgK = await json(await fetch(base + "/api/portal/config?rt=tok-kofi-1234567"));
  check("customer portal link shows Ama's packages only", cfgA.packages?.[0]?.name === "Ama Daily" && cfgA.packages.length === 1, JSON.stringify(cfgA));
  check("customer portal link shows Kofi's packages only", cfgK.packages?.[0]?.name === "Kofi Weekly");
  check("portal without a link is refused", (await fetch(base + "/api/portal/config")).status === 400);
  check("router setup token of another business is not usable", (await send("POST", "/api/provision", { token: "tok-ama-12345678", router: { name: "Hijack" } }, kofiCookie)).status === 409);

  // routers talk to the platform with their own setup token: each gets its own business's instructions
  const ctlA = await fetch(base + "/api/provision/tok-ama-12345678/control");
  const ctlK = await fetch(base + "/api/provision/tok-kofi-1234567/control");
  check("router of Ama gets Ama's control script", ctlA.status === 200 && (await ctlA.text()).includes("Ama Router"));
  check("router of Kofi gets Kofi's control script", ctlK.status === 200 && (await ctlK.text()).includes("Kofi Router"));
  check("an unknown router token is refused", (await fetch(base + "/api/provision/not-a-real-token/control")).status === 404);
  // Same physical MikroTik (serial) cannot be added as a second dashboard router until the first is deleted.
  await send("PUT", "/api/state/routers", { value: [
    { ip: "10.0.0.1", name: "Ama Router", status: "Online", provisioningToken: "tok-ama-12345678", hardwareSerial: "SERIALAMA001" },
    { ip: "10.0.0.2", name: "Ama Dup", status: "Offline", provisioningToken: "tok-ama-dup-99999", provisioningStatus: "Pending", health: "checking" },
  ] }, amaCookie);
  const dupCtl = await (await fetch(base + "/api/provision/tok-ama-dup-99999/control?serial=SERIALAMA001&swid=ABCD-EFGH&cpu=1&free=1&total=2")).text();
  check("same board cannot be added as a different router", dupCtl.includes("already registered") && dupCtl.includes("Ama Router") && !dupCtl.includes("HotspotPro: Ama Dup is CONNECTED"), dupCtl.slice(0, 400));
  const afterDup = await json(await send("GET", "/api/state", undefined, amaCookie));
  const dupRow = (afterDup.docs?.routers?.value ?? []).find((r) => r.provisioningToken === "tok-ama-dup-99999");
  check("duplicate add is marked as an error on the site", dupRow?.health === "error" && String(dupRow?.lastError || "").includes("already registered"), JSON.stringify(dupRow));
  const okSame = await (await fetch(base + "/api/provision/tok-ama-12345678/control?serial=SERIALAMA001&cpu=1&free=1&total=2")).text();
  check("the original router can still check in with its serial", okSame.includes("Ama Router") && !okSame.includes("already registered"), okSame.slice(0, 200));
  await send("PUT", "/api/state/routers", { value: [{ ip: "10.0.0.1", name: "Ama Router", status: "Online", provisioningToken: "tok-ama-12345678" }] }, amaCookie);
  await send("PUT", "/api/state/vouchers", { value: [{ code: "AMATEST1", password: null, packageName: "Ama Daily", status: "Available" }] }, amaCookie);
  const cloudCtl = await (await fetch(base + "/api/provision/tok-ama-12345678/control")).text();
  check("with no RADIUS server a paid voucher is copied onto the router", cloudCtl.includes("use-radius=no") && cloudCtl.includes('name="AMATEST1"') && cloudCtl.includes("limit-uptime=1d") && cloudCtl.includes("session-timeout=0s") && cloudCtl.includes("keepalive-timeout=none") && cloudCtl.includes("mac-cookie-timeout=1d") && cloudCtl.includes("shared-users=1"), cloudCtl.slice(0, 500));
  check("package user profiles are pushed to the router", (cloudCtl.includes('name="Ama Daily"') || cloudCtl.includes('name="AmaDaily"')) && cloudCtl.includes("user profile") && cloudCtl.includes("rate-limit="), cloudCtl.slice(0, 600));
  check("server profile dns-name is set on check-in", /dns-name=[a-z0-9.-]+/.test(cloudCtl) && cloudCtl.includes("dns-name="), cloudCtl.match(/dns-name=[a-z0-9."-]+/)?.[0] || "missing");
  check("remote WinBox is ready on check-in", cloudCtl.includes('comment="HotspotPro remote WinBox"') && cloudCtl.includes("back-to-home-vpn=enabled") && cloudCtl.includes("ddns-enabled=yes") && cloudCtl.includes("update-time=yes"));
  check("remote WebFig is open for browser access", cloudCtl.includes('comment="HotspotPro remote WebFig"') && cloudCtl.includes("/ip service set www") && /interval=\d+s/.test(cloudCtl), cloudCtl.slice(0, 400));
  check("hotspot login enables HTTP CHAP, HTTP PAP, Cookie, and MAC Cookie (no bare MAC)", cloudCtl.includes("login-by=cookie,http-chap,http-pap,mac-cookie") && !/\blogin-by=[^\s"]*\bmac\b/.test(cloudCtl.replace(/mac-cookie/g, "KEEP")) && cloudCtl.includes("addresses-per-mac=1") && cloudCtl.includes("mac-address=$m"), cloudCtl.slice(0, 800));
  check("captive portal serves HotspotPro login on the router", (await (await fetch(base + "/api/provision/tok-ama-12345678/login.html")).text()).includes('action="$(link-login-only)"') && (await (await fetch(base + "/api/provision/tok-ama-12345678/login.html")).text()).includes("Buy a package") && !(await (await fetch(base + "/api/provision/tok-ama-12345678/login.html")).text()).includes("location.replace") && (await (await fetch(base + "/api/provision/tok-ama-12345678/md5.js")).text()).includes("function hexMD5"), "login.html on-router form");
  check("connected routers download the latest setup by themselves", cloudCtl.includes("applying the latest setup") && /hpMark != "v\d+"/.test(cloudCtl) && cloudCtl.includes("hotspotpro-setup-version") && cloudCtl.includes("/api/provision/tok-ama-12345678?wireless=yes"), cloudCtl.slice(cloudCtl.indexOf("hpSetup"), cloudCtl.indexOf("hpSetup") + 400));
  const cloudScript = await (await fetch(base + "/api/provision/tok-ama-12345678?wireless=yes&ssid=AmaCafeWiFi")).text();
  check("setup creates hotspot server in safe steps", cloudScript.includes("hotspot server is ready") && cloudScript.includes("/ip hotspot profile add name=hotspotpro;") && cloudScript.includes("/ip hotspot profile set [find where name=hotspotpro] hotspot-address=") && cloudScript.includes("/ip hotspot add name=hotspotpro interface=hotspotpro-bridge ;"), cloudScript.slice(cloudScript.indexOf("Creating the hotspot"), cloudScript.indexOf("Creating the hotspot") + 400));
  // RouterOS drops a whole add/set when one property is unknown; a label must never take the server down with it.
  const bundlesComment = (s) => s.split(/[;{}]/).some((cmd) => /\/ip hotspot (?:profile )?(?:add|set)\b/.test(cmd) && cmd.includes("comment=") && /\b[a-z-]+=/.test(cmd.replace(/\[[^\]]*\]/g, "").replace(/comment="[^"]*"/g, "")));
  check("hotspot server and profile set comments on their own", !bundlesComment(cloudScript) && !bundlesComment(cloudCtl), "comment bundled with other hotspot settings");
  check("reprovision keeps people already online", cloudScript.includes("people already on WiFi stay connected") && cloudScript.includes("Hotspot server kept online") && cloudScript.includes("Keeping customers who are already online") && !cloudScript.includes("Signed out active hotspot users") && !/\/ip hotspot remove \[find where name=hotspotpro\]/.test(cloudScript) && !/\/ip hotspot profile remove \[find where name=hotspotpro\]/.test(cloudScript), "soft upsert");
  check("setup clears hotspot bypass so the voucher page is required", cloudScript.includes("type=bypassed") && cloudCtl.includes("type=bypassed"), "ip-binding bypass removed");
  check("reprovision puts WiFi on the hotspot bridge", cloudScript.includes("hotspotpro-bridge") && (cloudScript.includes("datapath.bridge=hotspotpro-bridge") || cloudScript.includes("interface wireless")), cloudScript.slice(0, 300));
  check("check-in seals factory NAT and covers wifiwave2", cloudCtl.includes('comment~"defconf"') && cloudCtl.includes("/interface wifiwave2") && cloudCtl.includes("disable-ipv6=yes"), "seal + wifiwave2 + ipv6");
  check("check-in creates the hotspot server when Servers is empty", cloudCtl.includes('/ip hotspot add name=hotspotpro') && cloudCtl.includes("Ensure HotspotPro hotspot server exists"), "ensure hotspot server");
  check("expired voucher clears cookies; MAC Cookie kept while voucher still valid (WiFi toggle reconnect)", cloudCtl.includes("hotspotpro-logout") && cloudCtl.includes("on-logout=hotspotpro-logout") && cloudCtl.includes("hotspot cookie remove") && cloudCtl.includes('scheduler remove [find where name=hotspotpro-reauth]') && !cloudCtl.includes("registration-table remove"), "logout clears cookies on expiry; no offline cookie wipe");
  check("setup seals free-internet paths", cloudScript.includes('comment~"defconf"') && cloudScript.includes("disable-ipv6=yes") && !/:execute script=\{[^\n]*\/interface (?:wifi|wifiwave2|wireless)\b/.test(cloudScript), "no async wifi execute");
  // Manual hotspot DNS name (not forced from the router name).
  await send("PUT", "/api/state/routers", { value: [{ ip: "10.0.0.1", name: "Ama Router", status: "Online", provisioningToken: "tok-ama-12345678", dnsName: "login.shop" }] }, amaCookie);
  const dnsCtl = await (await fetch(base + "/api/provision/tok-ama-12345678/control")).text();
  const dnsScript = await (await fetch(base + "/api/provision/tok-ama-12345678?wireless=yes")).text();
  check("manual DNS name is used on check-in", (dnsCtl.includes("dns-name=login.shop") || dnsCtl.includes('dns-name="login.shop"')) && (dnsCtl.includes("name=login.shop") || dnsCtl.includes('name="login.shop"')), dnsCtl.includes("dns-name=") ? "found wrong dns-name" : "missing dns-name");
  check("manual DNS name is used in full setup", dnsScript.includes("dns-name=login.shop") || dnsScript.includes('dns-name="login.shop"'), dnsScript.slice(dnsScript.indexOf("dns-name"), dnsScript.indexOf("dns-name") + 80));
  await send("PUT", "/api/state/routers", { value: [{ ip: "10.0.0.1", name: "Ama Router", status: "Online", provisioningToken: "tok-ama-12345678" }] }, amaCookie);
  await fetch(base + "/api/provision/tok-ama-12345678/control?cpu=1&free=1&total=2&users=AMATEST1");
  const afterUse = await json(await send("GET", "/api/state", undefined, amaCookie));
  const used = (afterUse.docs?.vouchers?.value ?? []).find((v) => v.code === "AMATEST1");
  check("the voucher clock starts when the customer gets online", used?.status === "Used" && typeof used?.activatedAtMs === "number" && used.expiresAtMs > Date.now(), JSON.stringify(used));
  const again = await (await fetch(base + "/api/provision/tok-ama-12345678/control")).text();
  check("the first phone keeps the voucher and other phones are locked out", again.includes("mac-address=$m") && (again.includes('name="AMATEST1"') || again.includes("already in sync")), again.includes("mac-address=$m") ? "mac bind ok" : again.slice(0, 300));
  const kept = (await json(await send("GET", "/api/state", undefined, amaCookie))).docs?.vouchers?.value ?? [];
  await send("PUT", "/api/state/vouchers", { value: [...kept, { code: "USEONLY1", password: null, packageName: "Ama Daily", status: "Available", countFrom: "usage", limitBy: "days" }, { code: "DATAONLY1", password: null, packageName: "Ama Daily", status: "Available", countFrom: "signin", limitBy: "data" }] }, amaCookie);
  const choiceCtl = await (await fetch(base + "/api/provision/tok-ama-12345678/control")).text();
  check("a usage voucher counts the day only while online", choiceCtl.includes('name="USEONLY1"') && choiceCtl.includes("limit-uptime=1d"));
  check("a data voucher has no day cap", choiceCtl.includes('name="DATAONLY1"') && choiceCtl.includes("limit-uptime=0s"));
  await fetch(base + "/api/provision/tok-ama-12345678/control?cpu=1&users=USEONLY1");
  const usageVoucher = ((await json(await send("GET", "/api/state", undefined, amaCookie))).docs?.vouchers?.value ?? []).find((v) => v.code === "USEONLY1");
  check("signing in does not start a running clock on a usage voucher", !!usageVoucher?.activatedAtMs && !usageVoucher.expiresAtMs, JSON.stringify(usageVoucher));
  await send("PUT", "/api/state/routers", { value: [{ ...routerA[0], remoteAccessEnabled: true, wanInterface: "ether1" }] }, amaCookie);
  const remoteCtl = await (await fetch(base + "/api/provision/tok-ama-12345678/control")).text();
  check("switching remote access on opens WinBox", remoteCtl.includes('comment="HotspotPro remote WinBox"') && remoteCtl.includes("back-to-home-vpn=enabled") && remoteCtl.includes("ddns-enabled=yes") && remoteCtl.includes("192.168.216.0/24") && remoteCtl.includes('comment="HotspotPro remote API"'));
  await send("PUT", "/api/state/routers", {
    value: [{
      ...routerA[0],
      multiWanMode: "Load Balancing + Failover",
      managementPort: "ether5",
      ispLinks: [
        { id: "1", label: "MTN", interface: "ether1", connectionType: "DHCP", gateway: "", dnsServers: "8.8.8.8", healthCheckIp: "8.8.8.8", allowRemovalFromBridge: true },
        { id: "2", label: "Vodafone", interface: "ether2", connectionType: "DHCP", gateway: "", dnsServers: "1.1.1.1", healthCheckIp: "1.1.1.1", allowRemovalFromBridge: true },
      ],
    }],
  }, amaCookie);
  const wanCtl = await (await fetch(base + "/api/provision/tok-ama-12345678/control")).text();
  check("Multi-WAN load balancing is applied on check-in", wanCtl.includes("HotspotPro Multi-WAN") && wanCtl.includes("interface=ether1") && wanCtl.includes("interface=ether2") && wanCtl.includes("add-default-route=no") && wanCtl.includes("per-connection-classifier") && wanCtl.includes('comment="HotspotPro WAN"') && wanCtl.includes("HotspotPro WAN probe") && wanCtl.includes("check-gateway=ping") && wanCtl.includes('comment="HotspotPro WAN DHCP Client"'), wanCtl.slice(wanCtl.indexOf("Multi-WAN"), wanCtl.indexOf("Multi-WAN") + 800));
  check("check-in reports WAN IP from Multi-WAN or the first DHCP client", wanCtl.includes('comment="HotspotPro WAN"') && wanCtl.includes("HotspotPro WAN DHCP Client") && wanCtl.includes("wanip="), "wanip reporting");
  await send("PUT", "/api/state/vouchers", { value: [{ code: "TVBOX01", password: null, packageName: "Ama Daily", status: "Used", boundMac: "AA:BB:CC:DD:EE:FF", activatedAtMs: Date.now(), expiresAtMs: Date.now() + 86400000 }] }, amaCookie);
  const tvCtl = await (await fetch(base + "/api/provision/tok-ama-12345678/control")).text();
  check("buy-for-TV locks the voucher to that MAC on the router", tvCtl.includes('name="TVBOX01"') && tvCtl.includes("mac-address=AA:BB:CC:DD:EE:FF") && tvCtl.includes('name="AA:BB:CC:DD:EE:FF"'), tvCtl.slice(0, 900));
  await fetch(base + "/api/provision/tok-ama-12345678/control?cpu=1&wanip=41.1.1.1&dns=abc.sn.mynetname.net");
  const direct = (await json(await send("GET", "/api/state", undefined, amaCookie))).docs?.routers?.value?.[0];
  check("a public address is the WinBox address", direct?.winboxReach === "direct" && direct?.winboxAddress === "abc.sn.mynetname.net:8291", JSON.stringify(direct?.winboxAddress));
  await fetch(base + "/api/provision/tok-ama-12345678/control?cpu=1&wanip=192.168.1.20&pub=41.1.1.1");
  const relay = (await json(await send("GET", "/api/state", undefined, amaCookie))).docs?.routers?.value?.[0];
  check("a router behind another modem uses the relay address", relay?.winboxReach === "relay" && relay?.winboxAddress === "192.168.216.1", JSON.stringify(relay?.winboxAddress));
  // Two peers, like a real Back To Home conf (*.sn.mynetname.net and *.vpn.mynetname.net).
  const wg = await fetch(base + "/api/provision/tok-ama-12345678/winbox", { method: "POST", body: "[Interface]\nPrivateKey = abcdefghijklmnop=\nAddress = 192.168.216.2/32\n\n[Peer]\nPublicKey = abc=\nEndpoint = localhost:13231\n\n[Peer]\nPublicKey = def=\nAllowedIPs = 0.0.0.0/0\nEndpoint = localhost:35988\n" });
  const savedWg = (await json(await send("GET", "/api/state", undefined, amaCookie))).docs?.routers?.value?.[0];
  check("the router can hand over its WireGuard file", wg.status === 200 && savedWg?.wireguardConfig?.includes("PrivateKey") && savedWg?.wireguardTunnelIp === "192.168.216.1", String(wg.status));
  for (let i = 0; i < 20 && relayArms.length === 0; i++) await sleep(100);
  check("the cloud WinBox relay gets every Back To Home hostname as an IP address", !relayArms.at(-1)?.includes("localhost") && !!relayArms.at(-1)?.includes("Endpoint = 127.0.0.1:35988") && !!relayArms.at(-1)?.includes("Endpoint = 127.0.0.1:13231") && !!savedWg?.wireguardConfig?.includes("Endpoint = localhost:13231"), JSON.stringify(relayArms.at(-1)));
  await send("PUT", "/api/state/routers", { value: routerA }, amaCookie);
  check("the check-in sends the router's CPU and memory", cloudCtl.includes("cpu-load") && cloudCtl.includes("free-memory") && cloudCtl.includes("board-name") && cloudCtl.includes("identity"));
  await send("PUT", "/api/state/routers", { value: [{ ...routerA[0], loginMode: "local" }] }, amaCookie);
  const localCtl = await (await fetch(base + "/api/provision/tok-ama-12345678/control")).text();
  check("local mode keeps login on the router", localCtl.includes("HotspotPro login: local") && localCtl.includes("use-radius=no") && !localCtl.includes("use-radius=yes"), localCtl.slice(0, 400));
  await send("PUT", "/api/state/routers", { value: routerA }, amaCookie);
  check("finished setup appears on the site", (await send("POST", "/api/provision", { token: "tok-done-12345678", router: { name: "Finished Router", loginMode: "cloud", hotspotEnabled: true, wanInterface: "ether1" } }, amaCookie)).status === 200
    && (await fetch(base + "/api/provision/tok-done-12345678/done?failed=0")).status === 200);
  const linked = await json(await send("GET", "/api/state", undefined, amaCookie));
  const finished = (linked.docs?.routers?.value ?? []).find((r) => r.provisioningToken === "tok-done-12345678");
  // Without HOTSPOTPRO_RADIUS=on, cloud is stored as local (vouchers pushed onto the MikroTik).
  check("the site shows that router connected", finished?.status === "Online" && finished?.provisioningStatus === "Provisioned" && finished?.name === "Finished Router" && finished?.loginMode === "local", JSON.stringify(finished));
  await send("PUT", "/api/state/routers", { value: routerA }, amaCookie);

  // ---- setup script: ISP port, device-mode check ----
  const scriptA = await (await fetch(base + "/api/provision/tok-ama-12345678")).text();
  check("setup creates the management login", scriptA.includes("name=hotspotpro") && scriptA.includes("port=8728"));
  check("ISP port is ether1 by default (DHCP client + NAT)", scriptA.includes("/ip dhcp-client add interface=ether1") && scriptA.includes("out-interface=ether1 action=masquerade"));
  check("the ISP port is taken out of the old bridge so it can get an address", scriptA.includes("bridge port remove [find where interface=ether1]"));
  check("the check-in is allowed to download", scriptA.includes("policy=ftp,reboot,read,write,policy,test"));
  check("setup downloads the captive portal pages", scriptA.includes("/login.html") && scriptA.includes("alogin.html") && scriptA.includes("HotspotPro login: cloud"));
  check("setup installs the captive portal without reset-html prompt", !scriptA.includes("/ip hotspot reset-html") && scriptA.includes("Installing the HotspotPro captive portal") && scriptA.includes("md5.js") && scriptA.includes("hotspot/css/hotspotpro.css"));
  check("setup replaces the MikroTik login page", scriptA.includes('/file remove [find where name=($hpDir . "/login.html")]') && scriptA.includes("rlogin.html") && scriptA.includes("HotspotPro designed-portal") && scriptA.includes("/tool fetch url="));
  check("setup disables other hotspot servers so only HotspotPro HTML is used", scriptA.includes('/ip hotspot disable [find where name!="hotspotpro"]') && scriptA.includes("html-directory-override=\\$hpHtmlDir"));
  check("setup sets the clock, the API login and tethering protection", scriptA.includes("time-zone-name=Africa/Accra") && scriptA.includes("API user created: hotspotpro") && scriptA.includes("new-ttl=set:1") && scriptA.includes("mac-cookie-timeout=1d"));
  const registered = await send("POST", "/api/provision", { token: "tok-live-12345678", router: { name: "Live Router", loginMode: "local", hotspotEnabled: true, routerType: "New Router", wanInterface: "ether1" } }, amaCookie);
  const liveScript = await (await fetch(base + "/api/provision/tok-live-12345678")).text();
  check("the login mode chosen while adding a router is in the setup script", registered.status === 200 && liveScript.includes("HotspotPro login: local") && liveScript.includes("use-radius=no") && !liveScript.includes("use-radius=yes"), String(registered.status));
  const lint = await json(await send("GET", "/api/provision/tok-live-12345678/check?origin=" + encodeURIComponent("http://192.168.88.10:4000"), undefined, amaCookie));
  check("the setup script passes the RouterOS check", lint.report?.ok === true, JSON.stringify(lint.report?.errors ?? lint));
  check("script finishes the hotspot and does not restart the router", scriptA.includes("/ip hotspot profile add") && scriptA.indexOf("/ip hotspot profile add") < scriptA.indexOf("Your hotspot is configured and ready.") && !scriptA.includes("/system device-mode update") && !scriptA.includes("/system reboot") && !scriptA.includes("/system package update install") && scriptA.includes("$hpKeep"));
  await send("PUT", "/api/state/routers", { value: [{ ...routerA[0], wanInterface: "ether3" }] }, amaCookie);
  const scriptWan = await (await fetch(base + "/api/provision/tok-ama-12345678")).text();
  check("a chosen ISP port is used, and ether1 joins the LAN bridge", scriptWan.includes("/ip dhcp-client add interface=ether3") && scriptWan.includes("interface=ether1 comment=\"HotspotPro\"") && !scriptWan.includes("bridge port add bridge=hotspotpro-bridge interface=ether3"));
  await send("PUT", "/api/state/routers", { value: routerA }, amaCookie);
  check("device-mode problem is reported on the router", (await fetch(base + "/api/provision/tok-ama-12345678/done?failed=0&dm=blocked")).status === 200
    && /device-mode/.test(JSON.stringify((await json(await send("GET", "/api/state", undefined, amaCookie))).docs?.routers?.value?.[0]?.lastError)));

  // ---- admin port: the computer's cable stays outside the hotspot ----
  await send("PUT", "/api/state/routers", { value: [{ ...routerA[0], wanInterface: "ether1", managementPort: "ether5", routerType: "New Router" }] }, amaCookie);
  const scriptM = await (await fetch(base + "/api/provision/tok-ama-12345678")).text();
  check("admin port ether5 is kept out of the hotspot bridge", !scriptM.includes("bridge=hotspotpro-bridge interface=ether5") && scriptM.includes("bridge=hotspotpro-bridge interface=ether4") && scriptM.includes("bridge=hotspotpro-bridge interface=ether2"));
  check("admin port gets its own small network when the router has none", scriptM.includes("hotspotpro-admin") && scriptM.includes('address="192.168.88.1/24"'));
  await send("PUT", "/api/state/routers", { value: [{ ...routerA[0], wanInterface: "ether1", managementPort: "ether1" }] }, amaCookie);
  const scriptM2 = await (await fetch(base + "/api/provision/tok-ama-12345678")).text();
  check("the ISP port can never be the admin port", !scriptM2.includes("bridge=hotspotpro-admin interface=ether1") && !scriptM2.includes("Admin port ether1"));
  await send("PUT", "/api/state/routers", { value: [{ ...routerA[0], pppoeEnabled: true, pppoeNetwork: "192.168.91.0/24", routerType: "New Router" }] }, amaCookie);
  const scriptPpp = await (await fetch(base + "/api/provision/tok-ama-12345678")).text();
  check("PPPoE starts a server on the hotspot without RADIUS", scriptPpp.includes("interface pppoe-server server add service-name=hotspotpro interface=hotspotpro-bridge") && scriptPpp.includes("/ppp aaa set use-radius=no") && !scriptPpp.includes("/radius add"));
  await send("PUT", "/api/state/routers", { value: routerA }, amaCookie);
  await send("PUT", "/api/state/routers", { value: [{ ...routerA[0], wanInterface: "ether1", managementPort: "", lastPortFree: true, routerType: "New Router" }] }, amaCookie);
  const scriptAuto = await (await fetch(base + "/api/provision/tok-ama-12345678")).text();
  check("the script counts the ports and keeps the last one free", scriptAuto.includes(":set hpLast") && scriptAuto.includes("ethernet ports") && !scriptAuto.includes("bridge=hotspotpro-bridge interface=ether5"));
  const lintAuto = await json(await send("GET", "/api/provision/tok-ama-12345678/check?origin=" + encodeURIComponent("http://192.168.88.10:4000"), undefined, amaCookie));
  check("the automatic port script passes the RouterOS check", lintAuto.report?.ok === true, JSON.stringify(lintAuto.report?.errors ?? lintAuto));
  await send("PUT", "/api/state/routers", { value: [{ ...routerA[0], wanInterface: "ether3", managementPort: "", lastPortFree: false, routerType: "New Router" }] }, amaCookie);
  const scriptJoin = await (await fetch(base + "/api/provision/tok-ama-12345678")).text();
  check("a chosen internet port is used and the last port can join the hotspot", scriptJoin.includes("interface=ether3") && scriptJoin.includes('$n != "ether3"') && !scriptJoin.includes(":set hpLast"));
  await send("PUT", "/api/state/routers", { value: routerA }, amaCookie);

  // ---- WinBox from the ISP-side private network (e.g. computer on the Starlink router's WiFi) ----
  const scriptNo = await (await fetch(base + "/api/provision/tok-ama-12345678")).text();
  check("WinBox on the same network is opened in the background", scriptNo.includes("HotspotPro WinBox from ISP network") && scriptNo.includes("back-to-home-vpn=enabled"));
  await send("PUT", "/api/state/routers", { value: [{ ...routerA[0], adminFromWan: true }] }, amaCookie);
  const scriptW = await (await fetch(base + "/api/provision/tok-ama-12345678")).text();
  check("WinBox opened to private addresses on the ISP port only", scriptW.includes("in-interface=ether1 src-address-list=hotspotpro-private protocol=tcp dst-port=8291") && scriptW.includes("address=192.168.0.0/16") && !scriptW.includes("dst-address-list"));
  await send("PUT", "/api/state/routers", { value: routerA }, amaCookie);

  // ---- customers' login page + self-checks ----
  check("script uses the right hotspot folder (flash-aware)", scriptA.includes("html-directory=$hpPick") && scriptA.includes("flash/hotspot"));
  check("setup disables free trial and plants the offline portal lock", scriptA.includes("trial-uptime-limit=0s") && !scriptA.includes("trial-uptime=0s") && scriptA.includes("hotspotpro-guard") && scriptA.includes("HotspotPro access lock"));
  const loginHtml = await (await fetch(base + "/api/provision/tok-ama-12345678/login.html")).text();
  check("login page is a fast HotspotPro voucher form on the router", loginHtml.includes("HotspotPro designed-portal") && loginHtml.includes('action="$(link-login-only)"') && loginHtml.includes('name="username"') && loginHtml.includes("Buy a package") && loginHtml.includes("/portal?rt=tok-ama-12345678") && !loginHtml.includes("location.replace"), loginHtml.slice(0, 280));
  const rloginHtml = await (await fetch(base + "/api/provision/tok-ama-12345678/rlogin.html")).text();
  check("the redirect login page is the same fast HotspotPro form", rloginHtml.includes("HotspotPro designed-portal") && rloginHtml.includes('action="$(link-login-only)"') && rloginHtml.includes('name="username"'));
  check("check-in replaces MikroTik default HTML using HotspotPro marker", cloudCtl.includes("HotspotPro designed-portal") && cloudCtl.includes("hp-stamp:") && cloudCtl.includes('/ip hotspot disable [find where name!="hotspotpro"]'), "marker + disable other hotspots");
  check("login page for an unknown router is refused", (await fetch(base + "/api/provision/not-a-real-token/login.html")).status === 404);
  const alogin = await (await fetch(base + "/api/provision/tok-ama-12345678/alogin.html")).text();
  check("success page shows login message and opens Google", alogin.includes("Login successful") && alogin.includes("https://www.google.com/"));
  const loginDst = await (await fetch(base + "/api/provision/tok-ama-12345678/login.html")).text();
  // The form keeps the phone's original address (dst=$(link-orig-esc)); after login MikroTik shows
  // alogin.html, which opens Google.
  check("login form redirects to Google after connect", loginDst.includes('name="dst" value="$(link-orig-esc)"') && alogin.includes('url=https://www.google.com/'));
  check("error page keeps a fast voucher form on the router", (await (await fetch(base + "/api/provision/tok-ama-12345678/error.html")).text()).includes('action="$(link-login-only)"') && (await (await fetch(base + "/api/provision/tok-ama-12345678/error.html")).text()).includes("Buy a package") && (await (await fetch(base + "/api/provision/tok-ama-12345678/error.html")).text()).includes("did not work"));

  // ---- voucher status messages (success / used / expired / wrong router) ----
  await send("PUT", "/api/state/vouchers", {
    value: [
      { code: "OKVOUCH1", password: null, packageName: "Ama Daily", status: "Available", batchId: null },
      { code: "USEDVOU1", password: null, packageName: "Ama Daily", status: "Used", activatedAtMs: Date.now() - 1000, expiresAtMs: Date.now() + 86400000, boundMac: "AA:BB:CC:DD:EE:FF", batchId: null },
      { code: "EXPIRED1", password: null, packageName: "Ama Daily", status: "Expired", activatedAtMs: Date.now() - 86400000, expiresAtMs: Date.now() - 1000, batchId: null },
      { code: "OTHERNET", password: null, packageName: "Other Site Only", status: "Available", batchId: null },
    ],
  }, amaCookie);
  await send("PUT", "/api/state/packages", {
    value: [
      { id: "p1", name: "Ama Daily", downloadMbps: 5, uploadMbps: 5, durationValue: 1, durationUnit: "Days", price: 3, status: "Active", validity: "1 day" },
      { id: "p2", name: "Other Site Only", downloadMbps: 5, uploadMbps: 5, durationValue: 1, durationUnit: "Days", price: 3, status: "Active", validity: "1 day", routerIps: ["10.9.9.9"], applyToAllSites: false },
    ],
  }, amaCookie);
  const okV = await json(await send("POST", "/api/portal/voucher", { username: "OKVOUCH1", password: "OKVOUCH1" }, "", { "x-hsp-rt": "tok-ama-12345678" }));
  check("valid voucher returns success message and Google redirect", okV.valid === true && /Login successful/i.test(okV.message || "") && okV.redirect === "https://www.google.com/", JSON.stringify(okV));
  const usedV = await send("POST", "/api/portal/voucher", { username: "USEDVOU1", password: "USEDVOU1", mac: "11:22:33:44:55:66" }, "", { "x-hsp-rt": "tok-ama-12345678" });
  const usedBody = await json(usedV);
  check("used voucher returns a clear used message", usedV.status === 403 && usedBody.code === "used" && /already been used/i.test(usedBody.message || ""), JSON.stringify(usedBody));
  const expV = await send("POST", "/api/portal/voucher", { username: "EXPIRED1", password: "EXPIRED1" }, "", { "x-hsp-rt": "tok-ama-12345678" });
  const expBody = await json(expV);
  check("expired voucher returns a clear expired message", expV.status === 403 && expBody.code === "expired" && /expired/i.test(expBody.message || ""), JSON.stringify(expBody));
  // A second real (provisioned) router owns "Other Site Only". With a single router, or a package
  // pointing at a router that no longer exists, the product deliberately lets the voucher through.
  await send("PUT", "/api/state/routers", { value: [...routerA, { ip: "10.9.9.9", name: "Other Site", status: "Online", provisioningStatus: "Provisioned", provisioningToken: "tok-other-9999999" }] }, amaCookie);
  const wrongV = await send("POST", "/api/portal/voucher", { username: "OTHERNET", password: "OTHERNET" }, "", { "x-hsp-rt": "tok-ama-12345678" });
  const wrongBody = await json(wrongV);
  await send("PUT", "/api/state/routers", { value: routerA }, amaCookie);
  check("voucher for a different router is refused", wrongV.status === 403 && wrongBody.code === "wrong_router" && /different/i.test(wrongBody.message || ""), JSON.stringify(wrongBody));
  // Restore Ama Daily package for later checks that expect it.
  await send("PUT", "/api/state/packages", { value: [{ id: "p1", name: "Ama Daily", downloadMbps: 5, uploadMbps: 5, durationValue: 1, durationUnit: "Days", price: 3, status: "Active", validity: "1 day" }] }, amaCookie);
  await send("PUT", "/api/state/vouchers", { value: [{ code: "AMATEST1", password: null, packageName: "Ama Daily", status: "Used", activatedAtMs: Date.now() - 1000, expiresAtMs: Date.now() + 86400000 }] }, amaCookie);
  check("DHCP pool is capped so a small router can create it", scriptA.includes("ranges=10.10.0.2-10.10.3.254"));
  check("script checks the ISP port and internet at the end", scriptA.includes('&wan=') && scriptA.includes("/ping 8.8.8.8"));
  await fetch(base + "/api/provision/tok-ama-12345678/done?failed=0&wan=down");
  check("a dead ISP port is reported on the router", /ISP port/.test(JSON.stringify((await json(await send("GET", "/api/state", undefined, amaCookie))).docs?.routers?.value?.[0]?.lastError)));

  // ---- advanced commands from the site (remote, picked up by the router's 30-second call) ----
  let jr = await send("POST", "/api/routers/jobs", { ip: "10.0.0.1", script: "/system identity set name=advanced-test" }, amaCookie);
  const job = (await json(jr)).job;
  check("owner can queue a router command", jr.status === 200 && !!job?.id);
  check("signed-out cannot queue one", (await send("POST", "/api/routers/jobs", { ip: "10.0.0.1", script: "x" })).status === 401);
  const ctl1 = await (await fetch(base + "/api/provision/tok-ama-12345678/control")).text();
  check("router's next call includes the command", ctl1.includes(`/job/${job.id}`));
  const ctl2 = await (await fetch(base + "/api/provision/tok-ama-12345678/control")).text();
  check("the command is sent only once", !ctl2.includes(`/job/${job.id}`));
  const jobText = await (await fetch(base + `/api/provision/tok-ama-12345678/job/${job.id}`)).text();
  check("router can download the command", jobText.includes("advanced-test"));
  check("another business's router cannot read it", (await fetch(base + `/api/provision/tok-kofi-1234567/job/${job.id}`)).status === 404);
  await fetch(base + `/api/provision/tok-ama-12345678/job/${job.id}/result?ok=1`);
  const list2 = await json(await send("GET", "/api/routers/jobs?ip=10.0.0.1", undefined, amaCookie));
  check("result is recorded", list2.jobs?.[0]?.status === "ok");
  const action = await send("POST", "/api/routers/jobs", { ip: "10.0.0.1", action: "full-provision" }, amaCookie);
  const actionJob = (await json(action)).job;
  check("full provision is sent to the router", action.status === 200 && actionJob?.script?.includes("hotspotpro-action:full-provision") && actionJob.script.includes("/api/provision/tok-ama-12345678") && actionJob.script.includes("/import file-name=$hpFile") && !actionJob.script.includes(":execute script={/import"), actionJob?.script?.slice(0, 400));
  if (actionJob?.id) await fetch(base + `/api/provision/tok-ama-12345678/job/${actionJob.id}/result?ok=1`);
  const after = await json(await send("GET", "/api/state", undefined, amaCookie));
  const amaRouter = after.docs?.routers?.value?.find((r) => r.ip === "10.0.0.1");
  check("a finished full provision is recorded on the router", amaRouter?.snmpConfigured === true && amaRouter?.walledGardenConfigured === true && amaRouter?.provisioningStatus === "Provisioned");
  const remoteJob = await send("POST", "/api/routers/jobs", { ip: "10.0.0.1", action: "remote-winbox" }, amaCookie);
  const remoteBody = (await json(remoteJob)).job;
  check("remote WinBox action is queued for the router", remoteJob.status === 200 && remoteBody?.script?.includes("hotspotpro-action:remote-winbox") && remoteBody.script.includes("back-to-home-vpn=enabled"), remoteBody?.script?.slice(0, 300));
  const refreshJob = await send("POST", "/api/routers/jobs", { ip: "10.0.0.1", action: "winbox" }, amaCookie);
  const refreshBody = (await json(refreshJob)).job;
  check("Regenerate WinBox keeps remote access when it is on", refreshJob.status === 200 && refreshBody?.script?.includes("back-to-home-vpn=enabled") && refreshBody.script.includes("0.0.0.0/0"), refreshBody?.script?.slice(0, 300));
  const wanJob = await send("POST", "/api/routers/jobs", {
    ip: "10.0.0.1",
    action: "multiwan",
    multiWanMode: "Failover",
    ispLinks: [
      { id: "1", label: "Primary", interface: "ether1", connectionType: "DHCP", gateway: "", dnsServers: "8.8.8.8", healthCheckIp: "8.8.8.8", allowRemovalFromBridge: true },
      { id: "2", label: "Backup", interface: "ether2", connectionType: "Static", gateway: "10.20.0.1", dnsServers: "1.1.1.1", healthCheckIp: "1.1.1.1", allowRemovalFromBridge: true },
    ],
  }, amaCookie);
  const wanBody = (await json(wanJob)).job;
  check("Multi-WAN action saves links and queues apply", wanJob.status === 200 && wanBody?.script?.includes("hotspotpro-action:multiwan") && wanBody.script.includes("ether2") && wanBody.script.includes("10.20.0.1"), wanBody?.script?.slice(0, 400));
  const wanSaved = (await json(await send("GET", "/api/state", undefined, amaCookie))).docs?.routers?.value?.find((r) => r.ip === "10.0.0.1");
  check("Multi-WAN Submit is stored on the router row", wanSaved?.multiWanMode === "Failover" && wanSaved?.ispLinks?.length === 2, JSON.stringify(wanSaved?.multiWanMode));
  await send("PUT", "/api/state/captivePortalConfigs", { value: { "10.0.0.1": { ssid: "AmaCafeWiFi" } } }, amaCookie);
  const wifiJob = await send("POST", "/api/routers/jobs", { ip: "10.0.0.1", action: "wifi" }, amaCookie);
  const wifiBody = (await json(wifiJob)).job;
  check("WiFi action applies the site SSID on the router", wifiJob.status === 200 && wifiBody?.script?.includes("AmaCafeWiFi") && wifiBody.script.includes("hotspotpro-bridge") && wifiBody.script.includes("datapath.bridge=hotspotpro-bridge"), wifiBody?.script?.slice(0, 400));
  check("check-in keeps WiFi on the hotspot so captive portal opens", cloudCtl.includes("datapath.bridge=hotspotpro-bridge") && cloudCtl.includes("HotspotPro DNS") && cloudCtl.includes("html-directory=$hpDir") && cloudCtl.includes("/interface wifiwave2"), "wifi + wifiwave2 + dns + html-directory");
  const vouchersJob = await send("POST", "/api/routers/jobs", { ip: "10.0.0.1", action: "sync-vouchers" }, amaCookie);
  const vouchersBody = (await json(vouchersJob)).job;
  check("sync-vouchers action pushes hotspot users", vouchersJob.status === 200 && vouchersBody?.script?.includes("hotspotpro-action:sync-vouchers") && vouchersBody.script.includes("/ip hotspot user"), vouchersBody?.script?.slice(0, 300));
  const apply = await send("POST", "/api/portal/agent-apply", {
    name: "Portal Applicant",
    email: "portal-agent@example.com",
    username: "portalagent",
    phone: "0244123456",
    whatsapp: "0244123456",
    location: "Accra",
    password: "secret12",
    routerIp: "10.0.0.1",
  }, "", { "x-hsp-rt": "tok-ama-12345678" });
  const applyBody = await json(apply);
  check("captive portal agent application is saved for the business", apply.status === 200 && applyBody.ok === true && applyBody.status === "Pending", JSON.stringify(applyBody));
  const agentsAfter = (await json(await send("GET", "/api/state", undefined, amaCookie))).docs?.agents?.value ?? [];
  check("admin sees the portal agent application", agentsAfter.some((a) => a.email === "portal-agent@example.com" && a.status === "Pending" && a.appliedViaPortal === true), JSON.stringify(agentsAfter.map((a) => a.email)));
  await send("PUT", "/api/state/routers", { value: [{ ip: "10.0.0.1", name: "Ama Router", status: "Online", provisioningStatus: "Provisioned", provisioningToken: "tok-quiet-offline1", health: "ok", lastSeen: "Just now" }] }, amaCookie);
  const quietCtl = await json(await send("GET", "/api/routers/control?ip=10.0.0.1", undefined, amaCookie));
  check("a provisioned router with no check-in is reported as lost signal", quietCtl.lostSignal === true && quietCtl.hasToken === true, JSON.stringify(quietCtl));
  const quietRow = (await json(await send("GET", "/api/state", undefined, amaCookie))).docs?.routers?.value?.find((r) => r.ip === "10.0.0.1");
  check("router status flips to Offline when the system has no contact", quietRow?.status === "Offline" && quietRow?.health === "offline", JSON.stringify(quietRow));
  // Restore Ama's live token for the rest of the suite.
  await send("PUT", "/api/state/routers", { value: [{ ip: "10.0.0.1", name: "Ama Router", status: "Online", provisioningToken: "tok-ama-12345678", provisioningStatus: "Provisioned" }] }, amaCookie);
  await fetch(base + "/api/provision/tok-ama-12345678/control");

  // ---- super admin powers; others are kept out ----
  check("a business cannot open the super admin area", (await send("GET", "/api/super/overview", undefined, amaCookie)).status === 403);
  check("signed-out cannot either", (await fetch(base + "/api/super/tenants")).status === 403);
  const overview = await json(await send("GET", "/api/super/overview", undefined, superCookie));
  check("overview counts the businesses", overview.totals?.businesses === 3 && overview.totals.routers === 2, JSON.stringify(overview.totals));
  const list = await json(await send("GET", "/api/super/tenants", undefined, superCookie));
  const ama = list.tenants?.find((t) => t.owner?.email === "ama@example.com");
  check("tenant list has owners and numbers", list.tenants?.length === 3 && ama?.stats?.routers === 1, JSON.stringify(list.tenants?.map((t) => t.name)));
  const detail = await json(await send("GET", `/api/super/tenants/${ama.id}`, undefined, superCookie));
  check("tenant detail shows routers and saved data", detail.routers?.[0]?.name === "Ama Router" && detail.data?.some((d) => d.key === "routers"), JSON.stringify(detail.routers));
  const people = await json(await send("GET", "/api/super/people", undefined, superCookie));
  check("people list covers all owners", people.people?.filter((p) => p.kind === "owner").length === 2);
  const ended = await json(await send("POST", `/api/super/tenants/${ama.id}/access`, { untilMs: Date.now() - 10 * 86400000 }, superCookie)); // past the 7-day grace
  check("ending online access locks that business", ended.locked === true, JSON.stringify(ended));
  const lockedCtl = await (await fetch(base + "/api/provision/tok-ama-12345678/control")).text();
  check("the router is told to lock its captive portal", lockedCtl.includes("HotspotPro access: locked") && lockedCtl.includes("locked.html") && !lockedCtl.includes('name="AMATEST1"'));
  const renewed = await json(await send("POST", "/api/access", { months: 1 }, amaCookie));
  check("renewing online access opens it again", renewed.locked === false && renewed.mode === "paid", JSON.stringify(renewed));
  const openedCtl = await (await fetch(base + "/api/provision/tok-ama-12345678/control")).text();
  check("the router is told the portal is open", openedCtl.includes("HotspotPro access: open"));

  // View as: the normal dashboard API then shows that business, with full access
  r = await send("POST", "/api/super/view", { tenantId: ama.id }, superCookie);
  const viewCookie = `${superCookie}; ${cookieOf(r)}`;
  const viewed = await json(await send("GET", "/api/state", undefined, viewCookie));
  check("'View as' shows Ama's data to the super admin", viewed.docs?.routers?.value?.[0]?.name === "Ama Router");
  check("'View as' can change that business's data", (await send("PUT", "/api/state/routers", { value: [...routerA, { ip: "10.0.0.9", name: "Added by super", status: "Online" }] }, viewCookie)).status === 200);
  const amaAfter = await json(await send("GET", "/api/state", undefined, amaCookie));
  check("…and Ama sees that change", amaAfter.docs?.routers?.value?.length === 2);
  const viewingMe = await json(await send("GET", "/api/auth/me", undefined, viewCookie));
  check("me reports who is being viewed", viewingMe.viewing?.name === "Ama Net", JSON.stringify(viewingMe.viewing));
  check("a normal business cannot fake a 'view as' cookie", (await json(await send("GET", "/api/state", undefined, `${amaCookie}; hotspotpro_view=${/* kofi's id */ list.tenants.find((t) => t.name === "Kofi WiFi").id}`))).docs?.routers?.value?.[0]?.name === "Ama Router");

  // suspend / reactivate
  r = await send("PATCH", `/api/super/tenants/${ama.id}`, { status: "suspended", reason: "unpaid" }, superCookie);
  check("super admin suspends a business", r.status === 200);
  check("suspended business is locked out of its data", (await send("GET", "/api/state", undefined, amaCookie)).status === 403);
  const blockedLogin = await send("POST", "/api/auth/login", { email: "ama@example.com", password: "ama-password-1" });
  check("suspended business cannot sign in", blockedLogin.status === 403);
  check("super admin can still look inside it", (await send("GET", "/api/state", undefined, viewCookie)).status === 200);
  check("its customer portal is closed too", (await fetch(base + "/api/portal/config?rt=tok-ama-12345678")).status === 403);
  check("a suspended business's routers keep getting their instructions", (await fetch(base + "/api/provision/tok-ama-12345678/control")).status === 200);
  await send("PATCH", `/api/super/tenants/${ama.id}`, { status: "active" }, superCookie);
  check("reactivated business works again", (await send("GET", "/api/state", undefined, amaCookie)).status === 200);

  // temp password
  const reset = await json(await send("POST", `/api/super/tenants/${ama.id}/reset-password`, {}, superCookie));
  check("super admin can set a temporary password", typeof reset.temporaryPassword === "string" && reset.email === "ama@example.com");
  check("the old password stops working, the new one works", (await send("POST", "/api/auth/login", { email: "ama@example.com", password: "ama-password-1" })).status === 401
    && (await send("POST", "/api/auth/login", { email: "ama@example.com", password: reset.temporaryPassword })).status === 200);

  // sign-up switch
  const setting = await json(await send("PATCH", "/api/super/settings", { signupOpen: false }, superCookie));
  check("super admin can close public sign-up", setting.settings?.signupOpen === false);
  check("sign-up is then refused", (await send("POST", "/api/auth/register", { name: "Late Comer", email: "late@example.com", password: "late-password-1" })).status === 403);
  await send("PATCH", "/api/super/settings", { signupOpen: true }, superCookie);

  // delete (needs the name typed)
  const kofi = list.tenants.find((t) => t.name === "Kofi WiFi");
  check("delete needs the name typed", (await send("DELETE", `/api/super/tenants/${kofi.id}`, { confirm: "nope" }, superCookie)).status === 400);
  check("super admin cannot delete their own business", (await send("DELETE", `/api/super/tenants/${list.tenants.find((t) => t.owner?.email === "owner@example.com").id}`, { confirm: "Owner WiFi" }, superCookie)).status === 400);
  check("super admin deletes a business", (await send("DELETE", `/api/super/tenants/${kofi.id}`, { confirm: "Kofi WiFi" }, superCookie)).status === 200);
  check("a deleted business's login stops working", (await send("GET", "/api/auth/me", undefined, kofiCookie)).status === 401);

  const activity = await json(await send("GET", "/api/super/activity", undefined, superCookie));
  check("activity log recorded it all", activity.entries?.some((e) => e.type === "signup") && activity.entries.some((e) => e.type === "suspended") && activity.entries.some((e) => e.type === "view-as") && activity.entries.some((e) => e.type === "deleted"));

  // ---- cloud WinBox relay comes back by itself after the API restarts ----
  await fetch(base + "/api/provision/tok-ama-12345678/winbox", { method: "POST", body: "[Interface]\nPrivateKey = abcdefghijklmnop=\nAddress = 192.168.216.2/32\n\n[Peer]\nPublicKey = abc=\nEndpoint = localhost:13231\n" });
  await sleep(600); // let the data file be written
  child.kill("SIGTERM");
  await new Promise((r) => (child.exitCode !== null ? r() : child.once("exit", r)));
  const armsBefore = relayArms.length;
  const port2 = port + 1;
  restarted = spawn(process.execPath, ["dist/server.mjs"], {
    cwd: dir,
    env: { ...process.env, PORT: String(port2), HOTSPOTPRO_DATA_DIR: data, HOTSPOTPRO_LOG: "off", HOTSPOTPRO_RADIUS: "off", NODE_ENV: "development", HOTSPOTPRO_WINBOX_RELAY_URL: relayUrl },
    stdio: ["ignore", "pipe", "pipe"],
  });
  restarted.stdout.on("data", (d) => (out += d));
  restarted.stderr.on("data", (d) => (out += d));
  for (let i = 0; i < 100 && relayArms.length === armsBefore; i++) await sleep(100);
  check("after a restart the cloud WinBox relay reconnects by itself", relayArms.length > armsBefore && !!relayArms.at(-1)?.includes("Endpoint = 127.0.0.1:13231") && !out.includes("restore skipped"), out.match(/\[winbox-relay\][^\n]*/g)?.join(" | ") || "no relay log");
} catch (e) {
  check("smoke test ran", false, String(e));
} finally {
  child.kill("SIGTERM");
  restarted?.kill("SIGTERM");
  fakeRelay.close();
  await sleep(500);
  fs.rmSync(data, { recursive: true, force: true });
}
console.log(`\n${pass} passed, ${failed} failed`);
if (failed) console.log(out.slice(-2000));
process.exit(failed ? 1 : 0);
