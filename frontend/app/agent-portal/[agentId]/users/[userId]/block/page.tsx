"use client";

import { AgentUserActionPage } from "@/components/agent-portal/AgentUserActionPage";
import Page from "@/app/dashboards/active-users/[userId]/block/page";

export default function AgentUserBlockPage({
  params,
}: {
  params: Promise<{ agentId: string; userId: string }>;
}) {
  return <AgentUserActionPage params={params} action="block" Page={Page} />;
}
