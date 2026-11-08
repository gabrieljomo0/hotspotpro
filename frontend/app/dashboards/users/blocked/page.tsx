"use client";

import { Ban } from "lucide-react";

import { useDashboard } from "@/components/dashboard/context/DashboardContext";
import { BackLink } from "@/components/dashboard/shared/BackLink";
import { UsersNavTabs } from "@/components/dashboard/active-users/UsersNavTabs";
import { getUserId, userActionHref } from "@/components/dashboard/active-users/userLinks";
import Link from "next/link";

export default function BlockedDevicesPage() {
  const { users, getConnectionState } = useDashboard();

  const blockedUsers = users.filter(
    (user) => getConnectionState(getUserId(user)).blocked,
  );

  return (
    <section className="w-full">
      <BackLink />
      <h2 className="mb-1 flex items-center gap-2 text-3xl font-bold tracking-tight md:text-4xl">
        <Ban className="text-red-500" size={30} />
        Blocked Devices
      </h2>
      <p className="mb-6 max-w-2xl text-sm text-[#737373] md:text-base">
        {blockedUsers.length} device{blockedUsers.length === 1 ? "" : "s"}{" "}
        currently blocked from your network.
      </p>

      <UsersNavTabs />

      <article className="overflow-hidden rounded-2xl border border-red-200 bg-white shadow-[0_8px_24px_rgba(26,26,26,0.06)]">
        {blockedUsers.length === 0 ? (
          <p className="px-5 py-10 text-center text-sm text-[#a3a3a3]">
            No devices are currently blocked.
          </p>
        ) : (
          <table className="w-full text-left text-sm">
            <thead className="bg-[#ffffff] text-xs text-[#737373]">
              <tr>
                <th className="px-5 py-3 font-semibold">Phone / Username</th>
                <th className="px-5 py-3 font-semibold">Package</th>
                <th className="px-5 py-3 font-semibold">Voucher Username</th>
                <th className="px-5 py-3 font-semibold">Action</th>
              </tr>
            </thead>
            <tbody>
              {blockedUsers.map((user) => {
                const userId = getUserId(user);
                return (
                  <tr key={userId} className="border-t border-[#f4f4f4]">
                    <td className="px-5 py-3 font-semibold text-[#1a1a1a]">
                      {user.phone || user.voucherUsername}
                    </td>
                    <td className="px-5 py-3 text-[#525252]">
                      {user.package}
                    </td>
                    <td className="px-5 py-3 font-mono text-[#525252]">
                      {user.voucherUsername}
                    </td>
                    <td className="px-5 py-3">
                      <Link
                        href={userActionHref(userId, "block")}
                        className="text-xs font-semibold text-[#1a1a1a] hover:underline"
                      >
                        Manage
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
