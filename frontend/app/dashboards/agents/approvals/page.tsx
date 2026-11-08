"use client";

import { localizeAmountsInText } from "@/components/dashboard/shared/currency";
import { useState } from "react";
import { CheckCircle2, XCircle } from "lucide-react";

import { useDashboard } from "@/components/dashboard/context/DashboardContext";
import { BackLink } from "@/components/dashboard/shared/BackLink";
import type { ApprovalStatus } from "@/components/dashboard/shared/types";

const STATUS_COLOR: Record<ApprovalStatus, string> = {
  Pending: "bg-amber-100 text-amber-700",
  "Under Review": "bg-blue-100 text-blue-700",
  Approved: "bg-emerald-100 text-emerald-700",
  Rejected: "bg-red-100 text-red-700",
  Cancelled: "bg-slate-200 text-slate-700",
};

export default function ApprovalCenterPage() {
  const { approvalRequests, decideApproval } = useDashboard();
  const [statusFilter, setStatusFilter] = useState<"All" | ApprovalStatus>("Pending");
  const [reasonDraft, setReasonDraft] = useState<Record<string, string>>({});

  const visible = approvalRequests.filter(
    (request) => statusFilter === "All" || request.status === statusFilter,
  );

  return (
    <section className="w-full">
      <BackLink />
      <h2 className="mb-1 text-3xl font-bold tracking-tight md:text-4xl">
        Approval Center
      </h2>
      <p className="mb-6 max-w-2xl text-sm text-[#64748b] md:text-base">
        One queue for every sensitive request — new agents, credit, refunds,
        permission changes, and more — instead of scattering approvals
        throughout the system.
      </p>


      <div className="mb-4 flex flex-wrap gap-2">
        {(["Pending", "Under Review", "Approved", "Rejected", "Cancelled", "All"] as Array<"All" | ApprovalStatus>).map(
          (status) => (
            <button
              type="button"
              key={status}
              onClick={() => setStatusFilter(status)}
              className={`rounded-lg border px-3 py-2 text-xs font-semibold transition ${
                statusFilter === status
                  ? "border-[#2563eb] bg-[#f1f5f9] text-[#2563eb]"
                  : "border-[#e2e8f0] bg-white text-[#475569] hover:bg-[#ffffff]"
              }`}
            >
              {status}
            </button>
          ),
        )}
      </div>

      <div className="space-y-3">
        {visible.length === 0 && (
          <div className="rounded-2xl border border-[#e2e8f0] bg-white p-8 text-center text-sm text-[#94a3b8]">
            No requests match this filter.
          </div>
        )}

        {visible.map((request) => (
          <article
            key={request.id}
            className="rounded-2xl border border-[#e2e8f0] bg-white p-5 shadow-[0_8px_24px_rgba(37,99,235,0.06)]"
          >
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div>
                <div className="flex items-center gap-2">
                  <span className="rounded-full bg-[#f1f5f9] px-2.5 py-1 text-xs font-bold text-[#2563eb]">
                    {request.type}
                  </span>
                  <span className={`rounded-full px-2.5 py-1 text-xs font-semibold ${STATUS_COLOR[request.status as ApprovalStatus]}`}>
                    {request.status}
                  </span>
                </div>
                <p className="mt-2 text-sm font-semibold text-[#0f172a]">
                  {request.agentName}
                </p>
                <p className="text-sm text-[#64748b]">{localizeAmountsInText(request.summary)}</p>
                <p className="mt-1 text-xs text-[#94a3b8]">
                  Submitted {request.createdAt}
                  {request.decidedAt && ` · Decided ${request.decidedAt} by ${request.decidedBy}`}
                </p>
                {request.reason && (
                  <p className="mt-1 text-xs italic text-[#94a3b8]">
                    &quot;{request.reason}&quot;
                  </p>
                )}
              </div>

              {(request.status === "Pending" || request.status === "Under Review") && (
                <div className="flex shrink-0 flex-col items-end gap-2">
                  <input
                    value={reasonDraft[request.id] ?? ""}
                    onChange={(event) =>
                      setReasonDraft((current) => ({ ...current, [request.id]: event.target.value }))
                    }
                    placeholder="Reason (optional)"
                    className="h-9 w-56 rounded-lg border border-[#e2e8f0] bg-white px-3 text-xs outline-none focus:border-[#2563eb]"
                  />
                  <div className="flex gap-2">
                    <button
                      type="button"
                      onClick={() => decideApproval(request.id, "Approved", reasonDraft[request.id] ?? "")}
                      className="inline-flex items-center gap-1.5 rounded-lg bg-emerald-600 px-3 py-2 text-xs font-bold text-white hover:bg-emerald-700"
                    >
                      <CheckCircle2 size={13} />
                      Approve
                    </button>
                    <button
                      type="button"
                      onClick={() => decideApproval(request.id, "Rejected", reasonDraft[request.id] ?? "")}
                      className="inline-flex items-center gap-1.5 rounded-lg border border-red-200 bg-white px-3 py-2 text-xs font-bold text-red-600 hover:bg-red-50"
                    >
                      <XCircle size={13} />
                      Reject
                    </button>
                  </div>
                </div>
              )}
            </div>
          </article>
        ))}
      </div>
    </section>
  );
}
