// Remote WinBox: tunnel is created in the router setup script and stored on the site.
// Enabling remote again reuses that stored tunnel — no re-download / re-setup every time.
// Prefer “Open in browser” for day-to-day work without WireGuard on the laptop.

import type { RouterInfo } from "@/components/dashboard/data/dashboard-data";

const preparing = new Set<string>();
const delivered = new Map<string, string>();
const WG_ONCE_KEY = "hotspotpro:wg-once:";

export type AutoRemoteResult = "direct" | "relay" | "timeout" | "busy" | "error";

function sleep(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function tunnelAlreadyKept(ip: string) {
  try {
    return window.localStorage.getItem(WG_ONCE_KEY + ip) === "1";
  } catch {
    return false;
  }
}

function markTunnelKept(ip: string) {
  try {
    window.localStorage.setItem(WG_ONCE_KEY + ip, "1");
  } catch {
    /* ignore */
  }
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

async function copyText(text: string) {
  try {
    await navigator.clipboard.writeText(text);
    return true;
  } catch {
    return false;
  }
}

function fingerprint(row: Partial<RouterInfo>) {
  if (row.winboxReach === "direct" && row.winboxAddress) return `direct:${row.winboxAddress}`;
  if (row.wireguardConfig) return `relay:${row.wireguardConfig.length}:${row.wireguardConfig.slice(0, 40)}`;
  return "";
}

/** Enable/refresh remote WinBox. Reuses the setup-script tunnel when the site already has it. */
export async function autoPrepareRemoteWinbox(opts: {
  ip: string;
  name: string;
  queueJob?: boolean;
  /** Force a fresh tunnel download even if this browser already kept one. */
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

    // Fast path: setup already uploaded the tunnel / public address to the site.
    const existing = await fetchRouterRow(opts.ip);
    if (existing) {
      opts.patchRouter(opts.ip, {
        remoteAccessEnabled: existing.remoteAccessEnabled ?? true,
        remoteAccessHold: existing.remoteAccessHold,
        winboxReach: existing.winboxReach,
        winboxAddress: existing.winboxAddress,
        wireguardConfig: existing.wireguardConfig,
        wireguardTunnelIp: existing.wireguardTunnelIp,
      });
      if (existing.winboxReach === "direct" && existing.winboxAddress) {
        const host = String(existing.winboxAddress).replace(/:8291$/, "");
        await copyText(host);
        opts.showToast(`Remote access ready. Address copied (${host}). Prefer Open in browser, or paste into WinBox.`);
        opts.onStatus?.("ready");
        return "direct";
      }
      if (typeof existing.wireguardConfig === "string" && existing.wireguardConfig.includes("[Interface]")) {
        const keep = tunnelAlreadyKept(opts.ip);
        if (!keep || opts.forceDownload) {
          downloadWireguardTunnel(opts.name, existing.wireguardConfig);
          markTunnelKept(opts.ip);
          await copyText("192.168.216.1");
          opts.showToast(
            "Tunnel from setup is ready (one-time save). Prefer Open in browser on this site — or import the .conf once for the WinBox app.",
          );
        } else {
          await copyText("192.168.216.1");
          opts.showToast(
            "Remote access on. Tunnel was already set up during configuration — use Open in browser, or WinBox at 192.168.216.1 if your tunnel is active.",
          );
        }
        delivered.set(opts.ip, fingerprint(existing));
        opts.onStatus?.("ready");
        return "relay";
      }
    }

    opts.showToast("Waiting for this router’s next check-in (~3s) so remote access from setup can finish…");

    const deadline = Date.now() + 60_000;
    while (Date.now() < deadline) {
      await sleep(1500);
      const row = await fetchRouterRow(opts.ip);
      if (!row) continue;
      opts.patchRouter(opts.ip, {
        remoteAccessEnabled: row.remoteAccessEnabled ?? true,
        remoteAccessHold: row.remoteAccessHold,
        winboxReach: row.winboxReach,
        winboxAddress: row.winboxAddress,
        wireguardConfig: row.wireguardConfig,
        wireguardTunnelIp: row.wireguardTunnelIp,
      });

      const key = fingerprint(row);
      if (row.winboxReach === "direct" && row.winboxAddress) {
        const host = String(row.winboxAddress).replace(/:8291$/, "");
        await copyText(host);
        delivered.set(opts.ip, key);
        opts.showToast(`Remote access ready. Address copied (${host}). Prefer Open in browser.`);
        opts.onStatus?.("ready");
        return "direct";
      }

      if (typeof row.wireguardConfig === "string" && row.wireguardConfig.includes("[Interface]")) {
        const keep = tunnelAlreadyKept(opts.ip);
        if (!keep || opts.forceDownload) {
          downloadWireguardTunnel(opts.name, row.wireguardConfig);
          markTunnelKept(opts.ip);
          await copyText("192.168.216.1");
          opts.showToast("Tunnel from setup saved once. Prefer Open in browser for daily work.");
        } else {
          await copyText("192.168.216.1");
          opts.showToast("Remote access on — tunnel already kept from setup. Use Open in browser.");
        }
        delivered.set(opts.ip, key);
        opts.onStatus?.("ready");
        return "relay";
      }
    }

    opts.showToast("Still waiting for the router. Open in browser works now; the tunnel appears after the next check-in.");
    opts.onStatus?.("timeout");
    return "timeout";
  } finally {
    preparing.delete(opts.ip);
  }
}

export function isPreparingRemoteWinbox(ip: string) {
  return preparing.has(ip);
}
