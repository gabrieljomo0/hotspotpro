import { NextResponse } from "next/server";
import { hashPassword, sessionFromRequest, verifyAdmin } from "@/server/auth";
import { findAccountByEmail, saveAccount } from "@/server/store";

// Admin changes their own password: { currentPassword, newPassword }.
export async function POST(request: Request) {
  const session = sessionFromRequest(request);
  if (!session || session.role !== "admin") {
    return NextResponse.json({ message: "Sign in as admin first." }, { status: 401 });
  }
  const body = (await request.json().catch(() => ({}))) as { currentPassword?: string; newPassword?: string };
  if (!body.newPassword || body.newPassword.length < 8) {
    return NextResponse.json({ message: "The new password must be at least 8 characters." }, { status: 400 });
  }
  const account = verifyAdmin(session.email, body.currentPassword ?? "");
  if (!account) return NextResponse.json({ message: "The current password is incorrect." }, { status: 403 });
  const stored = findAccountByEmail(session.email);
  if (stored) saveAccount({ ...stored, passwordHash: hashPassword(body.newPassword) });
  return NextResponse.json({ success: true });
}
