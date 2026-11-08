"use client";

import { sym } from "@/components/dashboard/shared/currency";
import { useState, type FormEvent } from "react";
import { X } from "lucide-react";

import { useDashboard } from "@/components/dashboard/context/DashboardContext";

const PERIOD_OPTIONS = [
  { months: 1, label: "1 Month" },
  { months: 3, label: "3 Months" },
  { months: 6, label: "6 Months" },
  { months: 12, label: "12 Months" },
];

const PAYMENT_METHODS = ["Card or Mobile Money", "Bank Transfer"];

export function RenewSubscriptionModal({ onClose }: { onClose: () => void }) {
  const { subscription, renewSubscription } = useDashboard();
  const [months, setMonths] = useState(1);
  const [paymentMethod, setPaymentMethod] = useState(PAYMENT_METHODS[0]);
  const [phone, setPhone] = useState("+233241948202");

  const amount = months * subscription.monthlyFee;
  const needsPhone = paymentMethod === "Card or Mobile Money";

  function handleSubmit(event: FormEvent) {
    event.preventDefault();
    if (needsPhone && !phone.trim()) return;
    renewSubscription({ months, paymentMethod, phone: needsPhone ? phone.trim() : "" });
    onClose();
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
      <div className="w-full max-w-md rounded-2xl bg-white p-6 shadow-2xl">
        <div className="mb-1 flex items-start justify-between">
          <h3 className="text-lg font-bold text-[#1a1a1a]">Renew Subscription</h3>
          <button type="button" onClick={onClose} className="text-[#a3a3a3] hover:text-[#525252]">
            <X size={18} />
          </button>
        </div>
        <p className="mb-5 text-sm text-[#737373]">
          Your subscription is paid until {subscription.paidUntil}. Additional months will be added.
        </p>

        <form onSubmit={handleSubmit} className="space-y-4">
          <label className="block">
            <span className="mb-1.5 block text-sm font-semibold text-[#525252]">
              Subscription Period <span className="text-red-500">*</span>
            </span>
            <select
              value={months}
              onChange={(event) => setMonths(Number(event.target.value))}
              className="h-11 w-full rounded-xl border border-[#e6e6e6] bg-white px-3 text-sm outline-none focus:border-emerald-500"
            >
              {PERIOD_OPTIONS.map((opt) => (
                <option key={opt.months} value={opt.months}>
                  {opt.label}
                </option>
              ))}
            </select>
          </label>

          <div className="rounded-xl bg-[#ffffff] px-4 py-3 text-sm">
            <span className="font-semibold text-[#525252]">Amount</span>
            <p className="mt-0.5 text-[#1a1a1a]">
              {months} month{months === 1 ? "" : "s"} × {sym()} {subscription.monthlyFee.toFixed(2)} = {sym()} {amount.toFixed(2)}
            </p>
          </div>

          <label className="block">
            <span className="mb-1.5 block text-sm font-semibold text-[#525252]">
              Payment Method <span className="text-red-500">*</span>
            </span>
            <select
              value={paymentMethod}
              onChange={(event) => setPaymentMethod(event.target.value)}
              className="h-11 w-full rounded-xl border border-[#e6e6e6] bg-white px-3 text-sm outline-none focus:border-emerald-500"
            >
              {PAYMENT_METHODS.map((method) => (
                <option key={method} value={method}>
                  {method}
                </option>
              ))}
            </select>
            <span className="mt-1 block text-xs text-[#a3a3a3]">Choose how you want to pay</span>
          </label>

          <div className="rounded-xl border-2 border-emerald-200 bg-white px-4 py-3 text-sm">
            <span className="font-semibold text-[#525252]">Payment total</span>
            <p className="mt-0.5 text-base font-black text-[#1a1a1a]">Total: {sym()} {amount.toFixed(2)}</p>
          </div>

          {needsPhone && (
            <label className="block">
              <span className="mb-1.5 block text-sm font-semibold text-[#525252]">
                Phone Number <span className="text-red-500">*</span>
              </span>
              <input
                required
                value={phone}
                onChange={(event) => setPhone(event.target.value)}
                placeholder="+233241234567"
                className="h-11 w-full rounded-xl border border-[#e6e6e6] bg-white px-3 text-sm outline-none focus:border-emerald-500"
              />
              <span className="mt-1 block text-xs text-[#a3a3a3]">
                Enter phone with country code (e.g., +233241234567)
              </span>
            </label>
          )}

          <div className="flex gap-2 pt-2">
            <button
              type="submit"
              className="rounded-xl bg-emerald-500 px-5 py-2.5 text-sm font-bold text-white hover:bg-emerald-600"
            >
              Submit
            </button>
            <button
              type="button"
              onClick={onClose}
              className="rounded-xl border border-[#e6e6e6] bg-white px-5 py-2.5 text-sm font-bold text-[#525252] hover:bg-[#ffffff]"
            >
              Cancel
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
