// MikroTik WinBox session file (addresses.WBX / wb.config) + public connect host.
// Online routers should open with admin + password at the cloud/public host — not a WireGuard .conf.

import type { RouterInfo } from "@/components/dashboard/data/dashboard-data";

/** Public WinBox host for this PC (no WireGuard). Empty = not ready yet. */
export function resolveWinboxConnectHost(row: Partial<RouterInfo>): string {
  const addr = row.winboxAddress ? String(row.winboxAddress) : "";
  if (row.winboxReach === "direct" && addr) {
    return addr.replace(/:8291$/, "").trim();
  }
  if (row.winboxRelay && addr && !addr.startsWith("192.168.216.")) {
    return addr.replace(/:8291$/, "").trim();
  }
  // Direct-looking public address even if reach flag is stale.
  if (addr && !addr.startsWith("192.168.216.") && !addr.startsWith("192.168.88.")) {
    return addr.replace(/:8291$/, "").trim();
  }
  return "";
}

function utf8(text: string): Uint8Array {
  return new TextEncoder().encode(text);
}

/** One TLV field: [len][0x00][nameLen][name…][value…] — matches forum WBX writers. */
function field(name: string, value: Uint8Array | string, lengthBias: number): number[] {
  const nameBytes = utf8(name);
  const valueBytes = typeof value === "string" ? utf8(value) : value;
  const length = valueBytes.length + lengthBias;
  return [length & 0xff, 0x00, nameBytes.length & 0xff, ...nameBytes, ...valueBytes];
}

/**
 * Build a WinBox import file (Tools → Import).
 * Filename we ship: wb.config (same bytes as addresses.WBX).
 */
export function buildWinboxSessionFile(input: {
  host: string;
  login?: string;
  note?: string;
  group?: string;
}): Uint8Array {
  const host = input.host.replace(/^https?:\/\//, "").replace(/:8291$/, "").trim();
  const login = (input.login || "admin").slice(0, 64);
  const note = (input.note || "HotspotPro").slice(0, 64);
  const group = (input.group || "HotspotPro").slice(0, 64);

  const body: number[] = [
    ...field("group", group, 6),
    ...field("host", host, 5),
    // keep-pwd = 0 (admin types the password in WinBox)
    0x0a, 0x00, 0x08, ...utf8("keep-pwd"), 0x00,
    ...field("login", login, 6),
    ...field("note", note, 5),
    // secure-mode off ("secure-mode" = 11 chars → length byte 0x0D)
    0x0d, 0x00, 0x0b, ...utf8("secure-mode"), 0x00,
    0x00, 0x00,
  ];

  return new Uint8Array([0x0f, 0x10, 0xc0, 0xbe, ...body]);
}

export function downloadWbConfig(routerName: string, host: string) {
  const safe = (routerName || "router").replace(/[^\w.-]+/g, "_").slice(0, 40) || "router";
  const bytes = buildWinboxSessionFile({
    host,
    login: "admin",
    note: routerName || "HotspotPro",
    group: "HotspotPro",
  });
  const blob = new Blob([bytes as BlobPart], { type: "application/octet-stream" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = `${safe}-wb.config`;
  link.rel = "noopener";
  document.body.appendChild(link);
  link.click();
  link.remove();
  window.setTimeout(() => URL.revokeObjectURL(url), 2000);
}
