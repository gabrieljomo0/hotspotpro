import { NextResponse } from "next/server";
import { sessionFromRequest } from "@/server/auth";
import { getProvision } from "@/server/store";

// Admin: has the router downloaded its script / finished running it yet?
export async function GET(request: Request, { params }: { params: Promise<{ token: string }> }) {
  const session = sessionFromRequest(request);
  if (!session || session.role !== "admin") return NextResponse.json({ message: "Admin only." }, { status: 401 });
  const { token } = await params;
  const item = getProvision(token);
  return NextResponse.json({ registered: !!item, fetched: !!item?.fetchedAt, done: !!item?.doneAt });
}
