"use client";

// The settlement side of one agent: what they owe you for vouchers they sold
// from stock you gave them, what you've collected, and the history of
// collections. Vouchers an agent generated and paid for from their wallet are
// not part of this — they were paid for up front.

import { sym } from "@/components/dashboard/shared/currency";
import { useMemo, useState } from "react";
import { Banknote, CalendarDays, Clock, Landmark, Search, Trash2, Wallet2 } from "lucide-react";

import { ConfirmDialog } from "../../shared/ConfirmDialog";
import type { AgentCollection, AgentLedger } from "../agentLedger";

function money(value: number) {
  return `${sym()} ${value.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

function dateLabel(ms: number) {
  return new Date(ms).toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric" });
}

export function AgentCollectionsPanel({
  agentName,
  ledger,
  collections,
  sharedVouchers,
  hasGivenStock,
  onRecord,
  onDelete,
}: {
  agentName: string;
  ledger: AgentLedger;
  collections: AgentCollection[];
  // Vouchers in batches shared with other agents, which can't be attributed.
  sharedVouchers: number;
  hasGivenStock: boolean;
  onRecord: () => void;
  onDelete: (id: string) => void;
}) {
  const [query, setQuery] = useState("");
  const [removing, setRemoving] = useState<AgentCollection | null>(null);

  const rows = useMemo(() => {
    const needle = query.trim().toLowerCase();
    if (!needle) return collections;
    return collections.filter((collection) =>
      [collection.reference, collection.note, collection.method, String(collection.amount), collection.recordedBy]
        .join(" ")
        .toLowerCase()
        .includes(needle),
    );
  }, [collections, query]);

  const overpaid = ledger.balance < 0;

  return (
    <div className="space-y-5" data-testid="collections-panel">
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <div className="rounded-2xl border border-[#e6e6e6] bg-white p-5" data-testid="ledger-unsettled">
          <p className="text-sm text-[#737373]">Unsettled Vouchers</p>
          <p className="mt-1 text-3xl font-black text-[#1a1a1a]">{ledger.unsettledVouchers}</p>
          <p className="mt-2 flex items-center gap-1.5 text-xs font-semibold text-amber-600">
            {money(Math.max(0, ledger.balance))} gross pending <Clock size={12} />
          </p>
        </div>
        <div className="rounded-2xl border border-[#e6e6e6] bg-white p-5" data-testid="ledger-collected">
          <p className="text-sm text-[#737373]">Total Collected</p>
          <p className="mt-1 text-3xl font-black text-[#1a1a1a]">{money(ledger.totalCollected)}</p>
          <p className="mt-2 flex items-center gap-1.5 text-xs font-semibold text-emerald-600">
            {ledger.collectionsCount} collection{ledger.collectionsCount === 1 ? "" : "s"} <Banknote size={12} />
          </p>
        </div>
        <div className="rounded-2xl border border-[#e6e6e6] bg-white p-5" data-testid="ledger-month">
          <p className="text-sm text-[#737373]">This Month</p>
          <p className="mt-1 text-3xl font-black text-[#1a1a1a]">{money(ledger.collectedThisMonth)}</p>
          <p className="mt-2 flex items-center gap-1.5 text-xs font-semibold text-[#1a1a1a]">
            {ledger.collectionsThisMonthCount} collection{ledger.collectionsThisMonthCount === 1 ? "" : "s"} this month{" "}
            <CalendarDays size={12} />
          </p>
        </div>
        <div className="rounded-2xl border border-[#e6e6e6] bg-white p-5" data-testid="ledger-balance">
          <p className="text-sm text-[#737373]">Ledger Balance</p>
          <p className={`mt-1 text-3xl font-black ${overpaid ? "text-emerald-700" : "text-[#1a1a1a]"}`}>
            {money(Math.abs(ledger.balance))}
          </p>
          <p className={`mt-2 flex items-center gap-1.5 text-xs font-semibold ${overpaid ? "text-emerald-600" : "text-amber-600"}`}>
            {overpaid ? "Credit — they've paid ahead" : "Owed, after prior collections"} <Landmark size={12} />
          </p>
        </div>
      </div>

      <div className="rounded-xl border border-[#e6e6e6] bg-[#f7f7f7] px-4 py-3 text-sm text-[#737373]" data-testid="ledger-explainer">
        <p>
          <strong className="text-[#525252]">How this works:</strong> this counts the vouchers you gave {agentName} (a
          batch pushed to them alone) and what they&apos;ve sold from it,{" "}
          <strong className="text-[#525252]">{money(ledger.owedGross)}</strong> from {ledger.consignedSold} sold so far. Each
          collection you record reduces what they owe, oldest sales first. Vouchers they generated themselves are paid
          for from their wallet, so they never appear here.
        </p>
        {!hasGivenStock && (
          <p className="mt-2 text-amber-700">
            You haven&apos;t given {agentName} any stock of their own yet, so there&apos;s nothing to collect. Push a batch to
            them from the Vouchers page.
          </p>
        )}
        {sharedVouchers > 0 && (
          <p data-testid="shared-note" className="mt-2 text-amber-700">
            {sharedVouchers} voucher{sharedVouchers === 1 ? " is" : "s are"} in batches shared with other agents, so who sold{" "}
            {sharedVouchers === 1 ? "it" : "them"} can&apos;t be told — {sharedVouchers === 1 ? "it isn't" : "they aren't"}{" "}
            counted here.
          </p>
        )}
      </div>

      <article className="overflow-hidden rounded-2xl border border-[#e6e6e6] bg-white">
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-[#f4f4f4] px-5 py-4">
          <h3 className="text-base font-bold text-[#1a1a1a]">Collection History</h3>
          <div className="flex flex-wrap items-center gap-2">
            <div className="relative">
              <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-[#a3a3a3]" />
              <input
                value={query}
                onChange={(event) => setQuery(event.target.value)}
                placeholder="Search"
                aria-label="Search collections"
                className="h-10 w-56 rounded-lg border border-[#e6e6e6] bg-white pl-8 pr-3 text-sm outline-none focus:border-[#1a1a1a]"
              />
            </div>
            <button
              type="button"
              onClick={onRecord}
              className="inline-flex items-center gap-2 rounded-lg bg-emerald-600 px-4 py-2.5 text-sm font-bold text-white hover:bg-emerald-700"
            >
              <Wallet2 size={14} />
              Record Collection
            </button>
          </div>
        </div>

        {collections.length === 0 ? (
          <div className="px-6 py-12 text-center" data-testid="collections-empty">
            <p className="text-base font-bold text-[#1a1a1a]">No Collections Yet</p>
            <p className="mx-auto mt-1 max-w-md text-sm text-[#737373]">
              Collections will appear here when you record money collected from this agent.
            </p>
          </div>
        ) : rows.length === 0 ? (
          <p className="px-6 py-10 text-center text-sm text-[#a3a3a3]">No collections match that search.</p>
        ) : (
          <table className="w-full text-left text-sm" data-testid="collections-table">
            <thead className="bg-[#ffffff] text-xs text-[#737373]">
              <tr>
                <th className="px-5 py-3 font-semibold">Collected on</th>
                <th className="px-5 py-3 font-semibold">Amount</th>
                <th className="px-5 py-3 font-semibold">Method</th>
                <th className="px-5 py-3 font-semibold">Reference</th>
                <th className="px-5 py-3 font-semibold">Note</th>
                <th className="px-5 py-3 font-semibold">Recorded by</th>
                <th className="px-5 py-3 text-right font-semibold">Actions</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((collection) => (
                <tr key={collection.id} className="border-t border-[#f4f4f4]">
                  <td className="px-5 py-3 text-[#525252]">{dateLabel(collection.collectedOnMs)}</td>
                  <td className="px-5 py-3 font-bold text-emerald-700">{money(collection.amount)}</td>
                  <td className="px-5 py-3 text-[#525252]">{collection.method}</td>
                  <td className="px-5 py-3 text-[#525252]">{collection.reference || "—"}</td>
                  <td className="max-w-[240px] truncate px-5 py-3 text-[#737373]">{collection.note || "—"}</td>
                  <td className="px-5 py-3 text-[#737373]">{collection.recordedBy}</td>
                  <td className="px-5 py-3 text-right">
                    <button
                      type="button"
                      onClick={() => setRemoving(collection)}
                      aria-label={`Remove the ${money(collection.amount)} collection`}
                      className="inline-flex items-center gap-1 rounded-lg px-2 py-1 text-xs font-semibold text-red-600 hover:bg-red-50"
                    >
                      <Trash2 size={13} />
                      Remove
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </article>

      <ConfirmDialog
        open={removing !== null}
        title="Remove this collection?"
        subtitle={removing ? `${money(removing.amount)} · ${dateLabel(removing.collectedOnMs)}` : undefined}
        confirmLabel="Yes, remove it"
        cancelLabel="Keep it"
        points={[
          `${agentName}'s ledger balance goes back up by ${removing ? money(removing.amount) : "that amount"}.`,
          "Use this to fix a collection you recorded by mistake. It isn't a refund.",
          "This can't be undone — you'd record it again as a new collection.",
        ]}
        onCancel={() => setRemoving(null)}
        onConfirm={() => {
          if (removing) onDelete(removing.id);
          setRemoving(null);
        }}
      />
    </div>
  );
}
