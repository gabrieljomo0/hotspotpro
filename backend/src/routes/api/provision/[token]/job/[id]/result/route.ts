import { markRouterAction } from "@/server/routerActions";
import { finishJob, jobById } from "@/server/store";

const TOKEN = /^[A-Za-z0-9_-]{8,128}$/;
const ID = /^[A-Za-z0-9]{4,40}$/;

// The router reports whether the command ran without an error (?ok=1 or ?ok=0).
export async function GET(request: Request, { params }: { params: Promise<{ token: string; id: string }> }) {
  const { token, id } = await params;
  if (!TOKEN.test(token) || !ID.test(id)) return new Response("unknown\n", { status: 404 });
  const ok = new URL(request.url).searchParams.get("ok") === "1";
  const job = jobById(token, id);
  if (!finishJob(token, id, ok)) return new Response("unknown\n", { status: 404 });
  if (ok && job) markRouterAction(token, job.script);
  return new Response("ok\n", { headers: { "Content-Type": "text/plain" } });
}
