// Apply the site's WiFi SSID on a live MikroTik.
// Used on check-in and when the owner saves captive portal Network settings.
// Radios must sit on hotspotpro-bridge (ROS7 datapath.bridge) or phones never
// hit the captive portal after joining the SSID.

import { applyHtmlDirectoryRos } from "./hotspotPages";
import { getState } from "./store";

function cleanSsid(value: string | undefined) {
  const ssid = (value || "").trim().slice(0, 32);
  if (!ssid || /[\\"$\r\n]/.test(ssid)) return "";
  return ssid;
}

function quote(value: string) {
  return `"${value.replace(/[\\"$\r\n]/g, "")}"`;
}

/** Look up the SSID this router should broadcast from captive portal / hotspot settings. */
export function ssidForRouter(router: { ip?: string; siteId?: string | null; name?: string }): string {
  const configs = getState("captivePortalConfigs")?.value as Record<string, { ssid?: string }> | undefined;
  const key = router.siteId || router.ip || "";
  const fromSite = (key && configs?.[key]?.ssid ? configs[key].ssid : "").trim();
  if (fromSite) return fromSite.slice(0, 32);
  const hotspot = getState("hotspotSettings")?.value as { ssid?: string; ssidStrategy?: string } | undefined;
  if (hotspot?.ssidStrategy === "same" && hotspot.ssid?.trim()) return hotspot.ssid.trim().slice(0, 32);
  // Fallback so WiFi still joins the hotspot bridge and shows a name for voucher login.
  const fromName = (router.name || "").replace(/[^\w\s-]/g, "").trim().slice(0, 32);
  return fromName || "HotspotPro";
}

/**
 * Put every radio on the hotspot bridge so clients hit the captive portal.
 * ROS7 wifi / wifiwave2: use datapath.bridge only (do not also add as a bridge port).
 * Legacy wireless: use bridge ports.
 */
export function bridgeWifiLines(): string[] {
  return [
    // Pull radios off the factory LAN bridge first — that is what gives free internet.
    `:do { :foreach p in=[/interface wifi find] do={ :local n [/interface wifi get $p name]; :do { /interface bridge port remove [find where interface=$n] } on-error={ } } } on-error={ }`,
    `:do { :foreach p in=[/interface wifiwave2 find] do={ :local n [/interface wifiwave2 get $p name]; :do { /interface bridge port remove [find where interface=$n] } on-error={ } } } on-error={ }`,
    // RouterOS 7 wifi package (hAP ax / ax S): datapath.bridge is what feeds Hotspot.
    `:do { :foreach p in=[/interface wifi find] do={ :do { /interface wifi set $p disabled=no configuration.mode=ap security.authentication-types="" datapath.bridge=hotspotpro-bridge } on-error={ } } } on-error={ }`,
    // Older ROS7 wifiwave2 name
    `:do { :foreach p in=[/interface wifiwave2 find] do={ :do { /interface wifiwave2 set $p disabled=no configuration.mode=ap security.authentication-types="" datapath.bridge=hotspotpro-bridge } on-error={ } } } on-error={ }`,
    // Legacy wireless package still needs a bridge port
    `:do { :foreach p in=[/interface wireless find] do={ :local n [/interface wireless get $p name]; :do { /interface wireless set $p disabled=no mode=ap-bridge } on-error={ }; :do { /interface bridge port remove [find where interface=$n] } on-error={ }; :do { /interface bridge port add bridge=hotspotpro-bridge interface=$n comment="HotspotPro" } on-error={ } } } on-error={ }`,
    `:do { /interface wifi enable [find] } on-error={ }`,
    `:do { /interface wifiwave2 enable [find] } on-error={ }`,
    `:do { /interface wireless enable [find] } on-error={ }`,
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
    `:do { :if ([:len [/interface bridge find where name=hotspotpro-bridge]] = 0) do={ /interface bridge add name=hotspotpro-bridge comment="HotspotPro" } } on-error={ }`,
    `:do { /interface list member add list=LAN interface=hotspotpro-bridge } on-error={ }`,
    `:do { :if ([:len [/ip address find where comment="HotspotPro" interface=hotspotpro-bridge]] = 0) do={ /ip address add address=10.10.0.1/16 interface=hotspotpro-bridge comment="HotspotPro" } } on-error={ }`,
    `:do { :if ([:len [/ip pool find where name=hotspotpro-pool]] = 0) do={ /ip pool add name=hotspotpro-pool ranges=10.10.0.2-10.10.3.254 } } on-error={ }`,
    `:do { :if ([:len [/ip dhcp-server network find where comment="HotspotPro"]] = 0) do={ /ip dhcp-server network add address=10.10.0.0/16 gateway=10.10.0.1 dns-server=10.10.0.1 comment="HotspotPro" } } on-error={ }`,
    `:do { /ip dhcp-server network set [find where comment="HotspotPro"] dns-server=10.10.0.1 gateway=10.10.0.1 } on-error={ }`,
    `:do { :if ([:len [/ip dhcp-server find where name=hotspotpro-dhcp]] = 0) do={ /ip dhcp-server add name=hotspotpro-dhcp interface=hotspotpro-bridge address-pool=hotspotpro-pool disabled=no } } on-error={ }`,
    `:do { /ip dhcp-server enable [find where name=hotspotpro-dhcp] } on-error={ }`,
    // Profile first without html-directory (folder may not exist yet).
    `:do { :if ([:len [/ip hotspot profile find where name=hotspotpro]] = 0) do={ /ip hotspot profile add name=hotspotpro hotspot-address=10.10.0.1 dns-name="${dns}" login-by=http-pap,mac-cookie trial-uptime-limit=0s use-radius=no } else={ /ip hotspot profile set [find where name=hotspotpro] hotspot-address=10.10.0.1 dns-name="${dns}" login-by=http-pap,mac-cookie trial-uptime-limit=0s use-radius=no } } on-error={ }`,
    `:do { ${applyHtmlDirectoryRos()} } on-error={ }`,
    `:do { :if ([:len [/ip hotspot find where name=hotspotpro]] = 0) do={ /ip hotspot add name=hotspotpro interface=hotspotpro-bridge address-pool=hotspotpro-pool profile=hotspotpro disabled=no; :put "HotspotPro: hotspot server created on hotspotpro-bridge" } else={ /ip hotspot set [find where name=hotspotpro] interface=hotspotpro-bridge address-pool=hotspotpro-pool profile=hotspotpro disabled=no } } on-error={ }`,
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
    `:do { /ip hotspot set [find where name=hotspotpro] interface=hotspotpro-bridge disabled=no addresses-per-mac=1 } on-error={ }`,
    `:do { /ip firewall nat disable [find where chain=srcnat action=masquerade comment=""] } on-error={ }`,
    `:do { /ip firewall nat disable [find where chain=srcnat action=masquerade comment~"defconf"] } on-error={ }`,
    `:do { /ip firewall nat enable [find where comment~"HotspotPro"] } on-error={ }`,
    `:do { /ip dhcp-server disable [find where name!="hotspotpro-dhcp" && name!="hotspotpro-admin-dhcp"] } on-error={ }`,
    `:do { /ip dhcp-server enable [find where name="hotspotpro-dhcp"] } on-error={ }`,
    `:do { /ipv6 settings set disable-ipv6=yes } on-error={ }`,
    `:do { :if ([:len [/ipv6 firewall filter find where comment="HotspotPro no IPv6"]] = 0) do={ /ipv6 firewall filter add chain=forward action=drop in-interface=hotspotpro-bridge comment="HotspotPro no IPv6" } } on-error={ }`,
    `:do { /ip firewall nat remove [find where comment="HotspotPro DNS"] } on-error={ }`,
    `:do { /ip firewall nat add chain=dstnat in-interface=hotspotpro-bridge protocol=udp dst-port=53 action=redirect to-ports=53 comment="HotspotPro DNS" } on-error={ }`,
    `:do { /ip firewall nat add chain=dstnat in-interface=hotspotpro-bridge protocol=tcp dst-port=53 action=redirect to-ports=53 comment="HotspotPro DNS" } on-error={ }`,
  ];
}

/** RouterOS that sets wifi1/wifi2 (and legacy wlan) to the site SSID and keeps them on the hotspot bridge. */
export function wifiApplyLines(ssidRaw: string | undefined): string[] {
  const ssid = cleanSsid(ssidRaw) || "HotspotPro";
  const band = ssid.replace(/\s+5G$/i, "").slice(0, 29);
  const ssid24 = quote(band.slice(0, 32));
  const ssid5 = quote(`${band} 5G`.slice(0, 32));
  const stamp = `v4-${ssid.replace(/[^A-Za-z0-9_-]/g, "").slice(0, 36)}`;
  const ssidBody = [
    `:do { :local hpWifi 0; :do { :set hpWifi [:len [/interface wifi find]] } on-error={ }; :if ($hpWifi > 0) do={ /interface wifi configuration set [find] ssid=${ssid24} mode=ap; /interface wifi set [find where name=wifi1] disabled=no configuration.ssid=${ssid24} configuration.mode=ap security.authentication-types="" datapath.bridge=hotspotpro-bridge; /interface wifi set [find where name=wifi2] disabled=no configuration.ssid=${ssid5} configuration.mode=ap security.authentication-types="" datapath.bridge=hotspotpro-bridge; :foreach p in=[/interface wifi find] do={ :local n [/interface wifi get $p name]; :if ($n != "wifi1" && $n != "wifi2") do={ /interface wifi set $p disabled=no configuration.ssid=${ssid24} configuration.mode=ap security.authentication-types="" datapath.bridge=hotspotpro-bridge } } } } on-error={ }`,
    `:do { :local hpWw 0; :do { :set hpWw [:len [/interface wifiwave2 find]] } on-error={ }; :if ($hpWw > 0) do={ :foreach p in=[/interface wifiwave2 find] do={ :do { /interface wifiwave2 set $p disabled=no configuration.ssid=${ssid24} configuration.mode=ap security.authentication-types="" datapath.bridge=hotspotpro-bridge } on-error={ } } } } on-error={ }`,
    `:do { /interface wireless security-profiles set [find default=yes] mode=none } on-error={ }`,
    `:do { /interface wireless set [find where name=wlan1] disabled=no ssid=${ssid24} mode=ap-bridge security-profile=default } on-error={ }`,
    `:do { /interface wireless set [find where name=wlan2] disabled=no ssid=${ssid5} mode=ap-bridge security-profile=default } on-error={ }`,
  ];
  // Bridge radios only when the SSID stamp changes — not on every check-in.
  const bridge = bridgeWifiLines().join("; ");
  return [
    `# HotspotPro WiFi SSID + captive portal bridge`,
    `:global hpWifiSsid`,
    `:if ($hpWifiSsid != "${stamp}") do={ ${ssidBody.join("; ")}; ${bridge}; :set hpWifiSsid "${stamp}" }`,
  ];
}
