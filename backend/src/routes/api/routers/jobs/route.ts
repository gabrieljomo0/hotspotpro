import { NextResponse } from "next/server";
import { sessionFromRequest } from "@/server/auth";
import { publicOrigin } from "@/server/provision";
import { routerActionScript } from "@/server/routerActions";
import { addAudit, currentTenantId, getState, jobsFor, queueJob } from "@/server/store";

// Admin: the "Advanced" console. Queue RouterOS commands for one router; the router picks them up within
// about 30 seconds (it already calls the server that often, so this works from anywhere, behind any NAT,
// with no ports opened on the router) and reports whether each one ran.
//   GET  ?ip=<router ip>             -> recent commands and their status
//   POST { ip, script }              -> queue a command
const MAX = 8000;
const ACTION_MAX = 20000;

function routerToken(ip: string): string | null {
  const value = getState("routers")?.value;
  if (!Array.isArray(value)) return null;
  const row = (value as { ip?: string; provisioningToken?: string }[]).find((r) => r && r.ip === ip);
  return row?.provisioningToken ?? null;
}

export async function GET(request: Request) {
  const session = sessionFromRequest(request);
  if (!session || session.role !== "admin") return NextResponse.json({ message: "Admin only." }, { status: 401 });
  const ip = (new URL(request.url).searchParams.get("ip") ?? "").slice(0, 200);
  const token = routerToken(ip);
  if (!token) return NextResponse.json({ message: "This router has no setup link yet, so it cannot receive commands. Add it with the Add router page first." }, { status: 404 });
  return NextResponse.json({ jobs: jobsFor(token) }, { headers: { "Cache-Control": "no-store" } });
}

export async function POST(request: Request) {
  const session = sessionFromRequest(request);
  if (!session || session.role !== "admin") return NextResponse.json({ message: "Admin only." }, { status: 401 });
  const body = (await request.json().catch(() => ({}))) as { ip?: string; script?: string; action?: string };
  const token = routerToken((body.ip ?? "").slice(0, 200));
  if (!token) return NextResponse.json({ message: "This router has no setup link yet, so it cannot receive commands." }, { status: 404 });
  const built = body.action ? routerActionScript(body.action, { origin: publicOrigin(request), token }) : null;
  if (body.action && !built) return NextResponse.json({ message: "Unknown router action." }, { status: 400 });
  const script = (built ?? body.script ?? "").replace(/\r/g, "").trim();
  if (!script) return NextResponse.json({ message: "Type a RouterOS command first." }, { status: 400 });
  const limit = built ? ACTION_MAX : MAX;
  if (script.length > limit) return NextResponse.json({ message: `Too long (maximum ${limit} characters).` }, { status: 400 });
  const job = queueJob(token, script, session.email);
  addAudit({ type: "router-command", text: `${session.email} queued a command for router ${body.ip}`, tenantId: currentTenantId(), actor: session.email });
  return NextResponse.json({ job });
}
