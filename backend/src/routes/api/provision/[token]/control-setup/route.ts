import { routerByToken } from "@/server/control";
import { publicOrigin } from "@/server/provision";
import { buildInternetSwitchSetup } from "@/server/routeros";
import { lintScript } from "@/server/routeros-lint";

const TOKEN = /^[A-Za-z0-9_-]{8,128}$/;

// One small script that adds the internet on/off switch to a router that was
// set up before the switch existed (new routers get it from the main setup
// script). Paste the command from the router's page; the address it uses to
// reach this server is the one the router itself called (?origin= overrides).
export async function GET(request: Request, { params }: { params: Promise<{ token: string }> }) {
  const { token } = await params;
  if (!TOKEN.test(token)) return new Response("unknown\n", { status: 404 });
  const router = routerByToken(token);
  if (!router) return new Response("unknown\n", { status: 404 });
  let origin = publicOrigin(request);
  try {
    const asked = new URL(request.url).searchParams.get("origin");
    if (asked) origin = new URL(asked).origin;
  } catch { /* keep default */ }
  const script = buildInternetSwitchSetup({ router: { name: router.name, hotspotEnabled: router.hotspotEnabled }, origin, token });
  const report = lintScript(script, { addon: true });
  if (!report.ok) return new Response(`# The script has errors: ${report.errors.join(" | ")}\n`, { status: 422, headers: { "Content-Type": "text/plain" } });
  return new Response(script, { headers: { "Content-Type": "text/plain; charset=utf-8", "Cache-Control": "no-store" } });
}
