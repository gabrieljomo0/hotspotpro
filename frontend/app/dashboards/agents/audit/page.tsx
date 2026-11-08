"use client";

import { useState } from "react";
import { History } from "lucide-react";

import { useDashboard } from "@/components/dashboard/context/DashboardContext";
import { BackLink } from "@/components/dashboard/shared/BackLink";

export default function AgentAuditPage() {
  const { activityLog, agents } = useDashboard();
  const [agentFilter, setAgentFilter] = useState("All");

  const agentEvents = activityLog.filter((entry) => entry.category === "Agent");
  const visible = agentEvents.filter(
    (entry) => agentFilter === "All" || entry.message.includes(agentFilter),
  );

  return (
    <section className="w-full">
      <BackLink />
      <h2 className="mb-1 text-3xl font-bold tracking-tight md:text-4xl">
        Activity &amp; Audit
      </h2>
      <p className="mb-6 max-w-2xl text-sm text-[#737373] md:text-base">
        An immutable trail of every important agent action — logins, resets,
        permission changes, approvals, suspensions, and wallet adjustments.
      </p>


      <div className="mb-4">
        <select
          value={agentFilter}
          onChange={(event) => setAgentFilter(event.target.value)}
          className="h-10 rounded-lg border border-[#e6e6e6] bg-white px-3 text-sm outline-none focus:border-[#1a1a1a]"
        >
          <option value="All">All Agents</option>
          {agents.map((agent) => (
            <option key={agent.id} value={agent.name}>
              {agent.name}
            </option>
          ))}
        </select>
      </div>

      <article className="overflow-hidden rounded-2xl border border-[#e6e6e6] bg-white shadow-[0_8px_24px_rgba(26,26,26,0.06)]">
        {visible.length === 0 ? (
          <p className="px-5 py-10 text-center text-sm text-[#a3a3a3]">
            No agent activity recorded yet.
          </p>
        ) : (
          <table className="w-full text-left text-sm">
            <thead className="bg-[#ffffff] text-xs text-[#737373]">
              <tr>
                <th className="px-5 py-3 font-semibold">When</th>
                <th className="px-5 py-3 font-semibold">Event</th>
              </tr>
            </thead>
            <tbody>
              {visible.map((entry) => (
                <tr key={entry.id} className="border-t border-[#f4f4f4]">
                  <td className="whitespace-nowrap px-5 py-3 text-[#737373]">{entry.timestamp}</td>
                  <td className="px-5 py-3 text-[#1a1a1a]">
                    <span className="inline-flex items-center gap-2">
                      <History size={13} className="text-[#a3a3a3]" />
                      {entry.message}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </article>
    </section>
  );
}
