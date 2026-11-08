"use client";

import { useState, type FormEvent } from "react";
import Link from "next/link";
import { UserCog, Send, CheckCircle2, LifeBuoy, Eye } from "lucide-react";

import { useDashboard } from "@/components/dashboard/context/DashboardContext";
import { BackLink } from "@/components/dashboard/shared/BackLink";

export default function InstallerClientsPage() {
  const { installDispatches, installers, businessLocations, agents, dispatchToClient } = useDashboard();

  const [dispatchingId, setDispatchingId] = useState<string | null>(null);
  const [clientName, setClientName] = useState("");
  const [clientEmail, setClientEmail] = useState("");
  const [clientPhone, setClientPhone] = useState("");

  function startDispatch(dispatchId: string) {
    setDispatchingId(dispatchId);
    setClientName("");
    setClientEmail("");
    setClientPhone("");
  }

  function confirmDispatch(event: FormEvent) {
    event.preventDefault();
    if (!dispatchingId || !clientName.trim() || !clientEmail.trim()) return;
    dispatchToClient(dispatchingId, clientName.trim(), clientEmail.trim(), clientPhone.trim());
    setDispatchingId(null);
  }

  const inProgress = installDispatches.filter((d) => d.status === "In Progress");
  const dispatched = installDispatches.filter((d) => d.status === "Dispatched");

  return (
    <section className="w-full">
      <BackLink />
      <div className="mb-6 flex flex-wrap items-start justify-between gap-4">
        <div>
          <h2 className="mb-1 text-3xl font-bold tracking-tight md:text-4xl">
            Installer Clients
          </h2>
          <p className="max-w-2xl text-sm text-[#737373] md:text-base">
            Once an installer finishes setting up a site, dispatch it here.
            The client gets their own agent dashboard — no admin configuration
            access — and the installer keeps a way to reconnect for support.
          </p>
        </div>
        <Link
          href="/agent-portal/preview"
          className="inline-flex shrink-0 items-center gap-2 rounded-xl border-2 border-amber-400 bg-amber-50 px-4 py-2.5 text-sm font-bold text-amber-700 hover:bg-amber-100"
        >
          <Eye size={16} />
          Preview Client Dashboard
        </Link>
      </div>

      <h3 className="mb-3 text-sm font-bold uppercase tracking-wide text-[#737373]">
        Ready to Dispatch ({inProgress.length})
      </h3>
      {inProgress.length === 0 ? (
        <div className="mb-8 rounded-2xl border border-[#e6e6e6] bg-white p-6 text-center text-sm text-[#a3a3a3]">
          No installations waiting to be dispatched. Assign an installer to a
          site from{" "}
          <Link href="/dashboards/installers" className="font-semibold text-[#1a1a1a] hover:underline">
            All Installers
          </Link>{" "}
          first.
        </div>
      ) : (
        <div className="mb-8 space-y-3">
          {inProgress.map((dispatch) => {
            const installer = installers.find((i) => i.id === dispatch.installerId);
            const site = businessLocations.find((s) => s.id === dispatch.siteId);

            return (
              <article key={dispatch.id} className="rounded-2xl border border-[#e6e6e6] bg-white p-5 shadow-[0_8px_24px_rgba(26,26,26,0.06)]">
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <div className="flex items-center gap-3">
                    <div className="flex h-11 w-11 items-center justify-center rounded-full bg-amber-100 text-amber-600">
                      <UserCog size={18} />
                    </div>
                    <div>
                      <p className="font-bold text-[#1a1a1a]">{site?.name ?? dispatch.siteId}</p>
                      <p className="text-xs text-[#737373]">Installed by {installer?.name ?? "Unknown installer"}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <Link
                      href="/agent-portal/preview"
                      className="inline-flex items-center gap-1.5 rounded-xl border border-amber-300 bg-white px-3 py-2.5 text-xs font-bold text-amber-700 hover:bg-amber-100"
                    >
                      <Eye size={13} />
                      Preview Dashboard
                    </Link>
                    <button
                      type="button"
                      onClick={() => startDispatch(dispatch.id)}
                      className="inline-flex items-center gap-2 rounded-xl bg-emerald-600 px-4 py-2.5 text-sm font-bold text-white hover:bg-emerald-700"
                    >
                      <Send size={14} />
                      Dispatch to Client
                    </button>
                  </div>
                </div>

                {dispatchingId === dispatch.id && (
                  <form onSubmit={confirmDispatch} className="mt-4 grid gap-3 rounded-xl bg-[#ffffff] p-4 sm:grid-cols-3">
                    <input
                      required
                      value={clientName}
                      onChange={(e) => setClientName(e.target.value)}
                      placeholder="Client full name"
                      className="h-11 rounded-xl border border-[#e6e6e6] bg-white px-3 text-sm outline-none focus:border-[#1a1a1a]"
                    />
                    <input
                      required
                      type="email"
                      value={clientEmail}
                      onChange={(e) => setClientEmail(e.target.value)}
                      placeholder="Client email"
                      className="h-11 rounded-xl border border-[#e6e6e6] bg-white px-3 text-sm outline-none focus:border-[#1a1a1a]"
                    />
                    <input
                      value={clientPhone}
                      onChange={(e) => setClientPhone(e.target.value)}
                      placeholder="Client phone"
                      className="h-11 rounded-xl border border-[#e6e6e6] bg-white px-3 text-sm outline-none focus:border-[#1a1a1a]"
                    />
                    <div className="flex gap-2 sm:col-span-3">
                      <button type="submit" className="rounded-xl bg-[#1a1a1a] px-5 py-2.5 text-sm font-bold text-white hover:bg-[#111111]">
                        Confirm Dispatch
                      </button>
                      <button type="button" onClick={() => setDispatchingId(null)} className="rounded-xl border border-[#e6e6e6] bg-white px-5 py-2.5 text-sm font-bold text-[#525252] hover:bg-[#ffffff]">
                        Cancel
                      </button>
                    </div>
                    <p className="text-xs text-[#a3a3a3] sm:col-span-3">
                      This creates the client&apos;s own agent dashboard login. They&apos;ll
                      only ever see their agent dashboard — never admin
                      configuration.
                    </p>
                  </form>
                )}
              </article>
            );
          })}
        </div>
      )}

      <h3 className="mb-3 text-sm font-bold uppercase tracking-wide text-[#737373]">
        Dispatched ({dispatched.length})
      </h3>
      {dispatched.length === 0 ? (
        <div className="rounded-2xl border border-[#e6e6e6] bg-white p-6 text-center text-sm text-[#a3a3a3]">
          Nothing dispatched yet.
        </div>
      ) : (
        <div className="space-y-3">
          {dispatched.map((dispatch) => {
            const installer = installers.find((i) => i.id === dispatch.installerId);
            const site = businessLocations.find((s) => s.id === dispatch.siteId);
            const clientAgent = agents.find((a) => a.id === dispatch.clientAgentId);

            return (
              <article key={dispatch.id} className="rounded-2xl border border-emerald-200 bg-white p-5 shadow-[0_8px_24px_rgba(26,26,26,0.06)]">
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <div className="flex items-center gap-3">
                    <div className="flex h-11 w-11 items-center justify-center rounded-full bg-emerald-100 text-emerald-600">
                      <CheckCircle2 size={18} />
                    </div>
                    <div>
                      <p className="font-bold text-[#1a1a1a]">{site?.name ?? dispatch.siteId}</p>
                      <p className="text-xs text-[#737373]">
                        Client: {clientAgent?.name ?? "Unknown"} · Installed by {installer?.name ?? "Unknown installer"}
                      </p>
                      <p className="text-xs text-[#a3a3a3]">Dispatched {dispatch.dispatchedAt}</p>
                      <span
                        className={`mt-1 inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-bold ${
                          clientAgent?.allowAdminAccess
                            ? "bg-emerald-100 text-emerald-700"
                            : "bg-slate-200 text-slate-600"
                        }`}
                      >
                        {clientAgent?.allowAdminAccess ? "Standing access: active" : "Standing access: revoked by client"}
                      </span>
                    </div>
                  </div>

                  {clientAgent && (
                    <Link
                      href={clientAgent.allowAdminAccess ? `/agent-portal/${clientAgent.id}` : "#"}
                      target={clientAgent.allowAdminAccess ? "_blank" : undefined}
                      rel="noopener noreferrer"
                      onClick={(event) => {
                        if (!clientAgent.allowAdminAccess) event.preventDefault();
                      }}
                      aria-disabled={!clientAgent.allowAdminAccess}
                      className={`inline-flex items-center gap-2 rounded-xl border px-4 py-2.5 text-sm font-bold ${
                        clientAgent.allowAdminAccess
                          ? "border-[#e6e6e6] bg-white text-[#1a1a1a] hover:bg-[#ffffff]"
                          : "cursor-not-allowed border-[#f4f4f4] bg-[#ffffff] text-[#d4d4d4]"
                      }`}
                    >
                      <LifeBuoy size={14} />
                      {clientAgent.allowAdminAccess ? "Reconnect to Help Client" : "Access Revoked by Client"}
                    </Link>
                  )}
                </div>
              </article>
            );
          })}
        </div>
      )}
    </section>
  );
}
