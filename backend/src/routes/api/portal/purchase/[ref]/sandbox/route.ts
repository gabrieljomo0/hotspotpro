import { NextResponse } from "next/server";
import { paymentMode } from "@/server/payments";
import { markFailed, markPaid } from "@/server/purchase";
import { getPayment } from "@/server/store";

// Sandbox only: stand in for the customer approving (or refusing) the prompt on their phone.
export async function POST(request: Request, { params }: { params: Promise<{ ref: string }> }) {
  const { ref } = await params;
  const payment = getPayment(ref);
  if (!payment || payment.gateway !== "sandbox" || paymentMode() !== "sandbox") {
    return NextResponse.json({ message: "Not available." }, { status: 404 });
  }
  const body = (await request.json().catch(() => ({}))) as { outcome?: string };
  if (body.outcome === "fail") markFailed(ref, "The payment was declined (sandbox).");
  else markPaid(ref, { providerTxId: `SANDBOX-${ref}` });
  return NextResponse.json({ status: getPayment(ref)?.status });
}
