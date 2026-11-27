import { NextResponse } from "next/server";
import { sessionFromRequest } from "@/server/auth";
import { currentTenantId, registerProvision, tenantOfToken } from "@/server/store";

const TOKEN = /^[A-Za-z0-9_-]{8,128}$/;
const FIELDS = [
  "name", "hotspotEnabled", "hotspotNetwork", "hotspotGatewayIp", "hotspotDnsServers",
  "dnsName", "routerType", "hasWireless", "wifiSsid", "pppoeEnabled", "pppoeNetwork", "wanInterface", "managementPort",
  "lastPortFree", "adminFromWan",
  "loginMode",
];

// Admin: register a setup link ({ token, router: {...} }) while the "Add router"
// page is showing its command, so the router can download its script before the
// router has been saved in the app.
export async function POST(request: Request) {
  const session = sessionFromRequest(request);
  if (!session || session.role !== "admin") return NextResponse.json({ message: "Admin only." }, { status: 401 });
  const body = (await request.json().catch(() => ({}))) as { token?: string; router?: Record<string, unknown> };
  if (!body.token || !TOKEN.test(body.token) || !body.router) {
    return NextResponse.json({ message: "Invalid request." }, { status: 400 });
  }
  const owner = tenantOfToken(body.token);
  if (owner && owner !== currentTenantId()) return NextResponse.json({ message: "That setup link is already in use." }, { status: 409 });
  const config: Record<string, unknown> = {};
  for (const field of FIELDS) if (field in body.router) config[field] = body.router[field];
  if (typeof config.name !== "string" || !config.name.trim()) {
    return NextResponse.json({ message: "A router name is needed." }, { status: 400 });
  }
  registerProvision(body.token, config);
  return NextResponse.json({ success: true });
}
