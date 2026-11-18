"use client";

// Reprovision: send the full setup job to the router automatically (no Terminal typing).
// Paste script is only a backup when the router is offline.

import { useEffect, useMemo, useState } from "react";
import { Check, Copy, Loader2 } from "lucide-react";

import { ModalFrame } from "@/components/dashboard/agents/detail/ModalFrame";
import { useDashboard } from "@/components/dashboard/context/DashboardContext";
import type { RouterInfo } from "@/components/dashboard/data/dashboard-data";
import { buildReprovisionCommand, cleanReprovisionSsid } from "./reprovisionCommand";

export function ReprovisionScriptModal({ router, onClose }: { router: RouterInfo; onClose: () => void }) {
  const { getCaptivePortalConfigForSite, getEffectiveSsid, showToast, startRouterTask } = useDashboard();
  const [origins, setOrigins] = useState<string[]>([]);
  const [origin, setOrigin] = useState("");
  const [copied, setCopied] = useState(false);
  const [showPaste, setShowPaste] = useState(false);
  const [queued, setQueued] = useState(false);

  const siteId = router.siteId ?? router.ip;
  const portal = getCaptivePortalConfigForSite(siteId);
  const ssid = cleanReprovisionSsid(portal.ssid || getEffectiveSsid(router.ip) || router.name || "HotspotPro") || "HotspotPro";
  const token = router.provisioningToken;
  const online = router.status === "Online" && !router.disconnected;

  // Send the job as soon as the modal opens — no keyboard, no WinBox paste.
  useEffect(() => {
    if (!token) return;
    startRouterTask("full-provision", router.ip);
    setQueued(true);
    showToast(
      online
        ? "Reprovision sent to the router. It will reconfigure itself in a few seconds — do not type anything."
        : "Reprovision queued. Bring the router online, or use the offline paste below.",
    );
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [router.ip, token]);

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
    () => (token && origin ? buildReprovisionCommand({ origin, token, ssid, dnsName: router.dnsName }) : ""),
    [token, origin, ssid, router.dnsName],
  );

  async function copy() {
    if (!command) return;
    try {
      await navigator.clipboard.writeText(command);
      setCopied(true);
      showToast("Backup script copied (only needed if the router is offline).");
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
          <div className="rounded-xl bg-[#f4f4f4] p-4">
            <p className="flex items-center gap-2 text-sm font-bold text-[#1a1a1a]">
              {queued ? <Loader2 size={16} className="animate-spin" /> : null}
              {online ? "Running on the router automatically" : "Queued for the router"}
            </p>
            <p className="mt-2 text-sm text-[#525252]">
              You do <span className="font-semibold text-[#1a1a1a]">not</span> need to open Terminal or type anything.
              {online
                ? " The router picks this up on the next check-in (a few seconds) and rebuilds hotspot + captive portal + WiFi"
                : " When the router comes online it will apply the setup by itself"}
              {" "}(SSID: <span className="font-mono font-semibold text-[#1a1a1a]">{ssid}</span>).
            </p>
            <p className="mt-2 text-xs text-[#737373]">
              If WinBox Terminal ever shows “Change your password / new password&gt;”, that is MikroTik asking for a new admin
              password — press <kbd className="rounded bg-white px-1">Ctrl+C</kbd> once to skip it. Reprovision itself does
              not need that prompt.
            </p>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="rounded-xl bg-[#1a1a1a] px-4 py-2.5 text-sm font-bold text-white hover:bg-[#111111]"
          >
            Done
          </button>

          <div className="border-t border-[#e6e6e6] pt-3">
            <button
              type="button"
              onClick={() => setShowPaste((v) => !v)}
              className="text-xs font-semibold text-[#737373] underline hover:text-[#1a1a1a]"
            >
              {showPaste ? "Hide offline backup paste" : "Router offline? Show backup paste script"}
            </button>

            {showPaste && (
              <div className="mt-3 space-y-3">
                <p className="text-xs text-[#525252]">
                  Only if the router cannot check in. Paste once in WinBox → New Terminal (if you see “new password&gt;”, press
                  Ctrl+C first, then paste).
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
                {origin && (
                  <>
                    <code
                      data-testid="reprovision-modal-command"
                      className="block max-h-40 overflow-auto break-all rounded-xl bg-[#1a1a1a] p-3 font-mono text-[11px] leading-relaxed text-white"
                    >
                      {command}
                    </code>
                    <button
                      type="button"
                      data-testid="reprovision-modal-copy"
                      onClick={() => void copy()}
                      className="inline-flex items-center gap-2 rounded-xl border border-[#e6e6e6] bg-white px-4 py-2 text-sm font-semibold text-[#1a1a1a] hover:bg-[#f4f4f4]"
                    >
                      {copied ? <Check size={15} /> : <Copy size={15} />}
                      {copied ? "Copied" : "Copy backup script"}
                    </button>
                  </>
                )}
              </div>
            )}
          </div>
        </div>
      )}
    </ModalFrame>
  );
}
