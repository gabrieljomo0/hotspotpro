"use client";

import { localizeAmountString } from "@/components/dashboard/shared/currency";
import { Check } from "lucide-react";
import { useEffect, useState } from "react";

import { useDashboard } from "@/components/dashboard/context/DashboardContext";
import type { SubscriptionPlan } from "@/components/dashboard/shared/types";
import { BackLink } from "@/components/dashboard/shared/BackLink";

const PLANS: Array<{
  key: SubscriptionPlan;
  price: string;
  voucherLimit: string;
  routerLimit: string;
  features: string[];
}> = [
  {
    key: "Starter",
    price: "GH₵ 0 / month",
    voucherLimit: "Up to 200 vouchers/month",
    routerLimit: "1 router",
    features: ["Vouchers & packages", "Basic support"],
  },
  {
    key: "Growth",
    price: "GH₵ 150 / month",
    voucherLimit: "Up to 3,000 vouchers/month",
    routerLimit: "Up to 5 routers",
    features: [
      "Vouchers & packages",
      "Multiple agent profiles",
      "Priority support",
    ],
  },
  {
    key: "Pro",
    price: "GH₵ 450 / month",
    voucherLimit: "Unlimited vouchers",
    routerLimit: "Unlimited routers",
    features: [
      "Everything in Growth",
      "Reseller portal",
      "Dedicated account manager",
    ],
  },
];

export default function SubscriptionPage() {
  const { subscriptionPlan, setSubscriptionPlan, vouchers, packages } =
    useDashboard();
  const [access, setAccess] = useState<{ locked: boolean; mode: string; untilMs: number; graceEndsMs: number; reason: string } | null>(null);

  useEffect(() => {
    let cancelled = false;
    fetch("/api/access", { cache: "no-store" })
      .then((response) => (response.ok ? response.json() : null))
      .then((body) => { if (!cancelled && body) setAccess(body); })
      .catch(() => undefined);
    return () => { cancelled = true; };
  }, []);

  const currentPlan = PLANS.find((p) => p.key === subscriptionPlan) ?? PLANS[1];
  const accessDate = access ? new Date(access.locked ? access.graceEndsMs : access.untilMs).toLocaleDateString() : "";

  return (
    <section className="w-full">
      <BackLink />
      <h2 className="mb-1 text-3xl font-bold tracking-tight md:text-4xl">
        Subscription
      </h2>
      <p className="mb-6 max-w-2xl text-sm text-[#64748b] md:text-base">
        Manage your HotspotPro platform subscription and usage limits.
      </p>

      {access && (
        <p className={`mb-6 max-w-2xl rounded-xl border px-4 py-3 text-sm ${access.locked ? "border-red-200 bg-red-50 text-red-800" : "border-[#e2e8f0] bg-white text-[#334155]"}`}>
          {access.locked
            ? `Captive portal locked. Renew online access to turn the routers back on. ${access.reason}`
            : access.mode === "trial"
              ? `Trial is open until ${accessDate}. Vouchers are stored on each MikroTik, and the portal locks after a 3-day grace if online access is not renewed.`
              : access.mode === "grace"
                ? `Online access is overdue. The captive portal locks on ${new Date(access.graceEndsMs).toLocaleDateString()} if it is not renewed.`
                : `Online access is paid until ${accessDate}. Routers keep a local copy of vouchers, and lock themselves if this lapses.`}
        </p>
      )}

      <div className="mb-6 grid gap-4 sm:grid-cols-3">
        <div className="rounded-2xl border border-[#e2e8f0] bg-white p-5 shadow-[0_8px_24px_rgba(37,99,235,0.06)]">
          <p className="text-xs font-medium text-[#64748b]">Current Plan</p>
          <p className="mt-1 text-2xl font-bold text-[#0f172a]">
            {subscriptionPlan}
          </p>
          <p className="mt-1 text-xs text-[#64748b]">{localizeAmountString(currentPlan.price)}</p>
        </div>
        <div className="rounded-2xl border border-[#e2e8f0] bg-white p-5 shadow-[0_8px_24px_rgba(37,99,235,0.06)]">
          <p className="text-xs font-medium text-[#64748b]">
            Vouchers Issued
          </p>
          <p className="mt-1 text-2xl font-bold text-[#0f172a]">
            {vouchers.length}
          </p>
          <p className="mt-1 text-xs text-[#64748b]">
            {currentPlan.voucherLimit}
          </p>
        </div>
        <div className="rounded-2xl border border-[#e2e8f0] bg-white p-5 shadow-[0_8px_24px_rgba(37,99,235,0.06)]">
          <p className="text-xs font-medium text-[#64748b]">
            Packages Configured
          </p>
          <p className="mt-1 text-2xl font-bold text-[#0f172a]">
            {packages.length}
          </p>
          <p className="mt-1 text-xs text-[#64748b]">{currentPlan.routerLimit}</p>
        </div>
      </div>

      <div className="grid gap-5 md:grid-cols-3">
        {PLANS.map((plan) => {
          const isCurrent = plan.key === subscriptionPlan;

          return (
            <article
              key={plan.key}
              className={`rounded-2xl border p-6 shadow-[0_8px_24px_rgba(37,99,235,0.06)] ${
                isCurrent
                  ? "border-[#2563eb] bg-[#f1f5f9]"
                  : "border-[#e2e8f0] bg-white"
              }`}
            >
              <h3 className="text-lg font-black text-[#0f172a]">
                {plan.key}
              </h3>
              <p className="mt-1 text-sm text-[#64748b]">{localizeAmountString(plan.price)}</p>

              <ul className="mt-5 space-y-2 text-sm text-[#475569]">
                <li className="flex items-center gap-2">
                  <Check size={15} className="text-emerald-600" />
                  {plan.voucherLimit}
                </li>
                <li className="flex items-center gap-2">
                  <Check size={15} className="text-emerald-600" />
                  {plan.routerLimit}
                </li>
                {plan.features.map((feature) => (
                  <li key={feature} className="flex items-center gap-2">
                    <Check size={15} className="text-emerald-600" />
                    {feature}
                  </li>
                ))}
              </ul>

              <button
                type="button"
                disabled={isCurrent}
                onClick={() => setSubscriptionPlan(plan.key)}
                className="mt-6 w-full rounded-xl bg-[#2563eb] px-5 py-3 text-sm font-bold text-white hover:bg-[#1d4ed8] disabled:cursor-not-allowed disabled:bg-[#e2e8f0] disabled:text-[#94a3b8]"
              >
                {isCurrent ? "Current Plan" : `Switch to ${plan.key}`}
              </button>
            </article>
          );
        })}
      </div>
    </section>
  );
}
