import os from "node:os";
import type { NextConfig } from "next";

// Phones and routers open the website by this computer's network address; allow every address it has in development.
const LAN = Object.values(os.networkInterfaces()).flatMap((list) => list ?? []).filter((i) => i.family === "IPv4" && !i.internal).map((i) => i.address);

// The website (this folder) only draws the screens. Everything it saves or checks
// is done by the backend (the ../backend folder, a separate server). The website's
// own server forwards every /api request to it, so the browser only ever talks to
// one address and the login cookie works as normal.
const BACKEND = (process.env.HOTSPOTPRO_BACKEND_URL || "http://127.0.0.1:4000").replace(/\/+$/, "");

const nextConfig: NextConfig = {
  // The test copy (start-test) builds into its own folder so it never disturbs the real one.
  distDir: process.env.HOTSPOTPRO_DIST_DIR || ".next",
  allowedDevOrigins: ["127.0.0.1", ...LAN],
  async rewrites() {
    return [
      { source: "/api/:path*", destination: `${BACKEND}/api/:path*` },
      // The Payments screen shows the callback as /webhooks/hubtel.
      { source: "/webhooks/hubtel", destination: `${BACKEND}/api/webhooks/hubtel` },
    ];
  },
};

export default nextConfig;
