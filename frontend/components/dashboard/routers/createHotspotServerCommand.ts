/** WinBox Login By: HTTP CHAP + HTTP PAP + Cookie (PAP required for portal Connect). */
const LOGIN_BY = "http-chap,http-pap,mac-cookie";

/** One-shot WinBox Terminal paste: create the Hotspot Servers entry if it is empty. */
export function buildCreateHotspotServerCommand(dnsName = "wifi") {
  const dns =
    (dnsName || "wifi")
      .toLowerCase()
      .replace(/[^a-z0-9.-]/g, "")
      .replace(/^\.+|\.+$/g, "")
      .replace(/\.{2,}/g, ".")
      .slice(0, 48) || "wifi";
  return [
    `:put "HotspotPro: creating hotspot server (IP → Hotspot → Servers)..."`,
    `:do { :if ([:len [/interface bridge find where name=hotspotpro-bridge]] = 0) do={ /interface bridge add name=hotspotpro-bridge comment="HotspotPro" } } on-error={ }`,
    `:do { /interface list member add list=LAN interface=hotspotpro-bridge } on-error={ }`,
    `:do { :if ([:len [/ip address find where comment="HotspotPro" interface=hotspotpro-bridge]] = 0) do={ /ip address add address=10.10.0.1/16 interface=hotspotpro-bridge comment="HotspotPro" } } on-error={ }`,
    `:do { :if ([:len [/ip pool find where name=hotspotpro-pool]] = 0) do={ /ip pool add name=hotspotpro-pool ranges=10.10.0.2-10.10.3.254 } } on-error={ }`,
    `:do { :if ([:len [/ip dhcp-server network find where comment="HotspotPro"]] = 0) do={ /ip dhcp-server network add address=10.10.0.0/16 gateway=10.10.0.1 dns-server=10.10.0.1 comment="HotspotPro" } } on-error={ }`,
    `:do { :if ([:len [/ip dhcp-server find where name=hotspotpro-dhcp]] = 0) do={ /ip dhcp-server add name=hotspotpro-dhcp interface=hotspotpro-bridge address-pool=hotspotpro-pool disabled=no } } on-error={ }`,
    // Profile without html-directory first (ROS 7.2x often rejects html-directory when the folder is missing).
    `:do { :if ([:len [/ip hotspot profile find where name=hotspotpro]] = 0) do={ /ip hotspot profile add name=hotspotpro hotspot-address=10.10.0.1 dns-name=${dns} login-by=${LOGIN_BY} trial-uptime-limit=0s use-radius=no } else={ /ip hotspot profile set [find where name=hotspotpro] hotspot-address=10.10.0.1 dns-name=${dns} login-by=${LOGIN_BY} } } on-error={ }`,
    // DNS Name + Login By alone so WinBox columns never stay blank if a bundled set failed.
    `:do { /ip hotspot profile set [find where name=hotspotpro] dns-name=${dns} } on-error={ }`,
    `:do { /ip hotspot profile set [find where name=hotspotpro] login-by=${LOGIN_BY} } on-error={ }`,
    `:do { :local hpDir "hotspot"; :local hpFlash ""; :do { :set hpFlash [/file get [find where name="flash/hotspot/login.html"] contents] } on-error={ }; :if ([:typeof [:find $hpFlash "HotspotPro designed-portal"]] = "num") do={ :set hpDir "flash/hotspot" }; /ip hotspot profile set [find where name=hotspotpro] html-directory=$hpDir; :do { /ip hotspot profile set [find where name=hotspotpro] html-directory-override=$hpDir } on-error={ } } on-error={ }`,
    `:do { :if ([:len [/ip hotspot find where name=hotspotpro]] = 0) do={ /ip hotspot add name=hotspotpro interface=hotspotpro-bridge address-pool=hotspotpro-pool profile=hotspotpro disabled=no } else={ /ip hotspot set [find where name=hotspotpro] interface=hotspotpro-bridge address-pool=hotspotpro-pool profile=hotspotpro disabled=no } } on-error={ }`,
    `:do { /ip hotspot disable [find where name!="hotspotpro"] } on-error={ }`,
    `:do { /ip hotspot enable [find where name=hotspotpro] } on-error={ }`,
    // hAP ax: datapath.bridge only — remove factory bridge ports so WiFi is not free internet.
    `:do { :foreach p in=[/interface wifi find] do={ :local n [/interface wifi get $p name]; :do { /interface bridge port remove [find where interface=$n] } on-error={ }; :do { /interface wifi set $p disabled=no configuration.mode=ap security.authentication-types="" datapath.bridge=hotspotpro-bridge } on-error={ } } } on-error={ }`,
    `:do { :foreach p in=[/interface wireless find] do={ :local n [/interface wireless get $p name]; :do { /interface wireless set $p disabled=no mode=ap-bridge } on-error={ }; :do { /interface bridge port remove [find where interface=$n] } on-error={ }; :do { /interface bridge port add bridge=hotspotpro-bridge interface=$n comment="HotspotPro" } on-error={ } } } on-error={ }`,
    `:do { /ip firewall nat disable [find where chain=srcnat action=masquerade comment~"defconf"] } on-error={ }`,
    `:do { /ip firewall nat enable [find where comment~"HotspotPro"] } on-error={ }`,
    `:do { :if ([:len [/ip hotspot find where name=hotspotpro]] = 0) do={ :put "HotspotPro: CRITICAL — Servers is still empty" } else={ :put "HotspotPro: Servers should now show hotspotpro. Forget WiFi on the phone and join again." } } on-error={ }`,
  ].join("; ");
}
