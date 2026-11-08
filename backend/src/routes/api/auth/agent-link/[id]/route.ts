import { NextResponse } from "next/server";
import { findAgentById } from "@/server/directory";

// Public: lets /login?agent=<id> show whose sign-in page it is (name + email
// only — never the password) before anyone has signed in. With several businesses,
// the invite link may carry &biz=<business tag> to say which one.
export async function GET(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const biz = new URL(request.url).searchParams.get("biz");
  const hit = findAgentById<{ id: string; name?: string; email: string; status: string }>(id, biz);
  if (!hit) return NextResponse.json({ found: false }, { status: 404 });
  const agent = hit.row;
  return NextResponse.json({ found: true, id: agent.id, name: agent.name ?? "", email: agent.email, status: agent.status, biz: hit.tenant.tag });
}
