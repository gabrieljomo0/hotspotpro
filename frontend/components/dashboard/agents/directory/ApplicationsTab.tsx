"use client";

// The "Agent Applications" tab: everyone who has applied (on the captive
// portal's reseller form), with the key details at a glance and a check count.
// Review opens the full application — every field they entered, their ID and
// selfie, and a checklist — to decide on.

import { useEffect, useState } from "react";
import { Search } from "lucide-react";

import { useDashboard } from "../../context/DashboardContext";
import type { ApprovalRequest } from "../../shared/types";
import { ApplicantEmailsPanel } from "./ApplicantEmailsPanel";
import { isSampleId } from "../application/sampleApplications";
import { reviewApplication } from "../application/applicationReview";
import { ApplicationReviewModal } from "../application/ApplicationReviewModal";

const STATUS_STYLE: Record<string, string> = {
  Approved: "bg-emerald-100 text-emerald-700",
  Rejected: "bg-red-100 text-red-700",
};

export function ApplicationsTab() {
  const {
    approvalRequests,
    agents,
    routers,
    notifiedApplicationIds,
    markApplicationsNotified,
    storeReady,
    loadSampleApplications,
    removeSampleApplications,
  } = useDashboard();
  const [filter, setFilter] = useState<"Pending" | "All">("Pending");
  const [search, setSearch] = useState("");
  const [reviewing, setReviewing] = useState<ApprovalRequest | null>(null);

  const applications = approvalRequests.filter((r) => r.type === "New Agent");
  const waiting = applications.filter((r) => r.status === "Pending" || r.status === "Under Review");
  const base = filter === "Pending" ? waiting : applications;

  // Looking at this tab counts as seeing the applications on it, so the
  // dashboard pop-up doesn't announce what is already in front of you.
  const unseenIds = waiting.map((r) => r.id).filter((id) => !notifiedApplicationIds.includes(id));
  const unseenKey = unseenIds.join("|");
  useEffect(() => {
    if (unseenIds.length > 0) markApplicationsNotified(unseenIds);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [unseenKey]);

  // The first time this tab is opened with nothing in it, fill it with example
  // applications so there is something to look at. Once only — if you remove
  // them they stay removed (the button below brings them back).
  const SEEDED_KEY = "hotspotpro:v2:sampleApplicationsSeeded";
  const hasApplications = applications.length > 0;
  useEffect(() => {
    if (!storeReady || hasApplications) return;
    try {
      if (window.localStorage.getItem(SEEDED_KEY)) return;
      window.localStorage.setItem(SEEDED_KEY, "1");
    } catch {
      return;
    }
    loadSampleApplications();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [storeReady, hasApplications]);
  const hasSamples = applications.some((r) => isSampleId(r.id));

  const needle = search.trim().toLowerCase();
  const rows = base.filter((request) => {
    if (!needle) return true;
    const agent = agents.find((a) => a.id === request.agentId);
    return [request.agentName, agent?.email ?? "", agent?.phone ?? "", agent?.location ?? "", agent?.username ?? ""]
      .join(" ")
      .toLowerCase()
      .includes(needle);
  });

  // The review window always reads the live request, so it reflects a decision.
  const live = reviewing ? approvalRequests.find((r) => r.id === reviewing.id) ?? reviewing : null;

  return (
    <div data-testid="applications-tab">
      {hasSamples && (
        <div
          data-testid="sample-banner"
          className="mb-4 flex flex-wrap items-center justify-between gap-3 rounded-xl border border-blue-200 bg-white px-4 py-3 text-sm text-blue-900"
        >
          <p>
            These are <strong>sample applications</strong> so you can see how this tab works — a waiting application, one
            under review, one approved and one rejected. Real applications from the captive portal appear here too.
          </p>
          <button
            type="button"
            data-testid="remove-samples"
            onClick={removeSampleApplications}
            className="rounded-lg border border-blue-300 bg-white px-3 py-1.5 text-xs font-bold text-blue-800 hover:bg-blue-100"
          >
            Remove samples
          </button>
        </div>
      )}

      <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
        <div className="flex gap-2">
          {(["Pending", "All"] as const).map((key) => (
            <button
              type="button"
              key={key}
              onClick={() => setFilter(key)}
              className={`rounded-lg border px-3 py-2 text-xs font-semibold transition ${
                filter === key
                  ? "border-[#2563eb] bg-[#f1f5f9] text-[#2563eb]"
                  : "border-[#e2e8f0] bg-white text-[#475569] hover:bg-[#ffffff]"
              }`}
            >
              {key === "Pending" ? `Awaiting Decision (${waiting.length})` : `All Applications (${applications.length})`}
            </button>
          ))}
        </div>
        <div className="relative">
          <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-[#94a3b8]" />
          <input
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            placeholder="Search applicants"
            aria-label="Search applications"
            className="h-10 w-56 rounded-lg border border-[#e2e8f0] bg-white pl-8 pr-3 text-sm outline-none focus:border-[#2563eb]"
          />
        </div>
      </div>

      <article className="overflow-hidden rounded-2xl border border-[#e2e8f0] bg-white shadow-[0_8px_24px_rgba(37,99,235,0.06)]">
        <div className="overflow-x-auto">
          <table className="w-full min-w-[900px] text-left text-sm" data-testid="applications-table">
            <thead className="bg-[#ffffff] text-xs text-[#64748b]">
              <tr>
                <th className="px-4 py-4 font-semibold">Applicant</th>
                <th className="px-4 py-4 font-semibold">Phone</th>
                <th className="px-4 py-4 font-semibold">Location</th>
                <th className="px-4 py-4 font-semibold">Applied from</th>
                <th className="px-4 py-4 font-semibold">Submitted</th>
                <th className="px-4 py-4 font-semibold">Checks</th>
                <th className="px-4 py-4 font-semibold">Status</th>
                <th className="px-4 py-4 text-right font-semibold">Details</th>
              </tr>
            </thead>
            <tbody>
              {rows.length === 0 && (
                <tr>
                  <td colSpan={8} className="px-4 py-10 text-center text-[#94a3b8]">
                    No agent applications match this filter.
                    {applications.length === 0 && (
                      <button
                        type="button"
                        data-testid="load-samples"
                        onClick={() => loadSampleApplications()}
                        className="ml-3 rounded-lg bg-[#2563eb] px-3 py-1.5 text-xs font-bold text-white hover:bg-[#1d4ed8]"
                      >
                        Load sample applications
                      </button>
                    )}
                  </td>
                </tr>
              )}
              {rows.map((request) => {
                const agent = agents.find((a) => a.id === request.agentId);
                const review = agent ? reviewApplication(agent, agents) : null;
                const router = agent ? routers.find((r) => r.ip === agent.routerIp) : null;
                return (
                  <tr key={request.id} className="border-t border-[#f1f5f9] hover:bg-[#ffffff]" data-testid="application-row">
                    <td className="px-4 py-4">
                      <p className="font-semibold text-[#0f172a]">{request.agentName}</p>
                      <p className="text-xs text-[#94a3b8]">{agent?.email ?? "Agent removed"}</p>
                    </td>
                    <td className="px-4 py-4 text-[#475569]">{agent?.phone ?? "—"}</td>
                    <td className="px-4 py-4 text-[#475569]">{agent?.location ?? "—"}</td>
                    <td className="px-4 py-4 text-[#475569]">{router ? router.name.split(" (")[0] : "—"}</td>
                    <td className="px-4 py-4 text-[#64748b]">{request.createdAt}</td>
                    <td className="px-4 py-4">
                      {review ? (
                        <span
                          data-testid="row-checks"
                          className={`rounded-full px-2.5 py-1 text-xs font-bold ${
                            review.passed === review.total ? "bg-emerald-100 text-emerald-700" : "bg-amber-100 text-amber-700"
                          }`}
                        >
                          {review.passed} / {review.total}
                        </span>
                      ) : (
                        "—"
                      )}
                    </td>
                    <td className="px-4 py-4">
                      <span className={`rounded-full px-2.5 py-1 text-xs font-semibold ${STATUS_STYLE[request.status] ?? "bg-amber-100 text-amber-700"}`}>
                        {request.status}
                      </span>
                    </td>
                    <td className="px-4 py-4 text-right">
                      <button
                        type="button"
                        onClick={() => setReviewing(request)}
                        className="rounded-lg bg-[#2563eb] px-3.5 py-2 text-xs font-bold text-white hover:bg-[#1d4ed8]"
                      >
                        {request.status === "Pending" || request.status === "Under Review" ? "Review" : "Open"}
                      </button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </article>

      <ApplicantEmailsPanel />

      {live && <ApplicationReviewModal request={live} onClose={() => setReviewing(null)} />}
    </div>
  );
}
