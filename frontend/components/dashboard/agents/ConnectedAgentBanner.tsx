"use client";

import Link from "next/link";
import { UserCircle2 } from "lucide-react";

import { useDashboard } from "../context/DashboardContext";

export function ConnectedAgentBanner() {
  const { currentAgent } = useDashboard();

  return (
    <div className="mb-5 flex items-center justify-between gap-3 rounded-xl border border-[#e6e6e6] bg-[#ffffff] px-4 py-3">
      <div className="flex items-center gap-3">
        <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-[#f4f4f4] text-[#1a1a1a]">
          <UserCircle2 size={18} />
        </div>
        <p className="text-sm text-[#525252]">
          Connected to agent profile{" "}
          <strong className="text-[#1a1a1a]">{currentAgent.name}</strong>{" "}
          <span className="text-xs text-[#737373]">({currentAgent.role})</span>
        </p>
      </div>

      <Link
        href="/dashboards/agents"
        className="text-xs font-semibold text-[#1a1a1a] hover:underline"
      >
        Switch agent
      </Link>
    </div>
  );
}
