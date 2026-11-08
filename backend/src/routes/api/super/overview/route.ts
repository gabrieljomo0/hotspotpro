import { NextResponse } from "next/server";
import { liveSessionCount } from "@/server/radius";
import { isDenied, requireSuper } from "@/server/superGuard";
import { allTenantSummaries, mergeMoney, signupsPerDay } from "@/server/superStats";
import { listAccounts, listAllEvents, listAudit, platformSettings } from "@/server/store";

// Super admin: the whole platform at a glance.
export async function GET(request: Request) {
  const guard = requireSuper(request);
  if (isDenied(guard)) return guard;

  const tenants = allTenantSummaries();
  const sum = (pick: (s: (typeof tenants)[number]["stats"]) => number) => tenants.reduce((a, t) => a + pick(t.stats), 0);
  const revenue: Record<string, number> = {};
  const revenueToday: Record<string, number> = {};
  const revenue30d: Record<string, number> = {};
  for (const t of tenants) {
    mergeMoney(revenue, t.stats.revenue);
    mergeMoney(revenueToday, t.stats.revenueToday);
    mergeMoney(revenue30d, t.stats.revenue30d);
  }
  const money = (m: Record<string, number>) => Object.values(m).reduce((a, b) => a + b, 0);
  const top = [...tenants].sort((a, b) => money(b.stats.revenue30d) - money(a.stats.revenue30d)).slice(0, 5).map((t) => ({ id: t.id, name: t.name, revenue30d: t.stats.revenue30d, routers: t.stats.routers }));

  return NextResponse.json({
    totals: {
      businesses: tenants.length,
      active: tenants.filter((t) => t.status === "active").length,
      suspended: tenants.filter((t) => t.status === "suspended").length,
      accounts: listAccounts().length,
      routers: sum((s) => s.routers),
      routersOnline: sum((s) => s.routersOnline),
      vouchers: sum((s) => s.vouchers),
      agents: sum((s) => s.agents),
      installers: sum((s) => s.installers),
      activeUsers: sum((s) => s.activeUsers),
      liveSessions: liveSessionCount(),
      paymentsPaid: sum((s) => s.paymentsPaid),
      paymentsPending: sum((s) => s.paymentsPending),
      dataBytes: sum((s) => s.dataBytes),
      revenue,
      revenueToday,
      revenue30d,
    },
    signups: signupsPerDay(14),
    topBusinesses: top,
    recentActivity: listAudit(12),
    webhookEvents: listAllEvents(1).length,
    settings: platformSettings(),
  });
}
