// Apply the site's WiFi SSID on a live MikroTik.
// Used on check-in and when the owner saves captive portal Network settings.
// Radios must sit on hotspotpro-bridge (ROS7 datapath.bridge) or phones never
// hit the captive portal after joining the SSID.

import { applyHtmlDirectoryRos } from "./hotspotPages";
import { hotspotProfileEnsureLine, hotspotServerEnsureLine } from "./hotspotEnsure";
import { HOTSPOT_LOGIN_BY, optionalRos } from "./routeros";
import { getState } from "./store";

function cleanSsid(value: string | undefined) {
  const ssid = (value || "").trim().slice(0, 32);
  if (!ssid || /[\\"$\r\n]/.test(ssid)) return "";
  return ssid;
}

/** Stock placeholders — never prefer these over a name the owner typed. */
export function isPlaceholderSsid(value: string | undefined) {
  const n = (value || "")
    .trim()
    .toLowerCase()
    .replace(/[-_]+/g, " ")
    .replace(/\s+/g, " ");
  return !n || n === "hotspotpro" || n === "hotspotpro wifi" || n === "hotspotprowifi";
}

function quote(value: string) {
  return `"${value.replace(/[\\"$\r\n]/g, "")}"`;
}

/** Look up the SSID this router should broadcast from captive portal / hotspot settings. */
export function ssidForRouter(router: {
  ip?: string;
  siteId?: string | null;
  name?: string;
  wifiSsid?: string | null;
}): string {
  const fromRouter = cleanSsid(router.wifiSsid || "");
  if (fromRouter && !isPlaceholderSsid(fromRouter)) return fromRouter;

  const configs = getState("captivePortalConfigs")?.value as Record<string, { ssid?: string }> | undefined;
  const key = router.siteId || router.ip || "";
  const fromSite = (key && configs?.[key]?.ssid ? configs[key].ssid : "").trim();
  if (fromSite && !isPlaceholderSsid(fromSite)) return fromSite.slice(0, 32);

  const hotspot = getState("hotspotSettings")?.value as { ssid?: string; ssidStrategy?: string } | undefined;
  if (hotspot?.ssidStrategy === "same" && hotspot.ssid?.trim() && !isPlaceholderSsid(hotspot.ssid)) {
    return hotspot.ssid.trim().slice(0, 32);
  }

  // Fallback: router name the owner gave — not "HotspotPro WiFi".
  const fromName = (router.name || "").replace(/[^\w\s-]/g, "").trim().slice(0, 32);
  return fromName || "HotspotPro";
}

/**
 * Put every radio on the hotspot bridge so clients hit the captive portal.
 * ROS7 wifi / wifiwave2: use datapath.bridge only (do not also add as a bridge port).
 * Legacy wireless: use bridge ports.
 */
export function bridgeWifiLines(): string[] {
  // Each command is parsed at run time (optionalRos): a router has only one of these menus, and a
  // missing menu used to be a syntax error that stopped the whole check-in.
  return [
    // Pull radios off the factory LAN bridge first — that is what gives free internet.
    optionalRos(`:foreach p in=[/interface wifi find] do={ :local n [/interface wifi get $p name]; :do { /interface bridge port remove [find where interface=$n] } on-error={ } }`),
    optionalRos(`:foreach p in=[/interface wifiwave2 find] do={ :local n [/interface wifiwave2 get $p name]; :do { /interface bridge port remove [find where interface=$n] } on-error={ } }`),
    // RouterOS 7 wifi package (hAP ax / ax S): datapath.bridge is what feeds Hotspot.
    optionalRos(`:foreach p in=[/interface wifi find] do={ :do { /interface wifi set $p disabled=no configuration.mode=ap security.authentication-types="" datapath.bridge=hotspotpro-bridge } on-error={ } }`),
    // Older ROS7 wifiwave2 name
    optionalRos(`:foreach p in=[/interface wifiwave2 find] do={ :do { /interface wifiwave2 set $p disabled=no configuration.mode=ap security.authentication-types="" datapath.bridge=hotspotpro-bridge } on-error={ } }`),
    // Legacy wireless package still needs a bridge port
    optionalRos(`:foreach p in=[/interface wireless find] do={ :local n [/interface wireless get $p name]; :do { /interface wireless set $p disabled=no mode=ap-bridge comment="HotspotPro: guest WiFi" } on-error={ }; :do { /interface bridge port remove [find where interface=$n] } on-error={ }; :do { /interface bridge port add bridge=hotspotpro-bridge interface=$n comment="HotspotPro: guest WiFi port" } on-error={ } }`),
    optionalRos(`/interface wifi enable [find]`),
    optionalRos(`/interface wifiwave2 enable [find]`),
    optionalRos(`/interface wireless enable [find]`),
  ];
}

/**
 * Cheap every-check-in guard: if any radio drifted off hotspotpro-bridge (factory
 * bridge / empty datapath), phones get Wi‑Fi with no captive portal. Re-bind only
 * when wrong — safe to run every 10s.
 */
export function ensureWifiOnHotspotBridgeLines(): string[] {
  return [
    `# HotspotPro: keep radios on hotspotpro-bridge (captive portal)`,
    // One run-time-parsed command per menu, so a router without wifiwave2 (all of 7.13+) or without
    // the wifi package still checks the radios it does have.
    optionalRos(`:foreach p in=[/interface wifi find] do={ :local b ""; :do { :set b [/interface wifi get $p datapath.bridge] } on-error={ }; :if ($b != "hotspotpro-bridge") do={ :do { /interface wifi set $p disabled=no configuration.mode=ap security.authentication-types="" datapath.bridge=hotspotpro-bridge } on-error={ }; :local n [/interface wifi get $p name]; :do { /interface bridge port remove [find where interface=$n] } on-error={ }; :put "HotspotPro: WiFi re-bound to hotspotpro-bridge (captive portal)" } }`),
    optionalRos(`:foreach p in=[/interface wifiwave2 find] do={ :local b ""; :do { :set b [/interface wifiwave2 get $p datapath.bridge] } on-error={ }; :if ($b != "hotspotpro-bridge") do={ :do { /interface wifiwave2 set $p disabled=no configuration.mode=ap security.authentication-types="" datapath.bridge=hotspotpro-bridge } on-error={ }; :local n [/interface wifiwave2 get $p name]; :do { /interface bridge port remove [find where interface=$n] } on-error={ }; :put "HotspotPro: WiFi re-bound to hotspotpro-bridge (captive portal)" } }`),
    optionalRos(`:foreach p in=[/interface wireless find] do={ :local n [/interface wireless get $p name]; :local onHp [:len [/interface bridge port find where interface=$n bridge=hotspotpro-bridge]]; :if ($onHp = 0) do={ :do { /interface wireless set $p disabled=no mode=ap-bridge } on-error={ }; :do { /interface bridge port remove [find where interface=$n] } on-error={ }; :do { /interface bridge port add bridge=hotspotpro-bridge interface=$n comment="HotspotPro" } on-error={ }; :put "HotspotPro: WiFi re-bound to hotspotpro-bridge (captive portal)" } }`),
  ];
}

/**
 * Create the HotspotPro server + profile + bridge pieces if Servers is empty.
 * Stepwise profile/server create (ROS 7.2x rejects some one-line adds).
 */
export function ensureHotspotServerLines(dnsName = "wifi"): string[] {
  const dns = (dnsName || "wifi")
    .toLowerCase()
    .replace(/[^a-z0-9.-]/g, "")
    .replace(/^\.+|\.+$/g, "")
    .replace(/\.{2,}/g, ".")
    .slice(0, 48) || "wifi";
  return [
    `# Ensure HotspotPro hotspot server exists (Servers tab must not be empty)`,
    `:do { :if ([:len [/interface bridge find where name=hotspotpro-bridge]] = 0) do={ /interface bridge add name=hotspotpro-bridge comment="HotspotPro: guest bridge" } } on-error={ }`,
    `:do { /interface bridge set [find where name=hotspotpro-bridge] comment="HotspotPro: guest bridge" } on-error={ }`,
    `:do { /interface list member add list=LAN interface=hotspotpro-bridge comment="HotspotPro: guest on LAN" } on-error={ }`,
    // Keep comment="HotspotPro" on gateway/DHCP network — other scripts find them by exact comment.
    `:do { :if ([:len [/ip address find where comment="HotspotPro" interface=hotspotpro-bridge]] = 0) do={ /ip address add address=10.10.0.1/16 interface=hotspotpro-bridge comment="HotspotPro" } } on-error={ }`,
    `:do { :if ([:len [/ip pool find where name=hotspotpro-pool]] = 0) do={ /ip pool add name=hotspotpro-pool ranges=10.10.0.2-10.10.3.254 comment="HotspotPro: guest pool" } else={ /ip pool set [find where name=hotspotpro-pool] comment="HotspotPro: guest pool" } } on-error={ }`,
    `:do { :if ([:len [/ip dhcp-server network find where comment="HotspotPro"]] = 0) do={ /ip dhcp-server network add address=10.10.0.0/16 gateway=10.10.0.1 dns-server=10.10.0.1 comment="HotspotPro" } } on-error={ }`,
    // Gateway + DNS = the bridge's real address (custom / 10.77 networks are not 10.10.0.1).
    `:do { :local a ""; :do { :set a [/ip address get [find where interface=hotspotpro-bridge comment="HotspotPro"] address] } on-error={ }; :if ([:len $a] = 0) do={ :do { :set a [/ip address get [find where interface=hotspotpro-bridge] address] } on-error={ } }; :if ([:len $a] > 0) do={ :local g [:pick $a 0 [:find $a "/"]]; /ip dhcp-server network set [find where comment="HotspotPro"] dns-server=$g gateway=$g } } on-error={ }`,
    `:do { :if ([:len [/ip dhcp-server find where name=hotspotpro-dhcp]] = 0) do={ /ip dhcp-server add name=hotspotpro-dhcp interface=hotspotpro-bridge address-pool=hotspotpro-pool disabled=no comment="HotspotPro: guest DHCP" } else={ /ip dhcp-server set [find where name=hotspotpro-dhcp] comment="HotspotPro: guest DHCP" } } on-error={ }`,
    `:do { /ip dhcp-server enable [find where name=hotspotpro-dhcp] } on-error={ }`,
    // Profile first without html-directory (folder may not exist yet).
    // On create only: default use-radius=no. Never force use-radius=no on set — that wiped cloud RADIUS
    // every check-in and made voucher dial bounce (no local user + RADIUS off).
    hotspotProfileEnsureLine({
      onCreate: ["hotspot-address=10.10.0.1", "use-radius=no"],
      always: [`login-by=${HOTSPOT_LOGIN_BY}`, "trial-uptime-limit=0s", "open-status-page=http-login", `comment="HotspotPro: captive portal (voucher login)"`],
    }),
    // Keep hotspot-address = live bridge IP (custom LAN is not always 10.10.0.1).
    `:do { :local a ""; :do { :set a [/ip address get [find where interface=hotspotpro-bridge comment="HotspotPro"] address] } on-error={ }; :if ([:len $a] = 0) do={ :do { :set a [/ip address get [find where interface=hotspotpro-bridge] address] } on-error={ } }; :if ([:len $a] > 0) do={ :local g [:pick $a 0 [:find $a "/"]]; /ip hotspot profile set [find where name=hotspotpro] hotspot-address=$g } } on-error={ }`,
    // DNS Name alone — WinBox Server Profiles column; do not bundle with use-radius.
    `:do { /ip hotspot profile set [find where name=hotspotpro] dns-name=${dns} } on-error={ :log warning "HotspotPro: dns-name set failed" }`,
    `:do { /ip hotspot profile set [find where name=hotspotpro] login-by=${HOTSPOT_LOGIN_BY} } on-error={ }`,
    `:do { ${applyHtmlDirectoryRos()} } on-error={ }`,
    hotspotServerEnsureLine({ comment: "HotspotPro: captive portal server" }),
    `:do { /ip hotspot disable [find where name!="hotspotpro"] } on-error={ }`,
    `:do { /ip hotspot enable [find where name=hotspotpro] } on-error={ }`,
    `:do { :if ([:len [/ip hotspot find where name=hotspotpro]] = 0) do={ :put "HotspotPro: CRITICAL — Servers is still empty" } } on-error={ }`,
  ];
}

/**
 * Stop factory LAN / IPv6 paths that let phones get online without the hotspot.
 * Leaves HotspotPro NAT and HotspotPro DHCP alone.
 */
export function sealCaptivePortalLeakLines(): string[] {
  return [
    `# HotspotPro: seal free-internet leaks past the voucher portal`,
    `:do { /ip hotspot set [find where name=hotspotpro] interface=hotspotpro-bridge disabled=no addresses-per-mac=1 } on-error={ }`,
    `:do { /ip hotspot set [find where name=hotspotpro] comment="HotspotPro: captive portal server" } on-error={ }`,
    `:do { /ip firewall nat disable [find where chain=srcnat action=masquerade comment=""] } on-error={ }`,
    `:do { /ip firewall nat disable [find where chain=srcnat action=masquerade comment~"defconf"] } on-error={ }`,
    `:do { /ip firewall nat enable [find where comment~"HotspotPro"] } on-error={ }`,
    `:do { /ip dhcp-server disable [find where name!="hotspotpro-dhcp" && name!="hotspotpro-admin-dhcp"] } on-error={ }`,
    `:do { /ip dhcp-server enable [find where name="hotspotpro-dhcp"] } on-error={ }`,
    `:do { /ip dhcp-server set [find where name=hotspotpro-dhcp] comment="HotspotPro: guest DHCP" } on-error={ }`,
    `:do { /ipv6 settings set disable-ipv6=yes } on-error={ }`,
    `:do { :if ([:len [/ipv6 firewall filter find where comment="HotspotPro no IPv6"]] = 0) do={ /ipv6 firewall filter add chain=forward action=drop in-interface=hotspotpro-bridge comment="HotspotPro no IPv6" } } on-error={ }`,
    `:do { /ip firewall nat remove [find where comment="HotspotPro DNS"] } on-error={ }`,
    `:do { /ip firewall nat add chain=dstnat in-interface=hotspotpro-bridge protocol=udp dst-port=53 action=redirect to-ports=53 comment="HotspotPro DNS" } on-error={ }`,
    `:do { /ip firewall nat add chain=dstnat in-interface=hotspotpro-bridge protocol=tcp dst-port=53 action=redirect to-ports=53 comment="HotspotPro DNS" } on-error={ }`,
  ];
}

/**
 * Make Android / iOS / Windows open the system captive-portal sheet after joining Wi‑Fi.
 * OS probes must hit Hotspot (HTTP redirect to login.html) — if they are in the
 * walled garden or Detect Internet marks the link "online", the sheet never opens.
 */
export function openSystemCaptivePortalLines(opts?: { keepFreeWifi?: boolean }): string[] {
  const clearBypass = opts?.keepFreeWifi
    ? `:do { /ip hotspot ip-binding remove [find where type=bypassed && comment!="HotspotPro free wifi"] } on-error={ }`
    : `:do { /ip hotspot ip-binding remove [find where type=bypassed] } on-error={ }`;
  return [
    `# HotspotPro: force OUR voucher login as the only system captive portal`,
    `:do { /interface detect-internet set detect-interface-list=none } on-error={ }`,
    `:do { /ip hotspot set [find where name=hotspotpro] disabled=no interface=hotspotpro-bridge } on-error={ }`,
    `:do { /ip hotspot profile set [find where name=hotspotpro] open-status-page=http-login } on-error={ }`,
    // Only HotspotPro HTML — never MikroTik factory skin / other hotspot servers.
    `:do { ${applyHtmlDirectoryRos()} } on-error={ }`,
    clearBypass,
    // OS connectivity checks — must NOT be allowed through; Hotspot redirects them to OUR login.html.
    `:do { /ip hotspot walled-garden remove [find where dst-host~"captive.apple.com"] } on-error={ }`,
    `:do { /ip hotspot walled-garden remove [find where dst-host~"www.apple.com"] } on-error={ }`,
    `:do { /ip hotspot walled-garden remove [find where dst-host~"apple.com"] } on-error={ }`,
    `:do { /ip hotspot walled-garden remove [find where dst-host~"connectivitycheck.gstatic.com"] } on-error={ }`,
    `:do { /ip hotspot walled-garden remove [find where dst-host~"clients3.google.com"] } on-error={ }`,
    `:do { /ip hotspot walled-garden remove [find where dst-host~"www.gstatic.com"] } on-error={ }`,
    `:do { /ip hotspot walled-garden remove [find where dst-host~"generate_204"] } on-error={ }`,
    `:do { /ip hotspot walled-garden remove [find where dst-host~"android.com"] } on-error={ }`,
    `:do { /ip hotspot walled-garden remove [find where dst-host~"msftconnecttest.com"] } on-error={ }`,
    `:do { /ip hotspot walled-garden remove [find where dst-host~"msftncsi.com"] } on-error={ }`,
    `:do { /ip hotspot walled-garden remove [find where dst-host~"detectportal.firefox.com"] } on-error={ }`,
    `:do { /ip hotspot walled-garden remove [find where dst-host~"networkcheck.kde.org"] } on-error={ }`,
    `:do { /ip hotspot walled-garden remove [find where dst-host~"neverssl.com"] } on-error={ }`,
    `:do { /ip hotspot walled-garden remove [find where dst-host~"ping.archlinux.org"] } on-error={ }`,
    `:put "HotspotPro: captive portal locked to HotspotPro voucher login page"`,
  ];
}

/** Comment used for bridge-wide free WiFi (all APs on hotspotpro-bridge). */
export const FREE_WIFI_COMMENT = "HotspotPro free wifi";

/**
 * Open or close free internet on the hotspot bridge (no voucher needed).
 * Covers every AP/port on hotspotpro-bridge. Turn off restores captive portal.
 */
export function freeWifiApplyLines(enabled: boolean): string[] {
  if (enabled) {
    return [
      `# HotspotPro: FREE WiFi ON — all clients on hotspotpro-bridge bypass login`,
      `:do { /ip hotspot ip-binding remove [find where comment="${FREE_WIFI_COMMENT}"] } on-error={ }`,
      // Whole guest network: any address on the hotspot server skips authentication.
      `:do { /ip hotspot ip-binding add type=bypassed address=0.0.0.0/0 server=hotspotpro comment="${FREE_WIFI_COMMENT}" } on-error={ :do { /ip hotspot ip-binding add type=bypassed address=0.0.0.0/0 comment="${FREE_WIFI_COMMENT}" } on-error={ } }`,
      `:put "HotspotPro: Free WiFi is ON — vouchers not required"`,
    ];
  }
  return [
    `# HotspotPro: FREE WiFi OFF — restore captive portal / vouchers`,
    `:do { /ip hotspot ip-binding remove [find where comment="${FREE_WIFI_COMMENT}"] } on-error={ }`,
    `:do { /ip hotspot ip-binding remove [find where type=bypassed] } on-error={ }`,
    // Kick open sessions so phones hit the login page again.
    `:do { /ip hotspot active remove [find] } on-error={ }`,
    `:do { /ip hotspot cookie remove [find] } on-error={ }`,
    `:put "HotspotPro: Free WiFi is OFF — voucher login required"`,
  ];
}

/**
 * Every-check-in version of the Free WiFi switch. Only keeps the bypass binding in the
 * right state — it never signs anyone out. (freeWifiApplyLines(false) kicks every session
 * and wipes cookies; run that only when the owner presses Free WiFi Off.)
 */
export function freeWifiEnsureLines(enabled: boolean): string[] {
  if (enabled) {
    return [
      `:do { :if ([:len [/ip hotspot ip-binding find where comment="${FREE_WIFI_COMMENT}"]] = 0) do={ :do { /ip hotspot ip-binding add type=bypassed address=0.0.0.0/0 server=hotspotpro comment="${FREE_WIFI_COMMENT}" } on-error={ :do { /ip hotspot ip-binding add type=bypassed address=0.0.0.0/0 comment="${FREE_WIFI_COMMENT}" } on-error={ } } } } on-error={ }`,
    ];
  }
  return [`:do { /ip hotspot ip-binding remove [find where comment="${FREE_WIFI_COMMENT}"] } on-error={ }`];
}

/** RouterOS that sets wifi1/wifi2 (and legacy wlan) to the site SSID and keeps them on the hotspot bridge. */
export function wifiApplyLines(ssidRaw: string | undefined): string[] {
  const ssid = cleanSsid(ssidRaw) || "HotspotPro";
  const band = ssid.replace(/\s+5G$/i, "").slice(0, 29);
  const ssid24 = quote(band.slice(0, 32));
  const ssid5 = quote(`${band} 5G`.slice(0, 32));
  const stamp = `v4-${ssid.replace(/[^A-Za-z0-9_-]/g, "").slice(0, 36)}`;
  // Run-time parsed per menu (optionalRos) — see bridgeWifiLines.
  const ssidBody = [
    optionalRos(`:local hpWifi [:len [/interface wifi find]]; :if ($hpWifi > 0) do={ :do { /interface wifi configuration set [find] ssid=${ssid24} mode=ap } on-error={ }; :do { /interface wifi set [find where name=wifi1] disabled=no configuration.ssid=${ssid24} configuration.mode=ap security.authentication-types="" datapath.bridge=hotspotpro-bridge comment="HotspotPro: guest WiFi 2.4GHz" } on-error={ }; :do { /interface wifi set [find where name=wifi2] disabled=no configuration.ssid=${ssid5} configuration.mode=ap security.authentication-types="" datapath.bridge=hotspotpro-bridge comment="HotspotPro: guest WiFi 5GHz" } on-error={ }; :foreach p in=[/interface wifi find] do={ :local n [/interface wifi get $p name]; :if ($n != "wifi1" && $n != "wifi2") do={ :do { /interface wifi set $p disabled=no configuration.ssid=${ssid24} configuration.mode=ap security.authentication-types="" datapath.bridge=hotspotpro-bridge comment="HotspotPro: guest WiFi" } on-error={ } } } }`),
    optionalRos(`:foreach p in=[/interface wifiwave2 find] do={ :do { /interface wifiwave2 set $p disabled=no configuration.ssid=${ssid24} configuration.mode=ap security.authentication-types="" datapath.bridge=hotspotpro-bridge comment="HotspotPro: guest WiFi" } on-error={ } }`),
    optionalRos(`/interface wireless security-profiles set [find default=yes] mode=none`),
    optionalRos(`/interface wireless set [find where name=wlan1] disabled=no ssid=${ssid24} mode=ap-bridge security-profile=default comment="HotspotPro: guest WiFi 2.4GHz"`),
    optionalRos(`/interface wireless set [find where name=wlan2] disabled=no ssid=${ssid5} mode=ap-bridge security-profile=default comment="HotspotPro: guest WiFi 5GHz"`),
  ];
  // Full SSID + bridge apply when the stamp changes; every check-in still verifies bridge below.
  const bridge = bridgeWifiLines().join("; ");
  return [
    `# HotspotPro WiFi SSID + captive portal bridge`,
    `:global hpWifiSsid`,
    `:if ($hpWifiSsid != "${stamp}") do={ ${ssidBody.join("; ")}; ${bridge}; :set hpWifiSsid "${stamp}" }`,
    ...ensureWifiOnHotspotBridgeLines(),
  ];
}
