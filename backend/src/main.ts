import fs from "node:fs";
import http from "node:http";
import path from "node:path";
import os from "node:os";
import { handleHttp } from "./http/adapter";
import { adoptDatabase, currentDatabase, DATA_DIR, flush } from "@/server/store";
import { pullDatabase, pushDatabase, supabaseEnabled } from "@/server/supabaseRemote";
import { startRadius } from "@/server/radius";

const port = Number(process.env.PORT || process.env.HOTSPOTPRO_BACKEND_PORT || 4000);
const quiet = process.env.HOTSPOTPRO_LOG === "off";

// Safety copy of the data: one when the server starts, then one every 6 hours (the newest 20 are kept)
// in <data folder>/backups, so an update or a mistake can always be undone.
function backupData() {
  try {
    const file = path.join(DATA_DIR, "db.json");
    if (!fs.existsSync(file)) return;
    const dir = path.join(DATA_DIR, "backups");
    fs.mkdirSync(dir, { recursive: true });
    const stamp = new Date().toISOString().replace(/[:.]/g, "-").slice(0, 19);
    fs.copyFileSync(file, path.join(dir, `db-${stamp}.json`));
    const old = fs.readdirSync(dir).filter((f) => /^db-.*\.json$/.test(f)).sort().slice(0, -20);
    for (const f of old) fs.rmSync(path.join(dir, f), { force: true });
  } catch (error) {
    console.error("[hotspotpro] backup failed:", error);
  }
}
backupData();
setInterval(backupData, 6 * 3600 * 1000).unref();

const server = http.createServer((req, res) => {
  const started = Date.now();
  handleHttp(req, res)
    .then((status) => {
      if (!quiet && !(req.url ?? "").startsWith("/api/state") && !(req.url ?? "").startsWith("/api/routers/")) {
        console.log(`${new Date().toISOString().slice(11, 19)} ${req.method} ${(req.url ?? "").split("?")[0]} ${status} ${Date.now() - started}ms`);
      }
    })
    .catch((error) => {
      console.error("[hotspotpro] unexpected error:", error);
      if (!res.headersSent) res.writeHead(500, { "Content-Type": "application/json" });
      res.end(JSON.stringify({ message: "Something went wrong on the server." }));
    });
});

server.on("error", (error: NodeJS.ErrnoException) => {
  if (error.code === "EADDRINUSE") {
    console.error(`\n[hotspotpro] Port ${port} is already in use. Close the other program, or choose another port: PORT=4001 (set it in backend/.env).\n`);
  } else {
    console.error("[hotspotpro] server error:", error);
  }
  process.exit(1);
});

if (supabaseEnabled()) {
  const remote = await pullDatabase();
  if (remote.ok && remote.body) adoptDatabase(remote.body);
  else if (remote.ok) await pushDatabase(currentDatabase());
}

server.listen(port, "0.0.0.0", () => {
  const lan = Object.values(os.networkInterfaces())
    .flatMap((list) => list ?? [])
    .filter((i) => i.family === "IPv4" && !i.internal)
    .map((i) => `http://${i.address}:${port}`);
  console.log("");
  console.log("  HotspotPro backend is running");
  console.log(`  API:       http://localhost:${port}/api/health`);
  if (lan.length) console.log(`  For routers on your network: ${lan.join("  ")}`);
  console.log(`  Data:      ${DATA_DIR}`);
  console.log("");
  startRadius();
  void import("@/server/winboxRelay")
    .then(({ restoreWinboxRelay }) => restoreWinboxRelay())
    .catch((error) => console.warn("[winbox-relay] restore skipped:", error instanceof Error ? error.message : error));
});

async function shutdown() {
  console.log("\n[hotspotpro] stopping...");
  try { await flush(); } catch { /* nothing to save */ }
  server.close(() => process.exit(0));
  setTimeout(() => process.exit(0), 1500).unref();
}
process.on("SIGINT", shutdown);
process.on("SIGTERM", shutdown);
