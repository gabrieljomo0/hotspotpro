"use client";

import { localizeAmountString } from "@/components/dashboard/shared/currency";
import { RadioTower } from "lucide-react";

import { BackLink } from "@/components/dashboard/shared/BackLink";
import { UsersNavTabs } from "@/components/dashboard/active-users/UsersNavTabs";

type PppoeUser = {
  username: string;
  fullName: string;
  plan: string;
  status: "Active" | "Suspended";
  monthlyFee: string;
  nextBilling: string;
};

const PPPOE_USERS: PppoeUser[] = [
  { username: "kwabena.pppoe", fullName: "Kwabena Mensah", plan: "Home Fiber 20Mbps", status: "Active", monthlyFee: "GH₵ 250.00", nextBilling: "01 Oct 2026" },
  { username: "adjoa.pppoe", fullName: "Adjoa Boateng", plan: "Office Fiber 50Mbps", status: "Active", monthlyFee: "GH₵ 480.00", nextBilling: "05 Oct 2026" },
  { username: "yaw.pppoe", fullName: "Yaw Darko", plan: "Home Fiber 20Mbps", status: "Suspended", monthlyFee: "GH₵ 250.00", nextBilling: "—" },
];

export default function PppoeUsersPage() {
  return (
    <section className="w-full">
      <BackLink />
      <h2 className="mb-1 flex items-center gap-2 text-3xl font-bold tracking-tight md:text-4xl">
        <RadioTower className="text-[#2563eb]" size={30} />
        PPPoE Users
      </h2>
      <p className="mb-6 max-w-2xl text-sm text-[#64748b] md:text-base">
        Subscription-based customers connected over PPPoE, separate from
        hotspot voucher sales ({PPPOE_USERS.length} subscribers).
      </p>

      <UsersNavTabs />

      <article className="overflow-hidden rounded-2xl border border-[#e2e8f0] bg-white shadow-[0_8px_24px_rgba(37,99,235,0.06)]">
        <table className="w-full text-left text-sm">
          <thead className="bg-[#ffffff] text-xs text-[#64748b]">
            <tr>
              <th className="px-5 py-3 font-semibold">Username</th>
              <th className="px-5 py-3 font-semibold">Full Name</th>
              <th className="px-5 py-3 font-semibold">Plan</th>
              <th className="px-5 py-3 font-semibold">Status</th>
              <th className="px-5 py-3 font-semibold">Monthly Fee</th>
              <th className="px-5 py-3 font-semibold">Next Billing</th>
            </tr>
          </thead>
          <tbody>
            {PPPOE_USERS.map((user) => (
              <tr key={user.username} className="border-t border-[#f1f5f9]">
                <td className="px-5 py-3 font-mono font-semibold text-[#2563eb]">
                  {user.username}
                </td>
                <td className="px-5 py-3 text-[#0f172a]">{user.fullName}</td>
                <td className="px-5 py-3 text-[#475569]">{user.plan}</td>
                <td className="px-5 py-3">
                  <span
                    className={`rounded-full px-2.5 py-1 text-xs font-semibold ${
                      user.status === "Active"
                        ? "bg-emerald-100 text-emerald-700"
                        : "bg-red-100 text-red-700"
                    }`}
                  >
                    {user.status}
                  </span>
                </td>
                <td className="px-5 py-3 text-[#475569]">{localizeAmountString(user.monthlyFee)}</td>
                <td className="px-5 py-3 text-[#64748b]">{user.nextBilling}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </article>
    </section>
  );
}
