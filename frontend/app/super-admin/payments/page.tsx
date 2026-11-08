"use client";

import { useMemo, useState } from "react";
import Link from "next/link";

import { Badge, Card, Loading, Table, Td, inputClass, money, useApi, when } from "../ui";

type Payment = { id: string; tenantId: string; business: string; status: string; amount: number; currency: string; phone: string; network: string; packageName: string; gateway: string; createdAt: string; failureReason?: string };

export default function PaymentsPage() {
  const { data, error } = useApi<{ payments: Payment[] }>("/api/super/payments?limit=500");
  const [status, setStatus] = useState("all");
  const rows = useMemo(() => (data?.payments ?? []).filter((p) => status === "all" || p.status === status), [data, status]);
  const total = useMemo(() => {
    const sums: Record<string, number> = {};
    for (const p of rows) if (p.status === "paid") sums[p.currency || "GHS"] = (sums[p.currency || "GHS"] ?? 0) + p.amount;
    return sums;
  }, [rows]);
  if (!data) return <Loading error={error} />;
  return (
    <>
      <h1 className="mb-1 text-3xl font-bold tracking-tight">Payments</h1>
      <p className="mb-6 text-sm text-[#64748b]">Every voucher purchase on the platform, newest first. Paid total in this view: <strong>{money(total)}</strong></p>
      <div className="mb-4">
        <select value={status} onChange={(e) => setStatus(e.target.value)} className={`${inputClass} w-auto`}>
          <option value="all">All statuses</option><option value="paid">Paid</option><option value="pending">Pending</option><option value="failed">Failed</option><option value="expired">Expired</option>
        </select>
      </div>
      <Card>
        <Table head={["When", "Business", "Customer", "Package", "Amount", "Gateway", "Status"]} empty={rows.length ? undefined : "No payments yet."}>
          {rows.map((p) => (
            <tr key={p.id}>
              <Td className="whitespace-nowrap">{when(p.createdAt)}</Td>
              <Td><Link href={`/super-admin/businesses/${p.tenantId}`} className="font-semibold text-[#0f172a] hover:text-[#2563eb]">{p.business}</Link></Td>
              <Td>{p.phone}{p.network ? <span className="text-xs text-[#94a3b8]"> · {p.network}</span> : null}</Td>
              <Td>{p.packageName}</Td><Td>{money({ [p.currency || "GHS"]: p.amount })}</Td><Td>{p.gateway}</Td>
              <Td><Badge tone={p.status === "paid" ? "green" : p.status === "pending" ? "amber" : "red"}>{p.status}</Badge>{p.failureReason ? <p className="mt-1 text-xs text-[#94a3b8]">{p.failureReason}</p> : null}</Td>
            </tr>
          ))}
        </Table>
      </Card>
    </>
  );
}
