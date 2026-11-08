import { redirect } from "next/navigation";

// This used to be its own page. It is now part of the All Agents tab on the
// Agents page, so an old link or bookmark here lands there.
export default function AgentWalletsRedirect() {
  redirect("/dashboards/agents");
}
