"use client";

import { useState } from "react";
import Link from "next/link";
import { Lock, Pencil, Search, ShieldCheck, Users2 } from "lucide-react";

import { useDashboard } from "@/components/dashboard/context/DashboardContext";
import { BackLink } from "@/components/dashboard/shared/BackLink";
import {
  ACCESS_ROLE_PRESETS,
  countAccessPermissions,
} from "@/components/dashboard/settings/systemUsersSchema";

export default function AccessRolesPage() {
  const { systemUsers, accessRolePermissions, accessRoleOverrides } = useDashboard();
  const [query, setQuery] = useState("");

  const memberCounts: Record<string, number> = {};
  systemUsers.forEach((user) => {
    memberCounts[user.accessRoleKey] = (memberCounts[user.accessRoleKey] ?? 0) + 1;
  });

  const editableCount = ACCESS_ROLE_PRESETS.filter((r) => !r.locked).length;
  const systemCount = ACCESS_ROLE_PRESETS.filter((r) => r.locked).length;

  const visibleRoles = ACCESS_ROLE_PRESETS.filter((role) => {
    if (!query) return true;
    const q = query.toLowerCase();
    const name = accessRoleOverrides[role.key]?.name ?? role.name;
    const description = accessRoleOverrides[role.key]?.description ?? role.description;
    return name.toLowerCase().includes(q) || description.toLowerCase().includes(q);
  });

  return (
    <section className="w-full">
      <BackLink />
      <div className="mb-6 flex flex-wrap items-start justify-between gap-4">
        <div>
          <h2 className="mb-1 text-3xl font-bold tracking-tight md:text-4xl">Access Roles</h2>
          <p className="max-w-2xl text-sm text-[#737373] md:text-base">
            Control what each staff role can see and do. Open a role to adjust its permissions; locked system roles are read-only.
          </p>
        </div>
        <Link
          href="/dashboards/settings/users"
          className="inline-flex items-center gap-2 rounded-xl bg-emerald-500 px-4 py-2.5 text-sm font-bold text-white hover:bg-emerald-600"
        >
          <Users2 size={16} />
          Members
        </Link>
      </div>

      <div className="mb-6 grid gap-4 sm:grid-cols-3">
        <div className="rounded-2xl border border-[#e6e6e6] bg-white p-5 shadow-[0_8px_24px_rgba(26,26,26,0.06)]">
          <p className="text-sm font-semibold text-[#737373]">Members assigned</p>
          <p className="mt-1 text-3xl font-bold text-[#1a1a1a]">{systemUsers.length}</p>
          <p className="mt-1 text-xs font-semibold text-emerald-600">Staff with a role</p>
        </div>
        <div className="rounded-2xl border border-[#e6e6e6] bg-white p-5 shadow-[0_8px_24px_rgba(26,26,26,0.06)]">
          <p className="text-sm font-semibold text-[#737373]">Editable roles</p>
          <p className="mt-1 text-3xl font-bold text-[#1a1a1a]">{editableCount}</p>
          <p className="mt-1 text-xs font-semibold text-[#1a1a1a]">You can change permissions</p>
        </div>
        <div className="rounded-2xl border border-[#e6e6e6] bg-white p-5 shadow-[0_8px_24px_rgba(26,26,26,0.06)]">
          <p className="text-sm font-semibold text-[#737373]">System roles</p>
          <p className="mt-1 text-3xl font-bold text-[#1a1a1a]">{systemCount}</p>
          <p className="mt-1 flex items-center gap-1 text-xs font-semibold text-[#a3a3a3]">
            <Lock size={11} />
            Locked defaults
          </p>
        </div>
      </div>

      <article className="overflow-hidden rounded-2xl border border-[#e6e6e6] bg-white shadow-[0_8px_24px_rgba(26,26,26,0.06)]">
        <div className="border-b border-[#e6e6e6] px-5 py-4">
          <div className="relative sm:max-w-xs">
            <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-[#a3a3a3]" />
            <input
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder="Search"
              className="h-10 w-full rounded-lg border border-[#e6e6e6] bg-white pl-8 pr-3 text-sm outline-none focus:border-[#1a1a1a]"
            />
          </div>
        </div>

        <div className="grid gap-4 p-5 sm:grid-cols-2">
          {visibleRoles.map((role) => {
            const name = accessRoleOverrides[role.key]?.name ?? role.name;
            const description = accessRoleOverrides[role.key]?.description ?? role.description;
            const { allowed, total } = countAccessPermissions(accessRolePermissions[role.key] ?? {});
            const members = memberCounts[role.key] ?? 0;

            return (
              <div key={role.key} className="rounded-2xl border border-[#e6e6e6] p-5">
                <div className="mb-3 flex items-start justify-between gap-3">
                  <div className="flex items-center gap-2">
                    {role.locked ? (
                      <Lock size={16} className="text-[#a3a3a3]" />
                    ) : (
                      <ShieldCheck size={16} className="text-emerald-500" />
                    )}
                    <h3 className="text-base font-bold text-[#1a1a1a]">{name}</h3>
                  </div>
                  <span
                    className={`rounded-full px-2.5 py-1 text-[10px] font-bold ${
                      role.locked ? "bg-[#f4f4f4] text-[#737373]" : "bg-emerald-100 text-emerald-700"
                    }`}
                  >
                    {role.locked ? "System" : "Editable"}
                  </span>
                </div>

                <p className="mb-4 text-xs text-[#737373]">{description}</p>

                <div className="mb-4 flex flex-wrap gap-2">
                  <span className="rounded-full border border-[#e6e6e6] px-2.5 py-1 text-[11px] font-semibold text-[#1a1a1a]">
                    {allowed}/{total} permissions
                  </span>
                  <span className="rounded-full border border-[#e6e6e6] px-2.5 py-1 text-[11px] font-semibold text-[#525252]">
                    {members} member{members === 1 ? "" : "s"}
                  </span>
                </div>

                {role.locked ? (
                  <span className="inline-flex w-full items-center justify-center gap-1.5 rounded-xl border border-[#e6e6e6] bg-[#ffffff] px-4 py-2.5 text-xs font-bold text-[#a3a3a3]">
                    <Lock size={13} />
                    Locked — cannot be edited
                  </span>
                ) : (
                  <Link
                    href={`/dashboards/settings/users/access-roles/${role.key}`}
                    className="inline-flex w-full items-center justify-center gap-1.5 rounded-xl border-2 border-emerald-500 px-4 py-2.5 text-xs font-bold text-emerald-600 hover:bg-emerald-50"
                  >
                    <Pencil size={13} />
                    Edit permissions
                  </Link>
                )}
              </div>
            );
          })}
          {visibleRoles.length === 0 && (
            <p className="col-span-full py-8 text-center text-sm text-[#737373]">No roles match your search.</p>
          )}
        </div>

        <div className="flex flex-wrap items-center justify-between gap-3 border-t border-[#e6e6e6] px-5 py-3 text-sm text-[#737373]">
          <span>
            Showing 1 to {visibleRoles.length} of {ACCESS_ROLE_PRESETS.length} results
          </span>
          <label className="flex items-center gap-2 text-xs">
            Per page
            <select
              defaultValue={10}
              className="rounded-lg border border-[#e6e6e6] bg-white px-2 py-1.5 text-xs outline-none focus:border-[#1a1a1a]"
            >
              <option value={10}>10</option>
              <option value={25}>25</option>
            </select>
          </label>
        </div>
      </article>
    </section>
  );
}
