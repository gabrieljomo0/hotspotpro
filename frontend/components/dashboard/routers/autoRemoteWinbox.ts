// Remote WinBox: router uploads Back-To-Home conf → cloud API holds WireGuard →
// admin opens WinBox to the public host:8291 (no WireGuard install on the PC).

import type { RouterInfo } from "@/components/dashboard/data/dashboard-data";
import { resolveWinboxConnectHost } from "@/components/dashboard/routers/winboxSession";

const preparing = new Set<string>();

export type AutoRemoteResult = "direct" | "relay" | "timeout" | "busy" | "error";

function sleep(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function fetchRouterRow(ip: string): Promise<Partial<RouterInfo> | null> {
  try {
    const res = await fetch("/api/state", { credentials: "same-origin", cache: "no-store" });
    if (!res.ok) return null;
    const data = (await res.json()) as { docs?: { routers?: { value?: RouterInfo[] } } };
    const list = data.docs?.routers?.value;
    if (!Array.isArray(list)) return null;
    return list.find((row) => row?.ip === ip) ?? null;
  } catch {
    return null;
  }
}

async function copyText(text: string) {
  try {
    await navigator.clipboard.writeText(text);
    return true;
  } catch {
    return false;
  }
}

/** Prefer a public WinBox host (router WAN or cloud relay) — never 192.168.216.1 for the admin PC. */
export function publicWinboxHost(row: Partial<RouterInfo>) {
  return resolveWinboxConnectHost(row);
}

async function armCloudRelay(ip: string): Promise<{ ok: boolean; address?: string; waiting?: boolean; message?: string }> {
  try {
    const res = await fetch("/api/routers/winbox-arm", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      credentials: "same-origin",
      body: JSON.stringify({ ip }),
    });
    const body = (await res.json().catch(() => ({}))) as {
      ok?: boolean;
      address?: string;
      waiting?: boolean;
      message?: string;
    };
    return {
      ok: !!body.ok && !!body.address,
      address: body.address,
      waiting: !!body.waiting,
      message: body.message,
    };
  } catch {
    return { ok: false, message: "Could not reach the WinBox relay." };
  }
}

export function downloadWireguardTunnel(routerName: string, conf: string) {
  const safe = (routerName || "router").replace(/[^\w.-]+/g, "_").slice(0, 40);
  const blob = new Blob([conf], { type: "application/x-wireguard-profile" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = `${safe}-winbox.conf`;
  link.rel = "noopener";
  document.body.appendChild(link);
  link.click();
  link.remove();
  window.setTimeout(() => URL.revokeObjectURL(url), 2000);
}

/** Enable/refresh remote WinBox. Arms the cloud relay so WinBox works with only admin + password. */
export async function autoPrepareRemoteWinbox(opts: {
  ip: string;
  name: string;
  queueJob?: boolean;
  /** @deprecated kept for callers; cloud relay replaces client WireGuard downloads. */
  forceDownload?: boolean;
  force?: boolean;
  patchRouter: (ip: string, patch: Partial<RouterInfo>) => void;
  showToast: (message: string) => void;
  onStatus?: (status: "preparing" | "ready" | "timeout") => void;
}): Promise<AutoRemoteResult> {
  if (preparing.has(opts.ip)) return "busy";
  preparing.add(opts.ip);
  opts.onStatus?.("preparing");
  try {
    if (opts.queueJob !== false) {
      const res = await fetch("/api/routers/jobs", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ip: opts.ip, action: "remote-winbox" }),
      }).catch(() => null);
      if (!res || !res.ok) {
        opts.showToast("Could not start Remote WinBox on the router. Check that it is set up and online.");
        opts.onStatus?.("timeout");
        return "error";
      }
    }

    const finish = async (host: string) => {
      const address = host.includes(":") ? host : `${host}:8291`;
      opts.patchRouter(opts.ip, {
        remoteAccessEnabled: true,
        winboxReach: "direct",
        winboxAddress: address,
        wireguardTunnelIp: null,
        winboxRelay: true,
      });
      await copyText(host.replace(/:8291$/, ""));
      opts.showToast(
        `Remote WinBox ready. Address copied (${host.replace(/:8291$/, "")}). Open WinBox → Connect → admin + router password.`,
      );
      opts.onStatus?.("ready");
      return "direct" as const;
    };

    // Fast path: already have a public address, or arm from stored tunnel conf.
    const existing = await fetchRouterRow(opts.ip);
    if (existing) {
      opts.patchRouter(opts.ip, {
        remoteAccessEnabled: existing.remoteAccessEnabled ?? true,
        remoteAccessHold: existing.remoteAccessHold,
        winboxReach: existing.winboxReach,
        winboxAddress: existing.winboxAddress,
        wireguardConfig: existing.wireguardConfig,
        wireguardTunnelIp: existing.wireguardTunnelIp,
        winboxRelay: existing.winboxRelay,
      });
      const host = publicWinboxHost(existing);
      if (host) return finish(host);

      const armed = await armCloudRelay(opts.ip);
      if (armed.ok && armed.address) return finish(armed.address);
    }

    opts.showToast("Waiting for the router to publish remote access (usually under a minute)…");

    const deadline = Date.now() + 90_000;
    while (Date.now() < deadline) {
      await sleep(2000);
      const row = await fetchRouterRow(opts.ip);
      if (!row) continue;
      opts.patchRouter(opts.ip, {
        remoteAccessEnabled: row.remoteAccessEnabled ?? true,
        remoteAccessHold: row.remoteAccessHold,
        winboxReach: row.winboxReach,
        winboxAddress: row.winboxAddress,
        wireguardConfig: row.wireguardConfig,
        wireguardTunnelIp: row.wireguardTunnelIp,
        winboxRelay: row.winboxRelay,
      });

      const host = publicWinboxHost(row);
      if (host) return finish(host);

      const armed = await armCloudRelay(opts.ip);
      if (armed.ok && armed.address) return finish(armed.address);
    }

    opts.showToast(
      "Still waiting for the router. Keep it Online, tap Prepare remote access again, then open WinBox with the address shown.",
    );
    opts.onStatus?.("timeout");
    return "timeout";
  } finally {
    preparing.delete(opts.ip);
  }
}

export function isPreparingRemoteWinbox(ip: string) {
  return preparing.has(ip);
}
