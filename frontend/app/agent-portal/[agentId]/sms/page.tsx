"use client";

import { use, useState } from "react";
import { MessageSquare, Send, Pencil, Info } from "lucide-react";

import { useDashboard } from "@/components/dashboard/context/DashboardContext";
import { AgentPortalPage } from "@/components/agent-portal/AgentPortalPage";
import { getScopedUsers } from "@/components/agent-portal/realData";
import { SMS_MAX, useSmsLog, validatePhone, type SmsTemplate } from "@/components/agent-portal/inbox";
import { agentStock } from "@/components/dashboard/agents/agentLedger";
import type { AgentProfile } from "@/components/dashboard/shared/types";

function when(ms: number) {
  return new Date(ms).toLocaleString("en-GB", { day: "2-digit", month: "short", hour: "2-digit", minute: "2-digit" });
}

function SmsBody({ agent }: { agent: AgentProfile }) {
  const { routers, users, vouchers, voucherBatches, showToast } = useDashboard();
  const { log, record, templatesFor, saveTemplates } = useSmsLog();
  const [to, setTo] = useState("");
  const [text, setText] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [editing, setEditing] = useState<SmsTemplate | null>(null);

  const canSend = agent.permissions["sms.send"] === "Allowed";
  const canEditTemplates = agent.permissions["sms.editTemplates"] === "Allowed";
  const templates = templatesFor(agent.id);

  // History: messages typed here, plus voucher codes this agent's customers
  // were sent by SMS (from real voucher records).
  const manual = log.filter((r) => r.agentId === agent.id);
  const viaVouchers = agentStock(agent.id, vouchers, voucherBatches).held
    .filter((v) => v.delivery === "SMS" && v.redeemerPhone)
    .map((v) => ({ id: `v-${v.code}`, to: v.redeemerPhone as string, text: `Voucher code ${v.code} sent.`, atMs: v.usedAtMs ?? v.generatedAtMs, kind: "voucher" as const }));
  const history = [...manual.map((r) => ({ id: r.id, to: r.to, text: r.text, atMs: r.atMs, kind: r.kind })), ...viaVouchers].sort((a, b) => b.atMs - a.atMs);

  function send() {
    const phoneError = validatePhone(to);
    if (phoneError) return setError(phoneError);
    if (!text.trim()) return setError("Type a message first.");
    if (text.length > SMS_MAX) return setError(`Keep it to ${SMS_MAX} characters.`);
    record(agent.id, to.trim(), text.trim());
    showToast(`SMS recorded for ${to.trim()}.`);
    setTo("");
    setText("");
    setError(null);
  }

  return (
    <section>
      <div className="mb-5">
        <h1 className="flex items-center gap-2 text-2xl font-black md:text-3xl">
          <MessageSquare size={26} className="text-[#1a1a1a]" />
          SMS
        </h1>
        <p className="mt-1 text-sm text-[#737373]">Messages to your customers and a record of what was sent.</p>
      </div>

      <p className="mb-4 flex items-start gap-2 rounded-xl bg-white px-4 py-2.5 text-xs text-[#1a1a1a]">
        <Info size={14} className="mt-0.5 shrink-0" />
        No SMS gateway is connected yet, so messages are recorded here but not delivered to the phone.
      </p>

      <div className="grid gap-4 lg:grid-cols-2">
        {canSend && (
          <article className="rounded-2xl bg-white p-5">
            <h2 className="mb-3 text-sm font-bold text-[#1a1a1a]">Send an SMS</h2>
            <input data-testid="sms-to" list="sms-customers" value={to} onChange={(e) => setTo(e.target.value)} placeholder="Customer phone number" className="mb-2 h-10 w-full rounded-lg border border-[#d4d4d4] px-3 text-sm outline-none focus:border-[#1a1a1a]" />
            <datalist id="sms-customers">
              {getScopedUsers(users, routers, agent.routerIp).slice(0, 30).map((u) => <option key={u.phone} value={u.phone} />)}
            </datalist>
            <div className="mb-2 flex flex-wrap gap-1.5">
              {templates.map((t) => (
                <button key={t.id} type="button" data-testid="sms-template" onClick={() => setText(t.text)} className="rounded-full px-2.5 py-1 text-[11px] font-semibold text-[#525252] hover:bg-[#f7f7f7]">
                  {t.name}
                </button>
              ))}
            </div>
            <textarea data-testid="sms-text" value={text} onChange={(e) => setText(e.target.value)} rows={4} placeholder="Type your message..." className="w-full rounded-lg border border-[#d4d4d4] px-3 py-2 text-sm outline-none focus:border-[#1a1a1a]" />
            <div className="mt-1 flex items-center justify-between text-xs">
              <span data-testid="sms-count" className={text.length > SMS_MAX ? "font-semibold text-red-600" : "text-[#a3a3a3]"}>{text.length}/{SMS_MAX}</span>
              {error && <span data-testid="sms-error" className="font-semibold text-red-600">{error}</span>}
            </div>
            <button type="button" data-testid="sms-send" onClick={send} className="mt-3 inline-flex items-center gap-2 rounded-xl bg-[#1a1a1a] px-4 py-2.5 text-sm font-bold text-white hover:bg-[#111111]"><Send size={14} /> Send</button>
          </article>
        )}

        <article className="rounded-2xl bg-white p-5">
          <h2 className="mb-3 text-sm font-bold text-[#1a1a1a]">History</h2>
          <div data-testid="sms-history" className="max-h-80 space-y-2 overflow-y-auto">
            {history.map((r) => (
              <div key={r.id} className="rounded-lg bg-[#f7f7f7] px-3 py-2 text-sm">
                <p className="flex justify-between text-xs text-[#737373]"><span className="font-semibold text-[#1a1a1a]">{r.to}</span><span>{when(r.atMs)}</span></p>
                <p className="text-[#525252]">{r.text}</p>
                <p className="text-[10px] font-semibold uppercase text-[#a3a3a3]">{r.kind === "voucher" ? "Voucher delivery" : "Recorded"}</p>
              </div>
            ))}
            {history.length === 0 && <p className="py-6 text-center text-sm text-[#a3a3a3]">No messages yet.</p>}
          </div>
        </article>

        {canEditTemplates && (
          <article className="rounded-2xl bg-white p-5 lg:col-span-2">
            <h2 className="mb-3 text-sm font-bold text-[#1a1a1a]">Your templates</h2>
            <div className="grid gap-2 sm:grid-cols-3">
              {templates.map((t) => (
                <div key={t.id} className="rounded-xl border-[#f4f4f4] p-3">
                  <p className="flex items-center justify-between text-sm font-bold text-[#1a1a1a]">{t.name}
                    <button type="button" data-testid="edit-template" onClick={() => setEditing(t)} aria-label={`Edit ${t.name}`} className="text-[#a3a3a3] hover:text-[#1a1a1a]"><Pencil size={13} /></button>
                  </p>
                  <p className="mt-1 text-xs text-[#737373]">{t.text}</p>
                </div>
              ))}
            </div>
            {editing && (
              <div data-testid="template-editor" className="mt-3 rounded-xl bg-[#f7f7f7] p-3">
                <textarea data-testid="template-text" value={editing.text} onChange={(e) => setEditing({ ...editing, text: e.target.value })} rows={3} className="w-full rounded-lg border border-[#d4d4d4] bg-white px-3 py-2 text-sm outline-none focus:border-[#1a1a1a]" />
                <div className="mt-2 flex gap-2">
                  <button type="button" data-testid="template-save" disabled={!editing.text.trim() || editing.text.length > SMS_MAX} onClick={() => { saveTemplates(agent.id, templates.map((t) => (t.id === editing.id ? editing : t))); setEditing(null); }} className="rounded-lg bg-[#1a1a1a] px-3 py-1.5 text-xs font-bold text-white disabled:opacity-50">Save</button>
                  <button type="button" onClick={() => setEditing(null)} className="rounded-lg px-3 py-1.5 text-xs font-semibold text-[#525252]">Cancel</button>
                </div>
              </div>
            )}
          </article>
        )}
      </div>
      {!canSend && <p className="mt-3 text-xs text-[#a3a3a3]">You can see your SMS history but not send messages.</p>}
    </section>
  );
}

export default function AgentSmsPage({ params }: { params: Promise<{ agentId: string }> }) {
  const { agentId } = use(params);
  return (
    <AgentPortalPage agentId={agentId} permissionKey="sms.view" featureLabel="SMS" render={(agent) => <SmsBody agent={agent} />} />
  );
}
