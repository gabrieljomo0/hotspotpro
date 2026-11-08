"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { Search } from "lucide-react";

import { Badge, Card, Loading, Table, Td, ago, inputClass, money, useApi, when } from "../ui";

export type TenantRow = {
  id: string; tag: string; name: string; status: "active" | "suspended"; createdAt: string;
  owner: { name: string; email: string; lastLoginAt: string | null; role: string } | null;
  stats: {
    routers: number; routersOnline: number; vouchers: number; agents: number; installers: number; activeUsers: number;
    paymentsPaid: number; revenue30d: Record<string, number>; lastActivityAt: string | null;
  };
};

export default function BusinessesPage() {
  const { data, error } = useApi<{ tenants: TenantRow[] }>("/api/super/tenants");
  const [query, setQuery] = useState("");
  const [status, setStatus] = useState<"all" | "active" | "suspended">("all");

  const rows = useMemo(() => {
    const q = query.trim().toLowerCase();
    return (data?.tenants ?? [])
      .filter((t) => status === "all" || t.status === status)
      .filter((t) => !q || `${t.name} ${t.owner?.name ?? ""} ${t.owner?.email ?? ""}`.toLowerCase().includes(q))
      .sort((a, b) => b.createdAt.localeCompare(a.createdAt));
  }, [data, query, status]);

  if (!data) return <Loading error={error} />;
  return (
    <>
      <h1 className="mb-1 text-3xl font-bold tracking-tight">Businesses</h1>
      <p className="mb-6 text-sm text-[#737373]">Everyone who uses the platform for their WiFi. Open one to see everything it does, or to step into its dashboard.</p>

      <div className="mb-4 flex flex-wrap gap-3">
        <div className="relative min-w-[240px] flex-1">
          <Search size={16} className="absolute left-3 top-3 text-[#a3a3a3]" />
          <input value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Search by business, owner or email" className={`${inputClass} pl-9`} />
        </div>
        <select value={status} onChange={(e) => setStatus(e.target.value as typeof status)} className={`${inputClass} w-auto`}>
          <option value="all">All statuses</option>
          <option value="active">Active</option>
          <option value="suspended">Suspended</option>
        </select>
      </div>

      <Card>
        <Table head={["Business", "Owner", "Status", "Routers", "Vouchers", "Customers", "Revenue (30 d)", "Last activity", "Joined"]} empty={rows.length ? undefined : "No businesses match."}>
          {rows.map((t) => (
            <tr key={t.id} className="hover:bg-[#f7f7f7]">
              <Td><Link href={`/super-admin/businesses/${t.id}`} className="font-semibold text-[#1a1a1a] hover:text-[#1a1a1a]">{t.name}</Link></Td>
              <Td>{t.owner ? <>{t.owner.name || "—"}<p className="text-xs text-[#a3a3a3]">{t.owner.email}</p></> : "—"}</Td>
              <Td><Badge tone={t.status === "active" ? "green" : "red"}>{t.status === "active" ? "Active" : "Suspended"}</Badge></Td>
              <Td>{t.stats.routersOnline}/{t.stats.routers}</Td>
              <Td>{t.stats.vouchers}</Td>
              <Td>{t.stats.activeUsers}</Td>
              <Td>{money(t.stats.revenue30d)}</Td>
              <Td className="whitespace-nowrap">{ago(t.stats.lastActivityAt)}</Td>
              <Td className="whitespace-nowrap">{when(t.createdAt)}</Td>
            </tr>
          ))}
        </Table>
      </Card>
    </>
  );
}
