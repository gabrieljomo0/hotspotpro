"use client";

import { useState, type FormEvent } from "react";
import Link from "next/link";
import { UserCog, Plus, MapPin, ArrowRight } from "lucide-react";

import { useDashboard } from "@/components/dashboard/context/DashboardContext";
import { BackLink } from "@/components/dashboard/shared/BackLink";

export default function InstallersPage() {
  const { installers, businessLocations, routers, installDispatches, addInstaller, assignInstallerToSite } =
    useDashboard();

  const [addOpen, setAddOpen] = useState(false);
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");

  const [assigningId, setAssigningId] = useState<string | null>(null);
  const [siteChoice, setSiteChoice] = useState("");
  const [routerChoice, setRouterChoice] = useState("");

  function handleAdd(event: FormEvent) {
    event.preventDefault();
    if (!name.trim() || !email.trim()) return;
    addInstaller(name.trim(), email.trim(), phone.trim());
    setName("");
    setEmail("");
    setPhone("");
    setAddOpen(false);
  }

  function startAssign(installerId: string) {
    setAssigningId(installerId);
    setSiteChoice(businessLocations[0]?.id ?? "");
    setRouterChoice("");
  }

  function confirmAssign() {
    if (!assigningId || !siteChoice) return;
    assignInstallerToSite(assigningId, siteChoice, routerChoice || null);
    setAssigningId(null);
  }

  return (
    <section className="w-full">
      <BackLink />
      <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="mb-1 text-3xl font-bold tracking-tight md:text-4xl">
            All Installers
          </h2>
          <p className="max-w-2xl text-sm text-[#64748b] md:text-base">
            Field technicians who set up routers on-site. Assign each one to
            a business/site, and once they&apos;re done, dispatch that site
            to the client from{" "}
            <Link href="/dashboards/installers/clients" className="font-semibold text-[#2563eb] hover:underline">
              Installer Clients
            </Link>
            .
          </p>
        </div>
        <button
          type="button"
          onClick={() => setAddOpen(true)}
          className="inline-flex items-center gap-2 rounded-xl bg-[#2563eb] px-4 py-3 text-sm font-bold text-white hover:bg-[#1d4ed8]"
        >
          <Plus size={16} />
          Add Installer
        </button>
      </div>

      {addOpen && (
        <form onSubmit={handleAdd} className="mb-6 grid gap-4 rounded-2xl border border-[#e2e8f0] bg-white p-5 shadow-[0_8px_24px_rgba(37,99,235,0.06)] sm:grid-cols-3">
          <input required value={name} onChange={(e) => setName(e.target.value)} placeholder="Full name" className="h-11 rounded-xl border border-[#e2e8f0] px-3 text-sm outline-none focus:border-[#2563eb]" />
          <input required type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="Email" className="h-11 rounded-xl border border-[#e2e8f0] px-3 text-sm outline-none focus:border-[#2563eb]" />
          <input value={phone} onChange={(e) => setPhone(e.target.value)} placeholder="Phone" className="h-11 rounded-xl border border-[#e2e8f0] px-3 text-sm outline-none focus:border-[#2563eb]" />
          <div className="flex gap-2 sm:col-span-3">
            <button type="submit" className="rounded-xl bg-emerald-600 px-5 py-2.5 text-sm font-bold text-white hover:bg-emerald-700">
              Add Installer
            </button>
            <button type="button" onClick={() => setAddOpen(false)} className="rounded-xl border border-[#e2e8f0] bg-white px-5 py-2.5 text-sm font-bold text-[#475569] hover:bg-[#ffffff]">
              Cancel
            </button>
          </div>
        </form>
      )}

      {installers.length === 0 ? (
        <div className="rounded-2xl border border-[#e2e8f0] bg-white p-10 text-center text-sm text-[#94a3b8]">
          No installers yet. Add your first one above.
        </div>
      ) : (
        <div className="space-y-3">
          {installers.map((installer) => {
            const site = businessLocations.find((s) => s.id === installer.assignedSiteId);
            const dispatch = installDispatches.find((d) => d.installerId === installer.id && d.siteId === installer.assignedSiteId);

            return (
              <article key={installer.id} className="rounded-2xl border border-[#e2e8f0] bg-white p-5 shadow-[0_8px_24px_rgba(37,99,235,0.06)]">
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <div className="flex items-center gap-3">
                    <div className="flex h-11 w-11 items-center justify-center rounded-full bg-[#f1f5f9] text-[#2563eb]">
                      <UserCog size={18} />
                    </div>
                    <div>
                      <p className="font-bold text-[#0f172a]">{installer.name}</p>
                      <p className="text-xs text-[#64748b]">{installer.email} · {installer.phone || "No phone"}</p>
                    </div>
                  </div>

                  <div className="flex items-center gap-3">
                    {site ? (
                      <span className="inline-flex items-center gap-1.5 rounded-full bg-blue-100 px-3 py-1.5 text-xs font-bold text-blue-700">
                        <MapPin size={12} /> {site.name}
                        {dispatch?.status === "Dispatched" && (
                          <span className="ml-1 rounded-full bg-emerald-500 px-1.5 py-0.5 text-[10px] text-white">Dispatched</span>
                        )}
                      </span>
                    ) : (
                      <span className="text-xs text-[#94a3b8]">Not assigned</span>
                    )}
                    <button
                      type="button"
                      onClick={() => startAssign(installer.id)}
                      className="rounded-lg border border-[#e2e8f0] bg-white px-3 py-2 text-xs font-semibold text-[#2563eb] hover:bg-[#ffffff]"
                    >
                      {site ? "Reassign" : "Assign to Site"}
                    </button>
                  </div>
                </div>

                {assigningId === installer.id && (
                  <div className="mt-4 flex flex-wrap items-end gap-3 rounded-xl bg-[#ffffff] p-4">
                    <label className="block">
                      <span className="mb-1.5 block text-xs font-semibold text-[#64748b]">Business / Site</span>
                      <select value={siteChoice} onChange={(e) => setSiteChoice(e.target.value)} className="h-10 rounded-lg border border-[#e2e8f0] bg-white px-3 text-sm outline-none focus:border-[#2563eb]">
                        {businessLocations.map((s) => (
                          <option key={s.id} value={s.id}>{s.name}</option>
                        ))}
                      </select>
                    </label>
                    <label className="block">
                      <span className="mb-1.5 block text-xs font-semibold text-[#64748b]">Specific router (optional)</span>
                      <select value={routerChoice} onChange={(e) => setRouterChoice(e.target.value)} className="h-10 rounded-lg border border-[#e2e8f0] bg-white px-3 text-sm outline-none focus:border-[#2563eb]">
                        <option value="">Whole business</option>
                        {routers.filter((r) => r.siteId === siteChoice).map((r) => (
                          <option key={r.ip} value={r.ip}>{r.name}</option>
                        ))}
                      </select>
                    </label>
                    <button type="button" onClick={confirmAssign} className="h-10 rounded-lg bg-[#2563eb] px-4 text-xs font-bold text-white hover:bg-[#1d4ed8]">
                      Confirm
                    </button>
                    <button type="button" onClick={() => setAssigningId(null)} className="h-10 rounded-lg border border-[#e2e8f0] bg-white px-4 text-xs font-bold text-[#475569] hover:bg-[#ffffff]">
                      Cancel
                    </button>
                  </div>
                )}
              </article>
            );
          })}
        </div>
      )}

      <div className="mt-6">
        <Link href="/dashboards/installers/clients" className="inline-flex items-center gap-1.5 text-sm font-semibold text-[#2563eb] hover:underline">
          View Installer Clients (dispatched sites) <ArrowRight size={14} />
        </Link>
      </div>
    </section>
  );
}
