// Tiny, general-purpose helpers used by more than one part of the
// dashboard's state. Kept separate so they have one home instead of being
// copy-pasted, and so it's obvious they don't belong to any single domain
// (routers, agents, vouchers, etc).

// A consistent "12 Sep 2026, 09:41" style timestamp, used anywhere we log
// when something happened (activity log entries, "last connected" times).
export function nowTimestamp() {
  return new Date().toLocaleString("en-GB", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

// The ID of the built-in "Owner" agent that represents the account holder
// themselves. Shared because a lot of other domains' mock data (vouchers,
// approvals, etc) reference it as the default agent to attribute things to.
export const DEFAULT_AGENT_ID = "agent-owner-default";
