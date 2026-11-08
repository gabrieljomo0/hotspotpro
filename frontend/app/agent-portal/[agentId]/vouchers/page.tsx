"use client";

import { use, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import dynamic from "next/dynamic";
import { Ticket, Plus, Gift, Printer, Layers, Bookmark, ChevronDown, Search, Copy, Eye, X } from "lucide-react";

import { localizeAmountString } from "@/components/dashboard/shared/currency";
import { settingsOf } from "@/components/dashboard/agents/agentSettings";
import { useDashboard } from "@/components/dashboard/context/DashboardContext";
import { AgentPortalPage } from "@/components/agent-portal/AgentPortalPage";
import { VoucherPrintSheet, type PrintItem } from "@/components/agent-portal/VoucherPrintSheet";
import type { AgentProfile, Voucher } from "@/components/dashboard/shared/types";

// Only needed once "Generate Vouchers" is clicked.
const AgentGenerateVouchersModal = dynamic(
  () => import("@/components/agent-portal/AgentGenerateVouchersModal").then((m) => m.AgentGenerateVouchersModal),
  { ssr: false },
);

const STATUS_CLASS: Record<string, string> = {
  Available: "bg-[#f4f4f4] text-[#1a1a1a]",
  Used: "bg-slate-200 text-slate-700",
  Expired: "bg-red-100 text-red-700",
};

// Same layout as the admin's Vouchers page: the batches on top, and below
// them every voucher of those batches. A batch's codes — or all batches'
// codes — can be viewed (filtered into the list) and printed.
function AgentVouchersView({ agent, agentId }: { agent: AgentProfile; agentId: string }) {
  const router = useRouter();
  const { voucherBatches, vouchers, voucherPresets, findAgent, branding, showToast } = useDashboard();
  const [generateOpen, setGenerateOpen] = useState(false);
  const [batchesOpen, setBatchesOpen] = useState(true);
  const [batchFilter, setBatchFilter] = useState<string | null>(null);
  const [query, setQuery] = useState("");
  const [selected, setSelected] = useState<string[]>([]);
  const [printItems, setPrintItems] = useState<PrintItem[]>([]);
  const listRef = useRef<HTMLElement | null>(null);

  // Own batches always; batches the admin pushed only if the agent may see them.
  const canSeeAssigned = agent.permissions["voucher.viewAssignedByAdmin"] === "Allowed";
  const myBatches = voucherBatches.filter(
    (b) => b.agentId === agent.id || (canSeeAssigned && b.assignedAgentIds.includes(agent.id)),
  );
  const batchById = new Map(myBatches.map((b) => [b.id, b]));
  const myVouchers = vouchers.filter((v) => v.batchId && batchById.has(v.batchId));

  const canGenerate =
    settingsOf(agent).allowCreateVouchers &&
    (agent.permissions["voucher.generate"] === "Allowed" || agent.permissions["voucher.sell"] === "Allowed");
  const canPrint = agent.permissions["voucher.print"] === "Allowed";
  const canBulkManage = agent.permissions["voucher.bulk"] === "Allowed";
  const canUsePresets = agent.permissions["voucher.presets"] === "Allowed";
  const presetCount = voucherPresets.filter(
    (p) => p.ownerAgentId === agent.id || p.pushedToAgentIds.includes(agent.id),
  ).length;

  const activeBatch = batchFilter ? batchById.get(batchFilter) : undefined;
  const inScope = activeBatch ? myVouchers.filter((v) => v.batchId === activeBatch.id) : myVouchers;
  const q = query.trim().toLowerCase();
  const visible = q
    ? inScope.filter((v) => v.code.toLowerCase().includes(q) || v.packageName.toLowerCase().includes(q))
    : inScope;
  const allVisibleSelected = visible.length > 0 && visible.every((v) => selected.includes(v.code));

  function toPrintItems(list: Voucher[]): PrintItem[] {
    return list.map((v) => {
      const batch = v.batchId ? batchById.get(v.batchId) : undefined;
      return {
        code: v.code,
        password: v.password,
        packageName: v.packageName,
        price: localizeAmountString(batch?.price ?? ""),
        design: batch?.printDesign ?? "classic-card",
      };
    });
  }

  function viewBatch(batchId: string | null) {
    setBatchFilter(batchId);
    setQuery("");
    setSelected([]);
    setTimeout(() => listRef.current?.scrollIntoView?.({ behavior: "smooth", block: "start" }), 0);
  }

  async function copyCodes(codes: string[]) {
    try {
      await navigator.clipboard.writeText(codes.join("\n"));
      showToast(`${codes.length} voucher code(s) copied.`);
    } catch {
      showToast("Couldn't copy — select the codes by hand.");
    }
  }

  return (
    <section>
      <div className="mb-5 flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="flex items-center gap-2 text-2xl font-black md:text-3xl">
            <Ticket size={26} className="text-[#1a1a1a]" />
            Vouchers
          </h1>
          <p className="mt-1 text-sm text-[#737373]">
            Batches you&apos;ve generated or that were pushed to you by admin — with every voucher listed below.
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          {canBulkManage && (
            <Link
              href={`/agent-portal/${agentId}/vouchers/bulk`}
              data-testid="bulk-actions-link"
              className="inline-flex items-center gap-2 rounded-xl border-2 px-4 py-2.5 text-sm font-bold text-[#1a1a1a] hover:bg-[#f4f4f4]"
            >
              <Layers size={16} />
              Bulk Actions
            </Link>
          )}
          {canUsePresets && (
            <Link
              href={`/agent-portal/${agentId}/vouchers/presets`}
              className="inline-flex items-center gap-2 rounded-xl bg-[#f4f4f4] px-4 py-2.5 text-sm font-bold text-[#1a1a1a] hover:bg-[#e6e6e6]"
            >
              <Bookmark size={16} />
              Generate from Preset
              {presetCount > 0 && (
                <span className="rounded-full bg-[#1a1a1a] px-2 py-0.5 text-[10px] font-bold text-white">{presetCount}</span>
              )}
            </Link>
          )}
          {canGenerate && (
            <button
              type="button"
              onClick={() => setGenerateOpen(true)}
              className="inline-flex items-center gap-2 rounded-xl bg-[#1a1a1a] px-4 py-2.5 text-sm font-bold text-white hover:bg-[#111111]"
            >
              <Plus size={16} />
              Generate Vouchers
            </button>
          )}
        </div>
      </div>

      {/* ── All Batches (on top) ── */}
      <article
        data-testid="all-batches"
        className="mb-5 overflow-hidden rounded-2xl bg-white shadow-sm"
      >
        <div className="flex flex-wrap items-center justify-between gap-2 px-5 py-4">
          <button
            type="button"
            data-testid="batches-toggle"
            aria-expanded={batchesOpen}
            onClick={() => setBatchesOpen((open) => !open)}
            className="flex items-center gap-2 text-left"
          >
            <Layers size={16} className="text-[#1a1a1a]" />
            <h3 className="text-base font-bold text-[#1a1a1a]">All Batches</h3>
            <span className="rounded-full bg-[#f4f4f4] px-2 py-0.5 text-xs font-bold text-[#737373]">{myBatches.length}</span>
            <ChevronDown size={18} className={`text-[#a3a3a3] transition-transform ${batchesOpen ? "rotate-180" : ""}`} />
          </button>
          {myBatches.length > 0 && (
            <div className="flex flex-wrap gap-2">
              <button
                type="button"
                data-testid="view-all"
                onClick={() => viewBatch(null)}
                className="inline-flex items-center gap-1.5 rounded-lg px-3 py-2 text-xs font-semibold text-[#525252] hover:bg-[#f7f7f7]"
              >
                <Eye size={13} />
                View all codes
              </button>
              {canPrint && (
                <button
                  type="button"
                  data-testid="print-all"
                  onClick={() => setPrintItems(toPrintItems(myVouchers))}
                  className="inline-flex items-center gap-1.5 rounded-lg bg-[#1a1a1a] px-3 py-2 text-xs font-semibold text-white hover:bg-[#111111]"
                >
                  <Printer size={13} />
                  Print all codes
                </button>
              )}
            </div>
          )}
        </div>

        {batchesOpen && (
          <div className="max-h-[420px] divide-y divide-[#f4f4f4] overflow-y-auto border-t border-[#f4f4f4]">
            {myBatches.length === 0 && (
              <p className="px-5 py-8 text-center text-sm text-[#a3a3a3]">
                No voucher batches yet.
                {canGenerate && (
                  <>
                    {" "}
                    <button type="button" onClick={() => setGenerateOpen(true)} className="font-semibold text-[#1a1a1a] hover:underline">
                      Generate your first batch →
                    </button>
                  </>
                )}
              </p>
            )}
            {myBatches.map((batch) => {
              const list = myVouchers.filter((v) => v.batchId === batch.id);
              const available = list.filter((v) => v.status === "Available").length;
              const used = list.filter((v) => v.status === "Used").length;
              const active = batchFilter === batch.id;
              return (
                <div
                  key={batch.id}
                  data-testid="batch-row"
                  className={`flex flex-wrap items-center justify-between gap-3 px-5 py-3.5 ${active ? "bg-[#f4f4f4]" : "hover:bg-[#f7f7f7]"}`}
                >
                  <div className="min-w-0">
                    <Link
                      href={`/agent-portal/${agentId}/vouchers/batch/${batch.id}`}
                      className="font-bold text-[#1a1a1a] hover:text-[#1a1a1a] hover:underline"
                    >
                      {batch.reference}
                    </Link>
                    {batch.isGiveaway && (
                      <span className="ml-2 inline-flex items-center gap-1 rounded-full bg-[#f4f4f4] px-2 py-0.5 text-[10px] font-bold text-[#1a1a1a]">
                        <Gift size={10} /> Giveaway
                      </span>
                    )}
                    <p className="text-xs text-[#737373]">
                      {batch.count} voucher{batch.count === 1 ? "" : "s"} · {batch.packageName} · {batch.createdAt} ·{" "}
                      <span className="text-[#1a1a1a]">{available} available</span> · {used} used
                    </p>
                  </div>
                  <div className="flex shrink-0 flex-wrap gap-2">
                    <button
                      type="button"
                      data-testid="batch-view"
                      onClick={() => viewBatch(batch.id)}
                      className="inline-flex items-center gap-1.5 rounded-lg px-3 py-2 text-xs font-semibold text-[#1a1a1a] hover:bg-[#f7f7f7]"
                    >
                      <Eye size={13} />
                      View codes
                    </button>
                    {canPrint && (
                      <button
                        type="button"
                        data-testid="batch-print"
                        onClick={() => setPrintItems(toPrintItems(list))}
                        className="inline-flex items-center gap-1.5 rounded-lg px-3 py-2 text-xs font-semibold text-[#525252] hover:bg-[#f7f7f7]"
                      >
                        <Printer size={13} />
                        Print
                      </button>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </article>

      {/* ── Voucher list (below) ── */}
      <article
        ref={listRef}
        data-testid="voucher-list"
        className="overflow-hidden rounded-2xl bg-white shadow-sm"
      >
        <div className="flex flex-wrap items-center justify-between gap-3 px-5 py-4">
          <div>
            <h3 className="text-base font-bold text-[#1a1a1a]">
              Voucher List (<span data-testid="voucher-count">{visible.length}</span>)
            </h3>
            <p className="text-xs text-[#737373]">
              {activeBatch ? (
                <>
                  Showing batch{" "}
                  <span data-testid="batch-chip" className="inline-flex items-center gap-1 rounded-full bg-[#f4f4f4] px-2 py-0.5 font-semibold text-[#1a1a1a]">
                    {activeBatch.reference}
                    <button type="button" aria-label="Show all batches" onClick={() => viewBatch(null)}>
                      <X size={11} />
                    </button>
                  </span>
                </>
              ) : (
                "Every voucher from all your batches."
              )}
            </p>
          </div>
          <div className="relative">
            <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-[#a3a3a3]" />
            <input
              data-testid="voucher-search"
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder="Search code or package..."
              className="h-10 w-64 rounded-lg border border-[#d4d4d4] bg-white pl-8 pr-3 text-sm outline-none focus:border-[#1a1a1a]"
            />
          </div>
        </div>

        {selected.length > 0 && (
          <div data-testid="voucher-selection" className="flex flex-wrap items-center gap-3 border-y bg-[#f4f4f4] px-5 py-3">
            <strong className="text-sm text-[#1a1a1a]">{selected.length} selected</strong>
            <button
              type="button"
              data-testid="copy-selected"
              onClick={() => copyCodes(selected)}
              className="inline-flex items-center gap-1.5 rounded-lg bg-[#f4f4f4] px-3 py-2 text-xs font-semibold text-[#1a1a1a] hover:bg-[#e6e6e6]"
            >
              <Copy size={13} />
              Copy codes
            </button>
            {canPrint && (
              <button
                type="button"
                data-testid="print-selected"
                onClick={() => setPrintItems(toPrintItems(myVouchers.filter((v) => selected.includes(v.code))))}
                className="inline-flex items-center gap-1.5 rounded-lg bg-[#1a1a1a] px-3 py-2 text-xs font-semibold text-white hover:bg-[#111111]"
              >
                <Printer size={13} />
                Print selected
              </button>
            )}
            <button type="button" onClick={() => setSelected([])} className="ml-auto text-xs font-semibold text-[#1a1a1a] hover:underline">
              Deselect all
            </button>
          </div>
        )}

        <div className="overflow-x-auto border-t border-[#f4f4f4]">
          <table className="w-full min-w-[1100px] text-left text-sm">
            <thead className="bg-[#f7f7f7] text-[#737373]">
              <tr>
                <th className="px-5 py-3">
                  <input
                    type="checkbox"
                    data-testid="voucher-select-all"
                    checked={allVisibleSelected}
                    onChange={() => {
                      const codes = visible.map((v) => v.code);
                      setSelected((current) =>
                        allVisibleSelected ? current.filter((c) => !codes.includes(c)) : [...new Set([...current, ...codes])],
                      );
                    }}
                    aria-label="Select all visible vouchers"
                  />
                </th>
                <th className="px-4 py-3 font-semibold">Voucher Code</th>
                <th className="px-4 py-3 font-semibold">Package</th>
                <th className="px-4 py-3 font-semibold">Status</th>
                <th className="px-4 py-3 font-semibold">Delivery</th>
                <th className="px-4 py-3 font-semibold">Sale Type</th>
                <th className="px-4 py-3 font-semibold">Customer</th>
                <th className="px-4 py-3 font-semibold">Phone</th>
                <th className="px-4 py-3 font-semibold">Agent</th>
                <th className="px-4 py-3 font-semibold">Generated</th>
              </tr>
            </thead>
            <tbody data-testid="voucher-rows">
              {visible.length === 0 && (
                <tr>
                  <td colSpan={10} className="px-5 py-10 text-center text-sm text-[#a3a3a3]">
                    {myVouchers.length === 0 ? "No vouchers yet." : "No vouchers match this filter."}
                  </td>
                </tr>
              )}
              {visible.map((v) => (
                <tr
                  key={v.code}
                  data-testid="voucher-row"
                  className={`border-t hover:bg-[#f7f7f7] ${selected.includes(v.code) ? "bg-[#f7f7f7]" : ""}`}
                >
                  <td className="px-5 py-3">
                    <input
                      type="checkbox"
                      checked={selected.includes(v.code)}
                      onChange={() =>
                        setSelected((current) => (current.includes(v.code) ? current.filter((c) => c !== v.code) : [...current, v.code]))
                      }
                      aria-label={`Select ${v.code}`}
                    />
                  </td>
                  <td className="px-4 py-3 font-mono font-semibold text-[#1a1a1a]">{v.code}</td>
                  <td className="px-4 py-3">
                    <span className="rounded-full bg-[#f4f4f4] px-2.5 py-1 text-xs font-semibold text-[#1a1a1a]">{v.packageName}</span>
                  </td>
                  <td className="px-4 py-3">
                    <span className={`rounded-full px-3 py-1.5 text-xs font-semibold ${STATUS_CLASS[v.status] ?? STATUS_CLASS.Used}`}>
                      {v.status}
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    <span className="rounded-full px-2.5 py-1 text-xs font-semibold text-[#525252]">{v.delivery}</span>
                  </td>
                  <td className="px-4 py-3 text-[#525252]">{v.saleType}</td>
                  <td className="px-4 py-3 font-mono text-[#525252]">{v.usedByCustomerId ?? "—"}</td>
                  <td className="px-4 py-3 text-[#525252]">{v.redeemerPhone ?? "—"}</td>
                  <td className="px-4 py-3 text-[#525252]">{findAgent(v.agentId)?.name ?? "—"}</td>
                  <td className="whitespace-nowrap px-4 py-3 text-[#737373]">{v.generatedAt}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </article>

      <VoucherPrintSheet items={printItems} businessName={branding.businessName} onDone={() => setPrintItems([])} />

      {canGenerate && (
        <AgentGenerateVouchersModal
          open={generateOpen}
          agent={agent}
          onClose={() => setGenerateOpen(false)}
          onGenerated={(batchId) => {
            setGenerateOpen(false);
            router.push(`/agent-portal/${agentId}/vouchers/batch/${batchId}`);
          }}
        />
      )}
    </section>
  );
}

export default function AgentVouchersPage({
  params,
}: {
  params: Promise<{ agentId: string }>;
}) {
  const { agentId } = use(params);

  return (
    <AgentPortalPage
      agentId={agentId}
      permissionKey="voucher.view"
      featureLabel="Vouchers"
      render={(agent) => <AgentVouchersView agent={agent} agentId={agentId} />}
    />
  );
}
