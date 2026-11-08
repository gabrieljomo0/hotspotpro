import { NextResponse } from "next/server";
import { sessionFromRequest } from "@/server/auth";
import { accessDecision, extendAccess } from "@/server/accessGate";
import { addAudit } from "@/server/store";

// The signed-in business: is the captive portal open, and when does it lock?
export async function GET(request: Request) {
  const session = sessionFromRequest(request);
  if (!session) return NextResponse.json({ message: "Not signed in." }, { status: 401 });
  return NextResponse.json(accessDecision());
}

// Record a renewal. The router picks this up on its next check-in and unlocks the portal.
export async function POST(request: Request) {
  const session = sessionFromRequest(request);
  if (!session || session.role !== "admin") return NextResponse.json({ message: "Admin only." }, { status: 403 });
  const body = (await request.json().catch(() => ({}))) as { months?: number };
  const months = Number(body.months);
  if (!Number.isFinite(months) || months < 1 || months > 36) return NextResponse.json({ message: "Choose between 1 and 36 months." }, { status: 400 });
  const access = extendAccess(months);
  addAudit({ type: "access", text: `Online access renewed for ${Math.round(months)} month(s).`, tenantId: session.tid, actor: session.sub });
  return NextResponse.json(access);
}
