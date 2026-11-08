import { NextResponse } from "next/server";
import { sessionFromRequest } from "@/server/auth";
import { publicOrigin, scriptFor } from "@/server/provision";
import { lintScript } from "@/server/routeros-lint";

// Admin: build the setup script for this link and check it — no router needed.
//   ?origin=http://192.168.1.50:3000&wireless=yes&ssid=My%20WiFi
export async function GET(request: Request, { params }: { params: Promise<{ token: string }> }) {
  const session = sessionFromRequest(request);
  if (!session || session.role !== "admin") return NextResponse.json({ message: "Admin only." }, { status: 401 });
  const { token } = await params;
  const q = new URL(request.url).searchParams;
  let origin = publicOrigin(request);
  const wanted = q.get("origin");
  if (wanted && !process.env.HOTSPOTPRO_PUBLIC_URL) {
    try {
      const u = new URL(wanted);
      if (u.protocol === "http:" || u.protocol === "https:") origin = u.origin;
    } catch { /* keep the default */ }
  }
  const script = scriptFor(token, { origin, wireless: q.get("wireless") === "yes", ssid: q.get("ssid") ?? undefined });
  if (!script) return NextResponse.json({ message: "This setup link isn't registered yet. Open the command step first." }, { status: 404 });
  return NextResponse.json({ origin, script, report: lintScript(script) });
}
