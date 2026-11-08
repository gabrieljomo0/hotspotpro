import { NextResponse } from "next/server";
import {
  createAccountWithBusiness,
  createSessionToken,
  recordFailedAttempt,
  safeEqual,
  sessionCookie,
  signupOpen,
  superAdminExists,
  tooManyAttempts,
} from "@/server/auth";
import { addAudit, findAccountByEmail } from "@/server/store";

type RegisterBody = {
  name?: string;
  businessName?: string;
  email?: string;
  password?: string;
  setupCode?: string;
};

const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;

function fail(message: string, status = 400) {
  return NextResponse.json({ message }, { status });
}

// Creates an account AND the business it owns, then signs the person in.
//  - The very first sign-up on a fresh installation becomes the SUPER ADMIN (it needs the
//    server's HOTSPOTPRO_SETUP_CODE if one is set, so nobody can claim a new site before you).
//  - After that, anyone may register a business of their own (their data is completely separate)
//    while the super admin keeps sign-up switched on.
export async function POST(request: Request) {
  const ip = request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ?? "local";
  const limiterKey = `register|${ip}`;
  if (tooManyAttempts(limiterKey)) return fail("Too many attempts. Wait a few minutes and try again.", 429);
  recordFailedAttempt(limiterKey); // every try counts

  const first = !superAdminExists();
  if (!signupOpen()) {
    return fail("New sign-ups are switched off on this site. Ask the administrator for an account.", 403);
  }

  const body = (await request.json().catch(() => ({}))) as RegisterBody;
  const name = (body.name ?? "").trim();
  const businessName = (body.businessName ?? "").trim();
  const email = (body.email ?? "").trim().toLowerCase();
  const password = body.password ?? "";

  const required = process.env.HOTSPOTPRO_SETUP_CODE;
  if (first && required && !safeEqual(body.setupCode ?? "", required)) {
    return fail("The setup code is not correct. It is the HOTSPOTPRO_SETUP_CODE set on the server.", 403);
  }
  if (name.length < 2) return fail("Enter your full name.");
  if (!EMAIL.test(email)) return fail("Enter a valid email address.");
  if (password.length < 8) return fail("The password must be at least 8 characters.");
  if (password.length > 200) return fail("That password is too long.");
  if (findAccountByEmail(email)) return fail("An account with this email already exists. Sign in instead.", 409);

  const account = createAccountWithBusiness({ email, password, name, businessName, role: first ? "superadmin" : "admin" });
  console.log(`[auth] ${first ? "SUPER ADMIN" : "business"} account created: ${email}`);
  addAudit({
    type: first ? "super-admin-created" : "signup",
    text: first ? `${email} created the super admin account` : `${email} registered the business "${businessName || name}"`,
    tenantId: account.tenantId,
    actor: email,
    ip,
  });

  const response = NextResponse.json({ success: true, role: "admin", super: first, name, email });
  response.cookies.set(sessionCookie(createSessionToken({ sub: account.id, role: "admin", email, tid: account.tenantId, sup: first || undefined })));
  return response;
}
