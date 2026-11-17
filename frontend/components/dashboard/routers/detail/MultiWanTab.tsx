"use client";

// Multi-WAN tab: load balancing / failover for ISP links.
// Remote WinBox is secondary — tunnel comes from the router setup script once.

import { useEffect, useMemo, useState } from "react";
import { Plus, Trash2 } from "lucide-react";

import { useDashboard } from "@/components/dashboard/context/DashboardContext";
import type { RouterInfo, RouterISPLink } from "@/components/dashboard/data/dashboard-data";
import {
  DEFAULT_WAN_MODE,
  defaultIspLink,
  ensureMinimumIspLinks,
} from "@/components/dashboard/routers/multiWanDefaults";
import { DirtyApplyBar } from "@/components/dashboard/shared/DirtyApplyBar";
import { OpenBrowserConsoleButton } from "@/components/dashboard/routers/detail/BrowserRouterConsole";

function seedIspLinks(router: RouterInfo): RouterISPLink[] {
  if (router.ispLinks.length > 0) return router.ispLinks;
  const links = ensureMinimumIspLinks([]);
  const wan = (router.wanInterface || "ether1").trim() || "ether1";
  links[0] = { ...links[0], interface: wan, label: "Primary ISP", allowRemovalFromBridge: true };
  if (links[1]?.interface === wan) {
    const alt = wan === "ether1" ? "ether2" : "ether1";
    links[1] = { ...links[1], interface: alt, allowRemovalFromBridge: true };
  }
  return links;
}

export function MultiWanTab({ router }: { router: RouterInfo }) {
  const { updateMultiWanConfig, showToast, toggleRemoteAccess } = useDashboard();
  const needsDefaults = router.ispLinks.length === 0;
  const [wanMode, setWanMode] = useState<RouterInfo["multiWanMode"]>(
    needsDefaults && router.multiWanMode === "Single WAN" ? DEFAULT_WAN_MODE : router.multiWanMode,
  );
  const [ispLinks, setIspLinks] = useState<RouterISPLink[]>(() => seedIspLinks(router));
  const [filledIn] = useState(needsDefaults);
  const [savedMode, setSavedMode] = useState(wanMode);
  const [savedLinks, setSavedLinks] = useState(ispLinks);
  const [applying, setApplying] = useState(false);
  const [appliedNote, setAppliedNote] = useState<string | null>(
    router.multiWanAppliedAt ? `Last applied ${new Date(router.multiWanAppliedAt).toLocaleString()}` : null,
  );
  const dirty = useMemo(
    () => wanMode !== savedMode || JSON.stringify(ispLinks) !== JSON.stringify(savedLinks),
    [wanMode, savedMode, ispLinks, savedLinks],
  );
  const remoteOn = router.remoteAccessEnabled !== false && router.remoteAccessHold !== true;

  useEffect(() => {
    if (!needsDefaults) return;
    updateMultiWanConfig(router.ip, wanMode, ispLinks, true);
    // Push defaults to the live router so Multi-WAN works as soon as this tab is opened.
    void fetch("/api/routers/jobs", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ ip: router.ip, action: "multiwan", multiWanMode: wanMode, ispLinks }),
    })
      .then((res) => {
        if (res.ok) {
          setSavedMode(wanMode);
          setSavedLinks(ispLinks);
          setAppliedNote("Defaults sent to the router (~3 seconds).");
        }
      })
      .catch(() => undefined);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (router.ispLinks.length > 0 && !needsDefaults) {
      setWanMode(router.multiWanMode);
      setIspLinks(router.ispLinks);
      setSavedMode(router.multiWanMode);
      setSavedLinks(router.ispLinks);
    }
  }, [router.ip, router.multiWanMode, router.ispLinks, needsDefaults]);

  function addIspLink() {
    if (ispLinks.length === 1 && wanMode === "Single WAN") setWanMode(DEFAULT_WAN_MODE);
    setIspLinks((current) => [...current, defaultIspLink(current)]);
  }

  function updateIspLink(id: string, updates: Partial<RouterISPLink>) {
    setIspLinks((current) => current.map((link) => (link.id === id ? { ...link, ...updates } : link)));
  }

  function removeIspLink(id: string) {
    setIspLinks((current) => {
      if (current.length <= 1) return current;
      const next = current.filter((link) => link.id !== id);
      if (next.length === 1) setWanMode("Single WAN");
      return next;
    });
  }

  async function saveMultiWan() {
    if (!dirty) return;
    setApplying(true);
    try {
      updateMultiWanConfig(router.ip, wanMode, ispLinks);
      const res = await fetch("/api/routers/jobs", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ip: router.ip, action: "multiwan", multiWanMode: wanMode, ispLinks }),
      }).catch(() => null);
      if (!res || !res.ok) {
        showToast("Could not apply Multi-WAN. Check that this router is set up and online.");
        return;
      }
      setSavedMode(wanMode);
      setSavedLinks(ispLinks);
      setAppliedNote(`Applied ${new Date().toLocaleTimeString()} — live in about 3 seconds.`);
      showToast("Multi-WAN applied. Load balancing / failover updates on the next check-in (~3 seconds).");
    } finally {
      setApplying(false);
    }
  }

  return (
    <div className="space-y-5" data-testid="multiwan">
      <article className="rounded-2xl border border-[#e6e6e6] bg-white p-5 shadow-[0_8px_24px_rgba(26,26,26,0.06)]">
        <h3 className="text-base font-bold text-[#1a1a1a]">Multi-WAN</h3>
        <p className="mt-1 text-sm text-[#737373]">
          Load balancing and failover across your ISP links. Change mode or interfaces, then Apply — the router picks it up in about 3 seconds.
        </p>
        {appliedNote && <p className="mt-2 text-xs font-semibold text-[#525252]">{appliedNote}</p>}
      </article>

      {filledIn && (
        <p data-testid="multiwan-defaults-note" className="rounded-xl bg-[#f4f4f4] p-3 text-xs text-[#525252]">
          Two ISP links were filled in (DHCP, public DNS, health checks) and sent to the router. Match the interface names to your cables if needed, then Apply again.
        </p>
      )}

      <article className="rounded-2xl border border-[#e6e6e6] bg-white p-5 shadow-[0_8px_24px_rgba(26,26,26,0.06)]">
        <label className="block">
          <span className="mb-2 block text-sm font-semibold text-[#525252]">
            Mode <span className="text-red-500">*</span>
          </span>
          <select
            value={wanMode}
            disabled={ispLinks.length <= 1}
            onChange={(event) => setWanMode(event.target.value as typeof wanMode)}
            className="h-11 w-full rounded-xl border-2 border-[#d4d4d4] bg-white px-3 text-sm outline-none focus:border-[#1a1a1a]"
          >
            <option value="Single WAN">Single WAN - use one internet link</option>
            <option value="Load Balancing">Load Balancing - share traffic equally</option>
            <option value="Failover">Failover - keep backup when one fails</option>
            <option value="Load Balancing + Failover">Load Balancing + Failover - share traffic equally, keep backup when one fails</option>
          </select>
        </label>
      </article>

      <p className="text-sm font-bold text-[#1a1a1a]">ISP Links ({ispLinks.length})</p>
      {ispLinks.length === 1 && (
        <p data-testid="single-isp-note" className="rounded-xl bg-[#f4f4f4] p-3 text-xs text-[#525252]">
          Only one internet link is left, so this router runs as Single WAN. Add another link to turn load balancing back on.
        </p>
      )}
      {ispLinks.map((link) => (
        <article key={link.id} data-testid="isp-link" className="rounded-2xl border border-[#e6e6e6] bg-white p-5 shadow-[0_8px_24px_rgba(26,26,26,0.06)]">
          <div className="mb-3 flex justify-end">
            <button
              type="button"
              data-testid="isp-remove"
              disabled={ispLinks.length <= 1}
              title={ispLinks.length <= 1 ? "At least one internet link is required" : "Remove this link"}
              onClick={() => removeIspLink(link.id)}
              className="rounded-lg p-1.5 text-red-500 hover:bg-red-50 disabled:cursor-not-allowed disabled:opacity-30"
            >
              <Trash2 size={14} />
            </button>
          </div>
          <div className="grid gap-4 sm:grid-cols-2">
            <label className="block">
              <span className="mb-2 block text-sm font-semibold text-[#525252]">Label *</span>
              <input value={link.label} onChange={(e) => updateIspLink(link.id, { label: e.target.value })} className="h-11 w-full rounded-xl border border-[#e6e6e6] px-3 text-sm outline-none focus:border-[#1a1a1a]" />
            </label>
            <label className="block">
              <span className="mb-2 block text-sm font-semibold text-[#525252]">Interface *</span>
              <input value={link.interface} onChange={(e) => updateIspLink(link.id, { interface: e.target.value })} placeholder="e.g. ether2" className="h-11 w-full rounded-xl border border-[#e6e6e6] px-3 text-sm outline-none focus:border-[#1a1a1a]" />
            </label>
            <label className="block">
              <span className="mb-2 block text-sm font-semibold text-[#525252]">Connection type *</span>
              <select value={link.connectionType} onChange={(e) => updateIspLink(link.id, { connectionType: e.target.value as "DHCP" | "Static" })} className="h-11 w-full rounded-xl border border-[#e6e6e6] px-3 text-sm outline-none focus:border-[#1a1a1a]">
                <option value="DHCP">DHCP</option>
                <option value="Static">Static</option>
              </select>
            </label>
            <label className="block">
              <span className="mb-2 block text-sm font-semibold text-[#525252]">Gateway</span>
              <input value={link.gateway} onChange={(e) => updateIspLink(link.id, { gateway: e.target.value })} placeholder="Leave blank for DHCP" className="h-11 w-full rounded-xl border border-[#e6e6e6] px-3 text-sm outline-none focus:border-[#1a1a1a]" />
            </label>
            <label className="block">
              <span className="mb-2 block text-sm font-semibold text-[#525252]">DNS Servers</span>
              <input value={link.dnsServers} onChange={(e) => updateIspLink(link.id, { dnsServers: e.target.value })} placeholder="8.8.8.8,1.1.1.1" className="h-11 w-full rounded-xl border border-[#e6e6e6] px-3 text-sm outline-none focus:border-[#1a1a1a]" />
            </label>
            <label className="block">
              <span className="mb-2 block text-sm font-semibold text-[#525252]">Health Check IP *</span>
              <input value={link.healthCheckIp} onChange={(e) => updateIspLink(link.id, { healthCheckIp: e.target.value })} className="h-11 w-full rounded-xl border border-[#e6e6e6] px-3 text-sm outline-none focus:border-[#1a1a1a]" />
            </label>
          </div>
          <label className="mt-4 flex items-center gap-3">
            <button
              type="button"
              onClick={() => updateIspLink(link.id, { allowRemovalFromBridge: !link.allowRemovalFromBridge })}
              className={`relative h-6 w-11 shrink-0 rounded-full transition ${link.allowRemovalFromBridge ? "bg-[#1a1a1a]" : "bg-[#e6e6e6]"}`}
            >
              <span className={`absolute top-0.5 h-5 w-5 rounded-full bg-white shadow transition-transform ${link.allowRemovalFromBridge ? "translate-x-5" : "translate-x-0.5"}`} />
            </button>
            <span className="text-sm font-semibold text-[#525252]">Remove from hotspot bridge (needed for ISP ports)</span>
          </label>
        </article>
      ))}

      <button type="button" onClick={addIspLink} className="inline-flex items-center gap-2 rounded-xl border border-dashed border-[#d4d4d4] px-4 py-3 text-sm font-semibold text-[#1a1a1a] hover:bg-[#ffffff]">
        <Plus size={15} /> Add to ISP Links
      </button>

      <DirtyApplyBar
        dirty={dirty}
        applying={applying}
        onApply={saveMultiWan}
        applyLabel="Apply"
        saveLabel="Save"
        hint="Multi-WAN changes are ready. Apply or Save pushes load balancing / failover to the router."
        testId="multiwan-apply"
      />

      <article
        data-testid="multiwan-remote-winbox"
        className="rounded-2xl border border-[#e6e6e6] bg-white p-5 shadow-[0_8px_24px_rgba(26,26,26,0.06)]"
      >
        <h3 className="text-base font-bold text-[#1a1a1a]">Remote access</h3>
        <p className="mt-1 text-sm text-[#737373]">
          WireGuard / Back To Home is part of the router configuration script. Prefer <strong>Open in browser</strong> on this site — no WinBox or tunnel re-setup for daily work.
        </p>
        <div className="mt-3 flex flex-wrap items-center gap-2">
          <span className={`inline-flex rounded-full px-2.5 py-1 text-xs font-bold ${remoteOn ? "bg-[#f4f4f4] text-[#111111]" : "bg-slate-200 text-slate-700"}`}>
            {remoteOn ? "Remote on" : "Remote off"}
          </span>
          {router.wireguardConfig && (
            <span className="text-xs font-semibold text-[#525252]">Tunnel stored from setup</span>
          )}
        </div>
        <div className="mt-4 flex flex-wrap gap-2">
          <OpenBrowserConsoleButton router={router} />
          <button
            type="button"
            data-testid="multiwan-winbox-toggle"
            onClick={() => toggleRemoteAccess(router.ip, !remoteOn)}
            className="rounded-xl border border-[#1a1a1a] bg-white px-4 py-2.5 text-sm font-bold text-[#1a1a1a] hover:bg-[#f4f4f4]"
          >
            {remoteOn ? "Turn remote off" : "Enable remote access"}
          </button>
        </div>
      </article>
    </div>
  );
}
