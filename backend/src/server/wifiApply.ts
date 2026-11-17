// Apply the site's WiFi SSID on a live MikroTik.
// Used on check-in and when the owner saves captive portal Network settings.

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
export function ssidForRouter(router: { ip?: string; siteId?: string | null }): string {
  const configs = getState("captivePortalConfigs")?.value as Record<string, { ssid?: string }> | undefined;
  const key = router.siteId || router.ip || "";
  const fromSite = (key && configs?.[key]?.ssid ? configs[key].ssid : "").trim();
  if (fromSite) return fromSite.slice(0, 32);
  const hotspot = getState("hotspotSettings")?.value as { ssid?: string; ssidStrategy?: string } | undefined;
  if (hotspot?.ssidStrategy === "same" && hotspot.ssid?.trim()) return hotspot.ssid.trim().slice(0, 32);
  return "";
}

/** RouterOS that sets wifi1/wifi2 (and legacy wlan) to the site SSID and keeps them on the hotspot bridge. */
export function wifiApplyLines(ssidRaw: string | undefined): string[] {
  const ssid = cleanSsid(ssidRaw);
  if (!ssid) {
    return [
      `# HotspotPro WiFi: keep radios on the hotspot bridge`,
      `:do { :foreach p in=[/interface wifi find] do={ :local n [/interface wifi get $p name]; :if ([:len [/interface bridge port find where interface=$n bridge=hotspotpro-bridge]] = 0) do={ :do { /interface bridge port remove [find where interface=$n] } on-error={ }; :do { /interface bridge port add bridge=hotspotpro-bridge interface=$n comment="HotspotPro" } on-error={ } } } } on-error={ }`,
      `:do { :foreach p in=[/interface wireless find] do={ :local n [/interface wireless get $p name]; :if ([:len [/interface bridge port find where interface=$n bridge=hotspotpro-bridge]] = 0) do={ :do { /interface bridge port remove [find where interface=$n] } on-error={ }; :do { /interface bridge port add bridge=hotspotpro-bridge interface=$n comment="HotspotPro" } on-error={ } } } on-error={ }`,
    ];
  }
  const band = ssid.replace(/\s+5G$/i, "").slice(0, 29);
  const ssid24 = quote(band.slice(0, 32));
  const ssid5 = quote(`${band} 5G`.slice(0, 32));
  const stamp = ssid.replace(/[^A-Za-z0-9_-]/g, "").slice(0, 40);
  const body = [
    `:do { :local hpWifi 0; :do { :set hpWifi [:len [/interface wifi find]] } on-error={ }; :if ($hpWifi > 0) do={ /interface wifi configuration set [find] ssid=${ssid24} mode=ap; /interface wifi set [find where name=wifi1] disabled=no configuration.ssid=${ssid24} configuration.mode=ap security.authentication-types="" datapath.bridge=hotspotpro-bridge; /interface wifi set [find where name=wifi2] disabled=no configuration.ssid=${ssid5} configuration.mode=ap security.authentication-types="" datapath.bridge=hotspotpro-bridge; :foreach p in=[/interface wifi find] do={ :local n [/interface wifi get $p name]; :if ($n != "wifi1" && $n != "wifi2") do={ /interface wifi set $p disabled=no configuration.ssid=${ssid24} configuration.mode=ap security.authentication-types="" datapath.bridge=hotspotpro-bridge } } } } on-error={ }`,
    `:do { /interface wireless security-profiles set [find default=yes] mode=none } on-error={ }`,
    `:do { /interface wireless set [find where name=wlan1] disabled=no ssid=${ssid24} mode=ap-bridge security-profile=default } on-error={ }`,
    `:do { /interface wireless set [find where name=wlan2] disabled=no ssid=${ssid5} mode=ap-bridge security-profile=default } on-error={ }`,
    `:do { :foreach p in=[/interface wifi find] do={ :local n [/interface wifi get $p name]; :if ([:len [/interface bridge port find where interface=$n bridge=hotspotpro-bridge]] = 0) do={ :do { /interface bridge port remove [find where interface=$n] } on-error={ }; :do { /interface bridge port add bridge=hotspotpro-bridge interface=$n comment="HotspotPro" } on-error={ } } } } on-error={ }`,
    `:do { :foreach p in=[/interface wireless find] do={ :local n [/interface wireless get $p name]; :if ([:len [/interface bridge port find where interface=$n bridge=hotspotpro-bridge]] = 0) do={ :do { /interface bridge port remove [find where interface=$n] } on-error={ }; :do { /interface bridge port add bridge=hotspotpro-bridge interface=$n comment="HotspotPro" } on-error={ } } } on-error={ }`,
    `:do { /interface wifi enable [find] } on-error={ }`,
    `:do { /interface wireless enable [find] } on-error={ }`,
    `:set hpWifiSsid "${stamp}"`,
  ];
  return [
    `# HotspotPro WiFi SSID`,
    `:global hpWifiSsid`,
    `:if ($hpWifiSsid != "${stamp}") do={ ${body.join("; ")} }`,
  ];
}
