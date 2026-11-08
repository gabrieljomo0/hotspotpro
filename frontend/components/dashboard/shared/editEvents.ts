// Lets any menu or button open an edit pop-up without knowing where the
// pop-up is mounted. The pop-up host (in the dashboard shell) listens.

export const EDIT_ROUTER_EVENT = "hotspotpro:edit-router";

// "identity" = rename only. "full" = every connection detail.
export type EditRouterMode = "identity" | "full";

export function openEditRouter(ip: string, mode: EditRouterMode = "full") {
  window.dispatchEvent(new CustomEvent<{ ip: string; mode: EditRouterMode }>(EDIT_ROUTER_EVENT, { detail: { ip, mode } }));
}
