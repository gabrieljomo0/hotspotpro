"use client";

import { localizeAmountString } from "@/components/dashboard/shared/currency";
import { use, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import dynamic from "next/dynamic";
import {
  ArrowLeft,
  Download,
  Printer,
  Plus,
  Check,
  Router as RouterIcon,
  Building2,
  Ticket,
  CheckCircle2,
  Clock,
  XCircle,
  UserCheck,
  Trash2,
} from "lucide-react";

import { useDashboard } from "@/components/dashboard/context/DashboardContext";
import { NotFoundCard } from "@/components/dashboard/shared/ActionPageLayout";
import { BatchSalesPanel } from "@/components/dashboard/vouchers/BatchSalesPanel";
import {
  VoucherCardPreview,
  PRINT_DESIGNS,
  type PrintDesignId,
} from "@/components/dashboard/vouchers/VoucherCardPreview";

// Only ever needed if "Create More Vouchers" is clicked, so it's loaded
// on demand instead of shipping in this page's initial JS.
const GenerateVouchersModal = dynamic(
  () => import("@/components/dashboard/vouchers/GenerateVouchersModal").then((m) => m.GenerateVouchersModal),
  { ssr: false },
);

export default function VoucherBatchPage({
  params,
}: {
  params: Promise<{ batchId: string }>;
}) {
  const { batchId } = use(params);
  const router = useRouter();
  const { findBatch, setBatchPrintDesign, branding, routers, businessLocations, vouchers, agents, bulkAssignVouchersToAgents, currentAgent, deleteVoucherBatch } = useDashboard();
  const batch = findBatch(batchId);
  const [previewDesign, setPreviewDesign] = useState<PrintDesignId | null>(null);
  const [selectedAgentIds, setSelectedAgentIds] = useState<string[]>([]);
  const [generateOpen, setGenerateOpen] = useState(false);
  const [deleteChoiceOpen, setDeleteChoiceOpen] = useState(false);
  const [pendingDeleteMode, setPendingDeleteMode] = useState<"full" | "keep" | "preserve" | null>(null);
  const [confirmCode, setConfirmCode] = useState("");
  const [typedCode, setTypedCode] = useState("");

  if (!batch) {
    return (
      <div className="flex min-h-[60vh] items-center justify-center">
        <NotFoundCard
          message="This voucher batch may have been generated in a previous session."
          backHref="/dashboards/vouchers"
        />
      </div>
    );
  }

  const batchVouchers = vouchers.filter((v) => v.batchId === batch.id);
  const availableCount = batchVouchers.filter((v) => v.status === "Available").length;
  const usedCount = batchVouchers.filter((v) => v.status === "Used").length;
  const expiredCount = batchVouchers.filter((v) => v.status === "Expired").length;

  const design = (previewDesign ?? batch.printDesign) as PrintDesignId;
  const sampleCode = batch.codes[0] ?? "------";
  const samplePassword = batchVouchers[0]?.password ?? null;

  const batchRouterNames = batch.routerIps.map(
    (ip) => routers.find((r) => r.ip === ip)?.name.split(" (")[0] ?? ip,
  );
  const matchingSite = businessLocations.find((site) => {
    const siteRouterIps = routers.filter((r) => r.siteId === site.id).map((r) => r.ip);
    return (
      siteRouterIps.length > 0 &&
      siteRouterIps.length === batch.routerIps.length &&
      siteRouterIps.every((ip) => batch.routerIps.includes(ip))
    );
  });

  // Numbered list of every voucher in the batch (No., code, password).
  function downloadCsv() {
    const quote = (cell: string) => `"${cell.replace(/"/g, '""')}"`;
    const rows = [
      ["No.", "Voucher Code", "Password", "Package", "Status"],
      ...batchVouchers.map((v, index) => [String(index + 1), v.code, v.password ?? "", batch!.packageName, v.status]),
    ];
    const blob = new Blob([rows.map((row) => row.map(quote).join(",")).join("\n")], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `${batch!.reference || "vouchers"}.csv`;
    link.click();
    URL.revokeObjectURL(url);
  }

  function selectDesign(id: PrintDesignId) {
    if (!batch) return;
    setBatchPrintDesign(batch.id, id);
    setPreviewDesign(id);
  }

  function startDeleteConfirm(mode: "full" | "keep" | "preserve") {
    // A fresh random 4-digit code each time — has to be re-typed exactly,
    // so a stray click can't delete a batch by accident.
    const code = String(Math.floor(1000 + Math.random() * 9000));
    setConfirmCode(code);
    setTypedCode("");
    setPendingDeleteMode(mode);
  }

  function cancelDelete() {
    setDeleteChoiceOpen(false);
    setPendingDeleteMode(null);
    setTypedCode("");
    setConfirmCode("");
  }

  function finalizeDelete() {
    if (!batch || !pendingDeleteMode || typedCode !== confirmCode) return;
    deleteVoucherBatch(
      batch.id,
      pendingDeleteMode === "keep" || pendingDeleteMode === "preserve",
      pendingDeleteMode === "preserve",
    );
    cancelDelete();
    router.push("/dashboards/vouchers");
  }

  const eligibleAgents = agents.filter((a) => a.routerIp && batch.routerIps.includes(a.routerIp) && !a.isDefault);
  const alreadyAssignedIds = new Set(batch.assignedAgentIds);

  function toggleAgentSelection(agentId: string) {
    setSelectedAgentIds((current) =>
      current.includes(agentId) ? current.filter((id) => id !== agentId) : [...current, agentId],
    );
  }

  function handlePushToAgents() {
    if (!batch || selectedAgentIds.length === 0) return;
    bulkAssignVouchersToAgents(batch.codes, selectedAgentIds);
    setSelectedAgentIds([]);
  }

  return (
    <section className="mx-auto w-full max-w-6xl">
      {/* A more bulletproof print isolation than relying purely on
          Tailwind's print: utility ordering — this forces literally
          everything except #voucher-print-area to be hidden the moment
          the browser enters print mode, regardless of any ancestor
          layout/overflow quirks. */}
      <style>{`
        @media print {
          body * {
            visibility: hidden;
          }
          #voucher-print-area,
          #voucher-print-area * {
            visibility: visible;
          }
          #voucher-print-area {
            position: absolute;
            left: 0;
            top: 0;
            width: 100%;
          }
        }
      `}</style>

      <Link
        href="/dashboards/vouchers"
        className="mb-5 inline-flex items-center gap-2 rounded-xl border border-[#e2e8f0] bg-white px-4 py-2.5 text-sm font-semibold text-[#475569] hover:bg-[#ffffff] print:hidden"
      >
        <ArrowLeft size={16} />
        Back to Vouchers
      </Link>

      {/* Hidden on screen — this is what actually prints: every voucher in
          the batch, not just the one sample shown in the page preview. */}
      <div id="voucher-print-area" className="hidden print:block">
        <div className="grid grid-cols-4 gap-3">
          {batchVouchers.map((v, index) => (
            <div key={v.code} className="break-inside-avoid">
              <VoucherCardPreview
                design={design}
                number={index + 1}
                code={v.code}
                password={v.password}
                packageName={batch.packageName}
                price={localizeAmountString(batch.price)}
                businessName={branding.businessName}
              />
            </div>
          ))}
          {batchVouchers.length === 0 && (
            <p className="col-span-4 text-sm text-[#64748b]">
              No vouchers found in this batch to print.
            </p>
          )}
        </div>
      </div>

      <div className="print:hidden">
        {/* Bold banner header — batch identity + primary actions live here */}
        <div className="mb-6 rounded-2xl bg-[#1e3a8a] p-6  md:p-8">
          <div className="flex flex-col justify-between gap-5 lg:flex-row lg:items-center">
            <div className="text-white">
              <p className="mb-1 flex items-center gap-2 text-xs font-bold uppercase tracking-wide text-white/80">
                <Ticket size={14} />
                Voucher Batch
              </p>
              <h1 className="text-2xl font-bold tracking-tight md:text-3xl">{batch.reference}</h1>
              <p className="mt-1 text-sm text-white/90">
                {batch.count} vouchers · {batch.packageName} · {batch.createdAt}
              </p>
              <p className="mt-1 text-sm text-white/80">
                Created by{" "}
                <span className="font-semibold text-white">
                  {agents.find((a) => a.id === batch.agentId)?.name ?? "Unknown"}
                </span>
              </p>
            </div>
            <div className="flex flex-wrap gap-3">
              <button
                type="button"
                onClick={() => setGenerateOpen(true)}
                className="inline-flex items-center gap-2 rounded-xl border-2 border-white bg-[#1d4ed8] px-5 py-3 text-sm font-bold text-white transition hover:bg-[#1e40af]"
              >
                <Plus size={16} />
                Create More Vouchers
              </button>
              <button
                type="button"
                onClick={() => window.print()}
                className="inline-flex items-center gap-2 rounded-xl bg-white px-5 py-3 text-sm font-bold text-blue-700 shadow-lg transition hover:bg-white"
              >
                <Download size={16} />
                Download PDF
              </button>
              <button
                type="button"
                data-testid="download-csv"
                onClick={downloadCsv}
                className="inline-flex items-center gap-2 rounded-xl border-2 border-white bg-[#1d4ed8] px-5 py-3 text-sm font-bold text-white transition hover:bg-[#1e40af]"
              >
                <Download size={16} />
                Download CSV
              </button>
              <button
                type="button"
                onClick={() => window.print()}
                className="inline-flex items-center gap-2 rounded-xl border-2 border-white bg-[#1d4ed8] px-5 py-3 text-sm font-bold text-white transition hover:bg-[#1e40af]"
              >
                <Printer size={16} />
                Print
              </button>
              {currentAgent.isDefault && (
                <button
                  type="button"
                  onClick={() => setDeleteChoiceOpen(true)}
                  className="inline-flex items-center gap-2 rounded-xl border-2 border-red-300 bg-red-500/20 px-5 py-3 text-sm font-bold text-white transition hover:bg-red-500/30"
                >
                  <Trash2 size={16} />
                  Delete Batch
                </button>
              )}
            </div>
          </div>
        </div>

        <BatchSalesPanel batch={batch} />

        {/* Stat row */}
        <div className="mb-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <div className="rounded-2xl border-2 border-blue-200 bg-white p-5">
            <p className="flex items-center gap-1.5 text-xs font-bold text-blue-700">
              <Ticket size={13} />
              Total
            </p>
            <p className="mt-1 text-2xl font-black text-[#0f172a]">{batch.count}</p>
          </div>
          <div className="rounded-2xl border-2 border-emerald-200 bg-white p-5">
            <p className="flex items-center gap-1.5 text-xs font-bold text-emerald-700">
              <CheckCircle2 size={13} />
              Available
            </p>
            <p className="mt-1 text-2xl font-black text-[#0f172a]">{availableCount}</p>
          </div>
          <div className="rounded-2xl border-2 border-slate-300 bg-slate-100 p-5">
            <p className="flex items-center gap-1.5 text-xs font-bold text-slate-700">
              <Clock size={13} />
              Used
            </p>
            <p className="mt-1 text-2xl font-black text-[#0f172a]">{usedCount}</p>
          </div>
          <div className="rounded-2xl border-2 border-red-200 bg-red-50 p-5">
            <p className="flex items-center gap-1.5 text-xs font-bold text-red-700">
              <XCircle size={13} />
              Expired
            </p>
            <p className="mt-1 text-2xl font-black text-[#0f172a]">{expiredCount}</p>
          </div>
        </div>

        {/* Push to Agents — available any time after creation, not just
            while generating, so a batch can be handed to an agent later.
            Only the admin sees this — a specific agent viewing their own
            batch shouldn't be redistributing vouchers to other agents. */}
        {currentAgent.isDefault && (
        <div className="mb-6 overflow-hidden rounded-2xl border-2 border-amber-200 bg-white shadow-[0_8px_24px_rgba(37,99,235,0.06)]">
          <div className="flex items-center gap-2 border-b border-amber-200 bg-amber-50 px-5 py-4">
            <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-amber-500 text-white">
              <UserCheck size={16} />
            </span>
            <div>
              <p className="text-sm font-bold text-[#0f172a]">Push to Agents</p>
              <p className="text-xs text-[#64748b]">
                Hand this whole batch to any agent linked to one of its routers — any time, not just at creation.
              </p>
            </div>
          </div>

          <div className="p-5">
            {eligibleAgents.length === 0 ? (
              <p className="text-sm text-[#94a3b8]">No agents are linked to this batch&apos;s router(s) yet.</p>
            ) : (
              <>
                <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
                  {eligibleAgents.map((agent) => {
                    const isAssigned = alreadyAssignedIds.has(agent.id);
                    const isSelected = selectedAgentIds.includes(agent.id);
                    return (
                      <label
                        key={agent.id}
                        className={`flex items-center gap-2 rounded-xl border-2 px-3 py-2.5 text-sm transition ${
                          isSelected ? "border-amber-400 bg-amber-50" : "border-[#e2e8f0] bg-white hover:bg-[#ffffff]"
                        }`}
                      >
                        <input
                          type="checkbox"
                          checked={isSelected}
                          onChange={() => toggleAgentSelection(agent.id)}
                          className="h-4 w-4 rounded border-[#e2e8f0] accent-amber-500"
                        />
                        <span className="min-w-0 flex-1 truncate text-[#475569]">{agent.name}</span>
                        {isAssigned && (
                          <span className="shrink-0 rounded-full bg-emerald-100 px-2 py-0.5 text-[10px] font-bold text-emerald-700">
                            Pushed
                          </span>
                        )}
                      </label>
                    );
                  })}
                </div>
                <button
                  type="button"
                  onClick={handlePushToAgents}
                  disabled={selectedAgentIds.length === 0}
                  className="mt-4 inline-flex items-center gap-2 rounded-xl bg-amber-500 px-5 py-2.5 text-sm font-bold text-white hover:bg-amber-600 disabled:cursor-not-allowed disabled:opacity-50"
                >
                  <UserCheck size={15} />
                  Push to {selectedAgentIds.length || ""} Selected Agent{selectedAgentIds.length === 1 ? "" : "s"}
                </button>
              </>
            )}
          </div>
        </div>
        )}

        {/* Design chooser — a horizontal strip of compact options up top,
            with the full-size preview centered underneath once you've
            picked one. Browse first, then see the result, instead of
            comparing tiny thumbnails side by side. */}
        <div className="mb-6 overflow-hidden rounded-2xl border border-[#e2e8f0] bg-white shadow-[0_8px_24px_rgba(37,99,235,0.06)]">
          <div className="border-b border-[#e2e8f0] px-5 py-4">
            <p className="text-sm font-bold text-[#0f172a]">Voucher Design</p>
            <p className="text-xs text-[#64748b]">Pick a layout — the preview below updates instantly.</p>
          </div>

          <div className="flex gap-3 overflow-x-auto border-b border-[#e2e8f0] bg-[#ffffff] px-5 py-4">
            {PRINT_DESIGNS.map((option) => {
              const isSelected = design === option.id;
              return (
                <button
                  type="button"
                  key={option.id}
                  onClick={() => selectDesign(option.id)}
                  className={`relative w-44 shrink-0 rounded-xl border-2 p-3 text-left transition hover:shadow-md ${
                    isSelected ? "border-blue-500 bg-white shadow-md" : "border-[#e2e8f0] bg-white"
                  }`}
                >
                  {isSelected && (
                    <span className="absolute right-2 top-2 flex h-5 w-5 items-center justify-center rounded-full bg-blue-600 text-white">
                      <Check size={11} />
                    </span>
                  )}
                  <p className="text-sm font-bold text-[#0f172a]">{option.name}</p>
                  <p className="mt-1 text-[11px] leading-snug text-[#64748b]">{option.description}</p>
                  <div className="mt-2 flex flex-wrap gap-1">
                    {option.tags.map((tag) => (
                      <span
                        key={tag}
                        className="rounded-full bg-[#f1f5f9] px-1.5 py-0.5 text-[9px] font-semibold text-[#64748b]"
                      >
                        {tag}
                      </span>
                    ))}
                  </div>
                </button>
              );
            })}
          </div>

          <div className="flex flex-col items-center gap-4 p-8">
            <VoucherCardPreview
              design={design}
              number={1}
              code={sampleCode}
              password={samplePassword}
              packageName={batch.packageName}
              price={localizeAmountString(batch.price)}
              businessName={branding.businessName}
            />
            <div className="rounded-xl border border-[#e2e8f0] bg-white px-4 py-2.5 text-center text-xs font-semibold text-[#475569]">
              {matchingSite ? (
                <span className="flex items-center justify-center gap-1.5">
                  <Building2 size={13} className="text-blue-500" />
                  Whole site: {matchingSite.name}
                </span>
              ) : (
                <span className="flex items-center justify-center gap-1.5">
                  <RouterIcon size={13} className="text-blue-500" />
                  {batch.routerIps.length} router{batch.routerIps.length === 1 ? "" : "s"}: {batchRouterNames.join(", ")}
                </span>
              )}
            </div>
          </div>
        </div>

        {/* Full voucher list */}
        <div className="overflow-hidden rounded-2xl border border-[#e2e8f0] bg-white shadow-[0_8px_24px_rgba(37,99,235,0.06)]">
          <div className="border-b border-[#e2e8f0] bg-[#0f172a] px-5 py-4">
            <h3 className="text-base font-bold text-white">All Vouchers in This Batch</h3>
            <p className="text-xs text-white/70">{batchVouchers.length} codes total</p>
          </div>
          <div className="max-h-[480px] overflow-auto">
            <table className="w-full min-w-[700px] text-left text-sm">
              <thead className="sticky top-0 bg-[#ffffff] text-xs text-[#64748b]">
                <tr>
                  <th className="px-4 py-3">Code{batch.loginMethod === "credentials" ? " (User)" : ""}</th>
                  {batch.loginMethod === "credentials" && <th className="px-4 py-3">Password</th>}
                  <th className="px-4 py-3">Status</th>
                  <th className="px-4 py-3">Sale Type</th>
                  <th className="px-4 py-3">Redeemed By</th>
                  <th className="px-4 py-3">Generated</th>
                  <th className="px-4 py-3">Sold</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#f1f5f9]">
                {batchVouchers.map((v) => (
                  <tr key={v.code} className="hover:bg-[#ffffff]">
                    <td className="px-4 py-3 font-mono text-xs text-[#2563eb]">{v.code}</td>
                    {batch.loginMethod === "credentials" && (
                      <td className="px-4 py-3 font-mono text-xs text-[#475569]">{v.password}</td>
                    )}
                    <td className="px-4 py-3">
                      <span
                        className={`rounded-full px-2.5 py-1 text-xs font-bold ${
                          v.status === "Available"
                            ? "bg-emerald-100 text-emerald-700"
                            : v.status === "Used"
                              ? "bg-slate-100 text-slate-700"
                              : "bg-red-100 text-red-700"
                        }`}
                      >
                        {v.status}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-[#475569]">{v.saleType}</td>
                    <td className="px-4 py-3 text-[#475569]">{v.redeemerPhone ?? "—"}</td>
                    <td className="px-4 py-3 text-[#64748b]">{v.generatedAt}</td>
                    <td className="px-4 py-3 text-[#64748b]">{v.status === "Used" ? new Date(v.usedAtMs ?? v.generatedAtMs).toLocaleString("en-GB", { day: "2-digit", month: "short", hour: "2-digit", minute: "2-digit" }) : "—"}</td>
                  </tr>
                ))}
                {batchVouchers.length === 0 && (
                  <tr>
                    <td colSpan={batch.loginMethod === "credentials" ? 7 : 6} className="px-4 py-10 text-center text-sm text-[#94a3b8]">
                      No vouchers found for this batch.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      <GenerateVouchersModal
        open={generateOpen}
        onClose={() => setGenerateOpen(false)}
        onGenerated={(newBatchId) => {
          setGenerateOpen(false);
          router.push(`/dashboards/vouchers/batch/${newBatchId}`);
        }}
      />

      {deleteChoiceOpen && (
        <div className="fixed inset-0 z-[230] flex items-center justify-center bg-slate-950/50 p-4">
          <button
            type="button"
            aria-label="Close"
            className="absolute inset-0"
            onClick={cancelDelete}
          />
          <div className="relative z-10 w-full max-w-md rounded-2xl bg-white p-6 shadow-2xl">
            {!pendingDeleteMode ? (
              <>
                <div className="mb-4 flex items-center gap-3">
                  <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-red-100 text-red-600">
                    <Trash2 size={18} />
                  </span>
                  <div>
                    <h3 className="text-base font-bold text-[#0f172a]">Delete Batch</h3>
                    <p className="text-xs text-[#64748b]">{batch.reference} · {batch.count} vouchers</p>
                  </div>
                </div>

                <p className="mb-5 text-sm text-[#475569]">
                  How do you want to delete this batch? Choose carefully — both options are permanent.
                </p>

                <div className="space-y-3">
                  <button
                    type="button"
                    onClick={() => startDeleteConfirm("full")}
                    className="w-full rounded-xl border-2 border-red-300 bg-red-50 p-4 text-left transition hover:bg-red-100"
                  >
                    <p className="text-sm font-bold text-red-700">Delete Batch + All Vouchers</p>
                    <p className="mt-1 text-xs text-red-600">
                      Removes the batch and every one of its {batch.count} voucher codes. They will
                      no longer work, even if unused.
                    </p>
                  </button>

                  <button
                    type="button"
                    onClick={() => startDeleteConfirm("keep")}
                    className="w-full rounded-xl border-2 border-amber-300 bg-white p-4 text-left transition hover:bg-amber-100"
                  >
                    <p className="text-sm font-bold text-amber-700">Delete Batch Only — Keep the Vouchers</p>
                    <p className="mt-1 text-xs text-amber-700">
                      Removes just the batch record. All {batch.count} voucher codes stay valid and
                      usable — they just won&apos;t belong to a batch anymore.
                      {batch.assignedAgentIds.length > 0 &&
                        " Any agents it was pushed to lose it from their dashboard too, same as everyone else."}
                    </p>
                  </button>

                  {batch.assignedAgentIds.length > 0 && (
                    <button
                      type="button"
                      onClick={() => startDeleteConfirm("preserve")}
                      className="w-full rounded-xl border-2 border-blue-300 bg-white p-4 text-left transition hover:bg-blue-100"
                    >
                      <p className="text-sm font-bold text-blue-700">
                        Delete From My View Only — Keep It For {batch.assignedAgentIds.length} Pushed Agent
                        {batch.assignedAgentIds.length === 1 ? "" : "s"}
                      </p>
                      <p className="mt-1 text-xs text-blue-700">
                        Removes it from your own vouchers list only. Nothing changes for the agent
                        {batch.assignedAgentIds.length === 1 ? "" : "s"} it was pushed to — they keep seeing and
                        using it on their own dashboard exactly as before.
                      </p>
                    </button>
                  )}

                  <button
                    type="button"
                    onClick={cancelDelete}
                    className="w-full rounded-xl border border-[#e2e8f0] bg-white p-3 text-center text-sm font-semibold text-[#475569] hover:bg-[#ffffff]"
                  >
                    Cancel
                  </button>
                </div>
              </>
            ) : (
              <>
                <div className="mb-4 flex items-center gap-3">
                  <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-red-100 text-red-600">
                    <Trash2 size={18} />
                  </span>
                  <div>
                    <h3 className="text-base font-bold text-[#0f172a]">Confirm Deletion</h3>
                    <p className="text-xs text-[#64748b]">
                      {pendingDeleteMode === "full"
                        ? "Batch + all vouchers"
                        : pendingDeleteMode === "preserve"
                          ? "Removed from your view — kept for pushed agents"
                          : "Batch only — vouchers kept"}
                    </p>
                  </div>
                </div>

                <p className="mb-4 text-sm text-[#475569]">
                  This can&apos;t be undone. To confirm, type the code below exactly.
                </p>

                <div className="mb-4 flex items-center justify-center rounded-xl border-2 border-dashed border-red-300 bg-red-50 py-4">
                  <span className="font-mono text-3xl font-black tracking-[0.3em] text-red-700">
                    {confirmCode}
                  </span>
                </div>

                <input
                  autoFocus
                  value={typedCode}
                  onChange={(event) => setTypedCode(event.target.value.replace(/\D/g, "").slice(0, 4))}
                  placeholder="Enter the 4-digit code"
                  inputMode="numeric"
                  className="mb-5 h-12 w-full rounded-xl border-2 border-[#e2e8f0] bg-white px-4 text-center font-mono text-lg tracking-widest outline-none focus:border-red-400"
                />

                <div className="flex gap-3">
                  <button
                    type="button"
                    onClick={finalizeDelete}
                    disabled={typedCode !== confirmCode}
                    className="flex-1 rounded-xl bg-red-600 px-5 py-3 text-sm font-bold text-white hover:bg-red-700 disabled:cursor-not-allowed disabled:opacity-40"
                  >
                    Confirm Delete
                  </button>
                  <button
                    type="button"
                    onClick={cancelDelete}
                    className="rounded-xl border border-[#e2e8f0] bg-white px-5 py-3 text-sm font-bold text-[#475569] hover:bg-[#ffffff]"
                  >
                    Cancel
                  </button>
                </div>
              </>
            )}
          </div>
        </div>
      )}
    </section>
  );
}
