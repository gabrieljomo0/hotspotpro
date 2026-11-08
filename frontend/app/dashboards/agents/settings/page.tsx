import { redirect } from "next/navigation";

// This old page held an add-agent form and a list. Adding agents is now the
// "Add agent" window on the Agents page, and settings are per agent (on each
// agent's own page), so an old link or bookmark here lands on the Agents page.
export default function AgentSettingsRedirect() {
  redirect("/dashboards/agents");
}
