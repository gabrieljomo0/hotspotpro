"use client";

// Send a message to your customers (and edit the agent message templates) —
// the body of the "SMS & Email" page under Settings.

import { useState, type FormEvent } from "react";
import { MessageSquare, Send } from "lucide-react";

import { useDashboard } from "../context/DashboardContext";
import { AgentMessageTemplatesCard } from "./AgentMessageTemplatesCard";

const AUDIENCES = [
  "All Active Users",
  "Expiring Soon (24h)",
  "Package Customers Only",
  "Voucher Customers Only",
];

export function AgentMessagesPanel({ hideTitle = false }: { hideTitle?: boolean }) {
  const { users, logActivity, showToast } = useDashboard();
  const [audience, setAudience] = useState(AUDIENCES[0]);
  const [message, setMessage] = useState("");
  const [sent, setSent] = useState<string | null>(null);

  const recipientCount =
    audience === "Package Customers Only"
      ? users.filter((u) => u.accessType === "Package").length
      : audience === "Voucher Customers Only"
        ? users.filter((u) => u.accessType === "Voucher").length
        : users.length;

  function handleSend(event: FormEvent) {
    event.preventDefault();

    if (!message.trim()) {
      return;
    }

    logActivity(
      "User",
      `Sent SMS to ${recipientCount} recipient(s) (${audience}).`,
    );
    showToast(`Message sent to ${recipientCount} recipient(s).`);
    setSent(message);
    setMessage("");
  }

  return (
    <section className="w-full" data-testid="agents-messages-panel">
      {!hideTitle && (
        <>
          <h3 className="mb-1 text-xl font-bold text-[#0f172a]">SMS &amp; Email</h3>
          <p className="mb-6 max-w-2xl text-sm text-[#64748b]">
            Send a message to your customers, filtered by audience.
          </p>
        </>
      )}

      <div className="grid gap-5 lg:grid-cols-[1.4fr_1fr]">
        <form
          onSubmit={handleSend}
          className="rounded-2xl border border-[#e2e8f0] bg-white p-6 shadow-[0_8px_24px_rgba(37,99,235,0.06)]"
        >
          <div className="flex items-center gap-3">
            <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-[#f1f5f9] text-[#2563eb]">
              <MessageSquare size={20} />
            </div>
            <div>
              <h3 className="text-base font-bold">Compose Message</h3>
              <p className="text-xs text-[#64748b]">
                {recipientCount} recipient(s) selected
              </p>
            </div>
          </div>

          <label className="mt-5 block">
            <span className="mb-2 block text-sm font-semibold text-[#475569]">
              Audience
            </span>
            <select
              value={audience}
              onChange={(event) => setAudience(event.target.value)}
              className="h-11 w-full rounded-xl border border-[#e2e8f0] bg-white px-3 text-sm outline-none focus:border-[#2563eb]"
            >
              {AUDIENCES.map((option) => (
                <option key={option} value={option}>
                  {option}
                </option>
              ))}
            </select>
          </label>

          <label className="mt-4 block">
            <span className="mb-2 block text-sm font-semibold text-[#475569]">
              Message
            </span>
            <textarea
              required
              rows={5}
              value={message}
              onChange={(event) => setMessage(event.target.value)}
              placeholder="e.g. Your voucher expires in 24 hours — renew now to stay connected!"
              className="w-full rounded-xl border border-[#e2e8f0] bg-white px-3 py-2.5 text-sm outline-none focus:border-[#2563eb]"
            />
          </label>

          <button
            type="submit"
            className="mt-5 inline-flex items-center gap-2 rounded-xl bg-[#2563eb] px-5 py-3 text-sm font-bold text-white hover:bg-[#1d4ed8]"
          >
            <Send size={16} />
            Send to {recipientCount} recipient(s)
          </button>
        </form>

        <div className="rounded-2xl border border-[#e2e8f0] bg-white p-6 shadow-[0_8px_24px_rgba(37,99,235,0.06)]">
          <h3 className="text-sm font-bold text-[#0f172a]">Last sent</h3>
          {sent ? (
            <div className="mt-3 rounded-xl bg-emerald-50 p-4 text-sm text-emerald-800">
              {sent}
            </div>
          ) : (
            <p className="mt-3 text-sm text-[#94a3b8]">
              Nothing sent yet this session.
            </p>
          )}
        </div>
      </div>

      <AgentMessageTemplatesCard />
    </section>
  );
}
