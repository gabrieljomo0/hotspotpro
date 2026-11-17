// Checks a generated RouterOS script WITHOUT a router: syntax shape, quoting,
// escaping of "$", address maths, and that the important steps are present.
// It cannot prove RouterOS will accept every command (only a router can), but
// it catches the mistakes a script generator makes — unbalanced quotes,
// unescaped $, bad addresses, a gateway outside its network, missing steps.

export type LintReport = {
  ok: boolean;
  errors: string[];
  warnings: string[];
  stats: { lines: number; steps: number; hasRadius: boolean; hasHotspot: boolean };
};

const ROOTS = /^\/(interface|ip|ipv6|radius|file|system|tool|ppp)(\s|$)/;
const IP = /^(\d{1,3})\.(\d{1,3})\.(\d{1,3})\.(\d{1,3})$/;

function ipInt(ip: string): number | null {
  const m = IP.exec(ip);
  if (!m) return null;
  const parts = m.slice(1).map(Number);
  if (parts.some((n) => n > 255)) return null;
  return ((parts[0] << 24) | (parts[1] << 16) | (parts[2] << 8) | parts[3]) >>> 0;
}

/** Split a line into [text outside strings, strings] and report quoting problems. */
function scanQuotes(line: string): { outside: string; inside: string[]; balanced: boolean } {
  let outside = "";
  const inside: string[] = [];
  let current = "";
  let open = false;
  for (let i = 0; i < line.length; i += 1) {
    const ch = line[i];
    if (open) {
      if (ch === "\\") {
        current += ch + (line[i + 1] ?? "");
        i += 1;
      } else if (ch === '"') {
        inside.push(current);
        current = "";
        open = false;
        outside += '""';
      } else current += ch;
    } else if (ch === '"') open = true;
    else outside += ch;
  }
  return { outside, inside, balanced: !open };
}

function balanced(text: string) {
  const stack: string[] = [];
  const pairs: Record<string, string> = { "}": "{", ")": "(", "]": "[" };
  for (const ch of text) {
    if ("{([".includes(ch)) stack.push(ch);
    else if (ch in pairs && stack.pop() !== pairs[ch]) return false;
  }
  return stack.length === 0;
}

/** `addon` = a small add-on script (like the internet switch) that doesn't do the full setup or report back. */
export function lintScript(script: string, options: { addon?: boolean } = {}): LintReport {
  const errors: string[] = [];
  const warnings: string[] = [];
  const lines = script.split("\n").filter((l) => l.trim() !== "");
  let steps = 0;
  let network: { net: number; mask: number } | null = null;
  let gateway: number | null = null;
  let pool: [number, number] | null = null;

  if (!options.addon && !lines.some((l) => l.startsWith(":local hpFails 0"))) errors.push("Missing the failure counter (:local hpFails 0).");
  if (!options.addon && !lines.some((l) => l.includes("/done?failed="))) errors.push("The script never reports back to HotspotPro (no /done call).");
  if (script.includes("\r")) warnings.push("Contains Windows line endings; RouterOS accepts them, but Unix (LF) is safer.");

  lines.forEach((raw, index) => {
    const n = index + 1;
    const line = raw.trim();
    if (line.startsWith("#")) return;
    const where = `Line ${n}`;

    if (!/^(:do \{ |:local |:global |:log |:put |:if )/.test(line)) {
      errors.push(`${where}: starts with something unexpected ("${line.slice(0, 30)}").`);
      return;
    }
    const q = scanQuotes(line);
    if (!q.balanced) {
      errors.push(`${where}: a double quote is never closed.`);
      return;
    }
    if (!balanced(q.outside)) errors.push(`${where}: brackets { } ( ) [ ] do not match.`);
    for (const s of q.inside) {
      if (/(^|[^\\])\$/.test(s)) errors.push(`${where}: a "$" inside a text value is not escaped (RouterOS would treat it as a variable).`);
      if (/[\r]/.test(s)) errors.push(`${where}: a text value contains a line break.`);
    }
    if (line.length > 3000) warnings.push(`${where}: very long (${line.length} characters).`);

    if (line.startsWith(":do { ")) {
      steps += 1;
      const command = line.slice(6, line.lastIndexOf(" } on-error")).trim();
      const first = command.replace(/^\(?/, "");
      if (!ROOTS.test(first) && !/^:(if|local|set|execute|foreach|delay)\b/.test(first)) errors.push(`${where}: unknown command path ("${first.slice(0, 40)}").`);
      if (!line.includes("on-error={")) errors.push(`${where}: step has no on-error handler.`);

      // Address maths on the text outside strings
      const out = q.outside;
      for (const m of out.matchAll(/\baddress=([\d.]+)\/(\d+)/g)) {
        const ip = ipInt(m[1]);
        const pf = Number(m[2]);
        if (ip === null || pf < 0 || pf > 32 || (pf === 0 && m[1] !== "0.0.0.0")) errors.push(`${where}: bad address ${m[1]}/${m[2]}.`);
        else if (command.startsWith("/ip address add")) gateway = ip;
        else if (command.startsWith("/ip dhcp-server network")) {
          const mask = (0xffffffff << (32 - pf)) >>> 0;
          network = { net: (ip & mask) >>> 0, mask };
        }
      }
      for (const m of out.matchAll(/\bgateway=([\d.]+)/g)) if (ipInt(m[1]) === null) errors.push(`${where}: bad gateway ${m[1]}.`);
      for (const m of out.matchAll(/\bdns-server=([\d.,]+)/g)) for (const ip of m[1].split(",")) if (ipInt(ip) === null) errors.push(`${where}: bad DNS server "${ip}".`);
      for (const m of out.matchAll(/\branges=([\d.]+)-([\d.]+)/g)) {
        const a = ipInt(m[1]), b = ipInt(m[2]);
        if (a === null || b === null) errors.push(`${where}: bad address range ${m[1]}-${m[2]}.`);
        else if (a > b) errors.push(`${where}: address range starts after it ends (${m[1]}-${m[2]}).`);
        else if (command.includes("name=hotspotpro-pool")) pool = [a, b];
      }
      for (const m of out.matchAll(/\b(?:authentication|accounting)-port=(\d+)/g)) {
        const p = Number(m[1]);
        if (p < 1 || p > 65535) errors.push(`${where}: port ${p} is out of range.`);
      }
      for (const m of out.matchAll(/\binterface=([^\s\]]+)/g)) {
        if (!/^[A-Za-z0-9_.\-]+$/.test(m[1]) && !m[1].startsWith("[") && !m[1].startsWith("$")) errors.push(`${where}: odd interface name "${m[1]}".`);
      }
      if (/\/radius add/.test(command)) {
        const addr = /\baddress=([^\s]+)/.exec(out)?.[1] ?? "";
        if (!IP.test(addr)) warnings.push(`${where}: the RADIUS server address "${addr}" is not an IP address. MikroTik accepts only an IP here on most versions — set HOTSPOTPRO_RADIUS_HOST to your server's IP.`);
        if (/(^|\s)(?:localhost|127\.|0\.0\.0\.0)/.test(addr)) errors.push(`${where}: the RADIUS server address is ${addr} — a router can never reach that. Use the computer's/server's address on the router's network.`);
      }
    }
    if (/https?:\/\/(localhost|127\.0\.0\.1|\[::1\])/.test(line)) errors.push(`${where}: points at localhost, which a router cannot reach. Use your computer's address on the router's network (e.g. http://192.168.1.50:3000).`);
  });

  if (network && gateway !== null) {
    const nw = network as { net: number; mask: number };
    if (((gateway & nw.mask) >>> 0) !== nw.net) errors.push("The router's hotspot address is outside the hotspot network.");
  }
  if (pool && gateway !== null) {
    const [from, to] = pool as [number, number];
    if (gateway >= from && gateway <= to) errors.push("The DHCP pool includes the router's own address.");
  }

  const hasHotspot = lines.some((l) => l.includes("/ip hotspot add "));
  const hasRadius = lines.some((l) => l.includes("/radius add "));
  if (hasHotspot) {
    for (const need of ["/ip dhcp-server add", "/ip address add", "/ip hotspot profile add", "/ip pool add name=hotspotpro-pool"]) {
      if (!lines.some((l) => l.includes(need))) errors.push(`The hotspot is set up but "${need}" is missing.`);
    }
    if (hasRadius && !lines.some((l) => l.includes("use-radius=yes") || l.includes("use-radius=no"))) errors.push("RADIUS is added but the hotspot profile does not say whether to use it.");
    if (!lines.some((l) => l.includes("walled-garden"))) warnings.push("No walled-garden entry: customers may not be able to open the portal before logging in.");
  }

  return { ok: errors.length === 0, errors, warnings, stats: { lines: lines.length, steps, hasRadius, hasHotspot } };
}
