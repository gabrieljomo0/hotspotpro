// Commands the router buttons send. The router already calls in every 30 seconds
// and runs one queued script, so these work from behind any modem.
// Paid logins stay on the router: this host has no public RADIUS port.

import { getState, setState } from "./store";

export const ROUTER_ACTIONS = [
  "full-provision",
  "sync-files",
  "sync-time",
  "snmp",
  "walled-garden",
  "harden",
  "winbox",
  "api-credentials",
  "update-script",
  "reboot",
] as const;

const PAGES = ["login.html", "alogin.html", "error.html", "logout.html", "redirect.html", "status.html", "md5.js"];

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
  const tls = origin.startsWith("https:") ? " check-certificate=no" : "";
  const lines = [step(`/ip hotspot reset-html [find where name=hotspotpro]`)];
  for (const page of PAGES) {
    const url = `${origin}/api/provision/${token}/${page}`;
    lines.push(step(`/tool fetch url="${url}" dst-path=("hotspot/${page}")${tls}`));
    lines.push(step(`/tool fetch url="${url}" dst-path=("flash/hotspot/${page}")${tls}`));
  }
  const css = `${origin}/api/provision/${token}/hotspotpro.css`;
  lines.push(step(`/tool fetch url="${css}" dst-path=("hotspot/css/hotspotpro.css")${tls}`));
  lines.push(step(`/tool fetch url="${css}" dst-path=("flash/hotspot/css/hotspotpro.css")${tls}`));
  return lines;
}

function snmpLines() {
  return [
    step(`/snmp set enabled=yes contact="HotspotPro"`),
    step(`:if ([:len [/snmp community find where name=hotspotpro]] = 0) do={ /snmp community add name=hotspotpro addresses=192.168.88.0/24,10.0.0.0/8,192.168.0.0/16 read-access=yes write-access=no }`),
  ];
}

function serviceLines() {
  return [
    step(`/ip service set telnet disabled=yes`),
    step(`/ip service set ftp disabled=yes`),
    step(`/ip service set api-ssl disabled=yes`),
    step(`/ip service set winbox address=192.168.88.0/24 disabled=no`),
    step(`/ip service set api address=192.168.88.0/24 disabled=no`),
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
  if (action === "full-provision") body = [...snmpLines(), ...serviceLines(), ...gardenLines(origin), ...fileFetches(origin, token), ...clockLines(), ...loginLines()];
  else if (action === "snmp") body = snmpLines();
  else if (action === "walled-garden") body = gardenLines(origin);
  else if (action === "harden") body = serviceLines();
  else if (action === "sync-files") body = fileFetches(origin, token);
  else if (action === "sync-time") body = clockLines();
  else if (action === "winbox") body = [step(`/ip service set winbox address=192.168.88.0/24 disabled=no`)];
  else if (action === "api-credentials") {
    const secret = password();
    body = [`# hotspotpro-password:${secret}`, step(`/user remove [find where name=hotspotpro]`), `/user add name=hotspotpro group=full password=${secret} comment="HotspotPro"`];
  } else if (action === "update-script") {
    const tls = origin.startsWith("https:") ? " check-certificate=no" : "";
    body = [
      step(`/file remove [find where name=hotspotpro-setup.rsc]`),
      step(`/tool fetch url="${origin}/api/provision/${token}" dst-path=hotspotpro-setup.rsc${tls}`),
      `:if ([:len [/file find where name=hotspotpro-setup.rsc]] > 0) do={ /import file-name=hotspotpro-setup.rsc }`,
    ];
  } else if (action === "reboot") body = [`/system reboot`];
  else return null;
  return [head, ...body].join("\n") + "\n";
}

const ACTION_TEXT: Record<string, string> = {
  "full-provision": "Full provision ran on the router: SNMP, services, walled garden, hotspot files and clock. Paid logins stay on the router.",
  snmp: "SNMP is on for the admin network.",
  "walled-garden": "Walled garden updated so customers can open the login page.",
  harden: "Telnet, FTP and API-SSL are off. WinBox and the API stay on for the admin port.",
  "sync-files": "Hotspot login files downloaded again.",
  "sync-time": "Router clock set to Ghana time.",
  winbox: "WinBox limited to the admin network (192.168.88.1).",
  "api-credentials": "API user hotspotpro was created on the router.",
  "update-script": "The router downloaded the latest setup.",
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
    if (action === "full-provision") {
      Object.assign(patch, {
        snmpConfigured: true,
        walledGardenConfigured: true,
        servicesHardened: true,
        hotspotFilesSyncedAt: now,
        timeSyncedAt: now,
        provisionedAt: now,
        provisioningStatus: "Provisioned",
        winboxAddress: "192.168.88.1",
        remoteAccessEnabled: false,
        loginMode: "local",
        radiusAddress: null,
      });
    } else if (action === "snmp") patch.snmpConfigured = true;
    else if (action === "walled-garden") patch.walledGardenConfigured = true;
    else if (action === "harden") patch.servicesHardened = true;
    else if (action === "sync-files") patch.hotspotFilesSyncedAt = now;
    else if (action === "sync-time") patch.timeSyncedAt = now;
    else if (action === "winbox") {
      patch.winboxAddress = "192.168.88.1";
      patch.remoteAccessEnabled = true;
    } else if (action === "api-credentials" && secret) {
      patch.apiUsername = "hotspotpro";
      patch.apiPassword = secret;
    } else if (action === "update-script") patch.scriptUpdatedAt = now;
    else if (action === "reboot") {
      patch.lastSeen = "Restarting…";
      patch.uptime = "0m";
    }
    const activity = Array.isArray(row.activity) ? row.activity : [];
    return { ...row, ...patch, activity: [{ at: now, text: ACTION_TEXT[action] }, ...activity].slice(0, 30) };
  });
  if (changed) setState("routers", next, "router");
}
