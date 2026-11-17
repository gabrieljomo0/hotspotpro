"use client";

// Shown when the owner clicks Reprovision: the full paste-ready Terminal
// command that re-downloads setup and replaces the old HotspotPro config.

import { useEffect, useMemo, useState } from "react";
import { Check, Copy } from "lucide-react";

import { ModalFrame } from "@/components/dashboard/agents/detail/ModalFrame";
import { useDashboard } from "@/components/dashboard/context/DashboardContext";
import type { RouterInfo } from "@/components/dashboard/data/dashboard-data";
import { buildReprovisionCommand, cleanReprovisionSsid } from "./reprovisionCommand";

export function ReprovisionScriptModal({ router, onClose }: { router: RouterInfo; onClose: () => void }) {
  const { getCaptivePortalConfigForSite, getEffectiveSsid, showToast } = useDashboard();
  const [origins, setOrigins] = useState<string[]>([]);
  const [origin, setOrigin] = useState("");
  const [copied, setCopied] = useState(false);

  const siteId = router.siteId ?? router.ip;
  const portal = getCaptivePortalConfigForSite(siteId);
  const ssid = cleanReprovisionSsid(portal.ssid || getEffectiveSsid(router.ip) || router.name || "HotspotPro") || "HotspotPro";
  const token = router.provisioningToken;

  useEffect(() => {
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
      if (typeof window !== "undefined" && !/^(localhost|127\.|\[::1\])/.test(window.location.hostname)) {
        list.unshift(window.location.origin);
      }
      const unique = [...new Set(list.filter(Boolean))];
      if (alive) {
        setOrigins(unique);
        setOrigin((current) => current || unique[0] || "");
      }
    })();
    return () => {
      alive = false;
    };
  }, []);

  const command = useMemo(
    () => (token && origin ? buildReprovisionCommand({ origin, token, ssid }) : ""),
    [token, origin, ssid],
  );

  async function copy() {
    if (!command) return;
    try {
      await navigator.clipboard.writeText(command);
      setCopied(true);
      showToast("Script copied. Paste it in WinBox → New Terminal, then press Enter.");
      window.setTimeout(() => setCopied(false), 2500);
    } catch {
      showToast("Select the script and copy it manually (Ctrl+C).");
    }
  }

  return (
    <ModalFrame
      title="Reprovision — paste in Terminal"
      subtitle={router.name}
      onClose={onClose}
      widthClass="max-w-2xl"
      testId="reprovision-script-modal"
    >
      {!token ? (
        <p className="text-sm text-[#525252]">
          This router has no setup link yet. Remove it and add it again from Add Router to get a reconfiguration script.
        </p>
      ) : (
        <div className="space-y-4">
          <p className="text-sm text-[#525252]">
            Copy this script and paste it in WinBox → <span className="font-semibold text-[#1a1a1a]">New Terminal</span>.
            It clears old HotspotPro bypass/sessions, downloads a fresh setup, and reconfigures hotspot + captive portal + WiFi
            (SSID: <span className="font-mono font-semibold text-[#1a1a1a]">{ssid}</span>).
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
              Open this site on a network address the router can reach (not localhost), or set <code>HOTSPOTPRO_PUBLIC_URL</code>{" "}
              and restart.
            </p>
          ) : (
            <>
              <code
                data-testid="reprovision-modal-command"
                className="block max-h-52 overflow-auto break-all rounded-xl bg-[#1a1a1a] p-4 font-mono text-[11px] leading-relaxed text-white"
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
                  className="rounded-xl border border-[#e6e6e6] bg-white px-4 py-2.5 text-sm font-semibold text-[#525252] hover:bg-[#f4f4f4]"
                >
                  Close
                </button>
              </div>
            </>
          )}

          <ol className="list-decimal space-y-1 pl-5 text-xs text-[#525252]">
            <li>Open WinBox → New Terminal</li>
            <li>Paste the script and press Enter</li>
            <li>Wait until it prints that reconfiguration finished</li>
            <li>On the phone: forget the WiFi, join again, enter the voucher</li>
          </ol>
        </div>
      )}
    </ModalFrame>
  );
}
