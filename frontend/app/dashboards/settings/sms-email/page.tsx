"use client";

// SMS & Email: message your customers by audience, and edit the messages
// agents are sent when they apply, are approved or are suspended. It lives
// under Settings (it used to be a tab on the Agents page).

import { AgentMessagesPanel } from "@/components/dashboard/agents/AgentMessagesPanel";
import { BackLink } from "@/components/dashboard/shared/BackLink";

export default function SmsEmailPage() {
  return (
    <section className="w-full">
      <BackLink />
      <h2 className="mb-1 text-3xl font-bold tracking-tight md:text-4xl">SMS &amp; Email</h2>
      <p className="mb-6 max-w-2xl text-sm text-[#64748b] md:text-base">
        Message your customers, and set the messages agents receive when they apply, are approved or are suspended.
      </p>
      <AgentMessagesPanel hideTitle />
    </section>
  );
}
