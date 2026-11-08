"use client";

import { use, useEffect, useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { ChevronRight, Save, X } from "lucide-react";

import { useDashboard } from "@/components/dashboard/context/DashboardContext";
import { NotFoundCard } from "@/components/dashboard/shared/ActionPageLayout";
import {
  ACCESS_PERMISSION_GROUPS,
  ACCESS_ROLE_PRESETS,
} from "@/components/dashboard/settings/systemUsersSchema";
import type { AccessRolePermissions } from "@/components/dashboard/settings/systemUsersSchema";

export default function EditAccessRolePage({
  params,
}: {
  params: Promise<{ roleKey: string }>;
}) {
  const { roleKey } = use(params);
  const navigate = useRouter();
  const {
    accessRolePermissions,
    accessRoleOverrides,
    toggleAccessRolePermission,
    updateAccessRoleMeta,
    showToast,
  } = useDashboard();

  const preset = ACCESS_ROLE_PRESETS.find((r) => r.key === roleKey);
  const [activeGroupKey, setActiveGroupKey] = useState(ACCESS_PERMISSION_GROUPS[0].key);
  const [name, setName] = useState(accessRoleOverrides[roleKey]?.name ?? preset?.name ?? "");
  const [description, setDescription] = useState(
    accessRoleOverrides[roleKey]?.description ?? preset?.description ?? "",
  );
  const [confirmOpen, setConfirmOpen] = useState(false);

  // Permission checkbox edits are staged here — nothing actually applies
  // to real system users until "Save changes" is clicked and confirmed.
  const [draftPermissions, setDraftPermissions] = useState<AccessRolePermissions | null>(null);

  useEffect(() => {
    setName(accessRoleOverrides[roleKey]?.name ?? preset?.name ?? "");
    setDescription(accessRoleOverrides[roleKey]?.description ?? preset?.description ?? "");
    setDraftPermissions(null);
    // Only re-sync when switching to a different role.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [roleKey]);

  if (!preset) {
    return <NotFoundCard message="This access role doesn't exist." backHref="/dashboards/settings/users/access-roles" />;
  }

  if (preset.locked) {
    return (
      <NotFoundCard
        message="Administrator is a locked system role and can't be edited."
        backHref="/dashboards/settings/users/access-roles"
      />
    );
  }

  const savedPermissions = accessRolePermissions[roleKey] ?? {};
  const permissions = draftPermissions ?? savedPermissions;
  const activeGroup = ACCESS_PERMISSION_GROUPS.find((g) => g.key === activeGroupKey)!;
  const midpoint = Math.ceil(activeGroup.permissions.length / 2);
  const leftColumn = activeGroup.permissions.slice(0, midpoint);
  const rightColumn = activeGroup.permissions.slice(midpoint);

  const changedPermissionKeys = draftPermissions
    ? Object.keys(draftPermissions).filter((key) => !!draftPermissions[key] !== !!savedPermissions[key])
    : [];
  const nameOrDescChanged =
    name.trim() !== (accessRoleOverrides[roleKey]?.name ?? preset.name) ||
    description.trim() !== (accessRoleOverrides[roleKey]?.description ?? preset.description);
  const hasAnyChange = changedPermissionKeys.length > 0 || nameOrDescChanged;

  function togglePermission(permissionKey: string) {
    setDraftPermissions({
      ...permissions,
      [permissionKey]: !permissions[permissionKey],
    });
  }

  function handleSaveClick(event: FormEvent) {
    event.preventDefault();
    if (!name.trim()) {
      showToast("Role name can't be empty.");
      return;
    }
    if (!hasAnyChange) {
      navigate.push("/dashboards/settings/users/access-roles");
      return;
    }
    setConfirmOpen(true);
  }

  function confirmSave() {
    updateAccessRoleMeta(roleKey, { name: name.trim(), description: description.trim() });
    changedPermissionKeys.forEach((key) => toggleAccessRolePermission(roleKey, key));
    setConfirmOpen(false);
    showToast(`${name.trim()} saved.`);
    navigate.push("/dashboards/settings/users/access-roles");
  }

  function renderCheckbox(perm: { key: string; label: string }) {
    const checked = !!permissions[perm.key];
    return (
      <label key={perm.key} className="flex cursor-pointer items-center gap-2.5 py-1.5 text-sm text-[#475569]">
        <input
          type="checkbox"
          checked={checked}
          onChange={() => togglePermission(perm.key)}
          className="h-4 w-4 shrink-0 rounded border-[#e2e8f0] accent-emerald-500"
        />
        {perm.label}
      </label>
    );
  }

  return (
    <section className="w-full">
      <nav className="mb-4 flex items-center gap-1.5 text-sm text-[#64748b]">
        <Link href="/dashboards/settings/users/access-roles" className="hover:text-[#2563eb]">
          Access Roles
        </Link>
        <ChevronRight size={14} />
        <span className="font-semibold text-[#0f172a]">Edit</span>
      </nav>
      <h2 className="mb-6 text-3xl font-bold tracking-tight md:text-4xl">Edit Access Role</h2>

      <form onSubmit={handleSaveClick} className="space-y-6">
        <article className="overflow-hidden rounded-2xl border border-[#e2e8f0] bg-white shadow-[0_8px_24px_rgba(37,99,235,0.06)]">
          <div className="border-b border-[#e2e8f0] px-6 py-4">
            <h3 className="text-sm font-bold text-[#0f172a]">Role</h3>
          </div>
          <div className="grid gap-5 p-6 sm:grid-cols-2">
            <label className="block">
              <span className="mb-2 block text-sm font-semibold text-[#475569]">Name</span>
              <input
                required
                value={name}
                onChange={(event) => setName(event.target.value)}
                className="h-11 w-full rounded-xl border border-[#e2e8f0] bg-white px-3 text-sm outline-none focus:border-[#2563eb]"
              />
            </label>
            <label className="block">
              <span className="mb-2 block text-sm font-semibold text-[#475569]">Description</span>
              <textarea
                value={description}
                onChange={(event) => setDescription(event.target.value)}
                rows={2}
                className="w-full resize-none rounded-xl border border-[#e2e8f0] bg-white px-3 py-2.5 text-sm outline-none focus:border-[#2563eb]"
              />
            </label>
          </div>
        </article>

        <article className="overflow-hidden rounded-2xl border border-[#e2e8f0] bg-white shadow-[0_8px_24px_rgba(37,99,235,0.06)]">
          <div className="flex flex-wrap gap-1 border-b border-[#e2e8f0] px-4 pt-3">
            {ACCESS_PERMISSION_GROUPS.map((group) => (
              <button
                key={group.key}
                type="button"
                onClick={() => setActiveGroupKey(group.key)}
                className={`rounded-t-lg px-3.5 py-2.5 text-sm font-semibold transition ${
                  activeGroupKey === group.key
                    ? "border-b-2 border-emerald-500 text-emerald-600"
                    : "text-[#64748b] hover:text-[#475569]"
                }`}
              >
                {group.label}
              </button>
            ))}
          </div>

          <div className="p-6">
            <p className="mb-4 text-sm font-bold text-[#0f172a]">Permissions</p>
            <div className="grid gap-x-8 sm:grid-cols-2">
              <div className="divide-y divide-[#f1f5f9]">{leftColumn.map(renderCheckbox)}</div>
              <div className="divide-y divide-[#f1f5f9]">{rightColumn.map(renderCheckbox)}</div>
            </div>
          </div>
        </article>

        <div className="flex flex-wrap items-center gap-3">
          <button
            type="submit"
            className="inline-flex items-center gap-2 rounded-xl bg-emerald-500 px-5 py-3 text-sm font-bold text-white hover:bg-emerald-600"
          >
            <Save size={15} />
            Save changes
          </button>
          <button
            type="button"
            onClick={() => navigate.push("/dashboards/settings/users/access-roles")}
            className="rounded-xl border border-[#e2e8f0] bg-white px-5 py-3 text-sm font-bold text-[#475569] hover:bg-[#ffffff]"
          >
            Cancel
          </button>
          {hasAnyChange && (
            <span className="text-xs font-semibold text-amber-600">
              {changedPermissionKeys.length + (nameOrDescChanged ? 1 : 0)} unsaved change
              {changedPermissionKeys.length + (nameOrDescChanged ? 1 : 0) === 1 ? "" : "s"}
            </span>
          )}
        </div>
      </form>

      {confirmOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="w-full max-w-sm rounded-2xl bg-white p-6 shadow-2xl">
            <div className="mb-1 flex items-start justify-between">
              <h3 className="flex items-center gap-2 text-lg font-bold text-[#0f172a]">
                <Save size={18} className="text-emerald-500" />
                Save Changes?
              </h3>
              <button type="button" onClick={() => setConfirmOpen(false)} className="text-[#94a3b8] hover:text-[#475569]">
                <X size={18} />
              </button>
            </div>
            <p className="mb-5 text-sm text-[#64748b]">
              This updates the &quot;{name.trim() || preset.name}&quot; role — every system user assigned it will
              immediately gain or lose the access you changed.
            </p>
            <div className="flex gap-2">
              <button
                type="button"
                onClick={confirmSave}
                className="rounded-xl bg-emerald-500 px-5 py-2.5 text-sm font-bold text-white hover:bg-emerald-600"
              >
                Yes, Save
              </button>
              <button
                type="button"
                onClick={() => setConfirmOpen(false)}
                className="rounded-xl border border-[#e2e8f0] bg-white px-5 py-2.5 text-sm font-bold text-[#475569] hover:bg-[#ffffff]"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}
    </section>
  );
}
