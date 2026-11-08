"use client";

import { localizeAmountString } from "@/components/dashboard/shared/currency";
import { use, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import dynamic from "next/dynamic";
import {
  Download,
  Printer,
  Plus,
  Check,
  Ticket,
  CheckCircle2,
  Clock,
  XCircle,
} from "lucide-react";

import { settingsOf } from "@/components/dashboard/agents/agentSettings";
import { useDashboard } from "@/components/dashboard/context/DashboardContext";
import { AgentPortalPage } from "@/components/agent-portal/AgentPortalPage";
import {
  VoucherCardPreview,
  PRINT_DESIGNS,
  type PrintDesignId,
} from "@/components/dashboard/vouchers/VoucherCardPreview";

const AgentGenerateVouchersModal = dynamic(
  () => import("@/components/agent-portal/AgentGenerateVouchersModal").then((m) => m.AgentGenerateVouchersModal),
  { ssr: false },
);

export default function AgentVoucherBatchPage({
  params,
}: {
  params: Promise<{ agentId: string; voucherBatchId: string }>;
}) {
  const { agentId, voucherBatchId } = use(params);
  const router = useRouter();
  const { findBatch, setBatchPrintDesign, branding, vouchers } = useDashboard();
  const [previewDesign, setPreviewDesign] = useState<PrintDesignId | null>(null);
  const [generateOpen, setGenerateOpen] = useState(false);

  return (
    <AgentPortalPage
      agentId={agentId}
      permissionKey="voucher.view"
      featureLabel="Vouchers"
      render={(agent) => {
        const found = findBatch(voucherBatchId);
        // Agents can only open batches they made, or that admin pushed to them
        // (and only if they're allowed to see admin-pushed vouchers).
        const batch =
          found &&
          (found.agentId === agent.id ||
            (agent.permissions["voucher.viewAssignedByAdmin"] === "Allowed" &&
              found.assignedAgentIds.includes(agent.id)))
            ? found
            : undefined;

        if (!batch) {
          return (
            <div className="rounded-2xl bg-white p-10 text-center text-sm text-[#94a3b8]">
              This voucher batch may have been removed.
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
        const canGenerate =
          settingsOf(agent).allowCreateVouchers &&
          (agent.permissions["voucher.generate"] === "Allowed" || agent.permissions["voucher.sell"] === "Allowed");
        const canPrint = agent.permissions["voucher.print"] === "Allowed";

        function selectDesign(id: PrintDesignId) {
          setBatchPrintDesign(batch!.id, id);
          setPreviewDesign(id);
        }

        return (
          <section>
            <style>{`
              @media print {
                body * { visibility: hidden; }
                #voucher-print-area, #voucher-print-area * { visibility: visible; }
                #voucher-print-area { position: absolute; left: 0; top: 0; width: 100%; }
              }
            `}</style>

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
              </div>
            </div>

            <div className="print:hidden">
              <div className="mb-6 rounded-2xl bg-[#2563eb] p-6 md:p-8">
                <div className="flex flex-col justify-between gap-5 lg:flex-row lg:items-center">
                  <div className="text-white">
                    <p className="mb-1 flex items-center gap-2 text-xs font-bold uppercase tracking-wide text-white">
                      <Ticket size={14} />
                      Voucher Batch
                    </p>
                    <h1 className="text-2xl font-bold tracking-tight md:text-3xl">{batch.reference}</h1>
                    <p className="mt-1 text-sm text-white">
                      {batch.count} vouchers · {batch.packageName} · {batch.createdAt}
                    </p>
                  </div>
                  <div className="flex flex-wrap gap-3">
                    {canGenerate && (
                      <button
                        type="button"
                        onClick={() => setGenerateOpen(true)}
                        className="inline-flex items-center gap-2 rounded-xl border-2 border-white bg-[#1d4ed8] px-5 py-3 text-sm font-bold text-white transition hover:bg-[#1d4ed8]"
                      >
                        <Plus size={16} />
                        Create More Vouchers
                      </button>
                    )}
                    {canPrint && (
                      <>
                        <button
                          type="button"
                          onClick={() => window.print()}
                          className="inline-flex items-center gap-2 rounded-xl bg-white px-5 py-3 text-sm font-bold text-[#2563eb] shadow-lg transition hover:bg-slate-100"
                        >
                          <Download size={16} />
                          Download PDF
                        </button>
                        <button
                          type="button"
                          onClick={() => window.print()}
                          className="inline-flex items-center gap-2 rounded-xl border-2 border-white bg-[#1d4ed8] px-5 py-3 text-sm font-bold text-white transition hover:bg-[#1d4ed8]"
                        >
                          <Printer size={16} />
                          Print
                        </button>
                      </>
                    )}
                  </div>
                </div>
              </div>

              <div className="mb-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
                <div className="rounded-2xl border-2 bg-white p-5">
                  <p className="flex items-center gap-1.5 text-xs font-bold text-[#2563eb]">
                    <Ticket size={13} />
                    Total
                  </p>
                  <p className="mt-1 text-2xl font-black text-[#0f172a]">{batch.count}</p>
                </div>
                <div className="rounded-2xl border-2 bg-white p-5">
                  <p className="flex items-center gap-1.5 text-xs font-bold text-[#2563eb]">
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

              {canPrint && (
                <div className="mb-6 overflow-hidden rounded-2xl bg-white shadow-sm">
                  <div className="border-b px-5 py-4">
                    <p className="text-sm font-bold text-[#0f172a]">Voucher Design</p>
                    <p className="text-xs text-[#64748b]">Pick a layout — the preview below updates instantly.</p>
                  </div>
                  <div className="flex gap-3 overflow-x-auto border-b bg-[#f8fafc] px-5 py-4">
                    {PRINT_DESIGNS.map((option) => {
                      const isSelected = design === option.id;
                      return (
                        <button
                          type="button"
                          key={option.id}
                          onClick={() => selectDesign(option.id)}
                          className={`relative w-44 shrink-0 rounded-xl border-2 p-3 text-left transition hover:shadow-md ${ isSelected ? "border-[#e2e8f0] bg-white shadow-md" : "border-[#e2e8f0] bg-white" }`}
                        >
                          {isSelected && (
                            <span className="absolute right-2 top-2 flex h-5 w-5 items-center justify-center rounded-full bg-[#2563eb] text-white">
                              <Check size={11} />
                            </span>
                          )}
                          <p className="text-sm font-bold text-[#0f172a]">{option.name}</p>
                          <p className="mt-1 text-[11px] leading-snug text-[#64748b]">{option.description}</p>
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
                  </div>
                </div>
              )}

              <div className="overflow-hidden rounded-2xl bg-white shadow-sm">
                <div className="border-b bg-[#0f172a] px-5 py-4">
                  <h3 className="text-base font-bold text-white">All Vouchers in This Batch</h3>
                  <p className="text-xs text-white">{batchVouchers.length} codes total</p>
                </div>
                <div className="max-h-[480px] overflow-auto">
                  <table className="w-full min-w-[600px] text-left text-sm">
                    <thead className="sticky top-0 bg-[#f8fafc] text-xs text-[#64748b]">
                      <tr>
                        <th className="px-4 py-3">Code{batch.loginMethod === "credentials" ? " (User)" : ""}</th>
                        {batch.loginMethod === "credentials" && <th className="px-4 py-3">Password</th>}
                        <th className="px-4 py-3">Status</th>
                        <th className="px-4 py-3">Redeemed By</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-[#f1f5f9]">
                      {batchVouchers.map((v) => (
                        <tr key={v.code} className="hover:bg-[#f8fafc]">
                          <td className="px-4 py-3 font-mono text-xs text-[#2563eb]">{v.code}</td>
                          {batch.loginMethod === "credentials" && (
                            <td className="px-4 py-3 font-mono text-xs text-[#475569]">{v.password}</td>
                          )}
                          <td className="px-4 py-3">
                            <span
                              className={`rounded-full px-2.5 py-1 text-xs font-bold ${ v.status === "Available" ? "bg-[#f1f5f9] text-[#2563eb]" : v.status === "Used" ? "bg-slate-100 text-slate-700" : "bg-red-100 text-red-700" }`}
                            >
                              {v.status}
                            </span>
                          </td>
                          <td className="px-4 py-3 text-[#475569]">{v.redeemerPhone ?? "—"}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>

              <Link
                href={`/agent-portal/${agentId}/vouchers`}
                className="mt-4 inline-block text-sm font-semibold text-[#64748b] hover:text-[#475569]"
              >
                ← Back to Vouchers
              </Link>
            </div>

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
      }}
    />
  );
}
