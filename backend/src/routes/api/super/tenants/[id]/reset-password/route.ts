import crypto from "node:crypto";
import { NextResponse } from "next/server";
import { hashPassword } from "@/server/auth";
import { isDenied, requireSuper } from "@/server/superGuard";
import { addAudit, getTenant, listAccounts, saveAccount } from "@/server/store";

// Super admin: give a business owner a new temporary password (shown once, here only).
export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const guard = requireSuper(request);
  if (isDenied(guard)) return guard;
  const { id } = await params;
  const tenant = getTenant(id);
  const account = listAccounts().find((a) => a.id === tenant?.ownerAccountId) ?? listAccounts().find((a) => a.tenantId === id);
  if (!tenant || !account) return NextResponse.json({ message: "No owner account found." }, { status: 404 });
  const temporary = crypto.randomBytes(9).toString("base64url");
  saveAccount({ ...account, passwordHash: hashPassword(temporary) });
  addAudit({ type: "password-reset", text: `${guard.email} set a new password for ${account.email}`, tenantId: id, actor: guard.email });
  return NextResponse.json({ email: account.email, temporaryPassword: temporary });
}
