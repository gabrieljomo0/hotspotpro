"use client";

// The main Agents page, kept simple. Two tabs:
//   * All Agents         — headline numbers, anything awaiting your decision,
//                          and a short list of your agents (their revenue and
//                          what they owe live here too)
//   * Agent Applications — everyone who applied on the captive portal, opened
//                          in full to check and decide
// "Add agent" in the header opens a window to add someone yourself. Everything
// else about an agent — settings, permissions, wallet, activity — is on their
// own page (View).

import { Suspense, useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { UserPlus } from "lucide-react";

import { useDashboard } from "@/components/dashboard/context/DashboardContext";
import {
  AgentsMainTabs,
  opensAddAgent,
  parseAgentsTab,
  SMS_EMAIL_PATH,
  wasMessagesTab,
  type AgentsMainTab,
} from "@/components/dashboard/agents/AgentsMainTabs";
import { AddAgentModal } from "@/components/dashboard/agents/AddAgentModal";
import { AllAgentsTab } from "@/components/dashboard/agents/directory/AllAgentsTab";
import { ApplicationsTab } from "@/components/dashboard/agents/directory/ApplicationsTab";
import { EditAgentModal } from "@/components/dashboard/agents/detail/EditAgentModal";
import { BackLink } from "@/components/dashboard/shared/BackLink";
import type { AgentProfile } from "@/components/dashboard/shared/types";

function AgentDirectoryPage() {
  const { agents, approvalRequests } = useDashboard();
  const router = useRouter();
  const searchParams = useSearchParams();
  const tabParam = searchParams.get("tab");
  const addParam = searchParams.get("add");
  const [tab, setTabState] = useState<AgentsMainTab>(parseAgentsTab(tabParam));
  const [addOpen, setAddOpen] = useState(opensAddAgent(tabParam, addParam));
  const [editingId, setEditingId] = useState<string | null>(null);
  const [howOpen, setHowOpen] = useState(false);

  // Follow the address bar when it changes while this page stays open — e.g.
  // clicking "Agents" in the sidebar while on another tab goes back to All
  // Agents, and a link to ?tab=applications opens that tab straight away.
  useEffect(() => {
    // SMS & Email moved to Settings: an old link to it goes there.
    if (wasMessagesTab(tabParam)) {
      router.replace(SMS_EMAIL_PATH);
      return;
    }
    setTabState(parseAgentsTab(tabParam));
    if (opensAddAgent(tabParam, addParam)) setAddOpen(true);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tabParam, addParam]);

  // Keep the address bar in step with the tab, so a refresh, a bookmark or a
  // shared link reopens the same tab (without reloading anything).
  function setTab(next: AgentsMainTab) {
    setTabState(next);
    if (typeof window !== "undefined") {
      const url = new URL(window.location.href);
      if (next === "all") url.searchParams.delete("tab");
      else url.searchParams.set("tab", next);
      window.history.replaceState(window.history.state, "", url.pathname + url.search);
    }
  }

  function closeAdd() {
    setAddOpen(false);
    if (typeof window !== "undefined") {
      const url = new URL(window.location.href);
      url.searchParams.delete("add");
      if (url.searchParams.get("tab") === "create") url.searchParams.delete("tab");
      window.history.replaceState(window.history.state, "", url.pathname + url.search);
    }
  }

  const waitingApplications = approvalRequests.filter(
    (r) => r.type === "New Agent" && (r.status === "Pending" || r.status === "Under Review"),
  ).length;
  const editing: AgentProfile | undefined = editingId ? agents.find((a) => a.id === editingId) : undefined;

  return (
    <section className="w-full">
      <BackLink />
      <div className="mb-6 flex flex-wrap items-start justify-between gap-4">
        <div>
          <h2 className="mb-1 text-3xl font-bold tracking-tight md:text-4xl">Agents</h2>
          <p className="max-w-2xl text-sm text-[#64748b] md:text-base">
            Resellers who sell vouchers and collect payments in the field.{" "}
            <button
              type="button"
              onClick={() => setHowOpen((open) => !open)}
              aria-expanded={howOpen}
              className="font-semibold text-[#2563eb] hover:underline"
            >
              How it works
            </button>
          </p>
        </div>

        <div className="flex flex-wrap gap-2">
          <button
            type="button"
            onClick={() => setAddOpen(true)}
            className="inline-flex items-center gap-2 rounded-xl bg-[#2563eb] px-4 py-2.5 text-sm font-bold text-white hover:bg-[#1d4ed8]"
          >
            <UserPlus size={15} />
            Add agent
          </button>
        </div>
      </div>

      {howOpen && (
        <div
          data-testid="agents-how-it-works"
          className="mb-6 max-w-3xl space-y-2 rounded-xl border border-[#e2e8f0] bg-[#ffffff] px-4 py-3 text-sm text-[#64748b]"
        >
          <p>
            Agents are resellers: they sign in to their own portal, generate and sell vouchers for the router they are
            assigned to, and earn commission on what they sell. Add one yourself with Add agent, or review the people
            who apply on the captive portal under Agent Applications.
          </p>
          <p>
            Open an agent (View) to change what they may see and do, their permissions, wallet and commission, or to
            turn their access off. Every account starts with a default Owner profile — it can never be deleted.
          </p>
        </div>
      )}

      <AgentsMainTabs active={tab} onChange={setTab} applicationsCount={waitingApplications} />

      {tab === "all" && <AllAgentsTab onEdit={(agent) => setEditingId(agent.id)} onOpenApplications={() => setTab("applications")} />}
      {tab === "applications" && <ApplicationsTab />}

      {addOpen && <AddAgentModal onClose={closeAdd} />}
      {editing && <EditAgentModal agent={editing} onClose={() => setEditingId(null)} />}
    </section>
  );
}

// useSearchParams needs a Suspense boundary for the page to build for
// production.
export default function AgentsPage() {
  return (
    <Suspense fallback={null}>
      <AgentDirectoryPage />
    </Suspense>
  );
}
