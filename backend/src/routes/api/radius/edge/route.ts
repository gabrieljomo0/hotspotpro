import { NextResponse } from "next/server";
import {
  ACCT_REQUEST,
  ACCT_RESPONSE,
  ACCESS_REQUEST,
  buildResponse,
  handleAccess,
  handleAccounting,
  parsePacket,
  radiusSecret,
} from "@/server/radius";

/**
 * HTTP bridge for a public UDP edge (home VPS / Windows with a public IP).
 * MikroTik talks UDP to the edge; the edge POSTs the raw packet here so voucher
 * decisions stay on this API (Supabase) even when this host cannot receive UDP.
 *
 * Auth: Authorization: Bearer <HOTSPOTPRO_RADIUS_SECRET> (or x-hotspotpro-radius-edge).
 */
function authorized(request: Request) {
  const want = radiusSecret();
  if (!want) return false;
  const header = request.headers.get("authorization") || "";
  const bearer = header.match(/^Bearer\s+(.+)$/i)?.[1]?.trim() || "";
  const alt = (request.headers.get("x-hotspotpro-radius-edge") || "").trim();
  return bearer === want || alt === want;
}

export async function POST(request: Request) {
  if (!authorized(request)) {
    return NextResponse.json({ ok: false, message: "Unauthorized." }, { status: 401 });
  }
  const body = (await request.json().catch(() => null)) as
    | { kind?: string; packet?: string; source?: string }
    | null;
  const kind = (body?.kind || "").trim();
  const source = (body?.source || "").trim() || "0.0.0.0";
  const raw = typeof body?.packet === "string" ? Buffer.from(body.packet, "base64") : null;
  if (!raw || raw.length < 20) {
    return NextResponse.json({ ok: false, message: "Missing packet." }, { status: 400 });
  }
  const packet = parsePacket(raw);
  if (!packet) {
    return NextResponse.json({ ok: false, message: "Bad packet." }, { status: 400 });
  }
  const secret = radiusSecret();

  if (kind === "auth" && packet.code === ACCESS_REQUEST) {
    const reply = handleAccess(packet, source, secret);
    return NextResponse.json({ ok: true, reply: reply.toString("base64") });
  }
  if (kind === "acct" && packet.code === ACCT_REQUEST) {
    handleAccounting(packet, source);
    const reply = buildResponse(ACCT_RESPONSE, packet, [], secret);
    return NextResponse.json({ ok: true, reply: reply.toString("base64") });
  }
  return NextResponse.json({ ok: false, message: "Unsupported." }, { status: 400 });
}
