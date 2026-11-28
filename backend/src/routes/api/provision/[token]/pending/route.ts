import { needsCheckIn, noteActiveUsers } from "@/server/fastPush";

const TOKEN = /^[A-Za-z0-9_-]{8,128}$/;

// The router's hotspotpro-ping scheduler asks this every ~2s. One byte back: "1" = run the full
// check-in now (a job, a portal login, or new packages/vouchers are waiting), "0" = nothing new.
// The ping also says who is online (?active=N&users=a,b), so Active Users stays fresh.
export async function GET(request: Request, { params }: { params: Promise<{ token: string }> }) {
  const { token } = await params;
  if (!TOKEN.test(token)) return new Response("0", { headers: { "Content-Type": "text/plain" } });
  const query = new URL(request.url).searchParams;
  const active = Number(query.get("active"));
  if (query.has("active") && Number.isFinite(active) && active >= 0) {
    const users = (query.get("users") ?? "")
      .split(",")
      .map((u) => u.trim())
      .filter((u) => /^[A-Za-z0-9_-]{1,32}$/.test(u))
      .slice(0, 40)
      .sort();
    noteActiveUsers(token, Math.min(10_000, Math.round(active)), users);
  }
  const run = needsCheckIn(token);
  return new Response(run ? "1" : "0", { headers: { "Content-Type": "text/plain", "Cache-Control": "no-store" } });
}
