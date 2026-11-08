"use client";

// "How do you want to pay?" — the two billing models side by side, with a
// comparison worked out from this month's real sales.

import { Check, Percent, CalendarClock } from "lucide-react";

import { useDashboard } from "../context/DashboardContext";
import { money } from "../shared/currency";
import type { BillingModel } from "../shared/types";
import { askConfirm } from "../shared/askConfirm";
import { useCommissionFigures } from "./useCommissionFigures";

export function BillingModelChooser() {
  const { subscription, setBillingModel, showToast } = useDashboard();
  const fig = useCommissionFigures("this-month");
  const current = subscription.billingModel;
  const fee = subscription.monthlyFee;
  const cheaper = fig.monthCommission < fee ? "Commission" : fig.monthCommission > fee ? "Subscription" : "Same";

  async function choose(model: BillingModel) {
    if (model === current) return;
    if (current === "Commission" && fig.balanceDue > 0) {
      showToast(`Pay your commission balance of ${money(fig.balanceDue)} before switching to the monthly subscription.`);
      return;
    }
    const ok = await askConfirm(
      model === "Commission"
        ? `Switch to commission billing? You will pay ${subscription.commissionRate}% of each router's sales instead of the ${money(fee)} monthly fee. Commission starts counting from now. Subscription days you already paid for are kept.`
        : `Switch to the monthly subscription? You will pay a flat ${money(fee)} a month and no commission on sales.`,
      model === "Commission" ? "Switch to commission" : "Switch to subscription",
    );
    if (ok) setBillingModel(model);
  }

  const options: { model: BillingModel; icon: typeof Percent; title: string; price: string; points: string[] }[] = [
    {
      model: "Subscription",
      icon: CalendarClock,
      title: "Monthly subscription",
      price: `${money(fee)} / month`,
      points: ["One flat fee, paid ahead", "No commission on your sales", "Best when your sales are high"],
    },
    {
      model: "Commission",
      icon: Percent,
      title: "Commission on sales",
      price: `${subscription.commissionRate}% of each router's sales`,
      points: ["Pay only when you sell", "Worked out for every router separately", "Best when you are starting out or sales are low"],
    },
  ];

  return (
    <section data-testid="billing-chooser" className="mb-5 rounded-2xl bg-white p-6">
      <h3 className="text-base font-bold text-[#1a1a1a]">How do you want to pay?</h3>
      <p className="mb-4 text-xs text-[#737373]">Pick one. You can change it later.</p>

      <div className="grid gap-4 md:grid-cols-2">
        {options.map((o) => {
          const Icon = o.icon;
          const selected = current === o.model;
          return (
            <button
              key={o.model}
              type="button"
              data-testid={`model-${o.model}`}
              aria-pressed={selected}
              onClick={() => choose(o.model)}
              className={`rounded-xl border-2 p-5 text-left transition ${selected ? "border-[#1a1a1a] bg-[#f4f4f4]" : "border-[#e6e6e6] bg-white hover:border-[#a3a3a3]"}`}
            >
              <div className="flex items-start justify-between gap-3">
                <span className={`flex h-10 w-10 items-center justify-center rounded-lg ${selected ? "bg-[#1a1a1a] text-white" : "bg-[#f4f4f4] text-[#525252]"}`}>
                  <Icon size={18} />
                </span>
                {selected && (
                  <span className="inline-flex items-center gap-1 rounded-md bg-[#1a1a1a] px-2 py-1 text-xs font-bold text-white">
                    <Check size={12} /> Your plan
                  </span>
                )}
              </div>
              <p className="mt-3 text-base font-bold text-[#1a1a1a]">{o.title}</p>
              <p className="text-sm font-semibold text-[#1a1a1a]">{o.price}</p>
              <ul className="mt-3 space-y-1 text-sm text-[#525252]">
                {o.points.map((p) => (
                  <li key={p}>• {p}</li>
                ))}
              </ul>
            </button>
          );
        })}
      </div>

      <div data-testid="billing-compare" className="mt-4 rounded-xl border border-[#e6e6e6] px-4 py-3 text-sm text-[#525252]">
        This month so far you sold <strong className="text-[#1a1a1a]">{money(fig.monthSales)}</strong>. On commission that would cost{" "}
        <strong className="text-[#1a1a1a]">{money(fig.monthCommission)}</strong>; the subscription costs <strong className="text-[#1a1a1a]">{money(fee)}</strong>.{" "}
        {cheaper === "Same" ? "They cost the same." : <>{cheaper} is cheaper right now.</>}
      </div>
    </section>
  );
}
