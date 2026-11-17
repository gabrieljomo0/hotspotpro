// Commands the router buttons send. The router already calls in every 30 seconds
// and runs one queued script, so these work from behind any modem.
// Paid logins stay on the router: this host has no public RADIUS port.

import { getState, setState } from "./store";
import { type IspLink, multiWanLines } from "./multiWan";
import { remoteWinboxLines } from "./routeros";
import { primaryWanInterface } from "./primaryWan";
import { forgetLocalUsers, localUserLines } from "./localUsers";
import { ssidForRouter, wifiApplyLines } from "./wifiApply";

export const ROUTER_ACTIONS = [
  "full-provision",
  "sync-files",
  "sync-time",
  "snmp",
  "walled-garden",
  "harden",
  "winbox",
  "remote-winbox",
  "remote-winbox-off",
  "multiwan",
  "wifi",
  "sync-vouchers",
  "api-credentials",
  "update-script",
  "reboot",
] as const;

const PAGES = ["login.html", "rlogin.html", "alogin.html", "error.html", "logout.html", "redirect.html", "status.html", "md5.js"];

function step(command: string) {
  return `:do { ${command} } on-error={ }`;
}

function hosts(origin: string): string[] {
  const names = new Set<string>();
  for (const value of [origin, process.env.HOTSPOTPRO_PUBLIC_URL ?? ""]) {
    try {
      const host = new URL(value).hostname;
      if (host && host !== "localhost" && !/^\d+\.\d+\.\d+\.\d+$/.test(host)) names.add(host);
    } catch { /* not a URL */ }
  }
  return [...names];
}

function password() {
  const alphabet = "ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz23456789";
  let out = "";
  for (let i = 0; i < 16; i++) out += alphabet[Math.floor(Math.random() * alphabet.length)];
  return out;
}

function fileFetches(origin: string, token: string) {
  // No reset-html — that command asks y/N in the terminal and blocks setup/sync.
  const tls = origin.startsWith("https:") ? " check-certificate=no" : "";
  const lines = [
    step(`/ip hotspot profile set [find where name=hotspotpro] html-directory=hotspot`),
  ];
  for (const page of PAGES) {
    const url = `${origin}/api/provision/${token}/${page}`;
    for (const dest of [`hotspot/${page}`, `flash/hotspot/${page}`]) {
      lines.push(step(`/file remove [find where name="${dest}"]`));
      lines.push(step(`/tool fetch url="${url}" dst-path="${dest}"${tls}`));
    }
  }
  const css = `${origin}/api/provision/${token}/hotspotpro.css`;
  for (const dest of ["hotspot/css/hotspotpro.css", "flash/hotspot/css/hotspotpro.css"]) {
    lines.push(step(`/file remove [find where name="${dest}"]`));
    lines.push(step(`/tool fetch url="${css}" dst-path="${dest}"${tls}`));
  }
  return lines;
}

function snmpLines() {
  return [
    step(`/snmp set enabled=yes contact="HotspotPro"`),
    step(`:if ([:len [/snmp community find where name=hotspotpro]] = 0) do={ /snmp community add name=hotspotpro addresses=192.168.88.0/24,10.0.0.0/8,192.168.0.0/16 read-access=yes write-access=no }`),
  ];
}

function serviceLines(remoteOn: boolean) {
  return [
    step(`/ip service set telnet disabled=yes`),
    step(`/ip service set ftp disabled=yes`),
    step(`/ip service set api-ssl disabled=yes`),
    // Do not clamp WinBox to LAN when remote access is on — that undoes off-site WinBox.
    remoteOn
      ? step(`/ip service set winbox address=0.0.0.0/0 disabled=no`)
      : step(`/ip service set winbox address=192.168.88.0/24 disabled=no`),
    remoteOn
      ? step(`/ip service set api port=8728 address=192.168.88.0/24,192.168.216.0/24 disabled=no`)
      : step(`/ip service set api address=192.168.88.0/24 disabled=no`),
  ];
}

function gardenLines(origin: string) {
  const lines = [
    step(`/ip hotspot walled-garden remove [find where comment="HotspotPro"]`),
    step(`/ip hotspot walled-garden ip remove [find where comment="HotspotPro"]`),
  ];
  for (const host of hosts(origin)) {
    lines.push(step(`/ip hotspot walled-garden add dst-host="${host}" comment="HotspotPro"`));
  }
  return lines;
}

function clockLines() {
  return [
    step(`/system clock set time-zone-name=Africa/Accra`),
    step(`/system ntp client set enabled=yes`),
    step(`:if ([:len [/system ntp client servers find where address=pool.ntp.org]] = 0) do={ /system ntp client servers add address=pool.ntp.org }`),
  ];
}

function loginLines() {
  return [step(`/ip hotspot profile set [find where name=hotspotpro] trial-uptime-limit=0s use-radius=no`)];
}

/** A RouterOS script for one dashboard button, or null when the name is unknown. */
export function routerActionScript(action: string, input: { origin: string; token: string }): string | null {
  const { origin, token } = input;
  const head = `# hotspotpro-action:${action}`;
  let body: string[] = [];
  const tls = origin.startsWith("https:") ? " check-certificate=no" : "";
  const reprovision = [
    step(`/file remove [find where name=hotspotpro-setup.rsc]`),
    step(`/file remove [find where name="flash/hotspotpro-setup.rsc"]`),
    step(`/tool fetch url="${origin}/api/provision/${token}" dst-path=hotspotpro-setup.rsc${tls}`),
    `:delay 2s`,
    `:local hpFile "hotspotpro-setup.rsc"; :if ([:len [/file find where name=("flash/" . $hpFile)]] > 0) do={ :set hpFile ("flash/" . $hpFile) }; :if ([:len [/file find where name=$hpFile]] > 0) do={ /import file-name=$hpFile }`,
  ];
  if (action === "full-provision" || action === "update-script") body = reprovision;
  else if (action === "snmp") body = snmpLines();
  else if (action === "walled-garden") body = gardenLines(origin);
  else if (action === "harden") body = serviceLines(routerByToken(token)?.remoteAccessHold !== true);
  else if (action === "sync-files") body = fileFetches(origin, token);
  else if (action === "sync-time") body = clockLines();
  else if (action === "winbox" || action === "remote-winbox" || action === "remote-winbox-off") {
    const row = routerByToken(token);
    const wan = primaryWanInterface(row);
    const sameNetwork = row?.adminFromWan !== false;
    // "Regenerate WinBox" refreshes remote access when it is on; otherwise keeps WinBox on the admin LAN.
    const remoteOn = action === "remote-winbox" || (action === "winbox" && row?.remoteAccessHold !== true);
    if (action === "remote-winbox-off") body = remoteWinboxLines(false, origin, token, sameNetwork, wan);
    else if (remoteOn) body = remoteWinboxLines(true, origin, token, sameNetwork, wan);
    else body = [step(`/ip service set winbox address=192.168.88.0/24 disabled=no`)];
  } else if (action === "multiwan") {
    const row = routerByToken(token);
    // Force a fresh apply even if the router already ran this Multi-WAN stamp.
    body = [":global hpWan; :set hpWan \"\"", ...multiWanLines(row?.multiWanMode, row?.ispLinks, row?.managementPort || "")];
  } else if (action === "wifi") {
    const row = routerByToken(token);
    body = [":global hpWifiSsid; :set hpWifiSsid \"\"", ...wifiApplyLines(ssidForRouter(row ?? {}))];
  } else if (action === "sync-vouchers") {
    const row = routerByToken(token);
    forgetLocalUsers(token);
    body = localUserLines(token, row?.ip || "");
  } else if (action === "api-credentials") {
    const secret = password();
    body = [`# hotspotpro-password:${secret}`, step(`/user remove [find where name=hotspotpro]`), `/user add name=hotspotpro group=full password=${secret} comment="HotspotPro"`];
  } else if (action === "reboot") body = [`/system reboot`];
  else return null;
  return [head, ...body].join("\n") + "\n";
}

function routerByToken(token: string) {
  const value = getState("routers")?.value;
  if (!Array.isArray(value)) return null;
  return (value as {
    provisioningToken?: string;
    wanInterface?: string;
    adminFromWan?: boolean;
    remoteAccessHold?: boolean;
    multiWanMode?: string;
    ispLinks?: IspLink[];
    managementPort?: string;
    ip?: string;
    siteId?: string | null;
  }[]).find((row) => row?.provisioningToken === token) ?? null;
}

const ACTION_TEXT: Record<string, string> = {
  "full-provision": "The router downloaded and ran the latest HotspotPro setup.",
  snmp: "SNMP is on for the admin network.",
  "walled-garden": "Walled garden updated so customers can open the login page.",
  harden: "Telnet, FTP and API-SSL are off. WinBox and the API stay on for the admin port.",
  "sync-files": "Hotspot login files downloaded again.",
  "sync-time": "Router clock set to Ghana time.",
  winbox: "WinBox settings refreshed on the router.",
  "remote-winbox": "Remote WinBox is on (cloud name, Back To Home tunnel, and port 8291).",
  "remote-winbox-off": "Remote WinBox is off. WinBox stays on the admin network.",
  multiwan: "Multi-WAN load balancing / failover was applied on the router.",
  wifi: "WiFi SSID and access-point radios were updated on the router.",
  "sync-vouchers": "Vouchers were copied onto the router for local login.",
  "api-credentials": "API user hotspotpro was created on the router.",
  "update-script": "The router downloaded and ran the latest HotspotPro setup.",
  reboot: "Reboot sent.",
};

/** After the router reports a button's script ran, record that on its row. */
export function markRouterAction(token: string, script: string) {
  const action = /^# hotspotpro-action:([a-z-]+)/.exec(script)?.[1];
  if (!action || !ACTION_TEXT[action]) return;
  const value = getState("routers")?.value;
  if (!Array.isArray(value)) return;
  const now = new Date().toLocaleString("en-GB", { day: "2-digit", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit", second: "2-digit" });
  const secret = /^# hotspotpro-password:([A-Za-z0-9]+)/m.exec(script)?.[1];
  let changed = false;
  const next = (value as Record<string, unknown>[]).map((row) => {
    if (!row || row.provisioningToken !== token) return row;
    changed = true;
    const patch: Record<string, unknown> = {};
    if (action === "full-provision" || action === "update-script") {
      Object.assign(patch, {
        snmpConfigured: true,
        walledGardenConfigured: true,
        servicesHardened: true,
        hotspotFilesSyncedAt: now,
        timeSyncedAt: now,
        provisionedAt: now,
        scriptUpdatedAt: now,
        provisioningStatus: "Provisioned",
      });
    } else if (action === "snmp") patch.snmpConfigured = true;
    else if (action === "walled-garden") patch.walledGardenConfigured = true;
    else if (action === "harden") patch.servicesHardened = true;
    else if (action === "sync-files") patch.hotspotFilesSyncedAt = now;
    else if (action === "sync-time") patch.timeSyncedAt = now;
    else if (action === "winbox") {
      if (row.remoteAccessHold === true) {
        patch.winboxAddress = "192.168.88.1";
        patch.winboxReach = "lan";
        patch.remoteAccessEnabled = false;
      } else {
        patch.remoteAccessEnabled = true;
        patch.remoteAccessHold = false;
      }
    } else if (action === "remote-winbox") {
      patch.remoteAccessEnabled = true;
      patch.remoteAccessHold = false;
    } else if (action === "remote-winbox-off") {
      patch.remoteAccessEnabled = false;
      patch.remoteAccessHold = true;
      patch.winboxAddress = "192.168.88.1";
      patch.winboxReach = "lan";
      patch.wireguardConfig = null;
    } else if (action === "multiwan") {
      patch.multiWanAppliedAt = now;
    } else if (action === "wifi") {
      patch.wifiAppliedAt = now;
    } else if (action === "sync-vouchers") {
      patch.vouchersSyncedAt = now;
    } else if (action === "api-credentials" && secret) {
      patch.apiUsername = "hotspotpro";
      patch.apiPassword = secret;
    } else if (action === "reboot") {
      patch.lastSeen = "Restarting…";
      patch.uptime = "0m";
    }
    const activity = Array.isArray(row.activity) ? row.activity : [];
    return { ...row, ...patch, activity: [{ at: now, text: ACTION_TEXT[action] }, ...activity].slice(0, 30) };
  });
  if (changed) setState("routers", next, "router");
}
