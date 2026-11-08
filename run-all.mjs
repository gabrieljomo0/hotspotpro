// Starts the whole project with one command:
//   1. the BACKEND  (./backend  -> http://localhost:4000, plus RADIUS on UDP 1812/1813)
//   2. the WEBSITE  (./frontend -> http://localhost:3000)
// It installs the website's packages the first time. The backend needs no install.
// Usage:  node run-all.mjs          (testing on your computer; or npm start, start.bat, bash start.sh)
//         node run-all.mjs --prod   (hosting: builds the website once, then runs it optimised)
import { spawn, spawnSync } from "node:child_process";
import fs from "node:fs";
import http from "node:http";
import net from "node:net";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.dirname(fileURLToPath(import.meta.url));
const backendDir = path.join(root, "backend");
const frontendDir = path.join(root, "frontend");
const isWin = process.platform === "win32";
// TEST COPY: `node run-all.mjs --test` runs a second, completely separate copy (its own data folder, ports and
// website build) next to the real one, so you can try an update without touching live data or live users.
// Add --copy-live to start it with a copy of the live data.
const TEST = process.argv.includes("--test");
const BACKEND_PORT = String(process.env.HOTSPOTPRO_BACKEND_PORT || (TEST ? 4100 : 4000));
let WEB_PORT = process.env.WEB_PORT || (TEST ? "3100" : "3000");
const PROD = process.argv.includes("--prod");
const HOST = TEST ? "127.0.0.1" : "localhost"; // a different host name keeps the test copy's login separate from the real one

const say = (text) => console.log(text);
function fail(text) {
  console.error(`\n${text}\n`);
  process.exit(1);
}

// ---- checks -------------------------------------------------------------------
if (Number(process.versions.node.split(".")[0]) < 20) fail(`Your Node.js is ${process.version}. HotspotPro needs version 20 or newer: https://nodejs.org`);
if (!fs.existsSync(path.join(backendDir, "src")) || !fs.existsSync(path.join(frontendDir, "app"))) fail("Run this from the project folder that contains the backend and frontend folders.");

function run(command, cwd) {
  const result = spawnSync(command, { cwd, stdio: "inherit", shell: true });
  return result.status === 0;
}

if (!fs.existsSync(path.join(frontendDir, "node_modules"))) {
  say("First start: installing the website's packages (a minute or two)...");
  if (!run("npm install", frontendDir)) fail("npm install failed in the frontend folder. Check your internet connection and try again.");
}
if (!fs.existsSync(path.join(backendDir, "dist", "server.mjs"))) {
  say("Building the backend (first time)...");
  if (!run("npm install", backendDir) || !run("npm run build", backendDir)) fail("Could not build the backend. Check your internet connection and try again.");
}

if (PROD && !fs.existsSync(path.join(frontendDir, ".next", "BUILD_ID"))) {
  say("Building the website for production (a few minutes)...");
  if (!run("npm run build", frontendDir)) fail("The website build failed. Read the messages above.");
}

// Earlier versions kept the data next to the website; carry it over once.
const oldData = path.join(frontendDir, "data");
const newData = path.join(backendDir, "data");
if (fs.existsSync(path.join(oldData, "db.json")) && !fs.existsSync(newData)) {
  fs.cpSync(oldData, newData, { recursive: true });
  say("Copied your saved data from frontend/data to backend/data.");
}

// ---- start --------------------------------------------------------------------
const children = [];
let stopping = false;

function prefixLines(stream, tag) {
  let buffer = "";
  stream.on("data", (chunk) => {
    buffer += chunk.toString();
    const lines = buffer.split(/\r?\n/);
    buffer = lines.pop() ?? "";
    for (const line of lines) if (line.trim()) console.log(`[${tag}] ${line}`);
  });
}

function stopAll(code = 0) {
  if (stopping) return;
  stopping = true;
  for (const child of children) {
    try {
      if (isWin) spawnSync(`taskkill /pid ${child.pid} /T /F`, { shell: true, stdio: "ignore" });
      else child.kill("SIGTERM");
    } catch { /* already gone */ }
  }
  setTimeout(() => process.exit(code), 800).unref();
}
process.on("SIGINT", () => stopAll(0));
process.on("SIGTERM", () => stopAll(0));

function start(tag, command, args, cwd, env, shell = false) {
  const child = spawn(command, args, { cwd, env, shell, stdio: ["ignore", "pipe", "pipe"] });
  children.push(child);
  prefixLines(child.stdout, tag);
  prefixLines(child.stderr, tag);
  child.on("exit", (code) => {
    if (!stopping) {
      console.error(`\n[${tag}] stopped (code ${code}). Stopping everything.\n`);
      stopAll(code ?? 1);
    }
  });
  return child;
}

function waitForBackend(tries = 40) {
  return new Promise((resolve) => {
    const attempt = (left) => {
      const req = http.get({ host: "127.0.0.1", port: BACKEND_PORT, path: "/api/health", timeout: 1000 }, (res) => {
        res.resume();
        resolve(res.statusCode === 200);
      });
      req.on("error", () => (left > 0 ? setTimeout(() => attempt(left - 1), 500) : resolve(false)));
      req.on("timeout", () => req.destroy());
    };
    attempt(tries);
  });
}

function portFree(port) {
  return new Promise((resolve) => {
    const server = net.createServer();
    server.once("error", () => resolve(false));
    server.once("listening", () => server.close(() => resolve(true)));
    server.listen(Number(port));
  });
}
const busyHelp = (port) =>
  isWin
    ? `Find what is using it:  netstat -ano | findstr :${port}   then stop it:  taskkill /PID <number> /F\n(An older HotspotPro still open in another window is the usual cause: close that window, or run  taskkill /IM node.exe /F  to stop every Node program.)`
    : `Find what is using it:  lsof -i :${port}   then stop it:  kill <pid>`;

if (!(await portFree(BACKEND_PORT))) {
  fail(`Port ${BACKEND_PORT} (the backend) is already in use, so HotspotPro can't start.\n${busyHelp(BACKEND_PORT)}`);
}
if (!(await portFree(WEB_PORT))) {
  const wanted = WEB_PORT;
  for (let p = Number(wanted) + 1; p <= Number(wanted) + 20; p++) {
    if (await portFree(p)) {
      WEB_PORT = String(p);
      break;
    }
  }
  if (WEB_PORT === wanted) fail(`Port ${wanted} is in use and no nearby port is free.\n${busyHelp(wanted)}`);
  say(`Port ${wanted} is busy (probably an older copy still running), so the website will use port ${WEB_PORT} instead.`);
}

say("Starting the backend...");
const backendEnv = { ...process.env, PORT: BACKEND_PORT, HOTSPOTPRO_WEB_PORT: WEB_PORT };
if (TEST) {
  const testData = path.join(backendDir, "data-test");
  fs.mkdirSync(testData, { recursive: true });
  const live = path.join(backendDir, "data", "db.json");
  if (process.argv.includes("--copy-live") && fs.existsSync(live)) {
    fs.copyFileSync(live, path.join(testData, "db.json"));
    say("TEST COPY: started with a copy of your live data (the live data itself is not touched).");
  }
  backendEnv.HOTSPOTPRO_DATA_DIR = testData;
  backendEnv.HOTSPOTPRO_RADIUS_PORT = "11812";
  backendEnv.HOTSPOTPRO_RADIUS_ACCT_PORT = "11813";
  say("TEST COPY: data in backend/data-test, backend port " + BACKEND_PORT + ", RADIUS 11812/11813.");
}
if (PROD) {
  backendEnv.NODE_ENV = "production";
  // Login cookies are "secure" (https only) in production. Plain http (testing the
  // production mode on your own computer) needs them relaxed.
  if (!String(process.env.HOTSPOTPRO_PUBLIC_URL || "").startsWith("https://")) backendEnv.HOTSPOTPRO_INSECURE_COOKIES = "1";
}
start("backend", process.execPath, ["dist/server.mjs"], backendDir, backendEnv);

if (!(await waitForBackend())) {
  stopAll(1);
  fail(`The backend did not start. Look at the [backend] messages above (a common cause: port ${BACKEND_PORT} is already in use).`);
}

say("Starting the website...");
const webEnv = { ...process.env, PORT: WEB_PORT, HOTSPOTPRO_BACKEND_URL: `http://127.0.0.1:${BACKEND_PORT}` };
if (TEST) webEnv.HOTSPOTPRO_DIST_DIR = ".next-test";
start("web", PROD ? `npm run start -- -p ${WEB_PORT}` : "npm run dev", [], frontendDir, webEnv, true);

setTimeout(() => {
  if (stopping) return;
  say("");
  say(`  HotspotPro${TEST ? " (TEST COPY - not the real site)" : ""} is starting.  Open  http://${HOST}:${WEB_PORT}`);
  say("  First visit: click \"Create one\" - the first account becomes the super admin.");
  say(`  Backend API: http://localhost:${BACKEND_PORT}/api/health     Stop everything: Ctrl+C`);
  say("");
}, 2500);
