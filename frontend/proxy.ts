import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

// Runs before every protected page. It asks the backend who the signed-in person is
// (the backend owns the login cookie and the secret that signs it):
//   /super-admin/*           -> the platform super admin only
//   /dashboards/*            -> admin only (a business owner, or the super admin)
//   /agent-portal/<id>       -> admin, or that agent (signed in as them)
//   /installer-portal/<id>   -> admin, or that installer
// Anyone else is sent to /login (remembering where they were headed).
const BACKEND = (process.env.HOTSPOTPRO_BACKEND_URL || "http://127.0.0.1:4000").replace(/\/+$/, "");

type Me = { authenticated?: boolean; role?: "admin" | "agent" | "installer"; id?: string; super?: boolean; suspended?: boolean };

type Check = { me: Me | null; reason: "no-cookie" | "backend-down" | "rejected" | null };

async function whoAmI(request: NextRequest): Promise<Check> {
  const cookie = request.headers.get("cookie");
  if (!cookie || !cookie.includes("hotspotpro_session")) return { me: null, reason: "no-cookie" };
  try {
    const response = await fetch(`${BACKEND}/api/auth/me`, { headers: { cookie }, cache: "no-store", signal: AbortSignal.timeout(4000) });
    if (!response.ok) return { me: null, reason: "rejected" };
    return { me: (await response.json()) as Me, reason: null };
  } catch {
    return { me: null, reason: "backend-down" }; // backend not running; the login page explains
  }
}

export async function proxy(request: NextRequest) {
  const { me, reason } = await whoAmI(request);
  const path = request.nextUrl.pathname;
  const [, area, id] = path.split("/");

  let allowed = false;
  let suspended = false;
  if (me?.authenticated && area === "super-admin") {
    allowed = me.role === "admin" && me.super === true; // the platform super admin only
  } else if (me?.authenticated && me.suspended && !me.super) {
    suspended = true; // the business was suspended by the platform administrator
  } else if (me?.authenticated) {
    if (me.role === "admin") allowed = true;
    else if (area === "agent-portal") allowed = me.role === "agent" && me.id === id;
    else if (area === "installer-portal") allowed = me.role === "installer" && me.id === id;
  }

  // Signed in, but not the super admin: send them to their own dashboard instead of the login page.
  if (!allowed && me?.authenticated && area === "super-admin" && !suspended) {
    return NextResponse.redirect(new URL("/dashboards", request.url));
  }

  if (!allowed) {
    const loginUrl = new URL("/login", request.url);
    loginUrl.searchParams.set("next", path);
    const why = suspended ? "suspended" : (reason && reason !== "no-cookie" ? reason : null);
    if (why) loginUrl.searchParams.set("reason", why);
    return NextResponse.redirect(loginUrl);
  }
  return NextResponse.next();
}

export const config = {
  matcher: ["/dashboards/:path*", "/agent-portal/:path*", "/installer-portal/:path*", "/super-admin/:path*"],
};
