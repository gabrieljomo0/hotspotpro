import { NextResponse } from "next/server";
import { sessionFromRequest } from "@/server/auth";
import { salesReport } from "@/server/purchase";

// Admin: online sales and the commission owed on them, from the payments ledger.
//   /api/reports/sales?period=this-month|last-month|all   (or ?from=<ms>&to=<ms>)
export async function GET(request: Request) {
  const session = sessionFromRequest(request);
  if (!session || session.role !== "admin") return NextResponse.json({ message: "Admin only." }, { status: 401 });
  const q = new URL(request.url).searchParams;
  const now = new Date();
  let from = Number(q.get("from") ?? NaN), to = Number(q.get("to") ?? NaN);
  const period = q.get("period");
  if (period === "this-month") { from = new Date(now.getFullYear(), now.getMonth(), 1).getTime(); to = Infinity; }
  else if (period === "last-month") { from = new Date(now.getFullYear(), now.getMonth() - 1, 1).getTime(); to = new Date(now.getFullYear(), now.getMonth(), 1).getTime(); }
  else if (!Number.isFinite(from) || !Number.isFinite(to)) { from = -Infinity; to = Infinity; }
  return NextResponse.json(salesReport(from, to));
}
