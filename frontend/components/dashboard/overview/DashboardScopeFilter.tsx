"use client";

// The filter in the admin top bar: TWO small dropdowns. By default the
// dashboard shows the whole business ("Everything"). Pick "A site", "A router"
// or "An agent" in the first, then choose which one in the second, to narrow
// every figure to just that.
//
// Only what you actually have is offered: no Site choice with a single
// site, no Router choice with a single router, no Agent choice with no
// agents. With nothing to choose between, the one site/router is simply
// shown by name instead.

import Link from "next/link";
import { ArrowRight, Info, LayoutGrid, X } from "lucide-react";

import { EVERYTHING } from "./dashboardScope";
import { useDashboardScope } from "./useDashboardScope";

const selectClass =
  "h-10 rounded-xl border border-[#e2e8f0] bg-white px-3.5 text-sm font-semibold text-[#0f172a] shadow-sm outline-none transition hover:bg-[#ffffff] focus:border-[#2563eb] focus:ring-2 focus:ring-[#2563eb]/25";

export function DashboardScopeFilter() {
  const { options, scope, resolved, setScope } = useDashboardScope();

  // --- Nothing to choose between: just say what you're looking at ---------------
  if (!options.hasAnyFilter) {
    const onlyRouter = options.routers[0];
    const onlySite = options.sites[0];
    if (!onlyRouter && !onlySite) return null;
    return (
      <Link
        data-testid="scope-single"
        href={`/dashboards/revenue/router-agent-breakdown?${
          onlyRouter ? `router=${encodeURIComponent(onlyRouter.ip)}` : `site=${encodeURIComponent(onlySite.id)}`
        }`}
        className="flex items-center gap-3 rounded-xl border border-[#e2e8f0] bg-white px-4 py-3 text-sm font-semibold shadow-sm transition hover:bg-[#ffffff]"
      >
        <LayoutGrid size={16} className="text-[#64748b]" />
        {onlyRouter ? onlyRouter.name : onlySite.name}
        {onlyRouter && (onlyRouter.siteName ?? onlySite?.name) && (
          <span className="text-xs font-medium text-[#94a3b8]">· {onlyRouter.siteName ?? onlySite.name}</span>
        )}
        <ArrowRight size={14} className="text-[#2563eb]" />
      </Link>
    );
  }

  // Two simple dropdowns: first WHAT to look at (Everything, a site, a router
  // or an agent), then — only if you picked one — WHICH one.
  type Kind = "all" | "site" | "router" | "agent";
  const kind: Kind = (() => {
    if (scope.kind === "site" && scope.routerIp) return "router";
    if (scope.kind === "site" && scope.siteId) return "site";
    if (scope.kind === "router" && scope.routerIp) return "router";
    if (scope.kind === "agent" && scope.agentId) return "agent";
    return "all";
  })();
  const item =
    kind === "site" ? (scope.siteId ?? "") : kind === "router" ? (scope.routerIp ?? "") : kind === "agent" ? (scope.agentId ?? "") : "";

  const kinds: Array<{ value: Kind; label: string }> = [{ value: "all", label: "Everything" }];
  if (options.canFilterBySite) kinds.push({ value: "site", label: "A site" });
  if (options.canFilterByRouter) kinds.push({ value: "router", label: "A router" });
  if (options.canFilterByAgent) kinds.push({ value: "agent", label: "An agent" });

  function chooseKind(next: Kind) {
    if (next === "all") return setScope(EVERYTHING);
    // Start on the first one so the dashboard narrows straight away; the
    // second dropdown then picks the exact one.
    if (next === "site" && options.sites[0]) chooseItem("site", options.sites[0].id);
    if (next === "router" && options.routers[0]) chooseItem("router", options.routers[0].ip);
    if (next === "agent" && options.agents[0]) chooseItem("agent", options.agents[0].id);
  }

  function chooseItem(forKind: Kind, id: string) {
    if (forKind === "site") setScope({ kind: "site", siteId: id, routerIp: null, agentId: null });
    else if (forKind === "router") setScope({ kind: "router", siteId: null, routerIp: id, agentId: null });
    else if (forKind === "agent") setScope({ kind: "agent", siteId: null, routerIp: null, agentId: id });
  }

  // Link to the detailed breakdown for what's being looked at.
  const breakdownHref = (() => {
    if (resolved.kind === "site" && scope.siteId) {
      return `/dashboards/revenue/router-agent-breakdown?site=${encodeURIComponent(scope.siteId)}${
        scope.routerIp ? `&router=${encodeURIComponent(scope.routerIp)}` : ""
      }`;
    }
    if (resolved.kind === "router" && scope.routerIp) {
      return `/dashboards/revenue/router-agent-breakdown?router=${encodeURIComponent(scope.routerIp)}`;
    }
    if (resolved.kind === "agent" && !resolved.isAdminDirect && resolved.routerIps && resolved.routerIps.size === 1) {
      return `/dashboards/revenue/router-agent-breakdown?router=${encodeURIComponent([...resolved.routerIps][0])}`;
    }
    return null;
  })();

  return (
    <div data-testid="scope-filter" className="flex items-center gap-2">
      <select
        data-testid="scope-kind"
        aria-label="Show"
        value={kind}
        onChange={(event) => chooseKind(event.target.value as Kind)}
        className={`${selectClass} min-w-[130px]`}
      >
        {kinds.map((k) => (
          <option key={k.value} value={k.value}>
            {k.label}
          </option>
        ))}
      </select>

      {kind !== "all" && (
        <select
          data-testid="scope-item"
          aria-label={kind === "site" ? "Choose site" : kind === "router" ? "Choose router" : "Choose agent"}
          value={item}
          onChange={(event) => chooseItem(kind, event.target.value)}
          className={`${selectClass} min-w-[170px] max-w-[240px]`}
        >
          {kind === "site" &&
            options.sites.map((site) => (
              <option key={site.id} value={site.id}>
                {site.name}
              </option>
            ))}
          {kind === "router" &&
            options.routers.map((router) => (
              <option key={router.ip} value={router.ip}>
                {router.name}
              </option>
            ))}
          {kind === "agent" &&
            options.agents.map((agent) => (
              <option key={agent.id} value={agent.id}>
                {agent.label}
              </option>
            ))}
        </select>
      )}

      {resolved.filtered && (
        <button
          type="button"
          aria-label="Clear filter"
          title="Show everything again"
          onClick={() => setScope(EVERYTHING)}
          className="flex h-10 w-[36px] items-center justify-center rounded-xl text-[#2563eb] transition hover:bg-[#f1f5f9]"
        >
          <X size={20} />
        </button>
      )}

      {breakdownHref && (
        <Link href={breakdownHref} className="hidden items-center gap-1 text-xs font-semibold text-[#2563eb] hover:underline xl:inline-flex">
          Full breakdown <ArrowRight size={12} />
        </Link>
      )}
    </div>
  );
}

// The two explanations that used to sit under the filter. They are long, so
// they live on the dashboard page itself rather than in the narrow top bar.
export function DashboardScopeNotes() {
  const { resolved, unattributedVouchers } = useDashboardScope();
  if (!resolved.isAdminDirect && !(resolved.filtered && !resolved.agentId && unattributedVouchers > 0)) return null;
  return (
    <div className="mb-4 space-y-1">
      {resolved.isAdminDirect && (
        <p data-testid="scope-note" className="flex items-start gap-1.5 text-xs text-[#94a3b8]">
          <Info size={13} className="mt-0.5 shrink-0" />
          Sales are your own. Users, routers and network can&apos;t be split by seller, so they show the whole network.
        </p>
      )}
      {resolved.filtered && !resolved.agentId && unattributedVouchers > 0 && (
        <p data-testid="scope-note" className="flex items-start gap-1.5 text-xs text-[#94a3b8]">
          <Info size={13} className="mt-0.5 shrink-0" />
          {unattributedVouchers} voucher{unattributedVouchers === 1 ? "" : "s"} aren&apos;t tied to a router, so{" "}
          {unattributedVouchers === 1 ? "it only counts" : "they only count"} in Everything and agent views.
        </p>
      )}
    </div>
  );
}
