import { NextResponse } from "next/server";
import { BACKEND_PORT } from "@/server/provision";
import { DATA_DIR, addAudit, listTenants, platformSettings, setPlatformSettings } from "@/server/store";
import { isDenied, requireSuper } from "@/server/superGuard";

function info() {
  return {
    settings: platformSettings(),
    system: {
      version: "2",
      node: process.version,
      uptimeSeconds: Math.round(process.uptime()),
      production: process.env.NODE_ENV === "production",
      dataDir: DATA_DIR,
      backendPort: BACKEND_PORT,
      publicUrl: process.env.HOTSPOTPRO_PUBLIC_URL ?? null,
      setupCodeSet: Boolean(process.env.HOTSPOTPRO_SETUP_CODE),
      radius: process.env.HOTSPOTPRO_RADIUS === "off" ? "off" : { authPort: Number(process.env.HOTSPOTPRO_RADIUS_PORT || 1812), acctPort: Number(process.env.HOTSPOTPRO_RADIUS_ACCT_PORT || 1813) },
      businesses: listTenants().length,
    },
  };
}

export async function GET(request: Request) {
  const guard = requireSuper(request);
  if (isDenied(guard)) return guard;
  return NextResponse.json(info());
}

// { signupOpen } — switch public sign-up for new businesses on or off.
export async function PATCH(request: Request) {
  const guard = requireSuper(request);
  if (isDenied(guard)) return guard;
  const body = (await request.json().catch(() => ({}))) as { signupOpen?: boolean };
  if (typeof body.signupOpen === "boolean") {
    setPlatformSettings({ signupOpen: body.signupOpen });
    addAudit({ type: "settings", text: `${guard.email} turned public sign-up ${body.signupOpen ? "ON" : "OFF"}`, actor: guard.email });
  }
  return NextResponse.json(info());
}
