import { jobById } from "@/server/store";

const TOKEN = /^[A-Za-z0-9_-]{8,128}$/;
const ID = /^[A-Za-z0-9]{4,40}$/;

// The router downloads one queued command here (public; the token and the job id are the secret).
export async function GET(_request: Request, { params }: { params: Promise<{ token: string; id: string }> }) {
  const { token, id } = await params;
  if (!TOKEN.test(token) || !ID.test(id)) return new Response("unknown\n", { status: 404 });
  const job = jobById(token, id);
  if (!job) return new Response("unknown\n", { status: 404 });
  return new Response(`# HotspotPro: command queued from the site by ${job.by.replace(/[\r\n]/g, " ")}\n${job.script}\n`, {
    headers: { "Content-Type": "text/plain; charset=utf-8", "Cache-Control": "no-store" },
  });
}
