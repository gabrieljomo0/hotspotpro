import { NextResponse } from "next/server";
import crypto from "node:crypto";
import { hubtelReady, hubtelStatus, paymentMode, webhookSecret } from "@/server/payments";
import { markFailed, markPaid } from "@/server/purchase";
import { addEvent, getPayment, tenantOfPayment, withTenant } from "@/server/store";

// Hubtel payment callback. The address we give Hubtel for each payment already
// carries ?secret=...; a callback without it is not trusted by itself — we ask
// Hubtel's status API whether the payment really happened.
export async function POST(request: Request) {
  const given = new URL(request.url).searchParams.get("secret") ?? request.headers.get("x-webhook-secret") ?? "";
  const expected = webhookSecret();
  const trusted = given.length === expected.length && crypto.timingSafeEqual(Buffer.from(given), Buffer.from(expected));

  const raw = await request.text();
  let body: unknown = raw;
  try { body = JSON.parse(raw); } catch { /* keep raw text */ }
  const b = body as { ResponseCode?: string; Message?: string; Data?: { ClientReference?: string; Amount?: number; TransactionId?: string } };
  const ref = b?.Data?.ClientReference;
  // The callback doesn't say which business it is for, but the payment reference does.
  const tenantId = ref ? tenantOfPayment(ref) : null;
  addEvent({
    tenantId, id: crypto.randomUUID(), source: "hubtel", receivedAt: new Date().toISOString(), verified: trusted,
    headers: { "content-type": request.headers.get("content-type") ?? "" }, body,
  });

  if (!tenantId) return NextResponse.json({ received: true });
  return withTenant(tenantId, () => settle(b, trusted, ref!));
}

async function settle(
  b: { ResponseCode?: string; Message?: string; Data?: { ClientReference?: string; Amount?: number; TransactionId?: string } },
  trusted: boolean,
  ref: string,
) {
  const payment = getPayment(ref);
  if (payment && payment.status === "pending") {
    if (trusted) {
      if (b.ResponseCode === "0000") markPaid(payment.id, { providerTxId: b.Data?.TransactionId, amount: b.Data?.Amount });
      else markFailed(payment.id, b.Message || "The payment was declined.");
    } else if (paymentMode() === "hubtel" && hubtelReady()) {
      const status = await hubtelStatus(payment.id);
      if (status === "paid") markPaid(payment.id, { providerTxId: b.Data?.TransactionId });
      else if (status === "failed") markFailed(payment.id, "The payment was declined.");
    }
  }
  return NextResponse.json({ received: true });
}
