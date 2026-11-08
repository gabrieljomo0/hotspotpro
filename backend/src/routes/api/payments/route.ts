import { NextResponse } from "next/server";
import { sessionFromRequest } from "@/server/auth";
import { listPayments } from "@/server/store";

// Admin: the payments ledger (newest first).
export async function GET(request: Request) {
  const session = sessionFromRequest(request);
  if (!session || session.role !== "admin") return NextResponse.json({ message: "Admin only." }, { status: 401 });
  const limit = Math.min(1000, Number(new URL(request.url).searchParams.get("limit") ?? 200) || 200);
  return NextResponse.json({ payments: listPayments(limit) });
}
