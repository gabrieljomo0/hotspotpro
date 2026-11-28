// Shared WinBox paste command: download full HotspotPro setup and import it
// so old hotspot / WiFi config is replaced with the captive-portal layout.

export function cleanReprovisionSsid(value: string) {
  return value.replace(/[\\"$\r\n]/g, "").trim().slice(0, 32);
}

/** Prefer typed DNS name; otherwise first 4 letters of the router name (WinBox Server Profiles). */
export function loginDnsFromRouter(routerName?: string, dnsName?: string) {
  const typed = (dnsName || "")
    .toLowerCase()
    .replace(/[^a-z0-9.-]/g, "")
    .replace(/^\.+|\.+$/g, "")
    .replace(/\.{2,}/g, ".")
    .slice(0, 48);
  if (typed) return typed;
  return (routerName || "").toLowerCase().replace(/[^a-z]/g, "").slice(0, 4) || "wifi";
}

export function buildReprovisionCommand(input: {
  origin: string;
  token: string;
  ssid: string;
  dnsName?: string;
  routerName?: string;
}) {
  const origin = input.origin.replace(/\/+$/, "");
  const ssid = cleanReprovisionSsid(input.ssid) || "HotspotPro";
  if (!origin || !input.token) return "";
  const tls = origin.startsWith("https") ? " check-certificate=no" : "";
  const setupUrl = `${origin}/api/provision/${input.token}?wireless=yes&ssid=${encodeURIComponent(ssid)}`;
  // Only download the full setup and import it. The setup creates the hotspot server when it is
  // missing and is a soft update otherwise: people online, hotspot users (vouchers) and package
  // User Profiles are kept.
  // - No pre-step that touches /interface wifi or /interface wireless: the paste is ONE line, so a
  //   menu the router lacks was a syntax error that stopped the whole paste.
  // - Direct /import: `:execute script={/import file-name=$hpFile}` runs in its own scope without
  //   $hpFile, so it imported nothing and still printed "finished".
  return [
    `:put "HotspotPro: downloading the setup..."`,
    `:global hpWifiSsid; :set hpWifiSsid ""`,
    `:do { /file remove [find where name=hotspotpro.rsc] } on-error={ }`,
    `:do { /file remove [find where name="flash/hotspotpro.rsc"] } on-error={ }`,
    `:local hpFile "hotspotpro.rsc"`,
    `:do { /tool fetch url="${setupUrl}" dst-path=$hpFile${tls} } on-error={ :delay 5s; :do { /tool fetch url="${setupUrl}" dst-path=$hpFile${tls} } on-error={ } }`,
    `:delay 2s`,
    `:if ([:len [/file find where name=("flash/" . $hpFile)]] > 0) do={ :set hpFile ("flash/" . $hpFile) }`,
    `:if ([:len [/file find where name=$hpFile]] > 0) do={ /import file-name=$hpFile; :put "HotspotPro: reprovision finished. People online, vouchers and packages were kept." } else={ :put "HotspotPro: download failed. Check the internet on this router and paste again." }`,
  ].join("; ");
}
