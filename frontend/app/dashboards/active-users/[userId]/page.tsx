"use client";

import { localizeAmountString } from "@/components/dashboard/shared/currency";
import { use, useEffect, useState } from "react";
import Link from "next/link";
import { ArrowDown, ArrowUp, LogOut, Printer, RefreshCw, Users } from "lucide-react";

import { useDashboard } from "@/components/dashboard/context/DashboardContext";
import { NotFoundCard } from "@/components/dashboard/shared/ActionPageLayout";
import { BackLink } from "@/components/dashboard/shared/BackLink";
import { ActiveUsersDrawer } from "@/components/dashboard/active-users/ActiveUsersDrawer";
import {
  QUOTA_BY_PACKAGE,
  hashString,
  buildSessionTimeline,
  buildStatusSummary,
  buildQuotaSeries,
  buildConnectionQuality,
} from "@/components/dashboard/active-users/advanced-details/helpers";
import { StatusSummarySection } from "@/components/dashboard/active-users/advanced-details/StatusSummarySection";
import { DataQuotaSection } from "@/components/dashboard/active-users/advanced-details/DataQuotaSection";
import { TimelineSection } from "@/components/dashboard/active-users/advanced-details/TimelineSection";
import { ConnectionQualitySection } from "@/components/dashboard/active-users/advanced-details/ConnectionQualitySection";
import { LoyaltySection } from "@/components/dashboard/active-users/advanced-details/LoyaltySection";
import { useUserRoutes, type UserAction } from "@/components/dashboard/active-users/userRoutes";
import {
  connectionStatus,
  dataUsedPercent,
  formatMb,
  parseDataToMb,
  routerForUser,
  routerIsUp,
  sessionDevice,
  usageSplit,
} from "@/components/dashboard/active-users/sessionInsights";
import {
  useTrafficTracking,
  userSites,
  type TrafficWindow,
} from "@/components/dashboard/active-users/trafficInsights";

const STATUS_STYLE: Record<string, string> = {
  Online: "bg-emerald-100 text-emerald-700",
  Paused: "bg-amber-100 text-amber-700",
  Disconnected: "bg-slate-200 text-slate-600",
  Blocked: "bg-red-100 text-red-700",
};

function clock(date: Date) {
  return date.toLocaleString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });
}

export default function ViewSessionPage({
  params,
}: {
  params: Promise<{ userId: string }>;
}) {
  const { userId } = use(params);
  const decodedUserId = decodeURIComponent(userId);
  const { users, findUser, getConnectionState, routers, packages, getLoyaltyPoints, redeemLoyaltyPoints, loyaltySettings } = useDashboard();
  const [usersDrawerOpen, setUsersDrawerOpen] = useState(false);
  const { isTracking } = useTrafficTracking();
  const routes = useUserRoutes();

  const [showPassword, setShowPassword] = useState(false);
  const [copied, setCopied] = useState<"code" | "password" | null>(null);
  const [range, setRange] = useState<TrafficWindow>("today");
  const [autoRefresh, setAutoRefresh] = useState(true);
  const [updatedAt, setUpdatedAt] = useState(() => new Date());

  // Auto-refresh re-reads the session every 15 seconds while it's ticked.
  useEffect(() => {
    if (!autoRefresh) return;
    const timer = setInterval(() => setUpdatedAt(new Date()), 15000);
    return () => clearInterval(timer);
  }, [autoRefresh]);

  async function copy(kind: "code" | "password", value: string) {
    try {
      await navigator.clipboard.writeText(value);
      setCopied(kind);
      setTimeout(() => setCopied(null), 1500);
    } catch {
      // Clipboard blocked — the value is still on screen to copy by hand.
    }
  }

  const user = findUser(decodedUserId);
  if (!user) {
    return <NotFoundCard />;
  }

  const state = getConnectionState(decodedUserId);
  const status = connectionStatus(state);
  const online = status === "Online";
  const router = routerForUser(user, routers);
  const routerName = router ? router.name.split(" (")[0] : null;
  const device = sessionDevice(user);
  const split = usageSplit(user);
  const percent = dataUsedPercent(user);
  const price = packages.find((pkg) => pkg.name === user.package)?.price ?? "—";

  const usedMb = parseDataToMb(user.dataUsed);
  const hasAllowance = /\d/.test(user.dataLeft);
  const allowanceLabel = hasAllowance ? formatMb(usedMb + parseDataToMb(user.dataLeft)) : "Unlimited data";

  const trackingOn = !!router && routerIsUp(router) && isTracking(router.ip);
  const sites = trackingOn ? userSites(user, range).slice(0, 6) : [];

  const buttons: Array<{ label: string; href: string; className: string }> = [
    { label: "Extend", href: routes.href(decodedUserId, "extend-access"), className: "bg-emerald-600 hover:bg-emerald-700" },
    { label: "Top up", href: routes.href(decodedUserId, "topup-data"), className: "bg-[#1a1a1a] hover:bg-[#111111]" },
    { label: "Edit package", href: routes.href(decodedUserId, "change-package"), className: "bg-amber-600 hover:bg-amber-700" },
    { label: "Login details", href: routes.href(decodedUserId, "copy-login"), className: "bg-blue-600 hover:bg-blue-700" },
    { label: state.paused ? "Resume" : "Pause", href: routes.href(decodedUserId, "pause"), className: "bg-slate-700 hover:bg-slate-800" },
    { label: state.disconnected ? "Reconnect" : "Disconnect", href: routes.href(decodedUserId, "disconnect"), className: "bg-amber-600 hover:bg-amber-700" },
    { label: state.blocked ? "Unblock" : "Block", href: routes.href(decodedUserId, "block"), className: "bg-red-700 hover:bg-red-800" },
    { label: "Delete", href: routes.href(decodedUserId, "delete"), className: "bg-red-600 hover:bg-red-700" },
  ].filter((button) => routes.can(button.href.split("/").pop() as UserAction));

  // Everything the page showed before this was blended — kept in full.
  const rows: Array<[string, string]> = [
    ["Phone", user.phone || "Not provided"],
    ["Access Type", user.accessType],
    ["Package / Source", user.package],
    ["Voucher Username", user.voucherUsername],
    ["Voucher Password", user.voucherPassword],
    ["Duration", user.duration],
    ["Time Spent", user.timeSpent],
    ["Time Left", user.timeLeft],
    ["Data Used", user.dataUsed],
    ["Data Left", user.dataLeft],
    ["Expires At", user.expiresAt],
    ["Connection Status", status],
  ];

  // The "advanced details" that used to be on their own page.
  const seed = hashString(decodedUserId);
  const statusSummary = buildStatusSummary(seed);
  const sessionTimeline = buildSessionTimeline(seed);
  const quotaGb = QUOTA_BY_PACKAGE[user.package] ?? 5;
  const quotaSeries = buildQuotaSeries(seed, quotaGb);
  const usedSoFarGb = quotaSeries[quotaSeries.length - 1].usedGb;
  const quotaPct = Math.min(100, Math.round((usedSoFarGb / quotaGb) * 100));
  const connectionQuality = buildConnectionQuality(seed);
  const points = getLoyaltyPoints(decodedUserId);
  const canRedeem = loyaltySettings.enabled && points >= loyaltySettings.pointsToVoucherThreshold;

  return (
    <div className="mx-auto w-full max-w-6xl space-y-5">
      <div className="flex flex-wrap items-center justify-between gap-3 print:hidden">
        <BackLink label="Back to Active Users" fallbackHref={routes.isAgent ? routes.listHref : "/dashboards/users"} />
        <div className="flex gap-2">
          <button
            type="button"
            onClick={() => setUsersDrawerOpen(true)}
            className="inline-flex items-center gap-2 rounded-xl border border-[#e6e6e6] bg-white px-4 py-2 text-sm font-semibold text-[#525252] hover:bg-[#ffffff]"
          >
            <Users size={15} className="text-[#1a1a1a]" />
            Active Users
            <span className="rounded-full bg-[#1a1a1a] px-2 py-0.5 text-[11px] font-bold text-white">{users.length}</span>
          </button>
          <button
            type="button"
            onClick={() => window.print()}
            aria-label="Print this page"
            title="Print this page"
            className="rounded-xl border border-[#e6e6e6] bg-white px-3 py-2 text-[#525252] hover:bg-[#ffffff]"
          >
            <Printer size={16} />
          </button>
        </div>
      </div>

      <ActiveUsersDrawer currentUserId={decodedUserId} open={usersDrawerOpen} onClose={() => setUsersDrawerOpen(false)} />

      {/* Header: who/what this session is, and everything you can do to it */}
      <section className="rounded-2xl border border-[#e6e6e6] bg-white p-6 shadow-[0_8px_24px_rgba(26,26,26,0.06)] md:p-8">
        <div className="flex flex-wrap items-start justify-between gap-5">
          <div className="min-w-0">
            <div className="flex flex-wrap items-center gap-2">
              <span data-testid="status-badge" className={`rounded-full px-3 py-1 text-xs font-semibold ${STATUS_STYLE[status]}`}>
                {online ? "In Use" : status}
              </span>
              {online && (
                <span className="inline-flex items-center gap-1.5 rounded-full bg-emerald-100 px-3 py-1 text-xs font-semibold text-emerald-700">
                  <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" />
                  Live session
                </span>
              )}
            </div>

            <p className="mt-5 text-xs font-bold uppercase tracking-wide text-[#a3a3a3]">
              {user.accessType === "Package" ? "Package login" : "Voucher code"}
            </p>
            <div className="mt-1 flex flex-wrap items-center gap-2">
              <h1 className="font-mono text-xl font-black text-[#1a1a1a]">{user.voucherUsername}</h1>
              <button
                type="button"
                onClick={() => copy("code", user.voucherUsername)}
                className="rounded-lg border border-[#e6e6e6] bg-white px-2.5 py-1 text-xs font-semibold text-[#525252] hover:bg-[#ffffff]"
              >
                {copied === "code" ? "Copied" : "Copy code"}
              </button>
            </div>

            <p className="mt-4 text-xs font-bold uppercase tracking-wide text-[#a3a3a3]">Password</p>
            <div className="mt-1 flex flex-wrap items-center gap-2">
              <span data-testid="password-value" className="font-mono text-base font-bold text-[#1a1a1a]">
                {showPassword ? user.voucherPassword : "•".repeat(Math.max(6, user.voucherPassword.length))}
              </span>
              <button
                type="button"
                onClick={() => setShowPassword((current) => !current)}
                className="text-xs font-semibold text-[#1a1a1a] hover:underline"
              >
                {showPassword ? "Hide" : "Show"}
              </button>
              <button
                type="button"
                onClick={() => copy("password", user.voucherPassword)}
                className="rounded-lg border border-[#e6e6e6] bg-white px-2.5 py-1 text-xs font-semibold text-[#525252] hover:bg-[#ffffff]"
              >
                {copied === "password" ? "Copied" : "Copy password"}
              </button>
            </div>

            <p className="mt-4 text-sm text-[#737373]">
              {user.package} · {user.duration} · {allowanceLabel}
            </p>
            <div className="mt-3 flex flex-wrap gap-2 text-xs">
              {routerName && (
                <span className="rounded-md bg-[#f4f4f4] px-2.5 py-1.5 font-semibold text-[#525252]">By {routerName}</span>
              )}
              <span className="rounded-md bg-[#f4f4f4] px-2.5 py-1.5 font-semibold text-[#525252]">
                {user.phone || "No phone on file"}
              </span>
            </div>
          </div>

          <div className="flex max-w-xl flex-wrap justify-end gap-2" data-testid="session-actions">
            {buttons.map((button) => (
              <Link
                key={button.label}
                href={button.href}
                className={`rounded-xl px-4 py-2.5 text-sm font-bold text-white shadow-sm transition ${button.className}`}
              >
                {button.label}
              </Link>
            ))}
          </div>
        </div>
      </section>

      {/* Four headline figures */}
      <section className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <div className="rounded-2xl border border-blue-200 bg-blue-50 p-5">
          <p className="text-xs font-bold uppercase tracking-wide text-[#a3a3a3]">Price</p>
          <p className="mt-1 text-2xl font-black text-[#1a1a1a]">{localizeAmountString(price)}</p>
        </div>
        <div className="rounded-2xl border border-blue-200 bg-white p-5">
          <p className="text-xs font-bold uppercase tracking-wide text-[#a3a3a3]">Time</p>
          <p className="mt-1 text-2xl font-black text-[#1a1a1a]">{user.duration}</p>
          <p className="mt-1 text-xs text-[#737373]">Expires {user.expiresAt}</p>
        </div>
        <div className="rounded-2xl border border-emerald-200 bg-white p-5">
          <p className="text-xs font-bold uppercase tracking-wide text-[#a3a3a3]">Data used</p>
          <p className="mt-1 text-2xl font-black text-[#1a1a1a]">{user.dataUsed}</p>
          <p className="mt-1 text-xs text-[#737373]">{user.dataLeft} remaining</p>
        </div>
        <div className="rounded-2xl border border-slate-200 bg-white p-5">
          <p className="text-xs font-bold uppercase tracking-wide text-[#a3a3a3]">Session</p>
          <p className="mt-1 text-2xl font-black text-[#1a1a1a]">{user.timeSpent}</p>
          <p className="mt-1 text-xs text-[#737373]">{device.name}</p>
        </div>
      </section>

      {/* Which websites this session used */}
      <section className="rounded-2xl border border-[#e6e6e6] bg-white p-6">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <h2 className="text-base font-bold text-[#1a1a1a]">Traffic analytics</h2>
            <p className="text-sm text-[#737373]">Sites this voucher reached. Sampled, not a full bill.</p>
          </div>
          <div className="flex gap-1 text-sm">
            {(["today", "7days"] as TrafficWindow[]).map((option) => (
              <button
                type="button"
                key={option}
                onClick={() => setRange(option)}
                aria-pressed={range === option}
                className={`rounded-lg px-2.5 py-1 font-semibold ${
                  range === option ? "text-[#1a1a1a]" : "text-[#a3a3a3] hover:text-[#525252]"
                }`}
              >
                {option === "today" ? "Today" : "7 days"}
              </button>
            ))}
          </div>
        </div>

        {sites.length === 0 ? (
          <div className="mt-4">
            <p className="text-sm text-[#737373]">
              {router && !routerIsUp(router)
                ? `${routerName} is down, so there's nothing to show right now.`
                : routes.isAgent ? "No sites to show yet." : "No sites yet. Turn on tracking from Traffic analytics."}
            </p>
            {!routes.isAgent && (
              <Link href="/dashboards/users/traffic" className="mt-4 inline-block text-sm font-semibold text-[#1a1a1a] hover:underline">
                Open Traffic analytics
              </Link>
            )}
          </div>
        ) : (
          <ul className="mt-4 divide-y divide-[#f4f4f4]" data-testid="session-sites">
            {sites.map((entry) => (
              <li key={entry.site} className="flex items-center justify-between py-2.5 text-sm">
                <span className="font-semibold text-[#1a1a1a]">{entry.site}</span>
                <span className="text-[#737373]">{formatMb(entry.mb)}</span>
              </li>
            ))}
          </ul>
        )}
      </section>

      {/* Session facts and how much of the data is gone */}
      <section className="rounded-2xl border border-[#e6e6e6] bg-white p-6">
        <dl className="divide-y divide-[#f4f4f4] text-sm">
          {[
            ["Time spent", user.timeSpent],
            ["Time left", user.timeLeft],
            ["Expires", user.expiresAt],
            ["Device", `${device.name} · ${device.type}`],
          ].map(([label, value]) => (
            <div key={label} className="flex items-center justify-between py-3.5">
              <dt className="text-[#737373]">{label}</dt>
              <dd className="font-semibold text-[#1a1a1a]">{value}</dd>
            </div>
          ))}
        </dl>
        {percent !== null && (
          <div className="mt-3 border-t border-[#f4f4f4] pt-4" data-testid="data-bar">
            <div className="flex items-center justify-between text-xs text-[#737373]">
              <span>Data</span>
              <span>{percent}%</span>
            </div>
            <div className="mt-1.5 h-2 rounded-full bg-[#f4f4f4]">
              <div className="h-2 rounded-full bg-[#1a1a1a]" style={{ width: `${Math.max(2, percent)}%` }} />
            </div>
          </div>
        )}
      </section>

      {/* Live numbers for this session, refreshable */}
      <section className="overflow-hidden rounded-2xl border border-[#e6e6e6] bg-white">
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-[#f4f4f4] px-6 py-5">
          <div>
            <h2 className="text-base font-bold text-[#1a1a1a]">Live usage</h2>
            <p className="text-sm text-[#737373]">Session data for this voucher</p>
          </div>
          <div className="flex flex-wrap items-center gap-3 text-sm">
            <label className="flex items-center gap-2 font-medium text-[#525252]">
              <input
                type="checkbox"
                checked={autoRefresh}
                onChange={(event) => setAutoRefresh(event.target.checked)}
                className="h-4 w-4 accent-[#1a1a1a]"
              />
              Auto-refresh
            </label>
            <span data-testid="updated-at" className="text-xs text-[#a3a3a3]">
              Updated {clock(updatedAt)}
            </span>
            <button
              type="button"
              onClick={() => setUpdatedAt(new Date())}
              className="inline-flex items-center gap-2 rounded-xl bg-[#1a1a1a] px-4 py-2 text-sm font-bold text-white hover:bg-[#111111]"
            >
              <RefreshCw size={15} />
              Refresh
            </button>
            {routes.can("disconnect") && (
            <Link
              href={routes.href(decodedUserId, "disconnect")}
              className="inline-flex items-center gap-2 rounded-xl bg-amber-600 px-4 py-2 text-sm font-bold text-white hover:bg-amber-700"
            >
              <LogOut size={15} />
              {state.disconnected ? "Reconnect" : "Disconnect"}
            </Link>
            )}
          </div>
        </div>

        <div className="grid gap-3 p-6 sm:grid-cols-2 lg:grid-cols-3">
          {[
            { label: "MAC address", value: device.mac, mono: true },
            { label: "IP address", value: device.ip, mono: true },
            { label: "Remaining", value: hasAllowance ? `${user.dataLeft} data left` : "Unlimited data", accent: true },
            { label: "Uptime", value: user.timeSpent },
            { label: "Downloaded", value: formatMb(split.downMb) },
            { label: "Uploaded", value: formatMb(split.upMb) },
            { label: "Total usage", value: formatMb(split.totalMb) },
          ].map((cell) => (
            <div key={cell.label} className="rounded-xl bg-[#f7f7f7] p-4">
              <p className="text-[11px] font-bold uppercase tracking-wide text-[#a3a3a3]">{cell.label}</p>
              <p
                className={`mt-1 text-sm font-semibold ${cell.accent ? "text-[#1a1a1a]" : "text-[#1a1a1a]"} ${
                  cell.mono ? "font-mono" : ""
                }`}
              >
                {cell.value}
              </p>
            </div>
          ))}
          <div className="rounded-xl bg-[#f7f7f7] p-4">
            <p className="text-[11px] font-bold uppercase tracking-wide text-[#a3a3a3]">Connection</p>
            <span className={`mt-1.5 inline-block rounded-full px-3 py-1 text-xs font-semibold ${STATUS_STYLE[status]}`}>
              {online ? "In Use" : status}
            </span>
          </div>
        </div>

        <div className="border-t border-[#f4f4f4] px-6 py-5">
          <h3 className="text-sm font-bold text-[#1a1a1a]">Connected devices</h3>
          <p className="text-xs text-[#737373]">Per-device session usage</p>
          <div className="mt-3 flex flex-wrap items-center justify-between gap-3 rounded-xl border border-[#f4f4f4] bg-[#f7f7f7] p-4" data-testid="device-row">
            <div>
              <p className="font-semibold text-[#1a1a1a]">{device.name}</p>
              <p className="mt-0.5 font-mono text-xs text-[#a3a3a3]">
                {device.mac} · {device.ip}
              </p>
              <p className="mt-0.5 text-xs text-[#737373]">Uptime {user.timeSpent}</p>
            </div>
            <div className="text-right">
              <p className="font-bold text-[#1a1a1a]">{formatMb(split.totalMb)}</p>
              <p className="mt-0.5 inline-flex items-center gap-1 text-xs text-[#a3a3a3]">
                <ArrowDown size={11} />
                {formatMb(split.downMb)} · <ArrowUp size={11} />
                {formatMb(split.upMb)}
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* The original details list, unchanged */}
      <section className="rounded-2xl border border-[#e6e6e6] bg-white p-6">
        <h2 className="text-base font-bold text-[#1a1a1a]">All session details</h2>
        <p className="mb-4 text-sm text-[#737373]">Full connection and package details for this user.</p>
        <div className="space-y-3" data-testid="all-details">
          {rows.map(([label, value]) => (
            <div
              key={label}
              className="flex items-center justify-between gap-4 rounded-xl border border-[#f4f4f4] px-4 py-3"
            >
              <span className="text-xs text-[#737373]">{label}</span>
              <span className="text-right text-sm font-semibold text-[#1a1a1a]">{value}</span>
            </div>
          ))}
        </div>
      </section>

      {/* Advanced details — now part of this same page */}
      <section data-testid="advanced-details" className="rounded-2xl border border-[#e6e6e6] bg-white p-6">
        <h2 className="mb-4 text-base font-bold text-[#1a1a1a]">Advanced details</h2>
        <StatusSummarySection summary={statusSummary} />
        <DataQuotaSection
          quotaGb={quotaGb}
          quotaSeries={quotaSeries}
          usedSoFarGb={usedSoFarGb}
          quotaPct={quotaPct}
          isFullyUsed={usedSoFarGb >= quotaGb}
          userLabel={user.phone || user.voucherUsername}
        />
        <TimelineSection segments={sessionTimeline} />
        <ConnectionQualitySection {...connectionQuality} />
        <LoyaltySection
          points={points}
          loyaltyEnabled={loyaltySettings.enabled}
          pointsToVoucherThreshold={loyaltySettings.pointsToVoucherThreshold}
          rewardPackageName={loyaltySettings.rewardPackageName}
          canRedeem={canRedeem}
          onRedeem={() => redeemLoyaltyPoints(decodedUserId)}
        />
      </section>
    </div>
  );
}
