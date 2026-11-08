import { NextResponse } from "next/server";
import { sessionFromRequest } from "@/server/auth";
import {
  linkRouterSource, routerRows, routerUsage, simulationAllowed, startSimulation, stopSimulation, tickSimulation,
} from "@/server/routerUsage";

// Admin: data usage for one router (?ip=<the router's ip as shown in the app>).
// The page polls this every few seconds for the live numbers.
function admin(request: Request) {
  const session = sessionFromRequest(request);
  return session && session.role === "admin" ? session : null;
}
function routerIpOf(request: Request) {
  return (new URL(request.url).searchParams.get("ip") ?? "").slice(0, 200);
}

export async function GET(request: Request) {
  if (!admin(request)) return NextResponse.json({ message: "Admin only." }, { status: 401 });
  const ip = routerIpOf(request);
  if (!ip) return NextResponse.json({ message: "Which router? Add ?ip=" }, { status: 400 });
  tickSimulation(ip); // moves sample customers forward when the test button was used; does nothing otherwise
  return NextResponse.json(routerUsage(ip), { headers: { "Cache-Control": "no-store" } });
}

// Actions: {action: "simulate"} | {action: "clear-test"} | {action: "link", key}
export async function POST(request: Request) {
  if (!admin(request)) return NextResponse.json({ message: "Admin only." }, { status: 401 });
  const ip = routerIpOf(request);
  const body = (await request.json().catch(() => ({}))) as { action?: string; key?: string };
  if (!ip || !routerRows().some((r) => r.ip === ip)) return NextResponse.json({ message: "That router isn't saved on the server yet — wait a few seconds and try again." }, { status: 404 });

  if (body.action === "simulate" || body.action === "clear-test") {
    if (!simulationAllowed()) return NextResponse.json({ message: "Sample traffic is switched off on a live server." }, { status: 403 });
    if (body.action === "simulate") startSimulation(ip);
    else stopSimulation(ip);
    return NextResponse.json(routerUsage(ip));
  }
  if (body.action === "link" && typeof body.key === "string") {
    linkRouterSource(ip, body.key.slice(0, 300));
    return NextResponse.json(routerUsage(ip));
  }
  return NextResponse.json({ message: "Unknown action." }, { status: 400 });
}
