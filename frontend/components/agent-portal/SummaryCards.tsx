// The row of stat cards near the top of the dashboard — computed from the
// real ActiveUser list scoped to this agent's router, not sample data.
import type { ReactNode } from "react";
import { Users, Wifi, Activity, CircleDot, Signal } from "lucide-react";

import type { ActiveUser, RouterInfo } from "../dashboard/data/dashboard-data";
import { parseDataSize, formatGB } from "./realData";

export function SummaryCards({
  scopedUsers,
  router,
  showRouterName = true,
  salesCard = null,
}: {
  scopedUsers: ActiveUser[];
  router: RouterInfo | undefined;
  // False when the organization has switched off "View assigned routers".
  showRouterName?: boolean;
  // When the agent may see sales, one compact sales card (total, vouchers,
  // commission + filter) takes the place of "Total Sessions" and "Expiring Soon".
  salesCard?: ReactNode;
}) {
  const online = scopedUsers.filter((u) => u.status === "Online" || u.status === "Idle").length;
  const totalSessions = scopedUsers.length;
  const totalDataGb = scopedUsers.reduce((sum, u) => sum + parseDataSize(u.dataUsed), 0);
  const expiringSoon = scopedUsers.filter((u) => u.status === "Expiring Soon").length;

  const routerUp = router ? router.status === "Online" : null;
  const routerLabel = router ? (routerUp ? "Online" : "Offline") : "No router";
  const routerName = showRouterName ? (router?.name.split(" (")[0] ?? "No router assigned") : "Your router";

  const cards = [
    {
      title: "Users Online",
      value: String(online),
      subtitle: "Now connected",
      icon: Users,
      iconClass: "bg-[#f1f5f9] text-[#2563eb]",
    },
    {
      title: "Total Sessions",
      value: String(totalSessions),
      subtitle: "On this router",
      icon: Wifi,
      iconClass: "bg-[#f1f5f9] text-[#2563eb]",
    },
    {
      title: "Active Data Usage",
      value: formatGB(totalDataGb),
      subtitle: "This router, all-time",
      icon: Activity,
      iconClass: "bg-[#f1f5f9] text-[#475569]",
    },
    {
      title: "Expiring Soon",
      value: String(expiringSoon),
      subtitle: "Within 30 minutes",
      icon: CircleDot,
      iconClass: "bg-[#f1f5f9] text-[#2563eb]",
    },
  ].filter((card) => !(salesCard && (card.title === "Total Sessions" || card.title === "Expiring Soon")));

  const routerCard = (
    <article
      data-testid="router-status-card"
      className="min-w-0 rounded-xl bg-white p-3 shadow-sm"
    >
      <div className="flex items-start gap-2.5">
        <div
          className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-full ${ routerUp === false ? "bg-red-50 text-red-600" : "bg-[#f1f5f9] text-[#2563eb]" }`}
        >
          <Signal size={18} />
        </div>
        <div className="min-w-0">
          <p className="truncate text-xs text-[#64748b]">Router Status</p>
          <p className="mt-0.5 flex items-baseline gap-1.5">
            <span data-testid="router-percent" className="text-lg font-black leading-tight">
              {router ? (routerUp ? "99.8%" : "0%") : "—"}
            </span>
            <span
              data-testid="router-state"
              className={`inline-flex items-center gap-1 text-[11px] font-bold ${ routerUp === null ? "text-[#94a3b8]" : routerUp ? "text-[#2563eb]" : "text-red-600" }`}
            >
              <span
                className={`h-1.5 w-1.5 rounded-full ${ routerUp === null ? "bg-slate-400" : routerUp ? "bg-[#2563eb]" : "bg-red-500" }`}
              />
              {routerLabel}
            </span>
          </p>
          <p className="mt-0.5 truncate text-[11px] text-[#64748b]">{routerName}</p>
        </div>
      </div>
    </article>
  );

  // One row on a normal screen: five slots (the sales card takes two).
  return (
    <section data-testid="summary-cards" className="grid grid-cols-2 gap-3 md:grid-cols-3 lg:grid-cols-5">
      {cards.slice(0, 1).map((card) => (
        <SmallCard key={card.title} card={card} />
      ))}
      {salesCard}
      {cards.slice(1).map((card) => (
        <SmallCard key={card.title} card={card} />
      ))}
      {routerCard}
    </section>
  );
}

function SmallCard({
  card,
}: {
  card: { title: string; value: string; subtitle: string; icon: typeof Users; iconClass: string };
}) {
  const Icon = card.icon;
  return (
    <article className="min-w-0 rounded-xl bg-white p-3 shadow-sm">
      <div className="flex items-start gap-2.5">
        <div className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-full ${card.iconClass}`}>
          <Icon size={18} />
        </div>
        <div className="min-w-0">
          <p className="truncate text-xs text-[#64748b]">{card.title}</p>
          <p className="mt-0.5 truncate text-lg font-black leading-tight">{card.value}</p>
          <p className="mt-0.5 truncate text-[11px] text-[#64748b]">{card.subtitle}</p>
        </div>
      </div>
    </article>
  );
}
