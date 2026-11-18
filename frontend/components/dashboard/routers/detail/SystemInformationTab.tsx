"use client";

// Everything shown on a router's "System Information" tab: quick stats,
// status, connection health, WinBox access + uptime chart, a CPU/memory
// performance chart, device info, general info (with password reveal), and
// RADIUS config. It only needs the router itself and how many users are
// currently connected to it — everything else is computed from that.

import { useEffect, useMemo, useState } from "react";
import { Eye, EyeOff, Copy, CheckCircle2, AlertTriangle } from "lucide-react";
import { CartesianGrid, Line, LineChart, ReferenceLine, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";

import { useDashboard } from "@/components/dashboard/context/DashboardContext";
import type { RouterInfo } from "@/components/dashboard/data/dashboard-data";
import { useRouterControl } from "@/components/dashboard/routers/useRouterControl";
import { routerLiveStatus } from "@/components/dashboard/routers/routerLiveStatus";
import { DirtyApplyBar } from "@/components/dashboard/shared/DirtyApplyBar";
import { OpenBrowserConsoleButton } from "@/components/dashboard/routers/detail/BrowserRouterConsole";
import { autoPrepareRemoteWinbox, downloadWireguardTunnel } from "@/components/dashboard/routers/autoRemoteWinbox";

const WARN_AT = 75;
const OVERLOAD_AT = 90;

function loginLabelFrom(dnsName?: string) {
  return (
    (dnsName || "")
      .toLowerCase()
      .replace(/[^a-z0-9.-]/g, "")
      .replace(/^\.+|\.+$/g, "")
      .replace(/\.{2,}/g, ".")
      .slice(0, 48) || "wifi"
  );
}

function uptimeSeries(hours: string[] | undefined, days: number) {
  const now = Date.now();
  return Array.from({ length: days }, (_, index) => {
    const day = new Date(now - (days - 1 - index) * 86400000).toISOString().slice(0, 10);
    const seen = (hours ?? []).filter((hour) => hour.startsWith(day)).length;
    return Math.min(100, Math.round((100 * seen) / 24));
  });
}

function UptimeLine({ hours, days, alert }: { hours?: string[]; days: number; alert?: boolean }) {
  if (!hours?.length) return null;
  const series = uptimeSeries(hours, days);
  const width = 140;
  const height = 28;
  const step = series.length > 1 ? width / (series.length - 1) : width;
  const points = series.map((value, index) => `${index * step},${height - (value / 100) * (height - 4) - 2}`).join(" ");
  return (
    <svg viewBox={`0 0 ${width} ${height}`} className="mt-3 h-7 w-full" aria-hidden>
      <polyline fill="none" stroke={alert ? "#dc2626" : "#1a1a1a"} strokeWidth="1.6" points={points} />
    </svg>
  );
}

export function SystemInformationTab({
  router,
  isEnabled,
  connectedUserCount,
}: {
  router: RouterInfo;
  isEnabled: boolean;
  connectedUserCount: number;
}) {
  const { showToast, updateRouterDetails, applyRouterPatch, routerEnabled, toggleRemoteAccess } = useDashboard();
  const [preparingRemote, setPreparingRemote] = useState(false);
  const { control } = useRouterControl(router.ip, 5000);
  const live = routerLiveStatus(router, control[router.ip], routerEnabled);
  const [showPassword, setShowPassword] = useState(false);
  const [hotspotOn, setHotspotOn] = useState(router.hotspotEnabled);
  const [network, setNetwork] = useState(router.hotspotNetwork || "");
  const [gateway, setGateway] = useState(router.hotspotGatewayIp || "");
  const [dnsServers, setDnsServers] = useState(router.hotspotDnsServers || "8.8.8.8,8.8.4.4");
  const [loginLabel, setLoginLabel] = useState(loginLabelFrom(router.dnsName));
  const [savedHotspot, setSavedHotspot] = useState({
    hotspotOn: router.hotspotEnabled,
    network: router.hotspotNetwork || "",
    gateway: router.hotspotGatewayIp || "",
    dnsServers: router.hotspotDnsServers || "8.8.8.8,8.8.4.4",
    loginLabel: loginLabelFrom(router.dnsName),
  });
  const [applyingHotspot, setApplyingHotspot] = useState(false);
  const hotspotDirty = useMemo(() => {
    const label = loginLabelFrom(loginLabel);
    return (
      hotspotOn !== savedHotspot.hotspotOn ||
      network.trim() !== savedHotspot.network ||
      gateway.trim() !== savedHotspot.gateway ||
      dnsServers.trim() !== savedHotspot.dnsServers ||
      label !== savedHotspot.loginLabel
    );
  }, [hotspotOn, network, gateway, dnsServers, loginLabel, savedHotspot]);

  useEffect(() => {
    const next = {
      hotspotOn: router.hotspotEnabled,
      network: router.hotspotNetwork || "",
      gateway: router.hotspotGatewayIp || "",
      dnsServers: router.hotspotDnsServers || "8.8.8.8,8.8.4.4",
      loginLabel: loginLabelFrom(router.dnsName),
    };
    setHotspotOn(next.hotspotOn);
    setNetwork(next.network);
    setGateway(next.gateway);
    setDnsServers(next.dnsServers);
    setLoginLabel(next.loginLabel);
    setSavedHotspot(next);
  }, [router.ip, router.hotspotEnabled, router.hotspotNetwork, router.hotspotGatewayIp, router.hotspotDnsServers, router.dnsName]);

  // Both charts use "fake but consistent" data — see chartHelpers.ts for why.
  const perfData = Array.from({ length: 12 }, (_, i) => ({
    t: i,
    cpu: isEnabled ? router.cpu : 0,
    memory: isEnabled ? router.memory : 0,
  }));

  // Overload hint: above WARN_AT the router is getting strained, above
  // OVERLOAD_AT it is likely to slow down, drop users or restart.
  const peakCpu = Math.max(...perfData.map((d) => d.cpu));
  const peakMemory = Math.max(...perfData.map((d) => d.memory));
  const peak = Math.max(peakCpu, peakMemory);
  const level: "ok" | "warn" | "overload" = peak >= OVERLOAD_AT ? "overload" : peak >= WARN_AT ? "warn" : "ok";
  const strained = [peakCpu >= WARN_AT ? `CPU (peak ${peakCpu}%)` : "", peakMemory >= WARN_AT ? `memory (peak ${peakMemory}%)` : ""].filter(Boolean).join(" and ");
  const dotFor = (key: "cpu" | "memory") =>
    function PerfDot(props: { cx?: number; cy?: number; index?: number }) {
      const point = perfData[props.index ?? 0];
      if (!point || props.cx === undefined || props.cy === undefined || point[key] < WARN_AT) {
        return <g key={`${key}-${props.index}`} />;
      }
      return (
        <circle key={`${key}-${props.index}`} cx={props.cx} cy={props.cy} r={4} fill={point[key] >= OVERLOAD_AT ? "#1a1a1a" : "#111111"} stroke="#ffffff" strokeWidth={1.5} />
      );
    };

  return (
    <div className="space-y-5">
      <div className="grid gap-4 sm:grid-cols-4">
        <div className="rounded-xl border border-[#f4f4f4] p-4">
          <p className="text-xs text-[#737373]">CPU Usage</p>
          <p className="text-xl font-black text-[#1a1a1a]">{router.cpu}%</p>
        </div>
        <div className="rounded-xl border border-[#f4f4f4] p-4">
          <p className="text-xs text-[#737373]">Memory Usage</p>
          <p className="text-xl font-black text-[#1a1a1a]">{router.memory}%</p>
        </div>
        <div className="rounded-xl border border-[#f4f4f4] p-4">
          <p className="text-xs text-[#737373]">Active Users</p>
          <p className="text-xl font-black text-[#1a1a1a]">{connectedUserCount}</p>
        </div>
        <div className="rounded-xl border border-[#f4f4f4] p-4">
          <p className="text-xs text-[#737373]">Router Status</p>
          <p className={`text-xl font-black ${live === "Online" ? "text-[#1a1a1a]" : "text-red-600"}`}>
            {live}
          </p>
        </div>
      </div>

      <article className="rounded-2xl border border-[#e6e6e6] bg-white p-5 shadow-[0_8px_24px_rgba(26,26,26,0.06)]">
        <h3 className="mb-4 text-base font-bold text-[#1a1a1a]">Status</h3>
        <div className="grid gap-4 sm:grid-cols-2">
          <div>
            <p className="text-xs text-[#737373]">Status</p>
            <span className={`inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-xs font-bold ${router.lastError ? "bg-red-100 text-red-700" : "bg-[#f4f4f4] text-[#111111]"}`}>
              {router.lastError ? "error" : "active"}
            </span>
          </div>
          <div>
            <p className="text-xs text-[#737373]">Provisioning</p>
            <span className={`inline-flex rounded-full px-2.5 py-1 text-xs font-bold ${
              router.provisioningStatus === "Provisioned" ? "bg-[#f4f4f4] text-[#111111]" : "bg-[#f4f4f4] text-[#111111]"
            }`}>
              {router.provisioningStatus}
            </span>
          </div>
          <div>
            <p className="text-xs text-[#737373]">Last Connected</p>
            <p className="text-sm font-semibold text-[#1a1a1a]">{router.lastConnectedAt ?? "Never"}</p>
          </div>
          <div>
            <p className="text-xs text-[#737373]">Added At</p>
            <p className="text-sm font-semibold text-[#1a1a1a]">{router.provisionedAt ?? "Not yet"}</p>
          </div>
          {router.lastError && (
            <div>
              <p className="text-xs text-[#737373]">Last Error</p>
              <p className="text-sm font-semibold text-red-600">{router.lastError}</p>
            </div>
          )}
        </div>
      </article>

      <article data-testid="router-config-status" className="rounded-2xl border border-[#e6e6e6] bg-white p-5 shadow-[0_8px_24px_rgba(26,26,26,0.06)]">
        <h3 className="mb-4 text-base font-bold text-[#1a1a1a]">Configuration</h3>
        <div className="grid gap-3 sm:grid-cols-2">
          {[
            ["Provisioned", router.provisionedAt ?? (router.provisioningStatus === "Provisioned" ? "Yes" : null)],
            ["SNMP monitoring", router.snmpConfigured ? "On" : null],
            ["Walled garden", router.walledGardenConfigured ? "Configured" : null],
            ["Services hardened", router.servicesHardened ? "Telnet, FTP and SSL off" : null],
            ["Hotspot files synced", router.hotspotFilesSyncedAt ?? null],
            ["Clock synced", router.timeSyncedAt ?? null],
            ["Script updated", router.scriptUpdatedAt ?? null],
            ["Connection", router.paused ? "Paused" : "Running"],
            ["Internet", router.disconnected ? "Disconnected (cut)" : "Connected"],
          ].map(([label, value]) => (
            <div key={label as string} data-testid="router-config-row" className="flex items-center justify-between gap-3 rounded-lg bg-[#f7f7f7] px-3 py-2">
              <span className="text-sm text-[#525252]">{label}</span>
              <span className={`text-sm font-semibold ${value ? "text-[#1a1a1a]" : "text-[#a3a3a3]"}`}>{value ?? "Not yet"}</span>
            </div>
          ))}
        </div>
      </article>

      <article data-testid="router-activity" className="rounded-2xl border border-[#e6e6e6] bg-white p-5 shadow-[0_8px_24px_rgba(26,26,26,0.06)]">
        <h3 className="mb-4 text-base font-bold text-[#1a1a1a]">Recent activity on this router</h3>
        {(router.activity ?? []).length === 0 ? (
          <p className="text-sm text-[#a3a3a3]">Nothing yet. Actions you run on this router appear here.</p>
        ) : (
          <ul className="space-y-2">
            {(router.activity ?? []).slice(0, 10).map((entry, index) => (
              <li key={`${entry.at}-${index}`} className="flex items-start justify-between gap-3 text-sm">
                <span className="text-[#1a1a1a]">{entry.text}</span>
                <span className="shrink-0 text-xs text-[#a3a3a3]">{entry.at}</span>
              </li>
            ))}
          </ul>
        )}
      </article>

      <article className="rounded-2xl border border-[#e6e6e6] bg-white p-5 shadow-[0_8px_24px_rgba(26,26,26,0.06)]">
        <h3 className="mb-4 text-base font-bold text-[#1a1a1a]">Connection Health</h3>
        <div className="grid gap-4 sm:grid-cols-2">
          <div>
            <p className="text-xs text-[#737373]">Mode</p>
            <span className="inline-flex items-center gap-1 rounded-full bg-[#f4f4f4] px-2.5 py-1 text-xs font-bold text-[#111111]">
              {router.connectionMode}
            </span>
          </div>
          <div>
            <p className="text-xs text-[#737373]">Health</p>
            <span className={`inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-xs font-bold ${
              router.health === "ok" ? "bg-[#f4f4f4] text-[#111111]" : router.health === "checking" ? "bg-[#f4f4f4] text-[#111111]" : "bg-red-100 text-red-700"
            }`}>
              {router.health === "ok" ? <CheckCircle2 size={12} /> : null} {router.health === "ok" ? "OK" : router.health === "checking" ? "Checking" : "Error"}
            </span>
          </div>
          <div>
            <p className="text-xs text-[#737373]">Health Checked</p>
            <p className="text-sm font-semibold text-[#1a1a1a]">{router.lastConnectedAt ?? "Waiting for the router"}</p>
          </div>
        </div>
      </article>

      <article className="rounded-2xl border border-[#e6e6e6] bg-white p-5 shadow-[0_8px_24px_rgba(26,26,26,0.06)]">
        <h3 className="mb-4 text-base font-bold text-[#1a1a1a]">Remote WinBox Access</h3>
        <div className="mb-4 flex flex-wrap gap-2">
          <OpenBrowserConsoleButton router={router} />
          <button
            type="button"
            disabled={preparingRemote}
            onClick={() => {
              setPreparingRemote(true);
              if (!router.remoteAccessEnabled) toggleRemoteAccess(router.ip, true);
              void autoPrepareRemoteWinbox({
                ip: router.ip,
                name: router.name,
                forceDownload: true,
                patchRouter: (ip, patch) => applyRouterPatch(ip, patch),
                showToast,
              }).finally(() => setPreparingRemote(false));
            }}
            className="inline-flex items-center gap-2 rounded-xl border border-[#e6e6e6] bg-white px-4 py-2.5 text-sm font-bold text-[#1a1a1a] hover:bg-[#f7f7f7] disabled:opacity-50"
          >
            {preparingRemote ? "Preparing…" : "Prepare remote access"}
          </button>
        </div>
        <p className="mb-4 text-xs text-[#737373]">
          Open in browser sends commands from this site (works even if the router is far away). For full WinBox on your laptop, prepare remote access, then use the address / WireGuard steps below.
        </p>
        <div className="mb-5 space-y-4">
          <div>
            <p className="text-xs text-[#737373]">Status</p>
            <span className={`mt-1 inline-flex rounded-full px-2.5 py-1 text-xs font-bold ${router.remoteAccessEnabled ? "bg-[#f4f4f4] text-[#111111]" : "bg-slate-200 text-slate-700"}`}>
              {router.remoteAccessEnabled ? "Enabled" : "Disabled"}
            </span>
            {router.remoteAccessEnabled && router.winboxReach ? (
              <span className="ml-2 text-xs text-[#737373]">
                {router.winboxReach === "direct" ? "Public path" : router.winboxReach === "relay" ? "Tunnel (NAT)" : "LAN only"}
              </span>
            ) : null}
          </div>
          <div>
            <p className="text-xs text-[#737373]">WinBox address (laptop)</p>
            <p className="mt-1 font-mono text-sm font-semibold text-[#1a1a1a]">
              {router.winboxReach === "direct" && router.winboxAddress
                ? router.winboxAddress
                : router.remoteAccessEnabled
                  ? "192.168.216.1"
                  : "—"}
            </p>
            <p className="mt-1 text-sm text-[#1a1a1a]">
              {router.remoteAccessEnabled && router.winboxReach === "direct"
                ? "Paste that address into WinBox on this laptop with the router admin password."
                : router.remoteAccessEnabled && router.wireguardConfig
                  ? "Download WireGuard, activate the tunnel on this laptop, then open WinBox to 192.168.216.1."
                  : router.remoteAccessEnabled
                    ? "Waiting for the router to finish creating the tunnel on the next check-in. Tap Prepare remote access."
                    : "Tap Prepare remote access (or enable remote), then Open in browser / WinBox on your laptop."}
            </p>
          </div>
        </div>
        {router.remoteAccessEnabled && router.wireguardConfig && (
          <button
            type="button"
            className="mb-5 rounded-xl bg-[#1a1a1a] px-4 py-2 text-sm font-bold text-white"
            onClick={() => {
              downloadWireguardTunnel(router.name, router.wireguardConfig || "");
              showToast("Tunnel file downloaded. Import into WireGuard on this laptop, turn it on, then WinBox → 192.168.216.1");
            }}
          >
            Download WireGuard file
          </button>
        )}

        <div className="grid gap-4 sm:grid-cols-3">
          <div className="rounded-xl border border-[#f4f4f4] p-4">
            <p className="text-xs text-[#737373]">30-Day Uptime</p>
            <p className={`text-xl font-black ${router.uptime30Day !== null && router.uptime30Day < 95 ? "text-red-600" : "text-[#1a1a1a]"}`}>
              {router.uptime30Day !== null ? `${router.uptime30Day}%` : "No data"}
            </p>
            {router.uptime30Day !== null && router.uptime30Day < 95 ? <p className="mt-1 text-xs font-semibold text-red-600">Needs attention</p> : null}
            <UptimeLine hours={router.seenHours} days={30} alert={router.uptime30Day !== null && router.uptime30Day < 95} />
          </div>
          <div className="rounded-xl border border-[#f4f4f4] p-4">
            <p className="text-xs text-[#737373]">7-Day Uptime</p>
            <p className="text-xl font-black text-[#1a1a1a]">{router.uptime7Day !== null ? `${router.uptime7Day}%` : "No data"}</p>
            <p className="mt-1 text-xs text-[#737373]">Last 7 days</p>
            <UptimeLine hours={router.seenHours} days={7} />
          </div>
          <div className="rounded-xl border border-[#f4f4f4] p-4">
            <p className="text-xs text-[#737373]">Current Uptime</p>
            <p className="text-xl font-black text-[#1a1a1a]">{router.uptime || "Unknown"}</p>
            <p className={`mt-1 text-xs font-semibold ${live === "Online" ? "text-emerald-600" : "text-red-600"}`}>
              {live}
            </p>
          </div>
        </div>
      </article>

      <article className="rounded-2xl border border-[#e6e6e6] bg-white p-5 shadow-[0_8px_24px_rgba(26,26,26,0.06)]">
        <h3 className="text-base font-bold text-[#1a1a1a]">Hotspot Configuration</h3>
        <div className="mt-4 flex items-center gap-3">
          <button
            type="button"
            role="switch"
            aria-checked={hotspotOn}
            onClick={() => setHotspotOn((current) => !current)}
            className={`relative h-6 w-11 rounded-full ${hotspotOn ? "bg-[#1a1a1a]" : "bg-[#d4d4d4]"}`}
          >
            <span className={`absolute top-0.5 h-5 w-5 rounded-full bg-white ${hotspotOn ? "left-5" : "left-0.5"}`} />
          </button>
          <div>
            <p className="text-sm font-semibold text-[#1a1a1a]">Enable Hotspot</p>
            <p className="text-xs text-[#737373]">Configure hotspot service on this router</p>
          </div>
        </div>
        <div className="mt-4 grid gap-4 sm:grid-cols-2">
          <label className="block">
            <span className="mb-1 block text-xs text-[#737373]">Hotspot Network</span>
            <input value={network} onChange={(event) => setNetwork(event.target.value)} className="h-11 w-full rounded-xl border border-[#e6e6e6] px-3 font-mono text-sm outline-none focus:border-[#1a1a1a]" />
            <span className="mt-1 block text-xs text-[#a3a3a3]">Network range for hotspot clients</span>
          </label>
          <label className="block">
            <span className="mb-1 block text-xs text-[#737373]">Gateway IP</span>
            <input value={gateway} onChange={(event) => setGateway(event.target.value)} className="h-11 w-full rounded-xl border border-[#e6e6e6] px-3 font-mono text-sm outline-none focus:border-[#1a1a1a]" />
            <span className="mt-1 block text-xs text-[#a3a3a3]">Gateway for hotspot network</span>
          </label>
          <label className="block">
            <span className="mb-1 block text-xs text-[#737373]">DNS Servers</span>
            <input value={dnsServers} onChange={(event) => setDnsServers(event.target.value)} className="h-11 w-full rounded-xl border border-[#e6e6e6] px-3 font-mono text-sm outline-none focus:border-[#1a1a1a]" />
            <span className="mt-1 block text-xs text-[#a3a3a3]">DNS servers for hotspot clients</span>
          </label>
          <label className="block">
            <span className="mb-1 block text-xs text-[#737373]">Hotspot DNS / login name</span>
            <span className="flex h-11 items-center rounded-xl border border-[#e6e6e6] px-3 text-sm">
              <span className="text-[#a3a3a3]">http://</span>
              <input
                value={loginLabel}
                onChange={(event) =>
                  setLoginLabel(
                    event.target.value
                      .toLowerCase()
                      .replace(/[^a-z0-9.-]/g, "")
                      .replace(/\.{2,}/g, ".")
                      .slice(0, 48),
                  )
                }
                placeholder="wifi"
                className="mx-2 w-full bg-transparent font-mono outline-none"
              />
            </span>
            <span className="mt-1 block text-xs text-[#a3a3a3]">
              Type your own name (not the router name). Customers open http://{loginLabelFrom(loginLabel)} when they connect.
            </span>
          </label>
        </div>
        <div className="mt-4">
          <DirtyApplyBar
            dirty={hotspotDirty}
            applying={applyingHotspot}
            onApply={async () => {
              const label = loginLabelFrom(loginLabel) || "wifi";
              setApplyingHotspot(true);
              try {
                updateRouterDetails(router.ip, {
                  hotspotEnabled: hotspotOn,
                  hotspotNetwork: network.trim(),
                  hotspotGatewayIp: gateway.trim(),
                  hotspotDnsServers: dnsServers.trim(),
                  dnsName: label,
                  hotspotLoginUrl: `http://${label}`,
                });
                await fetch("/api/routers/jobs", {
                  method: "POST",
                  headers: { "Content-Type": "application/json" },
                  body: JSON.stringify({ ip: router.ip, action: "wifi" }),
                }).catch(() => {});
                setSavedHotspot({
                  hotspotOn,
                  network: network.trim(),
                  gateway: gateway.trim(),
                  dnsServers: dnsServers.trim(),
                  loginLabel: label,
                });
                showToast("Hotspot settings saved and sent to the router.");
              } finally {
                setApplyingHotspot(false);
              }
            }}
            applyLabel="Apply"
            saveLabel="Save"
            hint="Hotspot changes are ready. Apply or Save pushes them to the router."
            testId="hotspot-apply"
          />
        </div>
        <p className="mt-2 text-xs text-[#737373]">The login name and DNS servers are sent to the router on its next check-in. The network and gateway stay as this hotspot was set up.</p>
      </article>

      <article className="rounded-2xl border border-[#e6e6e6] bg-white p-5 shadow-[0_8px_24px_rgba(26,26,26,0.06)]">
        <h3 className="text-base font-bold text-[#1a1a1a]">Router Access</h3>
        <p className="mt-1 text-sm text-[#737373]">Remote access configuration</p>
        <div className="mt-4 grid gap-4 sm:grid-cols-2">
          <div>
            <p className="text-xs text-[#737373]">Connection Mode</p>
            <p className="text-sm font-semibold text-[#1a1a1a]">{router.winboxReach === "direct" ? "Public WinBox" : "WireGuard VPN"}</p>
          </div>
          <div>
            <p className="text-xs text-[#737373]">WireGuard Tunnel IP</p>
            <p className="text-sm font-semibold text-[#1a1a1a]">{router.winboxReach === "direct" ? "Not used" : router.wireguardTunnelIp || "Not assigned"}</p>
            <p className="text-xs text-[#a3a3a3]">Secure tunnel IP for management access</p>
          </div>
        </div>
        <div className="mt-4">
          <p className="text-sm font-semibold text-[#1a1a1a]">API Credentials</p>
          <p className="mt-1 font-mono text-sm text-[#1a1a1a]">Username: {router.apiUsername || "hotspotpro"}</p>
          <p className="font-mono text-sm text-[#1a1a1a]">
            Password: {router.apiPassword ? (showPassword ? router.apiPassword : "•".repeat(8)) : "Created when the router checks in"}
          </p>
          <button type="button" onClick={() => setShowPassword((current) => !current)} className="mt-1 text-xs font-semibold text-[#525252]">
            {showPassword ? "Hide password" : "Show password"}
          </button>
          <p className="mt-1 text-xs text-[#a3a3a3]">API credentials for router management. After the tunnel is up, this login answers on port 8728 inside the tunnel and on the admin port.</p>
        </div>
      </article>

      <article className="rounded-2xl border border-[#e6e6e6] bg-white p-5 shadow-[0_8px_24px_rgba(26,26,26,0.06)]">
        <h3 className="mb-4 text-base font-bold text-[#1a1a1a]">Performance Overview</h3>
        {level !== "ok" && (
          <div
            data-testid="perf-alert"
            data-level={level}
            className={`mb-4 flex items-start gap-3 rounded-xl p-3 text-sm ${level === "overload" ? "bg-[#f3f1ec] text-[#1a1a1a]" : "bg-[#f3f1ec] text-[#111111]"}`}
          >
            <AlertTriangle size={18} className="mt-0.5 shrink-0" />
            <div>
              <p className="font-bold">
                {level === "overload" ? "Router is overloaded" : "Router is under heavy load"}: {strained}
              </p>
              <p className="text-xs">
                {level === "overload"
                  ? "Above 90% the router can slow down, drop connected users, or restart on its own. Reduce connected users, add a second router, or upgrade the hardware."
                  : "Above 75% it is close to its limit. If it keeps climbing, users may see slow browsing or dropped connections."}
              </p>
            </div>
          </div>
        )}
        <div className="h-[220px]">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={perfData}>
              <CartesianGrid vertical={false} strokeDasharray="3 3" />
              <XAxis dataKey="t" hide />
              <YAxis tick={{ fontSize: 11 }} domain={[0, 100]} />
              <Tooltip />
              <ReferenceLine y={WARN_AT} stroke="#111111" strokeDasharray="4 4" label={{ value: "Warning 75%", position: "insideTopLeft", fontSize: 10, fill: "#111111" }} />
              <ReferenceLine y={OVERLOAD_AT} stroke="#1a1a1a" strokeWidth={2} label={{ value: "Overload 90%", position: "insideTopLeft", fontSize: 10, fill: "#1a1a1a" }} />
              <Line type="monotone" dataKey="cpu" stroke="#525252" strokeWidth={2} dot={dotFor("cpu")} name="CPU" />
              <Line type="monotone" dataKey="memory" stroke="#1a1a1a" strokeWidth={2} dot={dotFor("memory")} name="Memory" />
            </LineChart>
          </ResponsiveContainer>
        </div>
        <p className="mt-2 text-xs text-[#a3a3a3]">
          Red line = overload limit (90%). Dots turn amber above 75% and red above 90%.
        </p>
      </article>

      <article className="rounded-2xl border border-[#e6e6e6] bg-white p-5 shadow-[0_8px_24px_rgba(26,26,26,0.06)]">
        <h3 className="mb-4 text-base font-bold text-[#1a1a1a]">Device Information</h3>
        <div className="grid gap-4 sm:grid-cols-2">
          <div>
            <p className="text-xs text-[#737373]">RouterOS Version</p>
            <span className="inline-flex rounded-full bg-[#f4f4f4] px-2.5 py-1 text-xs font-bold text-[#111111]">{router.routerOSVersion || "Waiting"}</span>
          </div>
          <div>
            <p className="text-xs text-[#737373]">Device Name</p>
            <span className="inline-flex rounded-full bg-[#f4f4f4] px-2.5 py-1 text-xs font-bold text-[#111111]">{router.name}</span>
          </div>
          <div>
            <p className="text-xs text-[#737373]">Hardware Model</p>
            <span className="inline-flex rounded-full bg-[#f4f4f4] px-2.5 py-1 text-xs font-bold text-[#111111]">{router.hardwareModel || "Waiting"}</span>
          </div>
          <div>
            <p className="text-xs text-[#737373]">Architecture</p>
            <span className="inline-flex rounded-full bg-slate-200 px-2.5 py-1 text-xs font-bold text-slate-700">{router.architecture}</span>
          </div>
          <div>
            <p className="text-xs text-[#737373]">CPU Count</p>
            <span className="inline-flex rounded-full bg-[#f4f4f4] px-2.5 py-1 text-xs font-bold text-[#111111]">{router.cpuCount}</span>
          </div>
        </div>
      </article>

      <article className="rounded-2xl border border-[#e6e6e6] bg-white p-5 shadow-[0_8px_24px_rgba(26,26,26,0.06)]">
        <h3 className="mb-4 text-base font-bold text-[#1a1a1a]">General Information</h3>
        <div className="grid gap-4 sm:grid-cols-2">
          <div>
            <p className="text-xs text-[#737373]">Management IP</p>
            <p className="font-mono text-sm font-semibold text-[#1a1a1a]">{router.wanAddress || "192.168.88.1"}</p>
          </div>
          <div>
            <p className="text-xs text-[#737373]">Username</p>
            <span className="inline-flex rounded-full bg-[#f4f4f4] px-2.5 py-1 text-xs font-bold text-[#111111]">{router.apiUsername || "Waiting for setup"}</span>
          </div>
          <div>
            <p className="text-xs text-[#737373]">Password</p>
            <div className="flex items-center gap-2">
              <span className="font-mono text-sm text-[#1a1a1a]">
                {router.apiPassword ? (showPassword ? router.apiPassword : "•".repeat(8)) : "Created when the router finishes setup"}
              </span>
              <button type="button" onClick={() => setShowPassword((c) => !c)} className="text-[#a3a3a3] hover:text-[#525252]">
                {showPassword ? <EyeOff size={14} /> : <Eye size={14} />}
              </button>
              <button
                type="button"
                onClick={() => { navigator.clipboard?.writeText(router.apiPassword); showToast("Password copied."); }}
                className="text-[#a3a3a3] hover:text-[#525252]"
              >
                <Copy size={14} />
              </button>
            </div>
          </div>
          {router.hotspotEnabled && (
            <div data-testid="hotspot-range">
              <p className="text-xs text-[#737373]">Hotspot network</p>
              <p className="font-mono text-sm font-semibold text-[#1a1a1a]">
                {router.hotspotNetwork} <span className="text-[#737373]">(router {router.hotspotGatewayIp})</span>
              </p>
            </div>
          )}
          <div>
            <p className="text-xs text-[#737373]">API Port</p>
            <span className="inline-flex rounded-full bg-[#f4f4f4] px-2.5 py-1 text-xs font-bold text-[#111111]">{router.port || 8728}</span>
          </div>
        </div>
      </article>

      {router.hotspotEnabled && (
        <article className="rounded-2xl border border-[#e6e6e6] bg-white p-5 shadow-[0_8px_24px_rgba(26,26,26,0.06)]">
          <h3 className="text-base font-bold text-[#1a1a1a]">Customer login</h3>
          <p className="mt-1 text-sm text-[#737373]">Only one method runs at a time. The router follows this on its next check-in, about 3 seconds.</p>
          <div className="mt-4 grid gap-3 sm:grid-cols-2">
            {([
              ["cloud", "Cloud", "Unavailable here. This site has no RADIUS port."],
              ["local", "On the router", "Paid vouchers are copied onto the MikroTik."],
            ] as const).map(([id, label, detail]) => {
              const selected = (router.loginMode === "cloud" ? "cloud" : "local") === id;
              return (
                <button
                  key={id}
                  type="button"
                  onClick={() => {
                    if (id === "cloud") {
                      showToast("This site has no RADIUS port, so paid vouchers stay on the router.");
                      if ((router.loginMode ?? "cloud") !== "local") updateRouterDetails(router.ip, { loginMode: "local" });
                      return;
                    }
                    if (!selected) updateRouterDetails(router.ip, { loginMode: id });
                  }}
                  className={`rounded-xl border-2 p-4 text-left ${selected ? "border-[#1a1a1a] bg-[#f4f4f4]" : "border-[#e6e6e6]"}`}
                >
                  <span className="text-sm font-bold text-[#1a1a1a]">{label}{selected ? " · in use" : ""}</span>
                  <span className="mt-1 block text-xs text-[#737373]">{detail}</span>
                </button>
              );
            })}
          </div>
        </article>
      )}

      <article className="rounded-2xl border border-[#e6e6e6] bg-white p-5 shadow-[0_8px_24px_rgba(26,26,26,0.06)]">
        <h3 className="mb-4 text-base font-bold text-[#1a1a1a]">RADIUS Configuration</h3>
        <div className="grid gap-4 sm:grid-cols-2">
          <div>
            <p className="text-xs text-[#737373]">RADIUS Address</p>
            <span className="inline-flex rounded-full bg-[#f4f4f4] px-2.5 py-1 text-xs font-bold text-[#111111]">
              {router.radiusAddress || "Not used — vouchers stay on the router"}
            </span>
          </div>
          <div>
            <p className="text-xs text-[#737373]">Secret</p>
            <p className="font-mono text-sm text-[#1a1a1a]">{router.radiusAddress ? "••••••••" : "Not used"}</p>
          </div>
          <div>
            <p className="text-xs text-[#737373]">Accounting Port</p>
            <span className="inline-flex rounded-full bg-[#f4f4f4] px-2.5 py-1 text-xs font-bold text-[#111111]">{router.radiusAccountingPort}</span>
          </div>
          <div>
            <p className="text-xs text-[#737373]">Auth Port</p>
            <span className="inline-flex rounded-full bg-[#f4f4f4] px-2.5 py-1 text-xs font-bold text-[#111111]">{router.radiusAuthPort}</span>
          </div>
        </div>
      </article>
    </div>
  );
}
