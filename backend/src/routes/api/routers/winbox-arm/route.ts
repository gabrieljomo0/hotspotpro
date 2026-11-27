import { NextResponse } from "next/server";
import { sessionFromRequest } from "@/server/auth";
import { getState } from "@/server/store";
import { armWinboxRelay, winboxRelayAddress, winboxRelayEnabled } from "@/server/winboxRelay";

/** Admin: arm cloud WinBox relay from a router's stored Back-To-Home conf. */
export async function POST(request: Request) {
  const session = sessionFromRequest(request);
  if (!session || session.role !== "admin") return NextResponse.json({ message: "Admin only." }, { status: 401 });
  if (!winboxRelayEnabled()) {
    return NextResponse.json({ ok: false, message: "WinBox relay is off on this server." }, { status: 503 });
  }
  const body = (await request.json().catch(() => null)) as { ip?: string } | null;
  const ip = (body?.ip || "").trim();
  if (!ip) return NextResponse.json({ message: "Router ip required." }, { status: 400 });

  const value = getState("routers")?.value;
  if (!Array.isArray(value)) return NextResponse.json({ message: "No routers." }, { status: 404 });
  const row = (value as {
    ip?: string;
    provisioningToken?: string;
    wireguardConfig?: string | null;
    remoteAccessHold?: boolean;
    name?: string;
  }[]).find((r) => r && r.ip === ip);
  if (!row?.provisioningToken) return NextResponse.json({ message: "Router not found." }, { status: 404 });
  if (row.remoteAccessHold === true) {
    return NextResponse.json({ ok: false, message: "Remote access is off for this router." }, { status: 400 });
  }
  if (typeof row.wireguardConfig !== "string" || !row.wireguardConfig.includes("[Interface]")) {
    return NextResponse.json({
      ok: false,
      waiting: true,
      message: "Waiting for the router to publish its tunnel (keep it online, then try again).",
    });
  }

  const armed = await armWinboxRelay(row.provisioningToken, row.wireguardConfig);
  const address = winboxRelayAddress();
  if (!armed || !address) {
    return NextResponse.json({
      ok: false,
      message: "Could not arm the cloud WinBox relay. Check that the API host has the relay running.",
    }, { status: 503 });
  }
  return NextResponse.json({
    ok: true,
    address: address.includes(":") ? address : `${address}:8291`,
    router: row.name || ip,
  });
}
