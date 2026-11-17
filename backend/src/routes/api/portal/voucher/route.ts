import { NextResponse } from "next/server";
import { clientIp, limited } from "@/server/limit";
import { findPackageByName, findVoucher, packageBytes, packageSeconds, voucherLimitBy, voucherUsesCalendar } from "@/server/packages";
import { usedBytes } from "@/server/radius";

// Public: is this voucher good to use, and how much is left? (Read-only — the
// router's RADIUS login is what actually starts the clock.)
export async function POST(request: Request) {
  if (limited(`vch|${clientIp(request)}`, 20, 60_000)) return NextResponse.json({ valid: false, message: "Too many attempts. Wait a minute." }, { status: 429 });
  const body = (await request.json().catch(() => ({}))) as { username?: string; password?: string };
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
  return NextResponse.json({ valid: true, packageName: v.packageName, secondsLeft: seconds, started: !!v.activatedAtMs, bytesLeft: cap === null ? null : cap - used });
}
