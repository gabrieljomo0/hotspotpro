"use client";

// This router's Multi-WAN tab: choose how it uses multiple internet links
// (single/load-balancing/failover), and manage the list of ISP connections.
// This component owns all its own editing state — nothing here is shared
// with other tabs, so changes here can never accidentally affect them.

import { useEffect, useState } from "react";
import { Plus, Trash2 } from "lucide-react";

import { useDashboard } from "@/components/dashboard/context/DashboardContext";
import type { RouterInfo, RouterISPLink } from "@/components/dashboard/data/dashboard-data";
import {
  DEFAULT_WAN_MODE,
  defaultIspLink,
  ensureMinimumIspLinks,
} from "@/components/dashboard/routers/multiWanDefaults";

export function MultiWanTab({ router }: { router: RouterInfo }) {
  const { updateMultiWanConfig } = useDashboard();
  // A router with fewer than two links opens with two already filled in
  // (and the mode set to use both) — saved straight away, nothing to type.
  // Only a router with no links at all gets the two defaults; one with a single
  // link is a deliberate single-ISP setup and is left alone.
  const needsDefaults = router.ispLinks.length === 0;
  const [wanMode, setWanMode] = useState<RouterInfo["multiWanMode"]>(
    needsDefaults && router.multiWanMode === "Single WAN" ? DEFAULT_WAN_MODE : router.multiWanMode,
  );
  const [ispLinks, setIspLinks] = useState<RouterISPLink[]>(() => (needsDefaults ? ensureMinimumIspLinks(router.ispLinks) : router.ispLinks));
  const [filledIn] = useState(needsDefaults);

  useEffect(() => {
    if (needsDefaults) updateMultiWanConfig(router.ip, wanMode, ispLinks, true);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  function addIspLink() {
    // Adding a second link to a single-ISP router switches on balancing.
    if (ispLinks.length === 1 && wanMode === "Single WAN") setWanMode(DEFAULT_WAN_MODE);
    setIspLinks((current) => [...current, defaultIspLink(current)]);
  }

  function updateIspLink(id: string, updates: Partial<RouterISPLink>) {
    setIspLinks((current) => current.map((link) => (link.id === id ? { ...link, ...updates } : link)));
  }

  function removeIspLink(id: string) {
    // At least one link must stay. Down to one link means a single ISP.
    setIspLinks((current) => {
      if (current.length <= 1) return current;
      const next = current.filter((link) => link.id !== id);
      if (next.length === 1) setWanMode("Single WAN");
      return next;
    });
  }

  function saveMultiWan() {
    updateMultiWanConfig(router.ip, wanMode, ispLinks);
    // Save first, then queue the server-built Multi-WAN script so the live router
    // gets load balancing / failover on the next check-in (about 10 seconds).
    void fetch("/api/routers/jobs", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ ip: router.ip, action: "multiwan", multiWanMode: wanMode, ispLinks }),
    }).catch(() => {});
  }

  return (
    <div className="space-y-5" data-testid="multiwan">
      {filledIn && (
        <p data-testid="multiwan-defaults-note" className="rounded-xl bg-[#f4f4f4] p-3 text-xs text-[#525252]">
          Two ISP links were set up for you with the standard settings (DHCP, public DNS and health checks)
          and saved. Change the interface names to match your cables, or edit anything below.
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
          Only one internet link is left, so this router runs as Single WAN. Use Add to ISP Links to add another
          and turn load balancing back on.
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
            <span className="text-sm font-semibold text-[#525252]">Allow removal from hotspot bridge if needed</span>
          </label>
        </article>
      ))}

      <button type="button" onClick={addIspLink} className="inline-flex items-center gap-2 rounded-xl border border-dashed border-[#d4d4d4] px-4 py-3 text-sm font-semibold text-[#1a1a1a] hover:bg-[#ffffff]">
        <Plus size={15} /> Add to ISP Links
      </button>

      <div className="flex gap-3">
        <button type="button" onClick={saveMultiWan} className="rounded-xl bg-[#1a1a1a] px-6 py-3 text-sm font-bold text-white hover:bg-[#111111]">
          Submit
        </button>
      </div>
    </div>
  );
}
