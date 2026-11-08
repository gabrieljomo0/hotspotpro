import { NextResponse } from "next/server";
import { isDenied, requireSuper } from "@/server/superGuard";
import { paymentsOf, routersOf, sliceInfo, smsOf, tenantSummary } from "@/server/superStats";
import { addAudit, deleteTenant, getTenant, listAccounts, listAudit, updateTenant } from "@/server/store";

type Ctx = { params: Promise<{ id: string }> };

// Super admin: one business in full (owner, accounts, routers, payments, SMS, activity, saved data).
export async function GET(request: Request, { params }: Ctx) {
  const guard = requireSuper(request);
  if (isDenied(guard)) return guard;
  const { id } = await params;
  const tenant = getTenant(id);
  if (!tenant) return NextResponse.json({ message: "No such business." }, { status: 404 });
  return NextResponse.json({
    tenant: tenantSummary(tenant),
    accounts: listAccounts()
      .filter((a) => a.tenantId === id)
      .map((a) => ({ id: a.id, email: a.email, name: a.name ?? "", role: a.role, createdAt: a.createdAt, lastLoginAt: a.lastLoginAt ?? null })),
    routers: routersOf(id),
    payments: paymentsOf(id, 30),
    sms: smsOf(id, 30),
    activity: listAudit(60, id),
    data: sliceInfo(id),
  });
}

// Suspend / reactivate, rename, or write a private note: { status?, reason?, name?, notes? }
export async function PATCH(request: Request, { params }: Ctx) {
  const guard = requireSuper(request);
  if (isDenied(guard)) return guard;
  const { id } = await params;
  const tenant = getTenant(id);
  if (!tenant) return NextResponse.json({ message: "No such business." }, { status: 404 });
  const body = (await request.json().catch(() => ({}))) as { status?: string; reason?: string; name?: string; notes?: string };

  if (body.status === "suspended" || body.status === "active") {
    if (body.status === "suspended" && tenant.ownerAccountId === guard.sub) {
      return NextResponse.json({ message: "You cannot suspend your own business." }, { status: 400 });
    }
    updateTenant(id, {
      status: body.status,
      suspendedAt: body.status === "suspended" ? new Date().toISOString() : undefined,
      suspendedReason: body.status === "suspended" ? (body.reason ?? "").trim() || undefined : undefined,
    });
    addAudit({
      type: body.status === "suspended" ? "suspended" : "reactivated",
      text: `${guard.email} ${body.status === "suspended" ? "suspended" : "reactivated"} "${tenant.name}"${body.reason ? `: ${body.reason}` : ""}`,
      tenantId: id,
      actor: guard.email,
    });
  }
  if (typeof body.name === "string" && body.name.trim()) updateTenant(id, { name: body.name.trim() });
  if (typeof body.notes === "string") updateTenant(id, { notes: body.notes.slice(0, 4000) });
  return NextResponse.json({ tenant: tenantSummary(getTenant(id)!) });
}

// Permanently delete a business and ALL its data. The body must repeat the business name: { confirm }.
export async function DELETE(request: Request, { params }: Ctx) {
  const guard = requireSuper(request);
  if (isDenied(guard)) return guard;
  const { id } = await params;
  const tenant = getTenant(id);
  if (!tenant) return NextResponse.json({ message: "No such business." }, { status: 404 });
  if (tenant.ownerAccountId === guard.sub || listAccounts().some((a) => a.tenantId === id && a.id === guard.sub)) {
    return NextResponse.json({ message: "You cannot delete your own business." }, { status: 400 });
  }
  const body = (await request.json().catch(() => ({}))) as { confirm?: string };
  if ((body.confirm ?? "").trim() !== tenant.name) {
    return NextResponse.json({ message: "Type the business name exactly to confirm." }, { status: 400 });
  }
  deleteTenant(id);
  addAudit({ type: "deleted", text: `${guard.email} deleted "${tenant.name}" and all of its data`, tenantId: null, actor: guard.email });
  return NextResponse.json({ success: true });
}
