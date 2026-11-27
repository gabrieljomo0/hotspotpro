import { spawn } from "node:child_process";

const relayOff = ["0", "off", "false", "no"].includes(String(process.env.HOTSPOTPRO_WINBOX_RELAY || "on").toLowerCase());

if (!relayOff) {
  const child = spawn("/usr/local/bin/winbox-relay", [], {
    stdio: "inherit",
    detached: true,
  });
  child.unref();
  await new Promise((r) => setTimeout(r, 800));
}

const node = spawn(process.execPath, ["dist/server.mjs"], { stdio: "inherit" });
node.on("exit", (code, signal) => {
  if (signal) process.kill(process.pid, signal);
  process.exit(code ?? 1);
});
