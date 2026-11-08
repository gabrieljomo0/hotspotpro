import { publicOrigin, routerForToken, scriptFor } from "@/server/provision";
import { touchProvision } from "@/server/store";

const TOKEN = /^[A-Za-z0-9_-]{8,128}$/;

// Public on purpose: the long random token in the address is the secret the
// MikroTik router presents when it downloads its setup script.
//   /api/provision/<token>?wireless=yes&ssid=My%20WiFi
export async function GET(request: Request, { params }: { params: Promise<{ token: string }> }) {
  const { token } = await params;
  const router = TOKEN.test(token) ? routerForToken(token) : null;
  if (!router) return new Response("# HotspotPro: unknown or expired setup link\n", { status: 404, headers: { "Content-Type": "text/plain" } });

  touchProvision(token, "fetchedAt");
  const query = new URL(request.url).searchParams;
  const script = scriptFor(token, {
    origin: publicOrigin(request),
    wireless: query.get("wireless") === "yes",
    ssid: query.get("ssid") ?? undefined,
  });
  return new Response(script ?? "", { headers: { "Content-Type": "text/plain; charset=utf-8", "Cache-Control": "no-store" } });
}
