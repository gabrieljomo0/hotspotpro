// What the router does when a customer's hotspot session ends (time or data used up, admin sign-out,
// or the customer logs out). It is the user profiles' on-logout code.
//
// RouterOS runs on-logout as script CODE with $user and $"mac-address" set. HotspotPro used to put a
// script NAME there ("hotspotpro-logout"), which RouterOS tried to run as a command, so the cookies
// were never cleared: a phone that came back was not treated as new and the portal did not show
// until the customer forgot the network (which gives the phone a new MAC address).
//
// On logout: clear that phone's login cookies, then drop it from the Wi-Fi for a moment. The phone
// reconnects by itself, checks the internet, meets the login page and shows the portal (iPhone opens
// it, Android shows "Sign in to Wi-Fi network"). Each Wi-Fi menu is parsed at run time, so a router
// without wifiwave2 or wireless is not affected.

const SOURCE = [
  `:local mac $"mac-address"; :local user $user;`,
  `:if ([:len $mac] > 0) do={ :do { /ip hotspot cookie remove [find where mac-address=$mac] } on-error={ } };`,
  `:if ([:len $user] > 0) do={ :do { /ip hotspot cookie remove [find where user=$user] } on-error={ } };`,
  `:if ([:len $mac] > 0) do={ :foreach m in={"/interface wifi";"/interface wifiwave2";"/interface wireless"} do={ :do { :local f [:parse ($m . " registration-table remove [find where mac-address=" . $mac . "]")]; $f } on-error={ } } }`,
].join(" ");

function quoted(source: string) {
  return `"${source.replace(/\\/g, "\\\\").replace(/"/g, '\\"').replace(/\$/g, "\\$")}"`;
}

/** The on-logout code as a RouterOS quoted string. */
export const LOGOUT_ON_EVENT = quoted(SOURCE);

/**
 * One line: every hotspot user profile gets the logout code (only rewritten where it differs, so the
 * router log stays quiet). Run after profiles are created.
 */
export function logoutApplyLine(): string {
  return `:do { :foreach p in=[/ip hotspot user profile find] do={ :if ([/ip hotspot user profile get $p on-logout] != ${LOGOUT_ON_EVENT}) do={ /ip hotspot user profile set $p on-logout=${LOGOUT_ON_EVENT} } } } on-error={ :log warning "HotspotPro: could not set the logout action on User Profiles" }`;
}
