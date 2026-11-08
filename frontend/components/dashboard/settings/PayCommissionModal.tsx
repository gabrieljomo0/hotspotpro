"use client";

import { useState, type FormEvent } from "react";
import { X } from "lucide-react";

import { useDashboard } from "../context/DashboardContext";
import { money } from "../shared/currency";
import { useCommissionFigures } from "./useCommissionFigures";

const METHODS = ["Card or Mobile Money", "Bank Transfer"];

export function PayCommissionModal({ onClose }: { onClose: () => void }) {
  const { payCommission } = useDashboard();
  const { balanceDue } = useCommissionFigures("all");
  const [method, setMethod] = useState(METHODS[0]);
  const [phone, setPhone] = useState("");
  const needsPhone = method === METHODS[0];

  function submit(event: FormEvent) {
    event.preventDefault();
    if (balanceDue <= 0 || (needsPhone && !phone.trim())) return;
    payCommission({ amount: balanceDue, paymentMethod: method, phone: needsPhone ? phone.trim() : "" });
    onClose();
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
      <div data-testid="pay-commission-modal" className="w-full max-w-md rounded-2xl bg-white p-6 shadow-2xl">
        <div className="mb-1 flex items-start justify-between">
          <h3 className="text-lg font-bold text-[#1a1a1a]">Pay commission</h3>
          <button type="button" onClick={onClose} aria-label="Close" className="text-[#a3a3a3] hover:text-[#525252]">
            <X size={18} />
          </button>
        </div>
        <p className="mb-5 text-sm text-[#737373]">This pays the commission you owe on sales made so far.</p>
        <form onSubmit={submit} className="space-y-4">
          <div className="rounded-xl bg-[#f4f4f4] p-4">
            <p className="text-xs font-semibold text-[#737373]">Amount due</p>
            <p data-testid="pay-amount" className="text-2xl font-black text-[#1a1a1a]">{money(balanceDue)}</p>
          </div>
          <label className="block">
            <span className="mb-1.5 block text-sm font-semibold text-[#525252]">Payment method</span>
            <select value={method} onChange={(e) => setMethod(e.target.value)} className="h-11 w-full rounded-xl border border-[#d4d4d4] bg-white px-3 text-sm outline-none focus:border-[#1a1a1a]">
              {METHODS.map((m) => (
                <option key={m}>{m}</option>
              ))}
            </select>
          </label>
          {needsPhone && (
            <label className="block">
              <span className="mb-1.5 block text-sm font-semibold text-[#525252]">Mobile Money number</span>
              <input data-testid="pay-phone" value={phone} onChange={(e) => setPhone(e.target.value)} className="h-11 w-full rounded-xl border border-[#d4d4d4] bg-white px-3 text-sm outline-none focus:border-[#1a1a1a]" />
            </label>
          )}
          <div className="flex gap-3">
            <button type="submit" data-testid="pay-submit" disabled={balanceDue <= 0 || (needsPhone && !phone.trim())} className="rounded-xl bg-[#1a1a1a] px-5 py-3 text-sm font-bold text-white hover:bg-[#111111] disabled:cursor-not-allowed disabled:opacity-50">
              Pay {money(balanceDue)}
            </button>
            <button type="button" onClick={onClose} className="rounded-xl border border-[#d4d4d4] bg-white px-5 py-3 text-sm font-bold text-[#525252] hover:bg-[#f4f4f4]">
              Cancel
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
