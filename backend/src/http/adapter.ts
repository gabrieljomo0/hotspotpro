// Turns a Node HTTP request into a Web `Request`, finds the route file that
// should answer it, and writes the `Response` back. This is the whole "framework".

import type { IncomingMessage, ServerResponse } from "node:http";
import { routeTable, type RouteEntry } from "./routeTable";
import { sessionFromRequest } from "../server/auth";
import { tenantForRequest } from "../server/tenancy";
import { getTenant, withTenant } from "../server/store";

/** Routes that work on one business's data, so a business must be identified first. */
const NEEDS_BUSINESS = /^\/api\/(portal|provision|payments|routers|sms|state|reports|events)(\/|$)/;

export type RouteContext = { params: Promise<Record<string, string>> };
export type Handler = (request: Request, context: RouteContext) => Response | Promise<Response>;
export type RouteModule = Partial<Record<"GET" | "POST" | "PUT" | "PATCH" | "DELETE", Handler>>;

const MAX_BODY = 25 * 1024 * 1024; // the app's saved data can be a few megabytes

function match(entry: RouteEntry, parts: string[]): Record<string, string> | null {
  if (entry.segments.length !== parts.length) return null;
  const params: Record<string, string> = {};
  for (let i = 0; i < parts.length; i += 1) {
    const want = entry.segments[i];
    if (want.startsWith(":")) {
      try { params[want.slice(1)] = decodeURIComponent(parts[i]); } catch { return null; }
    } else if (want !== parts[i]) return null;
  }
  return params;
}

export function findRoute(pathname: string): { entry: RouteEntry; params: Record<string, string> } | null {
  const parts = pathname.split("/").filter(Boolean);
  for (const entry of routeTable) {
    const params = match(entry, parts);
    if (params) return { entry, params };
  }
  return null;
}

function json(res: ServerResponse, status: number, body: unknown, extra: Record<string, string> = {}) {
  const text = JSON.stringify(body);
  res.writeHead(status, { "Content-Type": "application/json", "Content-Length": Buffer.byteLength(text), ...extra });
  res.end(text);
}

async function readBody(req: IncomingMessage): Promise<Buffer | null> {
  const chunks: Buffer[] = [];
  let size = 0;
  for await (const chunk of req) {
    size += (chunk as Buffer).length;
    if (size > MAX_BODY) return null;
    chunks.push(chunk as Buffer);
  }
  return Buffer.concat(chunks);
}

export async function handleHttp(req: IncomingMessage, res: ServerResponse): Promise<number> {
  const host = req.headers.host ?? "localhost";
  let url: URL;
  try { url = new URL(req.url ?? "/", `http://${host}`); } catch { json(res, 400, { message: "Bad request." }); return 400; }

  if (url.pathname === "/" ) {
    json(res, 200, { name: "HotspotPro backend", ok: true, health: "/api/health" });
    return 200;
  }

  const found = findRoute(url.pathname);
  if (!found) { json(res, 404, { message: "Not found." }); return 404; }

  const method = (req.method ?? "GET").toUpperCase();
  const mod = found.entry.module;
  const handler = (method === "HEAD" ? mod.GET : (mod as Record<string, Handler | undefined>)[method]);
  if (method === "OPTIONS") {
    res.writeHead(204, { Allow: Object.keys(mod).filter((k) => typeof (mod as Record<string, unknown>)[k] === "function").join(", ") });
    res.end();
    return 204;
  }
  if (!handler) {
    json(res, 405, { message: "Method not allowed." }, { Allow: Object.keys(mod).join(", ") });
    return 405;
  }

  const headers = new Headers();
  for (const [key, value] of Object.entries(req.headers)) {
    if (value === undefined) continue;
    headers.set(key, Array.isArray(value) ? value.join(", ") : value);
  }
  // Behind the web page's proxy this header is already set; for a router calling directly, add its real address.
  if (!headers.has("x-forwarded-for")) {
    const remote = (req.socket.remoteAddress ?? "").replace(/^::ffff:/, "");
    if (remote) headers.set("x-forwarded-for", remote);
  }

  let body: Buffer | undefined;
  if (method !== "GET" && method !== "HEAD") {
    const read = await readBody(req);
    if (read === null) { json(res, 413, { message: "Request too large." }); return 413; }
    body = read.length ? read : undefined;
  }

  let response: Response;
  try {
    const request = new Request(url, { method, headers, body: body ? new Uint8Array(body) : undefined });
    // Which business is this request about? Everything the route does is then limited to it.
    const tenantId = url.pathname.startsWith("/api/super/") ? null : tenantForRequest(request, found.params);
    const tenant = tenantId ? getTenant(tenantId) : null;
    const isSuper = !!sessionFromRequest(request)?.sup;
    if (tenant && tenant.status === "suspended" && !isSuper && !url.pathname.startsWith("/api/auth/") && !url.pathname.startsWith("/api/provision/")) {
      response = Response.json(
        { message: "This account has been suspended. Contact the platform administrator.", suspended: true },
        { status: 403 },
      );
    } else if (!tenant && NEEDS_BUSINESS.test(url.pathname)) {
      // Nothing says which business this is for: refuse clearly instead of guessing.
      const message = url.pathname.startsWith("/api/provision/")
        ? "Unknown router setup link."
        : url.pathname.startsWith("/api/portal/")
          ? "Open this page from the WiFi login screen so we know which network you are on."
          : "Not signed in.";
      response = Response.json({ message }, { status: url.pathname.startsWith("/api/portal/") ? 400 : url.pathname.startsWith("/api/provision/") ? 404 : 401 });
    } else if (tenantId && tenant) {
      response = await withTenant(tenantId, () => handler(request, { params: Promise.resolve(found.params) }));
    } else {
      response = await handler(request, { params: Promise.resolve(found.params) });
    }
  } catch (error) {
    console.error(`[hotspotpro] ${method} ${url.pathname} failed:`, error);
    json(res, 500, { message: "Something went wrong on the server." });
    return 500;
  }

  const out: Record<string, string | string[]> = {};
  response.headers.forEach((value, key) => { if (key !== "set-cookie") out[key] = value; });
  const cookies = response.headers.getSetCookie();
  if (cookies.length) out["set-cookie"] = cookies;
  const buffer = Buffer.from(await response.arrayBuffer());
  out["content-length"] = String(buffer.length);
  res.writeHead(response.status, out);
  res.end(method === "HEAD" ? undefined : buffer);
  return response.status;
}
