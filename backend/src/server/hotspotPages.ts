// The HTML files a MikroTik hotspot serves from its own login folder.
// login.html is the captive portal: the phone posts the voucher straight to the
// router, so connecting does not wait on the website. MikroTik replaces $(...)
// before the phone sees the page.

import { findRouterByToken, portalOrigin, publicOrigin, routerForToken } from "./provision";
import { getState } from "./store";

const TOKEN = /^[A-Za-z0-9_-]{8,128}$/;

export const HOTSPOT_PAGES = ["login.html", "alogin.html", "error.html", "logout.html", "redirect.html", "status.html", "locked.html"] as const;
export type HotspotPage = (typeof HOTSPOT_PAGES)[number];

/** One voucher box, or username and password, from the captive portal setting for this router. */
export function voucherOnlyLogin(token: string): boolean {
  const master = getState("masterPortal")?.value as { portalOverride?: boolean; config?: { authMethod?: string } } | undefined;
  if (master?.portalOverride) return master.config?.authMethod === "PIN Only";
  const configs = getState("captivePortalConfigs")?.value as Record<string, { authMethod?: string }> | undefined;
  const router = findRouterByToken(token) as { ip?: string; siteId?: string | null } | null;
  const key = router?.siteId || router?.ip || "";
  const own = key && configs ? configs[key] : undefined;
  return own?.authMethod === "PIN Only";
}

export function loginPageStamp(token: string): string {
  return voucherOnlyLogin(token) ? "v4-pin" : "v4-user";
}

function pageBody(page: HotspotPage, portal: string, title: string, oneLogin: boolean): string {
  const fields = oneLogin
    ? `<input name="username" required autocomplete="username" placeholder="Voucher code" oninput="this.form.password.value=this.value"><input type="hidden" name="password">`
    : `<input name="username" required autocomplete="username" placeholder="Username"><input name="password" required type="password" autocomplete="current-password" placeholder="Password">`;
  const note = oneLogin
    ? "Enter your voucher code. You can leave and come back with the same code until the time and data are finished."
    : "Enter your username and password. You can leave and come back until the time and data are finished.";
  const submit = oneLogin ? ` onsubmit="this.password.value=this.username.value"` : "";
  switch (page) {
    case "login.html":
      return `<!DOCTYPE html><html><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><meta http-equiv="pragma" content="no-cache"><title>${title}</title><style>body{margin:0;background:#f7f7f7;color:#1a1a1a;font-family:system-ui,sans-serif}main{max-width:420px;margin:0 auto;padding:36px 20px}h1{font-size:32px;line-height:1.1;margin:0}p{color:#525252;line-height:1.5}form{margin-top:24px;background:#fff;border:1px solid #e6e6e6;border-radius:18px;padding:18px}input{width:100%;box-sizing:border-box;margin-top:10px;border:1px solid #d4d4d4;border-radius:12px;padding:14px;font-size:16px}button{width:100%;margin-top:14px;border:0;border-radius:12px;background:#1a1a1a;color:#fff;padding:14px;font-size:16px;font-weight:700}a{color:#1a1a1a;font-weight:700}</style></head><body><main><h1>${title}</h1><p>${note} Connection starts on this router, so it is immediate.</p><form method="post" action="$(link-login-only)"${submit}>${fields}<input type="hidden" name="dst" value="$(link-orig)"><button type="submit">Connect</button></form><p><a href="${portal}">Buy a package</a></p></main></body></html>\n`;
    case "alogin.html":
      return `<html><head><meta http-equiv="refresh" content="0; url=$(link-redirect)"><meta http-equiv="pragma" content="no-cache"></head><body>You are online. <a href="$(link-redirect)">Continue</a></body></html>\n`;
    case "error.html":
      return `<!DOCTYPE html><html><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>Could not connect</title><style>body{margin:0;background:#f7f7f7;color:#1a1a1a;font-family:system-ui,sans-serif}main{max-width:420px;margin:0 auto;padding:36px 20px}a{color:#1a1a1a;font-weight:700}</style></head><body><main><h1>Could not connect</h1><p>$(error)</p><p><a href="$(link-login)">Try the voucher again</a></p></main></body></html>\n`;
    case "logout.html":
      return `<html><head><meta http-equiv="refresh" content="1; url=$(link-login)"><meta http-equiv="pragma" content="no-cache"></head><body>You are signed out. <a href="$(link-login)">Log in</a></body></html>\n`;
    case "redirect.html":
      return `<html><head><meta http-equiv="refresh" content="0; url=$(link-redirect)"><meta http-equiv="pragma" content="no-cache"></head><body></body></html>\n`;
    case "status.html":
      return `<html><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><meta http-equiv="pragma" content="no-cache"><title>You are online</title><style>body{margin:0;background:#f7f7f7;color:#1a1a1a;font-family:system-ui,sans-serif}main{max-width:420px;margin:0 auto;padding:36px 20px}p{color:#525252;line-height:1.5}a{color:#1a1a1a;font-weight:700}</style></head><body><main><h1>You are online</h1><p>$(username)</p><p>Data left: $(remain-bytes-total)</p><p>You can disconnect and reconnect with this same voucher until the time and the data are both finished.</p><p><a href="$(link-logout)">Log out</a></p></main></body></html>\n`;
    case "locked.html":
      return `<html><head><meta http-equiv="pragma" content="no-cache"></head><body style="font-family:sans-serif;text-align:center;padding:48px"><h2>This network is locked</h2><p>Online access has not been paid. The operator must renew HotspotPro before anyone can get online.</p></body></html>\n`;
  }
}

export function hotspotHtml(page: string, request: Request, token: string): Response {
  if (!TOKEN.test(token) || !routerForToken(token)) return new Response("unknown\n", { status: 404 });
  if (!HOTSPOT_PAGES.includes(page as HotspotPage)) return new Response("unknown\n", { status: 404 });
  // Escaped MikroTik variables, so the router address survives as one query parameter.
  const portal = `${portalOrigin(publicOrigin(request))}/portal?rt=${token}`;
  const name = (routerForToken(token)?.name || "WiFi").replace(/[&<>"]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" })[c] ?? c);
  const html = pageBody(page as HotspotPage, portal, name, voucherOnlyLogin(token));
  return new Response(html, { headers: { "Content-Type": "text/html; charset=utf-8", "Cache-Control": "no-store" } });
}
