/** Queue a RouterOS action for a live router. The router picks it up on the next check-in (~10s). */
export function queueRouterAction(ip: string, action: string, extra: Record<string, unknown> = {}) {
  if (!ip || !action) return;
  void fetch("/api/routers/jobs", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ ip, action, ...extra }),
  }).catch(() => {});
}

/** Queue the same action for every router IP (unique). */
export function queueRouterActionMany(ips: string[], action: string, extra: Record<string, unknown> = {}) {
  for (const ip of [...new Set(ips.filter(Boolean))]) queueRouterAction(ip, action, extra);
}
