"use client";

import { Clock } from "lucide-react";

import { useDashboard } from "@/components/dashboard/context/DashboardContext";
import { BackLink } from "@/components/dashboard/shared/BackLink";
import { UsersNavTabs } from "@/components/dashboard/active-users/UsersNavTabs";

export default function ExpiredUsersPage() {
  const { activityLog } = useDashboard();

  const expiredEntries = activityLog.filter(
    (entry) =>
      entry.category === "User" &&
      entry.message.toLowerCase().includes("expired"),
  );

  return (
    <section className="w-full">
      <BackLink />
      <h2 className="mb-1 flex items-center gap-2 text-3xl font-bold tracking-tight md:text-4xl">
        <Clock className="text-red-500" size={30} />
        Expired
      </h2>
      <p className="mb-6 max-w-2xl text-sm text-[#64748b] md:text-base">
        Sessions whose voucher or package time ran out and were removed
        automatically. Expired users aren&apos;t kept as records — this is a
        log of when it happened, pulled from History.
      </p>

      <UsersNavTabs />

      <article className="overflow-hidden rounded-2xl border border-red-200 bg-white shadow-[0_8px_24px_rgba(37,99,235,0.06)]">
        {expiredEntries.length === 0 ? (
          <p className="px-5 py-10 text-center text-sm text-[#94a3b8]">
            No sessions have expired yet. As soon as a user&apos;s session
            time runs out, it will show up here.
          </p>
        ) : (
          <table className="w-full text-left text-sm">
            <thead className="bg-[#ffffff] text-xs text-[#64748b]">
              <tr>
                <th className="px-5 py-3 font-semibold">When</th>
                <th className="px-5 py-3 font-semibold">Event</th>
              </tr>
            </thead>
            <tbody>
              {expiredEntries.map((entry) => (
                <tr key={entry.id} className="border-t border-[#f1f5f9]">
                  <td className="px-5 py-3 whitespace-nowrap text-[#64748b]">
                    {entry.timestamp}
                  </td>
                  <td className="px-5 py-3 text-[#0f172a]">
                    {entry.message}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </article>
    </section>
  );
}
