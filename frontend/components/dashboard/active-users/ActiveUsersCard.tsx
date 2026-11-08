"use client";

// The main "Active Users" table shown on the Active Users page (and, in a
// compact form, on the main dashboard). Handles searching, filtering by
// status/router/package, selecting multiple users with checkboxes, and
// bulk actions (extend access, top up data, pause/disconnect/block many
// users at once). Individual per-user actions open via ActiveUserActionsMenu.

import { useState, type MouseEvent } from "react";
import Link from "next/link";
import { Maximize2, Search } from "lucide-react";

import { useDashboard } from "../context/DashboardContext";
import { ActiveUserActionsMenu } from "./ActiveUserActionsMenu";
import { getUserId } from "./userLinks";
import { connectionStatus, routerForUser } from "./sessionInsights";
import { useDashboardScope } from "../overview/useDashboardScope";

type StatusFilter = "All" | "Online" | "Paused" | "Disconnected" | "Blocked";
type BulkAction =
  | "extend"
  | "topup"
  | "pause"
  | "disconnect"
  | "block"
  | "delete";

const BULK_ACTIONS: Array<{ key: BulkAction; label: string }> = [
  { key: "extend", label: "Extend access by…" },
  { key: "topup", label: "Top up data by…" },
  { key: "pause", label: "Pause / Resume" },
  { key: "disconnect", label: "Disconnect / Reconnect" },
  { key: "block", label: "Block / Unblock" },
  { key: "delete", label: "Delete selected" },
];

const EXTEND_UNITS = ["Minutes", "Hours", "Days"];

export function ActiveUsersCard({
  expanded = false,
  routerFilter: controlledRouterFilter,
  onRouterFilterChange,
}: {
  expanded?: boolean;
  // Optional: lets the router cards above the table choose the router.
  // Left out, the table keeps its own router filter exactly as before.
  routerFilter?: string;
  onRouterFilterChange?: (routerIp: string) => void;
} = {}) {
  const {
    users: allUsers,
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

  // On the main dashboard (the small version) the list follows the dashboard
  // filter; the full Users and Active Sessions pages show everyone and have
  // their own router filter.
  const { users: filteredUsers } = useDashboardScope();
  const users = expanded ? allUsers : filteredUsers;

  const [menuRect, setMenuRect] = useState<DOMRect | null>(null);
  const [query, setQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<StatusFilter>("All");
  const [ownRouterFilter, setOwnRouterFilter] = useState<string>("All");
  const routerFilter = controlledRouterFilter ?? ownRouterFilter;
  const setRouterFilter = (value: string) => {
    setOwnRouterFilter(value);
    onRouterFilterChange?.(value);
  };
  const [packageFilter, setPackageFilter] = useState<string>("All");
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [bulkAction, setBulkAction] = useState<BulkAction>("extend");
  const [extendAmount, setExtendAmount] = useState("1");
  const [extendUnit, setExtendUnit] = useState("Hours");
  const [topUpAmount, setTopUpAmount] = useState("1");

  function handleOpenActions(userId: string, event: MouseEvent) {
    const rect = (event.currentTarget as HTMLElement).getBoundingClientRect();
    setMenuRect(rect);
    openUserActions(userId);
  }

  function routerOf(userId: string) {
    return routerForUser(userId, routers);
  }

  function statusOf(userId: string) {
    return connectionStatus(getConnectionState(userId));
  }

  const onlineCount = users.filter(
    (user) => statusOf(getUserId(user)) === "Online",
  ).length;
  const offlineCount = users.length - onlineCount;

  const visibleUsers = expanded
    ? users.filter((user) => {
        const userId = getUserId(user);
        const matchesQuery =
          !query ||
          userId.toLowerCase().includes(query.toLowerCase()) ||
          user.voucherUsername.toLowerCase().includes(query.toLowerCase());
        const matchesStatus =
          statusFilter === "All" || statusOf(userId) === statusFilter;
        const matchesRouter =
          routerFilter === "All" || routerOf(userId)?.ip === routerFilter;
        const matchesPackage =
          packageFilter === "All" || user.package === packageFilter;
        return matchesQuery && matchesStatus && matchesRouter && matchesPackage;
      })
    : users;

  const uniquePackages = [...new Set(users.map((user) => user.package))];

  const allVisibleSelected =
    visibleUsers.length > 0 &&
    visibleUsers.every((user) => selectedIds.includes(getUserId(user)));

  function toggleSelectAllVisible() {
    const visibleIds = visibleUsers.map(getUserId);
    if (allVisibleSelected) {
      setSelectedIds((current) => current.filter((id) => !visibleIds.includes(id)));
    } else {
      setSelectedIds((current) => [...new Set([...current, ...visibleIds])]);
    }
  }

  function toggleSelectOne(userId: string) {
    setSelectedIds((current) =>
      current.includes(userId)
        ? current.filter((id) => id !== userId)
        : [...current, userId],
    );
  }

  function applyBulkAction() {
    if (selectedIds.length === 0) return;

    if (bulkAction === "extend") {
      const amount = Number(extendAmount);
      if (!amount || amount <= 0) {
        showToast("Enter a valid amount to extend access by.");
        return;
      }
      const label = `${amount} ${extendUnit}`;
      selectedIds.forEach((userId) => extendUserAccess(userId, label));
      showToast(`Extended access by ${label} for ${selectedIds.length} user(s).`);
      setSelectedIds([]);
      return;
    }

    if (bulkAction === "topup") {
      const amount = Number(topUpAmount);
      if (!amount || amount <= 0) {
        showToast("Enter a valid amount of data to top up by.");
        return;
      }
      selectedIds.forEach((userId) => topUpUserData(userId, amount));
      showToast(`Topped up ${amount} GB of data for ${selectedIds.length} user(s).`);
      setSelectedIds([]);
      return;
    }

    selectedIds.forEach((userId) => {
      if (bulkAction === "pause") togglePauseUser(userId);
      if (bulkAction === "disconnect") toggleDisconnectUser(userId);
      if (bulkAction === "block") toggleBlockUser(userId);
      if (bulkAction === "delete") deleteUser(userId);
    });

    showToast(
      `${BULK_ACTIONS.find((a) => a.key === bulkAction)?.label} applied to ${selectedIds.length} user(s).`,
    );
    setSelectedIds([]);
  }

  return (
    <article className="overflow-hidden rounded-2xl border border-[#e2e8f0] bg-white shadow-[0_8px_24px_rgba(37,99,235,0.06)] 2xl:col-span-2">
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-[#e2e8f0] px-5 py-4">
        {expanded ? (
          <h3 className="text-base font-bold">
            Active Users ({users.length})
          </h3>
        ) : (
          <Link
            href="/dashboards/active-sessions"
            className="group flex items-center gap-2"
          >
            <h3 className="text-base font-bold group-hover:text-[#2563eb]">
              Active Users ({users.length})
            </h3>
            <Maximize2
              size={14}
              className="text-[#94a3b8] group-hover:text-[#2563eb]"
            />
          </Link>
        )}
        {!expanded && (
          <Link
            href="/dashboards/active-sessions"
            className="rounded-lg border border-[#e2e8f0] px-3 py-2 text-xs font-semibold text-[#2563eb] transition hover:bg-[#ffffff]"
          >
            View all
          </Link>
        )}
      </div>

      <div className="flex items-center gap-4 border-b border-[#f1f5f9] px-5 py-3 text-xs">
        <span className="inline-flex items-center gap-1.5 font-semibold text-emerald-600">
          <span className="h-2 w-2 rounded-full bg-emerald-500" />
          {onlineCount} Online
        </span>
        <span className="inline-flex items-center gap-1.5 font-semibold text-slate-500">
          <span className="h-2 w-2 rounded-full bg-slate-400" />
          {offlineCount} Offline
        </span>
        <span className="text-[#94a3b8]">= {users.length} total</span>
      </div>

      {expanded && (
        <div className="flex flex-wrap items-center gap-3 border-b border-[#f1f5f9] px-5 py-3">
          <div className="relative">
            <Search
              size={14}
              className="absolute left-3 top-1/2 -translate-y-1/2 text-[#94a3b8]"
            />
            <input
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder="Search phone or username..."
              className="h-9 w-56 rounded-lg border border-[#e2e8f0] bg-white pl-8 pr-3 text-xs outline-none focus:border-[#2563eb]"
            />
          </div>

          <select
            value={statusFilter}
            onChange={(event) => setStatusFilter(event.target.value as StatusFilter)}
            className="h-9 rounded-lg border border-[#e2e8f0] bg-white px-3 text-xs outline-none focus:border-[#2563eb]"
          >
            {(["All", "Online", "Paused", "Disconnected", "Blocked"] as StatusFilter[]).map(
              (option) => (
                <option key={option} value={option}>
                  {option}
                </option>
              ),
            )}
          </select>

          <select
            value={routerFilter}
            onChange={(event) => setRouterFilter(event.target.value)}
            className="h-9 rounded-lg border border-[#e2e8f0] bg-white px-3 text-xs outline-none focus:border-[#2563eb]"
          >
            <option value="All">All Routers</option>
            {routers.map((router) => (
              <option key={router.ip} value={router.ip}>
                {router.name.split(" (")[0]}
              </option>
            ))}
          </select>

          <select
            value={packageFilter}
            onChange={(event) => setPackageFilter(event.target.value)}
            className="h-9 rounded-lg border border-[#e2e8f0] bg-white px-3 text-xs outline-none focus:border-[#2563eb]"
          >
            <option value="All">All Packages</option>
            {uniquePackages.map((pkgName) => (
              <option key={pkgName} value={pkgName}>
                {pkgName}
              </option>
            ))}
          </select>

          {(query || statusFilter !== "All" || routerFilter !== "All" || packageFilter !== "All") && (
            <button
              type="button"
              onClick={() => {
                setQuery("");
                setStatusFilter("All");
                setRouterFilter("All");
                setPackageFilter("All");
              }}
              className="h-9 rounded-lg border border-[#e2e8f0] bg-white px-3 text-xs font-semibold text-[#64748b] hover:bg-[#ffffff]"
            >
              Clear filters
            </button>
          )}

          <span className="text-xs text-[#94a3b8]">
            Showing {visibleUsers.length} of {users.length}
          </span>
        </div>
      )}

      {expanded && selectedIds.length > 0 && (
        <div className="flex flex-wrap items-center gap-3 border-b border-blue-200 bg-blue-50 px-5 py-3">
          <strong className="text-sm text-blue-900">
            {selectedIds.length} user(s) selected
          </strong>
          <select
            value={bulkAction}
            onChange={(event) => setBulkAction(event.target.value as BulkAction)}
            className="h-9 rounded-lg border border-blue-200 bg-white px-3 text-xs outline-none focus:border-[#2563eb]"
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
                className="h-9 w-16 rounded-lg border border-blue-200 bg-white px-2 text-xs outline-none focus:border-[#2563eb]"
              />
              <select
                value={extendUnit}
                onChange={(event) => setExtendUnit(event.target.value)}
                className="h-9 rounded-lg border border-blue-200 bg-white px-2 text-xs outline-none focus:border-[#2563eb]"
              >
                {EXTEND_UNITS.map((unit) => (
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
                className="h-9 w-16 rounded-lg border border-blue-200 bg-white px-2 text-xs outline-none focus:border-[#2563eb]"
              />
              <span className="text-xs font-semibold text-blue-900">GB</span>
            </div>
          )}
          <button
            type="button"
            onClick={applyBulkAction}
            className="h-9 rounded-lg bg-blue-600 px-4 text-xs font-bold text-white hover:bg-blue-700"
          >
            Apply Action
          </button>
          <button
            type="button"
            onClick={() => setSelectedIds([])}
            className="ml-auto text-xs font-semibold text-blue-700 hover:underline"
          >
            Clear selection
          </button>
        </div>
      )}

      <div
        className={
          expanded
            ? "overflow-x-auto"
            : "h-[440px] min-h-[220px] resize-y overflow-auto overscroll-contain"
        }
      >
        <table
          className={
            expanded
              ? "w-full text-left text-xs"
              : "w-full min-w-[1800px] text-left text-xs"
          }
        >
          <thead className="sticky top-0 z-10 bg-[#ffffff] text-[#64748b]">
            <tr>
              {expanded && (
                <th className="px-4 py-4">
                  <input
                    type="checkbox"
                    checked={allVisibleSelected}
                    onChange={toggleSelectAllVisible}
                    aria-label="Select all visible users"
                  />
                </th>
              )}
              <th className="px-4 py-4 font-semibold">Phone Number</th>
              <th className="px-3 py-4 font-semibold">Router</th>
              <th className="px-3 py-4 font-semibold">Access Type</th>
              <th className="px-3 py-4 font-semibold">Package / Source</th>
              <th className="px-3 py-4 font-semibold">Voucher Username</th>
              <th className="px-3 py-4 font-semibold">Voucher Password</th>
              <th className="px-3 py-4 font-semibold">Duration</th>
              <th className="px-3 py-4 font-semibold">Time Spent</th>
              <th className="px-3 py-4 font-semibold">Time Left</th>
              <th className="px-3 py-4 font-semibold">Data Used</th>
              <th className="px-3 py-4 font-semibold">Data Left</th>
              <th className="px-3 py-4 font-semibold">Expires At</th>
              <th className="px-3 py-4 font-semibold">Status</th>
              <th className="px-3 py-4 text-center font-semibold">
                Actions
              </th>
            </tr>
          </thead>

          <tbody>
            {visibleUsers.length === 0 && expanded && (
              <tr>
                <td colSpan={14} className="px-5 py-10 text-center text-[#94a3b8]">
                  No users match this filter.
                </td>
              </tr>
            )}

            {visibleUsers.map((user) => {
              const userId = getUserId(user);
              const status = statusOf(userId);

              const statusClasses =
                status === "Online"
                  ? "text-emerald-600"
                  : status === "Paused"
                    ? "text-amber-600"
                    : status === "Disconnected"
                      ? "text-slate-500"
                      : "text-red-600";

              const dotClasses =
                status === "Online"
                  ? "bg-emerald-500"
                  : status === "Paused"
                    ? "bg-amber-500"
                    : status === "Disconnected"
                      ? "bg-slate-400"
                      : "bg-red-500";

              return (
                <tr
                  key={user.voucherUsername}
                  className={`border-t border-[#f1f5f9] transition hover:bg-[#f1f5f9] ${
                    selectedIds.includes(userId) ? "bg-[#f1f5f9]" : ""
                  }`}
                >
                  {expanded && (
                    <td className="px-4 py-4">
                      <input
                        type="checkbox"
                        checked={selectedIds.includes(userId)}
                        onChange={() => toggleSelectOne(userId)}
                        aria-label={`Select ${userId}`}
                      />
                    </td>
                  )}
                  <td className="px-4 py-4 font-semibold">
                    <span className="mr-2 inline-block h-2 w-2 rounded-full bg-emerald-500" />
                    {user.phone || (
                      <span className="font-normal text-[#94a3b8]">
                        Not provided
                      </span>
                    )}
                  </td>

                  <td className="px-3 py-4">
                    {routerOf(userId) ? (
                      <span className="inline-flex items-center gap-1 rounded-full bg-blue-100 px-2.5 py-1 text-[11px] font-semibold text-blue-700">
                        {routerOf(userId)?.name.split(" (")[0]}
                      </span>
                    ) : (
                      <span className="text-[#94a3b8]">—</span>
                    )}
                  </td>

                  <td className="px-3 py-4">
                    <span
                      className={`rounded-full px-3 py-1.5 text-[11px] font-semibold ${
                        user.accessType === "Package"
                          ? "bg-blue-100 text-blue-700"
                          : "bg-blue-100 text-blue-700"
                      }`}
                    >
                      {user.accessType}
                    </span>
                  </td>

                  <td className="px-3 py-4">{user.package}</td>
                  <td className="px-3 py-4 font-mono font-semibold">
                    {user.voucherUsername}
                  </td>
                  <td className="px-3 py-4 font-mono font-semibold">
                    {user.voucherPassword}
                  </td>
                  <td className="px-3 py-4">{user.duration}</td>
                  <td className="px-3 py-4 font-semibold text-[#475569]">
                    {user.timeSpent}
                  </td>
                  <td className="px-3 py-4">
                    <span className="rounded-full bg-amber-100 px-2.5 py-1 font-semibold text-amber-700">
                      {user.timeLeft}
                    </span>
                  </td>
                  <td className="px-3 py-4">{user.dataUsed}</td>
                  <td className="px-3 py-4 font-semibold text-[#2563eb]">
                    {user.dataLeft}
                  </td>
                  <td
                    className={`px-3 py-4 ${expanded ? "" : "whitespace-nowrap"}`}
                  >
                    {user.expiresAt}
                  </td>

                  <td className="px-3 py-4">
                    <span
                      className={`inline-flex items-center gap-2 font-semibold ${statusClasses}`}
                    >
                      <span className={`h-2 w-2 rounded-full ${dotClasses}`} />
                      {status}
                    </span>
                  </td>

                  <td className="px-3 py-4 text-center">
                    <button
                      type="button"
                      onClick={(event) => handleOpenActions(userId, event)}
                      className="rounded-lg border border-[#e2e8f0] bg-white px-3 py-2 text-xs font-semibold text-[#475569] hover:bg-[#f1f5f9]"
                    >
                      Actions
                    </button>

                    {openUserAction === userId && (
                      <ActiveUserActionsMenu
                        userId={userId}
                        anchorRect={menuRect}
                        onClose={closeAllActionMenus}
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
  );
}
