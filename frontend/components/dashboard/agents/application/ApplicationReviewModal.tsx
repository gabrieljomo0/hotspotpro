"use client";

// Opens one application in full so you can check it, then decide.

import { useState } from "react";
import { CheckCircle2, XCircle } from "lucide-react";

import { useDashboard } from "../../context/DashboardContext";
import type { ApprovalRequest } from "../../shared/types";
import { ModalFrame } from "../detail/ModalFrame";
import { ApplicationDetails } from "./ApplicationDetails";
import { reviewApplication } from "./applicationReview";

export function ApplicationReviewModal({
  request,
  onClose,
}: {
  request: ApprovalRequest;
  onClose: () => void;
}) {
  const { agents, routers, applicationFiles, decideApproval } = useDashboard();
  const [reason, setReason] = useState("");

  const agent = agents.find((a) => a.id === request.agentId);
  const pending = request.status === "Pending" || request.status === "Under Review";

  if (!agent) {
    return (
      <ModalFrame title="Application" onClose={onClose} testId="application-review-modal">
        <p className="text-sm text-[#737373]">This agent no longer exists, so there is nothing left to review.</p>
      </ModalFrame>
    );
  }

  const review = reviewApplication(agent, agents);
  const router = routers.find((r) => r.ip === agent.routerIp);

  return (
    <ModalFrame
      title={`Application — ${agent.name}`}
      subtitle={`Submitted ${request.createdAt}`}
      onClose={onClose}
      widthClass="max-w-3xl"
      testId="application-review-modal"
    >
      <ApplicationDetails
        agent={agent}
        everyone={agents}
        files={applicationFiles[agent.id]}
        appliedFrom={router ? router.name.split(" (")[0] : null}
      />

      <div className="mt-6 border-t border-[#f4f4f4] pt-5">
        {pending ? (
          <div className="space-y-3" data-testid="decision-section">
            {review.needsAttention.length > 0 && (
              <p data-testid="attention-note" className="rounded-xl bg-amber-50 px-4 py-3 text-sm text-amber-800">
                {review.needsAttention.length} check{review.needsAttention.length === 1 ? "" : "s"} need
                {review.needsAttention.length === 1 ? "s" : ""} a second look: {review.needsAttention.map((c) => c.label).join("; ")}.
              </p>
            )}
            <input
              value={reason}
              onChange={(event) => setReason(event.target.value)}
              placeholder="Reason (shown if you reject — optional)"
              aria-label="Decision reason"
              className="h-11 w-full rounded-xl border border-[#e6e6e6] bg-white px-4 text-sm outline-none focus:border-[#1a1a1a]"
            />
            <div className="flex flex-wrap gap-3">
              <button
                type="button"
                onClick={() => {
                  decideApproval(request.id, "Approved", reason);
                  onClose();
                }}
                className="inline-flex items-center gap-2 rounded-xl bg-emerald-600 px-6 py-3 text-sm font-bold text-white hover:bg-emerald-700"
              >
                <CheckCircle2 size={16} />
                Approve agent
              </button>
              <button
                type="button"
                onClick={() => {
                  decideApproval(request.id, "Rejected", reason);
                  onClose();
                }}
                className="inline-flex items-center gap-2 rounded-xl border border-red-200 bg-white px-6 py-3 text-sm font-bold text-red-600 hover:bg-red-50"
              >
                <XCircle size={16} />
                Reject application
              </button>
              <button
                type="button"
                onClick={onClose}
                className="rounded-xl border border-[#e6e6e6] bg-white px-5 py-3 text-sm font-semibold text-[#525252] hover:bg-[#ffffff]"
              >
                Decide later
              </button>
            </div>
          </div>
        ) : (
          <div
            data-testid="decision-made"
            className={`rounded-xl border-2 px-5 py-4 ${
              request.status === "Approved" ? "border-emerald-300 bg-emerald-50" : "border-red-300 bg-red-50"
            }`}
          >
            <p className={`text-sm font-bold ${request.status === "Approved" ? "text-emerald-800" : "text-red-800"}`}>
              {request.status} by {request.decidedBy} on {request.decidedAt}
            </p>
            {request.reason && <p className="mt-1 text-xs italic text-[#737373]">&quot;{request.reason}&quot;</p>}
          </div>
        )}
      </div>
    </ModalFrame>
  );
}
