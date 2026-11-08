"use client";

import { useState } from "react";
import { Headphones, Send, CheckCircle2, RotateCcw } from "lucide-react";

import { useDashboard } from "@/components/dashboard/context/DashboardContext";
import { BackLink } from "@/components/dashboard/shared/BackLink";
import { useTickets, type TicketStatus } from "@/components/agent-portal/inbox";

const STATUS_STYLE: Record<TicketStatus, string> = {
  Open: "bg-amber-100 text-amber-700",
  "In Progress": "bg-blue-100 text-blue-700",
  Escalated: "bg-blue-100 text-blue-700",
  Closed: "bg-slate-200 text-slate-600",
};

function when(ms: number) {
  return new Date(ms).toLocaleString("en-GB", { day: "2-digit", month: "short", hour: "2-digit", minute: "2-digit" });
}

export default function AgentTicketsAdminPage() {
  const { agents } = useDashboard();
  const { tickets, reply, setStatus } = useTickets();
  const [filter, setFilter] = useState<"Escalated" | "All" | TicketStatus>("Escalated");
  const [openId, setOpenId] = useState<string | null>(null);
  const [draft, setDraft] = useState("");

  const nameOf = (id: string) => agents.find((a) => a.id === id)?.name ?? "Unknown agent";
  const visible = tickets.filter((t) => filter === "All" || t.status === filter);
  const open = tickets.find((t) => t.id === openId) ?? null;

  return (
    <section className="w-full">
      <BackLink fallbackHref="/dashboards/agents" />
      <h2 className="mb-1 flex items-center gap-2 text-3xl font-bold tracking-tight md:text-4xl">
        <Headphones size={30} className="text-blue-500" /> Agent Support Tickets
      </h2>
      <p className="mb-5 max-w-2xl text-sm text-[#737373] md:text-base">
        Customer problems your agents logged. Tickets an agent couldn&apos;t solve arrive here as Escalated.
      </p>

      <div className="mb-4 flex flex-wrap gap-2">
        {(["Escalated", "Open", "In Progress", "Closed", "All"] as const).map((s) => (
          <button key={s} type="button" data-testid={`admin-ticket-filter-${s}`} onClick={() => setFilter(s)} className={`rounded-lg border px-3 py-2 text-xs font-semibold ${filter === s ? "border-[#1a1a1a] bg-[#f4f4f4] text-[#1a1a1a]" : "border-[#e6e6e6] bg-white text-[#525252] hover:bg-[#ffffff]"}`}>
            {s}{s !== "All" && ` (${tickets.filter((t) => t.status === s).length})`}
          </button>
        ))}
      </div>

      <div className="grid gap-4 lg:grid-cols-[1fr_1.2fr]">
        <div className="space-y-2">
          {visible.map((t) => (
            <button key={t.id} type="button" data-testid="admin-ticket-row" onClick={() => setOpenId(t.id)} className={`w-full rounded-xl border bg-white p-4 text-left hover:bg-[#ffffff] ${openId === t.id ? "border-[#1a1a1a]" : "border-[#e6e6e6]"}`}>
              <div className="flex items-center justify-between gap-2">
                <p className="truncate text-sm font-bold text-[#1a1a1a]">{t.subject}</p>
                <span className={`shrink-0 rounded-full px-2 py-0.5 text-[10px] font-bold ${STATUS_STYLE[t.status]}`}>{t.status}</span>
              </div>
              <p className="mt-1 text-xs text-[#737373]">{nameOf(t.agentId)} · {t.customerPhone} · {when(t.updatedAtMs)}</p>
            </button>
          ))}
          {visible.length === 0 && <div data-testid="admin-tickets-empty" className="rounded-2xl border border-dashed border-[#e6e6e6] bg-white p-8 text-center text-sm text-[#a3a3a3]">Nothing here.</div>}
        </div>

        <article className="rounded-2xl border border-[#e6e6e6] bg-white p-5">
          {!open ? (
            <p className="py-10 text-center text-sm text-[#a3a3a3]">Select a ticket to read it.</p>
          ) : (
            <div data-testid="admin-ticket-detail">
              <h3 className="text-base font-black text-[#1a1a1a]">{open.subject}</h3>
              <p className="mb-3 text-xs text-[#737373]">{nameOf(open.agentId)} · {open.customerPhone} · {open.category}</p>
              <div className="mb-4 max-h-72 space-y-2 overflow-y-auto">
                {open.messages.map((m) => (
                  <div key={m.id} className={`rounded-xl px-3 py-2 text-sm ${m.from === "customer" ? "bg-[#ffffff]" : m.from === "admin" ? "bg-blue-50" : "bg-blue-50"}`}>
                    <p className="text-[10px] font-bold uppercase text-[#a3a3a3]">{m.from === "agent" ? nameOf(open.agentId) : m.from} · {when(m.atMs)}</p>
                    {m.text}
                  </div>
                ))}
              </div>
              {open.status !== "Closed" && (
                <div className="flex gap-2">
                  <input data-testid="admin-ticket-reply" value={draft} onChange={(e) => setDraft(e.target.value)} placeholder="Reply to the agent..." className="h-10 w-full rounded-lg border border-[#e6e6e6] px-3 text-sm outline-none focus:border-[#1a1a1a]" />
                  <button type="button" data-testid="admin-ticket-send" onClick={() => { if (draft.trim()) { reply(open.id, "admin", draft.trim()); setDraft(""); } }} className="inline-flex items-center gap-1.5 rounded-lg bg-blue-500 px-3 text-xs font-bold text-white"><Send size={13} /> Send</button>
                </div>
              )}
              <div className="mt-3 flex gap-2">
                {open.status !== "Closed" ? (
                  <button type="button" data-testid="admin-ticket-close" onClick={() => setStatus(open.id, "Closed")} className="inline-flex items-center gap-1.5 rounded-lg border border-emerald-200 px-3 py-2 text-xs font-semibold text-emerald-700"><CheckCircle2 size={13} /> Close ticket</button>
                ) : (
                  <button type="button" onClick={() => setStatus(open.id, "Open")} className="inline-flex items-center gap-1.5 rounded-lg border border-[#e6e6e6] px-3 py-2 text-xs font-semibold text-[#525252]"><RotateCcw size={13} /> Reopen</button>
                )}
              </div>
            </div>
          )}
        </article>
      </div>
    </section>
  );
}
