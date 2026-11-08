import { NextResponse } from "next/server";
import { sessionFromRequest } from "@/server/auth";
import { listEvents } from "@/server/store";

// Admin only: the latest webhook callbacks received (Hubtel, WhatsApp).
export async function GET(request: Request) {
  const session = sessionFromRequest(request);
  if (!session || session.role !== "admin") return NextResponse.json({ message: "Admin only." }, { status: 401 });
  const limit = Math.min(500, Number(new URL(request.url).searchParams.get("limit") ?? 100) || 100);
  return NextResponse.json({ events: listEvents(limit) });
}
