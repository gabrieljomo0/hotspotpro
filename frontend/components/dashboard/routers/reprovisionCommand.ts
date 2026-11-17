// Shared WinBox paste command: download full HotspotPro setup and import it
// so old hotspot / WiFi config is replaced with the captive-portal layout.

export function cleanReprovisionSsid(value: string) {
  return value.replace(/[\\"$\r\n]/g, "").trim().slice(0, 32);
}

export function buildReprovisionCommand(input: { origin: string; token: string; ssid: string }) {
  const origin = input.origin.replace(/\/+$/, "");
  const ssid = cleanReprovisionSsid(input.ssid) || "HotspotPro";
  if (!origin || !input.token) return "";
  const tls = origin.startsWith("https") ? " check-certificate=no" : "";
  const setupUrl = `${origin}/api/provision/${input.token}?wireless=yes&ssid=${encodeURIComponent(ssid)}`;
  return [
    `:put "HotspotPro: resetting old HotspotPro config and applying a fresh setup (hotspot + captive portal + WiFi)..."`,
    // Clear leftover bypass / sessions so the voucher page is required after import.
    `:do { /ip hotspot ip-binding remove [find where type=bypassed] } on-error={ }`,
    `:do { /ip hotspot active remove [find] } on-error={ }`,
    `:do { /ip hotspot cookie remove [find] } on-error={ }`,
    `:global hpWifiSsid; :set hpWifiSsid ""`,
    `:global hpSetup; :set hpSetup ""`,
    `:do { /file remove [find where name=hotspotpro.rsc] } on-error={ }`,
    `:do { /file remove [find where name="flash/hotspotpro.rsc"] } on-error={ }`,
    `:global hpFile "hotspotpro.rsc"`,
    `:do { /tool fetch url="${setupUrl}" dst-path=$hpFile${tls} } on-error={ :do { :delay 5s } on-error={ }; /tool fetch url="${setupUrl}" dst-path=$hpFile${tls} }`,
    `:do { :delay 2s } on-error={ }`,
    `:if ([:len [/file find where name=("flash/" . $hpFile)]] > 0) do={ :set hpFile ("flash/" . $hpFile) }`,
    `:if ([:len [/file find where name=$hpFile]] > 0) do={ /import file-name=$hpFile; :put "HotspotPro: reconfiguration finished. Forget WiFi on the phone and join again — the voucher page must open." } else={ :put "HotspotPro: download failed. Check the URL and internet on this router." }`,
  ].join("; ");
}
