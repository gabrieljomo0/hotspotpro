"use client";

// Traffic analytics: which websites your users are spending data on, and
// who the busiest users are — for the routers you switch tracking on for.
// The on/off switch per router is real and saved. Until the MikroTik
// connection reports actual website names, the breakdown is a sample built
// from each user's real "data used", so totals always match the rest of
// the Users section.

import { useState } from "react";
import { Search } from "lucide-react";

import { useDashboard } from "@/components/dashboard/context/DashboardContext";
import { UsersNavTabs } from "@/components/dashboard/active-users/UsersNavTabs";
import { BackLink } from "@/components/dashboard/shared/BackLink";
import { formatMb, routerIsUp } from "@/components/dashboard/active-users/sessionInsights";
import {
  buildTraffic,
  useTrafficTracking,
  type TrafficWindow,
} from "@/components/dashboard/active-users/trafficInsights";

export default function TrafficAnalyticsPage() {
  const { users, routers } = useDashboard();
  const { tracking, isTracking, setTrackingFor } = useTrafficTracking();

  const [range, setRange] = useState<TrafficWindow>("today");
  const [routerFilter, setRouterFilter] = useState("All");
  const [query, setQuery] = useState("");
  const [ticked, setTicked] = useState<string[]>([]);

  const trackedIps = routers.filter((router) => tracking[router.ip] === true).map((router) => router.ip);
  const traffic = buildTraffic({ users, routers, trackedIps, routerFilter, window: range, query });
  const topSiteMb = traffic.sites[0]?.mb ?? 1;
  const topUserMb = traffic.users[0]?.mb ?? 1;

  const tickable = routers.filter(routerIsUp).map((router) => router.ip);
  const allTicked = tickable.length > 0 && tickable.every((ip) => ticked.includes(ip));

  function toggleTick(ip: string) {
    setTicked((current) => (current.includes(ip) ? current.filter((x) => x !== ip) : [...current, ip]));
  }

  function apply(on: boolean) {
    if (ticked.length === 0) return;
    setTrackingFor(ticked, on);
    setTicked([]);
  }

  return (
    <section className="w-full">
      <BackLink />
      <h2 className="mb-1 text-3xl font-bold tracking-tight md:text-4xl">Traffic analytics</h2>
      <p className="mb-5 max-w-2xl text-sm text-[#64748b] md:text-base">
        See data usage by website and by user, for the routers you switch tracking on for.
      </p>

      <UsersNavTabs />

      <div className="mb-5 grid grid-cols-2 gap-3 lg:grid-cols-4">
        {[
          { label: "Data seen", value: formatMb(traffic.totalMb), hint: range === "today" ? "Today" : "7 days" },
          { label: "Sites", value: String(traffic.siteCount), hint: "Unique names" },
          { label: "Users", value: String(traffic.userCount), hint: "Vouchers or devices" },
          { label: "Named", value: `${traffic.namedPct}%`, hint: "Website names only" },
        ].map((card) => (
          <div key={card.label} className="rounded-xl border border-[#e2e8f0] bg-white p-4">
            <p className="text-sm text-[#64748b]">{card.label}</p>
            <p className="mt-1 text-2xl font-black text-[#0f172a]">{card.value}</p>
            <p className="mt-1 text-xs text-[#94a3b8]">{card.hint}</p>
          </div>
        ))}
      </div>

      <div className="mb-5 flex flex-wrap items-center gap-3">
        <div className="inline-flex rounded-xl bg-[#f1f5f9] p-1">
          {(["today", "7days"] as TrafficWindow[]).map((option) => (
            <button
              type="button"
              key={option}
              onClick={() => setRange(option)}
              aria-pressed={range === option}
              className={`rounded-lg px-4 py-2 text-sm font-semibold transition ${
                range === option ? "bg-[#2563eb] text-white shadow-sm" : "text-[#64748b] hover:text-[#475569]"
              }`}
            >
              {option === "today" ? "Today" : "7 days"}
            </button>
          ))}
        </div>

        <select
          value={routerFilter}
          onChange={(event) => setRouterFilter(event.target.value)}
          aria-label="Router"
          className="h-11 rounded-xl border border-[#e2e8f0] bg-white px-4 text-sm outline-none focus:border-[#2563eb]"
        >
          <option value="All">All routers</option>
          {routers.map((router) => (
            <option key={router.ip} value={router.ip}>
              {router.name.split(" (")[0]}
            </option>
          ))}
        </select>

        <div className="relative">
          <Search size={15} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-[#94a3b8]" />
          <input
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="Search a site"
            aria-label="Search a site"
            className="h-11 w-64 rounded-xl border border-[#e2e8f0] bg-white pl-9 pr-3 text-sm outline-none focus:border-[#2563eb]"
          />
        </div>
      </div>

      {traffic.anyTracking && (
        <p className="mb-4 text-xs text-amber-700">
          Sample breakdown — real website names will appear here once your MikroTik router reports them. Totals match
          each user&apos;s real data used.
        </p>
      )}

      <div className="mb-5 grid gap-4 lg:grid-cols-[2fr_1fr]">
        <article className="rounded-2xl border border-[#e2e8f0] bg-white p-5">
          <h3 className="text-base font-bold text-[#0f172a]">Top sites</h3>
          {traffic.sites.length === 0 ? (
            <p className="py-8 text-sm text-[#94a3b8]">
              {traffic.anyTracking && query
                ? "No site matches that search."
                : "Nothing yet. Turn tracking on for a MikroTik router. Only website names are listed."}
            </p>
          ) : (
            <ul className="mt-4 space-y-3">
              {traffic.sites.slice(0, 10).map((entry) => (
                <li key={entry.site}>
                  <div className="flex items-center justify-between text-sm">
                    <span className="font-semibold text-[#0f172a]">{entry.site}</span>
                    <span className="text-[#64748b]">
                      {formatMb(entry.mb)} · {entry.users} user{entry.users === 1 ? "" : "s"}
                    </span>
                  </div>
                  <div className="mt-1.5 h-2 rounded-full bg-[#f1f5f9]">
                    <div
                      className="h-2 rounded-full bg-[#2563eb]"
                      style={{ width: `${Math.max(3, (entry.mb / topSiteMb) * 100)}%` }}
                    />
                  </div>
                </li>
              ))}
            </ul>
          )}
        </article>

        <article className="rounded-2xl border border-[#e2e8f0] bg-white p-5">
          <h3 className="text-base font-bold text-[#0f172a]">Busiest users</h3>
          {traffic.users.length === 0 ? (
            <p className="py-8 text-sm text-[#94a3b8]">No users yet.</p>
          ) : (
            <ul className="mt-4 space-y-3">
              {traffic.users.slice(0, 8).map((row) => (
                <li key={row.id}>
                  <div className="flex items-center justify-between text-sm">
                    <span className="truncate font-semibold text-[#0f172a]">{row.label}</span>
                    <span className="ml-3 shrink-0 text-[#64748b]">{formatMb(row.mb)}</span>
                  </div>
                  <div className="mt-1 flex items-center gap-2">
                    <div className="h-1.5 flex-1 rounded-full bg-[#f1f5f9]">
                      <div
                        className="h-1.5 rounded-full bg-emerald-500"
                        style={{ width: `${Math.max(3, (row.mb / topUserMb) * 100)}%` }}
                      />
                    </div>
                    <span className="text-[11px] text-[#94a3b8]">{row.routerName}</span>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </article>
      </div>

      <article className="rounded-2xl border border-[#e2e8f0] bg-white p-5">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <h3 className="text-base font-bold text-[#0f172a]">Tracking on routers</h3>
            <p className="mt-1 text-sm text-[#64748b]">
              Tick a router, then Turn on. Addresses that can&apos;t be named are left out.
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <button
              type="button"
              onClick={() => setTicked(allTicked ? [] : tickable)}
              disabled={tickable.length === 0}
              className="rounded-lg border border-[#e2e8f0] bg-white px-3 py-2 text-xs font-semibold text-[#475569] hover:bg-[#ffffff] disabled:opacity-50"
            >
              {allTicked ? "Clear selection" : "Select all"}
            </button>
            <button
              type="button"
              onClick={() => apply(true)}
              disabled={ticked.length === 0}
              className="rounded-lg bg-[#2563eb] px-4 py-2 text-xs font-bold text-white hover:bg-[#1d4ed8] disabled:cursor-not-allowed disabled:opacity-50"
            >
              Turn on
            </button>
            <button
              type="button"
              onClick={() => apply(false)}
              disabled={ticked.length === 0}
              className="rounded-lg border border-[#e2e8f0] bg-white px-4 py-2 text-xs font-bold text-[#475569] hover:bg-[#ffffff] disabled:cursor-not-allowed disabled:opacity-50"
            >
              Turn off
            </button>
          </div>
        </div>

        <ul className="mt-4 divide-y divide-[#f1f5f9]">
          {routers.length === 0 && <li className="py-6 text-sm text-[#94a3b8]">No routers added yet.</li>}
          {routers.map((router) => {
            const up = routerIsUp(router);
            const on = isTracking(router.ip);
            return (
              <li key={router.ip} className="flex items-center gap-3 py-3.5">
                <input
                  type="checkbox"
                  checked={ticked.includes(router.ip)}
                  onChange={() => toggleTick(router.ip)}
                  disabled={!up}
                  aria-label={`Select ${router.name.split(" (")[0]}`}
                  className="h-4 w-4 accent-[#2563eb]"
                />
                <div className="min-w-0 flex-1">
                  <p className="font-semibold text-[#0f172a]">{router.name.split(" (")[0]}</p>
                  <p className={`text-xs ${on ? "font-semibold text-emerald-600" : "text-[#94a3b8]"}`}>
                    {on ? "On" : "Off"}
                    {!up && " · router is down"}
                  </p>
                </div>
                <span className="rounded-full bg-blue-50 px-3 py-1 text-xs font-semibold text-[#2563eb]">MikroTik</span>
              </li>
            );
          })}
        </ul>
      </article>
    </section>
  );
}
