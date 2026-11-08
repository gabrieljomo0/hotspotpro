import { NextResponse } from "next/server";
import { isDenied, requireSuper } from "@/server/superGuard";
import { accessDecision, setAccessUntil } from "@/server/accessGate";
import { addAudit, getTenant, withTenant } from "@/server/store";

// Super admin sets the moment online access runs out. A time in the past locks the portal after the grace period.
export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const guard = requireSuper(request);
  if (isDenied(guard)) return guard;
  const { id } = await params;
  if (!getTenant(id)) return NextResponse.json({ message: "No such business." }, { status: 404 });
  const body = (await request.json().catch(() => ({}))) as { untilMs?: number };
  const untilMs = Number(body.untilMs);
  if (!Number.isFinite(untilMs)) return NextResponse.json({ message: "untilMs is required." }, { status: 400 });
  setAccessUntil(id, untilMs);
  addAudit({ type: "access", text: `Set online access until ${new Date(untilMs).toISOString()}.`, tenantId: id, actor: guard.sub });
  return NextResponse.json(withTenant(id, () => accessDecision()));
}
