import { NextResponse } from "next/server";
import crypto from "node:crypto";
import { addEvent, tenantByTag } from "@/server/store";

// WhatsApp provider callback. Set it in your WhatsApp provider's settings as
//   https://<your-address>/api/webhooks/whatsapp?biz=<your business code>
// (the Settings page shows the exact address, with your business code filled in).
// If HOTSPOTPRO_WHATSAPP_WEBHOOK_SECRET is set, requests must carry it as
// "?secret=..." or an "x-webhook-secret" header; otherwise they are only logged
// as unverified. Every callback is stored (see GET /api/events).
export async function POST(request: Request) {
  const secret = process.env.HOTSPOTPRO_WHATSAPP_WEBHOOK_SECRET;
  const given = new URL(request.url).searchParams.get("secret") ?? request.headers.get("x-webhook-secret") ?? "";
  const verified = !!secret && given.length === secret.length && crypto.timingSafeEqual(Buffer.from(given), Buffer.from(secret));
  if (secret && !verified) return NextResponse.json({ message: "Forbidden" }, { status: 403 });

  const raw = await request.text();
  let body: unknown = raw;
  try {
    body = JSON.parse(raw);
  } catch {
    /* keep raw text */
  }
  const tenant = tenantByTag(new URL(request.url).searchParams.get("biz") ?? "");
  addEvent({
    tenantId: tenant?.id ?? null,
    id: crypto.randomUUID(),
    source: "whatsapp",
    receivedAt: new Date().toISOString(),
    verified,
    headers: { "content-type": request.headers.get("content-type") ?? "" },
    body,
  });
  return NextResponse.json({ received: true });
}
