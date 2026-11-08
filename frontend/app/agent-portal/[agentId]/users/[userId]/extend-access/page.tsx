"use client";

import { AgentUserActionPage } from "@/components/agent-portal/AgentUserActionPage";
import Page from "@/app/dashboards/active-users/[userId]/extend-access/page";

export default function AgentUserExtendAccessPage({
  params,
}: {
  params: Promise<{ agentId: string; userId: string }>;
}) {
  return <AgentUserActionPage params={params} action="extend-access" Page={Page} />;
}
