import { NextResponse } from "next/server";
import { voucherOnlyLogin } from "@/server/hotspotPages";
import { type Pkg, list, priceOf, routerAllowsPackage } from "@/server/packages";
import { paymentMode } from "@/server/payments";
import { getProvision, getState } from "@/server/store";

// Public: what a customer on the WiFi portal may buy (packages for the router
// they are connected to, and whether online payment is available).
export async function GET(request: Request) {
  const url = new URL(request.url);
  let routerIp = url.searchParams.get("router");
  const token = url.searchParams.get("rt");
  if (token) {
    const routers = getState("routers")?.value;
    const match = Array.isArray(routers) ? (routers as { ip: string; provisioningToken?: string }[]).find((r) => r.provisioningToken === token) : undefined;
    if (match) routerIp = match.ip;
    else if (!getProvision(token)) routerIp = routerIp ?? null;
  }
  const packages = list<Pkg & { displayOrder?: number }>("packages")
    .filter((p) => routerAllowsPackage(p, routerIp) && priceOf(p) > 0)
    .sort((a, b) => (a.displayOrder ?? 0) - (b.displayOrder ?? 0))
    .map((p) => ({
      id: p.id,
      name: p.name,
      speed: `${p.downloadMbps} Mbps`,
      validity: p.validity || `${p.durationValue} ${p.durationUnit}`,
      validityDays: p.durationUnit === "Days" ? p.durationValue : p.durationUnit === "Weeks" ? p.durationValue * 7 : p.durationUnit === "Months" ? p.durationValue * 30 : 0,
      validityHours: p.durationUnit === "Hours" ? p.durationValue : p.durationUnit === "Minutes" ? Math.max(1, Math.round(p.durationValue / 60)) : undefined,
      price: priceOf(p),
    }));
  return NextResponse.json({
    routerIp,
    packages,
    payments: paymentMode(),
    authMethod: token && voucherOnlyLogin(token) ? "PIN Only" : "Username & Password",
  }, { headers: { "Cache-Control": "no-store" } });
}
