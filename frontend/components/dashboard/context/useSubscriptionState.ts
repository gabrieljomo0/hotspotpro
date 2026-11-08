import { usePersistedState } from "./usePersistedState";

import { sym } from "@/components/dashboard/shared/currency";
import type { BillingModel, SubscriptionSettings } from "../shared/types";

const initialSubscription: SubscriptionSettings = {
  status: "Active",
  memberSince: "Sep 04, 2026",
  monthlyFee: 6,
  billingModel: "Subscription",
  commissionRate: 5,
  commissionPaid: 0,
  commissionSinceMs: null,
  paidUntil: "Oct 25, 2026",
  daysRemaining: 36,
  billingDay: 8,
  nextBillingDate: "Oct 25, 2026",
  gracePeriodDays: 3,
  totalPaid: 6,
  successfulPayments: 1,
  lastPaymentDate: "Sep 08, 2026",
  thisMonthSales: 2540,
  totalSales: 2540,
  billingHistory: [
    {
      id: "bill-1",
      date: "Sep 08, 2026 14:11",
      timestamp: new Date(2026, 8, 8, 14, 11).getTime(),
      reference: "RENEW-4490-1M-VVB6MU",
      method: "Flutterwave",
      amount: 6,
      status: "completed",
    },
  ],
};

function randomRef(months: number) {
  const chars = "ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789";
  const suffix = Array.from({ length: 6 }, () => chars[Math.floor(Math.random() * chars.length)]).join("");
  const id = Math.floor(1000 + Math.random() * 9000);
  return `RENEW-${id}-${months}M-${suffix}`;
}

export function useSubscriptionState(
  showToast: (message: string) => void,
  logActivity: (category: "Settings", message: string) => void,
) {
  const [subscription, setSubscription] = usePersistedState<SubscriptionSettings>("subscription", initialSubscription);

  function renewSubscription(input: { months: number; paymentMethod: string; phone: string }) {
    const amount = input.months * subscription.monthlyFee;
    const now = new Date().toLocaleString("en-GB", {
      day: "2-digit",
      month: "short",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
    const reference = randomRef(input.months);

    setSubscription((current) => ({
      ...current,
      status: "Active",
      daysRemaining: current.daysRemaining + input.months * 30,
      totalPaid: current.totalPaid + amount,
      successfulPayments: current.successfulPayments + 1,
      lastPaymentDate: now,
      billingHistory: [
        {
          id: `bill-${Date.now()}`,
          date: now,
          timestamp: Date.now(),
          reference,
          method: input.paymentMethod,
          amount,
          status: "completed",
        },
        ...current.billingHistory,
      ],
    }));

    void fetch("/api/access", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ months: input.months }),
    }).catch(() => undefined);

    showToast(`Payment of ${sym()} ${amount.toFixed(2)} successful — ${input.months} month(s) added.`);
    logActivity("Settings", `Renewed subscription for ${input.months} month(s) via ${input.paymentMethod} — ${sym()} ${amount.toFixed(2)}.`);
    return reference;
  }

  // Choose how the account pays: flat monthly fee, or commission on sales.
  // Days already paid for are kept, so switching back never loses them.
  function setBillingModel(model: BillingModel) {
    if (model === subscription.billingModel) return;
    setSubscription((current) => ({
      ...current,
      billingModel: model,
      // A fresh commission period starts now; sales made before it are not charged.
      ...(model === "Commission" ? { commissionSinceMs: Date.now(), commissionPaid: 0 } : {}),
    }));
    showToast(
      model === "Commission"
        ? `Billing switched to commission — ${subscription.commissionRate}% of each router's sales.`
        : `Billing switched to the monthly subscription — ${sym()} ${subscription.monthlyFee.toFixed(2)} a month.`,
    );
    logActivity("Settings", `Changed the billing model to ${model}.`);
  }

  // Pays some or all of the commission earned so far.
  function payCommission(input: { amount: number; paymentMethod: string; phone: string }) {
    const now = new Date().toLocaleString("en-GB", { day: "2-digit", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit" });
    const chars = "ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789";
    const reference = `COMM-${Math.floor(1000 + Math.random() * 9000)}-${Array.from({ length: 6 }, () => chars[Math.floor(Math.random() * chars.length)]).join("")}`;
    setSubscription((current) => ({
      ...current,
      status: "Active",
      commissionPaid: current.commissionPaid + input.amount,
      totalPaid: current.totalPaid + input.amount,
      successfulPayments: current.successfulPayments + 1,
      lastPaymentDate: now,
      billingHistory: [
        { id: `bill-${Date.now()}`, date: now, timestamp: Date.now(), reference, method: input.paymentMethod, amount: input.amount, status: "completed" },
        ...current.billingHistory,
      ],
    }));
    showToast(`Commission payment of ${sym()} ${input.amount.toFixed(2)} successful.`);
    logActivity("Settings", `Paid ${sym()} ${input.amount.toFixed(2)} commission via ${input.paymentMethod}.`);
    return reference;
  }

  return {
    subscription,
    renewSubscription,
    setBillingModel,
    payCommission,
  };
}
