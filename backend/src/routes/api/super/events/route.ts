import { NextResponse } from "next/server";
import { isDenied, requireSuper } from "@/server/superGuard";
import { getTenant, listAllEvents } from "@/server/store";

// Super admin: every webhook callback (Hubtel, WhatsApp) received by the platform.
export async function GET(request: Request) {
  const guard = requireSuper(request);
  if (isDenied(guard)) return guard;
  const limit = Math.min(1000, Number(new URL(request.url).searchParams.get("limit") ?? 200) || 200);
  return NextResponse.json({
    events: listAllEvents(limit).map((e) => ({ ...e, business: e.tenantId ? getTenant(e.tenantId)?.name ?? null : null })),
  });
}
