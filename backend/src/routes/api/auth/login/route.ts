import { NextResponse } from "next/server";
import {
  clearAttempts,
  createSessionToken,
  recordFailedAttempt,
  safeEqual,
  sessionCookie,
  tenantAllowed,
  tooManyAttempts,
  verifyAdmin,
} from "@/server/auth";
import { findAgentById, listOf, scanAll } from "@/server/directory";
import { addAudit, findAccountByEmail, getState, getTenant, saveAccount, withTenant } from "@/server/store";
import { accessBlockedMessage, agentSignInBlock } from "@/server/agentAccess";

type LoginBody = { email?: string; password?: string; agentId?: string; biz?: string };
type AgentRow = { id: string; email: string; password: string | null; status: string; role?: string; assignedAdminId?: string | null; isDefault?: boolean; portalLoginEnabled?: boolean; portalAccessEnabled?: boolean };
type InstallerRow = { id: string; email: string; password: string | null; status: string };

// The sample agents and installers that come with the demo data all use this password.
// On a live (production) server they must never be able to sign in.
const DEMO_PASSWORD = "password123";
const isDemoLogin = (stored: string) => process.env.NODE_ENV === "production" && stored === DEMO_PASSWORD;
const DEMO_BLOCKED = "This is a sample account and is switched off on a live server. Ask the owner for a new password.";
const SUSPENDED = "This account has been suspended. Contact the platform administrator.";

function fail(message: string, status = 401, extra: Record<string, unknown> = {}) {
  return NextResponse.json({ message, ...extra }, { status });
}

// One sign-in for everybody: business owners (admin), agents and installers.
export async function POST(request: Request) {
  let body: LoginBody;
  try {
    body = (await request.json()) as LoginBody;
  } catch {
    return fail("Invalid login request.", 400);
  }

  const password = body.password ?? "";
  const ip = request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ?? "local";
  const linked = body.agentId ? findAgentById<AgentRow>(body.agentId, body.biz) : null;
  const email = (linked?.row.email ?? body.email ?? "").trim();
  const limiterKey = `${email.toLowerCase()}|${ip}`;

  if (!email || !password) return fail("Enter your email address and password.", 400);
  if (tooManyAttempts(limiterKey)) {
    console.log(`[auth] sign-in blocked for ${email}: too many attempts`);
    return fail("Too many attempts. Wait a few minutes and try again.", 429);
  }

  function done(token: string, payload: Record<string, unknown>, tenantId: string | null) {
    console.log(`[auth] signed in: ${email} (${String(payload.role)})`);
    addAudit({ type: "sign-in", text: `${email} signed in as ${String(payload.role)}`, tenantId, actor: email, ip });
    clearAttempts(limiterKey);
    const response = NextResponse.json({ success: true, ...payload });
    response.cookies.set(sessionCookie(token));
    return response;
  }

  // 1) Business owners and the super admin.
  if (!body.agentId) {
    const admin = verifyAdmin(email, password);
    if (admin) {
      const isSuper = admin.role === "superadmin";
      if (!isSuper && !tenantAllowed(admin.tenantId)) {
        addAudit({ type: "sign-in-blocked", text: `${email} tried to sign in but the account is suspended`, tenantId: admin.tenantId, actor: email, ip });
        return fail(SUSPENDED, 403, { suspended: true });
      }
      saveAccount({ ...admin, lastLoginAt: new Date().toISOString() });
      return done(
        createSessionToken({ sub: admin.id, role: "admin", email: admin.email, tid: admin.tenantId, sup: isSuper || undefined }),
        { role: "admin", super: isSuper },
        admin.tenantId,
      );
    }
  }

  // 2) Agents (including admins added under an owner's agent dashboard), found in whichever business they belong to.
  const agentMatches = body.agentId
    ? linked ? [linked] : []
    : scanAll<AgentRow>("agents").filter((f) => f.row.email.toLowerCase() === email.toLowerCase() && f.row.password !== null);
  const agentHit = agentMatches.find((f) => f.row.password && safeEqual(f.row.password, password));
  if (agentHit) {
    const { tenant, row: agent } = agentHit;
    if (isDemoLogin(agent.password!)) return fail(DEMO_BLOCKED, 403);
    if (tenant.status !== "active") return fail(SUSPENDED, 403, { suspended: true });
    if (agent.status !== "Active") {
      return fail(accessBlockedMessage(agent.status), 403, { agentStatus: agent.status });
    }
    return withTenant(tenant.id, () => {
      // Admin's switches: "agent sign-in on/off" and this agent's own dashboard access.
      const policy = getState("hotspotPolicySettings")?.value as { agentPortalEnabled?: boolean } | undefined;
      const blocked = agentSignInBlock(agent, policy?.agentPortalEnabled ?? true);
      if (blocked) return fail(blocked, 403);
      const agents = listOf<AgentRow>(tenant.id, "agents");
      const owner =
        agent.role === "Associate Admin" && agent.assignedAdminId
          ? agents.find((a) => a.id === agent.assignedAdminId && a.isDefault)
          : undefined;
      const landingId = owner?.id ?? agent.id;
      return done(createSessionToken({ sub: landingId, role: "agent", email: agent.email, tid: tenant.id }), {
        role: "agent",
        agentId: landingId,
        memberId: agent.id,
      }, tenant.id);
    });
  }

  // 3) Installers.
  if (!body.agentId) {
    const hit = scanAll<InstallerRow>("installers").find(
      (f) => f.row.email.toLowerCase() === email.toLowerCase() && f.row.password !== null && safeEqual(f.row.password, password),
    );
    if (hit) {
      const { tenant, row: installer } = hit;
      if (isDemoLogin(installer.password!)) return fail(DEMO_BLOCKED, 403);
      if (tenant.status !== "active") return fail(SUSPENDED, 403, { suspended: true });
      if (installer.status !== "Active") {
        return fail("This installer account has been suspended. Contact admin.", 403);
      }
      return done(createSessionToken({ sub: installer.id, role: "installer", email: installer.email, tid: tenant.id }), {
        role: "installer",
        installerId: installer.id,
      }, tenant.id);
    }
  }

  recordFailedAttempt(limiterKey);
  console.log(
    `[auth] sign-in refused for ${email}: ${findAccountByEmail(email) ? "wrong password" : "no account with that email (and no matching agent/installer)"}`,
  );
  void getTenant;
  return fail(body.agentId ? "The password is incorrect." : "The email address or password is incorrect.");
}
