"use client";

import { AgentUserActionPage } from "@/components/agent-portal/AgentUserActionPage";
import Page from "@/app/dashboards/active-users/[userId]/disconnect/page";

export default function AgentUserDisconnectPage({
  params,
}: {
  params: Promise<{ agentId: string; userId: string }>;
}) {
  return <AgentUserActionPage params={params} action="disconnect" Page={Page} />;
}
