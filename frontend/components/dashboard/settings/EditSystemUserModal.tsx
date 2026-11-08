"use client";

// Edit a system user in a pop-up, so you stay on the users list.

import { useState, type FormEvent } from "react";

import { useDashboard } from "@/components/dashboard/context/DashboardContext";
import { ModalFrame } from "@/components/dashboard/agents/detail/ModalFrame";
import { ACCESS_ROLE_PRESETS } from "@/components/dashboard/settings/systemUsersSchema";

export function EditSystemUserModal({ userId, onClose }: { userId: string; onClose: () => void }) {
  const { systemUsers, updateSystemUser, showToast } = useDashboard();
  const user = systemUsers.find((u) => u.id === userId);

  const [avatarDataUrl, setAvatarDataUrl] = useState<string | null>(user?.avatarDataUrl ?? null);
  const [name, setName] = useState(user?.name ?? "");
  const [email, setEmail] = useState(user?.email ?? "");
  const [phone, setPhone] = useState(user?.phone ?? "");
  const [accessRoleKey, setAccessRoleKey] = useState(user?.accessRoleKey ?? "");

  if (!user) return null;

  function handlePhotoChange(file: File | undefined) {
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => setAvatarDataUrl(typeof reader.result === "string" ? reader.result : null);
    reader.readAsDataURL(file);
  }

  function handleSubmit(event: FormEvent) {
    event.preventDefault();
    if (!name.trim() || !email.trim()) {
      showToast("Name and email are required.");
      return;
    }
    if (!accessRoleKey) {
      showToast("Choose an Access Role.");
      return;
    }
    updateSystemUser(user!.id, {
      name: name.trim(),
      email: email.trim(),
      phone: phone.trim(),
      accessRoleKey,
      avatarDataUrl,
    });
    onClose();
  }

  return (
    <ModalFrame title="Edit User" subtitle={user.name} onClose={onClose} widthClass="max-w-2xl" testId="edit-user-modal">
      <form onSubmit={handleSubmit} className="space-y-5">
        <article className="overflow-hidden rounded-2xl border border-[#e6e6e6] bg-white ">
          <div className="border-b border-[#e6e6e6] px-6 py-4">
            <h3 className="text-sm font-bold text-[#1a1a1a]">User Information</h3>
          </div>
          <div className="space-y-6 p-6">
            <div>
              <span className="mb-2 block text-sm font-semibold text-[#525252]">Profile Photo</span>
              <label className="flex h-28 w-28 cursor-pointer flex-col items-center justify-center rounded-full border-2 border-dashed border-[#e6e6e6] bg-[#ffffff] p-2 text-center text-xs text-[#737373] hover:border-[#1a1a1a]">
                {avatarDataUrl ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={avatarDataUrl} alt="Profile preview" className="h-full w-full rounded-full object-cover" />
                ) : (
                  <span>
                    Drag &amp; Drop your files or <span className="font-bold text-[#1a1a1a]">Browse</span>
                  </span>
                )}
                <input
                  type="file"
                  accept="image/png,image/jpeg"
                  className="hidden"
                  onChange={(event) => handlePhotoChange(event.target.files?.[0])}
                />
              </label>
            </div>

            <div className="grid gap-5 sm:grid-cols-2">
              <label className="block">
                <span className="mb-2 block text-sm font-semibold text-[#525252]">
                  Name<span className="text-red-500">*</span>
                </span>
                <input
                  required
                  value={name}
                  onChange={(event) => setName(event.target.value)}
                  className="h-11 w-full rounded-xl border border-[#e6e6e6] bg-white px-3 text-sm outline-none focus:border-[#1a1a1a]"
                />
              </label>

              <label className="block">
                <span className="mb-2 block text-sm font-semibold text-[#525252]">
                  Email<span className="text-red-500">*</span>
                </span>
                <input
                  required
                  type="email"
                  value={email}
                  onChange={(event) => setEmail(event.target.value)}
                  className="h-11 w-full rounded-xl border border-[#e6e6e6] bg-white px-3 text-sm outline-none focus:border-[#1a1a1a]"
                />
              </label>

              <label className="block">
                <span className="mb-2 block text-sm font-semibold text-[#525252]">Phone</span>
                <input
                  value={phone}
                  onChange={(event) => setPhone(event.target.value.replace(/[^0-9]/g, ""))}
                  placeholder="e.g., 256753090879"
                  className="h-11 w-full rounded-xl border border-[#e6e6e6] bg-white px-3 text-sm outline-none focus:border-[#1a1a1a]"
                />
                <span className="mt-1.5 block text-xs text-[#a3a3a3]">
                  Include country code without + (e.g., 256 for Uganda)
                </span>
              </label>
            </div>
          </div>
        </article>

        <article className="overflow-hidden rounded-2xl border border-[#e6e6e6] bg-white ">
          <div className="border-b border-[#e6e6e6] px-6 py-4">
            <h3 className="text-sm font-bold text-[#1a1a1a]">Roles &amp; Permissions</h3>
          </div>
          <div className="p-6">
            <label className="block sm:max-w-sm">
              <span className="mb-2 block text-sm font-semibold text-[#525252]">
                Access Role<span className="text-red-500">*</span>
              </span>
              <select
                required
                value={accessRoleKey}
                onChange={(event) => setAccessRoleKey(event.target.value)}
                disabled={user.isOwner}
                className="h-11 w-full rounded-xl border border-[#e6e6e6] bg-white px-3 text-sm outline-none focus:border-[#1a1a1a] disabled:bg-[#ffffff] disabled:text-[#a3a3a3]"
              >
                <option value="">Select an option</option>
                {ACCESS_ROLE_PRESETS.map((role) => (
                  <option key={role.key} value={role.key}>
                    {role.name}
                  </option>
                ))}
              </select>
              {user.isOwner && (
                <span className="mt-1.5 block text-xs text-[#a3a3a3]">
                  The account owner always keeps the Administrator role.
                </span>
              )}
            </label>
          </div>
        </article>

        <div className="flex flex-wrap gap-2 border-t border-[#e6e6e6] pt-4">
          <button type="submit" data-testid="edit-user-save" className="rounded-xl bg-[#1a1a1a] px-5 py-3 text-sm font-bold text-white hover:bg-[#111111]">
            Save changes
          </button>
          <button type="button" onClick={onClose} className="rounded-xl border border-[#e6e6e6] bg-white px-5 py-3 text-sm font-bold text-[#525252] hover:bg-[#f4f4f4]">
            Cancel
          </button>
        </div>
      </form>
    </ModalFrame>
  );
}
