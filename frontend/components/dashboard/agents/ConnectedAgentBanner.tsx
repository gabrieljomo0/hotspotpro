"use client";

import Link from "next/link";
import { UserCircle2 } from "lucide-react";

import { useDashboard } from "../context/DashboardContext";

export function ConnectedAgentBanner() {
  const { currentAgent } = useDashboard();

  return (
    <div className="mb-5 flex items-center justify-between gap-3 rounded-xl border border-[#e2e8f0] bg-[#ffffff] px-4 py-3">
      <div className="flex items-center gap-3">
        <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-[#f1f5f9] text-[#2563eb]">
          <UserCircle2 size={18} />
        </div>
        <p className="text-sm text-[#475569]">
          Connected to agent profile{" "}
          <strong className="text-[#0f172a]">{currentAgent.name}</strong>{" "}
          <span className="text-xs text-[#64748b]">({currentAgent.role})</span>
        </p>
      </div>

      <Link
        href="/dashboards/agents"
        className="text-xs font-semibold text-[#2563eb] hover:underline"
      >
        Switch agent
      </Link>
    </div>
  );
}
