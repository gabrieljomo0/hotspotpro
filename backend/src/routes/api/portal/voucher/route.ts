import { NextResponse } from "next/server";
import { clientIp, limited } from "@/server/limit";
import { forgetLocalUsers, localUserLines } from "@/server/localUsers";
import { findPackageByName, findVoucher, packageBytes, packageSeconds, voucherLimitBy, voucherUsesCalendar } from "@/server/packages";
import { usedBytes } from "@/server/radius";
import { findRouterByToken } from "@/server/provision";
import { getState, queueJob } from "@/server/store";

// Public: is this voucher good to use, and how much is left?
// Also push the voucher onto the router so MikroTik login can put the phone online.
export async function POST(request: Request) {
  if (limited(`vch|${clientIp(request)}`, 20, 60_000)) return NextResponse.json({ valid: false, message: "Too many attempts. Wait a minute." }, { status: 429 });
  const body = (await request.json().catch(() => ({}))) as { username?: string; password?: string };
  const token = (request.headers.get("x-hsp-rt") || "").trim();
  const v = body.username ? findVoucher(body.username) : null;
  // PIN vouchers: password is the code (or blank). Username/password vouchers: match the stored password.
  const passwordOk = !!v && (
    v.password
      ? v.password === body.password || body.password === v.code
      : !body.password || body.password === v.code || body.password === body.username
  );
  if (!v || !passwordOk) return NextResponse.json({ valid: false, message: "That voucher code or password isn't right." }, { status: 401 });
  const pkg = findPackageByName(v.packageName);
  const now = Date.now();
  const limitBy = voucherLimitBy(v);
  const calendar = voucherUsesCalendar(v);
  if (v.status === "Expired" || (calendar && v.expiresAtMs && v.expiresAtMs <= now)) {
    return NextResponse.json({ valid: false, message: "This voucher has expired." }, { status: 403 });
  }
  const cap = limitBy === "days" ? null : pkg ? packageBytes(pkg) : null;
  const used = Math.max(usedBytes(v.code), v.bytesUsed ?? 0);
  if (cap !== null && used >= cap) return NextResponse.json({ valid: false, message: "This voucher's data is finished." }, { status: 403 });
  // Used vouchers may reconnect until time/data run out — MikroTik login is what starts them.
  const seconds = calendar && v.expiresAtMs
    ? Math.max(0, Math.floor((v.expiresAtMs - now) / 1000))
    : pkg ? packageSeconds(pkg) : 0;
  if (v.activatedAtMs && calendar && seconds <= 0) {
    return NextResponse.json({ valid: false, message: "This voucher has expired." }, { status: 403 });
  }

  let hotspotLogin = "http://10.10.0.1/login";
  let syncQueued = false;
  if (token) {
    const router = findRouterByToken(token);
    const gateway = (router as { hotspotGatewayIp?: string } | null)?.hotspotGatewayIp?.trim();
    if (gateway && /^(?:\d{1,3}\.){3}\d{1,3}$/.test(gateway)) hotspotLogin = `http://${gateway}/login`;
    // Push vouchers onto the router now so /login accepts this code within ~3s.
    try {
      forgetLocalUsers(token);
      const script = localUserLines(token, router?.ip || "");
      if (script.length > 1) {
        queueJob(token, script.join("\n") + "\n", "portal");
        syncQueued = true;
      }
    } catch {
      /* still allow the phone to try login; check-in may already have the user */
    }
  } else {
    const routers = getState("routers")?.value;
    const first = Array.isArray(routers) ? (routers as { hotspotGatewayIp?: string }[])[0] : null;
    const gateway = first?.hotspotGatewayIp?.trim();
    if (gateway && /^(?:\d{1,3}\.){3}\d{1,3}$/.test(gateway)) hotspotLogin = `http://${gateway}/login`;
  }

  return NextResponse.json({
    valid: true,
    packageName: v.packageName,
    secondsLeft: seconds,
    started: !!v.activatedAtMs,
    bytesLeft: cap === null ? null : cap - used,
    hotspotLogin,
    syncQueued,
    // Portal should wait briefly when we just queued the voucher onto the router.
    waitMs: syncQueued ? 3500 : 0,
  });
}
