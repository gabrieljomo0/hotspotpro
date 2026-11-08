import { useState } from "react";

import type { BillingSubscription, BillingHistoryRecord } from "../shared/types";

function isoDaysFromNow(days: number): string {
  const d = new Date();
  d.setDate(d.getDate() + days);
  return d.toISOString();
}

const initialBilling: BillingSubscription = {
  status: "Active",
  monthlyFee: 6,
  memberSince: "Sep 04, 2026",
  paidUntilIso: isoDaysFromNow(36),
  billingDay: 8,
  graceDays: 3,
  history: [
    {
      id: "bill-1",
      date: "Sep 08, 2026 14:11",
      reference: "RENEW-4490-1M-VVB6MU",
      method: "Flutterwave",
      amount: 6,
      status: "completed",
    },
  ],
};

function formatDisplayDate(iso: string): string {
  return new Date(iso).toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric" });
}

function generateReference(months: number): string {
  const random = Math.random().toString(36).slice(2, 8).toUpperCase();
  return `RENEW-${Math.floor(1000 + Math.random() * 9000)}-${months}M-${random}`;
}

export function useBillingState(
  showToast: (message: string) => void,
  logActivity: (category: "Settings", message: string) => void,
) {
  const [billing, setBilling] = useState<BillingSubscription>(initialBilling);

  const paidUntilDate = new Date(billing.paidUntilIso);
  const daysRemaining = Math.max(
    0,
    Math.ceil((paidUntilDate.getTime() - Date.now()) / (1000 * 60 * 60 * 24)),
  );
  const isPastDue = daysRemaining <= 0;
  const balanceDue = isPastDue ? billing.monthlyFee : 0;

  function renewSubscription(input: { months: number; method: string; phone: string }) {
    const amount = input.months * billing.monthlyFee;
    const base = billing.paidUntilIso && new Date(billing.paidUntilIso) > new Date()
      ? new Date(billing.paidUntilIso)
      : new Date();
    base.setMonth(base.getMonth() + input.months);

    const record: BillingHistoryRecord = {
      id: `bill-${Date.now()}`,
      date: new Date().toLocaleString("en-GB", {
        day: "2-digit",
        month: "short",
        year: "numeric",
        hour: "2-digit",
        minute: "2-digit",
      }),
      reference: generateReference(input.months),
      method: "Flutterwave",
      amount,
      status: "completed",
    };

    setBilling((current) => ({
      ...current,
      status: "Active",
      paidUntilIso: base.toISOString(),
      history: [record, ...current.history],
    }));

    showToast(`Subscription renewed for ${input.months} month${input.months === 1 ? "" : "s"} — $${amount.toFixed(2)} paid.`);
    logActivity("Settings", `Renewed subscription for ${input.months} month(s) via ${input.method} ($${amount.toFixed(2)}).`);
    return record;
  }

  return {
    billing,
    daysRemaining,
    isPastDue,
    balanceDue,
    paidUntilDisplay: formatDisplayDate(billing.paidUntilIso),
    renewSubscription,
  };
}
