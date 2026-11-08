// One box for a package's speed, written the way routers write it:
// "10M/10M" = upload / download. Empty means "best speed" (no limit),
// stored as 0 for both.

export type ParsedSpeed = { uploadMbps: number; downloadMbps: number } | { error: string };

// "10M" -> 10, "512k" -> 0.512, "2.5" -> 2.5 (a bare number is Mbps).
function partToMbps(part: string): number | null {
  const match = /^(\d+(?:\.\d+)?)\s*([kKmM])?(?:bps)?$/.exec(part.trim());
  if (!match) return null;
  const amount = Number(match[1]);
  const unit = (match[2] ?? "M").toLowerCase();
  const mbps = unit === "k" ? amount / 1000 : amount;
  return mbps > 0 ? Math.round(mbps * 1000) / 1000 : null;
}

export function parseSpeed(text: string): ParsedSpeed {
  const value = text.trim();
  if (value === "") return { uploadMbps: 0, downloadMbps: 0 };
  const parts = value.split("/");
  if (parts.length > 2) return { error: "Use the form 10M/10M (upload/download)." };
  const upload = partToMbps(parts[0]);
  const download = partToMbps(parts.length === 2 ? parts[1] : parts[0]);
  if (upload === null || download === null) {
    return { error: "Use the form 10M/10M (upload/download), e.g. 5M/10M or 512k/2M." };
  }
  return { uploadMbps: upload, downloadMbps: download };
}

function part(mbps: number) {
  return mbps < 1 ? `${Math.round(mbps * 1000)}k` : `${mbps}M`;
}

// Back into the text the box shows.
export function speedToText(uploadMbps: number, downloadMbps: number) {
  if (!(uploadMbps > 0) || !(downloadMbps > 0)) return "";
  return `${part(uploadMbps)}/${part(downloadMbps)}`;
}

// For lists and cards.
export function speedLabel(mbps: number) {
  return mbps > 0 ? `${mbps} Mbps` : "Max speed";
}
