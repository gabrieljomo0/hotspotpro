"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Mail, Phone, Plus, Search, ShieldCheck, SlidersHorizontal, Columns3 } from "lucide-react";

import { useDashboard } from "@/components/dashboard/context/DashboardContext";
import { BackLink } from "@/components/dashboard/shared/BackLink";
import { EditSystemUserModal } from "@/components/dashboard/settings/EditSystemUserModal";
import { ConfirmDialog } from "@/components/dashboard/shared/ConfirmDialog";
import {
  ACCESS_ROLE_PRESETS,
  canRemoveSystemUser,
  pickSuccessor,
  type SystemUser,
} from "@/components/dashboard/settings/systemUsersSchema";

export default function SystemUsersPage() {
  const navigate = useRouter();
  const { systemUsers, deleteSystemUser, showToast, accessRoleOverrides } = useDashboard();
  const [query, setQuery] = useState("");
  const [deleteTarget, setDeleteTarget] = useState<SystemUser | null>(null);
  const [editingUserId, setEditingUserId] = useState<string | null>(null);

  // With a single user there is nothing that can be removed — no Delete
  // option is offered at all until someone else has been added.
  const onlyOneUser = systemUsers.length <= 1;
  const successor =
    deleteTarget && deleteTarget.isOwner ? pickSuccessor(systemUsers, deleteTarget.id) : null;

  function roleLabel(roleKey: string) {
    const override = accessRoleOverrides[roleKey];
    if (override?.name) return override.name;
    return ACCESS_ROLE_PRESETS.find((r) => r.key === roleKey)?.name ?? roleKey;
  }

  const visibleUsers = systemUsers.filter((user) => {
    if (!query) return true;
    const q = query.toLowerCase();
    return (
      user.name.toLowerCase().includes(q) ||
      user.email.toLowerCase().includes(q) ||
      user.phone.toLowerCase().includes(q)
    );
  });

  function initialsFor(name: string) {
    return name
      .trim()
      .split(/\s+/)
      .map((part) => part[0])
      .slice(0, 2)
      .join("")
      .toUpperCase();
  }

  function handleDelete(user: SystemUser) {
    if (!canRemoveSystemUser(systemUsers, user.id)) return;
    setDeleteTarget(user);
  }

  function confirmDelete() {
    if (deleteTarget) deleteSystemUser(deleteTarget.id);
    setDeleteTarget(null);
  }

  return (
    <section className="w-full">
      <BackLink />
      <div className="mb-6 flex flex-wrap items-start justify-between gap-4">
        <div>
          <h2 className="mb-1 text-3xl font-bold tracking-tight md:text-4xl">Users</h2>
          <p className="max-w-2xl text-sm text-[#737373] md:text-base">
            Everyone with their own login to this admin dashboard.
          </p>
        </div>

        <div className="flex flex-wrap gap-2">
          <Link
            href="/dashboards/settings/users/create"
            className="inline-flex items-center gap-2 rounded-xl bg-emerald-500 px-4 py-2.5 text-sm font-bold text-white hover:bg-emerald-600"
          >
            <Plus size={16} />
            New user
          </Link>
          <Link
            href="/dashboards/settings/users/access-roles"
            className="inline-flex items-center gap-2 rounded-xl border-2 border-emerald-500 px-4 py-2.5 text-sm font-bold text-emerald-600 hover:bg-emerald-50"
          >
            <ShieldCheck size={16} />
            Access Roles
          </Link>
        </div>
      </div>

      {onlyOneUser && (
        <p
          data-testid="only-user-note"
          className="mb-4 rounded-xl border border-blue-200 bg-white px-4 py-3 text-sm text-blue-900"
        >
          You&apos;re the only user, so there&apos;s no option to remove anyone yet. Add another user first — after
          that, if the original admin is ever removed, the next user takes over as admin.
        </p>
      )}

      <article className="overflow-hidden rounded-2xl border border-[#e6e6e6] bg-white shadow-[0_8px_24px_rgba(26,26,26,0.06)]">
        <div className="flex flex-wrap items-center justify-end gap-2 border-b border-[#e6e6e6] px-5 py-4">
          <div className="relative">
            <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-[#a3a3a3]" />
            <input
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder="Search"
              className="h-10 w-56 rounded-lg border border-[#e6e6e6] bg-white pl-8 pr-3 text-sm outline-none focus:border-[#1a1a1a]"
            />
          </div>
          <button
            type="button"
            onClick={() => showToast("Filters coming soon.")}
            className="rounded-lg border border-[#e6e6e6] p-2.5 text-[#525252] hover:bg-[#ffffff]"
            aria-label="Filter"
          >
            <SlidersHorizontal size={16} />
          </button>
          <button
            type="button"
            onClick={() => showToast("Column visibility coming soon.")}
            className="rounded-lg border border-[#e6e6e6] p-2.5 text-[#525252] hover:bg-[#ffffff]"
            aria-label="Columns"
          >
            <Columns3 size={16} />
          </button>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead className="bg-[#ffffff] text-xs text-[#737373]">
              <tr>
                <th className="w-10 px-4 py-4">
                  <input type="checkbox" className="h-4 w-4 rounded border-[#e6e6e6]" />
                </th>
                <th className="px-4 py-4 font-semibold">Name</th>
                <th className="px-4 py-4 font-semibold">Email</th>
                <th className="px-4 py-4 font-semibold">Phone</th>
                <th className="px-4 py-4 font-semibold">Roles</th>
                <th className="px-4 py-4 font-semibold">Access Role</th>
                <th className="px-4 py-4 font-semibold">2FA</th>
                <th className="px-4 py-4 font-semibold">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#f4f4f4]">
              {visibleUsers.map((user) => (
                <tr key={user.id} className="hover:bg-[#ffffff]">
                  <td className="px-4 py-4">
                    <input type="checkbox" className="h-4 w-4 rounded border-[#e6e6e6]" />
                  </td>
                  <td className="px-4 py-4">
                    <div className="flex items-center gap-2.5">
                      {user.avatarDataUrl ? (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img
                          src={user.avatarDataUrl}
                          alt={user.name}
                          className="h-8 w-8 shrink-0 rounded-full object-cover"
                        />
                      ) : (
                        <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full border border-[#e6e6e6] bg-[#ffffff] text-xs font-bold text-[#525252]">
                          {initialsFor(user.name)}
                        </span>
                      )}
                      <span className="font-semibold text-[#1a1a1a]">{user.name}</span>
                    </div>
                  </td>
                  <td className="px-4 py-4">
                    <span className="inline-flex items-center gap-1.5 rounded-lg border border-[#e6e6e6] bg-[#ffffff] px-2.5 py-1 text-xs font-medium text-[#1a1a1a]">
                      <Mail size={12} />
                      {user.email}
                    </span>
                  </td>
                  <td className="px-4 py-4">
                    <span className="inline-flex items-center gap-1.5 rounded-lg border border-[#e6e6e6] bg-[#ffffff] px-2.5 py-1 text-xs font-medium text-emerald-600">
                      <Phone size={12} />
                      {user.phone || "—"}
                    </span>
                  </td>
                  <td className="px-4 py-4">
                    <span className="rounded-full bg-emerald-100 px-2.5 py-1 text-xs font-bold text-emerald-700">
                      {user.isOwner || user.accessRoleKey === "administrator" ? "Admin" : "Staff"}
                    </span>
                  </td>
                  <td className="px-4 py-4">
                    <span className="rounded-full border border-[#e6e6e6] bg-blue-50 px-2.5 py-1 text-xs font-semibold text-[#1a1a1a]">
                      {roleLabel(user.accessRoleKey)}
                    </span>
                  </td>
                  <td className="px-4 py-4">
                    <span
                      className={`rounded-full px-2.5 py-1 text-xs font-bold ${
                        user.twoFactorEnabled ? "bg-emerald-100 text-emerald-700" : "bg-[#f4f4f4] text-[#a3a3a3]"
                      }`}
                    >
                      {user.twoFactorEnabled ? "On" : "Off"}
                    </span>
                  </td>
                  <td className="px-4 py-4">
                    <div className="flex items-center gap-3 text-xs font-bold">
                      <button
                        type="button"
                        onClick={() => navigate.push(`/dashboards/settings/users/${user.id}`)}
                        className="text-[#737373] hover:text-[#1a1a1a]"
                      >
                        View
                      </button>
                      <button
                        type="button"
                        data-testid="user-edit"
                        onClick={() => setEditingUserId(user.id)}
                        className="text-emerald-600 hover:text-emerald-700"
                      >
                        Edit
                      </button>
                      {!onlyOneUser && (
                        <button
                          type="button"
                          onClick={() => handleDelete(user)}
                          className="text-red-500 hover:text-red-600"
                        >
                          Delete
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
              {visibleUsers.length === 0 && (
                <tr>
                  <td colSpan={8} className="px-4 py-10 text-center text-sm text-[#737373]">
                    No users match your search.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        <div className="flex flex-wrap items-center justify-between gap-3 border-t border-[#e6e6e6] px-5 py-3 text-sm text-[#737373]">
          <span>
            Showing {visibleUsers.length} result{visibleUsers.length === 1 ? "" : "s"}
          </span>
          <label className="flex items-center gap-2 text-xs">
            Per page
            <select
              defaultValue={10}
              onChange={() => showToast("Pagination coming soon.")}
              className="rounded-lg border border-[#e6e6e6] bg-white px-2 py-1.5 text-xs outline-none focus:border-[#1a1a1a]"
            >
              <option value={10}>10</option>
              <option value={25}>25</option>
              <option value={50}>50</option>
            </select>
          </label>
        </div>
      </article>

      <ConfirmDialog
        open={deleteTarget !== null}
        title="Remove this user?"
        subtitle={deleteTarget?.name}
        confirmLabel="Yes, remove user"
        cancelLabel="Keep them"
        points={[
          `${deleteTarget?.name ?? "They"} will lose access to this dashboard straight away.`,
          successor ? (
            <span key="succession">
              {deleteTarget?.name} is the account owner, so <strong>{successor.name}</strong> will become the admin
              and take over ownership
              {successor.accessRoleKey !== "administrator" ? " (and be given the Administrator role)" : ""}.
            </span>
          ) : (
            "Everyone else keeps their access and roles exactly as they are."
          ),
          "This can't be undone — to bring them back you'd add them again as a new user.",
        ]}
        onCancel={() => setDeleteTarget(null)}
        onConfirm={confirmDelete}
      />
      {editingUserId && <EditSystemUserModal userId={editingUserId} onClose={() => setEditingUserId(null)} />}
    </section>
  );
}
