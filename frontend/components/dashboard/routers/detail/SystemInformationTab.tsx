"use client";

// Everything shown on a router's "System Information" tab: quick stats,
// status, connection health, WinBox access + uptime chart, a CPU/memory
// performance chart, device info, general info (with password reveal), and
// RADIUS config. It only needs the router itself and how many users are
// currently connected to it — everything else is computed from that.

import { useState } from "react";
import { Eye, EyeOff, Copy, CheckCircle2, AlertTriangle } from "lucide-react";
import { Bar, BarChart, CartesianGrid, Line, LineChart, ReferenceLine, ResponsiveContainer, Tooltip, XAxis, YAxis, Cell } from "recharts";

import { useDashboard } from "@/components/dashboard/context/DashboardContext";
import type { RouterInfo } from "@/components/dashboard/data/dashboard-data";
import { seeded, buildDailyUptime } from "./chartHelpers";

const WARN_AT = 75;
const OVERLOAD_AT = 90;

export function SystemInformationTab({
  router,
  isEnabled,
  connectedUserCount,
}: {
  router: RouterInfo;
  isEnabled: boolean;
  connectedUserCount: number;
}) {
  const { showToast, updateRouterDetails } = useDashboard();
  const [showPassword, setShowPassword] = useState(false);

  // Both charts use "fake but consistent" data — see chartHelpers.ts for why.
  const dailyUptime = buildDailyUptime(router.ip, isEnabled && router.provisioningStatus === "Provisioned");
  const upDays = dailyUptime.filter((d) => d.uptime === 100).length;
  const perfData = Array.from({ length: 12 }, (_, i) => ({
    t: i,
    cpu: isEnabled ? Math.min(100, Math.max(2, Math.round(router.cpu + seeded(i, -8, 8)))) : 0,
    memory: isEnabled ? Math.min(100, Math.max(2, Math.round(router.memory + seeded(i + 50, -8, 8)))) : 0,
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
        <circle key={`${key}-${props.index}`} cx={props.cx} cy={props.cy} r={4} fill={point[key] >= OVERLOAD_AT ? "#b91c1c" : "#b45309"} stroke="#ffffff" strokeWidth={1.5} />
      );
    };

  return (
    <div className="space-y-5">
      <div className="grid gap-4 sm:grid-cols-4">
        <div className="rounded-xl border border-[#f1f5f9] p-4">
          <p className="text-xs text-[#64748b]">CPU Usage</p>
          <p className="text-xl font-black text-[#0f172a]">{router.cpu}%</p>
        </div>
        <div className="rounded-xl border border-[#f1f5f9] p-4">
          <p className="text-xs text-[#64748b]">Memory Usage</p>
          <p className="text-xl font-black text-[#0f172a]">{router.memory}%</p>
        </div>
        <div className="rounded-xl border border-[#f1f5f9] p-4">
          <p className="text-xs text-[#64748b]">Active Users</p>
          <p className="text-xl font-black text-[#0f172a]">{connectedUserCount}</p>
        </div>
        <div className="rounded-xl border border-[#f1f5f9] p-4">
          <p className="text-xs text-[#64748b]">Router Status</p>
          <p className={`text-xl font-black ${isEnabled ? "text-[#2563eb]" : "text-red-600"}`}>
            {isEnabled ? "Online" : "Offline"}
          </p>
        </div>
      </div>

      <article className="rounded-2xl border border-[#e2e8f0] bg-white p-5 shadow-[0_8px_24px_rgba(37,99,235,0.06)]">
        <h3 className="mb-4 text-base font-bold text-[#0f172a]">Status</h3>
        <div className="grid gap-4 sm:grid-cols-2">
          <div>
            <p className="text-xs text-[#64748b]">Status</p>
            <span className={`inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-xs font-bold ${router.lastError ? "bg-red-100 text-red-700" : "bg-[#f1f5f9] text-[#1d4ed8]"}`}>
              {router.lastError ? "error" : "active"}
            </span>
          </div>
          <div>
            <p className="text-xs text-[#64748b]">Provisioning</p>
            <span className={`inline-flex rounded-full px-2.5 py-1 text-xs font-bold ${
              router.provisioningStatus === "Provisioned" ? "bg-[#f1f5f9] text-[#1d4ed8]" : "bg-[#f1f5f9] text-[#1d4ed8]"
            }`}>
              {router.provisioningStatus}
            </span>
          </div>
          <div>
            <p className="text-xs text-[#64748b]">Last Connected</p>
            <p className="text-sm font-semibold text-[#0f172a]">{router.lastConnectedAt ?? "Never"}</p>
          </div>
          {router.lastError && (
            <div>
              <p className="text-xs text-[#64748b]">Last Error</p>
              <p className="text-sm font-semibold text-red-600">{router.lastError}</p>
            </div>
          )}
        </div>
      </article>

      <article data-testid="router-config-status" className="rounded-2xl border border-[#e2e8f0] bg-white p-5 shadow-[0_8px_24px_rgba(37,99,235,0.06)]">
        <h3 className="mb-4 text-base font-bold text-[#0f172a]">Configuration</h3>
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
            <div key={label as string} data-testid="router-config-row" className="flex items-center justify-between gap-3 rounded-lg bg-[#f8fafc] px-3 py-2">
              <span className="text-sm text-[#475569]">{label}</span>
              <span className={`text-sm font-semibold ${value ? "text-[#0f172a]" : "text-[#94a3b8]"}`}>{value ?? "Not yet"}</span>
            </div>
          ))}
        </div>
      </article>

      <article data-testid="router-activity" className="rounded-2xl border border-[#e2e8f0] bg-white p-5 shadow-[0_8px_24px_rgba(37,99,235,0.06)]">
        <h3 className="mb-4 text-base font-bold text-[#0f172a]">Recent activity on this router</h3>
        {(router.activity ?? []).length === 0 ? (
          <p className="text-sm text-[#94a3b8]">Nothing yet. Actions you run on this router appear here.</p>
        ) : (
          <ul className="space-y-2">
            {(router.activity ?? []).slice(0, 10).map((entry, index) => (
              <li key={`${entry.at}-${index}`} className="flex items-start justify-between gap-3 text-sm">
                <span className="text-[#0f172a]">{entry.text}</span>
                <span className="shrink-0 text-xs text-[#94a3b8]">{entry.at}</span>
              </li>
            ))}
          </ul>
        )}
      </article>

      <article className="rounded-2xl border border-[#e2e8f0] bg-white p-5 shadow-[0_8px_24px_rgba(37,99,235,0.06)]">
        <h3 className="mb-4 text-base font-bold text-[#0f172a]">Connection Health</h3>
        <div className="grid gap-4 sm:grid-cols-2">
          <div>
            <p className="text-xs text-[#64748b]">Mode</p>
            <span className="inline-flex items-center gap-1 rounded-full bg-[#f1f5f9] px-2.5 py-1 text-xs font-bold text-[#1d4ed8]">
              {router.connectionMode}
            </span>
          </div>
          <div>
            <p className="text-xs text-[#64748b]">Health</p>
            <span className={`inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-xs font-bold ${
              router.health === "ok" ? "bg-[#f1f5f9] text-[#1d4ed8]" : router.health === "checking" ? "bg-[#f1f5f9] text-[#1d4ed8]" : "bg-red-100 text-red-700"
            }`}>
              {router.health === "ok" ? <CheckCircle2 size={12} /> : null} {router.health === "ok" ? "OK" : router.health === "checking" ? "Checking" : "Error"}
            </span>
          </div>
        </div>
      </article>

      <article className="rounded-2xl border border-[#e2e8f0] bg-white p-5 shadow-[0_8px_24px_rgba(37,99,235,0.06)]">
        <h3 className="mb-4 text-base font-bold text-[#0f172a]">Remote WinBox Access</h3>
        <div className="mb-5 grid gap-4 sm:grid-cols-2">
          <div>
            <p className="text-xs text-[#64748b]">Status</p>
            <span className={`inline-flex rounded-full px-2.5 py-1 text-xs font-bold ${router.remoteAccessEnabled ? "bg-[#f1f5f9] text-[#1d4ed8]" : "bg-slate-200 text-slate-700"}`}>
              {router.remoteAccessEnabled ? "Enabled" : "Disabled"}
            </span>
          </div>
          <div>
            <p className="text-xs text-[#64748b]">WinBox Address</p>
            <p className="font-mono text-sm font-semibold text-[#1d4ed8]">{router.winboxAddress || "—"}</p>
          </div>
        </div>
        {router.winboxAddress && (
          <p className="mb-5 text-xs text-[#64748b]">
            Open WinBox → Connect to: <span className="font-mono">{router.winboxAddress}</span> → Use router credentials
          </p>
        )}

        <div className="grid gap-4 sm:grid-cols-3">
          <div className="rounded-xl border border-[#f1f5f9] p-4">
            <p className="text-xs text-[#64748b]">30-Day Uptime</p>
            <p className="text-xl font-black text-[#0f172a]">{router.uptime30Day !== null ? `${router.uptime30Day}%` : "No data"}</p>
          </div>
          <div className="rounded-xl border border-[#f1f5f9] p-4">
            <p className="text-xs text-[#64748b]">7-Day Uptime</p>
            <p className="text-xl font-black text-[#0f172a]">{router.uptime7Day !== null ? `${router.uptime7Day}%` : "No data"}</p>
          </div>
          <div className="rounded-xl border border-[#f1f5f9] p-4">
            <p className="text-xs text-[#64748b]">Current Uptime</p>
            <p className={`text-xl font-black ${isEnabled ? "text-[#2563eb]" : "text-red-600"}`}>{isEnabled ? router.uptime : "Unknown"}</p>
          </div>
        </div>

        <div className="mt-5">
          <p className="mb-2 text-sm font-bold text-[#0f172a]">Daily Uptime (Last 9 Days)</p>
          <div className="h-[220px]">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={dailyUptime}>
                <XAxis dataKey="day" tick={{ fontSize: 11 }} />
                <YAxis hide domain={[0, 100]} />
                <Bar dataKey="uptime" radius={[6, 6, 0, 0]}>
                  {dailyUptime.map((entry, index) => (
                    <Cell key={index} fill={entry.uptime === 100 ? "#2563eb" : "#b91c1c"} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
          <p className="mt-1 text-xs text-[#94a3b8]">{upDays} of 9 days fully up</p>
        </div>
      </article>

      <article className="rounded-2xl border border-[#e2e8f0] bg-white p-5 shadow-[0_8px_24px_rgba(37,99,235,0.06)]">
        <h3 className="mb-4 text-base font-bold text-[#0f172a]">Performance Overview</h3>
        {level !== "ok" && (
          <div
            data-testid="perf-alert"
            data-level={level}
            className={`mb-4 flex items-start gap-3 rounded-xl p-3 text-sm ${level === "overload" ? "bg-[#fef2f2] text-[#b91c1c]" : "bg-[#fffbeb] text-[#92400e]"}`}
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
              <ReferenceLine y={WARN_AT} stroke="#b45309" strokeDasharray="4 4" label={{ value: "Warning 75%", position: "insideTopLeft", fontSize: 10, fill: "#b45309" }} />
              <ReferenceLine y={OVERLOAD_AT} stroke="#b91c1c" strokeWidth={2} label={{ value: "Overload 90%", position: "insideTopLeft", fontSize: 10, fill: "#b91c1c" }} />
              <Line type="monotone" dataKey="cpu" stroke="#475569" strokeWidth={2} dot={dotFor("cpu")} name="CPU" />
              <Line type="monotone" dataKey="memory" stroke="#2563eb" strokeWidth={2} dot={dotFor("memory")} name="Memory" />
            </LineChart>
          </ResponsiveContainer>
        </div>
        <p className="mt-2 text-xs text-[#94a3b8]">
          Red line = overload limit (90%). Dots turn amber above 75% and red above 90%.
        </p>
      </article>

      <article className="rounded-2xl border border-[#e2e8f0] bg-white p-5 shadow-[0_8px_24px_rgba(37,99,235,0.06)]">
        <h3 className="mb-4 text-base font-bold text-[#0f172a]">Device Information</h3>
        <div className="grid gap-4 sm:grid-cols-2">
          <div>
            <p className="text-xs text-[#64748b]">RouterOS Version</p>
            <span className="inline-flex rounded-full bg-[#f1f5f9] px-2.5 py-1 text-xs font-bold text-[#1d4ed8]">{router.routerOSVersion}</span>
          </div>
          <div>
            <p className="text-xs text-[#64748b]">Hardware Model</p>
            <span className="inline-flex rounded-full bg-[#f1f5f9] px-2.5 py-1 text-xs font-bold text-[#1d4ed8]">{router.hardwareModel}</span>
          </div>
          <div>
            <p className="text-xs text-[#64748b]">Architecture</p>
            <span className="inline-flex rounded-full bg-slate-200 px-2.5 py-1 text-xs font-bold text-slate-700">{router.architecture}</span>
          </div>
          <div>
            <p className="text-xs text-[#64748b]">CPU Count</p>
            <span className="inline-flex rounded-full bg-[#f1f5f9] px-2.5 py-1 text-xs font-bold text-[#1d4ed8]">{router.cpuCount}</span>
          </div>
        </div>
      </article>

      <article className="rounded-2xl border border-[#e2e8f0] bg-white p-5 shadow-[0_8px_24px_rgba(37,99,235,0.06)]">
        <h3 className="mb-4 text-base font-bold text-[#0f172a]">General Information</h3>
        <div className="grid gap-4 sm:grid-cols-2">
          <div>
            <p className="text-xs text-[#64748b]">Management IP</p>
            <p className="font-mono text-sm font-semibold text-[#0f172a]">{router.ip.startsWith("pending-") ? "Not assigned" : router.ip}</p>
          </div>
          <div>
            <p className="text-xs text-[#64748b]">Username</p>
            <span className="inline-flex rounded-full bg-[#f1f5f9] px-2.5 py-1 text-xs font-bold text-[#1d4ed8]">{router.apiUsername}</span>
          </div>
          <div>
            <p className="text-xs text-[#64748b]">Password</p>
            <div className="flex items-center gap-2">
              <span className="font-mono text-sm text-[#0f172a]">
                {showPassword ? router.apiPassword : "•".repeat(8)}
              </span>
              <button type="button" onClick={() => setShowPassword((c) => !c)} className="text-[#94a3b8] hover:text-[#475569]">
                {showPassword ? <EyeOff size={14} /> : <Eye size={14} />}
              </button>
              <button
                type="button"
                onClick={() => { navigator.clipboard?.writeText(router.apiPassword); showToast("Password copied."); }}
                className="text-[#94a3b8] hover:text-[#475569]"
              >
                <Copy size={14} />
              </button>
            </div>
          </div>
          {router.hotspotEnabled && (
            <div data-testid="hotspot-range">
              <p className="text-xs text-[#64748b]">Hotspot network</p>
              <p className="font-mono text-sm font-semibold text-[#0f172a]">
                {router.hotspotNetwork} <span className="text-[#64748b]">(router {router.hotspotGatewayIp})</span>
              </p>
            </div>
          )}
          <div>
            <p className="text-xs text-[#64748b]">API Port</p>
            <span className="inline-flex rounded-full bg-[#f1f5f9] px-2.5 py-1 text-xs font-bold text-[#1d4ed8]">{router.port}</span>
          </div>
        </div>
      </article>

      {router.hotspotEnabled && (
        <article className="rounded-2xl border border-[#e2e8f0] bg-white p-5 shadow-[0_8px_24px_rgba(37,99,235,0.06)]">
          <h3 className="text-base font-bold text-[#0f172a]">Customer login</h3>
          <p className="mt-1 text-sm text-[#64748b]">Only one method runs at a time. The router follows this on its next check-in, about 30 seconds.</p>
          <div className="mt-4 grid gap-3 sm:grid-cols-2">
            {([
              ["cloud", "Cloud", "Logins are checked on HotspotPro."],
              ["local", "On the router", "Vouchers stay on the MikroTik."],
            ] as const).map(([id, label, detail]) => {
              const selected = (router.loginMode ?? "cloud") === id;
              return (
                <button
                  key={id}
                  type="button"
                  onClick={() => {
                    if (!selected) updateRouterDetails(router.ip, { loginMode: id });
                  }}
                  className={`rounded-xl border-2 p-4 text-left ${selected ? "border-[#2563eb] bg-[#f1f5f9]" : "border-[#e2e8f0]"}`}
                >
                  <span className="text-sm font-bold text-[#0f172a]">{label}{selected ? " · in use" : ""}</span>
                  <span className="mt-1 block text-xs text-[#64748b]">{detail}</span>
                </button>
              );
            })}
          </div>
        </article>
      )}

      <article className="rounded-2xl border border-[#e2e8f0] bg-white p-5 shadow-[0_8px_24px_rgba(37,99,235,0.06)]">
        <h3 className="mb-4 text-base font-bold text-[#0f172a]">RADIUS Configuration</h3>
        <div className="grid gap-4 sm:grid-cols-2">
          <div>
            <p className="text-xs text-[#64748b]">RADIUS Address</p>
            <span className="inline-flex rounded-full bg-[#f1f5f9] px-2.5 py-1 text-xs font-bold text-[#1d4ed8]">
              {router.radiusAddress ?? "Not configured"}
            </span>
          </div>
          <div>
            <p className="text-xs text-[#64748b]">Secret</p>
            <p className="font-mono text-sm text-[#0f172a]">{router.radiusSecret}</p>
          </div>
          <div>
            <p className="text-xs text-[#64748b]">Accounting Port</p>
            <span className="inline-flex rounded-full bg-[#f1f5f9] px-2.5 py-1 text-xs font-bold text-[#1d4ed8]">{router.radiusAccountingPort}</span>
          </div>
          <div>
            <p className="text-xs text-[#64748b]">Auth Port</p>
            <span className="inline-flex rounded-full bg-[#f1f5f9] px-2.5 py-1 text-xs font-bold text-[#1d4ed8]">{router.radiusAuthPort}</span>
          </div>
        </div>
      </article>
    </div>
  );
}
