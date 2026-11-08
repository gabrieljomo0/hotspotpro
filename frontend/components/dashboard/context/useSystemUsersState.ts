import { useState } from "react";

import { usePersistedState } from "./usePersistedState";
import {
  ACCESS_ROLE_PRESETS,
  INITIAL_SYSTEM_USERS,
  ONLY_USER_MESSAGE,
  canRemoveSystemUser,
  pickSuccessor,
  type AccessRolePermissions,
  type SystemUser,
} from "../settings/systemUsersSchema";

export function useSystemUsersState(
  showToast: (message: string) => void,
  logActivity: (category: "Settings", message: string) => void,
) {
  // Saved, so adding a user and removing the original admin survives a reload
  // (otherwise the original admin would simply come back on refresh).
  const [systemUsers, setSystemUsers] = usePersistedState<SystemUser[]>("systemUsers", INITIAL_SYSTEM_USERS);
  const [accessRolePermissions, setAccessRolePermissions] = useState<Record<string, AccessRolePermissions>>(() => {
    const initial: Record<string, AccessRolePermissions> = {};
    ACCESS_ROLE_PRESETS.forEach((preset) => {
      initial[preset.key] = preset.build();
    });
    return initial;
  });
  const [accessRoleOverrides, setAccessRoleOverrides] = useState<Record<string, { name: string; description: string }>>({});

  function addSystemUser(input: {
    name: string;
    email: string;
    phone: string;
    accessRoleKey: string;
    avatarDataUrl: string | null;
  }) {
    const newUser: SystemUser = {
      // Time + a random suffix: two users added in the same instant must never share an id.
      id: `sysuser-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
      name: input.name,
      email: input.email,
      phone: input.phone,
      accessRoleKey: input.accessRoleKey,
      twoFactorEnabled: false,
      isOwner: false,
      avatarDataUrl: input.avatarDataUrl,
      createdAt: new Date().toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric" }),
    };
    setSystemUsers((current) => [...current, newUser]);
    const role = ACCESS_ROLE_PRESETS.find((r) => r.key === input.accessRoleKey);
    showToast(`${input.name} added as a system user with the ${role?.name ?? input.accessRoleKey} role.`);
    logActivity("Settings", `Added "${input.name}" as a system user (${role?.name ?? input.accessRoleKey}).`);
    return newUser;
  }

  function updateSystemUser(
    id: string,
    updates: Partial<Pick<SystemUser, "name" | "email" | "phone" | "accessRoleKey" | "avatarDataUrl">>,
  ) {
    setSystemUsers((current) => current.map((u) => (u.id === id ? { ...u, ...updates } : u)));
    const user = systemUsers.find((u) => u.id === id);
    showToast(`${user?.name ?? "User"} updated.`);
    logActivity("Settings", `Updated system user "${user?.name ?? id}".`);
  }

  function deleteSystemUser(id: string) {
    const user = systemUsers.find((u) => u.id === id);
    if (!user) return;

    // Rule 1: the last remaining user can't be removed.
    if (!canRemoveSystemUser(systemUsers, id)) {
      showToast(ONLY_USER_MESSAGE);
      return;
    }

    // Rule 2: if the owner is the one going, the next user becomes the admin.
    const successor = user.isOwner ? pickSuccessor(systemUsers, id) : null;

    setSystemUsers((current) => {
      if (!canRemoveSystemUser(current, id)) return current;
      const heir = user.isOwner ? pickSuccessor(current, id) : null;
      return current
        .filter((u) => u.id !== id)
        .map((u) => (heir && u.id === heir.id ? { ...u, isOwner: true, accessRoleKey: "administrator" } : u));
    });

    if (successor) {
      showToast(`${user.name} removed. ${successor.name} is now the admin.`);
      logActivity(
        "Settings",
        `Removed system user "${user.name}" (the owner). "${successor.name}" took over as admin.`,
      );
    } else {
      showToast(`${user.name} removed.`);
      logActivity("Settings", `Removed system user "${user.name}".`);
    }
  }

  function toggleSystemUserTwoFactor(id: string) {
    setSystemUsers((current) =>
      current.map((u) => (u.id === id ? { ...u, twoFactorEnabled: !u.twoFactorEnabled } : u)),
    );
    const user = systemUsers.find((u) => u.id === id);
    showToast(`Two-factor authentication ${user?.twoFactorEnabled ? "disabled" : "enabled"} for ${user?.name ?? "user"}.`);
  }

  function toggleAccessRolePermission(roleKey: string, permissionKey: string) {
    const preset = ACCESS_ROLE_PRESETS.find((r) => r.key === roleKey);
    if (preset?.locked) {
      showToast("The Administrator role is a locked system role and can't be restricted.");
      return;
    }
    setAccessRolePermissions((current) => ({
      ...current,
      [roleKey]: { ...current[roleKey], [permissionKey]: !current[roleKey]?.[permissionKey] },
    }));
  }

  function updateAccessRoleMeta(roleKey: string, updates: { name?: string; description?: string }) {
    const preset = ACCESS_ROLE_PRESETS.find((r) => r.key === roleKey);
    if (preset?.locked) {
      showToast("The Administrator role is a locked system role and can't be edited.");
      return;
    }
    setAccessRoleOverrides((current) => ({
      ...current,
      [roleKey]: {
        name: updates.name ?? current[roleKey]?.name ?? preset?.name ?? roleKey,
        description: updates.description ?? current[roleKey]?.description ?? preset?.description ?? "",
      },
    }));
  }

  function resetAccessRoleToDefault(roleKey: string) {
    const preset = ACCESS_ROLE_PRESETS.find((r) => r.key === roleKey);
    if (!preset) return;
    setAccessRolePermissions((current) => ({ ...current, [roleKey]: preset.build() }));
    setAccessRoleOverrides((current) => {
      const next = { ...current };
      delete next[roleKey];
      return next;
    });
    showToast(`${preset.name} reset to its default permissions.`);
    logActivity("Settings", `Reset the ${preset.name} access role to its default permissions.`);
  }

  return {
    systemUsers,
    addSystemUser,
    updateSystemUser,
    deleteSystemUser,
    toggleSystemUserTwoFactor,
    accessRolePermissions,
    toggleAccessRolePermission,
    updateAccessRoleMeta,
    accessRoleOverrides,
    resetAccessRoleToDefault,
  };
}
