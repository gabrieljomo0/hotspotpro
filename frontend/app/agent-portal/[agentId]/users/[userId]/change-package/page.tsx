"use client";

import { AgentUserActionPage } from "@/components/agent-portal/AgentUserActionPage";
import Page from "@/app/dashboards/active-users/[userId]/change-package/page";

export default function AgentUserChangePackagePage({
  params,
}: {
  params: Promise<{ agentId: string; userId: string }>;
}) {
  return <AgentUserActionPage params={params} action="change-package" Page={Page} />;
}
