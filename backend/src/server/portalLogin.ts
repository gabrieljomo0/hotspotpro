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

/**
 * HTML stored in the router's hotspot folder; MikroTik expands $(link-login-only).
 * Plain HTTP-PAP only — CHAP hashes here were bouncing phones back to the portal
 * when md5.js failed to load or chap-id was advertised.
 */
export function autoLoginHtml(username: string, password: string): string {
  const userAttr = escAttr(username);
  const passAttr = escAttr(password);
  // dst must not hardcode 10.10.0.1 — custom hotspot LAN / other gateways then bounce after login.
  // MikroTik expands $(link-orig-esc); fall back to status page on this gateway.
  return `<!DOCTYPE html><html><!-- HotspotPro designed-portal --><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><meta http-equiv="pragma" content="no-cache"><title>Connecting…</title><style>body{margin:0;font-family:system-ui,sans-serif;background:#eff6ff;color:#2563eb;display:flex;min-height:100vh;align-items:center;justify-content:center}p{color:#3b82f6}</style><script>function go(){try{document.login.submit()}catch(e){}}</script></head><body onload="go()"><main><p>Connecting to WiFi…</p><form name="login" method="post" action="$(link-login-only)"><input type="hidden" name="username" value="${userAttr}"><input type="hidden" name="password" value="${passAttr}"><input type="hidden" name="dst" value="$(link-orig-esc)"><input type="hidden" name="popup" value="false"><noscript><button type="submit">Connect</button></noscript></form></main></body></html>\n`;
}

/**
 * RouterOS lines that download the auto-login page onto the hotspot HTML folder.
 * Jobs: hardFail=true so Connect does not open a missing page.
 * Check-in: hardFail=false — never :error (that aborted the rest of control and orphaned jobs).
 */
export function autoLoginFetchLines(origin: string, token: string, ticketId: string, hardFail = true): string[] {
  if (!origin || !token || !ticketId) return [];
  const tls = origin.startsWith("https://") ? " check-certificate=no" : "";
  const url = `${origin}/api/provision/${token}/hp-go.html?t=${encodeURIComponent(ticketId)}`;
  const missing = hardFail
    ? `:put "HotspotPro: CRITICAL — hp-go.html missing after download"; :log warning "HotspotPro: hp-go.html missing"; :error "hp-go missing"`
    : `:put "HotspotPro: hp-go.html not on router yet — will retry next check-in"; :log warning "HotspotPro: hp-go.html missing (soft)"`;
  return [
    `# HotspotPro auto-login page`,
    `:do { /file remove [find where name="hotspot/hp-go.html"] } on-error={ }`,
    `:do { /file remove [find where name="flash/hotspot/hp-go.html"] } on-error={ }`,
    `:do { /tool fetch url="${url}" dst-path=hotspot/hp-go.html${tls} } on-error={ :log warning "HotspotPro: hp-go fetch to hotspot/ failed" }`,
    `:do { /tool fetch url="${url}" dst-path=flash/hotspot/hp-go.html${tls} } on-error={ :log warning "HotspotPro: hp-go fetch to flash/hotspot/ failed" }`,
    `:do { :delay 1s } on-error={ }`,
    `:do { :local hpGo 0; :if ([:len [/file find where name="hotspot/hp-go.html"]] > 0) do={ :set hpGo 1 }; :if ([:len [/file find where name="flash/hotspot/hp-go.html"]] > 0) do={ :set hpGo 1 }; :if ($hpGo = 0) do={ ${missing} } else={ :put "HotspotPro: hp-go.html ready for Connect" } } on-error={ ${hardFail ? ':error "hp-go missing"' : ':log warning "HotspotPro: hp-go check failed"'} }`,
  ];
}
