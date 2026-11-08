"use client";

import { useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { ChevronRight } from "lucide-react";

import { useDashboard } from "@/components/dashboard/context/DashboardContext";
import { ACCESS_ROLE_PRESETS } from "@/components/dashboard/settings/systemUsersSchema";

export default function CreateSystemUserPage() {
  const navigate = useRouter();
  const { addSystemUser, showToast } = useDashboard();

  const [avatarDataUrl, setAvatarDataUrl] = useState<string | null>(null);
  const [avatarFileName, setAvatarFileName] = useState<string | null>(null);
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [password, setPassword] = useState("");
  const [passwordConfirmation, setPasswordConfirmation] = useState("");
  const [accessRoleKey, setAccessRoleKey] = useState("");

  function handlePhotoChange(file: File | undefined) {
    if (!file) return;
    setAvatarFileName(file.name);
    const reader = new FileReader();
    reader.onload = () => setAvatarDataUrl(typeof reader.result === "string" ? reader.result : null);
    reader.readAsDataURL(file);
  }

  function resetForm() {
    setAvatarDataUrl(null);
    setAvatarFileName(null);
    setName("");
    setEmail("");
    setPhone("");
    setPassword("");
    setPasswordConfirmation("");
    setAccessRoleKey("");
  }

  function validate(): string | null {
    if (!name.trim()) return "Name is required.";
    if (!email.trim()) return "Email is required.";
    if (!password) return "Password is required.";
    if (password !== passwordConfirmation) return "Password confirmation doesn't match.";
    if (!accessRoleKey) return "Choose an Access Role.";
    return null;
  }

  function handleSubmit(event: FormEvent, andCreateAnother = false) {
    event.preventDefault();
    const error = validate();
    if (error) {
      showToast(error);
      return;
    }
    addSystemUser({
      name: name.trim(),
      email: email.trim(),
      phone: phone.trim(),
      accessRoleKey,
      avatarDataUrl,
    });
    if (andCreateAnother) {
      resetForm();
      return;
    }
    navigate.push("/dashboards/settings/users");
  }

  return (
    <section className="w-full">
      <nav className="mb-4 flex items-center gap-1.5 text-sm text-[#737373]">
        <Link href="/dashboards/settings/users" className="hover:text-[#1a1a1a]">
          Users
        </Link>
        <ChevronRight size={14} />
        <span className="font-semibold text-[#1a1a1a]">Create</span>
      </nav>
      <h2 className="mb-6 text-3xl font-bold tracking-tight md:text-4xl">Create User</h2>

      <form onSubmit={(event) => handleSubmit(event, false)} className="space-y-6">
        <article className="overflow-hidden rounded-2xl border border-[#e6e6e6] bg-white shadow-[0_8px_24px_rgba(26,26,26,0.06)]">
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
                ) : avatarFileName ? (
                  <span className="font-semibold text-[#1a1a1a]">{avatarFileName}</span>
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

              <label className="block">
                <span className="mb-2 block text-sm font-semibold text-[#525252]">
                  Password<span className="text-red-500">*</span>
                </span>
                <input
                  required
                  type="password"
                  value={password}
                  onChange={(event) => setPassword(event.target.value)}
                  className="h-11 w-full rounded-xl border border-[#e6e6e6] bg-white px-3 text-sm outline-none focus:border-[#1a1a1a]"
                />
              </label>

              <label className="block">
                <span className="mb-2 block text-sm font-semibold text-[#525252]">Password confirmation</span>
                <input
                  type="password"
                  value={passwordConfirmation}
                  onChange={(event) => setPasswordConfirmation(event.target.value)}
                  className="h-11 w-full rounded-xl border border-[#e6e6e6] bg-white px-3 text-sm outline-none focus:border-[#1a1a1a]"
                />
              </label>
            </div>
          </div>
        </article>

        <article className="overflow-hidden rounded-2xl border border-[#e6e6e6] bg-white shadow-[0_8px_24px_rgba(26,26,26,0.06)]">
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
                className="h-11 w-full rounded-xl border border-[#e6e6e6] bg-white px-3 text-sm outline-none focus:border-[#1a1a1a]"
              >
                <option value="">Select an option</option>
                {ACCESS_ROLE_PRESETS.map((role) => (
                  <option key={role.key} value={role.key}>
                    {role.name}
                  </option>
                ))}
              </select>
            </label>
          </div>
        </article>

        <div className="flex flex-wrap gap-2">
          <button type="submit" className="rounded-xl bg-emerald-500 px-5 py-3 text-sm font-bold text-white hover:bg-emerald-600">
            Create
          </button>
          <button
            type="button"
            onClick={(event) => handleSubmit(event, true)}
            className="rounded-xl border border-[#e6e6e6] bg-white px-5 py-3 text-sm font-bold text-[#525252] hover:bg-[#ffffff]"
          >
            Create &amp; create another
          </button>
          <button
            type="button"
            onClick={() => navigate.push("/dashboards/settings/users")}
            className="rounded-xl border border-[#e6e6e6] bg-white px-5 py-3 text-sm font-bold text-[#525252] hover:bg-[#ffffff]"
          >
            Cancel
          </button>
        </div>
      </form>
    </section>
  );
}
