// The HTML files a MikroTik hotspot serves from its own login folder.
// MikroTik replaces $(...) before the phone sees the page. login.html only
// forwards to the HotspotPro portal; the other files are what the router shows
// after the portal posts the voucher back (success, failure, logout, redirect).
// A hotspot directory that only contains login.html leaves the customer on a
// blank page once the voucher has been accepted.

import { portalOrigin, publicOrigin, routerForToken } from "./provision";

const TOKEN = /^[A-Za-z0-9_-]{8,128}$/;

export const HOTSPOT_PAGES = ["login.html", "alogin.html", "error.html", "logout.html", "redirect.html", "status.html", "locked.html"] as const;
export type HotspotPage = (typeof HOTSPOT_PAGES)[number];

function pageBody(page: HotspotPage, portal: string): string {
  switch (page) {
    case "login.html":
      return `<html><head><meta http-equiv="refresh" content="0; url=${portal}"><meta http-equiv="pragma" content="no-cache"></head><body>Redirecting to the login page... <a href="${portal}">Tap here if nothing happens</a></body></html>\n`;
    case "alogin.html":
      return `<html><head><meta http-equiv="refresh" content="0; url=$(link-redirect)"><meta http-equiv="pragma" content="no-cache"></head><body>You are online. <a href="$(link-redirect)">Continue</a></body></html>\n`;
    case "error.html":
      return `<html><head><meta http-equiv="pragma" content="no-cache"></head><body><h2>Could not log in</h2><p>$(error)</p><p><a href="$(link-login)">Try again</a></p></body></html>\n`;
    case "logout.html":
      return `<html><head><meta http-equiv="refresh" content="1; url=$(link-login)"><meta http-equiv="pragma" content="no-cache"></head><body>You are signed out. <a href="$(link-login)">Log in</a></body></html>\n`;
    case "redirect.html":
      return `<html><head><meta http-equiv="refresh" content="0; url=$(link-redirect)"><meta http-equiv="pragma" content="no-cache"></head><body></body></html>\n`;
    case "status.html":
      return `<html><head><meta http-equiv="pragma" content="no-cache"></head><body><h2>You are online</h2><p>$(username)</p><p><a href="$(link-logout)">Log out</a></p></body></html>\n`;
    case "locked.html":
      return `<html><head><meta http-equiv="pragma" content="no-cache"></head><body style="font-family:sans-serif;text-align:center;padding:48px"><h2>This network is locked</h2><p>Online access has not been paid. The operator must renew HotspotPro before anyone can get online.</p></body></html>\n`;
  }
}

export function hotspotHtml(page: string, request: Request, token: string): Response {
  if (!TOKEN.test(token) || !routerForToken(token)) return new Response("unknown\n", { status: 404 });
  if (!HOTSPOT_PAGES.includes(page as HotspotPage)) return new Response("unknown\n", { status: 404 });
  // Escaped MikroTik variables, so the router address survives as one query parameter.
  const portal = `${portalOrigin(publicOrigin(request))}/portal?rt=${token}&login=$(link-login-only-esc)&mac=$(mac-esc)&dst=$(link-orig-esc)`;
  const html = pageBody(page as HotspotPage, portal);
  return new Response(html, { headers: { "Content-Type": "text/html; charset=utf-8", "Cache-Control": "no-store" } });
}
