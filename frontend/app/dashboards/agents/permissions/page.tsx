"use client";

import { useState } from "react";
import { ShieldCheck, RotateCcw } from "lucide-react";

import { useDashboard } from "@/components/dashboard/context/DashboardContext";
import { BackLink } from "@/components/dashboard/shared/BackLink";
import { PermissionSwitch } from "@/components/dashboard/agents/PermissionSwitch";
import { SaveChangesBar } from "@/components/dashboard/shared/SaveChangesBar";
import {
  BASE_AGENT_PERMISSIONS,
  PERMISSION_GROUPS,
  PERMISSION_PRESETS,
  PRESET_DESCRIPTIONS,
  countByState,
  type PermissionPresetName,
} from "@/components/dashboard/agents/permissionSchema";
import type { AgentPermissions } from "@/components/dashboard/shared/types";

const PRESET_NAMES = Object.keys(PRESET_DESCRIPTIONS) as PermissionPresetName[];

export default function AgentRolesPermissionsPage() {
  const { agentRolePermissions, toggleAgentRolePermission, showToast } = useDashboard();
  const [selectedPreset, setSelectedPreset] = useState<PermissionPresetName>(PRESET_NAMES[0]);
  const [activeGroupKey, setActiveGroupKey] = useState(PERMISSION_GROUPS[0].key);

  // Same staged-draft pattern as the admin Roles & Permissions page —
  // toggles here only edit the local draft; nothing actually applies to
  // real agents until "Save Changes" is confirmed.
  const [drafts, setDrafts] = useState<Partial<Record<PermissionPresetName, AgentPermissions>>>({});

  const savedPermissions = agentRolePermissions[selectedPreset] ?? {};
  const draftPermissions = drafts[selectedPreset];
  const permissions = draftPermissions ?? savedPermissions;
  const overallAllowed = countByState(permissions, "Allowed");
  const overallTotal = Object.keys(permissions).length;
  const activeGroup = PERMISSION_GROUPS.find((g) => g.key === activeGroupKey)!;
  const midpoint = Math.ceil(activeGroup.permissions.length / 2);
  const leftColumn = activeGroup.permissions.slice(0, midpoint);
  const rightColumn = activeGroup.permissions.slice(midpoint);

  const changedKeys = draftPermissions
    ? Object.keys(draftPermissions).filter((key) => draftPermissions[key] !== savedPermissions[key])
    : [];
  const isDirty = changedKeys.length > 0;

  function togglePermission(permissionKey: string) {
    if (BASE_AGENT_PERMISSIONS.includes(permissionKey)) return;
    const current = permissions[permissionKey] ?? "Denied";
    setDrafts((current2) => ({
      ...current2,
      [selectedPreset]: {
        ...permissions,
        [permissionKey]: current === "Allowed" ? "Denied" : "Allowed",
      },
    }));
  }

  function handleResetToDefault() {
    setDrafts((current) => ({ ...current, [selectedPreset]: { ...PERMISSION_PRESETS[selectedPreset] } }));
  }

  function handleSaveChanges() {
    changedKeys.forEach((key) => {
      // toggleAgentRolePermission flips whatever the saved state currently
      // is, so only call it for keys whose saved value doesn't already
      // match the draft's target value.
      const target = draftPermissions![key];
      const savedNow = agentRolePermissions[selectedPreset]?.[key] ?? "Denied";
      if (savedNow !== target) {
        toggleAgentRolePermission(selectedPreset, key);
      }
    });
    setDrafts((current) => {
      const next = { ...current };
      delete next[selectedPreset];
      return next;
    });
    showToast(`${selectedPreset} permissions saved.`);
  }

  function handleDiscardChanges() {
    setDrafts((current) => {
      const next = { ...current };
      delete next[selectedPreset];
      return next;
    });
  }

  function renderCheckbox(perm: { key: string; label: string }) {
    const isBase = BASE_AGENT_PERMISSIONS.includes(perm.key);
    return (
      <PermissionSwitch
        key={perm.key}
        label={perm.label}
        allowed={isBase || permissions[perm.key] === "Allowed"}
        locked={isBase}
        onToggle={() => togglePermission(perm.key)}
      />
    );
  }

  return (
    <section className="w-full">
      <BackLink />
      <div className="mb-6">
        <h2 className="mb-1 flex items-center gap-2 text-3xl font-bold tracking-tight md:text-4xl">
          <ShieldCheck className="text-[#2563eb]" size={30} />
          Agent Roles &amp; Permissions
        </h2>
        <p className="max-w-2xl text-sm text-[#64748b] md:text-base">
          What each agent role can access on their reseller dashboard —
          the same modules an agent sees there: Dashboard, Users &amp;
          Connections, Sales, Vouchers, Packages, Transactions, Reports,
          SMS, Support Tickets, and Settings. Every agent can always see
          their own dashboard by default (marked <strong>Default</strong>{" "}
          below); tick a box to add anything further, untick to deny it.
        </p>
      </div>

      <div className="mb-5 overflow-hidden rounded-xl border border-[#e2e8f0] bg-white">
        {PRESET_NAMES.map((preset, index) => {
          const presetPermissions = agentRolePermissions[preset] ?? {};
          const allowed = countByState(presetPermissions, "Allowed");
          const total = Object.keys(presetPermissions).length;
          const isSelected = selectedPreset === preset;
          const hasDraft = !!drafts[preset];
          return (
            <button
              key={preset}
              type="button"
              onClick={() => setSelectedPreset(preset)}
              className={`relative flex w-full items-center justify-between gap-3 px-3.5 py-3 text-left transition ${
                index > 0 ? "border-t border-[#f1f5f9]" : ""
              } ${isSelected ? "bg-[#f1f5f9]" : "bg-white hover:bg-[#ffffff]"}`}
            >
              <span className="min-w-0">
                <span className={`flex items-center gap-1.5 truncate text-sm font-bold ${isSelected ? "text-[#1d4ed8]" : "text-[#0f172a]"}`}>
                  {preset}
                  {hasDraft && (
                    <span className="rounded-full bg-amber-500 px-1.5 py-0.5 text-[9px] font-bold text-white">Unsaved</span>
                  )}
                </span>
                <span className="block truncate text-xs text-[#64748b]">{PRESET_DESCRIPTIONS[preset]}</span>
              </span>
              <span className="shrink-0 rounded-full bg-emerald-600 px-2.5 py-1 text-[11px] font-bold text-white">
                {allowed}/{total}
              </span>
            </button>
          );
        })}
      </div>

      <div className="mb-4 flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-[#e2e8f0] bg-white p-5 shadow-[0_8px_24px_rgba(37,99,235,0.06)]">
        <div>
          <p className="text-base font-bold text-[#0f172a]">{selectedPreset}</p>
          <p className="text-xs text-[#64748b]">
            {overallAllowed} of {overallTotal} permissions allowed across every module.
          </p>
        </div>
        <button
          type="button"
          onClick={handleResetToDefault}
          className="inline-flex items-center gap-1.5 rounded-lg border border-[#e2e8f0] bg-white px-3 py-2 text-xs font-bold text-[#475569] hover:bg-[#ffffff]"
        >
          <RotateCcw size={13} />
          Reset to Default
        </button>
      </div>

      <article className="overflow-hidden rounded-2xl border border-[#e2e8f0] bg-white shadow-[0_8px_24px_rgba(37,99,235,0.06)]">
        <div className="flex flex-wrap gap-1 border-b border-[#e2e8f0] px-4 pt-3">
          {PERMISSION_GROUPS.map((group) => {
            const groupTotal = group.permissions.length;
            const groupAllowed = group.permissions.filter((p) => permissions[p.key] === "Allowed").length;
            return (
              <button
                key={group.key}
                type="button"
                onClick={() => setActiveGroupKey(group.key)}
                className={`rounded-t-lg px-3.5 py-2.5 text-left text-sm font-semibold transition ${
                  activeGroupKey === group.key
                    ? "border-b-2 border-emerald-500 text-emerald-600"
                    : "text-[#64748b] hover:text-[#475569]"
                }`}
              >
                {group.label}
                <span className="ml-1.5 text-xs font-normal opacity-70">
                  {groupAllowed}/{groupTotal}
                </span>
              </button>
            );
          })}
        </div>

        <div className="p-6">
          <p className="mb-4 text-sm font-bold text-[#0f172a]">Permissions</p>
          <div className="grid gap-x-8 sm:grid-cols-2">
            <div className="divide-y divide-[#f1f5f9]">{leftColumn.map(renderCheckbox)}</div>
            <div className="divide-y divide-[#f1f5f9]">{rightColumn.map(renderCheckbox)}</div>
          </div>
        </div>
      </article>

      <SaveChangesBar
        dirty={isDirty}
        changeCount={changedKeys.length}
        onSave={handleSaveChanges}
        onDiscard={handleDiscardChanges}
        confirmMessage={`This updates the "${selectedPreset}" agent role — every agent assigned it will immediately gain or lose access to the ${changedKeys.length} permission${changedKeys.length === 1 ? "" : "s"} you changed.`}
      />
    </section>
  );
}
