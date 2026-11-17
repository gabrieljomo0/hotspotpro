// When Remote WinBox (or Multi-WAN with remote access) is turned on, wait for
// the router’s check-in, then automatically deliver the connection details:
// public WinBox address, or the WireGuard tunnel file + 192.168.216.1.

import type { RouterInfo } from "@/components/dashboard/data/dashboard-data";

const preparing = new Set<string>();
const delivered = new Map<string, string>();

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
  // A second open without download= helps some Windows setups hand the file to WireGuard.
  window.setTimeout(() => {
    try {
      const openLink = document.createElement("a");
      openLink.href = url;
      openLink.target = "_blank";
      openLink.rel = "noopener";
      document.body.appendChild(openLink);
      openLink.click();
      openLink.remove();
    } catch {
      // Ignore; the download above is enough.
    }
    URL.revokeObjectURL(url);
  }, 400);
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

function openPreparePortal() {
  try {
    const portal = window.open("", "_blank", "noopener,noreferrer");
    if (!portal) return null;
    portal.document.write(
      `<!doctype html><title>Remote WinBox</title><body style="font-family:system-ui;padding:24px;color:#1a1a1a">
      <h1 style="font-size:18px">Preparing remote WinBox…</h1>
      <p>Keep this tab open. The tunnel file or public address arrives when the router checks in.</p>
      </body>`,
    );
    portal.document.close();
    return portal;
  } catch {
    return null;
  }
}

function deliverTunnel(portal: Window | null, routerName: string, conf: string) {
  downloadWireguardTunnel(routerName, conf);
  if (!portal || portal.closed) return;
  try {
    const safe = (routerName || "router").replace(/[^\w.-]+/g, "_").slice(0, 40);
    const blob = new Blob([conf], { type: "application/x-wireguard-profile" });
    const url = URL.createObjectURL(blob);
    portal.document.open();
    portal.document.write(
      `<!doctype html><title>Remote WinBox tunnel</title><body style="font-family:system-ui;padding:24px;color:#1a1a1a">
      <h1 style="font-size:18px">Tunnel ready</h1>
      <p>WinBox address <strong>192.168.216.1</strong> was copied. The tunnel file should download now.</p>
      <p><a id="wg" download="${safe}-winbox.conf" href="${url}">Open WireGuard tunnel file</a></p>
      <script>document.getElementById("wg").click();</script>
      </body>`,
    );
    portal.document.close();
  } catch {
    // Download helper above is enough.
  }
}

/** Enable/refresh remote WinBox on the router, then auto-deliver address or tunnel file. */
export async function autoPrepareRemoteWinbox(opts: {
  ip: string;
  name: string;
  /** When false, only wait/deliver — do not queue another remote-winbox job. */
  queueJob?: boolean;
  force?: boolean;
  patchRouter: (ip: string, patch: Partial<RouterInfo>) => void;
  showToast: (message: string) => void;
  onStatus?: (status: "preparing" | "ready" | "timeout") => void;
}): Promise<AutoRemoteResult> {
  if (preparing.has(opts.ip)) return "busy";
  preparing.add(opts.ip);
  opts.onStatus?.("preparing");
  // Open during the click so the delayed tunnel download is not blocked by the browser.
  const portal = openPreparePortal();
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
        try {
          portal?.close();
        } catch {
          /* ignore */
        }
        return "error";
      }
    }

    opts.showToast("Preparing remote WinBox automatically… waiting for this router’s next check-in.");

    const deadline = Date.now() + 90_000;
    while (Date.now() < deadline) {
      const row = await fetchRouterRow(opts.ip);
      if (row) {
        opts.patchRouter(opts.ip, {
          remoteAccessEnabled: row.remoteAccessEnabled ?? true,
          remoteAccessHold: row.remoteAccessHold,
          winboxReach: row.winboxReach,
          winboxAddress: row.winboxAddress,
          wireguardConfig: row.wireguardConfig,
          wireguardTunnelIp: row.wireguardTunnelIp,
        });

        const key = fingerprint(row);
        const already = !opts.force && key && delivered.get(opts.ip) === key;

        if (row.winboxReach === "direct" && row.winboxAddress) {
          const host = String(row.winboxAddress).replace(/:8291$/, "");
          if (!already) {
            await copyText(host);
            delivered.set(opts.ip, key);
            opts.showToast(
              `Remote WinBox is ready. Address copied (${host}). Open WinBox → Connect To → paste → admin password.`,
            );
          }
          try {
            if (portal && !portal.closed) {
              portal.document.open();
              portal.document.write(
                `<!doctype html><title>Remote WinBox</title><body style="font-family:system-ui;padding:24px"><h1>Ready</h1><p>Connect WinBox to <strong>${host}</strong> (copied).</p></body>`,
              );
              portal.document.close();
            }
          } catch {
            /* ignore */
          }
          opts.onStatus?.("ready");
          return "direct";
        }

        if (typeof row.wireguardConfig === "string" && row.wireguardConfig.includes("[Interface]")) {
          if (!already) {
            deliverTunnel(portal, opts.name, row.wireguardConfig);
            await copyText("192.168.216.1");
            delivered.set(opts.ip, key);
            opts.showToast(
              "Tunnel prepared automatically. WinBox address 192.168.216.1 is copied — open WinBox after WireGuard activates the tunnel.",
            );
          } else {
            try {
              portal?.close();
            } catch {
              /* ignore */
            }
          }
          opts.onStatus?.("ready");
          return "relay";
        }
      }
      await sleep(2500);
    }

    opts.showToast(
      "Still waiting for the router. Leave this page open — the tunnel or public address is delivered as soon as the router checks in.",
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
