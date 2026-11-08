"use client";

import { Router as RouterIcon, User, Globe2 } from "lucide-react";

import type { RouterInfo } from "@/components/dashboard/data/dashboard-data";
import type { AgentProfile } from "@/components/dashboard/shared/types";

export type UsageScope =
  | { type: "network" }
  | { type: "router"; ip: string }
  | { type: "agent"; id: string };

export function UsageScopeSelector({
  routers,
  agents,
  scope,
  onChange,
}: {
  routers: RouterInfo[];
  agents: AgentProfile[];
  scope: UsageScope;
  onChange: (scope: UsageScope) => void;
}) {
  const scopeKey =
    scope.type === "network"
      ? "network"
      : scope.type === "router"
        ? `router:${scope.ip}`
        : `agent:${scope.id}`;

  function handleChange(value: string) {
    if (value === "network") {
      onChange({ type: "network" });
      return;
    }
    const [kind, id] = value.split(":");
    if (kind === "router") {
      onChange({ type: "router", ip: id });
    } else if (kind === "agent") {
      onChange({ type: "agent", id });
    }
  }

  return (
    <div className="mb-5 rounded-xl border border-[#f1f5f9] p-4">
      <div className="mb-3 flex items-center gap-2">
        <Globe2 size={16} className="text-[#2563eb]" />
        <p className="text-sm font-bold text-[#0f172a]">
          Check usage for
        </p>
      </div>

      <select
        value={scopeKey}
        onChange={(event) => handleChange(event.target.value)}
        className="h-11 w-full rounded-xl border border-[#e2e8f0] bg-white px-3 text-sm outline-none focus:border-[#2563eb] sm:max-w-sm"
      >
        <option value="network">Whole Network</option>
        <optgroup label="By Router">
          {routers.map((router) => (
            <option key={router.ip} value={`router:${router.ip}`}>
              {router.name.split(" (")[0]}
            </option>
          ))}
        </optgroup>
        <optgroup label="By Agent / Reseller">
          {agents.map((agent) => (
            <option key={agent.id} value={`agent:${agent.id}`}>
              {agent.name}
            </option>
          ))}
        </optgroup>
      </select>

      {scope.type === "router" && (
        <p className="mt-2 flex items-center gap-1.5 text-xs text-[#64748b]">
          <RouterIcon size={13} />
          Showing usage recorded on this router only.
        </p>
      )}

      {scope.type === "agent" && (
        <p className="mt-2 flex items-center gap-1.5 text-xs text-[#64748b]">
          <User size={13} />
          Showing usage from customers this agent has sold vouchers to.
        </p>
      )}
    </div>
  );
}
