// The "who's connected right now" table — real ActiveUser rows scoped to
// this agent's router. Block/Disconnect actions only show if the agent's
// own permissions allow them.
"use client";

import { useState } from "react";
import { Search } from "lucide-react";

import type { ActiveUser } from "../dashboard/data/dashboard-data";
import type { AgentProfile } from "../dashboard/shared/types";
import { statusClass } from "./statusClass";
import { getUserId } from "../dashboard/active-users/userLinks";

export function LiveUsersTable({
  scopedUsers,
  agent,
}: {
  scopedUsers: ActiveUser[];
  agent: AgentProfile;
}) {
  const [query, setQuery] = useState("");
  const canBlock = agent.permissions["users.block"] === "Allowed";
  const canDisconnect = agent.permissions["users.terminateOther"] === "Allowed" || agent.permissions["users.terminateOwn"] === "Allowed";
  const onlineCount = scopedUsers.filter((u) => u.status === "Online").length;

  const visible = scopedUsers.filter((u) => {
    if (!query) return true;
    const q = query.toLowerCase();
    return u.phone.toLowerCase().includes(q) || (u.macAddress ?? "").toLowerCase().includes(q);
  });

  return (
    <article className="overflow-hidden rounded-2xl bg-white shadow-sm">
      <div className="flex flex-col gap-4 border-b p-4 xl:flex-row xl:items-center">
        <div className="flex items-center gap-3">
          <h3 className="font-bold">Live Users (Now)</h3>
          <span className="rounded-md bg-[#f4f4f4] px-2 py-1 text-xs font-semibold text-[#1a1a1a]">
            {onlineCount} Online
          </span>
        </div>

        <div className="ml-auto flex w-full gap-3 xl:w-auto">
          <div className="relative flex-1 xl:w-[300px]">
            <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-[#737373]" />
            <input
              type="search"
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder="Search by phone or MAC..."
              className="h-10 w-full rounded-lg border border-[#d4d4d4] pl-10 pr-4 text-sm outline-none focus:border-[#1a1a1a] "
            />
          </div>
        </div>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full min-w-[950px] text-left text-xs">
          <thead className="bg-[#f7f7f7] text-[#737373]">
            <tr>
              <th className="px-4 py-3">User / Phone</th>
              <th className="px-4 py-3">Device</th>
              <th className="px-4 py-3">Time Left</th>
              <th className="px-4 py-3">Data Used</th>
              <th className="px-4 py-3">Data Left</th>
              <th className="px-4 py-3">Status</th>
              <th className="px-4 py-3">Package</th>
              {(canBlock || canDisconnect) && <th className="px-4 py-3">Action</th>}
            </tr>
          </thead>

          <tbody>
            {visible.map((user) => (
              <tr key={getUserId(user)} className="border-t border-slate-100 hover:bg-[#f4f4f4]">
                <td className="px-4 py-3 font-semibold">
                  <span
                    className={`mr-3 inline-block h-2 w-2 rounded-full ${ user.status === "Online" ? "bg-[#1a1a1a]" : user.status === "Idle" ? "bg-[#1a1a1a]" : user.status === "Expiring Soon" ? "bg-[#1a1a1a]" : user.status === "Blocked" ? "bg-red-500" : "bg-slate-400" }`}
                  />
                  {user.phone}
                </td>
                <td className="px-4 py-3">{user.deviceType ?? "—"}</td>
                <td className={`px-4 py-3 ${user.status === "Expiring Soon" ? "font-semibold text-[#1a1a1a]" : ""}`}>
                  {user.timeLeft}
                </td>
                <td className="px-4 py-3">{user.dataUsed}</td>
                <td className="px-4 py-3">{user.dataLeft}</td>
                <td className="px-4 py-3">
                  <span className={`rounded-md px-2 py-1 font-semibold ${statusClass(user.status)}`}>
                    {user.status}
                  </span>
                </td>
                <td className="px-4 py-3">{user.package}</td>
                {(canBlock || canDisconnect) && (
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-2">
                      {canBlock && user.status === "Blocked" ? (
                        <button type="button" className="rounded-md bg-[#f4f4f4] px-2 py-1 font-semibold text-[#1a1a1a]">
                          Unblock
                        </button>
                      ) : canDisconnect && user.status !== "Disconnected" && user.status !== "Expired" ? (
                        <button type="button" className="rounded-md bg-[#f3f1ec] px-2 py-1 font-semibold text-[#1a1a1a]">
                          Disconnect
                        </button>
                      ) : (
                        <span>—</span>
                      )}
                    </div>
                  </td>
                )}
              </tr>
            ))}
            {visible.length === 0 && (
              <tr>
                <td colSpan={8} className="px-4 py-8 text-center text-[#a3a3a3]">
                  No users on this router yet.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      <div className="flex items-center justify-between border-t px-4 py-3 text-xs">
        <p className="text-[#737373]">Showing {visible.length} of {scopedUsers.length} users on this router</p>
      </div>
    </article>
  );
}
