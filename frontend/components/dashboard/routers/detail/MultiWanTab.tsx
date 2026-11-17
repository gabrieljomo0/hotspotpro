"use client";

// Multi-WAN: ISP links / load balancing, plus remote WinBox so you can open
// WinBox to this router from another location (cloud name or WireGuard tunnel).

import { useEffect, useMemo, useState } from "react";
import { Copy, Loader2, Plus, RefreshCw, Trash2 } from "lucide-react";

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
  links[0] = { ...links[0], interface: wan, label: "Primary ISP" };
  if (links[1]?.interface === wan) {
    const alt = wan === "ether1" ? "ether2" : "ether1";
    links[1] = { ...links[1], interface: alt };
  }
  return links;
}

export function MultiWanTab({ router }: { router: RouterInfo }) {
  const {
    updateMultiWanConfig,
    showToast,
    toggleRemoteAccess,
    regenerateWinboxAddress,
  } = useDashboard();
  const needsDefaults = router.ispLinks.length === 0;
  const [wanMode, setWanMode] = useState<RouterInfo["multiWanMode"]>(
    needsDefaults && router.multiWanMode === "Single WAN" ? DEFAULT_WAN_MODE : router.multiWanMode,
  );
  const [ispLinks, setIspLinks] = useState<RouterISPLink[]>(() => seedIspLinks(router));
  const [filledIn] = useState(needsDefaults);
  const [savedMode, setSavedMode] = useState(wanMode);
  const [savedLinks, setSavedLinks] = useState(ispLinks);
  const [applying, setApplying] = useState(false);
  const [prepareStatus, setPrepareStatus] = useState<"idle" | "preparing" | "ready" | "timeout">("idle");
  const dirty = useMemo(
    () => wanMode !== savedMode || JSON.stringify(ispLinks) !== JSON.stringify(savedLinks),
    [wanMode, savedMode, ispLinks, savedLinks],
  );
  const remoteOn = router.remoteAccessEnabled !== false && router.remoteAccessHold !== true;

  useEffect(() => {
    if (needsDefaults) updateMultiWanConfig(router.ip, wanMode, ispLinks, true);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (prepareStatus !== "preparing") return;
    if (router.winboxReach === "direct" && router.winboxAddress) setPrepareStatus("ready");
    else if (router.wireguardConfig) setPrepareStatus("ready");
  }, [prepareStatus, router.winboxReach, router.winboxAddress, router.wireguardConfig]);

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
        showToast("Could not queue Multi-WAN on the router. Check that this router is set up and online.");
        return;
      }
      setSavedMode(wanMode);
      setSavedLinks(ispLinks);
      setPrepareStatus("preparing");
      showToast("Multi-WAN saved. Preparing remote WinBox automatically…");
      if (!remoteOn) toggleRemoteAccess(router.ip, true);
      else regenerateWinboxAddress(router.ip);
    } finally {
      setApplying(false);
    }
  }
  const connectHost =
    remoteOn && router.winboxReach === "direct" && router.winboxAddress
      ? router.winboxAddress.replace(/:8291$/, "")
      : remoteOn
        ? "192.168.216.1"
        : "192.168.88.1";
  const connectLabel =
    remoteOn && router.winboxReach === "direct" && router.winboxAddress
      ? router.winboxAddress.includes(":8291")
        ? router.winboxAddress
        : `${router.winboxAddress}:8291`
      : remoteOn
        ? "192.168.216.1"
        : "192.168.88.1 (admin LAN only)";

  async function copyWinboxAddress() {
    try {
      await navigator.clipboard.writeText(connectHost);
      showToast(
        remoteOn && router.winboxReach === "direct"
          ? `Copied ${connectHost}. Open WinBox → Connect To → paste → admin password.`
          : remoteOn
            ? "Copied 192.168.216.1. Open WinBox after the tunnel file activates."
            : "Copied 192.168.88.1. Enable Remote WinBox to reach this router from another location.",
      );
    } catch {
      showToast(`WinBox address: ${connectHost}`);
    }
  }

  return (
    <div className="space-y-5" data-testid="multiwan">
      <article
        data-testid="multiwan-remote-winbox"
        className="rounded-2xl border border-[#e6e6e6] bg-white p-5 shadow-[0_8px_24px_rgba(26,26,26,0.06)]"
      >
        <h3 className="text-base font-bold text-[#1a1a1a]">Remote WinBox</h3>
        <p className="mt-1 text-sm text-[#737373]">
          Use Open in browser to work on this router from the site (no WinBox app). Enable Remote WinBox or Apply Multi-WAN
          to prepare the tunnel or public address automatically (~3 seconds).
        </p>

        <div className="mt-4 flex flex-wrap items-center gap-3">
          <span
            className={`inline-flex rounded-full px-2.5 py-1 text-xs font-bold ${
              remoteOn ? "bg-[#f4f4f4] text-[#111111]" : "bg-slate-200 text-slate-700"
            }`}
          >
            {remoteOn ? "Remote access on" : "Remote access off"}
          </span>
          {prepareStatus === "preparing" && (
            <span data-testid="multiwan-winbox-preparing" className="inline-flex items-center gap-1.5 text-xs font-semibold text-[#525252]">
              <Loader2 size={14} className="animate-spin" /> Preparing connection…
            </span>
          )}
          {prepareStatus === "ready" && (
            <span data-testid="multiwan-winbox-ready" className="text-xs font-semibold text-[#111111]">
              Ready — details delivered
            </span>
          )}
          <p className="font-mono text-sm font-semibold text-[#1a1a1a]">{connectLabel}</p>
        </div>

        <p className="mt-3 text-sm text-[#525252]">
          {prepareStatus === "preparing"
            ? "Waiting for this router’s check-in. The public address or WireGuard tunnel will download by itself."
            : remoteOn && router.winboxReach === "direct"
              ? "Public path ready. WinBox address was copied — paste it in WinBox Connect To."
              : remoteOn && router.wireguardConfig
                ? "Behind another modem: the WireGuard tunnel file was downloaded automatically and 192.168.216.1 was copied for WinBox."
                : remoteOn
                  ? "Remote WinBox is on. Connection details arrive automatically on the next check-in."
                  : "Turn Remote WinBox on (or Apply Multi-WAN) to prepare access from another location automatically."}
        </p>

        <div className="mt-4 flex flex-wrap gap-2">
          <OpenBrowserConsoleButton router={router} />
          <button
            type="button"
            data-testid="multiwan-winbox-toggle"
            onClick={() => {
              if (remoteOn) {
                setPrepareStatus("idle");
                toggleRemoteAccess(router.ip, false);
              } else {
                setPrepareStatus("preparing");
                toggleRemoteAccess(router.ip, true);
              }
            }}
            className="rounded-xl border border-[#1a1a1a] bg-white px-4 py-2.5 text-sm font-bold text-[#1a1a1a] hover:bg-[#f4f4f4]"
          >
            {remoteOn ? "Turn remote off" : "Enable Remote WinBox"}
          </button>
          <button
            type="button"
            data-testid="multiwan-winbox-copy"
            onClick={() => void copyWinboxAddress()}
            className="inline-flex items-center gap-2 rounded-xl border border-[#e6e6e6] bg-white px-4 py-2.5 text-sm font-bold text-[#1a1a1a] hover:bg-[#f4f4f4]"
          >
            <Copy size={15} /> Copy WinBox address
          </button>
          {remoteOn && (
            <button
              type="button"
              data-testid="multiwan-winbox-refresh"
              onClick={() => {
                setPrepareStatus("preparing");
                regenerateWinboxAddress(router.ip);
              }}
              className="inline-flex items-center gap-2 rounded-xl border border-[#e6e6e6] bg-white px-4 py-2.5 text-sm font-bold text-[#1a1a1a] hover:bg-[#f4f4f4]"
            >
              <RefreshCw size={15} /> Refresh connection
            </button>
          )}
        </div>
      </article>

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

      <DirtyApplyBar
        dirty={dirty}
        applying={applying}
        onApply={saveMultiWan}
        applyLabel="Apply"
        saveLabel="Save"
        hint="Multi-WAN changes are ready. Apply or Save pushes them to the router."
        testId="multiwan-apply"
      />
    </div>
  );
}
