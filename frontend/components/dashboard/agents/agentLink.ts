// Per-agent sign-in links. Each link opens the login page locked to ONE
// agent (see app/login/page.tsx), so an admin can hand every agent their
// own link instead of one shared address.

export function agentLoginPath(agentId: string): string {
  return `/login?agent=${encodeURIComponent(agentId)}`;
}

export function agentLoginLink(origin: string, agentId: string): string {
  return `${origin.replace(/\/+$/, "")}${agentLoginPath(agentId)}`;
}

// Copies an agent's link and returns the message to show the admin.
export async function copyAgentLoginLink(
  agentId: string,
  agentName: string,
): Promise<string> {
  const link = agentLoginLink(window.location.origin, agentId);
  try {
    await navigator.clipboard.writeText(link);
    return `${agentName}'s login link copied.`;
  } catch {
    return `Couldn't copy automatically — ${agentName}'s login link is ${link}`;
  }
}
