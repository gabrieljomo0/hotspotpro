// Arms the WinBox TCP relay sidecar (userspace WireGuard on the API host).
// Admins connect WinBox to HOTSPOTPRO_RADIUS_HOST:8291 — no WireGuard on their PC.

import { lookup } from "node:dns/promises";
import { isIP } from "node:net";
import { currentTenantId, getState, listTenants, setState, withTenant } from "./store";

const CONTROL = (process.env.HOTSPOTPRO_WINBOX_RELAY_URL || "http://127.0.0.1:4091").replace(/\/+$/, "");

export function winboxRelayEnabled() {
  const flag = (process.env.HOTSPOTPRO_WINBOX_RELAY || "on").trim().toLowerCase();
  return flag !== "0" && flag !== "off" && flag !== "false" && flag !== "no";
}

/** Public host:port for WinBox on the admin PC (cloud relay). */
export function winboxRelayAddress() {
  const host =
    (process.env.HOTSPOTPRO_WINBOX_HOST || "").trim() ||
    (process.env.HOTSPOTPRO_RADIUS_HOST || "").trim() ||
    "";
  if (!host) return "";
  const port = Number(process.env.HOTSPOTPRO_WINBOX_PORT || 8291) || 8291;
  return port === 8291 ? host : `${host}:${port}`;
}

export async function relayStatus(): Promise<{ ok: boolean; armed: boolean; token?: string; error?: string }> {
  if (!winboxRelayEnabled()) return { ok: false, armed: false, error: "relay off" };
  try {
    const res = await fetch(`${CONTROL}/health`, { signal: AbortSignal.timeout(2000) });
    if (!res.ok) return { ok: false, armed: false, error: `http ${res.status}` };
    const body = (await res.json()) as { ok?: boolean; armed?: boolean; token?: string; error?: string };
    return { ok: !!body.ok, armed: !!body.armed, token: body.token, error: body.error };
  } catch (error) {
    return { ok: false, armed: false, error: error instanceof Error ? error.message : "unreachable" };
  }
}

type Lookup = (host: string) => Promise<string>;

const defaultLookup: Lookup = async (host) => {
  try {
    return (await lookup(host, { family: 4 })).address;
  } catch {
    return (await lookup(host)).address;
  }
};

const ENDPOINT_LINE = /^([ \t]*Endpoint[ \t]*=[ \t]*)(\S+?)[ \t]*(?=\r?$)/im;

/** Host and port of the conf's [Peer] Endpoint, or null when there is none. */
export function confEndpoint(conf: string): { host: string; port: string } | null {
  const m = ENDPOINT_LINE.exec(conf);
  if (!m) return null;
  const raw = m[2];
  const v6 = /^\[([^\]]+)\]:(\d+)$/.exec(raw);
  if (v6) return { host: v6[1], port: v6[2] };
  const i = raw.lastIndexOf(":");
  if (i <= 0) return null;
  return { host: raw.slice(0, i), port: raw.slice(i + 1) };
}

/**
 * WireGuard IPC only takes IP:port, but Back To Home writes a *.vpn.mynetname.net
 * hostname as Endpoint. Swap it for the address it resolves to right now.
 */
export async function resolveConfEndpoint(conf: string, resolve: Lookup = defaultLookup): Promise<{ conf: string; endpoint: string }> {
  const ep = confEndpoint(conf);
  if (!ep) return { conf, endpoint: "" };
  if (isIP(ep.host)) return { conf, endpoint: ep.host };
  const ip = await resolve(ep.host);
  const hostPort = isIP(ip) === 6 ? `[${ip}]:${ep.port}` : `${ip}:${ep.port}`;
  return { conf: conf.replace(ENDPOINT_LINE, (_line, lead: string) => lead + hostPort), endpoint: ip };
}

// Last conf we armed with, so a changed router IP behind the DDNS name re-arms the relay.
// tenantId: the business that owns the armed router. Timers run outside any request, so the
// re-arm must select that business again before it touches the router row.
let armed: { token: string; conf: string; endpoint: string; tenantId: string | null } | null = null;
let watcher: ReturnType<typeof setInterval> | null = null;
const RECHECK_MS = Number(process.env.HOTSPOTPRO_WINBOX_RECHECK_MS || 5 * 60_000) || 5 * 60_000;

function watchEndpoint() {
  if (watcher) return;
  watcher = setInterval(() => {
    const current = armed;
    if (!current) return;
    resolveConfEndpoint(current.conf)
      .then(({ endpoint }) => {
        if (endpoint && endpoint !== current.endpoint && armed === current) {
          console.log("[winbox-relay] router address changed, re-arming");
          const rearm = () => armWinboxRelay(current.token, current.conf);
          return current.tenantId ? withTenant(current.tenantId, rearm) : rearm();
        }
      })
      .catch(() => {});
  }, RECHECK_MS);
  watcher.unref?.();
}

/** Load this router's Back-To-Home conf into the cloud relay and publish a WinBox address. */
export async function armWinboxRelay(token: string, conf: string): Promise<boolean> {
  if (!winboxRelayEnabled() || !token || !conf.includes("[Interface]")) return false;
  let resolved: { conf: string; endpoint: string };
  try {
    resolved = await resolveConfEndpoint(conf);
  } catch (error) {
    console.warn("[winbox-relay] arm failed: cannot resolve endpoint:", error instanceof Error ? error.message : error);
    return false;
  }
  try {
    const res = await fetch(`${CONTROL}/arm`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ token, config: resolved.conf }),
      signal: AbortSignal.timeout(15_000),
    });
    if (!res.ok) {
      console.warn("[winbox-relay] arm failed:", res.status, await res.text().catch(() => ""));
      return false;
    }
    armed = { token, conf, endpoint: resolved.endpoint, tenantId: currentTenantId() };
    watchEndpoint();
    const address = winboxRelayAddress();
    if (!address) {
      console.warn("[winbox-relay] armed but HOTSPOTPRO_RADIUS_HOST / HOTSPOTPRO_WINBOX_HOST is unset");
      return true;
    }
    patchRouterWinbox(token, address);
    return true;
  } catch (error) {
    console.warn("[winbox-relay] arm error:", error instanceof Error ? error.message : error);
    return false;
  }
}

export async function disarmWinboxRelay() {
  if (!winboxRelayEnabled()) return;
  armed = null;
  try {
    await fetch(`${CONTROL}/disarm`, { method: "POST", signal: AbortSignal.timeout(3000) });
  } catch {
    /* sidecar may be down */
  }
}

function patchRouterWinbox(token: string, address: string) {
  const value = getState("routers")?.value;
  if (!Array.isArray(value)) return;
  let changed = false;
  const next = (value as Record<string, unknown>[]).map((row) => {
    if (!row || row.provisioningToken !== token) return row;
    changed = true;
    return {
      ...row,
      remoteAccessEnabled: true,
      winboxReach: "direct",
      winboxAddress: address.includes(":") ? address : `${address}:8291`,
      wireguardTunnelIp: null,
      // Keep conf for re-arm after restart; UI no longer asks the admin to install WireGuard.
      winboxRelay: true,
    };
  });
  if (changed) setState("routers", next, "router");
}

/** After boot, re-arm the last router that had a stored Back-To-Home conf. */
export async function restoreWinboxRelay() {
  if (!winboxRelayEnabled()) return;
  const status = await relayStatus();
  if (!status.ok) {
    console.warn("[winbox-relay] sidecar not ready:", status.error || "down");
    return;
  }
  // Boot runs outside any request, so look through each business's routers in turn.
  for (const tenant of listTenants()) {
    const ok = await withTenant(tenant.id, async () => {
      const value = getState("routers")?.value;
      if (!Array.isArray(value)) return false;
      const rows = value as {
        provisioningToken?: string;
        wireguardConfig?: string;
        remoteAccessHold?: boolean;
      }[];
      const candidate = rows.find(
        (r) => r && r.remoteAccessHold !== true && typeof r.wireguardConfig === "string" && r.wireguardConfig.includes("[Interface]"),
      );
      if (!candidate?.provisioningToken || !candidate.wireguardConfig) return false;
      return armWinboxRelay(candidate.provisioningToken, candidate.wireguardConfig);
    });
    if (ok) {
      console.log("[winbox-relay] restored tunnel for a router");
      return;
    }
  }
}
