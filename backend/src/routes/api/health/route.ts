import { NextResponse } from "next/server";
import { SETUP_VERSION } from "@/server/routeros";
import { listTenants } from "@/server/store";

export async function GET() {
  return NextResponse.json({
    ok: true,
    businesses: listTenants().length,
    setupVersion: SETUP_VERSION,
    time: new Date().toISOString(),
  });
}
