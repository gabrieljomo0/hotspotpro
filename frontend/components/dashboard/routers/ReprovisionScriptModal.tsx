"use client";

// Two modes:
//  - auto: queue full-provision on the router (no Terminal paste)
//  - paste: show WinBox copy/paste script

import { useEffect, useMemo, useState } from "react";
import { Check, Copy, Loader2 } from "lucide-react";

import { ModalFrame } from "@/components/dashboard/agents/detail/ModalFrame";
import { useDashboard } from "@/components/dashboard/context/DashboardContext";
import type { RouterInfo } from "@/components/dashboard/data/dashboard-data";
import { buildReprovisionCommand, cleanReprovisionSsid } from "./reprovisionCommand";

export type ReprovisionMode = "auto" | "paste";

export function ReprovisionScriptModal({
  router,
  mode = "auto",
  onClose,
}: {
  router: RouterInfo;
  mode?: ReprovisionMode;
  onClose: () => void;
}) {
  const { getCaptivePortalConfigForSite, getEffectiveSsid, showToast, startRouterTask } = useDashboard();
  const [origins, setOrigins] = useState<string[]>([]);
  const [origin, setOrigin] = useState("");
  const [copied, setCopied] = useState(false);
  const [queued, setQueued] = useState(false);

  const siteId = router.siteId ?? router.ip;
  const portal = getCaptivePortalConfigForSite(siteId);
  const ssid = cleanReprovisionSsid(portal.ssid || getEffectiveSsid(router.ip) || router.name || "HotspotPro") || "HotspotPro";
  const token = router.provisioningToken;
  const online = router.status === "Online" && !router.disconnected;
  const paste = mode === "paste";

  useEffect(() => {
    if (paste || !token) return;
    startRouterTask("full-provision", router.ip);
    setQueued(true);
    showToast(
      online
        ? "Reprovision sent to the router. It reconfigures itself in a few seconds — no paste needed."
        : "Reprovision queued. Bring the router online, or use Reprovision (paste script) instead.",
    );
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [router.ip, token, paste]);

  useEffect(() => {
    if (!paste) return;
    let alive = true;
    (async () => {
      const list: string[] = [];
      try {
        const response = await fetch("/api/provision/address", { cache: "no-store", credentials: "same-origin" });
        if (response.ok) {
          const json = (await response.json()) as { configured: string | null; candidates: { origin: string }[] };
          if (json.configured) list.push(json.configured.replace(/\/+$/, ""));
          for (const c of json.candidates) list.push(c.origin);
        }
      } catch {
        /* none */
      }
      // Prefer Render API (HTTPS); Fly remains a fallback for UDP RADIUS hosts.
      list.unshift("https://hotspotpro-api.onrender.com", "https://hotspotpro-api.fly.dev");
      if (typeof window !== "undefined" && !/^(localhost|127\.|\[::1\])/.test(window.location.hostname)) {
        list.push(window.location.origin);
      }
      const unique = [...new Set(list.filter(Boolean))];
      if (alive) {
        setOrigins(unique);
        setOrigin((current) => current || unique[0] || "https://hotspotpro-api.onrender.com");
      }
    })();
    return () => {
      alive = false;
    };
  }, [paste]);

  const command = useMemo(
    () =>
      token && origin
        ? buildReprovisionCommand({ origin, token, ssid, dnsName: router.dnsName, routerName: router.name })
        : "",
    [token, origin, ssid, router.dnsName, router.name],
  );

  async function copy() {
    if (!command) return;
    try {
      await navigator.clipboard.writeText(command);
      setCopied(true);
      showToast("Script copied. Paste it in WinBox → New Terminal, then press Enter.");
      window.setTimeout(() => setCopied(false), 2500);
    } catch {
      showToast("Select the script and copy it manually.");
    }
  }

  return (
    <ModalFrame
      title={paste ? "Reprovision (paste script)" : "Reprovision"}
      subtitle={router.name}
      onClose={onClose}
      widthClass="max-w-2xl"
      testId="reprovision-script-modal"
    >
      {!token ? (
        <p className="text-sm text-[#525252]">
          This router has no setup link yet. Remove it and add it again from Add Router.
        </p>
      ) : paste ? (
        <div className="space-y-4">
          <p className="text-sm text-[#525252]">
            Copy this script and paste it in WinBox → New Terminal. Refreshes hotspot, captive portal, and WiFi (SSID:{" "}
            <span className="font-mono font-semibold text-[#1a1a1a]">{ssid}</span>) without signing out people already
            online.
          </p>

          {origins.length > 1 && (
            <label className="block text-xs font-semibold text-[#525252]">
              Server address the router can reach
              <select
                value={origin}
                onChange={(event) => setOrigin(event.target.value)}
                className="mt-1 h-10 w-full rounded-xl border border-[#e6e6e6] bg-white px-3 text-sm outline-none focus:border-[#1a1a1a]"
              >
                {origins.map((item) => (
                  <option key={item} value={item}>
                    {item}
                  </option>
                ))}
              </select>
            </label>
          )}

          {!origin ? (
            <p className="text-sm text-[#1a1a1a]">
              Open this site on a network address the router can reach (not localhost), or set{" "}
              <code>HOTSPOTPRO_PUBLIC_URL</code> and restart.
            </p>
          ) : (
            <>
              <code
                data-testid="reprovision-modal-command"
                className="block max-h-48 overflow-auto break-all rounded-xl bg-[#1a1a1a] p-3 font-mono text-[11px] leading-relaxed text-white"
              >
                {command}
              </code>
              <div className="flex flex-wrap gap-2">
                <button
                  type="button"
                  data-testid="reprovision-modal-copy"
                  onClick={() => void copy()}
                  className="inline-flex items-center gap-2 rounded-xl bg-[#1a1a1a] px-4 py-2.5 text-sm font-bold text-white hover:bg-[#111111]"
                >
                  {copied ? <Check size={15} /> : <Copy size={15} />}
                  {copied ? "Copied" : "Copy script"}
                </button>
                <button
                  type="button"
                  onClick={onClose}
                  className="rounded-xl border border-[#e6e6e6] bg-white px-4 py-2.5 text-sm font-semibold text-[#1a1a1a] hover:bg-[#f4f4f4]"
                >
                  Close
                </button>
              </div>
            </>
          )}

          <ol className="list-decimal space-y-1 pl-5 text-xs text-[#525252]">
            <li>In WinBox open New Terminal</li>
            <li>If you see “new password&gt;”, press Ctrl+C once, then paste</li>
            <li>Paste the script and press Enter</li>
            <li>Wait until it prints that reconfiguration finished</li>
          </ol>
        </div>
      ) : (
        <div className="space-y-4">
          <div className="rounded-xl bg-[#f4f4f4] p-4">
            <p className="flex items-center gap-2 text-sm font-bold text-[#1a1a1a]">
              {queued ? <Loader2 size={16} className="animate-spin" /> : null}
              {online ? "Running on the router automatically" : "Queued for the router"}
            </p>
            <p className="mt-2 text-sm text-[#525252]">
              You do <span className="font-semibold text-[#1a1a1a]">not</span> need to open Terminal or paste anything.
              {online
                ? " The router picks this up on the next check-in and rebuilds hotspot + captive portal + WiFi"
                : " When the router comes online it will apply the setup by itself"}
              {" "}
              (SSID: <span className="font-mono font-semibold text-[#1a1a1a]">{ssid}</span>). People already online stay
              connected.
            </p>
            {!online && (
              <p className="mt-2 text-xs text-[#737373]">
                If the router stays Offline, use <span className="font-semibold">Reprovision (paste script)</span> in More
                Actions so it can reach the cloud again.
              </p>
            )}
          </div>
          <button
            type="button"
            onClick={onClose}
            className="rounded-xl bg-[#1a1a1a] px-4 py-2.5 text-sm font-bold text-white hover:bg-[#111111]"
          >
            Done
          </button>
        </div>
      )}
    </ModalFrame>
  );
}
