"use client";

import { use, useState, type MouseEvent } from "react";
import Link from "next/link";
import { Search, Users as UsersIcon } from "lucide-react";

import { useDashboard } from "@/components/dashboard/context/DashboardContext";
import { AgentPortalPage } from "@/components/agent-portal/AgentPortalPage";
import { getScopedUsers } from "@/components/agent-portal/realData";
import { getUserId } from "@/components/dashboard/active-users/userLinks";
import { connectionStatus } from "@/components/dashboard/active-users/sessionInsights";
import { ActiveUserActionsMenu } from "@/components/dashboard/active-users/ActiveUserActionsMenu";
import {
  AgentUserRoutes,
  hasFullUserControl,
  useUserRoutes,
} from "@/components/dashboard/active-users/userRoutes";
import type { AgentProfile } from "@/components/dashboard/shared/types";

type StatusFilter = "All" | "Online" | "Paused" | "Disconnected" | "Blocked";
type BulkAction = "extend" | "topup" | "pause" | "disconnect" | "block" | "delete";

const BULK_ACTIONS: Array<{ key: BulkAction; label: string }> = [
  { key: "extend", label: "Extend access by…" },
  { key: "topup", label: "Top up data by…" },
  { key: "pause", label: "Pause / Resume" },
  { key: "disconnect", label: "Disconnect / Reconnect" },
  { key: "block", label: "Block / Unblock" },
  { key: "delete", label: "Delete selected" },
];

const STATUS_COLOR: Record<string, { text: string; dot: string }> = {
  Online: { text: "text-[#1a1a1a]", dot: "bg-[#1a1a1a]" },
  Paused: { text: "text-[#1a1a1a]", dot: "bg-[#1a1a1a]" },
  Disconnected: { text: "text-slate-500", dot: "bg-slate-400" },
  Blocked: { text: "text-red-600", dot: "bg-red-500" },
};

// The admin's Active Users table, trimmed down. What shows up (columns,
// the Actions menu, bulk actions) follows the agent's permissions; with full
// control over users it is everything the admin has.
function AgentUsersTable({ agent }: { agent: AgentProfile }) {
  const routes = useUserRoutes();
  const {
    users,
    routers,
    getConnectionState,
    openUserAction,
    openUserActions,
    closeAllActionMenus,
    togglePauseUser,
    toggleDisconnectUser,
    toggleBlockUser,
    deleteUser,
    topUpUserData,
    extendUserAccess,
    showToast,
  } = useDashboard();

  const [query, setQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<StatusFilter>("All");
  const [packageFilter, setPackageFilter] = useState("All");
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [bulkAction, setBulkAction] = useState<BulkAction>("extend");
  const [extendAmount, setExtendAmount] = useState("1");
  const [extendUnit, setExtendUnit] = useState("Hours");
  const [topUpAmount, setTopUpAmount] = useState("1");
  const [menuRect, setMenuRect] = useState<DOMRect | null>(null);

  const full = hasFullUserControl(agent);
  const canSeeSessions = agent.permissions["users.viewSessions"] === "Allowed";
  const hasActions = routes.can("extend-access") || routes.can("pause") || routes.can("block") || routes.can("details");

  const scoped = getScopedUsers(users, routers, agent.routerIp);
  const statusOf = (userId: string) => connectionStatus(getConnectionState(userId));
  const onlineCount = scoped.filter((u) => statusOf(getUserId(u)) === "Online").length;

  const visible = scoped.filter((u) => {
    const id = getUserId(u);
    if (statusFilter !== "All" && statusOf(id) !== statusFilter) return false;
    if (packageFilter !== "All" && u.package !== packageFilter) return false;
    if (!query) return true;
    const q = query.toLowerCase();
    return id.toLowerCase().includes(q) || u.voucherUsername.toLowerCase().includes(q) || (u.macAddress ?? "").toLowerCase().includes(q);
  });
  const packageNames = Array.from(new Set(scoped.map((u) => u.package)));

  const visibleIds = visible.map(getUserId);
  const allSelected = visibleIds.length > 0 && visibleIds.every((id) => selectedIds.includes(id));

  function applyBulk() {
    if (selectedIds.length === 0) return;
    if (bulkAction === "extend") {
      const amount = Number(extendAmount);
      if (!amount || amount <= 0) return showToast("Enter a valid amount to extend access by.");
      selectedIds.forEach((id) => extendUserAccess(id, `${amount} ${extendUnit}`));
      showToast(`Extended access by ${amount} ${extendUnit} for ${selectedIds.length} user(s).`);
    } else if (bulkAction === "topup") {
      const amount = Number(topUpAmount);
      if (!amount || amount <= 0) return showToast("Enter a valid amount of data to top up by.");
      selectedIds.forEach((id) => topUpUserData(id, amount));
      showToast(`Topped up ${amount} GB of data for ${selectedIds.length} user(s).`);
    } else {
      selectedIds.forEach((id) => {
        if (bulkAction === "pause") togglePauseUser(id);
        if (bulkAction === "disconnect") toggleDisconnectUser(id);
        if (bulkAction === "block") toggleBlockUser(id);
        if (bulkAction === "delete") deleteUser(id);
      });
      showToast(`${BULK_ACTIONS.find((a) => a.key === bulkAction)?.label} applied to ${selectedIds.length} user(s).`);
    }
    setSelectedIds([]);
  }

  function openMenu(userId: string, event: React.MouseEvent<HTMLElement>) {
    setMenuRect((event.currentTarget as HTMLElement).getBoundingClientRect());
    openUserActions(userId);
  }

  const selectClass = "h-9 rounded-lg border border-[#d4d4d4] bg-white px-3 text-xs outline-none focus:border-[#1a1a1a]";

  return (
    <article
      data-testid="agent-users-card"
      className="overflow-hidden rounded-2xl bg-white shadow-sm"
    >
      <div className="flex flex-wrap items-center justify-between gap-3 border-b px-5 py-4">
        <h3 className="text-base font-bold">Active Users ({scoped.length})</h3>
        <div className="flex items-center gap-4 text-xs">
          <span data-testid="users-online" className="inline-flex items-center gap-1.5 font-semibold text-[#1a1a1a]">
            <span className="h-2 w-2 rounded-full bg-[#1a1a1a]" />
            {onlineCount} Online
          </span>
          <span className="inline-flex items-center gap-1.5 font-semibold text-slate-500">
            <span className="h-2 w-2 rounded-full bg-slate-400" />
            {scoped.length - onlineCount} Offline
          </span>
        </div>
      </div>

      <div className="flex flex-wrap items-center gap-3 border-b border-[#f4f4f4] px-5 py-3">
        <div className="relative">
          <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-[#a3a3a3]" />
          <input
            data-testid="users-search"
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="Search phone or username..."
            className="h-9 w-56 rounded-lg border border-[#d4d4d4] bg-white pl-8 pr-3 text-xs outline-none focus:border-[#1a1a1a]"
          />
        </div>
        <select
          data-testid="users-status"
          value={statusFilter}
          onChange={(event) => setStatusFilter(event.target.value as StatusFilter)}
          className={selectClass}
        >
          {(["All", "Online", "Paused", "Disconnected", "Blocked"] as StatusFilter[]).map((option) => (
            <option key={option} value={option}>
              {option === "All" ? "All statuses" : option}
            </option>
          ))}
        </select>
        <select
          data-testid="users-package"
          value={packageFilter}
          onChange={(event) => setPackageFilter(event.target.value)}
          className={selectClass}
        >
          <option value="All">All packages</option>
          {packageNames.map((name) => (
            <option key={name} value={name}>
              {name}
            </option>
          ))}
        </select>
        <span className="text-xs text-[#a3a3a3]">
          Showing {visible.length} of {scoped.length}
        </span>
      </div>

      {full && selectedIds.length > 0 && (
        <div data-testid="users-bulk-bar" className="flex flex-wrap items-center gap-3 border-b bg-[#f4f4f4] px-5 py-3">
          <strong className="text-sm text-[#1a1a1a]">{selectedIds.length} user(s) selected</strong>
          <select
            data-testid="users-bulk-action"
            value={bulkAction}
            onChange={(event) => setBulkAction(event.target.value as BulkAction)}
            className="h-9 rounded-lg border border-[#d4d4d4] bg-white px-3 text-xs outline-none focus:border-[#1a1a1a]"
          >
            {BULK_ACTIONS.map((action) => (
              <option key={action.key} value={action.key}>
                {action.label}
              </option>
            ))}
          </select>
          {bulkAction === "extend" && (
            <div className="flex items-center gap-1.5">
              <input
                type="number"
                min={1}
                value={extendAmount}
                onChange={(event) => setExtendAmount(event.target.value)}
                className="h-9 w-16 rounded-lg border border-[#d4d4d4] bg-white px-2 text-xs outline-none focus:border-[#1a1a1a]"
              />
              <select
                value={extendUnit}
                onChange={(event) => setExtendUnit(event.target.value)}
                className="h-9 rounded-lg border border-[#d4d4d4] bg-white px-2 text-xs outline-none focus:border-[#1a1a1a]"
              >
                {["Minutes", "Hours", "Days"].map((unit) => (
                  <option key={unit} value={unit}>
                    {unit}
                  </option>
                ))}
              </select>
            </div>
          )}
          {bulkAction === "topup" && (
            <div className="flex items-center gap-1.5">
              <input
                type="number"
                min={0.1}
                step={0.1}
                value={topUpAmount}
                onChange={(event) => setTopUpAmount(event.target.value)}
                className="h-9 w-16 rounded-lg border border-[#d4d4d4] bg-white px-2 text-xs outline-none focus:border-[#1a1a1a]"
              />
              <span className="text-xs font-semibold text-[#1a1a1a]">GB</span>
            </div>
          )}
          <button
            type="button"
            data-testid="users-bulk-apply"
            onClick={applyBulk}
            className="h-9 rounded-lg bg-[#1a1a1a] px-4 text-xs font-bold text-white hover:bg-[#111111]"
          >
            Apply Action
          </button>
          <button type="button" onClick={() => setSelectedIds([])} className="ml-auto text-xs font-semibold text-[#1a1a1a] hover:underline">
            Clear selection
          </button>
        </div>
      )}

      <div className="overflow-x-auto">
        <table className="w-full text-left text-xs">
          <thead className="bg-[#f7f7f7] text-[#737373]">
            <tr>
              {full && (
                <th className="px-4 py-3">
                  <input
                    type="checkbox"
                    data-testid="users-select-all"
                    checked={allSelected}
                    onChange={() =>
                      setSelectedIds((current) =>
                        allSelected ? current.filter((id) => !visibleIds.includes(id)) : [...new Set([...current, ...visibleIds])],
                      )
                    }
                    aria-label="Select all visible users"
                  />
                </th>
              )}
              <th className="px-4 py-3 font-semibold">Phone Number</th>
              <th className="px-3 py-3 font-semibold">Package</th>
              {full && <th className="px-3 py-3 font-semibold">Voucher Username</th>}
              {canSeeSessions && <th className="px-3 py-3 font-semibold">Time Left</th>}
              {canSeeSessions && <th className="px-3 py-3 font-semibold">Data Used</th>}
              {canSeeSessions && <th className="px-3 py-3 font-semibold">Data Left</th>}
              {canSeeSessions && <th className="px-3 py-3 font-semibold">Expires At</th>}
              <th className="px-3 py-3 font-semibold">Status</th>
              {hasActions && <th className="px-3 py-3 text-center font-semibold">Actions</th>}
            </tr>
          </thead>
          <tbody data-testid="users-rows">
            {visible.map((u) => {
              const id = getUserId(u);
              const status = statusOf(id);
              const color = STATUS_COLOR[status] ?? STATUS_COLOR.Disconnected;
              return (
                <tr
                  key={u.voucherUsername}
                  data-testid="users-row"
                  className={`border-t hover:bg-[#f4f4f4] ${selectedIds.includes(id) ? "bg-[#f4f4f4]" : ""}`}
                >
                  {full && (
                    <td className="px-4 py-3">
                      <input
                        type="checkbox"
                        checked={selectedIds.includes(id)}
                        onChange={() =>
                          setSelectedIds((current) => (current.includes(id) ? current.filter((x) => x !== id) : [...current, id]))
                        }
                        aria-label={`Select ${id}`}
                      />
                    </td>
                  )}
                  <td className="px-4 py-3 font-semibold">
                    <Link href={routes.href(id, "details")} data-testid="users-open" className="text-[#1a1a1a] hover:text-[#1a1a1a] hover:underline">
                      {u.phone || <span className="font-normal text-[#a3a3a3]">Not provided</span>}
                    </Link>
                  </td>
                  <td className="px-3 py-3">{u.package}</td>
                  {full && <td className="px-3 py-3 font-mono font-semibold">{u.voucherUsername}</td>}
                  {canSeeSessions && <td className="px-3 py-3">{u.timeLeft}</td>}
                  {canSeeSessions && <td className="px-3 py-3">{u.dataUsed}</td>}
                  {canSeeSessions && <td className="px-3 py-3 font-semibold text-[#1a1a1a]">{u.dataLeft}</td>}
                  {canSeeSessions && <td className="px-3 py-3 whitespace-nowrap">{u.expiresAt}</td>}
                  <td className="px-3 py-3">
                    <span className={`inline-flex items-center gap-2 font-semibold ${color.text}`}>
                      <span className={`h-2 w-2 rounded-full ${color.dot}`} />
                      {status}
                    </span>
                  </td>
                  {hasActions && (
                    <td className="px-3 py-3 text-center">
                      <button
                        type="button"
                        data-testid="users-actions"
                        onClick={(event) => openMenu(id, event)}
                        className="rounded-lg bg-[#f4f4f4] px-3 py-2 text-xs font-semibold text-[#525252] hover:bg-[#f4f4f4]"
                      >
                        Actions
                      </button>
                      {openUserAction === id && (
                        <ActiveUserActionsMenu userId={id} anchorRect={menuRect} onClose={closeAllActionMenus} />
                      )}
                    </td>
                  )}
                </tr>
              );
            })}
            {visible.length === 0 && (
              <tr>
                <td colSpan={10} className="px-5 py-10 text-center text-[#a3a3a3]">
                  {scoped.length === 0 ? "No users on your router yet." : "No users match this filter."}
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </article>
  );
}

export default function AgentUsersPage({
  params,
}: {
  params: Promise<{ agentId: string }>;
}) {
  const { agentId } = use(params);

  return (
    <AgentPortalPage
      agentId={agentId}
      permissionKey="users.view"
      featureLabel="Active Users"
      render={(agent) => (
        <section>
          <div className="mb-5">
            <h1 className="flex items-center gap-2 text-2xl font-black md:text-3xl">
              <UsersIcon size={26} className="text-[#1a1a1a]" />
              Active Users
            </h1>
            <p className="mt-1 text-sm text-[#737373]">
              Everyone on your router.
              {hasFullUserControl(agent) ? " You have full control — the same tools as the admin." : ""}
            </p>
          </div>
          <AgentUserRoutes agent={agent}>
            <AgentUsersTable agent={agent} />
          </AgentUserRoutes>
        </section>
      )}
    />
  );
}
