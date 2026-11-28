// Create the HotspotPro server profile and hotspot server in a way one bad property cannot break.
//
// RouterOS rejects a whole `add` or `set` when any one property is unknown on that build (for example a
// `comment=` the menu does not take, or a renamed option). Inside `:do { } on-error={ }` that rejection
// is silent, so a single extra property used to leave IP → Hotspot → Servers empty: no captive portal,
// and phones on the Wi-Fi went straight to the internet through the HotspotPro NAT rule.
//
// So: add with the bare minimum (the name, and the bridge for the server), then set every other property
// in its own command. A property the router refuses is logged by name and the rest still apply.

const PROFILE = "hotspotpro";
const SERVER = "hotspotpro";

function key(prop: string) {
  return prop.split("=")[0];
}

function setEach(menu: string, name: string, props: string[], what: string) {
  return props
    .map((prop) => `:do { ${menu} set [find where name=${name}] ${prop} } on-error={ :log warning "HotspotPro: ${what} rejected ${key(prop)}" }`)
    .join("; ");
}

/**
 * One RouterOS line that makes sure the `hotspotpro` server profile exists.
 * onCreate: properties set only when the profile was just created (e.g. use-radius=no, which must not
 * overwrite cloud RADIUS on every check-in). always: properties set every time.
 * onFail: extra RouterOS run when the profile still does not exist afterwards (e.g. count a failed step).
 */
export function hotspotProfileEnsureLine(opts: { onCreate?: string[]; always?: string[]; onFail?: string }): string {
  const menu = "/ip hotspot profile";
  const created = setEach(menu, PROFILE, opts.onCreate ?? [], "hotspot profile");
  const always = setEach(menu, PROFILE, opts.always ?? [], "hotspot profile");
  return [
    `:do {`,
    `:local hpNew 0;`,
    `:if ([:len [${menu} find where name=${PROFILE}]] = 0) do={ :do { ${menu} add name=${PROFILE}; :set hpNew 1; :put "HotspotPro: hotspot profile created" } on-error={ :log warning "HotspotPro step failed: hotspot profile add" } };`,
    created ? `:if ($hpNew = 1) do={ ${created} };` : "",
    always ? `${always};` : "",
    `:if ([:len [${menu} find where name=${PROFILE}]] = 0) do={ :log warning "HotspotPro step failed: hotspot profile"; ${opts.onFail ?? ""} }`,
    `} on-error={ }`,
  ]
    .filter(Boolean)
    .join(" ");
}

/**
 * Walled-garden entry for a host phones must reach before paying (the portal site, the API).
 * Found by host and added without a comment: some RouterOS builds refuse comment= on hotspot menus,
 * which would drop the entry (no portal before login) or, when found by comment, add a copy every check-in.
 * host is a plain hostname (no quotes).
 */
export function walledGardenHostLine(host: string): string {
  return `:do { :if ([:len [/ip hotspot walled-garden find where dst-host="${host}"]] = 0) do={ /ip hotspot walled-garden add dst-host="${host}" } } on-error={ :log warning "HotspotPro: walled garden add failed for ${host}" }`;
}

/**
 * HTTPS to a host before login. The name-only walled garden is HTTP; HTTPS needs the IP walled garden.
 * Two rules, refreshed every check-in: one by name (dst-host, the router matches it through its DNS)
 * and one for the address the ROUTER resolves now, which is what phones get (their DNS goes to the
 * router). Addresses looked up elsewhere (on the API server, once at setup) can differ for Vercel-style
 * hosts, and then the site portal can't load before login and nobody can enter a voucher.
 */
export function walledGardenHttpsLines(host: string): string[] {
  return [
    `:do { :if ([:len [/ip hotspot walled-garden ip find where dst-host="${host}"]] = 0) do={ /ip hotspot walled-garden ip add action=accept dst-host="${host}" } } on-error={ :log warning "HotspotPro: walled garden ip by name failed for ${host}" }`,
    `:do { :local a [:resolve "${host}"]; :if ([:len $a] > 0 && [:len [/ip hotspot walled-garden ip find where dst-address=$a]] = 0) do={ /ip hotspot walled-garden ip add action=accept dst-address=$a } } on-error={ :log warning "HotspotPro: could not resolve ${host} for the walled garden" }`,
  ];
}

/** Same as walledGardenHostLine, for an IPv4 address (walled-garden ip, action=accept). */
export function walledGardenIpLine(ip: string): string {
  return `:do { :if ([:len [/ip hotspot walled-garden ip find where dst-address=${ip}]] = 0) do={ /ip hotspot walled-garden ip add action=accept dst-address=${ip} } } on-error={ :log warning "HotspotPro: walled garden ip add failed for ${ip}" }`;
}

/**
 * One RouterOS line that makes sure the `hotspotpro` hotspot server exists on hotspotpro-bridge and is on.
 * Created with only name + interface; pool, profile and enable are each set on their own.
 */
export function hotspotServerEnsureLine(opts: { onFail?: string } = {}): string {
  const menu = "/ip hotspot";
  const props = [
    "interface=hotspotpro-bridge",
    "address-pool=hotspotpro-pool",
    `profile=${PROFILE}`,
    "addresses-per-mac=1",
    "disabled=no",
  ];
  return [
    `:do {`,
    `:if ([:len [${menu} find where name=${SERVER}]] = 0) do={ :do { ${menu} add name=${SERVER} interface=hotspotpro-bridge ; :put "HotspotPro: hotspot server created on hotspotpro-bridge" } on-error={ :log warning "HotspotPro step failed: hotspot server add" } } else={ :put "Hotspot server kept online" };`,
    `${setEach(menu, SERVER, props, "hotspot server")};`,
    `:if ([:len [${menu} find where name=${SERVER}]] = 0) do={ :log warning "HotspotPro step failed: hotspot server"; :put "HotspotPro: CRITICAL - IP > Hotspot > Servers is still empty"; ${opts.onFail ?? ""} }`,
    `} on-error={ }`,
  ].join(" ");
}
