import { NextResponse } from "next/server";
import { getLoginTicket } from "@/server/portalLogin";
import { findRouterByToken } from "@/server/provision";

/** Public: has the router downloaded the HTTP auto-login page for this Connect attempt? */
export async function GET(request: Request) {
  const token = (request.headers.get("x-hsp-rt") || "").trim();
  const id = new URL(request.url).searchParams.get("t")?.trim() || "";
  if (!token || !findRouterByToken(token) || !id) {
    return NextResponse.json({ ready: false }, { status: 404 });
  }
  const ticket = getLoginTicket(id, token);
  if (!ticket) return NextResponse.json({ ready: false, status: "missing" });
  return NextResponse.json({
    ready: !!ticket.fetchedAt,
    status: ticket.fetchedAt ? "ready" : "waiting",
  });
}
