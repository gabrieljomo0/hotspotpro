import { NextResponse } from "next/server";
import { radiusCloudEnabled } from "@/server/radius";
import { SETUP_VERSION } from "@/server/routeros";
import { listTenants } from "@/server/store";

export async function GET() {
  return NextResponse.json({
    ok: true,
    businesses: listTenants().length,
    setupVersion: SETUP_VERSION,
    radius: radiusCloudEnabled() ? "on" : "off",
    time: new Date().toISOString(),
  });
}
