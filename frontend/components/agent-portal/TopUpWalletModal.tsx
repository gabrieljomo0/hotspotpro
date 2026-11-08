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
          <h3 className="flex items-center gap-2 text-lg font-bold text-[#0f172a]">
            <Wallet size={18} className="text-[#2563eb]" />
            Top Up Wallet
          </h3>
          <button type="button" onClick={onClose} className="text-[#94a3b8] hover:text-[#475569]">
            <X size={18} />
          </button>
        </div>
        <p className="mb-5 text-sm text-[#64748b]">
          Current balance: <span className="font-bold text-[#0f172a]">{sym()} {agent.walletBalance.toLocaleString()}</span>
        </p>

        <form onSubmit={handleSubmit} className="space-y-4">
          <label className="block">
            <span className="mb-1.5 block text-sm font-semibold text-[#475569]">
              Amount ({sym()}) <span className="text-red-500">*</span>
            </span>
            <input
              required
              type="number"
              min={1}
              value={amount}
              onChange={(event) => setAmount(event.target.value)}
              placeholder="e.g. 50"
              className="h-11 w-full rounded-xl border border-[#cbd5e1] bg-white px-3 text-sm outline-none focus:border-[#cbd5e1]"
            />
          </label>

          <label className="block">
            <span className="mb-1.5 block text-sm font-semibold text-[#475569]">Payment Method</span>
            <select
              value={method}
              onChange={(event) => setMethod(event.target.value)}
              className="h-11 w-full rounded-xl border border-[#cbd5e1] bg-white px-3 text-sm outline-none focus:border-[#cbd5e1]"
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
              <span className="mb-1.5 block text-sm font-semibold text-[#475569]">Phone Number</span>
              <input
                value={phone}
                onChange={(event) => setPhone(event.target.value)}
                placeholder="e.g. 0241234567"
                className="h-11 w-full rounded-xl border border-[#cbd5e1] bg-white px-3 text-sm outline-none focus:border-[#cbd5e1]"
              />
            </label>
          )}

          <div className="flex gap-2 pt-2">
            <button
              type="submit"
              className="rounded-xl bg-[#2563eb] px-5 py-2.5 text-sm font-bold text-white hover:bg-[#1d4ed8]"
            >
              Top Up
            </button>
            <button
              type="button"
              onClick={onClose}
              className="rounded-xl bg-[#f1f5f9] px-5 py-2.5 text-sm font-bold text-[#475569] hover:bg-[#f8fafc]"
            >
              Cancel
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
