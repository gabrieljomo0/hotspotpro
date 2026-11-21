import { NextResponse } from "next/server";
import { clientIp, limited } from "@/server/limit";
import { ensureOneLocalUser, queuePortalPush } from "@/server/localUsers";
import {
  findPackageByName,
  findVoucher,
  normalizeMac,
  packageBytes,
  packageSeconds,
  voucherAllowedOnRouter,
  voucherLimitBy,
  voucherUsesCalendar,
} from "@/server/packages";
import { createLoginTicket } from "@/server/portalLogin";
import { radiusCloudEnabled, usedBytes } from "@/server/radius";
import { findRouterByToken } from "@/server/provision";
import { getState, queueJob } from "@/server/store";

const GOOGLE = "https://www.google.com/";

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

  let gatewayIp = "10.10.0.1";
  let syncQueued = false;
  let syncFresh = false;
  let jobId: string | null = null;
  let ticketId: string | null = null;
  const loginUsername = (v.code || "").trim().replace(/[^A-Za-z0-9_-]/g, "").slice(0, 32) || v.code;
  const loginPassword = v.password || v.code || loginUsername;
  // Real UDP RADIUS when HOTSPOTPRO_RADIUS=on. On Render that stays off — vouchers are
  // checked here, then pushed onto the MikroTik so /login can put the phone online.
  const useRadius = radiusCloudEnabled() && (router as { loginMode?: string } | null)?.loginMode === "cloud";
  const authMode = useRadius ? "radius" : "push";
  if (token) {
    const gateway = (router as { hotspotGatewayIp?: string } | null)?.hotspotGatewayIp?.trim();
    if (gateway && /^(?:\d{1,3}\.){3}\d{1,3}$/.test(gateway)) gatewayIp = gateway;
    // One-time HTTP page on the gateway — phones leave HTTPS and auto-submit to MikroTik.
    const ticket = createLoginTicket(token, loginUsername, loginPassword);
    ticketId = ticket.id;
    if (!useRadius) {
      try {
        const sync = getState("routerUserSync")?.value as Record<string, { codes?: string[] }> | undefined;
        const already = !!sync?.[token]?.codes?.includes(loginUsername);
        queuePortalPush(token, v.code);
        syncQueued = true;
        syncFresh = !already;
        const script = ensureOneLocalUser(token, router?.ip || "", v.code);
        if (script.length > 1) {
          const job = queueJob(token, script.join("\n") + "\n", "portal");
          jobId = job.id;
        }
      } catch {
        /* check-in may already have the user */
      }
    }
  } else {
    const routers = getState("routers")?.value;
    const first = Array.isArray(routers) ? (routers as { hotspotGatewayIp?: string }[])[0] : null;
    const gateway = first?.hotspotGatewayIp?.trim();
    if (gateway && /^(?:\d{1,3}\.){3}\d{1,3}$/.test(gateway)) gatewayIp = gateway;
  }

  const hotspotLogin = `http://${gatewayIp}/login`;
  // Served from the router's hotspot HTML folder after check-in downloads it.
  const continueUrl = ticketId ? `http://${gatewayIp}/hp-go.html` : hotspotLogin;

  return NextResponse.json({
    valid: true,
    code: "ok",
    message: "Login successful! You are connected to the internet.",
    packageName: v.packageName,
    secondsLeft: seconds,
    started: !!v.activatedAtMs,
    bytesLeft: cap === null ? null : cap - used,
    hotspotLogin,
    continueUrl,
    ticketId,
    loginUsername,
    loginPassword,
    redirect: GOOGLE,
    authMode,
    syncQueued,
    syncFresh,
    jobId,
    // Wait for check-in to push the user + download hp-go.html, then open that HTTP page.
    // Fresh vouchers need a full check-in cycle; already-synced codes are faster.
    waitMs: useRadius ? 800 : syncQueued ? (syncFresh ? 18000 : 6000) : 2000,
  });
}
