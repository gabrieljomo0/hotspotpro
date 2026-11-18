// One-time HTTP auto-login page for phones that entered a voucher on the HTTPS site portal.
// iOS/Android captive sheets often block HTTPS→HTTP form POSTs; navigating to an HTTP
// page on the gateway that auto-submits to MikroTik /login works reliably.

import { getState, setState } from "./store";

export type LoginTicket = {
  id: string;
  token: string;
  username: string;
  password: string;
  at: number;
  fetchedAt?: number;
};

type TicketFile = Record<string, LoginTicket>;

function tickets(): TicketFile {
  const value = getState("loginTickets")?.value;
  if (!value || typeof value !== "object" || Array.isArray(value)) return {};
  return value as TicketFile;
}

function save(file: TicketFile) {
  setState("loginTickets", file, "server");
}

function prune(file: TicketFile, now: number) {
  for (const [id, row] of Object.entries(file)) {
    if (now - (row.at || 0) > 5 * 60_000) delete file[id];
  }
}

export function createLoginTicket(token: string, username: string, password: string, now = Date.now()): LoginTicket {
  const file = tickets();
  prune(file, now);
  const id = `t${now.toString(36)}${Math.random().toString(36).slice(2, 8)}`;
  const ticket: LoginTicket = {
    id,
    token,
    username: username.slice(0, 64),
    password: password.slice(0, 64),
    at: now,
  };
  file[id] = ticket;
  // One active ticket per router token (latest Connect wins).
  for (const [otherId, row] of Object.entries(file)) {
    if (otherId !== id && row.token === token) delete file[otherId];
  }
  save(file);
  return ticket;
}

export function getLoginTicket(id: string, token?: string): LoginTicket | null {
  const file = tickets();
  prune(file, Date.now());
  save(file);
  const row = file[id];
  if (!row) return null;
  if (token && row.token !== token) return null;
  return row;
}

export function markLoginTicketFetched(id: string) {
  const file = tickets();
  const row = file[id];
  if (!row) return;
  row.fetchedAt = Date.now();
  file[id] = row;
  save(file);
}

export function latestTicketForToken(token: string): LoginTicket | null {
  const file = tickets();
  prune(file, Date.now());
  let best: LoginTicket | null = null;
  for (const row of Object.values(file)) {
    if (row.token !== token) continue;
    if (!best || row.at > best.at) best = row;
  }
  return best;
}

function escAttr(value: string) {
  return value.replace(/&/g, "&amp;").replace(/"/g, "&quot;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
}

/** HTML stored in the router's hotspot folder; MikroTik expands $(link-login-only). */
export function autoLoginHtml(username: string, password: string): string {
  const user = escAttr(username);
  const pass = escAttr(password);
  return `<!DOCTYPE html><html><!-- HotspotPro designed-portal --><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><meta http-equiv="pragma" content="no-cache"><title>Connecting…</title><style>body{margin:0;font-family:system-ui,sans-serif;background:#f7f7f7;color:#1a1a1a;display:flex;min-height:100vh;align-items:center;justify-content:center}p{color:#525252}</style><script>function go(){try{document.forms[0].submit()}catch(e){}}</script></head><body onload="go()"><main><p>Connecting to WiFi…</p><form name="login" method="post" action="$(link-login-only)"><input type="hidden" name="username" value="${user}"><input type="hidden" name="password" value="${pass}"><input type="hidden" name="dst" value="https://www.google.com/"><input type="hidden" name="popup" value="false"><noscript><button type="submit">Connect</button></noscript></form></main></body></html>\n`;
}

/** RouterOS lines that download the auto-login page onto the hotspot HTML folder. */
export function autoLoginFetchLines(origin: string, token: string, ticketId: string): string[] {
  if (!origin || !token || !ticketId) return [];
  const tls = origin.startsWith("https://") ? " check-certificate=no" : "";
  const url = `${origin}/api/provision/${token}/hp-go.html?t=${encodeURIComponent(ticketId)}`;
  return [
    `# HotspotPro auto-login page`,
    `:do { /tool fetch url="${url}" dst-path=hotspot/hp-go.html${tls} } on-error={ }`,
    `:do { /tool fetch url="${url}" dst-path=flash/hotspot/hp-go.html${tls} } on-error={ }`,
  ];
}
