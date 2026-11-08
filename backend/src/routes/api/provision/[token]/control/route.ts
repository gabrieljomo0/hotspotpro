import { controlScript } from "@/server/control";
import { publicOrigin } from "@/server/provision";

const TOKEN = /^[A-Za-z0-9_-]{8,128}$/;

// The router calls this every 30 seconds (from the scheduler the setup script
// installs). It answers with a few RouterOS commands that switch the router's
// internet off or on to match what is set in the app, and counts as the
// router's "I'm alive" signal. The token in the address is the router's secret.
export async function GET(request: Request, { params }: { params: Promise<{ token: string }> }) {
  const { token } = await params;
  if (!TOKEN.test(token)) return new Response("unknown\n", { status: 404 });
  const script = controlScript(token, publicOrigin(request));
  if (!script) return new Response("unknown\n", { status: 404 });
  return new Response(script, { headers: { "Content-Type": "text/plain; charset=utf-8", "Cache-Control": "no-store" } });
}
