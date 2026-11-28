// The HTML files a MikroTik hotspot serves from its own login folder.
// Like SopraEnt / Apaka: customers dial the voucher ON the router (POST to /login).
// Cloud mode → MikroTik asks HotspotPro RADIUS; local mode → /ip hotspot user.
// The website /portal is only for buying packages — optional link on the login page.
// Never serve MikroTik's factory skin. MikroTik replaces $(...) before the phone sees the page.

import { findRouterByToken, portalOrigin, publicOrigin, routerForToken } from "./provision";
import { getState } from "./store";
import { optionalRos } from "./routeros";

const TOKEN = /^[A-Za-z0-9_-]{8,128}$/;

export const HOTSPOT_PAGES = ["login.html", "rlogin.html", "alogin.html", "error.html", "logout.html", "redirect.html", "status.html", "locked.html"] as const;
export type HotspotPage = (typeof HOTSPOT_PAGES)[number];

type PortalLook = { pin: boolean; title: string; button: string; page: string };

function hexColor(value: unknown, fallback: string) {
  if (typeof value !== "string" || !/^#[0-9a-fA-F]{6}$/.test(value)) return fallback;
  // Migrate old black/white theme colours to the blue/white defaults.
  const lower = value.toLowerCase();
  if (lower === "#1a1a1a" || lower === "#111111" || lower === "#000000") return fallback;
  return value;
}

function plainText(value: unknown, fallback: string, limit = 48) {
  const text = typeof value === "string" ? value.replace(/[<>&"']/g, "").replace(/\s+/g, " ").trim().slice(0, limit) : "";
  return text || fallback;
}

/** Colors, title and login boxes saved on the captive portal page for this router. */
export function portalLook(token: string): PortalLook {
  const master = getState("masterPortal")?.value as { portalOverride?: boolean; config?: Record<string, unknown> } | undefined;
  const configs = getState("captivePortalConfigs")?.value as Record<string, Record<string, unknown>> | undefined;
  const router = findRouterByToken(token) as { ip?: string; siteId?: string | null; name?: string } | null;
  const key = router?.siteId || router?.ip || "";
  const own = key && configs ? configs[key] : undefined;
  const config = (master?.portalOverride ? master.config : own) ?? {};
  const fallback = (router?.name || "WiFi").replace(/[&<>"']/g, "");
  return {
    pin: config.authMethod === "PIN Only",
    title: plainText(config.businessNameOverride || config.logoText, fallback),
    button: hexColor(config.primaryColorOverride, "#2563eb"),
    page: hexColor(config.secondaryColorOverride, "#eff6ff"),
  };
}

/** One voucher box, or username and password, from the captive portal setting for this router. */
export function voucherOnlyLogin(token: string): boolean {
  return portalLook(token).pin;
}

/** Unique marker so we never treat MikroTik factory HTML or the old mini login as "ours". */
export const PORTAL_MARKER = "HotspotPro designed-portal";

/** Delete MikroTik factory portal files that lack our marker so phones cannot open the default skin.
 * Only wipe a folder when HotspotPro login.html already exists in the other path — never leave both empty (WinBox/phones show "not found"). */
export function removeFactoryPortalRos(): string {
  const wipe = (dir: string, other: string) =>
    `:local hpChk ""; :local hpOther ""; :do { :set hpChk [/file get [find where name="${dir}/login.html"] contents] } on-error={ }; :do { :set hpOther [/file get [find where name="${other}/login.html"] contents] } on-error={ }; :if ([:len [/file find where name="${dir}/login.html"]] > 0 && [:typeof [:find $hpChk "${PORTAL_MARKER}"]] != "num" && [:typeof [:find $hpOther "${PORTAL_MARKER}"]] = "num") do={ :foreach hpPg in={"login.html";"rlogin.html";"alogin.html";"error.html";"logout.html";"redirect.html";"status.html";"md5.js"} do={ :do { /file remove [find where name=("${dir}/" . $hpPg)] } on-error={ } } }`;
  return `${wipe("flash/hotspot", "hotspot")}; ${wipe("hotspot", "flash/hotspot")}`;
}

/** Prefer flash/hotspot only when that login.html is HotspotPro's — file existence alone can be factory HTML. */
export function pickHtmlDirectoryRos(): string {
  return `:local hpDir "hotspot"; :local hpFlash ""; :local hpHot ""; :do { :set hpFlash [/file get [find where name="flash/hotspot/login.html"] contents] } on-error={ }; :do { :set hpHot [/file get [find where name="hotspot/login.html"] contents] } on-error={ }; :if ([:typeof [:find $hpFlash "${PORTAL_MARKER}"]] = "num") do={ :set hpDir "flash/hotspot" } else={ :if ([:typeof [:find $hpHot "${PORTAL_MARKER}"]] = "num") do={ :set hpDir "hotspot" } }`;
}

/**
 * Point hotspotpro at HotspotPro login.html only — never MikroTik factory skin.
 * Also stamps WinBox comments and forces the HTTP login page (voucher form) for
 * the system captive-portal sheet.
 */
export function applyHtmlDirectoryRos(): string {
  return [
    removeFactoryPortalRos(),
    pickHtmlDirectoryRos(),
    // One property per set: RouterOS drops the whole set if any one is unknown, and html-directory is
    // what makes phones see the HotspotPro page instead of MikroTik's.
    `:do { /ip hotspot profile set [find where name=hotspotpro] html-directory=$hpDir } on-error={ :log warning "HotspotPro: hotspot profile rejected html-directory" }`,
    // html-directory-override does not exist on older RouterOS. Parsed at run time (optionalRos) so a
    // router without it skips just this command; the folder is handed over in a global.
    `:global hpHtmlDir; :set hpHtmlDir $hpDir`,
    optionalRos(`/ip hotspot profile set [find where name=hotspotpro] html-directory-override=$hpHtmlDir`, ["hpHtmlDir"]),
    // Only our server may answer — other servers still serve MikroTik defaults.
    `:do { /ip hotspot disable [find where name!="hotspotpro"] } on-error={ }`,
    `:do { /ip hotspot set [find where name=hotspotpro] disabled=no } on-error={ }`,
    `:do { /ip hotspot enable [find where name=hotspotpro] } on-error={ }`,
  ].join("; ");
}

export function loginPageStamp(token: string): string {
  const look = portalLook(token);
  const raw = `${look.pin ? "pin" : "user"}|${look.title}|${look.button}|${look.page}|site-check`;
  let hash = 0;
  for (let i = 0; i < raw.length; i += 1) hash = (hash * 33 + raw.charCodeAt(i)) >>> 0;
  // Bump prefix whenever the install/detect marker or login HTML shape changes so routers re-download pages.
  return `v27-${hash.toString(16)}`;
}

/** Text written into every HotspotPro page (except locked.html) and searched for by the check-in. */
export function stampComment(token: string): string {
  return `hp-stamp:${loginPageStamp(token)}`;
}

/** Files that make the hotspot folder a skin WinBox can open: the stylesheet and the CHAP helper. */
export function hotspotAsset(file: string): Response | null {
  if (file === "md5.js") {
    return new Response(`${MD5_JS}\n`, { headers: { "Content-Type": "text/javascript; charset=utf-8", "Cache-Control": "no-store" } });
  }
  if (file === "hotspotpro.css") {
    return new Response(`${SKIN_CSS}\n`, { headers: { "Content-Type": "text/css; charset=utf-8", "Cache-Control": "no-store" } });
  }
  return null;
}

const SKIN_CSS = `body{margin:0;background:#eff6ff;color:#1e3a8a;font-family:system-ui,sans-serif}main{max-width:420px;margin:0 auto;padding:36px 20px}h1{font-size:32px;line-height:1.1;margin:0}p{color:#3b82f6;line-height:1.5}form{margin-top:24px;background:#fff;border:1px solid #bfdbfe;border-radius:18px;padding:18px}input{width:100%;box-sizing:border-box;margin-top:10px;border:1px solid #93c5fd;border-radius:12px;padding:14px;font-size:16px}button{width:100%;margin-top:14px;border:0;border-radius:12px;background:#2563eb;color:#fff;padding:14px;font-size:16px;font-weight:700}a{color:#2563eb;font-weight:700}`;

// hexMD5 is the name MikroTik's hotspot skin calls. Checked against Node's MD5.
const MD5_JS = `function hexMD5(s){function add(x,y){return(x+y)|0}function rol(n,c){return(n<<c)|(n>>>(32-c))}function cmn(q,a,b,x,s,t){a=add(add(a,q),add(x,t));return add(rol(a,s),b)}function ff(a,b,c,d,x,s,t){return cmn((b&c)|(~b&d),a,b,x,s,t)}function gg(a,b,c,d,x,s,t){return cmn((b&d)|(c&~d),a,b,x,s,t)}function hh(a,b,c,d,x,s,t){return cmn(b^c^d,a,b,x,s,t)}function ii(a,b,c,d,x,s,t){return cmn(c^(b|~d),a,b,x,s,t)}var n=s.length,words=[],i;for(i=0;i<n;i++)words[i>>2]=(words[i>>2]||0)|(s.charCodeAt(i)<<((i%4)*8));words[n>>2]=(words[n>>2]||0)|(128<<((n%4)*8));words[(((n+8)>>6)<<4)+14]=n*8;var a=1732584193,b=-271733879,c=-1732584194,d=271733878;for(i=0;i<words.length;i+=16){var oa=a,ob=b,oc=c,od=d,w=function(k){return words[i+k]||0};a=ff(a,b,c,d,w(0),7,-680876936);d=ff(d,a,b,c,w(1),12,-389564586);c=ff(c,d,a,b,w(2),17,606105819);b=ff(b,c,d,a,w(3),22,-1044525330);a=ff(a,b,c,d,w(4),7,-176418897);d=ff(d,a,b,c,w(5),12,1200080426);c=ff(c,d,a,b,w(6),17,-1473231341);b=ff(b,c,d,a,w(7),22,-45705983);a=ff(a,b,c,d,w(8),7,1770035416);d=ff(d,a,b,c,w(9),12,-1958414417);c=ff(c,d,a,b,w(10),17,-42063);b=ff(b,c,d,a,w(11),22,-1990404162);a=ff(a,b,c,d,w(12),7,1804603682);d=ff(d,a,b,c,w(13),12,-40341101);c=ff(c,d,a,b,w(14),17,-1502002290);b=ff(b,c,d,a,w(15),22,1236535329);a=gg(a,b,c,d,w(1),5,-165796510);d=gg(d,a,b,c,w(6),9,-1069501632);c=gg(c,d,a,b,w(11),14,643717713);b=gg(b,c,d,a,w(0),20,-373897302);a=gg(a,b,c,d,w(5),5,-701558691);d=gg(d,a,b,c,w(10),9,38016083);c=gg(c,d,a,b,w(15),14,-660478335);b=gg(b,c,d,a,w(4),20,-405537848);a=gg(a,b,c,d,w(9),5,568446438);d=gg(d,a,b,c,w(14),9,-1019803690);c=gg(c,d,a,b,w(3),14,-187363961);b=gg(b,c,d,a,w(8),20,1163531501);a=gg(a,b,c,d,w(13),5,-1444681467);d=gg(d,a,b,c,w(2),9,-51403784);c=gg(c,d,a,b,w(7),14,1735328473);b=gg(b,c,d,a,w(12),20,-1926607734);a=hh(a,b,c,d,w(5),4,-378558);d=hh(d,a,b,c,w(8),11,-2022574463);c=hh(c,d,a,b,w(11),16,1839030562);b=hh(b,c,d,a,w(14),23,-35309556);a=hh(a,b,c,d,w(1),4,-1530992060);d=hh(d,a,b,c,w(4),11,1272893353);c=hh(c,d,a,b,w(7),16,-155497632);b=hh(b,c,d,a,w(10),23,-1094730640);a=hh(a,b,c,d,w(13),4,681279174);d=hh(d,a,b,c,w(0),11,-358537222);c=hh(c,d,a,b,w(3),16,-722521979);b=hh(b,c,d,a,w(6),23,76029189);a=hh(a,b,c,d,w(9),4,-640364487);d=hh(d,a,b,c,w(12),11,-421815835);c=hh(c,d,a,b,w(15),16,530742520);b=hh(b,c,d,a,w(2),23,-995338651);a=ii(a,b,c,d,w(0),6,-198630844);d=ii(d,a,b,c,w(7),10,1126891415);c=ii(c,d,a,b,w(14),15,-1416354905);b=ii(b,c,d,a,w(5),21,-57434055);a=ii(a,b,c,d,w(12),6,1700485571);d=ii(d,a,b,c,w(3),10,-1894986606);c=ii(c,d,a,b,w(10),15,-1051523);b=ii(b,c,d,a,w(1),21,-2054922799);a=ii(a,b,c,d,w(8),6,1873313359);d=ii(d,a,b,c,w(15),10,-30611744);c=ii(c,d,a,b,w(6),15,-1560198380);b=ii(b,c,d,a,w(13),21,1309151649);a=ii(a,b,c,d,w(4),6,-145523070);d=ii(d,a,b,c,w(11),10,-1120210379);c=ii(c,d,a,b,w(2),15,718787259);b=ii(b,c,d,a,w(9),21,-343485551);a=add(a,oa);b=add(b,ob);c=add(c,oc);d=add(d,od)}function rhex(v){var h="",j;for(j=0;j<4;j++)h+=((v>>>(j*8)&255)+256).toString(16).slice(1);return h}return rhex(a)+rhex(b)+rhex(c)+rhex(d)}`;

const SUCCESS_URL = "https://www.google.com/";

/**
 * On-router voucher dial (Apaka / SopraEnt style).
 * Posts username/password to MikroTik $(link-login-only) → local users or cloud RADIUS.
 * "Buy a package" opens the website portal; it is not required for dialing.
 */
function onRouterLoginForm(buyUrl: string, look: PortalLook, title: string, errorHint = ""): string {
  const mark = `<!-- ${PORTAL_MARKER} -->`;
  const safeBuy = buyUrl.replace(/"/g, "");
  const pin = look.pin;
  const fields = pin
    ? `<label>Voucher code</label><input name="username" type="text" autocomplete="username" autocapitalize="off" spellcheck="false" required placeholder="Enter voucher"><input type="hidden" name="password" value="">`
    : `<label>Username</label><input name="username" type="text" autocomplete="username" autocapitalize="off" spellcheck="false" required placeholder="Voucher code"><label>Password</label><input name="password" type="password" autocomplete="current-password" required placeholder="Password">`;
  const err = errorHint
    ? `<p class="err">${errorHint}</p>`
    : "";
  // PAP always works for plain forms; CHAP when chap-id is present (md5.js).
  return `<!DOCTYPE html><html>${mark}<head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><meta http-equiv="pragma" content="no-cache"><title>${title}</title><link rel="stylesheet" href="hotspotpro.css"><script src="md5.js"></script><style>body{margin:0;background:${look.page};color:#1e3a8a;font-family:system-ui,sans-serif}main{max-width:420px;margin:0 auto;padding:36px 18px}h1{font-size:28px;line-height:1.15;margin:0 0 8px}p{color:#3b82f6;line-height:1.45;font-size:14px;margin:0 0 14px}.err{color:#b42318;background:#fef3f2;border:1px solid #fecdca;border-radius:10px;padding:10px 12px;font-weight:600}form{margin-top:8px;background:#fff;border:1px solid #bfdbfe;border-radius:18px;padding:18px}label{display:block;margin-top:10px;font-size:13px;font-weight:600;color:#1e3a8a}input{width:100%;box-sizing:border-box;margin-top:6px;border:1px solid #93c5fd;border-radius:12px;padding:14px;font-size:16px}button{width:100%;margin-top:16px;border:0;border-radius:12px;background:${look.button};color:#fff;padding:14px;font-size:16px;font-weight:700}a.buy{display:block;margin-top:16px;text-align:center;color:#2563eb;font-weight:700;text-decoration:none}</style><script>function doLogin(){var f=document.forms.login;if(!f)return true;var u=f.username,p=f.password;if(p&&!p.value&&u&&u.value)p.value=u.value;var chapId=f['chap-id'],chapCh=f['chap-challenge'];if(chapId&&chapId.value&&chapCh&&chapCh.value&&typeof hexMD5==='function'){var h=document.createElement('input');h.type='hidden';h.name='password';h.value=hexMD5(chapId.value+p.value+chapCh.value);p.parentNode.removeChild(p);f.appendChild(h)}return true}</script></head><body><main><h1>${title}</h1><p>Enter your voucher to get online.</p>${err}<form name="login" method="post" action="$(link-login-only)" onsubmit="return doLogin()"><input type="hidden" name="dst" value="$(link-orig-esc)"><input type="hidden" name="popup" value="false"><input type="hidden" name="chap-id" value="$(chap-id)"><input type="hidden" name="chap-challenge" value="$(chap-challenge)">${fields}<button type="submit">Connect</button></form><a class="buy" href="${safeBuy}">Buy a package</a></main></body></html>\n`;
}

/** How long the login page waits for the website before showing the on-router voucher form. */
export const SITE_CHECK_MS = 2000;

/**
 * The site portal first, with the router form as the fallback: phones go to the website /portal (buy
 * or enter a voucher there; it hands the login back to this router). The page stays blank (no
 * "Opening…" text) while it checks the site answers, which usually takes a fraction of a second,
 * then opens it. If the site does not answer within SITE_CHECK_MS (the router's internet is down,
 * the site is blocked), the on-router voucher form shows instead, so a customer can always dial a
 * voucher. Without JavaScript the form shows straight away.
 */
function sitePortalFirst(portalUrl: string, look: PortalLook, title: string, hint = ""): string {
  const url = portalUrl.replace(/["<>\\]/g, "");
  const origin = url.split("/").slice(0, 3).join("/");
  const script = `<script>(function(){var u="${url}",done=false;function show(){if(done)return;done=true;var m=document.getElementById("hp-form");if(m)m.style.display="block"}function go(){if(done)return;done=true;location.replace(u)}if(!window.fetch){go();return}setTimeout(show,${SITE_CHECK_MS});fetch("${origin}/favicon.ico",{mode:"no-cors",cache:"no-store"}).then(go,show)})();</script>`;
  return onRouterLoginForm(portalUrl, look, title, hint)
    .replace("<body><main>", `<body><noscript><style>#hp-form{display:block!important}</style></noscript><main id="hp-form" style="display:none">`)
    .replace("</body>", `${script}</body>`);
}

function pageBody(page: HotspotPage, portal: string, look: PortalLook): string {
  const title = look.title || "HotspotPro";
  const mark = `<!-- ${PORTAL_MARKER} -->`;
  const portalUrl = `${portal}&login=$(link-login-only)&dst=${encodeURIComponent(SUCCESS_URL)}`;
  switch (page) {
    case "login.html":
    case "rlogin.html":
      return sitePortalFirst(portalUrl, look, title);
    case "alogin.html":
      return `<!DOCTYPE html><html>${mark}<head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><meta http-equiv="refresh" content="1;url=${SUCCESS_URL}"><meta http-equiv="pragma" content="no-cache"><title>Login successful</title><style>body{margin:0;background:${look.page};color:#2563eb;font-family:system-ui,sans-serif}main{max-width:420px;margin:40px auto;padding:28px 18px;text-align:center}.ok{background:#ecfdf3;border:1px solid #abefc6;color:#067647;border-radius:12px;padding:16px;font-weight:700}a{color:#2563eb;font-weight:700}</style></head><body><main><div class="ok">Login successful! You are connected to the internet.</div><p>Opening Google…</p><p><a href="${SUCCESS_URL}">Continue to Google</a></p></main></body></html>\n`;
    case "error.html":
      return onRouterLoginForm(portalUrl, look, title, "That voucher did not work. Check the code and try again.");
    case "logout.html":
      return sitePortalFirst(portalUrl, look, title, "Signed out. Enter a voucher to connect again.");
    case "redirect.html":
      return `<html>${mark}<head><meta http-equiv="refresh" content="0; url=${SUCCESS_URL}"><meta http-equiv="pragma" content="no-cache"></head><body><a href="${SUCCESS_URL}">Continue</a></body></html>\n`;
    case "status.html":
      return `<html>${mark}<head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><meta http-equiv="pragma" content="no-cache"><title>You are online</title><style>body{margin:0;background:#eff6ff;color:#2563eb;font-family:system-ui,sans-serif}main{max-width:420px;margin:0 auto;padding:36px 20px}p{color:#3b82f6;line-height:1.5}a{color:#2563eb;font-weight:700}.ok{background:#ecfdf3;border:1px solid #abefc6;color:#067647;border-radius:12px;padding:12px 14px;margin:14px 0;font-weight:700}</style></head><body><main><div class="ok">Login successful! You are connected to the internet.</div><h1>You are online</h1><p>$(username)</p><p>Data left: $(remain-bytes-total)</p><p><a href="${SUCCESS_URL}">Open Google</a></p><p><a href="$(link-logout)">Log out</a></p></main></body></html>\n`;
    case "locked.html":
      return `<html>${mark}<head><meta http-equiv="pragma" content="no-cache"></head><body style="font-family:sans-serif;text-align:center;padding:48px"><h2>This network is locked</h2><p>Online access has not been paid. The operator must renew HotspotPro before anyone can get online.</p></body></html>\n`;
  }
}

export function hotspotHtml(page: string, request: Request, token: string): Response {
  if (!TOKEN.test(token) || !routerForToken(token)) return new Response("unknown\n", { status: 404 });
  if (!HOTSPOT_PAGES.includes(page as HotspotPage)) return new Response("unknown\n", { status: 404 });
  // Escaped MikroTik variables, so the router address survives as one query parameter.
  const portal = `${portalOrigin(publicOrigin(request))}/portal?rt=${token}`;
  let html = pageBody(page as HotspotPage, portal, portalLook(token));
  // The stamp lets the check-in see that the router already has THIS version of the pages (it is
  // stored in the file, so it survives reboots). locked.html never carries it, so unlocking refetches.
  if (page !== "locked.html") html = html.replace("<html>", `<html><!-- ${stampComment(token)} -->`);
  return new Response(html, { headers: { "Content-Type": "text/html; charset=utf-8", "Cache-Control": "no-store" } });
}
