import { NextResponse } from "next/server";
import { VIEW_COOKIE, sessionCookie } from "@/server/auth";
import { isDenied, requireSuper } from "@/server/superGuard";
import { addAudit, getTenant } from "@/server/store";

// Super admin: "View as" a business. From then on the normal dashboard (/dashboards) shows
// THAT business's data, with full access, until you exit. { tenantId }
export async function POST(request: Request) {
  const guard = requireSuper(request);
  if (isDenied(guard)) return guard;
  const { tenantId } = (await request.json().catch(() => ({}))) as { tenantId?: string };
  const tenant = tenantId ? getTenant(tenantId) : null;
  if (!tenant) return NextResponse.json({ message: "No such business." }, { status: 404 });
  addAudit({ type: "view-as", text: `${guard.email} opened "${tenant.name}" as super admin`, tenantId: tenant.id, actor: guard.email });
  const response = NextResponse.json({ success: true, tenant: { id: tenant.id, name: tenant.name } });
  response.cookies.set({ ...sessionCookie(tenant.id), name: VIEW_COOKIE });
  return response;
}

// Stop viewing: back to the super admin's own business.
export async function DELETE(request: Request) {
  const guard = requireSuper(request);
  if (isDenied(guard)) return guard;
  const response = NextResponse.json({ success: true });
  response.cookies.set({ ...sessionCookie("", 0), name: VIEW_COOKIE });
  return response;
}
