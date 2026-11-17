import { NextResponse } from "next/server";
import { sessionFromRequest } from "@/server/auth";
import { publicOrigin } from "@/server/provision";
import { routerActionScript } from "@/server/routerActions";
import { type IspLink } from "@/server/multiWan";
import { addAudit, currentTenantId, getState, jobsFor, queueJob, setState } from "@/server/store";

// Admin: the "Advanced" console. Queue RouterOS commands for one router; the router picks them up within
// about 30 seconds (it already calls the server that often, so this works from anywhere, behind any NAT,
// with no ports opened on the router) and reports whether each one ran.
//   GET  ?ip=<router ip>             -> recent commands and their status
//   POST { ip, script }              -> queue a command
//   POST { ip, action, multiWanMode, ispLinks } -> save Multi-WAN then queue apply
const MAX = 8000;
const ACTION_MAX = 20000;

function routerToken(ip: string): string | null {
  const value = getState("routers")?.value;
  if (!Array.isArray(value)) return null;
  const row = (value as { ip?: string; provisioningToken?: string }[]).find((r) => r && r.ip === ip);
  return row?.provisioningToken ?? null;
}

/** Persist Multi-WAN from the Submit button before the job script is built. */
function saveMultiWan(ip: string, mode: string | undefined, links: IspLink[] | undefined) {
  if (!mode && !links) return;
  const value = getState("routers")?.value;
  if (!Array.isArray(value)) return;
  let changed = false;
  const next = (value as Record<string, unknown>[]).map((row) => {
    if (!row || row.ip !== ip) return row;
    changed = true;
    return {
      ...row,
      ...(mode ? { multiWanMode: mode } : {}),
      ...(Array.isArray(links) ? { ispLinks: links } : {}),
    };
  });
  if (changed) setState("routers", next, "router");
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
  const body = (await request.json().catch(() => ({}))) as {
    ip?: string;
    script?: string;
    action?: string;
    multiWanMode?: string;
    ispLinks?: IspLink[];
  };
  const ip = (body.ip ?? "").slice(0, 200);
  const token = routerToken(ip);
  if (!token) return NextResponse.json({ message: "This router has no setup link yet, so it cannot receive commands." }, { status: 404 });
  if (body.action === "multiwan") saveMultiWan(ip, body.multiWanMode, body.ispLinks);
  if (body.action === "remote-winbox" || body.action === "remote-winbox-off") {
    const value = getState("routers")?.value;
    if (Array.isArray(value)) {
      const next = (value as Record<string, unknown>[]).map((row) => {
        if (!row || row.ip !== ip) return row;
        const on = body.action === "remote-winbox";
        return { ...row, remoteAccessEnabled: on, remoteAccessHold: !on };
      });
      setState("routers", next, "router");
    }
  }
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
