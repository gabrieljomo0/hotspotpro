import { needsCheckIn } from "@/server/fastPush";

const TOKEN = /^[A-Za-z0-9_-]{8,128}$/;

// The router's hotspotpro-ping scheduler asks this every ~2s. One byte back: "1" = run the full
// check-in now (a job, a portal login, or new packages/vouchers are waiting), "0" = nothing new.
export async function GET(_request: Request, { params }: { params: Promise<{ token: string }> }) {
  const { token } = await params;
  const run = TOKEN.test(token) && needsCheckIn(token);
  return new Response(run ? "1" : "0", { headers: { "Content-Type": "text/plain", "Cache-Control": "no-store" } });
}
