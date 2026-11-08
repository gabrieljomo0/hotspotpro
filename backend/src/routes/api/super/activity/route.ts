import { NextResponse } from "next/server";
import { isDenied, requireSuper } from "@/server/superGuard";
import { listAudit } from "@/server/store";

// Super admin: the platform's activity log (sign-ups, sign-ins, suspensions, deletions, "view as", settings).
export async function GET(request: Request) {
  const guard = requireSuper(request);
  if (isDenied(guard)) return guard;
  const limit = Math.min(1000, Number(new URL(request.url).searchParams.get("limit") ?? 200) || 200);
  return NextResponse.json({ entries: listAudit(limit) });
}
