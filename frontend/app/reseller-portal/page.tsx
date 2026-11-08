"use client";

import { useState, type FormEvent } from "react";
import Link from "next/link";
import {
  Wifi,
  Wrench,
  ShoppingBag,
  Wallet,
  ArrowRight,
  LogIn,
  UserPlus,
  CheckCircle2,
  Router as RouterIcon,
  AlertCircle,
} from "lucide-react";

import { useDashboard } from "@/components/dashboard/context/DashboardContext";

export default function ResellerPortalGatewayPage() {
  const { registerInstaller } = useDashboard();

  const [creatingAccount, setCreatingAccount] = useState(false);
  const [form, setForm] = useState({ name: "", email: "", phone: "", password: "" });
  const [error, setError] = useState("");
  const [done, setDone] = useState(false);

  function update(key: keyof typeof form, value: string) {
    setForm((current) => ({ ...current, [key]: value }));
  }

  function handleSubmit(event: FormEvent) {
    event.preventDefault();
    setError("");

    if (!form.name.trim() || !form.email.trim() || !form.phone.trim()) {
      setError("Fill in your name, email and phone number.");
      return;
    }
    if (form.password.length < 6) {
      setError("Choose a password with at least 6 characters.");
      return;
    }

    const installer = registerInstaller(form.name.trim(), form.email.trim(), form.phone.trim(), form.password);
    if (!installer) {
      setError("An account with that email already exists. Try signing in instead.");
      return;
    }
    setDone(true);
  }

  return (
    <main className="min-h-screen bg-[#f1f5f9] px-4 py-10 text-[#0f172a] sm:py-16">
      <div className="mx-auto max-w-3xl">
        <div className="mb-8 flex items-center gap-3">
          <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-[#0f172a] text-amber-400">
            <Wifi size={22} strokeWidth={3} />
          </div>
          <div>
            <p className="text-xl font-black">
              Hotspot<span className="text-[#2563eb]">Pro</span>
            </p>
            <p className="text-xs text-[#64748b]">Reseller Portal</p>
          </div>
        </div>

        {/* How it works */}
        <section className="mb-8 rounded-2xl border border-[#e2e8f0] bg-white p-6 shadow-[0_8px_24px_rgba(37,99,235,0.06)] sm:p-8">
          <h1 className="text-2xl font-black sm:text-3xl">How the Reseller Portal works</h1>
          <p className="mt-2 text-sm text-[#64748b]">
            There are two ways people work with HotspotPro outside of the main admin team — installers, who set up
            and maintain routers, and agents, who sell internet vouchers and packages. This page is for the first
            group.
          </p>

          <div className="mt-6 grid gap-4 sm:grid-cols-2">
            <div className="rounded-xl border border-[#f1f5f9] p-4">
              <span className="flex h-9 w-9 items-center justify-center rounded-lg bg-blue-100 text-blue-600">
                <Wrench size={16} />
              </span>
              <p className="mt-2 text-sm font-bold">Installers</p>
              <p className="mt-1 text-xs text-[#64748b]">
                Set up and maintain hotspot routers on site. Create an account below, then admin assigns you to a
                site once you&apos;re ready to start.
              </p>
            </div>
            <div className="rounded-xl border border-[#f1f5f9] p-4">
              <span className="flex h-9 w-9 items-center justify-center rounded-lg bg-emerald-100 text-emerald-600">
                <ShoppingBag size={16} />
              </span>
              <p className="mt-2 text-sm font-bold">Agents (Resellers)</p>
              <p className="mt-1 text-xs text-[#64748b]">
                Sell vouchers and packages to customers and earn commission. Agents don&apos;t sign up here — see
                below for how to apply.
              </p>
            </div>
          </div>
        </section>

        {/* Installer: sign in or create account */}
        <section className="mb-8 overflow-hidden rounded-2xl border border-[#e2e8f0] bg-white shadow-[0_8px_24px_rgba(37,99,235,0.06)]">
          <div className="border-b border-[#e2e8f0] px-6 py-4 sm:px-8">
            <h2 className="text-lg font-bold">I&apos;m an Installer</h2>
          </div>

          {done ? (
            <div className="p-6 sm:p-8">
              <div className="flex items-start gap-3 rounded-xl border border-emerald-200 bg-emerald-50 p-4">
                <CheckCircle2 size={20} className="mt-0.5 shrink-0 text-emerald-600" />
                <div>
                  <p className="text-sm font-bold text-emerald-800">Your installer account is ready</p>
                  <p className="mt-1 text-sm text-emerald-700">
                    Welcome, {form.name.split(" ")[0]}. Admin will assign you to a site soon. You can sign in with{" "}
                    {form.email} any time using the password you just chose.
                  </p>
                  <Link
                    href="/login"
                    className="mt-3 inline-flex items-center gap-1.5 text-sm font-bold text-emerald-700 hover:underline"
                  >
                    <LogIn size={14} />
                    Go to Sign In
                  </Link>
                </div>
              </div>
            </div>
          ) : !creatingAccount ? (
            <div className="flex flex-col gap-3 p-6 sm:flex-row sm:p-8">
              <Link
                href="/login"
                className="flex flex-1 items-center justify-center gap-2 rounded-xl bg-[#2563eb] px-5 py-3.5 text-sm font-bold text-white hover:bg-[#1d4ed8]"
              >
                <LogIn size={16} />
                Sign In
              </Link>
              <button
                type="button"
                onClick={() => setCreatingAccount(true)}
                className="flex flex-1 items-center justify-center gap-2 rounded-xl border-2 border-[#2563eb] px-5 py-3.5 text-sm font-bold text-[#2563eb] hover:bg-[#f1f5f9]"
              >
                <UserPlus size={16} />
                Create Account
              </button>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-4 p-6 sm:p-8">
              <div className="grid gap-4 sm:grid-cols-2">
                <label className="block">
                  <span className="mb-1.5 block text-xs font-semibold text-[#475569]">Full name</span>
                  <input
                    value={form.name}
                    onChange={(event) => update("name", event.target.value)}
                    className="h-11 w-full rounded-xl border border-[#e2e8f0] bg-white px-3 text-sm outline-none focus:border-[#2563eb]"
                  />
                </label>
                <label className="block">
                  <span className="mb-1.5 block text-xs font-semibold text-[#475569]">Phone number</span>
                  <input
                    value={form.phone}
                    onChange={(event) => update("phone", event.target.value)}
                    placeholder="055 123 4567"
                    className="h-11 w-full rounded-xl border border-[#e2e8f0] bg-white px-3 text-sm outline-none focus:border-[#2563eb]"
                  />
                </label>
                <label className="block">
                  <span className="mb-1.5 block text-xs font-semibold text-[#475569]">Email</span>
                  <input
                    type="email"
                    value={form.email}
                    onChange={(event) => update("email", event.target.value)}
                    className="h-11 w-full rounded-xl border border-[#e2e8f0] bg-white px-3 text-sm outline-none focus:border-[#2563eb]"
                  />
                </label>
                <label className="block">
                  <span className="mb-1.5 block text-xs font-semibold text-[#475569]">Password</span>
                  <input
                    type="password"
                    value={form.password}
                    onChange={(event) => update("password", event.target.value)}
                    placeholder="At least 6 characters"
                    className="h-11 w-full rounded-xl border border-[#e2e8f0] bg-white px-3 text-sm outline-none focus:border-[#2563eb]"
                  />
                </label>
              </div>

              {error && (
                <p className="flex items-center gap-1.5 text-xs font-semibold text-red-600">
                  <AlertCircle size={13} />
                  {error}
                </p>
              )}

              <div className="flex gap-3">
                <button
                  type="submit"
                  className="rounded-xl bg-[#2563eb] px-5 py-3 text-sm font-bold text-white hover:bg-[#1d4ed8]"
                >
                  Create Account
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setCreatingAccount(false);
                    setError("");
                  }}
                  className="rounded-xl border border-[#e2e8f0] bg-white px-5 py-3 text-sm font-bold text-[#475569] hover:bg-[#ffffff]"
                >
                  Cancel
                </button>
              </div>
            </form>
          )}
        </section>

        {/* Agent: directed to the specific network's captive portal */}
        <section className="overflow-hidden rounded-2xl border-2 border-amber-200 bg-amber-50/40">
          <div className="flex items-start gap-3 p-6 sm:p-8">
            <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-amber-500 text-white">
              <RouterIcon size={18} />
            </span>
            <div>
              <h2 className="text-base font-bold text-amber-900">Want to become an agent instead?</h2>
              <p className="mt-1.5 text-sm text-amber-800">
                Agents apply through the WiFi login page of the specific network they want to sell for — not here.
                Connect to that network&apos;s WiFi, open its login page, and look for &quot;Apply to become an
                agent&quot; (usually near the bottom of the page). Each network reviews and approves its own agents.
              </p>
              <p className="mt-2 flex items-center gap-1.5 text-xs font-semibold text-amber-700">
                Already applied and got approved? <Link href="/login" className="inline-flex items-center gap-1 underline">Sign in here <ArrowRight size={12} /></Link>
              </p>
            </div>
          </div>
        </section>

        <p className="mt-8 flex items-center gap-1.5 text-xs text-[#94a3b8]">
          <Wallet size={12} />
          Installers and agents are managed separately — admin can see both from the main dashboard.
        </p>
      </div>
    </main>
  );
}
