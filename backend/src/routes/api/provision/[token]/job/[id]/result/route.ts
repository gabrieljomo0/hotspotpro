import { markRouterAction } from "@/server/routerActions";
import { finishJob, jobById } from "@/server/store";

const TOKEN = /^[A-Za-z0-9_-]{8,128}$/;
const ID = /^[A-Za-z0-9]{4,40}$/;

async function readBody(request: Request) {
  try {
    const text = await request.text();
    return text.replace(/\0/g, "").trim().slice(0, 20_000);
  } catch {
    return "";
  }
}

// The router reports whether the command ran (?ok=1/0) and may POST captured output.
export async function GET(request: Request, { params }: { params: Promise<{ token: string; id: string }> }) {
  const { token, id } = await params;
  if (!TOKEN.test(token) || !ID.test(id)) return new Response("unknown\n", { status: 404 });
  const ok = new URL(request.url).searchParams.get("ok") === "1";
  const job = jobById(token, id);
  if (!finishJob(token, id, ok)) return new Response("unknown\n", { status: 404 });
  if (ok && job) markRouterAction(token, job.script);
  return new Response("ok\n", { headers: { "Content-Type": "text/plain" } });
}

export async function POST(request: Request, { params }: { params: Promise<{ token: string; id: string }> }) {
  const { token, id } = await params;
  if (!TOKEN.test(token) || !ID.test(id)) return new Response("unknown\n", { status: 404 });
  const url = new URL(request.url);
  const okParam = url.searchParams.get("ok");
  const ok = okParam === null ? true : okParam === "1";
  const output = await readBody(request);
  const job = jobById(token, id);
  if (!finishJob(token, id, ok, output || undefined)) return new Response("unknown\n", { status: 404 });
  if (ok && job) markRouterAction(token, job.script);
  return new Response("ok\n", { headers: { "Content-Type": "text/plain" } });
}
