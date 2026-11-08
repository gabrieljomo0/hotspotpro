"use client";

// The "All Agents" tab: the whole picture of your agents in one place — a few
// headline numbers (agents, today's revenue, what's owed to you, wallets and
// commission), anything waiting on your approval, and a short list of agents
// with just what you need day to day. Everything else about an agent is on
// their own page (View).

import { sym } from "@/components/dashboard/shared/currency";
import { RevenueFilter } from "./RevenueFilter";
import { defaultPeriod, isPlainToday, periodError, periodLabel, salesInPeriod, type RevenuePeriod } from "./revenuePeriod";
import { useMemo, useState, type MouseEvent } from "react";
import Link from "next/link";
import { Banknote, Landmark, MoreVertical, Search, Wallet, Percent } from "lucide-react";

import { useDashboard } from "../../context/DashboardContext";
import { ConfirmDialog } from "../../shared/ConfirmDialog";
import type { AgentProfile, AgentStatus } from "../../shared/types";
import { AgentActionsMenu } from "../AgentActionsMenu";
import {
  agentLedger,
  agentStats,
  agentStock,
  type AgentLedger,
  type AgentStats,
} from "../agentLedger";
import type { PeriodSales } from "./revenuePeriod";

function money(value: number) {
  return `${sym()} ${value.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

const FILTERS: Array<"All" | AgentStatus> = ["All", "Active", "Pending", "Suspended", "Deactivated"];

function StatCard({
  id,
  label,
  value,
  icon,
  tone,
  onClick,
  active,
}: {
  id: string;
  label: string;
  value: string;
  icon: React.ReactNode;
  tone: string;
  // When given, the card is a button that filters the list below.
  onClick?: () => void;
  active?: boolean;
}) {
  const body = (
    <>
      <p className="flex items-center gap-1.5 text-xs text-[#64748b]">
        {icon}
        {label}
      </p>
      <p className="mt-1 text-xl font-black leading-tight text-[#0f172a]">{value}</p>
    </>
  );
  if (!onClick) {
    return (
      <div data-testid={id} className={`rounded-xl border px-4 py-3 ${tone}`}>
        {body}
      </div>
    );
  }
  return (
    <button
      type="button"
      data-testid={id}
      aria-pressed={active}
      onClick={onClick}
      className={`rounded-xl border p-4 text-left transition hover:shadow-md ${tone} ${active ? "ring-2 ring-[#2563eb]" : ""}`}
    >
      {body}
    </button>
  );
}

export function AllAgentsTab({
  onEdit,
  onOpenApplications,
}: {
  onEdit: (agent: AgentProfile) => void;
  onOpenApplications: () => void;
}) {
  const {
    agents,
    approvalRequests,
    routers,
    vouchers,
    voucherBatches,
    agentCollections,
    packages,
    setAgentStatus,
  } = useDashboard();

  const [statusFilter, setStatusFilter] = useState<"All" | AgentStatus>("All");
  const [period, setPeriod] = useState<RevenuePeriod>(defaultPeriod);
  const [search, setSearch] = useState("");
  const [openMenu, setOpenMenu] = useState<string | null>(null);
  const [menuRect, setMenuRect] = useState<DOMRect | null>(null);
  const [turningOff, setTurningOff] = useState<AgentProfile | null>(null);

  // Real figures for every agent — the same numbers as on each agent's page.
  const figures = useMemo(() => {
    const priceByPackage = Object.fromEntries(
      packages.map((pkg) => [pkg.name, Number(pkg.price.replace(/[^0-9.]/g, "")) || 0]),
    );
    const now = new Date();
    return new Map<string, { stats: AgentStats; ledger: AgentLedger; period: PeriodSales }>(
      agents.map((agent) => {
        const stock = agentStock(agent.id, vouchers, voucherBatches);
        return [
          agent.id,
          {
            stats: agentStats(stock, voucherBatches, agent.id, priceByPackage),
            ledger: agentLedger(
              stock,
              agentCollections.filter((collection) => collection.agentId === agent.id),
              priceByPackage,
            ),
            period: salesInPeriod(stock.held, priceByPackage, period, now),
          },
        ] as [string, { stats: AgentStats; ledger: AgentLedger; period: PeriodSales }];
      }),
    );
  }, [agents, vouchers, voucherBatches, agentCollections, packages, period]);

  const all = [...figures.values()];
  const periodRevenue = all.reduce((sum, f) => sum + f.period.value, 0);
  const periodSold = all.reduce((sum, f) => sum + f.period.count, 0);
  const periodIsError = periodError(period) !== null;
  const totalOwed = all.reduce((sum, f) => sum + Math.max(0, f.ledger.balance), 0);
  const walletTotal = agents.reduce((sum, a) => sum + a.walletBalance, 0);
  const commissionTotal = agents.reduce((sum, a) => sum + a.earnedCommission, 0);
  const waiting = approvalRequests.filter((r) => r.status === "Pending" || r.status === "Under Review");
  const waitingApplications = waiting.filter((r) => r.type === "New Agent").length;

  const needle = search.trim().toLowerCase();
  const visible = agents.filter((agent) => {
    if (statusFilter !== "All" && agent.status !== statusFilter) return false;
    if (!needle) return true;
    const routerName = routers.find((r) => r.ip === agent.routerIp)?.name ?? "";
    return [agent.name, agent.username, agent.email, agent.phone ?? "", agent.location ?? "", routerName]
      .join(" ")
      .toLowerCase()
      .includes(needle);
  });

  function openMenuFor(id: string, event: MouseEvent) {
    const rect = (event.currentTarget as HTMLElement).getBoundingClientRect();
    setMenuRect(rect);
    setOpenMenu((current) => (current === id ? null : id));
  }

  return (
    <div data-testid="all-agents-tab">
      <div className="mb-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard
          id="card-revenue-today"
          label={isPlainToday(period) ? "Today's Revenue" : `Revenue · ${periodLabel(period)}`}
          value={money(periodIsError ? 0 : periodRevenue)}
          tone="border-blue-200 bg-blue-50"
          icon={<Banknote size={14} className="text-blue-600" />}
        />
        <StatCard id="card-owed" label="Owed to You" value={money(totalOwed)} tone="border-amber-200 bg-amber-50" icon={<Landmark size={14} className="text-amber-600" />} />
        <StatCard id="card-wallets" label="Wallet Balances" value={money(walletTotal)} tone="border-blue-200 bg-blue-50" icon={<Wallet size={14} className="text-blue-600" />} />
        <StatCard id="card-commission" label="Commission Earned" value={money(commissionTotal)} tone="border-slate-200 bg-slate-50" icon={<Percent size={14} className="text-slate-600" />} />
      </div>

      <RevenueFilter period={period} onChange={setPeriod} soldCount={periodIsError ? 0 : periodSold} />

      {waiting.length > 0 && (
        <div
          data-testid="approvals-strip"
          className="mb-5 flex flex-wrap items-center justify-between gap-3 rounded-xl border border-amber-300 bg-white px-4 py-3 text-sm text-amber-900"
        >
          <p>
            <strong>{waiting.length} request{waiting.length === 1 ? "" : "s"} need{waiting.length === 1 ? "s" : ""} your decision</strong>
            {waitingApplications > 0 && ` — ${waitingApplications} new agent application${waitingApplications === 1 ? "" : "s"}`}.
          </p>
          <div className="flex gap-2">
            {waitingApplications > 0 && (
              <button type="button" onClick={onOpenApplications} className="rounded-lg bg-amber-500 px-3 py-1.5 text-xs font-bold text-white hover:bg-amber-600">
                Review applications
              </button>
            )}
            <Link href="/dashboards/agents/approvals" className="rounded-lg border border-amber-400 bg-white px-3 py-1.5 text-xs font-bold text-amber-800 hover:bg-amber-100">
              All approvals
            </Link>
          </div>
        </div>
      )}

      <div className="mb-3 flex justify-end">
        <Link href="/dashboards/agents/tickets" data-testid="agent-tickets-link" className="rounded-lg border border-[#e2e8f0] bg-white px-3 py-1.5 text-xs font-bold text-[#475569] hover:bg-[#ffffff]">
          Agent support tickets
        </Link>
      </div>

      <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
        <div className="flex flex-wrap gap-2">
          {FILTERS.map((status) => (
            <button
              type="button"
              key={status}
              onClick={() => setStatusFilter(status)}
              className={`rounded-lg border px-3 py-2 text-xs font-semibold transition ${
                statusFilter === status
                  ? "border-[#2563eb] bg-[#f1f5f9] text-[#2563eb]"
                  : "border-[#e2e8f0] bg-white text-[#475569] hover:bg-[#ffffff]"
              }`}
            >
              {status}
            </button>
          ))}
        </div>
        <div className="relative">
          <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-[#94a3b8]" />
          <input
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            placeholder="Search"
            aria-label="Search agents"
            className="h-10 w-56 rounded-lg border border-[#e2e8f0] bg-white pl-8 pr-3 text-sm outline-none focus:border-[#2563eb]"
          />
        </div>
      </div>

      <article className="overflow-hidden rounded-2xl border border-[#e2e8f0] bg-white shadow-[0_8px_24px_rgba(37,99,235,0.06)]">
        <div className="overflow-x-auto">
          <table className="w-full min-w-[900px] text-left text-sm" data-testid="agents-table">
            <thead className="bg-[#ffffff] text-xs text-[#64748b]">
              <tr>
                <th className="px-4 py-4 font-semibold">Name</th>
                <th className="px-4 py-4 font-semibold">Phone</th>
                <th className="px-4 py-4 font-semibold">Router</th>
                <th className="px-4 py-4 font-semibold">Access</th>
                <th className="px-4 py-4 font-semibold">Sold</th>
                <th className="px-4 py-4 font-semibold">Remaining</th>
                <th className="px-4 py-4 text-right font-semibold">Revenue <span className="block text-[10px] font-normal" data-testid="revenue-col-label">{periodLabel(period)}</span></th>
                <th className="px-4 py-4 text-right font-semibold">Owed</th>
                <th className="px-4 py-4 text-center font-semibold">Actions</th>
              </tr>
            </thead>
            <tbody>
              {visible.length === 0 && (
                <tr>
                  <td colSpan={9} className="px-4 py-10 text-center text-[#94a3b8]">
                    No agents match.
                  </td>
                </tr>
              )}
              {visible.map((agent) => {
                const f = figures.get(agent.id)!;
                const on = agent.status === "Active";
                const canToggle = !agent.isDefault && agent.status !== "Pending";
                const router = routers.find((r) => r.ip === agent.routerIp);
                const hasLedger = f.ledger.consignedSold > 0 || f.ledger.totalCollected > 0;

                return (
                  <tr key={agent.id} className="border-t border-[#f1f5f9] hover:bg-[#ffffff]">
                    <td className="px-4 py-4">
                      <Link href={`/dashboards/agents/${agent.id}`} className="font-semibold text-[#0f172a] hover:text-[#2563eb]">
                        {agent.name}
                      </Link>
                      {agent.isDefault && (
                        <span className="ml-1.5 rounded-full bg-amber-100 px-2 py-0.5 text-[10px] font-bold text-amber-700">Owner</span>
                      )}
                    </td>
                    <td className="px-4 py-4 text-[#475569]" data-testid="cell-phone">{agent.phone ?? "—"}</td>
                    <td className="px-4 py-4 text-[#475569]" data-testid="cell-router">
                      {router ? router.name.split(" (")[0] : "—"}
                    </td>
                    <td className="px-4 py-4" data-testid="cell-access">
                      <div className="flex items-center gap-2.5">
                        <button
                          type="button"
                          role="switch"
                          aria-checked={on}
                          aria-label={`Access for ${agent.name}`}
                          disabled={!canToggle}
                          title={
                            agent.isDefault
                              ? "The owner always has access"
                              : agent.status === "Pending"
                                ? "Approve their application first"
                                : on
                                  ? "Turn access off"
                                  : "Turn access on"
                          }
                          onClick={() => (on ? setTurningOff(agent) : setAgentStatus(agent.id, "Active"))}
                          className={`relative h-6 w-11 shrink-0 rounded-full transition disabled:cursor-not-allowed disabled:opacity-50 ${on ? "bg-emerald-500" : "bg-[#cbd5e1]"}`}
                        >
                          <span className={`absolute top-0.5 h-5 w-5 rounded-full bg-white shadow transition-transform ${on ? "translate-x-[22px]" : "translate-x-0.5"}`} />
                        </button>
                        <span className={`text-xs font-semibold ${on ? "text-emerald-700" : agent.status === "Pending" ? "text-blue-700" : "text-[#94a3b8]"}`}>
                          {on ? "On" : agent.status === "Pending" ? "Awaiting approval" : "Off"}
                        </span>
                      </div>
                    </td>
                    <td className="px-4 py-4 text-[#475569]" data-testid="cell-sold">{periodIsError ? 0 : f.period.count}</td>
                    <td className="px-4 py-4 text-[#475569]" data-testid="cell-remaining">{f.stats.remaining}</td>
                    <td className="px-4 py-4 text-right font-semibold text-emerald-700" data-testid="cell-revenue">{money(periodIsError ? 0 : f.period.value)}</td>
                    <td className="px-4 py-4 text-right" data-testid="cell-owed">
                      {hasLedger ? (
                        <>
                          <span className="font-semibold text-amber-700">{money(Math.max(0, f.ledger.balance))}</span>
                          <span className="block text-[11px] text-[#94a3b8]">
                            {f.ledger.unsettledVouchers} voucher{f.ledger.unsettledVouchers === 1 ? "" : "s"}
                          </span>
                        </>
                      ) : (
                        <span className="text-xs text-[#94a3b8]">—</span>
                      )}
                    </td>
                    <td className="px-4 py-4 text-center">
                      <button
                        type="button"
                        aria-label={`Actions for ${agent.name}`}
                        onClick={(event) => openMenuFor(agent.id, event)}
                        className="rounded-lg border border-[#e2e8f0] bg-white p-2 text-[#475569] hover:bg-[#ffffff]"
                      >
                        <MoreVertical size={15} />
                      </button>
                      {openMenu === agent.id && (
                        <AgentActionsMenu
                          agent={agent}
                          anchorRect={menuRect}
                          onClose={() => setOpenMenu(null)}
                          onEdit={() => onEdit(agent)}
                        />
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </article>

      <ConfirmDialog
        open={turningOff !== null}
        title={turningOff ? `Turn off access for ${turningOff.name}?` : "Turn off access?"}
        subtitle={turningOff?.name}
        confirmLabel="Yes, turn access off"
        points={[
          turningOff ? `${turningOff.name} can't sign in to the agent portal any more.` : "",
          "If they try, they're told to contact admin to reactivate their access.",
          "Their vouchers, sales and collection history are all kept, and you can turn access back on any time.",
        ]}
        onCancel={() => setTurningOff(null)}
        onConfirm={() => {
          if (turningOff) setAgentStatus(turningOff.id, "Suspended");
          setTurningOff(null);
        }}
      />
    </div>
  );
}
