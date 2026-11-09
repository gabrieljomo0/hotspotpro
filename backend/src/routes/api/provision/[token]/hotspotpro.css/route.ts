import { hotspotAsset } from "@/server/hotspotPages";
import { routerForToken } from "@/server/provision";

const TOKEN = /^[A-Za-z0-9_-]{8,128}$/;

export async function GET(_request: Request, { params }: { params: Promise<{ token: string }> }) {
  const { token } = await params;
  if (!TOKEN.test(token) || !routerForToken(token)) return new Response("unknown\n", { status: 404 });
  return hotspotAsset("hotspotpro.css") ?? new Response("unknown\n", { status: 404 });
}
