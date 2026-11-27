// The router actions that run as a visible, step-by-step task (a checklist
// that ticks as each stage finishes). The steps are what really happens on
// a MikroTik for that action; what each one changes in HotspotPro is done by
// the matching function in the router state when the last step finishes.

export type RouterTaskKind =
  | "full-provision"
  | "sync-files"
  | "sync-time"
  | "snmp"
  | "walled-garden"
  | "harden"
  | "winbox"
  | "push-to-router"
  | "api-credentials"
  | "update-script"
  | "reboot"
  | "pause"
  | "resume"
  | "disconnect"
  | "reconnect";

export type RouterTaskDef = {
  title: string;
  // When set, the task waits for a click on Start (it can interrupt customers
  // or change security settings).
  confirm?: string;
  steps: string[];
  // Needs the router to be online and provisioned.
  needsReachable: boolean;
  success: string;
};

export const ROUTER_TASKS: Record<RouterTaskKind, RouterTaskDef> = {
  "full-provision": {
    title: "Reprovision",
    needsReachable: false,
    steps: [
      "Sending the setup to the router",
      "Waiting for the next check-in",
      "Downloading and applying the setup",
      "Router confirms it ran",
    ],
    success: "was reprovisioned. Hotspot, captive portal, WiFi and services are updated. People already online stay connected.",
  },
  "sync-files": {
    title: "Sync hotspot files",
    needsReachable: true,
    steps: ["Connecting to the router", "Checking the hotspot profile", "Uploading login.html and assets", "Verifying the files"],
    success: "now has the latest hotspot login files.",
  },
  "push-to-router": {
    title: "Push to router",
    needsReachable: true,
    confirm:
      "This forces packages (User Profiles), vouchers, WiFi bridge binding, and the captive portal login page onto this router so customers can connect with voucher codes.",
    steps: [
      "Queuing push for this router",
      "Opening captive portal + binding WiFi",
      "Pushing packages (User Profiles)",
      "Pushing voucher accounts",
      "Router confirms it applied",
    ],
    success: "now has packages, vouchers, and the captive portal ready for WiFi logins.",
  },
  "sync-time": {
    title: "Sync router time",
    needsReachable: true,
    steps: ["Connecting to the router", "Reading the router clock", "Setting the time and timezone", "Verifying the new time"],
    success: "clock is in sync.",
  },
  snmp: {
    title: "Configure SNMP",
    needsReachable: true,
    steps: ["Connecting to the router", "Enabling the SNMP service", "Setting the community and contact", "Verifying monitoring works"],
    success: "is now being monitored over SNMP.",
  },
  "walled-garden": {
    title: "Configure Walled Garden",
    needsReachable: true,
    steps: ["Connecting to the router", "Removing old rules", "Adding payment and portal domains", "Verifying customers can reach them"],
    success: "walled garden rules are in place.",
  },
  harden: {
    title: "Harden Services",
    confirm: "This turns off Telnet, FTP and SSL services on the router. Only the API stays enabled.",
    needsReachable: true,
    steps: ["Connecting to the router", "Disabling Telnet", "Disabling FTP", "Disabling SSL", "Checking the API still answers"],
    success: "services are hardened. Telnet, FTP and API-SSL are off. WinBox stays available on the admin port.",
  },
  winbox: {
    title: "Refresh WinBox access",
    confirm: "This limits WinBox to the admin computer on 192.168.88.1. It does not create a public address.",
    needsReachable: true,
    steps: ["Connecting to the router", "Closing the old remote port", "Opening a new remote port", "Testing the new address"],
    success: "WinBox is limited to 192.168.88.1 on the admin port.",
  },
  "api-credentials": {
    title: "Regenerate API credentials",
    confirm: "This creates a new API password on the router. Only use it if you need to reset access.",
    needsReachable: true,
    steps: ["Connecting to the router", "Generating a new password", "Updating the API user on the router", "Testing the new login"],
    success: "has new API credentials.",
  },
  "update-script": {
    title: "Update script",
    needsReachable: true,
    steps: ["Connecting to the router", "Building the latest provisioning script", "Replacing the script on the router", "Verifying it runs"],
    success: "is running the latest provisioning script.",
  },
  reboot: {
    title: "Reboot router",
    confirm: "The router will be offline for a short while. Customers will lose internet until it is back.",
    needsReachable: true,
    steps: ["Sending the reboot command", "Router is shutting down", "Waiting for it to start up", "Router is back online"],
    success: "is back online.",
  },
  pause: {
    title: "Pause connection",
    confirm: "Customers stay connected but their traffic is held until you resume.",
    needsReachable: false,
    steps: ["Connecting to the router", "Holding customer traffic"],
    success: "is paused. Traffic is held.",
  },
  resume: {
    title: "Resume connection",
    needsReachable: false,
    steps: ["Connecting to the router", "Releasing customer traffic"],
    success: "is running normally again.",
  },
  // Disconnect / Reconnect cut and restore the internet of the WHOLE router (the router itself stays
  // in contact with HotspotPro; the server tells it what to do — see backend/src/server/control.ts).
  disconnect: {
    title: "Disconnect router",
    confirm:
      "Everyone on this router loses internet and is signed out, and new logins are refused until you reconnect it. Voucher time keeps counting meanwhile. The router applies this within 3 seconds.",
    needsReachable: false,
    steps: ["Saving the disconnect", "Refusing new logins on this router", "Router receives the instruction (within 3 seconds)", "Signing customers out"],
    success: "is disconnected. Customers have no internet until you reconnect it.",
  },
  reconnect: {
    title: "Reconnect router",
    needsReachable: false,
    steps: ["Saving the reconnect", "Allowing logins on this router again", "Router receives the instruction (within 3 seconds)"],
    success: "is reconnected. Customers can log in and browse again.",
  },

};

export const TASK_STEP_MS = 800;
