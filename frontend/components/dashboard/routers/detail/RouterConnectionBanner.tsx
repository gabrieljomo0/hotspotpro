"use client";

// The red / green banner at the top of a router's page.
//   red   — "Router lost internet": it stopped contacting HotspotPro (its internet or power is gone)
//   red   — "Router disconnected": you cut its internet; shows whether the router is following
//   green — "Back online": reconnected, or it recovered after losing contact (stays 10 minutes)
// Nothing is shown while the router is simply connected and healthy.

import { useEffect, useState } from "react";
import { Check, Copy, PlugZap, TriangleAlert, WifiOff, X } from "lucide-react";

import type { RouterInfo } from "@/components/dashboard/data/dashboard-data";
import { openReprovisionScript } from "@/components/dashboard/shared/editEvents";
import { ago, fmtDuration } from "./routerUsageMath";
import { connectionIndicator } from "../routerConnection";
import { useRouterControl } from "../useRouterControl";

const FLY_API = "https://hotspotpro-api.fly.dev";
const LEGACY_FLY_API = "https://hotspotpro-api.onrender.com";

export function RouterConnectionBanner({ router, onReconnect }: { router: RouterInfo; onReconnect: () => void }) {
  const { control } = useRouterControl(router.ip, 5000);
  const info = control[router.ip];
  const [tick, setTick] = useState(() => Date.now());
  const [dismissed, setDismissed] = useState<string | null>(null);
  const [origins, setOrigins] = useState<string[]>([]);
  const [origin, setOrigin] = useState("");
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    const id = window.setInterval(() => setTick(Date.now()), 1000);
    return () => window.clearInterval(id);
  }, []);

  // Addresses a router on this network could use to reach this server (never "localhost").
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
      } catch { /* none */ }
      list.unshift(FLY_API, LEGACY_FLY_API);
      if (!/^(localhost|127\.|\[::1\])/.test(window.location.hostname)) list.push(window.location.origin);
      const unique = [...new Set(list.filter(Boolean))];
      if (alive) { setOrigins(unique); setOrigin((current) => current || unique[0] || FLY_API); }
    })();
    return () => { alive = false; };
  }, []);

  const indicator = connectionIndicator(router, info, tick);
  if (!indicator) return null;
  const key = `${indicator.kind}:${indicator.since ?? ""}`;
  if (indicator.kind === "back" && dismissed === key) return null;

  const since = indicator.since ? ago(tick - Date.parse(indicator.since)) : null;
  const command =
    info?.setupPath && origin
      ? `/tool fetch url="${origin}${info.setupPath}" dst-path=hotspotpro-internet-switch.rsc; :delay 2s; :do { :execute script={/import file-name=hotspotpro-internet-switch.rsc} file=hotspotpro-import-out.txt } on-error={ /import file-name=hotspotpro-internet-switch.rsc }; :do { /file remove [find where name=hotspotpro-import-out.txt] } on-error={ }`
      : "";

  async function copy() {
    try {
      await navigator.clipboard.writeText(command);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 2000);
    } catch { /* the text is selectable anyway */ }
  }

  if (indicator.kind === "back") {
    return (
      <div data-testid="router-banner" data-kind="back" className="mb-6 flex items-start gap-3 rounded-xl border border-[#f3f1ec] bg-[#f3f1ec] px-5 py-4 text-[#111111]">
        <PlugZap size={22} className="mt-0.5 shrink-0" />
        <div className="flex-1">
          <p className="text-base font-black">Back online</p>
          <p className="text-sm">
            {router.name} {indicator.how === "reconnected" ? "was reconnected" : "recovered and is talking to HotspotPro again"} {since}
            {indicator.wasDownMs !== null && indicator.wasDownMs > 0 ? ` — it was down for ${fmtDuration(indicator.wasDownMs / 1000)}` : ""}.
            {indicator.how === "reconnected" ? " Internet is restored; customers can log in again." : ""}
          </p>
        </div>
        <button type="button" aria-label="Dismiss" onClick={() => setDismissed(key)} className="rounded-lg p-1 hover:bg-[#f3f1ec]"><X size={16} /></button>
      </div>
    );
  }

  const lost = indicator.kind === "lost";
  return (
    <div data-testid="router-banner" data-kind={indicator.kind} className="mb-6 rounded-xl border border-[#f3f1ec] bg-[#f3f1ec] px-5 py-4 text-[#111111]">
      <div className="flex flex-wrap items-start gap-3">
        <span className="relative mt-1 flex h-3 w-3 shrink-0">
          <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-[#1a1a1a] opacity-75" />
          <span className="relative inline-flex h-3 w-3 rounded-full bg-[#1a1a1a]" />
        </span>
        <WifiOff size={22} className="mt-0.5 shrink-0 text-[#1a1a1a]" />
        <div className="min-w-[240px] flex-1">
          <p className="text-base font-black text-[#1a1a1a]">{lost ? "Router offline" : "Router disconnected — internet is cut"}</p>
          <p className="text-sm">
            {lost
              ? `${router.name} hasn't contacted HotspotPro for ${indicator.since ? fmtDuration((tick - Date.parse(indicator.since)) / 1000) : "a while"} (last contact ${since}). It may have lost its internet connection or power, so customers on it are offline.`
              : `Nobody can get online through ${router.name} and new logins are refused. Disconnected ${since ?? "just now"}.`}
            {lost && router.disconnected ? " It is also disconnected by you." : ""}
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          {lost && (
            <button
              type="button"
              data-testid="router-banner-paste"
              onClick={() => openReprovisionScript(router.ip, "paste")}
              className="inline-flex items-center gap-2 rounded-xl bg-[#1a1a1a] px-4 py-2 text-sm font-bold text-white hover:bg-[#111111]"
            >
              <Copy size={15} /> Paste reconnect script
            </button>
          )}
          {router.disconnected && (
            <button
              type="button"
              data-testid="router-banner-reconnect"
              onClick={onReconnect}
              className="inline-flex items-center gap-2 rounded-xl bg-[#1a1a1a] px-4 py-2 text-sm font-bold text-white hover:bg-[#111111]"
            >
              <PlugZap size={15} /> Reconnect
            </button>
          )}
        </div>
      </div>

      {lost && (
        <p className="mt-3 text-sm text-[#1a1a1a]">
          The router has internet but is not checking in to this cloud API — status and CPU stay blank until it contacts{" "}
          <span className="font-mono font-semibold">{FLY_API}</span>. Use <strong>Paste reconnect script</strong> in WinBox
          once (or Reprovision → paste script).
        </p>
      )}

      {!lost && info && (
        <div className="mt-3 text-sm" data-testid="router-banner-enforcement">
          {info.enforced ? (
            <p className="flex items-center gap-2 text-[#111111]">
              <Check size={15} /> The router is following this — it last asked {ago(tick - Date.parse(info.lastCheckInAt ?? new Date(tick).toISOString()))} and checks every 3 seconds.
            </p>
          ) : (
            <div className="rounded-lg bg-[#f3f1ec] p-4 text-[#111111]">
              <p className="flex items-start gap-2 font-semibold">
                <TriangleAlert size={16} className="mt-0.5 shrink-0" />
                {!info.hasToken
                  ? "This router has no setup link, so Disconnect can only refuse new logins — it cannot cut people already online. Remove it and add it again to get a setup link."
                  : "The router hasn't picked this up. New logins are already refused, but to cut everyone, run this one command on the router, once."}
              </p>
              {info.hasToken && (
                <div className="mt-3 text-[#1a1a1a]">
                  <p className="text-xs text-[#111111]">In WinBox open New Terminal, paste this, press Enter. The router must be able to reach this address:</p>
                  {origins.length > 1 && (
                    <select value={origin} onChange={(e) => setOrigin(e.target.value)} aria-label="Server address the router should use" className="mt-2 rounded-lg border border-[#d4d4d4] bg-white px-3 py-1.5 text-sm">
                      {origins.map((o) => <option key={o} value={o}>{o}</option>)}
                    </select>
                  )}
                  {command ? (
                    <div className="mt-2 flex items-start gap-2">
                      <code data-testid="router-banner-command" className="block flex-1 break-all rounded-lg bg-white p-3 text-xs">{command}</code>
                      <button type="button" onClick={() => void copy()} className="inline-flex items-center gap-1.5 rounded-lg bg-[#1a1a1a] px-3 py-2 text-xs font-bold text-white hover:bg-[#111111]">
                        {copied ? <Check size={13} /> : <Copy size={13} />} {copied ? "Copied" : "Copy"}
                      </button>
                    </div>
                  ) : (
                    <p className="mt-2 text-xs">
                      This page is open on <strong>localhost</strong>, which a router can&apos;t reach, and no network address was found. Set <code>HOTSPOTPRO_PUBLIC_URL</code> (for example http://192.168.1.50:3000) in <code>.env.local</code>, restart, and come back.
                    </p>
                  )}
                </div>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
