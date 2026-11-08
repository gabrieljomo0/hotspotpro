import { NextResponse } from "next/server";
import { sessionFromRequest } from "@/server/auth";
import { paymentMode, webhookSecret } from "@/server/payments";
import { publicOrigin } from "@/server/provision";
import { radiusSecret } from "@/server/radius";

// Admin: the addresses and secrets to put into Hubtel and into routers.
export async function GET(request: Request) {
  const session = sessionFromRequest(request);
  if (!session || session.role !== "admin") return NextResponse.json({ message: "Admin only." }, { status: 401 });
  const origin = publicOrigin(request);
  return NextResponse.json({
    paymentMode: paymentMode(),
    hubtelCallbackUrl: `${origin}/api/webhooks/hubtel?secret=${webhookSecret()}`,
    radius: {
      host: process.env.HOTSPOTPRO_RADIUS_HOST || new URL(origin).hostname,
      authPort: Number(process.env.HOTSPOTPRO_RADIUS_PORT || 1812),
      acctPort: Number(process.env.HOTSPOTPRO_RADIUS_ACCT_PORT || 1813),
      secret: radiusSecret(),
    },
  });
}
