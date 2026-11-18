"use client";

// This router's Internet Users tab: live check-in names joined to Active Users.
import Link from "next/link";
import { Users } from "lucide-react";

import { useDashboard } from "../../context/DashboardContext";
import { getUserId } from "../../active-users/userLinks";
import { connectionStatus } from "../../active-users/sessionInsights";

export function InternetUsersTab({
  names,
  routerIp,
}: {
  names: string[];
  routerIp: string;
}) {
  const { users, getConnectionState } = useDashboard();
  const rows = names.map((name) => {
    const user =
      users.find(
        (u) =>
          u.voucherUsername.toLowerCase() === name.toLowerCase() ||
          getUserId(u).toLowerCase() === name.toLowerCase(),
      ) ?? null;
    const id = user ? getUserId(user) : name;
    const status = user ? connectionStatus(getConnectionState(id)) : "Online";
    return { name, user, id, status };
  });

  return (
    <article className="rounded-2xl border border-[#d4d4d4] bg-white p-5 shadow-[0_8px_24px_rgba(26,26,26,0.06)]">
      <p className="mb-3 flex items-center gap-2 text-sm font-bold text-[#1a1a1a]">
        <Users size={16} className="text-[#1a1a1a]" />
        Connected Users ({names.length})
      </p>
      {names.length === 0 ? (
        <p className="text-sm text-[#a3a3a3]">
          No one is signed in on this router. The list updates on each check-in.
        </p>
      ) : (
        <div className="space-y-2">
          {rows.map(({ name, user, id, status }) => (
            <div
              key={`${routerIp}-${name}`}
              className="flex items-center justify-between rounded-lg bg-[#ffffff] px-4 py-2.5 text-sm"
            >
              <div>
                <Link
                  href={`/dashboards/active-users/${encodeURIComponent(id)}`}
                  className="font-semibold text-[#1a1a1a] hover:underline"
                >
                  {user?.phone || name}
                </Link>
                <p className="text-xs text-[#737373]">
                  {name}
                  {user?.macAddress ? ` · ${user.macAddress}` : ""}
                  {user?.package ? ` · ${user.package}` : ""}
                </p>
              </div>
              <div className="flex items-center gap-2">
                <span className="text-xs font-semibold text-[#525252]">{status}</span>
                <Link
                  href={`/dashboards/active-users/${encodeURIComponent(id)}/disconnect`}
                  className="rounded-md bg-[#f3f1ec] px-2 py-1 text-xs font-semibold text-[#1a1a1a] hover:bg-[#ebe6dc]"
                >
                  Disconnect
                </Link>
              </div>
            </div>
          ))}
        </div>
      )}
    </article>
  );
}
