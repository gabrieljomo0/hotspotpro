"use client";

import { useState, type FormEvent } from "react";
import { UserCircle2 } from "lucide-react";

import { useDashboard } from "@/components/dashboard/context/DashboardContext";
import { BackLink } from "@/components/dashboard/shared/BackLink";

export default function AccountPage() {
  const { currentAgent, dashboardLanguage, updateDashboardLanguage, updateAgentProfile } = useDashboard();
  const [name, setName] = useState(currentAgent.name);
  const [email, setEmail] = useState(currentAgent.email);
  const [phone, setPhone] = useState(currentAgent.phone ?? "");
  const [saved, setSaved] = useState(false);

  function handleSubmit(event: FormEvent) {
    event.preventDefault();
    updateAgentProfile(currentAgent.id, {
      name: name.trim() || currentAgent.name,
      email: email.trim() || currentAgent.email,
      phone: phone.trim() || null,
    });
    setSaved(true);
    window.setTimeout(() => setSaved(false), 2000);
  }

  return (
    <section className="w-full">
      <BackLink />
      <h2 className="mb-1 text-3xl font-bold tracking-tight md:text-4xl">
        Account
      </h2>
      <p className="mb-6 max-w-2xl text-sm text-[#737373] md:text-base">
        Manage your own profile. To manage other staff, go to Agents.
      </p>

      <form
        onSubmit={handleSubmit}
        className="max-w-xl rounded-2xl border border-[#e6e6e6] bg-white p-6 shadow-[0_8px_24px_rgba(26,26,26,0.06)] md:p-8"
      >
        <div className="flex items-center gap-3">
          <div className="flex h-14 w-14 items-center justify-center rounded-full bg-[#f4f4f4] text-[#1a1a1a]">
            <UserCircle2 size={28} />
          </div>
          <div>
            <p className="font-bold text-[#1a1a1a]">{currentAgent.name}</p>
            <p className="text-xs text-[#737373]">
              {currentAgent.role} · Signed in since {currentAgent.createdAt}
            </p>
          </div>
        </div>

        <div className="mt-6 space-y-4">
          <label className="block">
            <span className="mb-2 block text-sm font-semibold text-[#525252]">
              Full name
            </span>
            <input
              value={name}
              onChange={(event) => setName(event.target.value)}
              className="h-11 w-full rounded-xl border border-[#e6e6e6] bg-white px-3 text-sm outline-none focus:border-[#1a1a1a]"
            />
          </label>

          <label className="block">
            <span className="mb-2 block text-sm font-semibold text-[#525252]">
              Email
            </span>
            <input
              type="email"
              value={email}
              onChange={(event) => setEmail(event.target.value)}
              className="h-11 w-full rounded-xl border border-[#e6e6e6] bg-white px-3 text-sm outline-none focus:border-[#1a1a1a]"
            />
          </label>

          <label className="block">
            <span className="mb-2 block text-sm font-semibold text-[#525252]">
              Phone
            </span>
            <input
              type="tel"
              value={phone}
              onChange={(event) => setPhone(event.target.value)}
              placeholder="Optional"
              className="h-11 w-full rounded-xl border border-[#e6e6e6] bg-white px-3 text-sm outline-none focus:border-[#1a1a1a]"
            />
          </label>

          <label className="block">
            <span className="mb-2 block text-sm font-semibold text-[#525252]">
              Dashboard language
            </span>
            <select
              value={dashboardLanguage}
              onChange={(event) => updateDashboardLanguage(event.target.value)}
              className="h-11 w-full rounded-xl border border-[#e6e6e6] bg-white px-3 text-sm outline-none focus:border-[#1a1a1a]"
            >
              {["English", "French", "Swahili", "Twi", "Hausa"].map((lang) => (
                <option key={lang} value={lang}>
                  {lang}
                </option>
              ))}
            </select>
            <span className="mt-1 block text-xs text-[#a3a3a3]">
              This is your own dashboard&apos;s language — separate from the
              language customers see on the captive portal, which is set per
              router under Configuration → Hotspot.
            </span>
          </label>
        </div>

        <button
          type="submit"
          className="mt-6 rounded-xl bg-[#1a1a1a] px-6 py-3 text-sm font-bold text-white hover:bg-[#111111]"
        >
          {saved ? "Saved!" : "Save Changes"}
        </button>
      </form>
    </section>
  );
}
