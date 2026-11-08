import { NextResponse } from "next/server";
import { clientIp, limited } from "@/server/limit";
import { publicOrigin } from "@/server/provision";
import { createPurchase } from "@/server/purchase";

// Public: a customer starts buying a package.
export async function POST(request: Request) {
  if (limited(`buy|${clientIp(request)}`, 8, 60_000)) {
    return NextResponse.json({ message: "Too many attempts. Wait a minute and try again." }, { status: 429 });
  }
  const body = (await request.json().catch(() => ({}))) as Record<string, string | undefined>;
  if (!body.packageId || !body.phone) return NextResponse.json({ message: "Choose a package and enter your phone number." }, { status: 400 });
  const buyerType = body.buyerType === "other" || body.buyerType === "device" ? body.buyerType : "self";
  const result = await createPurchase({
    packageId: String(body.packageId),
    phone: String(body.phone),
    buyerType,
    recipientPhone: body.recipientPhone,
    deviceMac: body.deviceMac,
    routerIp: body.routerIp ?? null,
    origin: publicOrigin(request),
  });
  if (!result.ok) return NextResponse.json({ message: result.message }, { status: result.status });
  return NextResponse.json({ reference: result.payment.id, mode: result.payment.gateway });
}
