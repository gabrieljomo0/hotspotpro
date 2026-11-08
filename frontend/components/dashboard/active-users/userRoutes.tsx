"use client";

// The session-details and action pages (extend, top up, pause, block …) are
// the same screens for the admin and for an agent. This context tells them
// where links should go and which actions are allowed. Left alone (the admin
// dashboard) every action is allowed and links stay under /dashboards.

import { createContext, useContext, type ReactNode } from "react";

import { useDashboard } from "../context/DashboardContext";
import type { ActiveUser } from "../data/dashboard-data";
import type { AgentProfile } from "../shared/types";
import { getScopedUsers } from "../../agent-portal/realData";
import { userActionHref } from "./userLinks";

export type UserAction =
  | "details"
  | "extend-access"
  | "topup-data"
  | "change-package"
  | "reset-password"
  | "copy-login"
  | "pause"
  | "disconnect"
  | "block"
  | "delete";

export type UserRoutes = {
  isAgent: boolean;
  href: (userId: string, action?: UserAction) => string;
  listHref: string;
  can: (action: UserAction) => boolean;
  // Agents only ever see users on their own router.
  scopeUsers: (users: ActiveUser[]) => ActiveUser[];
};

const ADMIN: UserRoutes = {
  isAgent: false,
  href: (userId, action) => userActionHref(userId, action === "details" ? undefined : action),
  listHref: "/dashboards/active-sessions",
  can: () => true,
  scopeUsers: (users) => users,
};

const Ctx = createContext<UserRoutes>(ADMIN);

export function useUserRoutes() {
  return useContext(Ctx);
}

// "Full control": the agent may edit, block and terminate other people's
// sessions. That unlocks everything the admin sees, including delete and
// bulk actions.
export function hasFullUserControl(agent: AgentProfile) {
  const p = agent.permissions;
  return p["users.edit"] === "Allowed" && p["users.block"] === "Allowed" && p["users.terminateOther"] === "Allowed";
}

export function canAgentDo(agent: AgentProfile, action: UserAction) {
  const p = agent.permissions;
  switch (action) {
    case "details":
      return p["users.view"] === "Allowed";
    case "extend-access":
    case "topup-data":
    case "change-package":
    case "reset-password":
    case "copy-login":
      return p["users.edit"] === "Allowed";
    case "pause":
    case "disconnect":
      return p["users.terminateOwn"] === "Allowed" || p["users.terminateOther"] === "Allowed";
    case "block":
      return p["users.block"] === "Allowed";
    case "delete":
      return hasFullUserControl(agent);
  }
}

export function AgentUserRoutes({ agent, children }: { agent: AgentProfile; children: ReactNode }) {
  const { routers } = useDashboard();
  const value: UserRoutes = {
    isAgent: true,
    href: (userId, action) => {
      const base = `/agent-portal/${agent.id}/users/${encodeURIComponent(userId)}`;
      return action && action !== "details" ? `${base}/${action}` : base;
    },
    listHref: `/agent-portal/${agent.id}/users`,
    can: (action) => canAgentDo(agent, action),
    scopeUsers: (users) => getScopedUsers(users, routers, agent.routerIp),
  };
  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}
