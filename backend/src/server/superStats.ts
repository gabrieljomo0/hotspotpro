// Read-only numbers about every business, for the super admin. Reads each business's data
// directly (no business context is selected, so nothing can be changed from here).

import { type PaymentRecord, type TenantRecord, listAccounts, listTenants, tenantData } from "./store";

type Row = Record<string, unknown>;

function slice(tenantId: string, key: string): Row[] {
  const value = tenantData(tenantId)?.state[key]?.value;
  return Array.isArray(value) ? (value as Row[]).filter((r) => r && typeof r === "object") : [];
}

const day = (iso: string) => iso.slice(0, 10);
const OPEN_MS = 20 * 60 * 1000;

export type TenantStats = {
  routers: number;
  routersOnline: number;
  vouchers: number;
  vouchersUsed: number;
  agents: number;
  installers: number;
  packages: number;
  activeUsers: number;
  sessionsLive: number;
  paymentsPaid: number;
  paymentsPending: number;
  revenue: Record<string, number>;
  revenueToday: Record<string, number>;
  revenue30d: Record<string, number>;
  dataBytes: number;
  lastActivityAt: string | null;
};

const add = (into: Record<string, number>, currency: string, amount: number) => {
  into[currency] = Math.round(((into[currency] ?? 0) + amount) * 100) / 100;
};

export function statsFor(tenantId: string): TenantStats {
  const data = tenantData(tenantId);
  const now = Date.now();
  const today = day(new Date(now).toISOString());
  const since30 = now - 30 * 86400000;
  const payments: PaymentRecord[] = data ? Object.values(data.payments) : [];
  const revenue: Record<string, number> = {};
  const revenueToday: Record<string, number> = {};
  const revenue30d: Record<string, number> = {};
  let paid = 0, pending = 0;
  for (const p of payments) {
    if (p.status === "pending") pending++;
    if (p.status !== "paid") continue;
    paid++;
    const cur = p.currency || "GHS";
    add(revenue, cur, p.amount);
    const at = p.paidAt ?? p.createdAt;
    if (day(at) === today) add(revenueToday, cur, p.amount);
    if (Date.parse(at) >= since30) add(revenue30d, cur, p.amount);
  }
  const routers = slice(tenantId, "routers");
  const vouchers = slice(tenantId, "vouchers");
  const sessions = data ? Object.values(data.radiusSessions) : [];
  let bytes = 0;
  for (const s of sessions) if (!s.simulated) bytes += s.bytesIn + s.bytesOut;
  const stamps: string[] = [];
  if (data) {
    for (const doc of Object.values(data.state)) stamps.push(doc.updatedAt);
    for (const p of payments) stamps.push(p.paidAt ?? p.createdAt);
    for (const s of sessions) if (!s.simulated) stamps.push(s.updatedAt);
  }
  return {
    routers: routers.length,
    routersOnline: routers.filter((r) => r.status === "Online").length,
    vouchers: vouchers.length,
    vouchersUsed: vouchers.filter((v) => v.status === "Used" || v.status === "Expired").length,
    agents: slice(tenantId, "agents").length,
    installers: slice(tenantId, "installers").length,
    packages: slice(tenantId, "packages").length,
    activeUsers: slice(tenantId, "activeUsers").length,
    sessionsLive: sessions.filter((s) => !s.simulated && !s.stoppedAt && now - Date.parse(s.updatedAt) < OPEN_MS).length,
    paymentsPaid: paid,
    paymentsPending: pending,
    revenue,
    revenueToday,
    revenue30d,
    dataBytes: bytes,
    lastActivityAt: stamps.sort().at(-1) ?? null,
  };
}

export function mergeMoney(into: Record<string, number>, from: Record<string, number>) {
  for (const [cur, amount] of Object.entries(from)) add(into, cur, amount);
}

export function ownerOf(tenant: TenantRecord) {
  const account = listAccounts().find((a) => a.id === tenant.ownerAccountId) ?? listAccounts().find((a) => a.tenantId === tenant.id);
  return account ? { id: account.id, name: account.name ?? "", email: account.email, lastLoginAt: account.lastLoginAt ?? null, role: account.role } : null;
}

export function tenantSummary(tenant: TenantRecord) {
  return { ...tenant, owner: ownerOf(tenant), stats: statsFor(tenant.id) };
}

export function allTenantSummaries() {
  return listTenants().map(tenantSummary);
}

export function signupsPerDay(days = 14) {
  const out: { day: string; count: number }[] = [];
  const tenants = listTenants();
  for (let i = days - 1; i >= 0; i--) {
    const d = day(new Date(Date.now() - i * 86400000).toISOString());
    out.push({ day: d, count: tenants.filter((t) => day(t.createdAt) === d).length });
  }
  return out;
}

export function routersOf(tenantId: string) {
  return slice(tenantId, "routers").map((r) => ({
    name: String(r.name ?? ""),
    ip: String(r.ip ?? ""),
    status: String(r.status ?? ""),
    disconnected: Boolean(r.disconnected),
    location: String(r.location ?? ""),
    hasToken: Boolean(r.provisioningToken),
  }));
}

export function paymentsOf(tenantId: string, limit = 50) {
  const data = tenantData(tenantId);
  return Object.values(data?.payments ?? {})
    .sort((a, b) => b.createdAt.localeCompare(a.createdAt))
    .slice(0, limit);
}

export function smsOf(tenantId: string, limit = 50) {
  return (tenantData(tenantId)?.smsLog ?? []).slice(0, limit);
}

export function sliceInfo(tenantId: string) {
  const data = tenantData(tenantId);
  return Object.entries(data?.state ?? {}).map(([key, doc]) => ({
    key,
    updatedAt: doc.updatedAt,
    updatedBy: doc.updatedBy,
    rev: doc.rev,
    items: Array.isArray(doc.value) ? doc.value.length : null,
  }));
}

export function peopleAcrossPlatform() {
  const rows: { tenantId: string; business: string; kind: "owner" | "super admin" | "agent" | "installer"; name: string; email: string; status: string; lastLoginAt?: string | null }[] = [];
  const tenants = listTenants();
  for (const a of listAccounts()) {
    const t = tenants.find((x) => x.id === a.tenantId);
    rows.push({ tenantId: a.tenantId, business: t?.name ?? "—", kind: a.role === "superadmin" ? "super admin" : "owner", name: a.name ?? "", email: a.email, status: t?.status === "suspended" ? "Suspended" : "Active", lastLoginAt: a.lastLoginAt ?? null });
  }
  for (const t of tenants) {
    for (const r of slice(t.id, "agents")) rows.push({ tenantId: t.id, business: t.name, kind: "agent", name: String(r.name ?? ""), email: String(r.email ?? ""), status: String(r.status ?? "") });
    for (const r of slice(t.id, "installers")) rows.push({ tenantId: t.id, business: t.name, kind: "installer", name: String(r.name ?? ""), email: String(r.email ?? ""), status: String(r.status ?? "") });
  }
  return rows;
}
