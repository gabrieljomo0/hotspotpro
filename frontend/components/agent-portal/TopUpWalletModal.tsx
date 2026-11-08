"use client";

import { sym } from "@/components/dashboard/shared/currency";
import { useState, type FormEvent } from "react";
import { X, Wallet } from "lucide-react";

import { useDashboard } from "@/components/dashboard/context/DashboardContext";
import type { AgentProfile } from "@/components/dashboard/shared/types";

const PAYMENT_METHODS = ["Mobile Money", "Card"];

export function TopUpWalletModal({ agent, onClose }: { agent: AgentProfile; onClose: () => void }) {
  const { adjustAgentWallet } = useDashboard();
  const [amount, setAmount] = useState("");
  const [method, setMethod] = useState(PAYMENT_METHODS[0]);
  const [phone, setPhone] = useState(agent.phone ?? "");

  function handleSubmit(event: FormEvent) {
    event.preventDefault();
    const value = Number(amount);
    if (!value || value <= 0) return;
    adjustAgentWallet(agent.id, value, `Self top-up via ${method}`);
    onClose();
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
      <div className="w-full max-w-sm rounded-2xl bg-white p-6 shadow-2xl">
        <div className="mb-1 flex items-start justify-between">
          <h3 className="flex items-center gap-2 text-lg font-bold text-[#1a1a1a]">
            <Wallet size={18} className="text-[#1a1a1a]" />
            Top Up Wallet
          </h3>
          <button type="button" onClick={onClose} className="text-[#a3a3a3] hover:text-[#525252]">
            <X size={18} />
          </button>
        </div>
        <p className="mb-5 text-sm text-[#737373]">
          Current balance: <span className="font-bold text-[#1a1a1a]">{sym()} {agent.walletBalance.toLocaleString()}</span>
        </p>

        <form onSubmit={handleSubmit} className="space-y-4">
          <label className="block">
            <span className="mb-1.5 block text-sm font-semibold text-[#525252]">
              Amount ({sym()}) <span className="text-red-500">*</span>
            </span>
            <input
              required
              type="number"
              min={1}
              value={amount}
              onChange={(event) => setAmount(event.target.value)}
              placeholder="e.g. 50"
              className="h-11 w-full rounded-xl border border-[#d4d4d4] bg-white px-3 text-sm outline-none focus:border-[#d4d4d4]"
            />
          </label>

          <label className="block">
            <span className="mb-1.5 block text-sm font-semibold text-[#525252]">Payment Method</span>
            <select
              value={method}
              onChange={(event) => setMethod(event.target.value)}
              className="h-11 w-full rounded-xl border border-[#d4d4d4] bg-white px-3 text-sm outline-none focus:border-[#d4d4d4]"
            >
              {PAYMENT_METHODS.map((m) => (
                <option key={m} value={m}>
                  {m}
                </option>
              ))}
            </select>
          </label>

          {method === "Mobile Money" && (
            <label className="block">
              <span className="mb-1.5 block text-sm font-semibold text-[#525252]">Phone Number</span>
              <input
                value={phone}
                onChange={(event) => setPhone(event.target.value)}
                placeholder="e.g. 0241234567"
                className="h-11 w-full rounded-xl border border-[#d4d4d4] bg-white px-3 text-sm outline-none focus:border-[#d4d4d4]"
              />
            </label>
          )}

          <div className="flex gap-2 pt-2">
            <button
              type="submit"
              className="rounded-xl bg-[#1a1a1a] px-5 py-2.5 text-sm font-bold text-white hover:bg-[#111111]"
            >
              Top Up
            </button>
            <button
              type="button"
              onClick={onClose}
              className="rounded-xl bg-[#f4f4f4] px-5 py-2.5 text-sm font-bold text-[#525252] hover:bg-[#f7f7f7]"
            >
              Cancel
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
