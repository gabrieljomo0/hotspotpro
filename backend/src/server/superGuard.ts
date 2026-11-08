import { NextResponse } from "next/server";
import { superSession, type Session } from "./auth";

/** Every /api/super/* route starts here: only the platform's super admin gets through. */
export function requireSuper(request: Request): Session | NextResponse {
  const session = superSession(request);
  if (!session) return NextResponse.json({ message: "Super admin only." }, { status: 403 });
  return session;
}
export const isDenied = (value: Session | NextResponse): value is NextResponse => value instanceof NextResponse;
