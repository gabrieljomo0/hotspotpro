import { NextResponse } from "next/server";
import { listTenants } from "@/server/store";

export async function GET() {
  return NextResponse.json({ ok: true, businesses: listTenants().length, time: new Date().toISOString() });
}
