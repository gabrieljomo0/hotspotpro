// Shared WinBox paste command: download full HotspotPro setup and import it
// so old hotspot / WiFi config is replaced with the captive-portal layout.

import { buildCreateHotspotServerCommand } from "./createHotspotServerCommand";

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
  const dns = loginDnsFromRouter(input.routerName, input.dnsName);
  return [
    // First fill IP → Hotspot → Servers if it is empty (create hotspotpro).
    buildCreateHotspotServerCommand(dns),
    `:put "HotspotPro: downloading full setup to finish reconfiguration..."`,
    // Bypass bindings skip the voucher page — clear those only. Never wipe active sessions,
    // cookies, or hotspot users so people already online stay connected.
    `:do { /ip hotspot ip-binding remove [find where type=bypassed] } on-error={ }`,
    `:global hpWifiSsid; :set hpWifiSsid ""`,
    `:global hpSetup; :set hpSetup ""`,
    `:do { /file remove [find where name=hotspotpro.rsc] } on-error={ }`,
    `:do { /file remove [find where name="flash/hotspotpro.rsc"] } on-error={ }`,
    `:global hpFile "hotspotpro.rsc"`,
    `:do { /tool fetch url="${setupUrl}" dst-path=$hpFile${tls} } on-error={ :do { :delay 5s } on-error={ }; /tool fetch url="${setupUrl}" dst-path=$hpFile${tls} }`,
    `:do { :delay 2s } on-error={ }`,
    `:if ([:len [/file find where name=("flash/" . $hpFile)]] > 0) do={ :set hpFile ("flash/" . $hpFile) }`,
    // :execute + file= waits for import without y/N prompts (paste must not stop for keyboard).
    `:if ([:len [/file find where name=$hpFile]] > 0) do={ :do { :execute script={/import file-name=$hpFile} file=hotspotpro-import-out.txt } on-error={ /import file-name=$hpFile }; :do { /file remove [find where name=hotspotpro-import-out.txt] } on-error={ }; :put "HotspotPro: reconfiguration finished. People already online stay connected." } else={ :put "HotspotPro: download failed. Check the URL and internet on this router." }`,
  ].join("; ");
}
