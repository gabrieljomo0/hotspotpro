// The main dashboard's filter: look at the whole business (the default) or
// narrow every figure on the page to one site, one router or one agent.
//
// Everything here is plain logic (no React, no storage) so the rules can be
// tested on their own and shared by the filter control and every widget —
// that is what guarantees the cards, the chart, the tables and the network
// list always agree about what "this router" or "this agent" means.
//
// How things belong to a router/site/agent in this app:
//   * a ROUTER belongs to a site (router.siteId)
//   * a USER is on a router by the same deterministic assignment every other
//     screen uses (routerForUser + user.routerIp from RADIUS/check-in)
//   * a VOUCHER belongs to the router(s) of its BATCH, and to the agent who
//     generated it (voucher.agentId)
//   * an AGENT works one router (agent.routerIp)

import type { ActiveUser, RouterInfo } from "../data/dashboard-data";
import type { ActivityLogEntry, Voucher, VoucherBatch } from "../shared/types";
import { routerForUser, parseDataToMb } from "../active-users/sessionInsights";
import { getUserId } from "../active-users/userLinks";

export type ScopeKind = "all" | "site" | "router" | "agent";

// kind says WHAT you are filtering by; the matching id says WHICH one.
// An id of null means "all of them" — the same as no filter at all.
export type DashboardScope = {
  kind: ScopeKind;
  siteId: string | null;
  // With kind "site" this narrows to one router of that site.
  routerIp: string | null;
  agentId: string | null;
};

export const EVERYTHING: DashboardScope = { kind: "all", siteId: null, routerIp: null, agentId: null };

export type ScopeSite = { id: string; name: string };
export type ScopeAgent = {
  id: string;
  name: string;
  isDefault: boolean;
  routerIp: string | null;
};
export type ScopeData = {
  sites: ScopeSite[];
  routers: RouterInfo[];
  // Every agent, including the account owner's own profile (isDefault).
  agents: ScopeAgent[];
};

export function shortRouterName(name: string) {
  return name.split(" (")[0];
}

// --- What can be filtered -----------------------------------------------------

export type ScopeOptions = {
  sites: ScopeSite[];
  routers: Array<{ ip: string; name: string; siteId: string | null; siteName: string | null }>;
  // The owner's own selling ("direct sales") first, then every real agent.
  agents: Array<{ id: string; label: string; isAdmin: boolean; routerName: string | null }>;
  // Only offered when there is more than one thing to choose between.
  canFilterBySite: boolean;
  canFilterByRouter: boolean;
  canFilterByAgent: boolean;
  hasAnyFilter: boolean;
};

export function buildScopeOptions(data: ScopeData): ScopeOptions {
  const siteName = (id: string | null) => data.sites.find((site) => site.id === id)?.name ?? null;
  const routers = data.routers.map((router) => ({
    ip: router.ip,
    name: shortRouterName(router.name),
    siteId: router.siteId ?? null,
    siteName: siteName(router.siteId ?? null),
  }));

  const realAgents = data.agents.filter((agent) => !agent.isDefault);
  const admin = data.agents.find((agent) => agent.isDefault);
  const routerNameOf = (ip: string | null) =>
    ip ? (routers.find((router) => router.ip === ip)?.name ?? null) : null;

  const agents = [
    ...(admin ? [{ id: admin.id, label: "Admin (direct sales)", isAdmin: true, routerName: null }] : []),
    ...realAgents.map((agent) => ({
      id: agent.id,
      label: agent.name,
      isAdmin: false,
      routerName: routerNameOf(agent.routerIp),
    })),
  ];

  // With no real agents there's only the owner — nothing to choose between.
  const canFilterByAgent = realAgents.length >= 1 && agents.length > 1;
  const canFilterBySite = data.sites.length > 1;
  const canFilterByRouter = routers.length > 1;

  return {
    sites: data.sites,
    routers,
    agents,
    canFilterBySite,
    canFilterByRouter,
    canFilterByAgent,
    hasAnyFilter: canFilterBySite || canFilterByRouter || canFilterByAgent,
  };
}

// Drops anything that no longer exists (a deleted site or router) or that
// isn't offered any more (down to one site, say) rather than trusting it.
export function normalizeScope(scope: DashboardScope, options: ScopeOptions): DashboardScope {
  if (scope.kind === "site") {
    if (!options.canFilterBySite) return EVERYTHING;
    const site = options.sites.find((s) => s.id === scope.siteId);
    if (!site) return { ...EVERYTHING, kind: "site" };
    const router = options.routers.find((r) => r.ip === scope.routerIp && r.siteId === site.id);
    return { kind: "site", siteId: site.id, routerIp: router ? router.ip : null, agentId: null };
  }
  if (scope.kind === "router") {
    if (!options.canFilterByRouter) return EVERYTHING;
    const router = options.routers.find((r) => r.ip === scope.routerIp);
    return { kind: "router", siteId: null, routerIp: router ? router.ip : null, agentId: null };
  }
  if (scope.kind === "agent") {
    if (!options.canFilterByAgent) return EVERYTHING;
    const agent = options.agents.find((a) => a.id === scope.agentId);
    return { kind: "agent", siteId: null, routerIp: null, agentId: agent ? agent.id : null };
  }
  return EVERYTHING;
}

// The site a scope sits in — what the top bar's site menu shows.
export function siteIdOfScope(scope: DashboardScope, routers: RouterInfo[], agents: ScopeAgent[]): string | null {
  if (scope.kind === "site") return scope.siteId;
  if (scope.kind === "router") return routers.find((r) => r.ip === scope.routerIp)?.siteId ?? null;
  if (scope.kind === "agent") {
    const ip = agents.find((a) => a.id === scope.agentId)?.routerIp;
    return ip ? (routers.find((r) => r.ip === ip)?.siteId ?? null) : null;
  }
  return null;
}

// --- What a choice means ----------------------------------------------------------

export type ResolvedScope = {
  // false when the choice is effectively "everything".
  filtered: boolean;
  kind: ScopeKind;
  label: string;
  // Routers that count; null = every router.
  routerIps: Set<string> | null;
  // Only vouchers/sales made by this seller; null = every seller.
  agentId: string | null;
  isAdminDirect: boolean;
  siteName: string | null;
  routerName: string | null;
  agentName: string | null;
};

export function resolveScope(scope: DashboardScope, data: ScopeData): ResolvedScope {
  const options = buildScopeOptions(data);
  const s = normalizeScope(scope, options);

  const base: ResolvedScope = {
    filtered: false,
    kind: "all",
    label: "Everything",
    routerIps: null,
    agentId: null,
    isAdminDirect: false,
    siteName: null,
    routerName: null,
    agentName: null,
  };

  if (s.kind === "site" && s.siteId) {
    const site = options.sites.find((x) => x.id === s.siteId)!;
    const inSite = data.routers.filter((r) => r.siteId === site.id);
    const router = s.routerIp ? options.routers.find((r) => r.ip === s.routerIp) : null;
    return {
      ...base,
      filtered: true,
      kind: "site",
      label: router ? `${router.name} · ${site.name}` : site.name,
      routerIps: new Set(router ? [router.ip] : inSite.map((r) => r.ip)),
      siteName: site.name,
      routerName: router?.name ?? null,
    };
  }

  if (s.kind === "router" && s.routerIp) {
    const router = options.routers.find((r) => r.ip === s.routerIp)!;
    return {
      ...base,
      filtered: true,
      kind: "router",
      label: options.canFilterBySite && router.siteName ? `${router.name} · ${router.siteName}` : router.name,
      routerIps: new Set([router.ip]),
      siteName: router.siteName,
      routerName: router.name,
    };
  }

  if (s.kind === "agent" && s.agentId) {
    const option = options.agents.find((a) => a.id === s.agentId)!;
    const agent = data.agents.find((a) => a.id === s.agentId)!;
    return {
      ...base,
      filtered: true,
      kind: "agent",
      label: option.label,
      // An agent's customers are the people on the router they work; the
      // owner's own selling isn't tied to one router.
      routerIps: option.isAdmin ? null : new Set(agent.routerIp ? [agent.routerIp] : []),
      agentId: agent.id,
      isAdminDirect: option.isAdmin,
      agentName: option.label,
    };
  }

  return { ...base, kind: s.kind };
}

// --- Narrowing the data -------------------------------------------------------------

export function routersInScope(routers: RouterInfo[], scope: ResolvedScope): RouterInfo[] {
  return scope.routerIps ? routers.filter((router) => scope.routerIps!.has(router.ip)) : routers;
}

// NOTE: the user→router assignment depends on the FULL router list, so it
// is always computed against every router — never against the narrowed list.
export function usersInScope(users: ActiveUser[], allRouters: RouterInfo[], scope: ResolvedScope): ActiveUser[] {
  if (!scope.routerIps) return users;
  return users.filter((user) => {
    const router = routerForUser(user, allRouters);
    return !!router && scope.routerIps!.has(router.ip);
  });
}

export function vouchersInScope(vouchers: Voucher[], batches: VoucherBatch[], scope: ResolvedScope): Voucher[] {
  // Selling is attributed to whoever generated the voucher.
  if (scope.agentId) return vouchers.filter((voucher) => voucher.agentId === scope.agentId);
  if (!scope.routerIps) return vouchers;
  const routersOfBatch = new Map(batches.map((batch) => [batch.id, batch.routerIps]));
  return vouchers.filter((voucher) => {
    if (!voucher.batchId) return false;
    return (routersOfBatch.get(voucher.batchId) ?? []).some((ip) => scope.routerIps!.has(ip));
  });
}

// Vouchers that can't be tied to a router (they were never part of a batch)
// — they only appear in the overall and per-agent views.
export function unattributedVoucherCount(vouchers: Voucher[], batches: VoucherBatch[], scope: ResolvedScope): number {
  if (!scope.filtered || scope.agentId) return 0;
  const known = new Set(batches.map((batch) => batch.id));
  return vouchers.filter((voucher) => !voucher.batchId || !known.has(voucher.batchId)).length;
}

// The activity log is free text, so it's narrowed by what it mentions: the
// router's or site's name, or an agent who works there.
export function activityInScope(
  entries: ActivityLogEntry[],
  scope: ResolvedScope,
  data: ScopeData,
): ActivityLogEntry[] {
  if (!scope.filtered) return entries;
  const mentions = (message: string, term: string) => !!term && message.toLowerCase().includes(term.toLowerCase());
  const realAgents = data.agents.filter((agent) => !agent.isDefault);

  if (scope.agentId) {
    if (scope.isAdminDirect) {
      // The owner's own work: anything that isn't about a specific agent.
      return entries.filter((entry) => !realAgents.some((agent) => mentions(entry.message, agent.name)));
    }
    return entries.filter((entry) => mentions(entry.message, scope.agentName ?? ""));
  }

  const routers = data.routers.filter((router) => scope.routerIps?.has(router.ip));
  const agentsHere = realAgents.filter((agent) => agent.routerIp && scope.routerIps?.has(agent.routerIp));
  return entries.filter(
    (entry) =>
      routers.some((router) => mentions(entry.message, shortRouterName(router.name)) || mentions(entry.message, router.ip)) ||
      agentsHere.some((agent) => mentions(entry.message, agent.name)) ||
      (!!scope.siteName && mentions(entry.message, scope.siteName)),
  );
}

// --- Real figures that used to be placeholders -----------------------------------

export function totalDataUsedMb(users: ActiveUser[]): number {
  return users.reduce((sum, user) => sum + parseDataToMb(user.dataUsed), 0);
}

export function formatDataAmount(mb: number): string {
  if (mb >= 1024 * 1024) return `${(mb / 1024 / 1024).toFixed(2)} TB`;
  if (mb >= 1024) return `${(mb / 1024).toFixed(2)} GB`;
  return `${Math.round(mb)} MB`;
}
