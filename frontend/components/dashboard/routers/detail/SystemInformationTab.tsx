"use client";

// Everything shown on a router's "System Information" tab: quick stats,
// status, connection health, WinBox access + uptime chart, a CPU/memory
// performance chart, device info, general info (with password reveal), and
// RADIUS config. It only needs the router itself and how many users are
// currently connected to it — everything else is computed from that.

import { useState } from "react";
import { Eye, EyeOff, Copy, CheckCircle2, AlertTriangle } from "lucide-react";
import { CartesianGrid, Line, LineChart, ReferenceLine, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";

import { useDashboard } from "@/components/dashboard/context/DashboardContext";
import type { RouterInfo } from "@/components/dashboard/data/dashboard-data";

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
          <p className={`text-xl font-black ${isEnabled ? "text-[#1a1a1a]" : "text-red-600"}`}>
            {isEnabled ? "Online" : "Offline"}
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
        </div>
      </article>

      <article className="rounded-2xl border border-[#e6e6e6] bg-white p-5 shadow-[0_8px_24px_rgba(26,26,26,0.06)]">
        <h3 className="mb-4 text-base font-bold text-[#1a1a1a]">Remote WinBox Access</h3>
        <div className="mb-5 grid gap-4 sm:grid-cols-2">
          <div>
            <p className="text-xs text-[#737373]">Status</p>
            <span className={`inline-flex rounded-full px-2.5 py-1 text-xs font-bold ${router.remoteAccessEnabled ? "bg-[#f4f4f4] text-[#111111]" : "bg-slate-200 text-slate-700"}`}>
              {router.remoteAccessEnabled ? "Enabled" : "Disabled"}
            </span>
          </div>
          <div>
            <p className="text-xs text-[#737373]">WinBox Address</p>
            <p className="font-mono text-sm font-semibold text-[#111111]">{router.winboxAddress || "—"}</p>
          </div>
        </div>
        {router.winboxAddress && (
          <p className="mb-5 text-xs text-[#737373]">
            Open WinBox → Connect to: <span className="font-mono">{router.winboxAddress}</span> → Use router credentials
          </p>
        )}

        <div className="grid gap-4 sm:grid-cols-3">
          <div className="rounded-xl border border-[#f4f4f4] p-4">
            <p className="text-xs text-[#737373]">30-Day Uptime</p>
            <p className="text-xl font-black text-[#1a1a1a]">{router.uptime30Day !== null ? `${router.uptime30Day}%` : "No data"}</p>
          </div>
          <div className="rounded-xl border border-[#f4f4f4] p-4">
            <p className="text-xs text-[#737373]">7-Day Uptime</p>
            <p className="text-xl font-black text-[#1a1a1a]">{router.uptime7Day !== null ? `${router.uptime7Day}%` : "No data"}</p>
          </div>
          <div className="rounded-xl border border-[#f4f4f4] p-4">
            <p className="text-xs text-[#737373]">Current Uptime</p>
            <p className={`text-xl font-black ${isEnabled ? "text-[#1a1a1a]" : "text-red-600"}`}>{isEnabled ? router.uptime : "Unknown"}</p>
          </div>
        </div>

        <p className="mt-5 text-sm text-[#525252]">Uptime last reported by the router: <span className="font-bold text-[#1a1a1a]">{router.uptime || "waiting for the next check-in"}</span></p>
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
            <span className="inline-flex rounded-full bg-[#f4f4f4] px-2.5 py-1 text-xs font-bold text-[#111111]">{router.routerOSVersion}</span>
          </div>
          <div>
            <p className="text-xs text-[#737373]">Hardware Model</p>
            <span className="inline-flex rounded-full bg-[#f4f4f4] px-2.5 py-1 text-xs font-bold text-[#111111]">{router.hardwareModel}</span>
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
            <p className="font-mono text-sm font-semibold text-[#1a1a1a]">{router.ip.startsWith("pending-") ? "Not assigned" : router.ip}</p>
          </div>
          <div>
            <p className="text-xs text-[#737373]">Username</p>
            <span className="inline-flex rounded-full bg-[#f4f4f4] px-2.5 py-1 text-xs font-bold text-[#111111]">{router.apiUsername}</span>
          </div>
          <div>
            <p className="text-xs text-[#737373]">Password</p>
            <div className="flex items-center gap-2">
              <span className="font-mono text-sm text-[#1a1a1a]">
                {showPassword ? router.apiPassword : "•".repeat(8)}
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
            <span className="inline-flex rounded-full bg-[#f4f4f4] px-2.5 py-1 text-xs font-bold text-[#111111]">{router.port}</span>
          </div>
        </div>
      </article>

      {router.hotspotEnabled && (
        <article className="rounded-2xl border border-[#e6e6e6] bg-white p-5 shadow-[0_8px_24px_rgba(26,26,26,0.06)]">
          <h3 className="text-base font-bold text-[#1a1a1a]">Customer login</h3>
          <p className="mt-1 text-sm text-[#737373]">Only one method runs at a time. The router follows this on its next check-in, about 30 seconds.</p>
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
            <p className="font-mono text-sm text-[#1a1a1a]">{router.radiusSecret}</p>
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
