import { completeProvision } from "@/server/provision";

const TOKEN = /^[A-Za-z0-9_-]{8,128}$/;

// The router calls this as the last line of its setup script, with how many
// steps failed (?failed=N). It flips the router to "Provisioned" in the saved
// data, so the dashboard (which polls for changes) shows it as connected.
export async function GET(request: Request, { params }: { params: Promise<{ token: string }> }) {
  const { token } = await params;
  if (!TOKEN.test(token)) return new Response("unknown\n", { status: 404 });
  const failed = Math.max(0, Number(new URL(request.url).searchParams.get("failed") ?? 0) || 0);
  const deviceMode = new URL(request.url).searchParams.get("dm") === "blocked" ? "blocked" : null;
  const query = new URL(request.url).searchParams;
  const wan = query.get("wan") === "down";
  const net = query.get("net") === "down";
  const sourceIp = request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || null;
  if (!completeProvision(token, { failed, sourceIp, deviceMode, wan, net })) return new Response("unknown\n", { status: 404 });
  return new Response("ok\n", { headers: { "Content-Type": "text/plain" } });
}
