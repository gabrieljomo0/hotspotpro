"use client";

import Link from "next/link";
import { PauseCircle } from "lucide-react";

import { useDashboard } from "@/components/dashboard/context/DashboardContext";
import { BackLink } from "@/components/dashboard/shared/BackLink";
import { UsersNavTabs } from "@/components/dashboard/active-users/UsersNavTabs";
import { getUserId, userActionHref } from "@/components/dashboard/active-users/userLinks";

export default function InactiveUsersPage() {
  const { users, getConnectionState } = useDashboard();

  const inactiveUsers = users.filter(
    (user) => getConnectionState(getUserId(user)).paused,
  );

  return (
    <section className="w-full">
      <BackLink />
      <h2 className="mb-1 flex items-center gap-2 text-3xl font-bold tracking-tight md:text-4xl">
        <PauseCircle className="text-amber-500" size={30} />
        Connected but Inactive
      </h2>
      <p className="mb-6 max-w-2xl text-sm text-[#737373] md:text-base">
        Still authenticated on your network, but currently paused — not
        actively using their session ({inactiveUsers.length} right now).
      </p>

      <UsersNavTabs />

      <article className="overflow-hidden rounded-2xl border border-amber-200 bg-white shadow-[0_8px_24px_rgba(26,26,26,0.06)]">
        {inactiveUsers.length === 0 ? (
          <p className="px-5 py-10 text-center text-sm text-[#a3a3a3]">
            No connected users are currently paused/inactive.
          </p>
        ) : (
          <table className="w-full text-left text-sm">
            <thead className="bg-[#ffffff] text-xs text-[#737373]">
              <tr>
                <th className="px-5 py-3 font-semibold">Phone / Username</th>
                <th className="px-5 py-3 font-semibold">Package</th>
                <th className="px-5 py-3 font-semibold">Time Left</th>
                <th className="px-5 py-3 font-semibold">Data Left</th>
                <th className="px-5 py-3 font-semibold">Action</th>
              </tr>
            </thead>
            <tbody>
              {inactiveUsers.map((user) => {
                const userId = getUserId(user);
                return (
                  <tr key={userId} className="border-t border-[#f4f4f4]">
                    <td className="px-5 py-3 font-semibold text-[#1a1a1a]">
                      {user.phone || user.voucherUsername}
                    </td>
                    <td className="px-5 py-3 text-[#525252]">
                      {user.package}
                    </td>
                    <td className="px-5 py-3 text-[#525252]">
                      {user.timeLeft}
                    </td>
                    <td className="px-5 py-3 text-[#525252]">
                      {user.dataLeft}
                    </td>
                    <td className="px-5 py-3">
                      <Link
                        href={userActionHref(userId, "pause")}
                        className="text-xs font-semibold text-[#1a1a1a] hover:underline"
                      >
                        Resume
                      </Link>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        )}
      </article>
    </section>
  );
}
