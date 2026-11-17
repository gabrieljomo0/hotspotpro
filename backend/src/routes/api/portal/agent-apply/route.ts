import { NextResponse } from "next/server";
import { clientIp, limited } from "@/server/limit";
import { addAudit, currentTenantId, getState, setState } from "@/server/store";

// Public (captive portal): someone applies to become a reseller/agent for this network.
// Saved into the business that owns the router token — not into the visitor's browser.

type AgentRow = {
  id: string;
  agentCode: string;
  name: string;
  email: string;
  username: string;
  role: string;
  status: string;
  isDefault: boolean;
  createdAt: string;
  routerIp: string | null;
  assignedAdminId: null;
  lastLogin: string;
  walletBalance: number;
  pendingCommission: number;
  earnedCommission: number;
  commissionRatePercent: number;
  appliedViaPortal: boolean;
  phone: string | null;
  whatsapp: string | null;
  location: string | null;
  password: string | null;
  idFrontFileName: string | null;
  idBackFileName: string | null;
  faceCaptureFileName: string | null;
  [key: string]: unknown;
};

function clean(value: unknown, max = 200) {
  return String(value ?? "").trim().slice(0, max);
}

function normalizeUsername(value: string) {
  return value.toLowerCase().replace(/[^a-z0-9._-]/g, "").slice(0, 32);
}

export async function POST(request: Request) {
  if (limited(`agent-apply|${clientIp(request)}`, 5, 60_000)) {
    return NextResponse.json({ message: "Too many attempts. Wait a minute and try again." }, { status: 429 });
  }
  const body = (await request.json().catch(() => ({}))) as Record<string, unknown>;
  const name = clean(body.name || body.fullName, 80);
  const email = clean(body.email, 120).toLowerCase();
  const phone = clean(body.phone, 40);
  const whatsapp = clean(body.whatsapp, 40);
  const location = clean(body.location, 120);
  const password = clean(body.password, 64);
  const username = normalizeUsername(clean(body.username, 40));
  const routerIp = clean(body.routerIp, 64) || null;
  if (!name || name.length < 2) return NextResponse.json({ message: "Enter your full name." }, { status: 400 });
  if (!email.includes("@") || !email.includes(".")) return NextResponse.json({ message: "Enter a valid email." }, { status: 400 });
  if (password.length < 6) return NextResponse.json({ message: "Password must be at least 6 characters." }, { status: 400 });
  if (!username || username.length < 3) return NextResponse.json({ message: "Choose a username (letters and numbers)." }, { status: 400 });

  const agents = (Array.isArray(getState("agents")?.value) ? getState("agents")!.value as AgentRow[] : []);
  if (agents.some((a) => a.email?.toLowerCase() === email)) {
    return NextResponse.json({ message: "An agent with that email already exists." }, { status: 409 });
  }
  if (agents.some((a) => (a.username || "").toLowerCase() === username)) {
    return NextResponse.json({ message: "That username is taken. Choose another." }, { status: 409 });
  }

  const id = `agent-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`;
  const agent: AgentRow = {
    id,
    agentCode: `AGT-${String(agents.length + 1).padStart(4, "0")}`,
    name,
    email,
    username,
    role: "Field Agent",
    status: "Pending",
    isDefault: false,
    createdAt: new Date().toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric" }),
    routerIp,
    assignedAdminId: null,
    lastLogin: "Never",
    walletBalance: 0,
    pendingCommission: 0,
    earnedCommission: 0,
    commissionRatePercent: 5,
    appliedViaPortal: true,
    phone: phone || null,
    whatsapp: whatsapp || null,
    location: location || null,
    password,
    idFrontFileName: clean(body.idFrontFileName, 120) || null,
    idBackFileName: clean(body.idBackFileName, 120) || null,
    faceCaptureFileName: clean(body.faceCaptureFileName, 120) || null,
    profileVerified: false,
    hasChangedDefaultPassword: false,
    requiresWalletFunding: true,
    riskFlag: false,
    permissions: {},
  };
  setState("agents", [agent, ...agents], "portal");

  const requests = Array.isArray(getState("approvalRequests")?.value) ? (getState("approvalRequests")!.value as Record<string, unknown>[]) : [];
  setState("approvalRequests", [
    {
      id: `appr-${Date.now()}`,
      type: "New Agent",
      agentId: id,
      agentName: name,
      summary: `New agent "${name}" (Field Agent) applied from the captive portal.`,
      status: "Pending",
      createdAt: new Date().toLocaleString("en-GB", { day: "2-digit", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit" }),
      decidedAt: null,
      decidedBy: null,
      reason: null,
    },
    ...requests,
  ].slice(0, 200), "portal");

  const files: Record<string, { idFront?: string; idBack?: string; face?: string }> =
    (getState("applicationFiles")?.value as Record<string, { idFront?: string; idBack?: string; face?: string }>) || {};
  const idFront = typeof body.idFrontImage === "string" ? body.idFrontImage.slice(0, 900_000) : undefined;
  const idBack = typeof body.idBackImage === "string" ? body.idBackImage.slice(0, 900_000) : undefined;
  const face = typeof body.faceCaptureImage === "string" ? body.faceCaptureImage.slice(0, 900_000) : undefined;
  if (idFront || idBack || face) {
    files[id] = { idFront, idBack, face };
    setState("applicationFiles", files, "portal");
  }

  addAudit({
    type: "agent-apply",
    text: `${name} applied as a reseller from the captive portal.`,
    tenantId: currentTenantId(),
    actor: email,
  });

  return NextResponse.json({ ok: true, agentId: id, status: "Pending" });
}
