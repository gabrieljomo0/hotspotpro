import { NextResponse } from "next/server";
import { sessionFromRequest } from "@/server/auth";
import { sendSms } from "@/server/sms";
import { listSms } from "@/server/store";

function adminOnly(request: Request) {
  const s = sessionFromRequest(request);
  return s && s.role === "admin" ? s : null;
}

// Admin: the SMS log.
export async function GET(request: Request) {
  if (!adminOnly(request)) return NextResponse.json({ message: "Admin only." }, { status: 401 });
  return NextResponse.json({ messages: listSms(200) });
}

// Admin: send a test message  { to, message }
export async function POST(request: Request) {
  if (!adminOnly(request)) return NextResponse.json({ message: "Admin only." }, { status: 401 });
  const body = (await request.json().catch(() => ({}))) as { to?: string; message?: string };
  if (!body.to || !body.message) return NextResponse.json({ message: "Enter a phone number and a message." }, { status: 400 });
  const result = await sendSms(body.to, body.message.slice(0, 480));
  return NextResponse.json(result, { status: result.ok ? 200 : 502 });
}
