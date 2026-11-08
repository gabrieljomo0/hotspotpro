"use client";

import { use, useState } from "react";
import { Headphones, Plus, Send, CheckCircle2, ArrowUpRight, Sparkles, X } from "lucide-react";

import { useDashboard } from "@/components/dashboard/context/DashboardContext";
import { AgentPortalPage } from "@/components/agent-portal/AgentPortalPage";
import { getScopedUsers } from "@/components/agent-portal/realData";
import {
  TICKET_CATEGORIES,
  useTickets,
  validatePhone,
  type SupportTicket,
  type TicketCategory,
  type TicketStatus,
} from "@/components/agent-portal/inbox";
import type { AgentProfile } from "@/components/dashboard/shared/types";

const STATUS_STYLE: Record<TicketStatus, string> = {
  Open: "bg-[#f4f4f4] text-[#1a1a1a]",
  "In Progress": "bg-[#f4f4f4] text-[#1a1a1a]",
  Escalated: "bg-[#f4f4f4] text-[#1a1a1a]",
  Closed: "bg-slate-200 text-slate-600",
};

function when(ms: number) {
  return new Date(ms).toLocaleString("en-GB", { day: "2-digit", month: "short", hour: "2-digit", minute: "2-digit" });
}

function SupportBody({ agent }: { agent: AgentProfile }) {
  const { routers, users } = useDashboard();
  const { tickets, addTicket, reply, setStatus, addSamples, clearSamples } = useTickets();
  const [filter, setFilter] = useState<"All" | TicketStatus>("All");
  const [openId, setOpenId] = useState<string | null>(null);
  const [draft, setDraft] = useState("");
  const [creating, setCreating] = useState(false);
  const [form, setForm] = useState({ phone: "", subject: "", category: "Connection" as TicketCategory, message: "" });
  const [error, setError] = useState<string | null>(null);

  const canRespond = agent.permissions["supportTickets.respond"] === "Allowed";
  const canClose = agent.permissions["supportTickets.close"] === "Allowed";
  const canEscalate = agent.permissions["supportTickets.escalate"] === "Allowed";

  const mine = tickets.filter((t) => t.agentId === agent.id);
  const visible = mine.filter((t) => filter === "All" || t.status === filter);
  const open = mine.find((t) => t.id === openId) ?? null;
  const hasSamples = mine.some((t) => t.sample);
  const counts = (s: TicketStatus) => mine.filter((t) => t.status === s).length;

  function submitNew() {
    const phoneError = validatePhone(form.phone);
    if (phoneError) return setError(phoneError);
    if (!form.subject.trim()) return setError("Add a short subject.");
    if (!form.message.trim()) return setError("Describe the problem.");
    const ticket = addTicket({
      agentId: agent.id,
      customerPhone: form.phone.trim(),
      subject: form.subject.trim(),
      category: form.category,
      message: form.message.trim(),
    });
    setForm({ phone: "", subject: "", category: "Connection", message: "" });
    setError(null);
    setCreating(false);
    setOpenId(ticket.id);
  }

  function sendReply(ticket: SupportTicket) {
    if (!draft.trim()) return;
    reply(ticket.id, "agent", draft.trim());
    setDraft("");
  }

  return (
    <section>
      <div className="mb-5 flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="flex items-center gap-2 text-2xl font-black md:text-3xl">
            <Headphones size={26} className="text-[#1a1a1a]" />
            Support Tickets
          </h1>
          <p className="mt-1 text-sm text-[#737373]">Problems your customers have reported, and how they were handled.</p>
        </div>
        {canRespond && (
          <button
            type="button"
            data-testid="new-ticket-btn"
            onClick={() => setCreating(true)}
            className="inline-flex items-center gap-2 rounded-xl bg-[#1a1a1a] px-4 py-2.5 text-sm font-bold text-white hover:bg-[#111111]"
          >
            <Plus size={16} />
            Log a Ticket
          </button>
        )}
      </div>

      <div className="mb-4 flex flex-wrap gap-2">
        {(["All", "Open", "In Progress", "Escalated", "Closed"] as const).map((s) => (
          <button
            key={s}
            type="button"
            data-testid={`ticket-filter-${s}`}
            onClick={() => setFilter(s)}
            className={`rounded-lg px-3 py-2 text-xs font-semibold ${ filter === s ? "border-[#1a1a1a] bg-[#f4f4f4] text-[#1a1a1a]" : "border-[#e6e6e6] bg-white text-[#525252] hover:bg-[#f7f7f7]" }`}
          >
            {s}
            {s !== "All" && ` (${counts(s)})`}
          </button>
        ))}
      </div>

      {creating && (
        <article data-testid="new-ticket-form" className="mb-5 rounded-2xl bg-white p-5">
          <div className="mb-3 flex items-center justify-between">
            <h2 className="text-sm font-bold text-[#1a1a1a]">Log a customer&apos;s problem</h2>
            <button type="button" onClick={() => setCreating(false)} aria-label="Close" className="text-[#a3a3a3]"><X size={16} /></button>
          </div>
          <div className="grid gap-3 sm:grid-cols-2">
            <input data-testid="ticket-phone" value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} placeholder="Customer phone" className="h-10 rounded-lg border border-[#d4d4d4] px-3 text-sm outline-none focus:border-[#1a1a1a]" list="customer-phones" />
            <datalist id="customer-phones">
              {getScopedUsers(users, routers, agent.routerIp).slice(0, 30).map((u) => <option key={u.phone} value={u.phone} />)}
            </datalist>
            <select data-testid="ticket-category" value={form.category} onChange={(e) => setForm({ ...form, category: e.target.value as TicketCategory })} className="h-10 rounded-lg border border-[#d4d4d4] bg-white px-3 text-sm outline-none focus:border-[#1a1a1a]">
              {TICKET_CATEGORIES.map((c) => <option key={c}>{c}</option>)}
            </select>
            <input data-testid="ticket-subject" value={form.subject} onChange={(e) => setForm({ ...form, subject: e.target.value })} placeholder="Subject" className="h-10 rounded-lg border border-[#d4d4d4] px-3 text-sm outline-none focus:border-[#1a1a1a] sm:col-span-2" />
            <textarea data-testid="ticket-message" value={form.message} onChange={(e) => setForm({ ...form, message: e.target.value })} placeholder="What is the customer experiencing?" rows={3} className="rounded-lg border border-[#d4d4d4] px-3 py-2 text-sm outline-none focus:border-[#1a1a1a] sm:col-span-2" />
          </div>
          {error && <p data-testid="ticket-error" className="mt-2 text-sm font-semibold text-red-600">{error}</p>}
          <div className="mt-3 flex justify-end gap-2">
            <button type="button" onClick={() => setCreating(false)} className="rounded-lg px-3 py-2 text-xs font-semibold text-[#525252]">Cancel</button>
            <button type="button" data-testid="ticket-submit" onClick={submitNew} className="rounded-lg bg-[#1a1a1a] px-4 py-2 text-xs font-bold text-white hover:bg-[#111111]">Create ticket</button>
          </div>
        </article>
      )}

      <div className="grid gap-4 lg:grid-cols-[1fr_1.2fr]">
        <div className="space-y-2">
          {visible.map((t) => (
            <button
              key={t.id}
              type="button"
              data-testid="ticket-row"
              onClick={() => setOpenId(t.id)}
              className={`w-full rounded-xl bg-white p-4 text-left hover:bg-[#f7f7f7] ${openId === t.id ? "border-[#1a1a1a]" : "border-[#e6e6e6]"}`}
            >
              <div className="flex items-center justify-between gap-2">
                <p className="truncate text-sm font-bold text-[#1a1a1a]">{t.subject}</p>
                <span className={`shrink-0 rounded-full px-2 py-0.5 text-[10px] font-bold ${STATUS_STYLE[t.status]}`}>{t.status}</span>
              </div>
              <p className="mt-1 text-xs text-[#737373]">
                {t.customerPhone} · {t.category} · {when(t.updatedAtMs)}
                {t.sample && <span className="ml-1 rounded bg-slate-100 px-1 text-[10px] font-semibold text-slate-500">Sample</span>}
              </p>
            </button>
          ))}
          {visible.length === 0 && (
            <div data-testid="tickets-empty" className="rounded-2xl bg-white p-8 text-center text-sm text-[#a3a3a3]">
              {mine.length === 0 ? "No tickets yet." : "No tickets in this view."}
              {mine.length === 0 && (
                <div className="mt-3">
                  <button type="button" data-testid="load-samples" onClick={() => addSamples(agent.id, getScopedUsers(users, routers, agent.routerIp).map((u) => u.phone))} className="inline-flex items-center gap-1.5 rounded-lg px-3 py-2 text-xs font-semibold text-[#525252] hover:bg-[#f7f7f7]">
                    <Sparkles size={13} /> Show me example tickets
                  </button>
                </div>
              )}
            </div>
          )}
          {hasSamples && (
            <button type="button" data-testid="clear-samples" onClick={() => clearSamples(agent.id)} className="text-xs font-semibold text-[#737373] hover:text-red-600">
              Remove example tickets
            </button>
          )}
        </div>

        <article className="rounded-2xl bg-white p-5">
          {!open ? (
            <p className="py-10 text-center text-sm text-[#a3a3a3]">Select a ticket to read it.</p>
          ) : (
            <div data-testid="ticket-detail">
              <div className="mb-3 flex flex-wrap items-start justify-between gap-2">
                <div>
                  <h2 className="text-base font-black text-[#1a1a1a]">{open.subject}</h2>
                  <p className="text-xs text-[#737373]">{open.customerPhone} · {open.category} · opened {when(open.createdAtMs)}</p>
                </div>
                <span className={`rounded-full px-2.5 py-1 text-xs font-bold ${STATUS_STYLE[open.status]}`}>{open.status}</span>
              </div>
              <div className="mb-4 max-h-72 space-y-2 overflow-y-auto">
                {open.messages.map((m) => (
                  <div key={m.id} className={`rounded-xl px-3 py-2 text-sm ${m.from === "customer" ? "bg-[#f7f7f7] text-[#1a1a1a]" : m.from === "admin" ? "bg-[#f4f4f4] text-[#1a1a1a]" : "bg-[#f4f4f4] text-[#1a1a1a]"}`}>
                    <p className="text-[10px] font-bold uppercase text-[#a3a3a3]">{m.from === "customer" ? "Customer" : m.from === "admin" ? "Admin" : "You"} · {when(m.atMs)}</p>
                    {m.text}
                  </div>
                ))}
              </div>

              {open.status === "Escalated" && <p className="mb-3 text-xs font-semibold text-[#1a1a1a]">With admin now. You&apos;ll see their reply here.</p>}
              {open.status !== "Closed" && canRespond && (
                <div className="flex gap-2">
                  <input data-testid="ticket-reply" value={draft} onChange={(e) => setDraft(e.target.value)} onKeyDown={(e) => e.key === "Enter" && sendReply(open)} placeholder="Write a reply or note..." className="h-10 w-full rounded-lg border border-[#d4d4d4] px-3 text-sm outline-none focus:border-[#1a1a1a]" />
                  <button type="button" data-testid="ticket-send" onClick={() => sendReply(open)} className="inline-flex items-center gap-1.5 rounded-lg bg-[#1a1a1a] px-3 text-xs font-bold text-white hover:bg-[#111111]"><Send size={13} /> Send</button>
                </div>
              )}
              <div className="mt-3 flex flex-wrap gap-2">
                {open.status !== "Closed" && open.status !== "Escalated" && canEscalate && (
                  <button type="button" data-testid="ticket-escalate" onClick={() => setStatus(open.id, "Escalated")} className="inline-flex items-center gap-1.5 rounded-lg px-3 py-2 text-xs font-semibold text-[#1a1a1a] hover:bg-[#f4f4f4]"><ArrowUpRight size={13} /> Escalate to admin</button>
                )}
                {open.status !== "Closed" && open.status !== "Escalated" && canClose && (
                  <button type="button" data-testid="ticket-close" onClick={() => setStatus(open.id, "Closed")} className="inline-flex items-center gap-1.5 rounded-lg px-3 py-2 text-xs font-semibold text-[#1a1a1a] hover:bg-[#f4f4f4]"><CheckCircle2 size={13} /> Close ticket</button>
                )}
              </div>
              {!canRespond && <p className="mt-3 text-xs text-[#a3a3a3]">You can read tickets but not reply to them.</p>}
            </div>
          )}
        </article>
      </div>
    </section>
  );
}

export default function AgentSupportPage({ params }: { params: Promise<{ agentId: string }> }) {
  const { agentId } = use(params);
  return (
    <AgentPortalPage
      agentId={agentId}
      permissionKey="supportTickets.view"
      featureLabel="Support Tickets"
      render={(agent) => <SupportBody agent={agent} />}
    />
  );
}
