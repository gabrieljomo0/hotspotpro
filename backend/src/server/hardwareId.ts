import { forEachTenant, getState, setState } from "./store";

/** MikroTik serial / software-id — enough to recognise the same physical board. */
export function normalizeHardwareId(value: string | null | undefined): string | null {
  const clean = (value || "")
    .trim()
    .toUpperCase()
    .replace(/[^A-Z0-9-]/g, "")
    .slice(0, 64);
  return clean.length >= 4 ? clean : null;
}

export type HardwareIds = {
  serial?: string | null;
  softwareId?: string | null;
};

export type HardwareConflict = {
  name: string;
  ip: string;
  token: string;
};

type RouterRow = Record<string, unknown> & {
  name?: string;
  ip?: string;
  provisioningToken?: string;
  hardwareSerial?: string;
  softwareId?: string;
};

function rows(): RouterRow[] {
  const value = getState("routers")?.value;
  return Array.isArray(value) ? (value as RouterRow[]) : [];
}

function matchesHardware(row: RouterRow, serial: string | null, softwareId: string | null) {
  const rowSerial = normalizeHardwareId(typeof row.hardwareSerial === "string" ? row.hardwareSerial : null);
  const rowSw = normalizeHardwareId(typeof row.softwareId === "string" ? row.softwareId : null);
  const matchSerial = Boolean(serial && rowSerial && serial === rowSerial);
  const matchSw = Boolean(softwareId && rowSw && softwareId === rowSw);
  return matchSerial || matchSw;
}

/** Another dashboard router already owns this board (different setup token) — any business. */
export function findHardwareConflict(token: string, ids: HardwareIds): HardwareConflict | null {
  const serial = normalizeHardwareId(ids.serial);
  const softwareId = normalizeHardwareId(ids.softwareId);
  if (!serial && !softwareId) return null;

  let found: HardwareConflict | null = null;
  forEachTenant(() => {
    if (found) return;
    for (const row of rows()) {
      if (!row || typeof row.provisioningToken !== "string") continue;
      if (row.provisioningToken === token) continue;
      if (!matchesHardware(row, serial, softwareId)) continue;
      found = {
        name: typeof row.name === "string" && row.name.trim() ? row.name.trim() : "another router",
        ip: typeof row.ip === "string" ? row.ip : "",
        token: row.provisioningToken,
      };
      return;
    }
  });
  return found;
}

export function duplicateRouterMessage(conflict: HardwareConflict) {
  return `This MikroTik is already registered as "${conflict.name}". Delete that router on HotspotPro first (after a factory reset if you need a clean board), then add it again.`;
}

/** Script shown on the MikroTik when someone tries to bind a second dashboard entry to the same board. */
export function duplicateHardwareScript(conflict: HardwareConflict): string {
  const msg = duplicateRouterMessage(conflict).replace(/"/g, '\\"');
  return [
    `:put "=========================================="`,
    `:put "HotspotPro: this router is already registered"`,
    `:put "${msg}"`,
    `:put "=========================================="`,
    `:log error "HotspotPro: duplicate hardware — already registered as ${conflict.name.replace(/"/g, "")}"`,
    `# HotspotPro refused this setup token because the board is already linked.`,
  ].join("\n") + "\n";
}

/**
 * Attach serial / software-id to this token's router, or refuse if another router owns them.
 * Returns the conflict when refused (caller should not treat the router as newly added).
 */
export function bindHardwareToToken(token: string, ids: HardwareIds): HardwareConflict | null {
  const serial = normalizeHardwareId(ids.serial);
  const softwareId = normalizeHardwareId(ids.softwareId);
  if (!serial && !softwareId) return null;

  const conflict = findHardwareConflict(token, { serial, softwareId });
  if (conflict) return conflict;

  const list = rows();
  let changed = false;
  const next = list.map((row) => {
    if (!row || row.provisioningToken !== token) return row;
    const patch: RouterRow = { ...row };
    if (serial && row.hardwareSerial !== serial) {
      patch.hardwareSerial = serial;
      changed = true;
    }
    if (softwareId && row.softwareId !== softwareId) {
      patch.softwareId = softwareId;
      changed = true;
    }
    return patch;
  });
  if (changed) setState("routers", next, "server");
  return null;
}

/** Mark a failed re-add so the dashboard explains why Connect / Online never sticks. */
export function markDuplicateRouterAttempt(token: string, conflict: HardwareConflict) {
  const list = rows();
  let changed = false;
  const message = duplicateRouterMessage(conflict);
  const now = new Date().toLocaleString("en-GB", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
  });
  const next = list.map((row) => {
    if (!row || row.provisioningToken !== token) return row;
    changed = true;
    const activity = Array.isArray(row.activity) ? (row.activity as unknown[]) : [];
    return {
      ...row,
      status: "Offline",
      health: "error",
      provisioningStatus: row.provisioningStatus === "Provisioned" ? "Provisioned" : "Pending",
      lastError: message,
      lastSeen: "Just now",
      activity: [{ at: now, text: message }, ...activity].slice(0, 30),
    };
  });
  if (changed) setState("routers", next, "router");
}
