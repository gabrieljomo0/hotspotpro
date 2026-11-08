import { NextResponse } from "next/server";
import { sessionFromRequest } from "@/server/auth";
import { canRead, canWrite, mergeForWrite, redactForRead } from "@/server/access";
import { getState, setState } from "@/server/store";

const KEY = /^[A-Za-z0-9_.-]{1,80}$/;
const MAX_BYTES = 20 * 1024 * 1024;

export async function GET(request: Request, { params }: { params: Promise<{ key: string }> }) {
  const session = sessionFromRequest(request);
  if (!session) return NextResponse.json({ message: "Not signed in." }, { status: 401 });
  const { key } = await params;
  const doc = KEY.test(key) && canRead(session, key) ? getState(key) : null;
  if (!doc) return NextResponse.json({ message: "Nothing saved under this name." }, { status: 404 });
  return NextResponse.json({ ...doc, value: redactForRead(session, key, doc.value) }, { headers: { "Cache-Control": "no-store" } });
}

// PUT /api/state/<key>   body: { value }
export async function PUT(request: Request, { params }: { params: Promise<{ key: string }> }) {
  const session = sessionFromRequest(request);
  if (!session) return NextResponse.json({ message: "Not signed in." }, { status: 401 });
  const { key } = await params;
  if (!KEY.test(key)) return NextResponse.json({ message: "Invalid name." }, { status: 400 });
  if (!canWrite(session, key)) return NextResponse.json({ message: "Your account can't change this." }, { status: 403 });
  const text = await request.text();
  if (text.length > MAX_BYTES) return NextResponse.json({ message: "Too large." }, { status: 413 });
  let body: { value?: unknown };
  try {
    body = JSON.parse(text);
  } catch {
    return NextResponse.json({ message: "Invalid JSON." }, { status: 400 });
  }
  if (!("value" in body)) return NextResponse.json({ message: "Missing value." }, { status: 400 });
  const doc = setState(key, mergeForWrite(session, key, body.value, getState(key)?.value), `${session.role}:${session.sub}`);
  return NextResponse.json({ rev: doc.rev, seq: doc.seq, updatedAt: doc.updatedAt });
}
