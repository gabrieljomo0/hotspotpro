import { saveWireguardConfig } from "@/server/control";

const TOKEN = /^[A-Za-z0-9_-]{8,128}$/;

// The router posts its Back to Home WireGuard file when remote WinBox is on.
export async function POST(request: Request, { params }: { params: Promise<{ token: string }> }) {
  const { token } = await params;
  if (!TOKEN.test(token)) return new Response("unknown\n", { status: 404 });
  const body = await request.text();
  if (!saveWireguardConfig(token, body)) return new Response("ignored\n", { status: 404 });
  return new Response("ok\n", { headers: { "Content-Type": "text/plain", "Cache-Control": "no-store" } });
}
