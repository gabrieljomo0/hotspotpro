import { NextResponse } from "next/server";
import { sessionFromRequest } from "@/server/auth";
import { hubtelStatus } from "@/server/payments";
import { markFailed, markPaid } from "@/server/purchase";
import { getPayment } from "@/server/store";

// Admin: ask Hubtel again about a payment that is stuck on "pending".
export async function POST(request: Request, { params }: { params: Promise<{ ref: string }> }) {
  const session = sessionFromRequest(request);
  if (!session || session.role !== "admin") return NextResponse.json({ message: "Admin only." }, { status: 401 });
  const { ref } = await params;
  const payment = getPayment(ref);
  if (!payment) return NextResponse.json({ message: "Unknown payment." }, { status: 404 });
  if (payment.gateway !== "hubtel") return NextResponse.json({ status: payment.status, message: "Only live Hubtel payments can be re-checked." });
  const status = await hubtelStatus(ref);
  if (status === "paid") markPaid(ref);
  else if (status === "failed") markFailed(ref, "Hubtel reports the payment did not go through.");
  return NextResponse.json({ hubtel: status, status: getPayment(ref)?.status });
}
