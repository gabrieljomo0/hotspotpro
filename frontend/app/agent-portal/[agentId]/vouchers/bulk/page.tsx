"use client";

// Bulk actions for an agent's vouchers. Every action is switched on or off by
// the permissions the admin gave this agent:
//   voucher.bulk   — needed to open this page at all
//   voucher.print  — download the selected vouchers as a CSV
//   voucher.cancel — mark the selected unused vouchers as expired
// Copying codes is always there for anyone who can open the page.

import { use, useState } from "react";
import Link from "next/link";
import { Layers, Copy, Download, Ban, Search, ChevronRight } from "lucide-react";

import { useDashboard } from "@/components/dashboard/context/DashboardContext";
import { AgentPortalPage } from "@/components/agent-portal/AgentPortalPage";
import { agentStock } from "@/components/dashboard/agents/agentLedger";
import { ConfirmDialog } from "@/components/dashboard/shared/ConfirmDialog";
import type { AgentProfile } from "@/components/dashboard/shared/types";

function downloadCsv(filename: string, rows: string[][]) {
  const csv = rows.map((row) => row.map((cell) => `"${cell.replace(/"/g, '""')}"`).join(",")).join("\n");
  const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = filename;
  link.click();
  URL.revokeObjectURL(url);
}

function BulkBody({ agent }: { agent: AgentProfile }) {
  const { vouchers, voucherBatches, expireVouchers, showToast } = useDashboard();
  const [query, setQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState("All");
  const [batchFilter, setBatchFilter] = useState("All");
  const [picked, setPicked] = useState<string[]>([]);
  const [confirmExpire, setConfirmExpire] = useState(false);

  const canPrint = agent.permissions["voucher.print"] === "Allowed";
  const canCancel = agent.permissions["voucher.cancel"] === "Allowed";
  const canSeeAssigned = agent.permissions["voucher.viewAssignedByAdmin"] === "Allowed";

  const batchById = new Map(voucherBatches.map((b) => [b.id, b]));
  // Only vouchers this agent is allowed to see: their own, plus stock admin
  // pushed to them if they may view it.
  const mine = agentStock(agent.id, vouchers, voucherBatches).held.filter((v) => {
    if (v.agentId === agent.id) return true;
    return canSeeAssigned;
  });
  const batchesHere = Array.from(new Set(mine.map((v) => v.batchId).filter((id): id is string => Boolean(id))));

  const q = query.trim().toLowerCase();
  const visible = mine.filter((v) => {
    if (statusFilter !== "All" && v.status !== statusFilter) return false;
    if (batchFilter !== "All" && v.batchId !== batchFilter) return false;
    if (!q) return true;
    return v.code.toLowerCase().includes(q) || (v.redeemerPhone ?? "").toLowerCase().includes(q) || v.packageName.toLowerCase().includes(q);
  });

  const selected = visible.filter((v) => picked.includes(v.code));
  const allVisiblePicked = visible.length > 0 && visible.every((v) => picked.includes(v.code));
  const expirable = selected.filter((v) => v.status === "Available");

  function toggle(code: string) {
    setPicked((current) => (current.includes(code) ? current.filter((c) => c !== code) : [...current, code]));
  }
  function toggleAll() {
    const codes = visible.map((v) => v.code);
    setPicked((current) => (allVisiblePicked ? current.filter((c) => !codes.includes(c)) : Array.from(new Set([...current, ...codes]))));
  }

  async function copyCodes() {
    try {
      await navigator.clipboard.writeText(selected.map((v) => v.code).join("\n"));
      showToast(`Copied ${selected.length} code${selected.length === 1 ? "" : "s"}.`);
    } catch {
      showToast("Couldn't copy — your browser blocked it.");
    }
  }

  function exportCsv() {
    downloadCsv(`vouchers-${agent.id}.csv`, [
      ["No.", "Voucher Code", "Package", "Batch", "Status", "Sold To"],
      ...selected.map((v, index) => [String(index + 1), v.code, v.packageName, batchById.get(v.batchId ?? "")?.reference ?? "", v.status, v.redeemerPhone ?? ""]),
    ]);
  }

  return (
    <section>
      <Link href={`/agent-portal/${agent.id}/vouchers`} className="mb-3 inline-flex items-center gap-1 text-xs font-semibold text-[#64748b] hover:text-[#2563eb]">
        Vouchers <ChevronRight size={12} /> Bulk actions
      </Link>
      <h1 className="flex items-center gap-2 text-2xl font-black md:text-3xl">
        <Layers size={26} className="text-[#2563eb]" />
        Bulk Actions
      </h1>
      <p className="mb-4 mt-1 text-sm text-[#64748b]">Pick several vouchers, then act on them together.</p>

      <div className="mb-3 flex flex-wrap items-center gap-2 rounded-xl bg-white p-3">
        <div className="relative">
          <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-[#94a3b8]" />
          <input data-testid="bulk-search" value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Search code, package or phone..." className="h-10 w-64 rounded-lg border border-[#cbd5e1] pl-8 pr-3 text-sm outline-none focus:border-[#2563eb]" />
        </div>
        <select data-testid="bulk-status" value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)} className="h-10 rounded-lg border border-[#cbd5e1] bg-white px-3 text-sm outline-none">
          <option value="All">All statuses</option>
          <option>Available</option>
          <option>Used</option>
          <option>Expired</option>
        </select>
        <select data-testid="bulk-batch" value={batchFilter} onChange={(e) => setBatchFilter(e.target.value)} className="h-10 rounded-lg border border-[#cbd5e1] bg-white px-3 text-sm outline-none">
          <option value="All">All batches</option>
          {batchesHere.map((id) => (
            <option key={id} value={id}>{batchById.get(id)?.reference ?? id}</option>
          ))}
        </select>
        <span className="ml-auto text-xs text-[#94a3b8]">{visible.length} shown</span>
      </div>

      <div data-testid="bulk-bar" className="mb-3 flex flex-wrap items-center gap-2 rounded-xl bg-white px-4 py-2.5">
        <span data-testid="bulk-selected" className="text-sm font-semibold text-[#0f172a]">{selected.length} selected</span>
        <div className="ml-auto flex flex-wrap gap-2">
          <button type="button" data-testid="bulk-copy" disabled={selected.length === 0} onClick={copyCodes} className="inline-flex items-center gap-1.5 rounded-lg bg-[#f1f5f9] px-3 py-2 text-xs font-semibold text-[#475569] hover:bg-[#f8fafc] disabled:opacity-50">
            <Copy size={13} /> Copy codes
          </button>
          {canPrint && (
            <button type="button" data-testid="bulk-csv" disabled={selected.length === 0} onClick={exportCsv} className="inline-flex items-center gap-1.5 rounded-lg bg-[#f1f5f9] px-3 py-2 text-xs font-semibold text-[#475569] hover:bg-[#f8fafc] disabled:opacity-50">
              <Download size={13} /> Download CSV
            </button>
          )}
          {canCancel && (
            <button type="button" data-testid="bulk-expire" disabled={expirable.length === 0} onClick={() => setConfirmExpire(true)} className="inline-flex items-center gap-1.5 rounded-lg border-red-200 bg-[#f1f5f9] px-3 py-2 text-xs font-semibold text-red-600 hover:bg-red-50 disabled:opacity-50">
              <Ban size={13} /> Expire unused{expirable.length > 0 ? ` (${expirable.length})` : ""}
            </button>
          )}
        </div>
      </div>

      <article className="overflow-hidden rounded-2xl bg-white">
        <div className="max-h-[520px] overflow-auto">
          <table className="w-full min-w-[640px] text-left text-sm">
            <thead className="sticky top-0 bg-[#f8fafc] text-xs text-[#64748b]">
              <tr>
                <th className="w-10 px-4 py-3">
                  <input type="checkbox" data-testid="bulk-all" aria-label="Select all shown" checked={allVisiblePicked} onChange={toggleAll} className="h-4 w-4 accent-[#2563eb]" />
                </th>
                <th className="px-4 py-3">Voucher code</th>
                <th className="px-4 py-3">Package</th>
                <th className="px-4 py-3">Batch</th>
                <th className="px-4 py-3">Status</th>
                <th className="px-4 py-3">Sold to</th>
              </tr>
            </thead>
            <tbody data-testid="bulk-rows" className="divide-y divide-[#f1f5f9]">
              {visible.map((v) => (
                <tr key={v.code} className="hover:bg-[#f8fafc]">
                  <td className="px-4 py-2.5">
                    <input type="checkbox" data-testid="bulk-pick" aria-label={`Select ${v.code}`} checked={picked.includes(v.code)} onChange={() => toggle(v.code)} className="h-4 w-4 accent-[#2563eb]" />
                  </td>
                  <td className="px-4 py-2.5 font-mono text-xs text-[#2563eb]">{v.code}</td>
                  <td className="px-4 py-2.5">{v.packageName}</td>
                  <td className="px-4 py-2.5 text-[#64748b]">{batchById.get(v.batchId ?? "")?.reference ?? "—"}</td>
                  <td className="px-4 py-2.5">{v.status}</td>
                  <td className="px-4 py-2.5">{v.redeemerPhone ?? "—"}</td>
                </tr>
              ))}
              {visible.length === 0 && (
                <tr>
                  <td colSpan={6} className="px-4 py-10 text-center text-sm text-[#94a3b8]">
                    {mine.length === 0 ? "No vouchers yet." : "No vouchers match these filters."}
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </article>

      <ConfirmDialog
        open={confirmExpire}
        title="Expire these vouchers?"
        subtitle={`${expirable.length} unused voucher${expirable.length === 1 ? "" : "s"}`}
        confirmLabel="Yes, expire them"
        cancelLabel="Keep them"
        points={[
          "Expired vouchers can't be used to log in any more.",
          "Vouchers already used are left alone — only unused ones are expired.",
          "This can't be undone from your dashboard.",
        ]}
        onCancel={() => setConfirmExpire(false)}
        onConfirm={() => {
          expireVouchers(expirable.map((v) => v.code));
          setPicked((current) => current.filter((c) => !expirable.some((v) => v.code === c)));
          setConfirmExpire(false);
        }}
      />
    </section>
  );
}

export default function AgentBulkVouchersPage({ params }: { params: Promise<{ agentId: string }> }) {
  const { agentId } = use(params);
  return (
    <AgentPortalPage
      agentId={agentId}
      permissionKey="voucher.bulk"
      featureLabel="Bulk actions"
      render={(agent) => <BulkBody agent={agent} />}
    />
  );
}
