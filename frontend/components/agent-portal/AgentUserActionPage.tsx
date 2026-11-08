"use client";

// Opens one of the admin's session / action pages (details, extend, top up,
// pause, block …) inside the agent portal. It only opens for users on the
// agent's own router, and only for actions the agent is allowed to do.

import { use, type ComponentType } from "react";
import { LockKeyhole } from "lucide-react";

import { useDashboard } from "@/components/dashboard/context/DashboardContext";
import { NotFoundCard } from "@/components/dashboard/shared/ActionPageLayout";
import { getUserId } from "@/components/dashboard/active-users/userLinks";
import { AgentUserRoutes, canAgentDo, type UserAction } from "@/components/dashboard/active-users/userRoutes";

import { AgentPortalPage } from "./AgentPortalPage";
import { getScopedUsers } from "./realData";

export function AgentUserActionPage({
  params,
  action,
  Page,
}: {
  params: Promise<{ agentId: string; userId: string }>;
  action: UserAction;
  Page: ComponentType<{ params: Promise<{ userId: string }> }>;
}) {
  const { agentId, userId } = use(params);
  const { users, routers } = useDashboard();

  return (
    <AgentPortalPage
      agentId={agentId}
      permissionKey="users.view"
      featureLabel="Active Users"
      render={(agent) => {
        const decoded = decodeURIComponent(userId);
        const mine = getScopedUsers(users, routers, agent.routerIp).some((u) => getUserId(u) === decoded);
        if (!mine) {
          return (
            <NotFoundCard
              message="This user isn't on your router, or was removed."
              backHref={`/agent-portal/${agentId}/users`}
            />
          );
        }
        if (!canAgentDo(agent, action)) {
          return (
            <div className="flex items-center gap-3 rounded-2xl bg-white p-6 text-sm text-[#a3a3a3]">
              <LockKeyhole size={16} />
              You don&apos;t have permission for this action. Ask your admin to turn it on.
            </div>
          );
        }
        return (
          <AgentUserRoutes agent={agent}>
            <Page params={params} />
          </AgentUserRoutes>
        );
      }}
    />
  );
}
