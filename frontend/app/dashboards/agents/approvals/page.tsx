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
      <p className="mb-6 max-w-2xl text-sm text-[#737373] md:text-base">
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
                  ? "border-[#1a1a1a] bg-[#f4f4f4] text-[#1a1a1a]"
                  : "border-[#e6e6e6] bg-white text-[#525252] hover:bg-[#ffffff]"
              }`}
            >
              {status}
            </button>
          ),
        )}
      </div>

      <div className="space-y-3">
        {visible.length === 0 && (
          <div className="rounded-2xl border border-[#e6e6e6] bg-white p-8 text-center text-sm text-[#a3a3a3]">
            No requests match this filter.
          </div>
        )}

        {visible.map((request) => (
          <article
            key={request.id}
            className="rounded-2xl border border-[#e6e6e6] bg-white p-5 shadow-[0_8px_24px_rgba(26,26,26,0.06)]"
          >
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div>
                <div className="flex items-center gap-2">
                  <span className="rounded-full bg-[#f4f4f4] px-2.5 py-1 text-xs font-bold text-[#1a1a1a]">
                    {request.type}
                  </span>
                  <span className={`rounded-full px-2.5 py-1 text-xs font-semibold ${STATUS_COLOR[request.status as ApprovalStatus]}`}>
                    {request.status}
                  </span>
                </div>
                <p className="mt-2 text-sm font-semibold text-[#1a1a1a]">
                  {request.agentName}
                </p>
                <p className="text-sm text-[#737373]">{localizeAmountsInText(request.summary)}</p>
                <p className="mt-1 text-xs text-[#a3a3a3]">
                  Submitted {request.createdAt}
                  {request.decidedAt && ` · Decided ${request.decidedAt} by ${request.decidedBy}`}
                </p>
                {request.reason && (
                  <p className="mt-1 text-xs italic text-[#a3a3a3]">
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
                    className="h-9 w-56 rounded-lg border border-[#e6e6e6] bg-white px-3 text-xs outline-none focus:border-[#1a1a1a]"
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
