import { NextResponse } from "next/server";
import { isDenied, requireSuper } from "@/server/superGuard";
import { paymentsOf } from "@/server/superStats";
import { listTenants } from "@/server/store";

// Super admin: the latest payments across every business.
export async function GET(request: Request) {
  const guard = requireSuper(request);
  if (isDenied(guard)) return guard;
  const limit = Math.min(1000, Number(new URL(request.url).searchParams.get("limit") ?? 200) || 200);
  const rows = listTenants().flatMap((t) => paymentsOf(t.id, limit).map((p) => ({ ...p, tenantId: t.id, business: t.name })));
  rows.sort((a, b) => b.createdAt.localeCompare(a.createdAt));
  return NextResponse.json({ payments: rows.slice(0, limit) });
}
