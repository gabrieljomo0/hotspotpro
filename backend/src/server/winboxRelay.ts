// Arms the WinBox TCP relay sidecar (userspace WireGuard on the API host).
// Admins connect WinBox to HOTSPOTPRO_RADIUS_HOST:8291 — no WireGuard on their PC.

import { getState, setState } from "./store";

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

/** Load this router's Back-To-Home conf into the cloud relay and publish a WinBox address. */
export async function armWinboxRelay(token: string, conf: string): Promise<boolean> {
  if (!winboxRelayEnabled() || !token || !conf.includes("[Interface]")) return false;
  try {
    const res = await fetch(`${CONTROL}/arm`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ token, config: conf }),
      signal: AbortSignal.timeout(15_000),
    });
    if (!res.ok) {
      console.warn("[winbox-relay] arm failed:", res.status, await res.text().catch(() => ""));
      return false;
    }
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
  const value = getState("routers")?.value;
  if (!Array.isArray(value)) return;
  const rows = value as {
    provisioningToken?: string;
    wireguardConfig?: string;
    remoteAccessHold?: boolean;
    remoteAccessEnabled?: boolean;
  }[];
  const candidate =
    rows.find((r) => r.remoteAccessHold !== true && typeof r.wireguardConfig === "string" && r.wireguardConfig.includes("[Interface]")) ||
    null;
  if (!candidate?.provisioningToken || !candidate.wireguardConfig) return;
  const ok = await armWinboxRelay(candidate.provisioningToken, candidate.wireguardConfig);
  if (ok) console.log("[winbox-relay] restored tunnel for a router");
}
