"use client";

import { Crown, ShieldCheck, UserCog, Eye, Trash2, LogIn, Router as RouterIcon } from "lucide-react";

import type { AgentProfile } from "../shared/types";
import type { RouterInfo } from "../data/dashboard-data";

const ROLE_ICON = {
  Owner: Crown,
  Manager: ShieldCheck,
  "Field Agent": UserCog,
  "Associate Admin": ShieldCheck,
  "Sub-Agent": UserCog,
  Viewer: Eye,
};

export function AgentsList({
  agents,
  routers,
  currentAgentId,
  onSwitch,
  onDelete,
}: {
  agents: AgentProfile[];
  routers: RouterInfo[];
  currentAgentId: string;
  onSwitch: (id: string) => void;
  onDelete: (id: string) => void;
}) {
  return (
    <article className="overflow-hidden rounded-2xl border border-[#e2e8f0] bg-white shadow-[0_8px_24px_rgba(37,99,235,0.06)]">
      <div className="border-b border-[#e2e8f0] px-5 py-4">
        <h3 className="text-base font-bold">Agent Profiles ({agents.length})</h3>
        <p className="mt-1 text-xs text-[#64748b]">
          Vouchers and packages are created under whichever agent profile is
          active.
        </p>
      </div>

      <div className="divide-y divide-[#f1f5f9]">
        {agents.map((agent) => {
          const Icon = ROLE_ICON[agent.role];
          const isCurrent = agent.id === currentAgentId;
          const router = routers.find((r) => r.ip === agent.routerIp);

          return (
            <div
              key={agent.id}
              className={`flex flex-col gap-3 px-5 py-4 sm:flex-row sm:items-center sm:justify-between ${
                isCurrent ? "bg-[#f1f5f9]" : ""
              }`}
            >
              <div className="flex items-center gap-3">
                <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-[#f1f5f9] text-[#2563eb]">
                  <Icon size={20} />
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <p className="font-bold text-[#0f172a]">{agent.name}</p>
                    {agent.isDefault && (
                      <span className="rounded-full bg-amber-100 px-2 py-0.5 text-[11px] font-bold text-amber-700">
                        Default
                      </span>
                    )}
                    {isCurrent && (
                      <span className="rounded-full bg-emerald-100 px-2 py-0.5 text-[11px] font-bold text-emerald-700">
                        Active
                      </span>
                    )}
                  </div>
                  <p className="text-xs text-[#64748b]">
                    {agent.email} · {agent.role} · Added {agent.createdAt}
                  </p>
                  {router && (
                    <p className="mt-1 flex items-center gap-1 text-xs text-[#2563eb]">
                      <RouterIcon size={12} />
                      {router.name.split(" (")[0]}
                    </p>
                  )}
                </div>
              </div>

              <div className="flex gap-2">
                {!isCurrent && (
                  <button
                    type="button"
                    onClick={() => onSwitch(agent.id)}
                    className="inline-flex items-center gap-1.5 rounded-lg border border-[#e2e8f0] px-3 py-2 text-xs font-semibold text-[#475569] hover:bg-[#ffffff]"
                  >
                    <LogIn size={14} />
                    Use this profile
                  </button>
                )}

                <button
                  type="button"
                  disabled={agent.isDefault}
                  onClick={() => onDelete(agent.id)}
                  className="inline-flex items-center gap-1.5 rounded-lg border border-[#e2e8f0] px-3 py-2 text-xs font-semibold text-red-600 hover:bg-red-50 disabled:cursor-not-allowed disabled:opacity-40 disabled:hover:bg-transparent"
                  title={
                    agent.isDefault
                      ? "The default owner profile cannot be deleted"
                      : "Remove agent"
                  }
                >
                  <Trash2 size={14} />
                  Remove
                </button>
              </div>
            </div>
          );
        })}
      </div>
    </article>
  );
}
