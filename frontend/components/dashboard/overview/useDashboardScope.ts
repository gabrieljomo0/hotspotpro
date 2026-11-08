"use client";

// The single place the dashboard widgets get their data from. It reads the
// current filter and returns the users, routers, vouchers and activity that
// fall inside it — so the stat cards, chart, tables and network list can
// never disagree about what "this router" or "this agent" means.

import { useMemo } from "react";

import { useDashboard } from "../context/DashboardContext";
import {
  activityInScope,
  buildScopeOptions,
  normalizeScope,
  resolveScope,
  routersInScope,
  unattributedVoucherCount,
  usersInScope,
  vouchersInScope,
  type ScopeData,
} from "./dashboardScope";

export function useDashboardScope() {
  const {
    dashboardScope,
    setDashboardScope,
    routers,
    users,
    vouchers,
    voucherBatches,
    agents,
    businessLocations,
    activityLog,
  } = useDashboard();

  const data: ScopeData = useMemo(
    () => ({
      sites: businessLocations.map((site) => ({ id: site.id, name: site.name })),
      routers,
      agents: agents.map((agent) => ({
        id: agent.id,
        name: agent.name,
        isDefault: agent.isDefault,
        routerIp: agent.routerIp,
      })),
    }),
    [businessLocations, routers, agents],
  );

  const options = useMemo(() => buildScopeOptions(data), [data]);
  const scope = useMemo(() => normalizeScope(dashboardScope, options), [dashboardScope, options]);
  const resolved = useMemo(() => resolveScope(scope, data), [scope, data]);

  const scoped = useMemo(
    () => ({
      routers: routersInScope(routers, resolved),
      users: usersInScope(users, routers, resolved),
      vouchers: vouchersInScope(vouchers, voucherBatches, resolved),
      activity: activityInScope(activityLog, resolved, data),
      unattributedVouchers: unattributedVoucherCount(vouchers, voucherBatches, resolved),
    }),
    [routers, users, vouchers, voucherBatches, activityLog, resolved, data],
  );

  return {
    data,
    options,
    scope,
    resolved,
    setScope: setDashboardScope,
    allRouters: routers,
    ...scoped,
  };
}
