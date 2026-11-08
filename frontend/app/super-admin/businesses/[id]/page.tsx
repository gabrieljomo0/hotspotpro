"use client";

import Link from "next/link";
import { useParams } from "next/navigation";
import { useEffect, useState } from "react";
import { ArrowLeft, ExternalLink, KeyRound, PauseCircle, PlayCircle, Trash2 } from "lucide-react";

import { purgeLocalCache } from "@/components/dashboard/context/localCache";
import {
  Badge, Card, Loading, Stat, Table, Td, ago, api, bytes, dangerButton, inputClass, money, primaryButton, quietButton, useApi, when,
} from "../../ui";

type Detail = {
  tenant: {
    id: string; tag: string; name: string; status: "active" | "suspended"; createdAt: string; suspendedAt?: string; suspendedReason?: string; notes?: string;
    owner: { name: string; email: string; lastLoginAt: string | null } | null;
    stats: {
      routers: number; routersOnline: number; vouchers: number; vouchersUsed: number; agents: number; installers: number; packages: number;
      activeUsers: number; sessionsLive: number; paymentsPaid: number; paymentsPending: number; dataBytes: number; lastActivityAt: string | null;
      revenue: Record<string, number>; revenueToday: Record<string, number>; revenue30d: Record<string, number>;
    };
  };
  accounts: { id: string; email: string; name: string; role: string; createdAt: string; lastLoginAt: string | null }[];
  routers: { name: string; ip: string; status: string; disconnected: boolean; location: string; hasToken: boolean }[];
  payments: { id: string; status: string; amount: number; currency: string; phone: string; packageName: string; gateway: string; createdAt: string }[];
  sms: { id: string; to: string; text: string; status: string; createdAt: string }[];
  activity: { id: string; at: string; type: string; text: string }[];
  data: { key: string; updatedAt: string; updatedBy: string; rev: number; items: number | null }[];
};

export default function BusinessDetailPage() {
  const { id } = useParams<{ id: string }>();
  const { data, error, reload } = useApi<Detail>(`/api/super/tenants/${id}`);
  const [notes, setNotes] = useState("");
  const [notesLoaded, setNotesLoaded] = useState(false);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState<{ tone: "ok" | "bad"; text: string } | null>(null);
  const [reason, setReason] = useState("");
  const [confirmDelete, setConfirmDelete] = useState("");
  const [showDanger, setShowDanger] = useState(false);
  const [temporary, setTemporary] = useState<string | null>(null);

  useEffect(() => {
    if (data && !notesLoaded) {
      setNotes(data.tenant.notes ?? "");
      setNotesLoaded(true);
    }
  }, [data, notesLoaded]);

  if (!data) return <Loading error={error} />;
  const t = data.tenant;

  async function run(label: string, action: () => Promise<unknown>, done?: string) {
    setBusy(true);
    setMessage(null);
    try {
      await action();
      if (done) setMessage({ tone: "ok", text: done });
      await reload();
    } catch (e) {
      setMessage({ tone: "bad", text: `${label}: ${(e as Error).message}` });
    } finally {
      setBusy(false);
    }
  }

  async function openAsBusiness() {
    await run("Could not open the dashboard", async () => {
      await api("/api/super/view", { method: "POST", body: JSON.stringify({ tenantId: t.id }) });
      purgeLocalCache(); // never mix this business's data with another's cached copy
      window.location.assign("/dashboards");
    });
  }

  return (
    <>
      <Link href="/super-admin/businesses" className="mb-4 inline-flex items-center gap-1 text-sm font-semibold text-[#2563eb]"><ArrowLeft size={15} /> All businesses</Link>

      <div className="mb-6 flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="flex flex-wrap items-center gap-3 text-3xl font-bold tracking-tight">
            {t.name} <Badge tone={t.status === "active" ? "green" : "red"}>{t.status === "active" ? "Active" : "Suspended"}</Badge>
          </h1>
          <p className="mt-1 text-sm text-[#64748b]">
            {t.owner ? `${t.owner.name || "Owner"} · ${t.owner.email} · last signed in ${ago(t.owner.lastLoginAt)}` : "No owner account"} · joined {when(t.createdAt)}
          </p>
          {t.status === "suspended" && (
            <p className="mt-2 text-sm text-[#b91c1c]">Suspended {when(t.suspendedAt)}{t.suspendedReason ? `: ${t.suspendedReason}` : ""}. Its owner, agents and customers are locked out.</p>
          )}
        </div>
        <div className="flex flex-wrap gap-2">
          <button type="button" disabled={busy} onClick={openAsBusiness} className={primaryButton}>
            <span className="inline-flex items-center gap-2"><ExternalLink size={15} /> Open its dashboard</span>
          </button>
        </div>
      </div>

      {message && (
        <p className={`mb-4 rounded-lg p-3 text-sm ${message.tone === "ok" ? "bg-emerald-50 text-emerald-700" : "bg-[#fef2f2] text-[#b91c1c]"}`}>{message.text}</p>
      )}
      {temporary && (
        <p className="mb-4 rounded-lg border border-[#cbd5e1] bg-white p-3 text-sm text-[#0f172a]">
          New temporary password for {t.owner?.email}: <code className="rounded bg-[#f1f5f9] px-2 py-1 font-bold">{temporary}</code>. Send it to them now; it is not shown again.
        </p>
      )}

      <div className="mb-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Stat label="Routers" value={`${t.stats.routersOnline}/${t.stats.routers}`} hint="online / total" />
        <Stat label="Customers online" value={t.stats.sessionsLive} hint={`${t.stats.activeUsers} on Active Users`} />
        <Stat label="Vouchers" value={t.stats.vouchers} hint={`${t.stats.vouchersUsed} used or expired`} />
        <Stat label="Team" value={t.stats.agents + t.stats.installers} hint={`${t.stats.agents} agents · ${t.stats.installers} installers`} />
        <Stat label="Revenue today" value={money(t.stats.revenueToday)} />
        <Stat label="Revenue, 30 days" value={money(t.stats.revenue30d)} />
        <Stat label="Revenue, all time" value={money(t.stats.revenue)} hint={`${t.stats.paymentsPaid} paid · ${t.stats.paymentsPending} pending`} />
        <Stat label="Data used" value={bytes(t.stats.dataBytes)} hint={`last activity ${ago(t.stats.lastActivityAt)}`} />
      </div>

      <Card title="Controls">
        <div className="space-y-5 p-5">
          <div className="flex flex-wrap items-end gap-3">
            {t.status === "active" ? (
              <>
                <div className="min-w-[240px] flex-1">
                  <label className="mb-1 block text-sm text-[#475569]">Reason (shown in the log)</label>
                  <input value={reason} onChange={(e) => setReason(e.target.value)} placeholder="e.g. unpaid subscription" className={inputClass} />
                </div>
                <button type="button" disabled={busy} onClick={() => run("Suspend failed", () => api(`/api/super/tenants/${id}`, { method: "PATCH", body: JSON.stringify({ status: "suspended", reason }) }), "Business suspended.")} className={dangerButton}>
                  <span className="inline-flex items-center gap-2"><PauseCircle size={15} /> Suspend</span>
                </button>
              </>
            ) : (
              <button type="button" disabled={busy} onClick={() => run("Reactivate failed", () => api(`/api/super/tenants/${id}`, { method: "PATCH", body: JSON.stringify({ status: "active" }) }), "Business reactivated.")} className={primaryButton}>
                <span className="inline-flex items-center gap-2"><PlayCircle size={15} /> Reactivate</span>
              </button>
            )}
            <button type="button" disabled={busy || !t.owner} onClick={() => run("Password reset failed", async () => { const r = await api<{ temporaryPassword: string }>(`/api/super/tenants/${id}/reset-password`, { method: "POST", body: "{}" }); setTemporary(r.temporaryPassword); }, "Temporary password created.")} className={quietButton}>
              <span className="inline-flex items-center gap-2"><KeyRound size={15} /> Reset owner password</span>
            </button>
          </div>

          <div>
            <label className="mb-1 block text-sm text-[#475569]">Private notes (only you see these)</label>
            <textarea value={notes} onChange={(e) => setNotes(e.target.value)} rows={3} className={inputClass} />
            <button type="button" disabled={busy} onClick={() => run("Saving notes failed", () => api(`/api/super/tenants/${id}`, { method: "PATCH", body: JSON.stringify({ notes }) }), "Notes saved.")} className={`${quietButton} mt-2`}>Save notes</button>
          </div>

          <div className="border-t border-[#e2e8f0] pt-4">
            <button type="button" onClick={() => setShowDanger((v) => !v)} className="text-sm font-semibold text-[#b91c1c]">{showDanger ? "Hide" : "Show"} delete option</button>
            {showDanger && (
              <div className="mt-3 rounded-xl border border-red-200 bg-red-50 p-4">
                <p className="text-sm text-red-700">Deleting removes this business, its owner and every router, voucher, payment and setting it has. This cannot be undone. Type <strong>{t.name}</strong> to confirm.</p>
                <div className="mt-3 flex flex-wrap gap-2">
                  <input value={confirmDelete} onChange={(e) => setConfirmDelete(e.target.value)} className={`${inputClass} max-w-xs`} />
                  <button type="button" disabled={busy || confirmDelete !== t.name} onClick={() => run("Delete failed", async () => { await api(`/api/super/tenants/${id}`, { method: "DELETE", body: JSON.stringify({ confirm: confirmDelete }) }); window.location.assign("/super-admin/businesses"); })} className={dangerButton}>
                    <span className="inline-flex items-center gap-2"><Trash2 size={15} /> Delete forever</span>
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      </Card>

      <Card title="Accounts">
        <Table head={["Name", "Email", "Role", "Last signed in", "Created"]} empty={data.accounts.length ? undefined : "No accounts."}>
          {data.accounts.map((a) => (
            <tr key={a.id}><Td>{a.name || "—"}</Td><Td>{a.email}</Td><Td><Badge tone={a.role === "superadmin" ? "blue" : "grey"}>{a.role === "superadmin" ? "super admin" : "owner"}</Badge></Td><Td>{ago(a.lastLoginAt)}</Td><Td>{when(a.createdAt)}</Td></tr>
          ))}
        </Table>
      </Card>

      <Card title="Routers">
        <Table head={["Name", "Address", "Status", "Location", "Setup link"]} empty={data.routers.length ? undefined : "No routers added yet."}>
          {data.routers.map((r) => (
            <tr key={r.ip + r.name}>
              <Td className="font-semibold text-[#0f172a]">{r.name}</Td><Td className="font-mono text-xs">{r.ip}</Td>
              <Td>{r.disconnected ? <Badge tone="red">Disconnected</Badge> : <Badge tone={r.status === "Online" ? "green" : "grey"}>{r.status || "—"}</Badge>}</Td>
              <Td>{r.location || "—"}</Td><Td>{r.hasToken ? "Yes" : "No"}</Td>
            </tr>
          ))}
        </Table>
      </Card>

      <Card title="Recent payments">
        <Table head={["When", "Customer", "Package", "Amount", "Gateway", "Status"]} empty={data.payments.length ? undefined : "No payments yet."}>
          {data.payments.map((p) => (
            <tr key={p.id}>
              <Td className="whitespace-nowrap">{when(p.createdAt)}</Td><Td>{p.phone}</Td><Td>{p.packageName}</Td><Td>{money({ [p.currency || "GHS"]: p.amount })}</Td><Td>{p.gateway}</Td>
              <Td><Badge tone={p.status === "paid" ? "green" : p.status === "pending" ? "amber" : "red"}>{p.status}</Badge></Td>
            </tr>
          ))}
        </Table>
      </Card>

      <Card title="Recent SMS">
        <Table head={["When", "To", "Message", "Status"]} empty={data.sms.length ? undefined : "No SMS sent."}>
          {data.sms.map((m) => (
            <tr key={m.id}><Td className="whitespace-nowrap">{when(m.createdAt)}</Td><Td>{m.to}</Td><Td className="max-w-md truncate">{m.text}</Td><Td><Badge tone={m.status === "sent" ? "green" : m.status === "failed" ? "red" : "grey"}>{m.status}</Badge></Td></tr>
          ))}
        </Table>
      </Card>

      <Card title="Activity about this business">
        <Table head={["When", "What happened"]} empty={data.activity.length ? undefined : "Nothing recorded yet."}>
          {data.activity.map((e) => (
            <tr key={e.id}><Td className="whitespace-nowrap">{when(e.at)}</Td><Td><Badge tone="blue">{e.type}</Badge> <span className="ml-2">{e.text}</span></Td></tr>
          ))}
        </Table>
      </Card>

      <Card title="Saved data" subtitle="What this business has stored on the server (open its dashboard to see and edit it).">
        <Table head={["Name", "Items", "Version", "Last changed", "By"]} empty={data.data.length ? undefined : "Nothing saved yet."}>
          {data.data.map((d) => (
            <tr key={d.key}><Td className="font-mono text-xs">{d.key}</Td><Td>{d.items ?? "—"}</Td><Td>{d.rev}</Td><Td className="whitespace-nowrap">{when(d.updatedAt)}</Td><Td>{d.updatedBy}</Td></tr>
          ))}
        </Table>
      </Card>
    </>
  );
}
