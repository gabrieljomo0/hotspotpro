"use client";

import { Gift, Star } from "lucide-react";
import Link from "next/link";

import { useDashboard } from "@/components/dashboard/context/DashboardContext";
import { BackLink } from "@/components/dashboard/shared/BackLink";
import { UsersNavTabs } from "@/components/dashboard/active-users/UsersNavTabs";
import { getUserId, userActionHref } from "@/components/dashboard/active-users/userLinks";

export default function LoyaltyPointsPage() {
  const { users, getLoyaltyPoints, loyaltySettings } = useDashboard();

  const rows = users
    .map((user) => ({ user, points: getLoyaltyPoints(getUserId(user)) }))
    .sort((a, b) => b.points - a.points);

  return (
    <section className="w-full">
      <BackLink />
      <h2 className="mb-1 flex items-center gap-2 text-3xl font-bold tracking-tight md:text-4xl">
        <Gift className="text-amber-500" size={30} />
        Loyalty Points
      </h2>
      <p className="mb-6 max-w-2xl text-sm text-[#64748b] md:text-base">
        {loyaltySettings.enabled
          ? `Programme active — ${loyaltySettings.pointsToVoucherThreshold} points redeems a free ${loyaltySettings.rewardPackageName} voucher.`
          : "The loyalty programme is currently disabled in Settings → Loyalty Programme."}
      </p>

      <UsersNavTabs />

      <article className="overflow-hidden rounded-2xl border border-amber-200 bg-white shadow-[0_8px_24px_rgba(37,99,235,0.06)]">
        <table className="w-full text-left text-sm">
          <thead className="bg-[#ffffff] text-xs text-[#64748b]">
            <tr>
              <th className="px-5 py-3 font-semibold">User</th>
              <th className="px-5 py-3 font-semibold">Package</th>
              <th className="px-5 py-3 font-semibold">Points</th>
              <th className="px-5 py-3 font-semibold">Progress</th>
              <th className="px-5 py-3 font-semibold">Action</th>
            </tr>
          </thead>
          <tbody>
            {rows.map(({ user, points }: { user: (typeof users)[number]; points: number }) => {
              const userId = getUserId(user);
              const pct = Math.min(
                100,
                Math.round(
                  (points / loyaltySettings.pointsToVoucherThreshold) * 100,
                ),
              );

              return (
                <tr key={userId} className="border-t border-[#f1f5f9]">
                  <td className="px-5 py-3 font-semibold text-[#0f172a]">
                    {user.phone || user.voucherUsername}
                  </td>
                  <td className="px-5 py-3 text-[#475569]">{user.package}</td>
                  <td className="px-5 py-3">
                    <span className="inline-flex items-center gap-1 font-semibold text-amber-700">
                      <Star size={13} />
                      {points}
                    </span>
                  </td>
                  <td className="px-5 py-3">
                    <div className="h-2 w-32 overflow-hidden rounded-full bg-amber-100">
                      <div
                        className="h-full bg-amber-500"
                        style={{ width: `${pct}%` }}
                      />
                    </div>
                  </td>
                  <td className="px-5 py-3">
                    <Link
                      href={userActionHref(userId, "advanced-details")}
                      className="text-xs font-semibold text-[#2563eb] hover:underline"
                    >
                      View / Redeem
                    </Link>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </article>
    </section>
  );
}
