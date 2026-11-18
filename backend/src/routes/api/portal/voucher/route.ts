import { NextResponse } from "next/server";
import { clientIp, limited } from "@/server/limit";
import { ensureOneLocalUser } from "@/server/localUsers";
import {
  findPackageByName,
  findVoucher,
  normalizeMac,
  packageBytes,
  packageSeconds,
  routerAllowsPackage,
  voucherLimitBy,
  voucherUsesCalendar,
} from "@/server/packages";
import { usedBytes } from "@/server/radius";
import { findRouterByToken } from "@/server/provision";
import { getState, queueJob } from "@/server/store";

const GOOGLE = "https://www.google.com/";

type BatchRow = { id?: string; routerIps?: string[] };

function voucherAllowedOnRouter(batchId: string | null | undefined, packageName: string, routerIp: string | null) {
  const pkg = findPackageByName(packageName);
  if (pkg && !routerAllowsPackage(pkg, routerIp)) return false;
  if (!batchId || !routerIp) return true;
  const batches = getState("voucherBatches")?.value;
  if (!Array.isArray(batches)) return true;
  const batch = (batches as BatchRow[]).find((b) => b && b.id === batchId);
  if (!batch || !Array.isArray(batch.routerIps) || batch.routerIps.length === 0) return true;
  return batch.routerIps.includes(routerIp);
}

// Public: is this voucher good to use, and how much is left?
// Also push the voucher onto the router so MikroTik login can put the phone online.
export async function POST(request: Request) {
  if (limited(`vch|${clientIp(request)}`, 20, 60_000)) {
    return NextResponse.json({ valid: false, code: "rate_limited", message: "Too many attempts. Wait a minute." }, { status: 429 });
  }
  const body = (await request.json().catch(() => ({}))) as { username?: string; password?: string; mac?: string };
  const token = (request.headers.get("x-hsp-rt") || "").trim();
  const router = token ? findRouterByToken(token) : null;
  const routerIp = router?.ip || null;

  const v = body.username ? findVoucher(body.username) : null;
  const passwordOk = !!v && (
    v.password
      ? v.password === body.password || body.password === v.code
      : !body.password || body.password === v.code || body.password === body.username
  );
  if (!v || !passwordOk) {
    return NextResponse.json(
      { valid: false, code: "invalid", message: "That voucher code or password isn't right." },
      { status: 401 },
    );
  }

  if (!voucherAllowedOnRouter(v.batchId, v.packageName, routerIp)) {
    return NextResponse.json(
      {
        valid: false,
        code: "wrong_router",
        message: "This voucher belongs to a different WiFi / router. Connect to the correct network and try again.",
      },
      { status: 403 },
    );
  }

  const pkg = findPackageByName(v.packageName);
  const now = Date.now();
  const limitBy = voucherLimitBy(v);
  const calendar = voucherUsesCalendar(v);

  if (v.status === "Expired" || (calendar && v.expiresAtMs && v.expiresAtMs <= now)) {
    return NextResponse.json(
      { valid: false, code: "expired", message: "This voucher has expired." },
      { status: 403 },
    );
  }

  const cap = limitBy === "days" ? null : pkg ? packageBytes(pkg) : null;
  const used = Math.max(usedBytes(v.code), v.bytesUsed ?? 0);
  if (cap !== null && used >= cap) {
    return NextResponse.json(
      { valid: false, code: "used", message: "This voucher has already been used. Its data is finished." },
      { status: 403 },
    );
  }

  const seconds = calendar && v.expiresAtMs
    ? Math.max(0, Math.floor((v.expiresAtMs - now) / 1000))
    : pkg ? packageSeconds(pkg) : 0;
  if (v.activatedAtMs && calendar && seconds <= 0) {
    return NextResponse.json(
      { valid: false, code: "expired", message: "This voucher has expired." },
      { status: 403 },
    );
  }

  // Used with nothing left (time-based packages that already ran out).
  if (v.status === "Used" && !calendar && limitBy !== "data" && seconds <= 0 && v.activatedAtMs) {
    return NextResponse.json(
      { valid: false, code: "used", message: "This voucher has already been used." },
      { status: 403 },
    );
  }

  const requestMac = normalizeMac(body.mac);
  const bound = normalizeMac(v.boundMac);
  if (bound && requestMac && bound !== requestMac) {
    return NextResponse.json(
      { valid: false, code: "used", message: "This voucher has already been used on another phone." },
      { status: 403 },
    );
  }

  let hotspotLogin = "http://10.10.0.1/login";
  let syncQueued = false;
  if (token) {
    const gateway = (router as { hotspotGatewayIp?: string } | null)?.hotspotGatewayIp?.trim();
    if (gateway && /^(?:\d{1,3}\.){3}\d{1,3}$/.test(gateway)) hotspotLogin = `http://${gateway}/login`;
    try {
      // Push only this voucher — do not wipe sync state (that churns every login at scale).
      const script = ensureOneLocalUser(token, router?.ip || "", v.code);
      if (script.length > 1) {
        queueJob(token, script.join("\n") + "\n", "portal");
        syncQueued = true;
      }
    } catch {
      /* check-in may already have the user */
    }
  } else {
    const routers = getState("routers")?.value;
    const first = Array.isArray(routers) ? (routers as { hotspotGatewayIp?: string }[])[0] : null;
    const gateway = first?.hotspotGatewayIp?.trim();
    if (gateway && /^(?:\d{1,3}\.){3}\d{1,3}$/.test(gateway)) hotspotLogin = `http://${gateway}/login`;
  }

  return NextResponse.json({
    valid: true,
    code: "ok",
    message: "Login successful! You are connected to the internet.",
    packageName: v.packageName,
    secondsLeft: seconds,
    started: !!v.activatedAtMs,
    bytesLeft: cap === null ? null : cap - used,
    hotspotLogin,
    redirect: GOOGLE,
    syncQueued,
    // Router picks up ensureOneLocalUser on the next check-in (~5–15s). Wait long enough before MikroTik /login.
    waitMs: syncQueued ? 5500 : 800,
  });
}
