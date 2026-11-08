// An in-app replacement for the browser's confirm() box.
//   askConfirm("Delete this router? This cannot be undone.").then((ok) => ok && doIt());
// The pop-up itself is drawn by <ConfirmHost /> in the dashboard shell.

export const CONFIRM_EVENT = "hotspotpro:confirm";

export type ConfirmRequest = {
  message: string;
  confirmLabel?: string;
  resolve: (ok: boolean) => void;
};

let hostMounted = false;
export function setHostMounted(value: boolean) {
  hostMounted = value;
}

export function askConfirm(message: string, confirmLabel?: string): Promise<boolean> {
  return new Promise((resolve) => {
    // Nothing to draw the pop-up: do not go ahead with the action.
    if (!hostMounted) {
      resolve(false);
      return;
    }
    window.dispatchEvent(new CustomEvent<ConfirmRequest>(CONFIRM_EVENT, { detail: { message, confirmLabel, resolve } }));
  });
}
