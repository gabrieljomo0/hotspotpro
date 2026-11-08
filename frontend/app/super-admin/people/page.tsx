"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { Search } from "lucide-react";

import { Badge, Card, Loading, Table, Td, ago, inputClass, useApi } from "../ui";

type Person = { tenantId: string; business: string; kind: "owner" | "super admin" | "agent" | "installer"; name: string; email: string; status: string; lastLoginAt?: string | null };

export default function PeoplePage() {
  const { data, error } = useApi<{ people: Person[] }>("/api/super/people");
  const [query, setQuery] = useState("");
  const [kind, setKind] = useState("all");
  const rows = useMemo(() => {
    const q = query.trim().toLowerCase();
    return (data?.people ?? []).filter((p) => (kind === "all" || p.kind === kind) && (!q || `${p.name} ${p.email} ${p.business}`.toLowerCase().includes(q)));
  }, [data, query, kind]);
  if (!data) return <Loading error={error} />;
  return (
    <>
      <h1 className="mb-1 text-3xl font-bold tracking-tight">People</h1>
      <p className="mb-6 text-sm text-[#737373]">Everyone with a login on the platform: business owners, their agents and their installers.</p>
      <div className="mb-4 flex flex-wrap gap-3">
        <div className="relative min-w-[240px] flex-1">
          <Search size={16} className="absolute left-3 top-3 text-[#a3a3a3]" />
          <input value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Search by name, email or business" className={`${inputClass} pl-9`} />
        </div>
        <select value={kind} onChange={(e) => setKind(e.target.value)} className={`${inputClass} w-auto`}>
          <option value="all">Everyone</option><option value="owner">Owners</option><option value="agent">Agents</option><option value="installer">Installers</option><option value="super admin">Super admin</option>
        </select>
      </div>
      <Card>
        <Table head={["Name", "Email", "Role", "Business", "Status", "Last signed in"]} empty={rows.length ? undefined : "No one matches."}>
          {rows.map((p, i) => (
            <tr key={`${p.email}-${p.kind}-${i}`}>
              <Td className="font-semibold text-[#1a1a1a]">{p.name || "—"}</Td><Td>{p.email || "—"}</Td>
              <Td><Badge tone={p.kind === "super admin" ? "blue" : p.kind === "owner" ? "green" : "grey"}>{p.kind}</Badge></Td>
              <Td><Link href={`/super-admin/businesses/${p.tenantId}`} className="hover:text-[#1a1a1a]">{p.business}</Link></Td>
              <Td><Badge tone={/active/i.test(p.status) ? "green" : /suspend/i.test(p.status) ? "red" : "amber"}>{p.status || "—"}</Badge></Td>
              <Td>{p.lastLoginAt !== undefined ? ago(p.lastLoginAt) : "—"}</Td>
            </tr>
          ))}
        </Table>
      </Card>
    </>
  );
}
