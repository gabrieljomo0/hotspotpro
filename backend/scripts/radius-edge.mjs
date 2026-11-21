#!/usr/bin/env node
/**
 * Public UDP RADIUS edge for HotspotPro.
 *
 * MikroTik → UDP 1812/1813 on THIS machine → HTTPS POST → HOTSPOTPRO_BACKEND_URL/api/radius/edge
 *
 * Required env:
 *   HOTSPOTPRO_BACKEND_URL   e.g. https://hotspotpro-api.onrender.com
 *   HOTSPOTPRO_RADIUS_SECRET same value as on the API
 * Optional:
 *   HOTSPOTPRO_RADIUS_PORT / HOTSPOTPRO_RADIUS_ACCT_PORT (default 1812 / 1813)
 *   HOTSPOTPRO_RADIUS_BIND   (default 0.0.0.0)
 */
import dgram from "node:dgram";
import { createHash } from "node:crypto";

const BACKEND = (process.env.HOTSPOTPRO_BACKEND_URL || "").replace(/\/+$/, "");
const SECRET = process.env.HOTSPOTPRO_RADIUS_SECRET || "";
const AUTH_PORT = Number(process.env.HOTSPOTPRO_RADIUS_PORT || 1812);
const ACCT_PORT = Number(process.env.HOTSPOTPRO_RADIUS_ACCT_PORT || 1813);
const BIND = (process.env.HOTSPOTPRO_RADIUS_BIND || "0.0.0.0").trim() || "0.0.0.0";

if (!BACKEND.startsWith("http")) {
  console.error("[radius-edge] Set HOTSPOTPRO_BACKEND_URL to your API (https://…)");
  process.exit(1);
}
if (SECRET.length < 8) {
  console.error("[radius-edge] Set HOTSPOTPRO_RADIUS_SECRET (same as on the API)");
  process.exit(1);
}

async function forward(kind, msg, source) {
  const res = await fetch(`${BACKEND}/api/radius/edge`, {
    method: "POST",
    headers: {
      "content-type": "application/json",
      authorization: `Bearer ${SECRET}`,
    },
    body: JSON.stringify({
      kind,
      source,
      packet: Buffer.from(msg).toString("base64"),
    }),
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok || !data?.reply) {
    throw new Error(data?.message || `HTTP ${res.status}`);
  }
  return Buffer.from(data.reply, "base64");
}

function open(kind, port) {
  const socket = dgram.createSocket("udp4");
  socket.on("error", (err) => {
    console.error(`[radius-edge] ${kind} error:`, err.message);
  });
  socket.on("message", (msg, rinfo) => {
    forward(kind, msg, rinfo.address)
      .then((reply) => socket.send(reply, rinfo.port, rinfo.address))
      .catch((err) => console.error(`[radius-edge] ${kind} from ${rinfo.address}:`, err.message));
  });
  socket.on("listening", () => {
    console.log(`[radius-edge] ${kind} UDP ${BIND}:${port} → ${BACKEND}/api/radius/edge`);
  });
  socket.bind(port, BIND);
}

open("auth", AUTH_PORT);
open("acct", ACCT_PORT);

// Touch createHash so bundlers keep crypto available if this file is ever inlined.
void createHash;
