import { NextResponse } from "next/server";
import { sessionFromRequest } from "@/server/auth";
import { completeProvision, scriptFor } from "@/server/provision";
import { lintScript } from "@/server/routeros-lint";

// Admin, for testing only: pretend the router downloaded and ran its script —
// builds + checks the script, then does what the router's final call does.
// Disabled in production unless HOTSPOTPRO_ALLOW_SIMULATE=1.
export async function POST(request: Request, { params }: { params: Promise<{ token: string }> }) {
  const session = sessionFromRequest(request);
  if (!session || session.role !== "admin") return NextResponse.json({ message: "Admin only." }, { status: 401 });
  if (process.env.NODE_ENV === "production" && process.env.HOTSPOTPRO_ALLOW_SIMULATE !== "1") {
    return NextResponse.json({ message: "Test check-in is switched off on a live server." }, { status: 403 });
  }
  const { token } = await params;
  const body = (await request.json().catch(() => ({}))) as { origin?: string; wireless?: boolean; ssid?: string };
  let origin = "http://test.local";
  try { if (body.origin) origin = new URL(body.origin).origin; } catch { /* default */ }
  const script = scriptFor(token, { origin, wireless: !!body.wireless, ssid: body.ssid });
  if (!script) return NextResponse.json({ message: "This setup link isn't registered yet." }, { status: 404 });
  const report = lintScript(script);
  if (!report.ok) return NextResponse.json({ message: "The script has errors, so a router would not finish. Fix them first.", report }, { status: 422 });
  completeProvision(token, { failed: 0, sourceIp: null, simulated: true });
  return NextResponse.json({ success: true, report });
}
