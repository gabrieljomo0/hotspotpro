"use client";

// Traffic analytics: which routers have website tracking switched on, and
// the site/user figures that come out of it. The on/off choice is real and
// saved. The site breakdown is a sample built from each user's real "data
// used" until the MikroTik router reports actual DNS names — so figures
// always add up to the data the rest of the section already shows.

import { usePersistedState } from "../context/usePersistedState";
import type { ActiveUser, RouterInfo } from "../data/dashboard-data";
import { buildSiteVisits, hashString } from "./advanced-details/helpers";
import { getUserId } from "./userLinks";
import { parseDataToMb, routerForUser, routerIsUp, windowFactor } from "./sessionInsights";

export type TrafficWindow = "today" | "7days";

export function useTrafficTracking() {
  const [tracking, setTracking] = usePersistedState<Record<string, boolean>>("trafficTracking", {});

  function isTracking(ip: string) {
    return tracking[ip] === true;
  }

  function setTrackingFor(ips: string[], on: boolean) {
    setTracking((current) => {
      const next = { ...current };
      ips.forEach((ip) => {
        next[ip] = on;
      });
      return next;
    });
  }

  return { tracking, isTracking, setTrackingFor };
}

export type SiteTraffic = { site: string; mb: number; users: number };
export type UserTraffic = { id: string; label: string; mb: number; routerName: string };

// Some traffic can't be turned into a website name (bare IP addresses),
// and those are left out of the site list — about 6–14% per user here.
function unnamedShare(user: ActiveUser) {
  return 0.06 + (hashString(getUserId(user)) % 9) / 100;
}

// One user's named sites, scaled so that together with the unnamed
// remainder they add up to what that user really used.
export function userSites(user: ActiveUser, window: TrafficWindow) {
  const visits = buildSiteVisits(hashString(getUserId(user)));
  const raw = visits.reduce((sum, visit) => sum + visit.dataMb, 0) || 1;
  const namedMb = parseDataToMb(user.dataUsed) * windowFactor(window) * (1 - unnamedShare(user));
  return visits
    .map((visit) => ({ site: visit.site, mb: (visit.dataMb / raw) * namedMb, minutes: visit.minutes }))
    .sort((a, b) => b.mb - a.mb);
}

export function buildTraffic({
  users,
  routers,
  trackedIps,
  routerFilter,
  window,
  query,
}: {
  users: ActiveUser[];
  routers: RouterInfo[];
  trackedIps: string[];
  routerFilter: string; // "All" or a router ip
  window: TrafficWindow;
  query: string;
}) {
  const upTracked = new Set(
    routers.filter((router) => routerIsUp(router) && trackedIps.includes(router.ip)).map((r) => r.ip),
  );

  const inScope = users.filter((user) => {
    const router = routerForUser(getUserId(user), routers);
    if (!router || !upTracked.has(router.ip)) return false;
    return routerFilter === "All" || router.ip === routerFilter;
  });

  const siteMap = new Map<string, { mb: number; users: number }>();
  const userRows: UserTraffic[] = [];

  inScope.forEach((user) => {
    const id = getUserId(user);
    const router = routerForUser(id, routers);
    userRows.push({
      id,
      label: user.phone || user.voucherUsername,
      mb: parseDataToMb(user.dataUsed) * windowFactor(window),
      routerName: router ? router.name.split(" (")[0] : "—",
    });
    userSites(user, window).forEach(({ site, mb }) => {
      const entry = siteMap.get(site) ?? { mb: 0, users: 0 };
      entry.mb += mb;
      entry.users += 1;
      siteMap.set(site, entry);
    });
  });

  const needle = query.trim().toLowerCase();
  const sites: SiteTraffic[] = [...siteMap.entries()]
    .map(([site, value]) => ({ site, ...value }))
    .filter((entry) => !needle || entry.site.toLowerCase().includes(needle))
    .sort((a, b) => b.mb - a.mb);

  const totalMb = userRows.reduce((sum, row) => sum + row.mb, 0);
  const namedMb = [...siteMap.values()].reduce((sum, value) => sum + value.mb, 0);
  userRows.sort((a, b) => b.mb - a.mb);

  return {
    sites,
    users: userRows,
    totalMb,
    siteCount: siteMap.size,
    userCount: userRows.length,
    // Share of the traffic that could be attributed to a website name.
    namedPct: totalMb > 0 ? Math.round((namedMb / totalMb) * 100) : 0,
    anyTracking: upTracked.size > 0,
  };
}
