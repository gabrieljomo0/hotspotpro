"use client";

import { useState, type FormEvent } from "react";
import { UserPlus } from "lucide-react";

import type { AgentRole } from "../shared/types";
import type { RouterInfo } from "../data/dashboard-data";

const ROLES: AgentRole[] = ["Associate Admin", "Field Agent", "Sub-Agent", "Viewer", "Manager"];

export function AddAgentForm({
  routers,
  onAdd,
}: {
  routers: RouterInfo[];
  onAdd: (
    name: string,
    email: string,
    role: AgentRole,
    routerIp: string | null,
  ) => void;
}) {
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [role, setRole] = useState<AgentRole>("Field Agent");
  const [routerIp, setRouterIp] = useState<string>(routers[0]?.ip ?? "");

  function handleSubmit(event: FormEvent) {
    event.preventDefault();
    if (!name.trim() || !email.trim()) return;
    onAdd(name.trim(), email.trim(), role, routerIp || null);
    setName("");
    setEmail("");
  }

  return (
    <article className="rounded-2xl border border-[#e2e8f0] bg-white p-5 shadow-[0_8px_24px_rgba(37,99,235,0.06)]">
      <div className="flex items-center gap-3">
        <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-[#f1f5f9] text-[#2563eb]">
          <UserPlus size={20} />
        </div>
        <div>
          <h3 className="text-base font-bold">Add Agent</h3>
          <p className="text-xs text-[#64748b]">Give another staff member their own profile</p>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="mt-5 space-y-4">
        <label className="block">
          <span className="mb-2 block text-sm font-semibold text-[#475569]">
            Full name
          </span>
          <input
            required
            value={name}
            onChange={(event) => setName(event.target.value)}
            placeholder="e.g. Grace Owusu"
            className="h-11 w-full rounded-xl border border-[#e2e8f0] bg-white px-3 text-sm outline-none focus:border-[#2563eb]"
          />
        </label>

        <label className="block">
          <span className="mb-2 block text-sm font-semibold text-[#475569]">
            Email
          </span>
          <input
            required
            type="email"
            value={email}
            onChange={(event) => setEmail(event.target.value)}
            placeholder="agent@hotspotpro.com"
            className="h-11 w-full rounded-xl border border-[#e2e8f0] bg-white px-3 text-sm outline-none focus:border-[#2563eb]"
          />
        </label>

        <label className="block">
          <span className="mb-2 block text-sm font-semibold text-[#475569]">
            Role
          </span>
          <select
            value={role}
            onChange={(event) => setRole(event.target.value as AgentRole)}
            className="h-11 w-full rounded-xl border border-[#e2e8f0] bg-white px-3 text-sm outline-none focus:border-[#2563eb]"
          >
            {ROLES.map((r) => (
              <option key={r} value={r}>
                {r}
              </option>
            ))}
          </select>
        </label>

        <label className="block">
          <span className="mb-2 block text-sm font-semibold text-[#475569]">
            Assigned router
          </span>
          <select
            value={routerIp}
            onChange={(event) => setRouterIp(event.target.value)}
            className="h-11 w-full rounded-xl border border-[#e2e8f0] bg-white px-3 text-sm outline-none focus:border-[#2563eb]"
          >
            {routers.map((router) => (
              <option key={router.ip} value={router.ip}>
                {router.name.split(" (")[0]}
              </option>
            ))}
          </select>
        </label>

        <button
          type="submit"
          className="w-full rounded-xl bg-[#2563eb] px-5 py-3 text-sm font-bold text-white hover:bg-[#1d4ed8]"
        >
          Add Agent
        </button>
      </form>
    </article>
  );
}
