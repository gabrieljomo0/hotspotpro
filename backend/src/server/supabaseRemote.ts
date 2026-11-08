// Optional copy of the whole database in Supabase.
// Render's disk is wiped on every deploy, so when these two settings are present
// the file on disk is only a cache and Supabase is the copy that survives.

type Pull =
  | { ok: true; body: unknown | null }
  | { ok: false };

function projectUrl() {
  return (process.env.SUPABASE_URL || "").replace(/\/+$/, "");
}

function serviceKey() {
  return process.env.SUPABASE_SERVICE_ROLE_KEY || "";
}

export function supabaseEnabled() {
  return projectUrl().startsWith("https://") && serviceKey().length > 20;
}

function headers(extra?: Record<string, string>) {
  return {
    apikey: serviceKey(),
    Authorization: `Bearer ${serviceKey()}`,
    "Content-Type": "application/json",
    ...extra,
  };
}

/** Read the saved database. ok:false means Supabase could not be read, so the caller must not overwrite it. */
export async function pullDatabase(): Promise<Pull> {
  if (!supabaseEnabled()) return { ok: true, body: null };
  try {
    const response = await fetch(`${projectUrl()}/rest/v1/hotspotpro_db?id=eq.main&select=body`, { headers: headers() });
    if (!response.ok) {
      console.error("[hotspotpro] could not read Supabase:", response.status, await response.text());
      return { ok: false };
    }
    const rows = (await response.json()) as { body?: unknown }[];
    return { ok: true, body: rows[0]?.body ?? null };
  } catch (error) {
    console.error("[hotspotpro] could not read Supabase:", error);
    return { ok: false };
  }
}

/** Save the whole database. Missing settings means "not hosted", and that is not an error. */
export async function pushDatabase(body: unknown) {
  if (!supabaseEnabled()) return;
  try {
    const response = await fetch(`${projectUrl()}/rest/v1/hotspotpro_db`, {
      method: "POST",
      headers: headers({ Prefer: "resolution=merge-duplicates" }),
      body: JSON.stringify({ id: "main", body, updated_at: new Date().toISOString() }),
    });
    if (!response.ok) console.error("[hotspotpro] could not save to Supabase:", response.status, await response.text());
  } catch (error) {
    console.error("[hotspotpro] could not save to Supabase:", error);
  }
}
