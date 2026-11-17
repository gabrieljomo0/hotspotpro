"use client";

// Pasteable WinBox command that downloads and runs the full HotspotPro setup again
// (hotspot + WiFi on the captive portal bridge + login pages).

import { useEffect, useMemo, useState } from "react";
import { Check, Copy } from "lucide-react";

import type { RouterInfo } from "@/components/dashboard/data/dashboard-data";
import { useDashboard } from "@/components/dashboard/context/DashboardContext";

function cleanSsid(value: string) {
  return value.replace(/[\\"$\r\n]/g, "").trim().slice(0, 32);
}

export function ReprovisionPastePanel({ router }: { router: RouterInfo }) {
  const { getCaptivePortalConfigForSite, getEffectiveSsid, showToast } = useDashboard();
  const [origins, setOrigins] = useState<string[]>([]);
  const [origin, setOrigin] = useState("");
  const [copied, setCopied] = useState(false);

  const siteId = router.siteId ?? router.ip;
  const portal = getCaptivePortalConfigForSite(siteId);
  const ssid = cleanSsid(portal.ssid || getEffectiveSsid(router.ip) || router.name || "HotspotPro") || "HotspotPro";
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

  const command = useMemo(() => {
    if (!token || !origin) return "";
    const tls = origin.startsWith("https") ? " check-certificate=no" : "";
    const setupUrl = `${origin.replace(/\/+$/, "")}/api/provision/${token}?wireless=yes&ssid=${encodeURIComponent(ssid)}`;
    return [
      `:put "HotspotPro: reconfiguring this router (hotspot + captive portal + WiFi)..."`,
      `:do { /file remove [find where name=hotspotpro.rsc] } on-error={ }`,
      `:do { /file remove [find where name="flash/hotspotpro.rsc"] } on-error={ }`,
      `:global hpFile "hotspotpro.rsc"`,
      `:do { /tool fetch url="${setupUrl}" dst-path=$hpFile${tls} } on-error={ :do { :delay 5s } on-error={ }; /tool fetch url="${setupUrl}" dst-path=$hpFile${tls} }`,
      `:do { :delay 2s } on-error={ }`,
      `:if ([:len [/file find where name=("flash/" . $hpFile)]] > 0) do={ :set hpFile ("flash/" . $hpFile) }`,
      `:if ([:len [/file find where name=$hpFile]] > 0) do={ /import file-name=$hpFile; :put "HotspotPro: reprovision finished. Forget WiFi on the phone and join again for the voucher page." } else={ :put "HotspotPro: download failed. Check the URL and internet on this router." }`,
    ].join("; ");
  }, [token, origin, ssid]);

  async function copy() {
    if (!command) return;
    try {
      await navigator.clipboard.writeText(command);
      setCopied(true);
      showToast("Reprovision command copied. Paste it in WinBox → New Terminal, then press Enter.");
      window.setTimeout(() => setCopied(false), 2500);
    } catch {
      showToast("Select the command and copy it manually.");
    }
  }

  if (!token) {
    return (
      <article data-testid="reprovision-panel" className="rounded-2xl border border-[#e6e6e6] bg-white p-5 shadow-[0_8px_24px_rgba(26,26,26,0.06)]">
        <h3 className="text-base font-bold text-[#1a1a1a]">Reprovision (WinBox paste)</h3>
        <p className="mt-2 text-sm text-[#737373]">This router has no setup link yet. Remove it and add it again from Add Router to get a paste command.</p>
      </article>
    );
  }

  return (
    <article data-testid="reprovision-panel" className="rounded-2xl border border-[#e6e6e6] bg-white p-5 shadow-[0_8px_24px_rgba(26,26,26,0.06)]">
      <h3 className="text-base font-bold text-[#1a1a1a]">Reprovision — paste in WinBox</h3>
      <p className="mt-1 text-sm text-[#737373]">
        This reconfigures the router again: hotspot, captive portal login pages, and WiFi on the voucher bridge (SSID: <span className="font-mono font-semibold text-[#1a1a1a]">{ssid}</span>).
        After it finishes, forget the WiFi on the phone and join again — the voucher page should open.
      </p>

      {origins.length > 1 && (
        <label className="mt-3 block text-xs font-semibold text-[#525252]">
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
        <p className="mt-3 text-sm text-[#1a1a1a]">
          Open this site on a network address the router can reach (not localhost), or set <code>HOTSPOTPRO_PUBLIC_URL</code> and restart.
        </p>
      ) : (
        <div className="mt-3 flex flex-col gap-2 sm:flex-row sm:items-start">
          <code
            data-testid="reprovision-command"
            className="block max-h-40 flex-1 overflow-auto break-all rounded-xl bg-[#1a1a1a] p-3 font-mono text-[11px] leading-relaxed text-white"
          >
            {command}
          </code>
          <button
            type="button"
            data-testid="reprovision-copy"
            onClick={() => void copy()}
            className="inline-flex shrink-0 items-center justify-center gap-2 rounded-xl bg-[#1a1a1a] px-4 py-2.5 text-sm font-bold text-white hover:bg-[#111111]"
          >
            {copied ? <Check size={15} /> : <Copy size={15} />}
            {copied ? "Copied" : "Copy script"}
          </button>
        </div>
      )}

      <ol className="mt-3 list-decimal space-y-1 pl-5 text-xs text-[#525252]">
        <li>In WinBox open New Terminal</li>
        <li>Paste the script and press Enter</li>
        <li>Wait until it prints that reprovision finished</li>
        <li>On the phone: forget the WiFi, join again — enter the voucher on the captive portal</li>
      </ol>
    </article>
  );
}
