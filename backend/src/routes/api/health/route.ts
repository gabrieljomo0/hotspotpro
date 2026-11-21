import { NextResponse } from "next/server";
import { radiusCloudEnabled, radiusListenEnabled, radiusPorts, radiusPublicHost } from "@/server/radius";
import { SETUP_VERSION } from "@/server/routeros";
import { listTenants } from "@/server/store";

export async function GET() {
  const on = radiusCloudEnabled();
  const ports = radiusPorts();
  return NextResponse.json({
    ok: true,
    businesses: listTenants().length,
    setupVersion: SETUP_VERSION,
    radius: on ? "on" : "off",
    radiusListen: radiusListenEnabled() ? "on" : "off",
    radiusHost: on ? radiusPublicHost() || null : null,
    radiusAuthPort: ports.authPort,
    radiusAcctPort: ports.acctPort,
    time: new Date().toISOString(),
  });
}
