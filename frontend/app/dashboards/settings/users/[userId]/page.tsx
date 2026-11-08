"use client";

import { use, useState } from "react";
import Link from "next/link";

import { useDashboard } from "@/components/dashboard/context/DashboardContext";
import { ActionPageLayout, NotFoundCard } from "@/components/dashboard/shared/ActionPageLayout";
import { EditSystemUserModal } from "@/components/dashboard/settings/EditSystemUserModal";
import { ACCESS_ROLE_PRESETS } from "@/components/dashboard/settings/systemUsersSchema";

export default function ViewSystemUserPage({
  params,
}: {
  params: Promise<{ userId: string }>;
}) {
  const { userId } = use(params);
  const { systemUsers, accessRoleOverrides } = useDashboard();
  const [editing, setEditing] = useState(false);

  const user = systemUsers.find((u) => u.id === userId);

  if (!user) {
    return <NotFoundCard message="This user may have been removed." backHref="/dashboards/settings/users" />;
  }

  const preset = ACCESS_ROLE_PRESETS.find((r) => r.key === user.accessRoleKey);
  const roleName = accessRoleOverrides[user.accessRoleKey]?.name ?? preset?.name ?? user.accessRoleKey;

  const rows: Array<[string, string]> = [
    ["Email", user.email],
    ["Phone", user.phone || "Not provided"],
    ["Access Role", roleName],
    ["Two-Factor Authentication", user.twoFactorEnabled ? "On" : "Off"],
    ["Account Type", user.isOwner ? "Owner" : "Staff"],
    ["Created", user.createdAt],
  ];

  return (
    <ActionPageLayout
      eyebrow="System user"
      title={user.name}
      subtitle="Login and access details for this system user."
      backHref="/dashboards/settings/users"
    >
      <div className="space-y-3">
        {rows.map(([label, value]) => (
          <div
            key={label}
            className="flex items-center justify-between gap-4 rounded-xl border border-[#f1f5f9] px-4 py-3"
          >
            <span className="text-sm text-[#64748b]">{label}</span>
            <span className="text-sm font-semibold text-[#0f172a]">{value}</span>
          </div>
        ))}
      </div>

      <div className="mt-6 flex flex-wrap gap-2">
        <button
          type="button"
          data-testid="user-edit"
          onClick={() => setEditing(true)}
          className="rounded-xl bg-[#2563eb] px-5 py-2.5 text-sm font-bold text-white hover:bg-[#1d4ed8]"
        >
          Edit User
        </button>
        <Link
          href="/dashboards/settings/users/access-roles"
          className="rounded-xl border border-[#e2e8f0] bg-white px-5 py-2.5 text-sm font-bold text-[#475569] hover:bg-[#ffffff]"
        >
          View Access Roles
        </Link>
      </div>
      {editing && <EditSystemUserModal userId={user.id} onClose={() => setEditing(false)} />}
    </ActionPageLayout>
  );
}
