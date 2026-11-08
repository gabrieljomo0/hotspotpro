import { NextResponse } from "next/server";
import { VIEW_COOKIE, sessionCookie } from "@/server/auth";

export async function POST() {
  const response = NextResponse.json({ success: true });
  response.cookies.set(sessionCookie("", 0));
  response.cookies.set({ ...sessionCookie("", 0), name: VIEW_COOKIE });
  return response;
}
