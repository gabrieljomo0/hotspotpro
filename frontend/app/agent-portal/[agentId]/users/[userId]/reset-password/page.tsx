"use client";

import { AgentUserActionPage } from "@/components/agent-portal/AgentUserActionPage";
import Page from "@/app/dashboards/active-users/[userId]/reset-password/page";

export default function AgentUserResetPasswordPage({
  params,
}: {
  params: Promise<{ agentId: string; userId: string }>;
}) {
  return <AgentUserActionPage params={params} action="reset-password" Page={Page} />;
}
