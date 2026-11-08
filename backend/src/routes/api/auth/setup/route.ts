import { NextResponse } from "next/server";
import { signupOpen, superAdminExists } from "@/server/auth";

// Tells the sign-in / sign-up pages what to show:
//  - firstAccount: nobody has registered yet, so the next sign-up becomes the SUPER ADMIN
//    (and needs the server's setup code, if one is set);
//  - signupOpen: whether new businesses may register (the super admin can switch this off).
export async function GET() {
  const first = !superAdminExists();
  return NextResponse.json({
    firstAccount: first,
    ownerExists: !first,
    signupOpen: signupOpen(),
    needsSetupCode: first && Boolean(process.env.HOTSPOTPRO_SETUP_CODE),
  });
}
