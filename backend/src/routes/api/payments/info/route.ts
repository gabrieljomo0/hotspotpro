import { NextResponse } from "next/server";
import { sessionFromRequest } from "@/server/auth";
import { paymentMode, webhookSecret } from "@/server/payments";
import { publicOrigin } from "@/server/provision";
import { radiusCloudEnabled, radiusPorts, radiusPublicHost, radiusSecret } from "@/server/radius";

// Admin: the addresses and secrets to put into Hubtel and into routers.
export async function GET(request: Request) {
  const session = sessionFromRequest(request);
  if (!session || session.role !== "admin") return NextResponse.json({ message: "Admin only." }, { status: 401 });
  const origin = publicOrigin(request);
  const ports = radiusPorts();
  return NextResponse.json({
    paymentMode: paymentMode(),
    hubtelCallbackUrl: `${origin}/api/webhooks/hubtel?secret=${webhookSecret()}`,
    radius: {
      enabled: radiusCloudEnabled(),
      host: radiusPublicHost(new URL(origin).hostname),
      authPort: ports.authPort,
      acctPort: ports.acctPort,
      secret: radiusSecret(),
    },
  });
}
