// Lets any menu or button open an edit pop-up without knowing where the
// pop-up is mounted. The pop-up host (in the dashboard shell) listens.

export const EDIT_ROUTER_EVENT = "hotspotpro:edit-router";

// "identity" = rename only. "full" = every connection detail.
export type EditRouterMode = "identity" | "full";

export function openEditRouter(ip: string, mode: EditRouterMode = "full") {
  window.dispatchEvent(new CustomEvent<{ ip: string; mode: EditRouterMode }>(EDIT_ROUTER_EVENT, { detail: { ip, mode } }));
}

export const REPROVISION_SCRIPT_EVENT = "hotspotpro:reprovision-script";

export type ReprovisionOpenMode = "auto" | "paste";

/** Open Reprovision — auto queues a job; paste shows the WinBox script. */
export function openReprovisionScript(ip: string, mode: ReprovisionOpenMode = "auto") {
  window.dispatchEvent(
    new CustomEvent<{ ip: string; mode: ReprovisionOpenMode }>(REPROVISION_SCRIPT_EVENT, { detail: { ip, mode } }),
  );
}
