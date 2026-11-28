"use client";

// The WinBox paste script for Reprovision. ReprovisionScriptHost opens it when the router is not
// checking in (offline) — a router that is online is reprovisioned directly, without this modal.

import { useEffect, useMemo, useState } from "react";
import { Check, Copy } from "lucide-react";

import { ModalFrame } from "@/components/dashboard/agents/detail/ModalFrame";
import { useDashboard } from "@/components/dashboard/context/DashboardContext";
import type { RouterInfo } from "@/components/dashboard/data/dashboard-data";
import { buildReprovisionCommand, cleanReprovisionSsid } from "./reprovisionCommand";

export type ReprovisionMode = "auto" | "paste";

export function ReprovisionScriptModal({
  router,
  offline = false,
  onClose,
}: {
  router: RouterInfo;
  /** Kept for older callers; the modal always shows the paste script. */
  mode?: ReprovisionMode;
  /** Opened because the router is not checking in — say so above the script. */
  offline?: boolean;
  onClose: () => void;
}) {
  const { getCaptivePortalConfigForSite, getEffectiveSsid, showToast } = useDashboard();
  const [origins, setOrigins] = useState<string[]>([]);
  const [origin, setOrigin] = useState("");
  const [copied, setCopied] = useState(false);

  const siteId = router.siteId ?? router.ip;
  const portal = getCaptivePortalConfigForSite(siteId);
  const ssid = cleanReprovisionSsid(portal.ssid || getEffectiveSsid(router.ip) || router.name || "HotspotPro") || "HotspotPro";
  const token = router.provisioningToken;
  const paste = true;

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
      // Prefer Fly (HTTPS + UDP RADIUS). Render is HTTPS-only fallback.
      list.unshift("https://hotspotpro-api.fly.dev", "https://hotspotpro-api.onrender.com");
      if (typeof window !== "undefined" && !/^(localhost|127\.|\[::1\])/.test(window.location.hostname)) {
        list.push(window.location.origin);
      }
      const unique = [...new Set(list.filter(Boolean))];
      if (alive) {
        setOrigins(unique);
        setOrigin((current) => current || unique[0] || "https://hotspotpro-api.fly.dev");
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
      title="Reprovision"
      subtitle={router.name}
      onClose={onClose}
      widthClass="max-w-2xl"
      testId="reprovision-script-modal"
    >
      {!token ? (
        <p className="text-sm text-[#525252]">
          This router has no setup link yet. Remove it and add it again from Add Router.
        </p>
      ) : (
        <div className="space-y-4">
          {offline && (
            <p data-testid="reprovision-offline" className="rounded-xl bg-[#f3f1ec] p-3 text-sm font-semibold text-[#1a1a1a]">
              This router is not checking in to HotspotPro right now, so it cannot be reprovisioned from here. Paste
              the script below in WinBox once.
            </p>
          )}
          <p className="text-sm text-[#525252]">
            Copy this script and paste it in WinBox → New Terminal. It refreshes the hotspot, captive portal and WiFi
            (SSID: <span className="font-mono font-semibold text-[#1a1a1a]">{ssid}</span>). People already online stay
            connected, and vouchers and packages on the router are kept.
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
      )}
    </ModalFrame>
  );
}
