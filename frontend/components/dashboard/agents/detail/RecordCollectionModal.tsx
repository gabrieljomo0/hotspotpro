"use client";

// Record money you collected from an agent for vouchers they sold from stock
// you gave them. It lowers what they owe on their Collections tab.

import { sym } from "@/components/dashboard/shared/currency";
import { useState } from "react";

import { useDashboard } from "../../context/DashboardContext";
import {
  COLLECTION_METHODS,
  validateCollection,
  type CollectionDraft,
  type CollectionMethod,
} from "../agentLedger";
import { ModalFrame } from "./ModalFrame";

function todayInput() {
  const now = new Date();
  const month = String(now.getMonth() + 1).padStart(2, "0");
  const day = String(now.getDate()).padStart(2, "0");
  return `${now.getFullYear()}-${month}-${day}`;
}

// Today keeps the real time; an earlier day is stamped at midday so it can
// never land in the future or slip into a neighbouring day.
export function collectionTimestamp(dateInput: string, now: Date = new Date()) {
  const day = new Date(dateInput + "T00:00:00");
  const sameDay = day.toDateString() === now.toDateString();
  return sameDay ? now.getTime() : day.getTime() + 12 * 3600 * 1000;
}

export function RecordCollectionModal({
  agentId,
  agentName,
  currentBalance,
  onClose,
}: {
  agentId: string;
  agentName: string;
  currentBalance: number;
  onClose: () => void;
}) {
  const { recordAgentCollection } = useDashboard();
  const [draft, setDraft] = useState<CollectionDraft>({
    amount: "",
    method: "Cash",
    collectedOn: todayInput(),
    reference: "",
    note: "",
  });
  const [submitted, setSubmitted] = useState(false);

  const errors = validateCollection(draft);
  const hasErrors = Object.keys(errors).length > 0;
  const amount = Number(draft.amount);
  const validAmount = !errors.amount && draft.amount.trim() !== "";
  const balanceAfter = validAmount ? Math.round((currentBalance - amount) * 100) / 100 : null;

  function set<K extends keyof CollectionDraft>(key: K, value: CollectionDraft[K]) {
    setDraft((current) => ({ ...current, [key]: value }));
  }

  function handleSubmit(event: React.FormEvent) {
    event.preventDefault();
    setSubmitted(true);
    if (hasErrors) return;
    const result = recordAgentCollection({
      agentId,
      amount,
      method: draft.method,
      collectedOnMs: collectionTimestamp(draft.collectedOn),
      reference: draft.reference,
      note: draft.note,
    });
    if (result) onClose();
  }

  const fieldClass = (bad: boolean) =>
    `h-11 w-full rounded-xl border bg-white px-3.5 text-sm outline-none focus:border-[#1a1a1a] ${bad ? "border-red-400" : "border-[#e6e6e6]"}`;

  return (
    <ModalFrame
      title="Record Collection"
      subtitle={`Money collected from ${agentName}`}
      onClose={onClose}
      testId="record-collection-modal"
    >
      <form onSubmit={handleSubmit} className="space-y-4" noValidate>
        <label className="block">
          <span className="mb-1.5 block text-sm font-semibold text-[#525252]">
            Amount collected ({sym()}) <span className="text-red-500">*</span>
          </span>
          <input
            autoFocus
            inputMode="decimal"
            value={draft.amount}
            onChange={(event) => set("amount", event.target.value)}
            aria-label="Amount collected"
            className={fieldClass(submitted && !!errors.amount)}
          />
          {submitted && errors.amount && <span className="mt-1 block text-xs font-semibold text-red-600">{errors.amount}</span>}
        </label>

        <div className="grid gap-4 sm:grid-cols-2">
          <label className="block">
            <span className="mb-1.5 block text-sm font-semibold text-[#525252]">How it was paid</span>
            <select
              value={draft.method}
              onChange={(event) => set("method", event.target.value as CollectionMethod)}
              aria-label="Payment method"
              className={fieldClass(false)}
            >
              {COLLECTION_METHODS.map((method) => (
                <option key={method} value={method}>
                  {method}
                </option>
              ))}
            </select>
          </label>
          <label className="block">
            <span className="mb-1.5 block text-sm font-semibold text-[#525252]">Collected on</span>
            <input
              type="date"
              value={draft.collectedOn}
              max={todayInput()}
              onChange={(event) => set("collectedOn", event.target.value)}
              aria-label="Collected on"
              className={fieldClass(submitted && !!errors.collectedOn)}
            />
            {submitted && errors.collectedOn && (
              <span className="mt-1 block text-xs font-semibold text-red-600">{errors.collectedOn}</span>
            )}
          </label>
        </div>

        <label className="block">
          <span className="mb-1.5 block text-sm font-semibold text-[#525252]">Reference (optional)</span>
          <input
            value={draft.reference}
            onChange={(event) => set("reference", event.target.value)}
            placeholder="e.g. MoMo transaction ID or receipt number"
            aria-label="Reference"
            className={fieldClass(!!errors.reference)}
          />
          {errors.reference && <span className="mt-1 block text-xs font-semibold text-red-600">{errors.reference}</span>}
        </label>

        <label className="block">
          <span className="mb-1.5 block text-sm font-semibold text-[#525252]">Note (optional)</span>
          <textarea
            rows={3}
            value={draft.note}
            onChange={(event) => set("note", event.target.value)}
            aria-label="Note"
            className="w-full rounded-xl border border-[#e6e6e6] bg-white px-3.5 py-2.5 text-sm outline-none focus:border-[#1a1a1a]"
          />
          {errors.note && <span className="mt-1 block text-xs font-semibold text-red-600">{errors.note}</span>}
        </label>

        <div data-testid="collection-preview" className="rounded-xl bg-[#f7f7f7] px-4 py-3 text-sm text-[#525252]">
          Ledger balance now: <strong>{sym()} {currentBalance.toLocaleString()}</strong>
          {balanceAfter !== null && (
            <>
              {" "}
              → after this: <strong>{sym()} {balanceAfter.toLocaleString()}</strong>
              {balanceAfter < 0 && (
                <span className="mt-1 block text-xs font-semibold text-amber-700">
                  That's more than they currently owe — the extra stays as a credit on their ledger.
                </span>
              )}
            </>
          )}
        </div>

        <div className="flex gap-3 pt-1">
          <button
            type="submit"
            className="rounded-xl bg-emerald-600 px-6 py-3 text-sm font-bold text-white hover:bg-emerald-700"
          >
            Record collection
          </button>
          <button
            type="button"
            onClick={onClose}
            className="rounded-xl border border-[#e6e6e6] bg-white px-5 py-3 text-sm font-semibold text-[#525252] hover:bg-[#ffffff]"
          >
            Cancel
          </button>
        </div>
      </form>
    </ModalFrame>
  );
}
