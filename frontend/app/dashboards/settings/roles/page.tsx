"use client";

import { useState, type FormEvent } from "react";
import { ShieldCheck, RotateCcw, UserPlus, X, MoreVertical } from "lucide-react";

import { useDashboard } from "@/components/dashboard/context/DashboardContext";
import { BackLink } from "@/components/dashboard/shared/BackLink";
import { DropdownMenuPortal } from "@/components/dashboard/shared/DropdownMenuPortal";
import { SaveChangesBar } from "@/components/dashboard/shared/SaveChangesBar";
import { askConfirm } from "@/components/dashboard/shared/askConfirm";
import {
  ADMIN_PERMISSION_GROUPS,
  ADMIN_ROLE_PRESETS,
  countAdminByState,
  type AdminPermissions,
} from "@/components/dashboard/settings/adminPermissionSchema";

export default function RolesPermissionsPage() {
  const {
    adminRolePermissions,
    updateAdminRolePermission,
    adminTeam,
    addAdminTeamMember,
    updateAdminTeamMemberRole,
    setAdminTeamMemberStatus,
    removeAdminTeamMember,
    showToast,
  } = useDashboard();
  const [selectedRoleKey, setSelectedRoleKey] = useState(ADMIN_ROLE_PRESETS[0].key);
  const [activeGroupKey, setActiveGroupKey] = useState(ADMIN_PERMISSION_GROUPS[0].key);
  const [addAdminOpen, setAddAdminOpen] = useState(false);
  const [newName, setNewName] = useState("");
  const [newEmail, setNewEmail] = useState("");
  const [newPhone, setNewPhone] = useState("");
  const [newRoleKey, setNewRoleKey] = useState(ADMIN_ROLE_PRESETS[1]?.key ?? ADMIN_ROLE_PRESETS[0].key);
  const [openMemberMenuId, setOpenMemberMenuId] = useState<string | null>(null);
  const [memberMenuRect, setMemberMenuRect] = useState<DOMRect | null>(null);

  // Permission edits are staged here per role, not applied instantly —
  // only "Save Changes" (after the confirm dialog) actually commits them
  // via updateAdminRolePermission. Switching roles keeps any other role's
  // pending draft intact, so nothing is lost by looking elsewhere first.
  const [drafts, setDrafts] = useState<Record<string, AdminPermissions>>({});

  const selectedRole = ADMIN_ROLE_PRESETS.find((r) => r.key === selectedRoleKey)!;
  const savedPermissions = adminRolePermissions[selectedRoleKey] ?? {};
  const draftPermissions = drafts[selectedRoleKey];
  const permissions = draftPermissions ?? savedPermissions;
  const overall = countAdminByState(permissions);
  const activeGroup = ADMIN_PERMISSION_GROUPS.find((g) => g.key === activeGroupKey)!;

  const changedKeys = draftPermissions
    ? Object.keys(draftPermissions).filter((key) => draftPermissions[key] !== savedPermissions[key])
    : [];
  const isDirty = changedKeys.length > 0;

  function togglePermission(permissionKey: string) {
    const current = permissions[permissionKey] ?? "Denied";
    setDrafts((current2) => ({
      ...current2,
      [selectedRoleKey]: {
        ...permissions,
        [permissionKey]: current === "Allowed" ? "Denied" : "Allowed",
      },
    }));
  }

  function handleResetToDefault() {
    setDrafts((current) => ({ ...current, [selectedRoleKey]: selectedRole.build() }));
  }

  function handleSaveChanges() {
    changedKeys.forEach((key) => {
      updateAdminRolePermission(selectedRoleKey, key, draftPermissions![key]);
    });
    setDrafts((current) => {
      const next = { ...current };
      delete next[selectedRoleKey];
      return next;
    });
    showToast(`${selectedRole.label} permissions saved.`);
  }

  function handleDiscardChanges() {
    setDrafts((current) => {
      const next = { ...current };
      delete next[selectedRoleKey];
      return next;
    });
  }

  function handleAddAdmin(event: FormEvent) {
    event.preventDefault();
    if (!newName.trim() || !newEmail.trim()) return;
    addAdminTeamMember(newName.trim(), newEmail.trim(), newPhone.trim(), newRoleKey);
    setNewName("");
    setNewEmail("");
    setNewPhone("");
    setAddAdminOpen(false);
  }

  function renderCheckbox(perm: { key: string; label: string }) {
    const checked = permissions[perm.key] === "Allowed";
    return (
      <label key={perm.key} className="flex cursor-pointer items-center gap-2.5 py-1.5 text-sm text-[#525252]">
        <input
          type="checkbox"
          checked={checked}
          onChange={() => togglePermission(perm.key)}
          className="h-4 w-4 shrink-0 rounded border-[#e6e6e6] accent-emerald-500"
        />
        {perm.label}
      </label>
    );
  }

  return (
    <section className="w-full">
      <BackLink />
      <div className="mb-6">
        <h2 className="mb-1 flex items-center gap-2 text-3xl font-bold tracking-tight md:text-4xl">
          <ShieldCheck className="text-[#1a1a1a]" size={30} />
          Roles &amp; Permissions
        </h2>
        <p className="max-w-2xl text-sm text-[#737373] md:text-base">
          The main permission control center for the whole site. Every
          module — users, vouchers, packages, routers, hotspot &amp; captive
          portal, agents, installers, payments, and settings itself — is
          governed from here, organized by role. Tick a box to allow it,
          untick to deny it.
        </p>
      </div>

      <article className="mb-6 rounded-2xl border border-[#e6e6e6] bg-white p-5 shadow-[0_8px_24px_rgba(26,26,26,0.06)]">
        <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
          <div>
            <p className="text-sm font-bold text-[#1a1a1a]">Admin Team</p>
            <p className="text-xs text-[#737373]">
              Everyone with their own login to this admin dashboard, and which role governs what they can do.
            </p>
          </div>
          <button
            type="button"
            onClick={() => setAddAdminOpen((current) => !current)}
            className="inline-flex items-center gap-2 rounded-xl bg-[#1a1a1a] px-4 py-2.5 text-sm font-bold text-white hover:bg-[#111111]"
          >
            <UserPlus size={15} />
            Add System Admin
          </button>
        </div>

        {addAdminOpen && (
          <form onSubmit={handleAddAdmin} className="mb-4 grid gap-3 rounded-xl bg-[#ffffff] p-4 sm:grid-cols-2">
            <input
              required
              value={newName}
              onChange={(e) => setNewName(e.target.value)}
              placeholder="Full name"
              className="h-11 rounded-xl border border-[#e6e6e6] bg-white px-3 text-sm outline-none focus:border-[#1a1a1a]"
            />
            <input
              required
              type="email"
              value={newEmail}
              onChange={(e) => setNewEmail(e.target.value)}
              placeholder="Email"
              className="h-11 rounded-xl border border-[#e6e6e6] bg-white px-3 text-sm outline-none focus:border-[#1a1a1a]"
            />
            <input
              value={newPhone}
              onChange={(e) => setNewPhone(e.target.value)}
              placeholder="Phone (optional)"
              className="h-11 rounded-xl border border-[#e6e6e6] bg-white px-3 text-sm outline-none focus:border-[#1a1a1a]"
            />
            <select
              value={newRoleKey}
              onChange={(e) => setNewRoleKey(e.target.value)}
              className="h-11 rounded-xl border border-[#e6e6e6] bg-white px-3 text-sm outline-none focus:border-[#1a1a1a]"
            >
              {ADMIN_ROLE_PRESETS.map((role) => (
                <option key={role.key} value={role.key}>
                  {role.label}
                </option>
              ))}
            </select>
            <div className="flex gap-2 sm:col-span-2">
              <button type="submit" className="rounded-xl bg-[#1a1a1a] px-5 py-2.5 text-sm font-bold text-white hover:bg-[#111111]">
                Send Invite
              </button>
              <button type="button" onClick={() => setAddAdminOpen(false)} className="rounded-xl border border-[#e6e6e6] bg-white px-5 py-2.5 text-sm font-bold text-[#525252] hover:bg-[#ffffff]">
                Cancel
              </button>
            </div>
            <p className="text-xs text-[#a3a3a3] sm:col-span-2">
              They&apos;ll appear as Pending until they accept the invite. Their permissions come entirely from the role you assign.
            </p>
          </form>
        )}

        <div className="space-y-2">
          {adminTeam.map((member) => {
            const role = ADMIN_ROLE_PRESETS.find((r) => r.key === member.roleKey);
            return (
              <div key={member.id} className="flex items-center justify-between gap-3 rounded-xl border border-[#f4f4f4] px-4 py-3">
                <div className="min-w-0">
                  <p className="flex items-center gap-2 text-sm font-bold text-[#1a1a1a]">
                    {member.name}
                    {member.isOwner && (
                      <span className="rounded-full bg-blue-600 px-2 py-0.5 text-[10px] font-bold text-white">Owner</span>
                    )}
                  </p>
                  <p className="truncate text-xs text-[#737373]">{member.email}</p>
                </div>
                <div className="flex shrink-0 items-center gap-2">
                  <span className="rounded-full bg-[#1a1a1a] px-2.5 py-1 text-xs font-semibold text-white">
                    {role?.label ?? member.roleKey}
                  </span>
                  <span
                    className={`rounded-full px-2.5 py-1 text-xs font-semibold ${
                      member.status === "Active"
                        ? "bg-emerald-600 text-white"
                        : member.status === "Pending"
                          ? "bg-amber-500 text-white"
                          : "bg-red-600 text-white"
                    }`}
                  >
                    {member.status}
                  </span>
                  {!member.isOwner && (
                    <div className="relative">
                      <button
                        type="button"
                        onClick={(event) => {
                          setMemberMenuRect((event.currentTarget as HTMLElement).getBoundingClientRect());
                          setOpenMemberMenuId((current) => (current === member.id ? null : member.id));
                        }}
                        className="rounded-lg border border-[#e6e6e6] p-1.5 text-[#525252] hover:bg-[#f4f4f4]"
                      >
                        <MoreVertical size={14} />
                      </button>
                      {openMemberMenuId === member.id && (
                        <DropdownMenuPortal anchorRect={memberMenuRect} onClose={() => setOpenMemberMenuId(null)} width={200}>
                          <div className="border-b border-[#f4f4f4] px-4 py-2 text-[10px] font-bold uppercase text-[#a3a3a3]">
                            Change Role
                          </div>
                          {ADMIN_ROLE_PRESETS.map((role) => (
                            <button
                              key={role.key}
                              type="button"
                              onClick={() => {
                                updateAdminTeamMemberRole(member.id, role.key);
                                setOpenMemberMenuId(null);
                              }}
                              className="flex w-full items-center justify-between px-4 py-2 text-left text-sm text-[#525252] hover:bg-[#f4f4f4]"
                            >
                              {role.label}
                              {member.roleKey === role.key && <span className="text-[#1a1a1a]">✓</span>}
                            </button>
                          ))}
                          <div className="my-1 border-t border-[#f4f4f4]" />
                          {member.status === "Active" ? (
                            <button
                              type="button"
                              onClick={() => {
                                setAdminTeamMemberStatus(member.id, "Suspended");
                                setOpenMemberMenuId(null);
                              }}
                              className="flex w-full items-center px-4 py-2 text-left text-sm font-semibold text-amber-700 hover:bg-amber-50"
                            >
                              Suspend
                            </button>
                          ) : (
                            <button
                              type="button"
                              onClick={() => {
                                setAdminTeamMemberStatus(member.id, "Active");
                                setOpenMemberMenuId(null);
                              }}
                              className="flex w-full items-center px-4 py-2 text-left text-sm font-semibold text-emerald-700 hover:bg-emerald-50"
                            >
                              Activate
                            </button>
                          )}
                          <button
                            type="button"
                            onClick={() => {
                              askConfirm(`Remove ${member.name} from the admin team?`).then((ok) => {
                                if (ok) removeAdminTeamMember(member.id);
                              })
                              setOpenMemberMenuId(null);
                            }}
                            className="flex w-full items-center px-4 py-2 text-left text-sm font-semibold text-red-600 hover:bg-red-50"
                          >
                            <X size={13} className="mr-1.5" />
                            Remove
                          </button>
                        </DropdownMenuPortal>
                      )}
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </article>

      <div className="space-y-5">
        <div>
          <p className="mb-2 text-xs font-bold uppercase tracking-wide text-[#a3a3a3]">Choose a role</p>
          <div className="flex flex-wrap gap-2">
            {ADMIN_ROLE_PRESETS.map((role) => {
              const roleCount = countAdminByState(adminRolePermissions[role.key] ?? {});
              const isSelected = selectedRoleKey === role.key;
              const hasDraft = !!drafts[role.key];
              return (
                <button
                  key={role.key}
                  type="button"
                  onClick={() => setSelectedRoleKey(role.key)}
                  className={`relative flex items-center gap-3 rounded-2xl border-2 px-5 py-3 text-left transition ${
                    isSelected ? "border-[#1a1a1a] bg-[#f4f4f4]" : "border-[#e6e6e6] bg-white hover:bg-[#ffffff]"
                  }`}
                >
                  {hasDraft && (
                    <span className="absolute -right-1.5 -top-1.5 flex h-4 w-4 items-center justify-center rounded-full bg-amber-500 text-[9px] font-bold text-white" title="Unsaved changes">
                      !
                    </span>
                  )}
                  <span>
                    <span className={`block text-sm font-bold ${isSelected ? "text-[#111111]" : "text-[#1a1a1a]"}`}>
                      {role.label}
                    </span>
                    <span className="block max-w-[220px] truncate text-xs text-[#737373]">{role.description}</span>
                  </span>
                  <span className="shrink-0 rounded-full bg-emerald-600 px-2.5 py-1 text-[11px] font-bold text-white">
                    {roleCount.allowed}/{roleCount.total}
                  </span>
                </button>
              );
            })}
          </div>
        </div>

        <div className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-[#e6e6e6] bg-white p-5 shadow-[0_8px_24px_rgba(26,26,26,0.06)]">
          <div>
            <p className="text-base font-bold text-[#1a1a1a]">{selectedRole.label}</p>
            <p className="text-xs text-[#737373]">
              {overall.allowed} of {overall.total} permissions allowed across every module.
            </p>
          </div>
          <button
            type="button"
            onClick={handleResetToDefault}
            className="inline-flex items-center gap-1.5 rounded-lg border border-[#e6e6e6] bg-white px-3 py-2 text-xs font-bold text-[#525252] hover:bg-[#ffffff]"
          >
            <RotateCcw size={13} />
            Reset to Default
          </button>
        </div>

        <article className="overflow-hidden rounded-2xl border border-[#e6e6e6] bg-white shadow-[0_8px_24px_rgba(26,26,26,0.06)]">
          <div className="flex flex-wrap gap-1 overflow-x-auto border-b border-[#e6e6e6] px-4 pt-3">
            {ADMIN_PERMISSION_GROUPS.map((group) => {
              const groupCount = countAdminByState(permissions, group.key);
              return (
                <button
                  key={group.key}
                  type="button"
                  onClick={() => setActiveGroupKey(group.key)}
                  className={`shrink-0 rounded-t-lg px-4 py-2.5 text-left text-sm font-semibold transition ${
                    activeGroupKey === group.key
                      ? "border-b-2 border-emerald-500 text-emerald-600"
                      : "text-[#737373] hover:text-[#525252]"
                  }`}
                >
                  {group.label}
                  <span className="ml-1.5 text-xs font-normal opacity-70">
                    {groupCount.allowed}/{groupCount.total}
                  </span>
                </button>
              );
            })}
          </div>

          <div className="p-6 md:p-8">
            <p className="mb-5 text-sm font-bold text-[#1a1a1a]">Permissions</p>
            <div className="grid gap-x-10 gap-y-1 sm:grid-cols-2 xl:grid-cols-3">
              {activeGroup.permissions.map(renderCheckbox)}
            </div>
          </div>
        </article>

        <SaveChangesBar
          dirty={isDirty}
          changeCount={changedKeys.length}
          onSave={handleSaveChanges}
          onDiscard={handleDiscardChanges}
          confirmMessage={`This updates the "${selectedRole.label}" role — everyone assigned to it will immediately gain or lose access to the ${changedKeys.length} permission${changedKeys.length === 1 ? "" : "s"} you changed.`}
        />
      </div>
    </section>
  );
}
