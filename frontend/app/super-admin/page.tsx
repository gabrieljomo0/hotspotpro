"use client";

import Link from "next/link";
import { Bar, BarChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";

import { Badge, Card, Loading, Stat, Table, Td, ago, bytes, money, useApi } from "./ui";

type Overview = {
  totals: {
    businesses: number; active: number; suspended: number; accounts: number; routers: number; routersOnline: number;
    vouchers: number; agents: number; installers: number; activeUsers: number; liveSessions: number;
    paymentsPaid: number; paymentsPending: number; dataBytes: number;
    revenue: Record<string, number>; revenueToday: Record<string, number>; revenue30d: Record<string, number>;
  };
  signups: { day: string; count: number }[];
  topBusinesses: { id: string; name: string; revenue30d: Record<string, number>; routers: number }[];
  recentActivity: { id: string; at: string; type: string; text: string; tenantId?: string | null }[];
};

export default function SuperAdminOverview() {
  const { data, error } = useApi<Overview>("/api/super/overview");
  if (!data) return <Loading error={error} />;
  const t = data.totals;
  return (
    <>
      <h1 className="mb-1 text-3xl font-bold tracking-tight">Platform overview</h1>
      <p className="mb-6 text-sm text-[#737373]">Everything happening across every business on this site. Updates every few seconds.</p>

      <div className="mb-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Stat label="Businesses" value={t.businesses} hint={`${t.active} active · ${t.suspended} suspended`} />
        <Stat label="Routers" value={t.routers} hint={`${t.routersOnline} online`} />
        <Stat label="Customers online now" value={t.liveSessions} hint={`${t.activeUsers} on the Active Users lists`} />
        <Stat label="Accounts" value={t.accounts} hint={`${t.agents} agents · ${t.installers} installers`} />
        <Stat label="Revenue today" value={money(t.revenueToday)} />
        <Stat label="Revenue, last 30 days" value={money(t.revenue30d)} />
        <Stat label="Revenue, all time" value={money(t.revenue)} hint={`${t.paymentsPaid} paid · ${t.paymentsPending} pending`} />
        <Stat label="Data used (all routers)" value={bytes(t.dataBytes)} hint={`${t.vouchers} vouchers issued`} />
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <Card title="New businesses, last 14 days">
          <div className="h-56 px-3 pb-4 pt-4">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={data.signups.map((s) => ({ ...s, label: s.day.slice(5) }))}>
                <CartesianGrid vertical={false} stroke="#e6e6e6" strokeDasharray="3 3" />
                <XAxis dataKey="label" tick={{ fontSize: 11 }} />
                <YAxis allowDecimals={false} tick={{ fontSize: 11 }} width={28} />
                <Tooltip formatter={(v) => [String(v), "Sign-ups"]} />
                <Bar dataKey="count" fill="#1a1a1a" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </Card>

        <Card title="Top businesses (30-day revenue)" action={<Link href="/super-admin/businesses" className="text-sm font-semibold text-[#1a1a1a]">All businesses</Link>}>
          <Table head={["Business", "Routers", "Revenue"]} empty={data.topBusinesses.length ? undefined : "No businesses yet."}>
            {data.topBusinesses.map((b) => (
              <tr key={b.id}>
                <Td><Link href={`/super-admin/businesses/${b.id}`} className="font-semibold text-[#1a1a1a] hover:text-[#1a1a1a]">{b.name}</Link></Td>
                <Td>{b.routers}</Td>
                <Td>{money(b.revenue30d)}</Td>
              </tr>
            ))}
          </Table>
        </Card>
      </div>

      <Card title="Latest activity" action={<Link href="/super-admin/activity" className="text-sm font-semibold text-[#1a1a1a]">Full log</Link>}>
        <Table head={["When", "What happened"]} empty={data.recentActivity.length ? undefined : "Nothing yet."}>
          {data.recentActivity.map((e) => (
            <tr key={e.id}>
              <Td className="whitespace-nowrap">{ago(e.at)}</Td>
              <Td><Badge tone={e.type.includes("suspend") || e.type === "deleted" ? "red" : e.type === "signup" ? "green" : "blue"}>{e.type}</Badge> <span className="ml-2">{e.text}</span></Td>
            </tr>
          ))}
        </Table>
      </Card>
    </>
  );
}
