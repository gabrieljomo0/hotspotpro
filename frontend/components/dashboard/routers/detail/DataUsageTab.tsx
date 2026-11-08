"use client";

// This router's Data Usage tab: everything about the data that went through
// THIS router — live speed and who is online right now, how much was used
// today / this week / this month / ever, charts, busiest hours, top users,
// usage by package and recent sessions.
//
// The numbers come from the accounting the router itself reports to the
// HotspotPro server (see backend/src/server/routerUsage.ts), refreshed every few seconds.
// With a real router that report arrives every minute per customer, so the
// "live" speed is the average over the last minute, not an instant reading.

import { useEffect, useMemo, useState, type ReactNode } from "react";
import {
  Bar, BarChart, CartesianGrid, Legend, ResponsiveContainer, Tooltip, XAxis, YAxis,
} from "recharts";
import { ArrowDown, ArrowUp, Clock, Database, FlaskConical, Link2, Radio, Trash2, Users } from "lucide-react";

import type { RouterInfo } from "@/components/dashboard/data/dashboard-data";
import { useRouterUsage } from "./useRouterUsage";
import {
  ago, dailySeries, fmtBytes, fmtDuration, fmtRate, hourlySeries, peakHours, periodTotals,
} from "./routerUsageMath";

const DOWN = "#1a1a1a";
const UP = "#f3f1ec";
const card = "rounded-2xl border border-[#e6e6e6] bg-white p-5 shadow-[0_8px_24px_rgba(26,26,26,0.06)]";

type Range = "24h" | "7d" | "30d";
const RANGES: { id: Range; label: string }[] = [
  { id: "24h", label: "Last 24 hours" },
  { id: "7d", label: "Last 7 days" },
  { id: "30d", label: "Last 30 days" },
];

function Stat({ label, value, sub, icon }: { label: string; value: string; sub?: string; icon?: ReactNode }) {
  return (
    <div className="rounded-xl border border-[#e6e6e6] bg-white p-4">
      <p className="flex items-center gap-1.5 text-xs font-semibold text-[#737373]">{icon}{label}</p>
      <p className="mt-1 text-xl font-black text-[#1a1a1a]">{value}</p>
      {sub && <p className="mt-0.5 text-xs text-[#a3a3a3]">{sub}</p>}
    </div>
  );
}

const split = (down: number, up: number) => `↓ ${fmtBytes(down)}   ↑ ${fmtBytes(up)}`;

export function DataUsageTab({ router }: { router: RouterInfo }) {
  const { data, error, busy, act } = useRouterUsage(router.ip);
  const [range, setRange] = useState<Range>("24h");
  const [tick, setTick] = useState(() => Date.now());

  // Clock for the "online for 12m 04s" counters and the "updated 3s ago" label.
  useEffect(() => {
    const id = window.setInterval(() => setTick(Date.now()), 1000);
    return () => window.clearInterval(id);
  }, []);

  const hours = data?.hours;
  const nowMs = data?.now ?? tick;
  const periods = useMemo(() => periodTotals(hours ?? [], nowMs), [hours, nowMs]);
  const series = useMemo(() => {
    const h = hours ?? [];
    return range === "24h" ? hourlySeries(h, nowMs) : dailySeries(h, nowMs, range === "7d" ? 7 : 30);
  }, [hours, nowMs, range]);
  const peaks = useMemo(() => peakHours(hours ?? [], nowMs), [hours, nowMs]);
  const busiest = peaks.reduce((best, p) => (p.bytes > best.bytes ? p : best), peaks[0] ?? { label: "—", bytes: 0, sessions: 0 });

  if (!data) {
    return (
      <div className={card}>
        <p className="text-sm text-[#737373]">{error ?? "Loading this router's data usage…"}</p>
      </div>
    );
  }

  const lastAgo = data.lastAccountingAt ? tick - Date.parse(data.lastAccountingAt) : null;
  const live = data.live;
  const totalAll = data.allTime.down + data.allTime.up;
  const maxPackage = Math.max(1, ...data.byPackage.map((p) => p.down + p.up));
  const maxUser = Math.max(1, ...data.topUsers.map((u) => u.down + u.up));
  const tooltipStyle = { borderRadius: 10, border: "1px solid #e6e6e6", fontSize: 12 };

  return (
    <div className="space-y-5" data-testid="router-data-usage">
      {error && <p className="rounded-lg bg-[#f3f1ec] px-4 py-2.5 text-sm text-[#1a1a1a]">{error}</p>}

      {/* status line */}
      <div className="flex flex-wrap items-center gap-3">
        <span className={`inline-flex items-center gap-2 rounded-full px-3 py-1 text-xs font-bold ${live.fresh ? "bg-[#f3f1ec] text-[#111111]" : "bg-[#f4f4f4] text-[#737373]"}`}>
          <span className="relative flex h-2 w-2">
            {live.fresh && <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-[#1a1a1a] opacity-75" />}
            <span className={`relative inline-flex h-2 w-2 rounded-full ${live.fresh ? "bg-[#1a1a1a]" : "bg-[#a3a3a3]"}`} />
          </span>
          {live.fresh ? "Live" : data.linked ? "Idle — nobody online" : "Waiting for the router's first report"}
        </span>
        <span className="text-xs text-[#a3a3a3]">
          {lastAgo !== null ? `Last report from the router ${ago(lastAgo)}` : "No report from this router yet"} · refreshes every 5 seconds
        </span>
        {data.simulating && (
          <span className="rounded-full bg-[#f3f1ec] px-3 py-1 text-xs font-bold text-[#111111]">Showing SAMPLE traffic (test)</span>
        )}
      </div>

      {/* live now */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Stat label="Download now" value={fmtRate(live.downBytesPerSec)} sub="all customers on this router" icon={<ArrowDown size={13} className="text-[#1a1a1a]" />} />
        <Stat label="Upload now" value={fmtRate(live.upBytesPerSec)} sub="all customers on this router" icon={<ArrowUp size={13} className="text-[#1a1a1a]" />} />
        <Stat label="Customers online" value={String(live.online)} sub={`${fmtBytes(live.sessionDown + live.sessionUp)} used in their current sessions`} icon={<Users size={13} />} />
        <Stat label="Average session" value={data.avgSessionSeconds ? fmtDuration(data.avgSessionSeconds) : "—"} sub={`${data.sessions30d} session${data.sessions30d === 1 ? "" : "s"} in the last 30 days`} icon={<Clock size={13} />} />
      </div>

      {/* totals */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {[
          { label: "Today", t: periods.today },
          { label: "This week", t: periods.week },
          { label: "This month", t: periods.month },
          { label: "All time", t: { down: data.allTime.down, up: data.allTime.up, total: totalAll, starts: 0 } },
        ].map(({ label, t }) => (
          <Stat key={label} label={`Data used — ${label}`} value={fmtBytes(t.total)} sub={split(t.down, t.up)} icon={<Database size={13} />} />
        ))}
      </div>

      {/* usage over time */}
      <article className={card}>
        <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
          <div>
            <h3 className="text-base font-bold text-[#1a1a1a]">Data used over time</h3>
            <p className="text-xs text-[#a3a3a3]">Download and upload through this router, in your local time.</p>
          </div>
          <div className="flex gap-1 rounded-lg bg-[#f4f4f4] p-1">
            {RANGES.map((r) => (
              <button
                key={r.id}
                type="button"
                onClick={() => setRange(r.id)}
                className={`rounded-md px-3 py-1.5 text-xs font-semibold ${range === r.id ? "bg-white text-[#1a1a1a] shadow-sm" : "text-[#737373] hover:text-[#1a1a1a]"}`}
              >
                {r.label}
              </button>
            ))}
          </div>
        </div>
        <div className="h-[260px]">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={series} margin={{ left: 0, right: 8, top: 4 }}>
              <CartesianGrid vertical={false} stroke="#e6e6e6" strokeDasharray="3 3" />
              <XAxis dataKey="label" tick={{ fontSize: 10, fill: "#737373" }} interval="preserveStartEnd" minTickGap={14} />
              <YAxis tick={{ fontSize: 10, fill: "#737373" }} tickFormatter={(v: number) => fmtBytes(v)} width={64} />
              <Tooltip contentStyle={tooltipStyle} formatter={(v) => fmtBytes(Number(v))} cursor={{ fill: "#f4f4f4" }} />
              <Legend wrapperStyle={{ fontSize: 12 }} />
              <Bar dataKey="down" name="Download" stackId="u" fill={DOWN} />
              <Bar dataKey="up" name="Upload" stackId="u" fill={UP} radius={[3, 3, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </article>

      {/* customers online now */}
      <article className={card}>
        <p className="mb-3 flex items-center gap-2 text-sm font-bold text-[#1a1a1a]">
          <Radio size={16} className="text-[#1a1a1a]" />
          Online now on this router ({data.online.length})
        </p>
        {data.online.length === 0 ? (
          <p className="text-sm text-[#a3a3a3]">Nobody is connected through this router right now.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[760px] text-left text-sm">
              <thead>
                <tr className="text-xs text-[#737373]">
                  {["Voucher / user", "Package", "Device", "Online for", "Download", "Upload", "Speed now", "Data left"].map((h) => (
                    <th key={h} className="whitespace-nowrap px-3 py-2 font-semibold">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {data.online.map((s) => {
                  const fresh = tick - Date.parse(s.updatedAt) < 3 * 60 * 1000;
                  const seconds = s.seconds + (fresh ? Math.max(0, (tick - Date.parse(s.updatedAt)) / 1000) : 0);
                  return (
                    <tr key={s.id} className="border-t border-[#f4f4f4]">
                      <td className="px-3 py-2.5 font-semibold text-[#1a1a1a]">{s.username}{s.phone && <span className="ml-2 text-xs font-normal text-[#a3a3a3]">{s.phone}</span>}</td>
                      <td className="px-3 py-2.5 text-[#525252]">{s.package}</td>
                      <td className="px-3 py-2.5 text-xs text-[#737373]">{s.mac || "—"}{s.ip && <span className="block text-[#a3a3a3]">{s.ip}</span>}</td>
                      <td className="whitespace-nowrap px-3 py-2.5 text-[#525252]">{fmtDuration(seconds)}</td>
                      <td className="whitespace-nowrap px-3 py-2.5 text-[#1a1a1a]">{fmtBytes(s.down)}</td>
                      <td className="whitespace-nowrap px-3 py-2.5 text-[#1a1a1a]">{fmtBytes(s.up)}</td>
                      <td className="whitespace-nowrap px-3 py-2.5 text-xs text-[#525252]">↓ {fmtRate(s.rateDown)}<span className="block">↑ {fmtRate(s.rateUp)}</span></td>
                      <td className="whitespace-nowrap px-3 py-2.5 text-[#525252]">{s.dataLeft === null ? "Unlimited" : fmtBytes(s.dataLeft)}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </article>

      <div className="grid gap-5 lg:grid-cols-2">
        {/* peak hours */}
        <article className={card}>
          <h3 className="text-base font-bold text-[#1a1a1a]">Busiest hours</h3>
          <p className="mb-4 text-xs text-[#a3a3a3]">
            Data by hour of the day, last 7 days{busiest.bytes > 0 ? ` — busiest around ${busiest.label} (${fmtBytes(busiest.bytes)})` : ""}.
          </p>
          <div className="h-[200px]">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={peaks}>
                <CartesianGrid vertical={false} stroke="#e6e6e6" strokeDasharray="3 3" />
                <XAxis dataKey="label" tick={{ fontSize: 10, fill: "#737373" }} interval={2} />
                <YAxis tick={{ fontSize: 10, fill: "#737373" }} tickFormatter={(v: number) => fmtBytes(v)} width={64} />
                <Tooltip contentStyle={tooltipStyle} formatter={(v) => fmtBytes(Number(v))} cursor={{ fill: "#f4f4f4" }} />
                <Bar dataKey="bytes" name="Data" fill={DOWN} radius={[3, 3, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </article>

        {/* by package */}
        <article className={card}>
          <h3 className="text-base font-bold text-[#1a1a1a]">Usage by package</h3>
          <p className="mb-4 text-xs text-[#a3a3a3]">Last 30 days of sessions on this router.</p>
          {data.byPackage.length === 0 ? (
            <p className="text-sm text-[#a3a3a3]">No sessions yet.</p>
          ) : (
            <div className="space-y-3">
              {data.byPackage.map((p) => (
                <div key={p.name}>
                  <div className="mb-1 flex justify-between text-sm">
                    <span className="font-semibold text-[#1a1a1a]">{p.name}</span>
                    <span className="text-[#525252]">{fmtBytes(p.down + p.up)} · {p.sessions} session{p.sessions === 1 ? "" : "s"}</span>
                  </div>
                  <div className="h-2 rounded-full bg-[#f4f4f4]">
                    <div className="h-2 rounded-full bg-[#1a1a1a]" style={{ width: `${Math.max(2, ((p.down + p.up) / maxPackage) * 100)}%` }} />
                  </div>
                </div>
              ))}
            </div>
          )}
        </article>
      </div>

      {/* top users */}
      <article className={card}>
        <h3 className="mb-1 text-base font-bold text-[#1a1a1a]">Top users (last 30 days)</h3>
        <p className="mb-3 text-xs text-[#a3a3a3]">Who used the most data through this router.</p>
        {data.topUsers.length === 0 ? (
          <p className="text-sm text-[#a3a3a3]">No users yet.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[620px] text-left text-sm">
              <thead>
                <tr className="text-xs text-[#737373]">
                  {["Voucher / user", "Package", "Sessions", "Download", "Upload", "Total", "Last seen"].map((h) => (
                    <th key={h} className="whitespace-nowrap px-3 py-2 font-semibold">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {data.topUsers.map((u) => (
                  <tr key={u.username} className="border-t border-[#f4f4f4]">
                    <td className="px-3 py-2.5 font-semibold text-[#1a1a1a]">{u.username}{u.phone && <span className="ml-2 text-xs font-normal text-[#a3a3a3]">{u.phone}</span>}</td>
                    <td className="px-3 py-2.5 text-[#525252]">{u.package}</td>
                    <td className="px-3 py-2.5 text-[#525252]">{u.sessions}</td>
                    <td className="whitespace-nowrap px-3 py-2.5">{fmtBytes(u.down)}</td>
                    <td className="whitespace-nowrap px-3 py-2.5">{fmtBytes(u.up)}</td>
                    <td className="px-3 py-2.5">
                      <span className="font-semibold text-[#1a1a1a]">{fmtBytes(u.down + u.up)}</span>
                      <div className="mt-1 h-1.5 w-24 rounded-full bg-[#f4f4f4]"><div className="h-1.5 rounded-full bg-[#1a1a1a]" style={{ width: `${((u.down + u.up) / maxUser) * 100}%` }} /></div>
                    </td>
                    <td className="whitespace-nowrap px-3 py-2.5 text-xs text-[#737373]">{ago(tick - Date.parse(u.lastSeen))}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </article>

      {/* recent sessions */}
      <article className={card}>
        <h3 className="mb-3 text-base font-bold text-[#1a1a1a]">Recent sessions</h3>
        {data.recent.length === 0 ? (
          <p className="text-sm text-[#a3a3a3]">No sessions yet.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[620px] text-left text-sm">
              <thead>
                <tr className="text-xs text-[#737373]">
                  {["Voucher / user", "Package", "Started", "Length", "Download", "Upload", "Status"].map((h) => (
                    <th key={h} className="whitespace-nowrap px-3 py-2 font-semibold">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {data.recent.map((s) => (
                  <tr key={s.id} className="border-t border-[#f4f4f4]">
                    <td className="px-3 py-2.5 font-semibold text-[#1a1a1a]">{s.username}</td>
                    <td className="px-3 py-2.5 text-[#525252]">{s.package}</td>
                    <td className="whitespace-nowrap px-3 py-2.5 text-xs text-[#737373]">{new Date(s.startedAt).toLocaleString([], { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" })}</td>
                    <td className="whitespace-nowrap px-3 py-2.5 text-[#525252]">{fmtDuration(s.seconds)}</td>
                    <td className="whitespace-nowrap px-3 py-2.5">{fmtBytes(s.down)}</td>
                    <td className="whitespace-nowrap px-3 py-2.5">{fmtBytes(s.up)}</td>
                    <td className="px-3 py-2.5">
                      <span className={`rounded-full px-2 py-0.5 text-xs font-bold ${s.ended ? "bg-[#f4f4f4] text-[#737373]" : "bg-[#f3f1ec] text-[#111111]"}`}>{s.ended ? "Ended" : "Online"}</span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </article>

      {/* where the numbers come from + test tools */}
      <article className={card}>
        <h3 className="mb-1 text-base font-bold text-[#1a1a1a]">Where these numbers come from</h3>
        <p className="text-sm text-[#525252]">
          The router reports each customer&apos;s data to this server (RADIUS accounting) when they connect, every minute while they are online, and when they leave.
          Nothing shows here until a customer has connected through this router. Speeds are the average over the last minute.
        </p>

        {!data.linked && data.unlinked.length > 0 && (
          <div className="mt-4 rounded-lg bg-[#f3f1ec] p-4 text-sm text-[#111111]">
            <p className="font-semibold">Reports are arriving from a router that isn&apos;t matched to any router in the app.</p>
            <p className="mt-1 text-xs">Is one of these this router ({router.name})? Link it and its usage will appear here.</p>
            <ul className="mt-3 space-y-2">
              {data.unlinked.map((u) => (
                <li key={u.key} className="flex flex-wrap items-center justify-between gap-2 rounded-md bg-white px-3 py-2 text-[#1a1a1a]">
                  <span className="text-sm">
                    <strong>{u.identifier || "(no name)"}</strong> <span className="text-[#737373]">from {u.source} · {ago(tick - Date.parse(u.lastSeen))}</span>
                  </span>
                  <button
                    type="button"
                    disabled={busy}
                    onClick={() => void act({ action: "link", key: u.key })}
                    className="inline-flex items-center gap-1.5 rounded-lg bg-[#1a1a1a] px-3 py-1.5 text-xs font-bold text-white hover:bg-[#111111] disabled:opacity-60"
                  >
                    <Link2 size={13} /> This is {router.name}
                  </button>
                </li>
              ))}
            </ul>
          </div>
        )}

        {data.canSimulate && (
          <div className="mt-4 flex flex-wrap items-center gap-3 rounded-lg bg-[#f7f7f7] p-4">
            <FlaskConical size={18} className="text-[#1a1a1a]" />
            <p className="min-w-[220px] flex-1 text-sm text-[#525252]">
              <strong className="text-[#1a1a1a]">Try it without a router.</strong> Fill this page with two weeks of sample traffic and a few sample customers whose numbers keep moving. Test only — remove it before going live.
            </p>
            <button
              type="button"
              disabled={busy}
              onClick={() => void act({ action: "simulate" })}
              data-testid="usage-simulate"
              className="rounded-lg bg-[#1a1a1a] px-4 py-2 text-sm font-bold text-white hover:bg-[#111111] disabled:opacity-60"
            >
              {data.simulating ? "Restart sample traffic" : "Show sample traffic"}
            </button>
            {data.simulating && (
              <button
                type="button"
                disabled={busy}
                onClick={() => void act({ action: "clear-test" })}
                data-testid="usage-clear-test"
                className="inline-flex items-center gap-1.5 rounded-lg border border-[#d4d4d4] bg-white px-4 py-2 text-sm font-bold text-[#525252] hover:bg-[#f4f4f4] disabled:opacity-60"
              >
                <Trash2 size={14} /> Remove sample data
              </button>
            )}
          </div>
        )}
      </article>
    </div>
  );
}
