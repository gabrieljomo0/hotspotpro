"use client";

import Link from "next/link";
import { Users } from "lucide-react";

import { useDashboard } from "../context/DashboardContext";
import { getUserId } from "../active-users/userLinks";

export function ActiveUsersStatCard() {
  const { users, getConnectionState } = useDashboard();

  const onlineCount = users.filter((user) => {
    const state = getConnectionState(getUserId(user));
    return !state.blocked && !state.disconnected && !state.paused;
  }).length;
  const offlineCount = users.length - onlineCount;

  return (
    <Link
      href="/dashboards/active-sessions"
      className="min-h-[150px] rounded-2xl border border-[#e2e8f0] bg-white p-5 shadow-[0_8px_24px_rgba(37,99,235,0.06)] transition-all duration-300 hover:-translate-y-1 hover:shadow-lg  "
    >
      <div className="flex items-center gap-4">
        <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-full bg-[#e9fbf3] text-[#0f9f6e] ">
          <Users size={27} />
        </div>

        <div className="min-w-0">
          <p className="text-sm font-medium text-[#64748b] ">Active Users</p>

          <p className="mt-2 truncate text-2xl font-bold">{users.length}</p>

          <p className="mt-3 flex flex-wrap items-center gap-x-2 gap-y-1 text-xs">
            <span className="inline-flex items-center gap-1 font-semibold text-emerald-600">
              <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" />
              {onlineCount} Online
            </span>
            <span className="inline-flex items-center gap-1 font-semibold text-slate-500">
              <span className="h-1.5 w-1.5 rounded-full bg-slate-400" />
              {offlineCount} Offline
            </span>
            <span className="text-[#94a3b8]">= {users.length} total</span>
          </p>
        </div>
      </div>
    </Link>
  );
}
