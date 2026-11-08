// The sign-in rules for agents, kept free of any React / browser code so the
// server can use them. (The dashboard has the same rules in
// components/dashboard/agents/agentSettings.ts — keep the wording in step.)

type AgentRules = { status?: string; isDefault?: boolean; portalLoginEnabled?: boolean; portalAccessEnabled?: boolean };

export const ACCESS_DISABLED_MESSAGE =
  "Your access has been disabled. Please contact admin to reactivate your access.";
export const ACCESS_PENDING_MESSAGE = "Your application is still awaiting admin's approval.";
export const AGENT_PORTAL_OFF_MESSAGE =
  "Agent sign-in is switched off for this account. Ask the account owner to turn on the Agent Portal.";
export const ADMIN_AGENT_LOGIN_OFF_MESSAGE =
  "Sign-in with the admin agent's login details is switched off. Turn it on from the agent's Portal Access tab first.";
export const AGENT_DASHBOARD_OFF_MESSAGE =
  "Your agent dashboard has been switched off by admin. Please contact admin to turn it back on.";

export function accessBlockedMessage(status: string) {
  return status === "Pending" ? ACCESS_PENDING_MESSAGE : ACCESS_DISABLED_MESSAGE;
}

export function agentSignInBlock(agent: AgentRules, agentPortalEnabled: boolean): string | null {
  if (!agentPortalEnabled) return AGENT_PORTAL_OFF_MESSAGE;
  if (agent.portalAccessEnabled === false) return AGENT_DASHBOARD_OFF_MESSAGE;
  if (agent.isDefault && !agent.portalLoginEnabled) return ADMIN_AGENT_LOGIN_OFF_MESSAGE;
  return null;
}
