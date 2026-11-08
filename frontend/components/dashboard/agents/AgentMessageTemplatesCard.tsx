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
      <article className="rounded-2xl border border-[#e6e6e6] bg-white p-6 shadow-[0_8px_24px_rgba(26,26,26,0.06)]">
        <div className="mb-4 flex items-center gap-3">
          <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-[#f4f4f4] text-[#1a1a1a]">
            <UserCog size={20} />
          </div>
          <div>
            <h3 className="text-base font-bold">Agent Message Templates</h3>
            <p className="text-xs text-[#737373]">
              These are sent automatically to agents — customize the wording,
              use <code className="rounded bg-[#ffffff] px-1">{"{name}"}</code> for their first name.
            </p>
          </div>
        </div>

        <div className="space-y-5">
          {TRIGGERS.map((trigger) => (
            <div key={trigger.key} className="rounded-xl border border-[#f4f4f4] p-4">
              <p className="text-sm font-bold text-[#1a1a1a]">{trigger.label}</p>
              <p className="mb-2 text-xs text-[#a3a3a3]">{trigger.description}</p>
              <textarea
                value={drafts[trigger.key]}
                onChange={(event) =>
                  setDrafts((current) => ({ ...current, [trigger.key]: event.target.value }))
                }
                rows={2}
                className="w-full rounded-lg border border-[#e6e6e6] bg-white px-3 py-2 text-sm outline-none focus:border-[#1a1a1a]"
              />
              <button
                type="button"
                onClick={() => handleSave(trigger.key)}
                className="mt-2 inline-flex items-center gap-1.5 rounded-lg bg-[#1a1a1a] px-3 py-2 text-xs font-bold text-white hover:bg-[#111111]"
              >
                <Send size={12} />
                Save Template
              </button>
            </div>
          ))}
        </div>
      </article>

      <article className="rounded-2xl border border-[#e6e6e6] bg-white p-6 shadow-[0_8px_24px_rgba(26,26,26,0.06)]">
        <div className="mb-4 flex items-center gap-2">
          <History size={16} className="text-[#737373]" />
          <h3 className="text-base font-bold">Recent Agent Messages</h3>
        </div>
        {agentMessageLog.length === 0 ? (
          <p className="text-sm text-[#a3a3a3]">
            Nothing sent yet — this fills in automatically as agents apply,
            get approved, or get suspended.
          </p>
        ) : (
          <div className="space-y-2">
            {agentMessageLog.slice(0, 8).map((entry) => (
              <div key={entry.id} className="rounded-lg border border-[#f4f4f4] px-3 py-2.5">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-[#1a1a1a]">
                    {entry.agentName}
                  </span>
                  <span className="rounded-full bg-[#ffffff] px-2 py-0.5 text-[10px] font-semibold text-[#737373]">
                    {entry.channel} · {entry.trigger}
                  </span>
                </div>
                <p className="mt-1 text-xs text-[#737373]">{entry.message}</p>
                <p className="mt-1 text-[10px] text-[#a3a3a3]">{entry.sentAt}</p>
              </div>
            ))}
          </div>
        )}
      </article>
    </div>
  );
}
