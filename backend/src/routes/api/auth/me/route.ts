import { NextResponse } from "next/server";
import { sessionFromRequest, viewTenantFromRequest } from "@/server/auth";
import { findAccountByEmail, getTenant } from "@/server/store";

export async function GET(request: Request) {
  const session = sessionFromRequest(request);
  if (!session) return NextResponse.json({ authenticated: false }, { status: 401 });
  const account = session.role === "admin" ? findAccountByEmail(session.email) : undefined;
  // The account must still exist (a deleted business cannot keep using an old cookie).
  if (session.role === "admin" && !account) return NextResponse.json({ authenticated: false }, { status: 401 });
  const isSuper = !!session.sup && account?.role === "superadmin";
  const viewingId = isSuper ? viewTenantFromRequest(request) : null;
  const viewing = viewingId ? getTenant(viewingId) : null;
  const tenant = session.tid ? getTenant(session.tid) : null;
  return NextResponse.json({
    authenticated: true,
    role: session.role,
    id: session.sub,
    email: session.email,
    name: account?.name,
    businessName: tenant?.name ?? account?.businessName,
    super: isSuper,
    tenantId: session.tid ?? null,
    suspended: tenant?.status === "suspended",
    viewing: viewing ? { id: viewing.id, name: viewing.name, status: viewing.status } : null,
  });
}
