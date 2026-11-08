import { NextResponse } from "next/server";
import { sessionFromRequest } from "@/server/auth";
import { allControlStatus, controlStatus } from "@/server/control";

// Admin: is this router disconnected, is it still in contact (it asks the server every 30 seconds),
// and when did it last go quiet and come back? With ?ip= for one router; without it, every router.
// The lists and the router page poll this.
export async function GET(request: Request) {
  const session = sessionFromRequest(request);
  if (!session || session.role !== "admin") return NextResponse.json({ message: "Admin only." }, { status: 401 });
  const ip = (new URL(request.url).searchParams.get("ip") ?? "").slice(0, 200);
  if (!ip) return NextResponse.json({ routers: allControlStatus() }, { headers: { "Cache-Control": "no-store" } });
  const status = ip ? controlStatus(ip) : null;
  if (!status) return NextResponse.json({ message: "Router not found on the server yet." }, { status: 404 });
  return NextResponse.json(status, { headers: { "Cache-Control": "no-store" } });
}
