import { NextResponse } from "next/server";
import { sessionFromRequest } from "@/server/auth";
import { BACKEND_PORT, lanOrigins } from "@/server/provision";

// Admin: the addresses of this computer/server that a router on the same
// network could use in the setup command (a router can't use "localhost").
export async function GET(request: Request) {
  const session = sessionFromRequest(request);
  if (!session || session.role !== "admin") return NextResponse.json({ message: "Admin only." }, { status: 401 });
  // Routers call the backend directly, so these use the backend's own port.
  const proto = request.headers.get("x-forwarded-proto") ?? "http";
  return NextResponse.json({
    configured: process.env.HOTSPOTPRO_PUBLIC_URL || null,
    candidates: lanOrigins(BACKEND_PORT, proto),
  });
}
