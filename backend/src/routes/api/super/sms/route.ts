import { NextResponse } from "next/server";
import { isDenied, requireSuper } from "@/server/superGuard";
import { smsOf } from "@/server/superStats";
import { listTenants } from "@/server/store";

// Super admin: the latest SMS sent by every business.
export async function GET(request: Request) {
  const guard = requireSuper(request);
  if (isDenied(guard)) return guard;
  const limit = Math.min(1000, Number(new URL(request.url).searchParams.get("limit") ?? 200) || 200);
  const rows = listTenants().flatMap((t) => smsOf(t.id, limit).map((m) => ({ ...m, tenantId: t.id, business: t.name })));
  rows.sort((a, b) => b.createdAt.localeCompare(a.createdAt));
  return NextResponse.json({ sms: rows.slice(0, limit) });
}
