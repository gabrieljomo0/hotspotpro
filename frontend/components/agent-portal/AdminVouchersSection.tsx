"use client";

// Only shows up if the admin has granted this agent the
// "voucher.viewAssignedByAdmin" permission. Lets the agent see voucher
// batches their admin has generated and pushed to them, without needing
// to (or being able to) generate their own — useful for agents who rely
// entirely on vouchers their admin hands out.

import { localizeAmountString } from "@/components/dashboard/shared/currency";
import Link from "next/link";
import { Ticket, Gift } from "lucide-react";

import { useDashboard } from "@/components/dashboard/context/DashboardContext";
import type { AgentProfile } from "@/components/dashboard/shared/types";

export function AdminVouchersSection({ agent }: { agent: AgentProfile }) {
  const { getAssignedVoucherBatchesForAgent } = useDashboard();

  // Admin hasn't granted this agent permission to see vouchers pushed to them.
  if (agent.permissions["voucher.viewAssignedByAdmin"] !== "Allowed") return null;

  const assignedBatches = getAssignedVoucherBatchesForAgent(agent.id);

  // Only appears once the admin has actually pushed vouchers to this agent.
  if (assignedBatches.length === 0) return null;

  return (
    <article className="mt-5 rounded-2xl bg-white p-5 shadow-sm">
      <div className="mb-3">
        <p className="flex items-center gap-2 text-sm font-bold text-[#0f172a]">
          <Ticket size={15} className="text-[#2563eb]" />
          Vouchers From Admin
        </p>
        <p className="text-xs text-[#94a3b8]">
          Voucher batches your admin has generated and pushed to you directly.
        </p>
      </div>

      {assignedBatches.length === 0 ? (
        <p className="text-sm text-[#94a3b8]">Nothing pushed to you yet.</p>
      ) : (
        <div className="space-y-2">
          {assignedBatches.map((batch) => (
            <Link key={batch.id} href={`/agent-portal/${agent.id}/vouchers/batch/${batch.id}`} data-testid="admin-batch-link" className="flex items-center justify-between gap-3 rounded-lg bg-[#f8fafc] px-3 py-2.5 text-sm hover:bg-[#f1f5f9]">
              <div className="min-w-0">
                <p className="flex items-center gap-1.5 truncate font-semibold text-[#0f172a]">
                  {batch.isGiveaway && <Gift size={12} className="shrink-0 text-[#2563eb]" />}
                  {batch.reference}
                </p>
                <p className="truncate text-xs text-[#94a3b8]">
                  {batch.packageName} · {localizeAmountString(batch.price)} · {batch.createdAt}
                </p>
              </div>
              <span className="shrink-0 rounded-full bg-[#f1f5f9] px-2.5 py-1 text-xs font-bold text-[#2563eb]">
                {batch.count} vouchers
              </span>
            </Link>
          ))}
        </div>
      )}
    </article>
  );
}
