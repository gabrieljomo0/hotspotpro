import { NextResponse } from "next/server";
import { findRouterByToken } from "@/server/provision";
import { jobById } from "@/server/store";

/** Public: has the router finished applying a portal voucher-sync job? */
export async function GET(request: Request) {
  const token = (request.headers.get("x-hsp-rt") || "").trim();
  const id = new URL(request.url).searchParams.get("id")?.trim() || "";
  if (!token || !findRouterByToken(token) || !id) {
    return NextResponse.json({ status: "unknown" }, { status: 404 });
  }
  const job = jobById(token, id);
  if (!job) return NextResponse.json({ status: "unknown" }, { status: 404 });
  return NextResponse.json({ status: job.status, id: job.id });
}
