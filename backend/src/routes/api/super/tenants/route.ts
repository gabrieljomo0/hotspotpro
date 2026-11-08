import { NextResponse } from "next/server";
import { isDenied, requireSuper } from "@/server/superGuard";
import { allTenantSummaries } from "@/server/superStats";

// Super admin: every business on the platform with its owner and numbers.
export async function GET(request: Request) {
  const guard = requireSuper(request);
  if (isDenied(guard)) return guard;
  return NextResponse.json({ tenants: allTenantSummaries() });
}
