import { NextResponse } from "next/server";
import { sessionFromRequest } from "@/server/auth";
import { canRead, redactForRead } from "@/server/access";
import { currentTenantId, deleteAllState, getAllState } from "@/server/store";

// GET /api/state            -> every saved slice (used when the app loads)
// GET /api/state?since=<n>  -> only slices changed after change-number n
export async function GET(request: Request) {
  const session = sessionFromRequest(request);
  if (!session) return NextResponse.json({ message: "Not signed in." }, { status: 401 });
  const since = Number(new URL(request.url).searchParams.get("since") ?? 0) || 0;
  const { seq, docs } = getAllState(since);
  const visible: typeof docs = {};
  for (const [key, doc] of Object.entries(docs)) {
    if (canRead(session, key)) visible[key] = { ...doc, value: redactForRead(session, key, doc.value) };
  }
  // "scope" says whose data this is (business + who is signed in); the browser clears its own cached copy when it changes.
  const scope = `${currentTenantId()}|${session.role}|${session.sub}`;
  return NextResponse.json({ seq, docs: visible, scope }, { headers: { "Cache-Control": "no-store" } });
}

// DELETE /api/state -> admin wipes every saved slice (Settings -> Reset demo data).
export async function DELETE(request: Request) {
  const session = sessionFromRequest(request);
  if (!session || session.role !== "admin") return NextResponse.json({ message: "Admin only." }, { status: 401 });
  deleteAllState();
  return NextResponse.json({ success: true });
}
