"use client";

import { useState } from "react";
import { UserCog, Send, History } from "lucide-react";

import { useDashboard } from "../context/DashboardContext";
import type { AgentMessageTrigger } from "../shared/types";

const TRIGGERS: Array<{ key: AgentMessageTrigger; label: string; description: string }> = [
  {
    key: "Applied",
    label: "When an agent applies",
    description: "Sent immediately after someone applies to become an agent.",
  },
  {
    key: "Approved",
    label: "When an agent is approved",
    description: "Sent the moment an application or reactivation is approved.",
  },
  {
    key: "Suspended",
    label: "When an agent is suspended",
    description: "Sent immediately when an agent's account is suspended.",
  },
];

export function AgentMessageTemplatesCard() {
  const { messageTemplates, updateMessageTemplate, agentMessageLog } = useDashboard();
  const [drafts, setDrafts] = useState(messageTemplates);

  function handleSave(trigger: AgentMessageTrigger) {
    updateMessageTemplate(trigger, drafts[trigger]);
  }

  return (
    <div className="mt-6 grid gap-5 lg:grid-cols-[1.3fr_1fr]">
      <article className="rounded-2xl border border-[#e2e8f0] bg-white p-6 shadow-[0_8px_24px_rgba(37,99,235,0.06)]">
        <div className="mb-4 flex items-center gap-3">
          <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-[#f1f5f9] text-[#2563eb]">
            <UserCog size={20} />
          </div>
          <div>
            <h3 className="text-base font-bold">Agent Message Templates</h3>
            <p className="text-xs text-[#64748b]">
              These are sent automatically to agents — customize the wording,
              use <code className="rounded bg-[#ffffff] px-1">{"{name}"}</code> for their first name.
            </p>
          </div>
        </div>

        <div className="space-y-5">
          {TRIGGERS.map((trigger) => (
            <div key={trigger.key} className="rounded-xl border border-[#f1f5f9] p-4">
              <p className="text-sm font-bold text-[#0f172a]">{trigger.label}</p>
              <p className="mb-2 text-xs text-[#94a3b8]">{trigger.description}</p>
              <textarea
                value={drafts[trigger.key]}
                onChange={(event) =>
                  setDrafts((current) => ({ ...current, [trigger.key]: event.target.value }))
                }
                rows={2}
                className="w-full rounded-lg border border-[#e2e8f0] bg-white px-3 py-2 text-sm outline-none focus:border-[#2563eb]"
              />
              <button
                type="button"
                onClick={() => handleSave(trigger.key)}
                className="mt-2 inline-flex items-center gap-1.5 rounded-lg bg-[#2563eb] px-3 py-2 text-xs font-bold text-white hover:bg-[#1d4ed8]"
              >
                <Send size={12} />
                Save Template
              </button>
            </div>
          ))}
        </div>
      </article>

      <article className="rounded-2xl border border-[#e2e8f0] bg-white p-6 shadow-[0_8px_24px_rgba(37,99,235,0.06)]">
        <div className="mb-4 flex items-center gap-2">
          <History size={16} className="text-[#64748b]" />
          <h3 className="text-base font-bold">Recent Agent Messages</h3>
        </div>
        {agentMessageLog.length === 0 ? (
          <p className="text-sm text-[#94a3b8]">
            Nothing sent yet — this fills in automatically as agents apply,
            get approved, or get suspended.
          </p>
        ) : (
          <div className="space-y-2">
            {agentMessageLog.slice(0, 8).map((entry) => (
              <div key={entry.id} className="rounded-lg border border-[#f1f5f9] px-3 py-2.5">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-[#0f172a]">
                    {entry.agentName}
                  </span>
                  <span className="rounded-full bg-[#ffffff] px-2 py-0.5 text-[10px] font-semibold text-[#64748b]">
                    {entry.channel} · {entry.trigger}
                  </span>
                </div>
                <p className="mt-1 text-xs text-[#64748b]">{entry.message}</p>
                <p className="mt-1 text-[10px] text-[#94a3b8]">{entry.sentAt}</p>
              </div>
            ))}
          </div>
        )}
      </article>
    </div>
  );
}
