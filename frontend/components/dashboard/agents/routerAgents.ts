// Who is assigned to a router: the default (admin) agent is always there,
// plus any agent whose router this is. Nobody else, and no other router's.

import type { AgentProfile } from "@/components/dashboard/shared/types";

export function agentsAssignedToRouter(agents: AgentProfile[], routerIp: string): AgentProfile[] {
  const own = agents.filter((agent) => !agent.isDefault && agent.routerIp === routerIp);
  const defaults = agents.filter((agent) => agent.isDefault);
  return [...defaults, ...own];
}
