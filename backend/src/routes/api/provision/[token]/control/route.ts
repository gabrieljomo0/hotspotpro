import { controlScript, recordRouterStats } from "@/server/control";
import { publicOrigin } from "@/server/provision";

const TOKEN = /^[A-Za-z0-9_-]{8,128}$/;

// The router calls this every 30 seconds (from the scheduler the setup script
// installs). It answers with a few RouterOS commands that switch the router's
// internet off or on to match what is set in the app, and counts as the
// router's "I'm alive" signal. The token in the address is the router's secret.
export async function GET(request: Request, { params }: { params: Promise<{ token: string }> }) {
  const { token } = await params;
  if (!TOKEN.test(token)) return new Response("unknown\n", { status: 404 });
  const query = new URL(request.url).searchParams;
  const number = (name: string) => {
    const value = Number(query.get(name));
    return Number.isFinite(value) && value >= 0 ? value : null;
  };
  const cpu = number("cpu");
  const free = number("free");
  const total = number("total");
  const memory = free !== null && total !== null && total > 0 ? Math.max(0, Math.min(100, Math.round((1 - free / total) * 100))) : null;
  const text = (name: string, pattern: RegExp) => {
    const value = query.get(name) ?? "";
    return pattern.test(value) ? value : null;
  };
  const uptime = text("up", /^[0-9wdhms]{1,32}$/);
  const version = text("ver", /^[0-9.]{1,16}$/);
  const architecture = text("arch", /^[A-Za-z0-9]{1,24}$/);
  const cpuCount = text("cpus", /^[0-9]{1,3}$/);
  const clients = number("active");
  const users = query.has("users")
    ? (query.get("users") ?? "").split(",").map((part) => part.trim()).filter((part) => /^[A-Za-z0-9_-]{1,32}$/.test(part)).slice(0, 12)
    : null;
  const dns = text("dns", /^[A-Za-z0-9.-]{1,80}$/);
  const pub = text("pub", /^(?:25[0-5]|2[0-4]\d|1?\d?\d)(?:\.(?:25[0-5]|2[0-4]\d|1?\d?\d)){3}$/);
  const wan = text("wanip", /^(?:25[0-5]|2[0-4]\d|1?\d?\d)(?:\.(?:25[0-5]|2[0-4]\d|1?\d?\d)){3}$/);
  if (query.has("cpu") || query.has("free") || uptime || version || architecture || cpuCount || clients !== null || users || query.has("dns") || query.has("pub") || query.has("wanip")) {
    recordRouterStats(token, {
      cpu: cpu === null ? null : Math.max(0, Math.min(100, Math.round(cpu))),
      memory,
      uptime,
      version,
      architecture,
      cpuCount,
      clients,
      users,
      dns,
      pub,
      wan,
    });
  }
  const script = controlScript(token, publicOrigin(request));
  if (!script) return new Response("unknown\n", { status: 404 });
  return new Response(script, { headers: { "Content-Type": "text/plain; charset=utf-8", "Cache-Control": "no-store" } });
}
