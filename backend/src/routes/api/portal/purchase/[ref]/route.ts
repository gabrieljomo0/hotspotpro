import { NextResponse } from "next/server";
import { getPayment } from "@/server/store";
import { refreshPending } from "@/server/purchase";

// Public (the reference is long and random): where is this payment up to?
export async function GET(_request: Request, { params }: { params: Promise<{ ref: string }> }) {
  const { ref } = await params;
  let payment = /^[A-Z0-9]{8,40}$/.test(ref) ? getPayment(ref) : null;
  if (!payment) return NextResponse.json({ message: "Unknown payment." }, { status: 404 });
  payment = await refreshPending(payment);
  return NextResponse.json({
    status: payment.status,
    reason: payment.failureReason,
    mode: payment.gateway,
    amount: payment.amount,
    packageName: payment.packageName,
    buyerType: payment.buyerType,
    paidAt: payment.paidAt,
    voucher: payment.status === "paid" ? { username: payment.voucherCode, password: payment.voucherCode } : undefined,
  });
}
