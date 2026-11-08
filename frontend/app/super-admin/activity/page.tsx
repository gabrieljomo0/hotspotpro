"use client";

import { useState } from "react";

import { Badge, Card, Loading, Table, Td, useApi, when } from "../ui";

type Entry = { id: string; at: string; type: string; text: string; actor?: string | null; ip?: string | null; tenantId?: string | null };
type Evt = { id: string; source: string; receivedAt: string; verified: boolean; business: string | null; body: unknown };
type Sms = { id: string; business: string; to: string; text: string; gateway: string; status: string; detail: string; createdAt: string };

export default function ActivityPage() {
  const [tab, setTab] = useState<"log" | "webhooks" | "sms">("log");
  const log = useApi<{ entries: Entry[] }>("/api/super/activity?limit=500");
  const events = useApi<{ events: Evt[] }>("/api/super/events?limit=200");
  const sms = useApi<{ sms: Sms[] }>("/api/super/sms?limit=200");
  const tabs = [["log", "Activity log"], ["webhooks", "Webhook callbacks"], ["sms", "SMS sent"]] as const;
  return (
    <>
      <h1 className="mb-1 text-3xl font-bold tracking-tight">Activity</h1>
      <p className="mb-6 text-sm text-[#737373]">What the platform and its businesses have been doing: sign-ups and sign-ins, super admin actions, payment callbacks and SMS.</p>
      <div className="mb-4 flex gap-2">
        {tabs.map(([key, label]) => (
          <button key={key} type="button" onClick={() => setTab(key)} className={`rounded-lg px-4 py-2 text-sm font-bold ${tab === key ? "bg-[#1a1a1a] text-white" : "border border-[#d4d4d4] bg-white text-[#525252] hover:bg-[#f4f4f4]"}`}>{label}</button>
        ))}
      </div>

      {tab === "log" && (log.data ? (
        <Card>
          <Table head={["When", "Type", "What happened", "By", "From"]} empty={log.data.entries.length ? undefined : "Nothing yet."}>
            {log.data.entries.map((e) => (
              <tr key={e.id}><Td className="whitespace-nowrap">{when(e.at)}</Td><Td><Badge tone={e.type.includes("suspend") || e.type === "deleted" || e.type.includes("blocked") ? "red" : e.type === "signup" ? "green" : "blue"}>{e.type}</Badge></Td><Td>{e.text}</Td><Td>{e.actor ?? "—"}</Td><Td className="font-mono text-xs">{e.ip ?? "—"}</Td></tr>
            ))}
          </Table>
        </Card>
      ) : <Loading error={log.error} />)}

      {tab === "webhooks" && (events.data ? (
        <Card>
          <Table head={["Received", "Source", "Business", "Verified", "Body"]} empty={events.data.events.length ? undefined : "No callbacks received yet."}>
            {events.data.events.map((e) => (
              <tr key={e.id}><Td className="whitespace-nowrap">{when(e.receivedAt)}</Td><Td>{e.source}</Td><Td>{e.business ?? "—"}</Td><Td><Badge tone={e.verified ? "green" : "amber"}>{e.verified ? "yes" : "no"}</Badge></Td><Td className="max-w-md truncate font-mono text-xs">{JSON.stringify(e.body)}</Td></tr>
            ))}
          </Table>
        </Card>
      ) : <Loading error={events.error} />)}

      {tab === "sms" && (sms.data ? (
        <Card>
          <Table head={["When", "Business", "To", "Message", "Status"]} empty={sms.data.sms.length ? undefined : "No SMS sent yet."}>
            {sms.data.sms.map((m) => (
              <tr key={m.id}><Td className="whitespace-nowrap">{when(m.createdAt)}</Td><Td>{m.business}</Td><Td>{m.to}</Td><Td className="max-w-md truncate">{m.text}</Td><Td><Badge tone={m.status === "sent" ? "green" : m.status === "failed" ? "red" : "grey"}>{m.status}</Badge></Td></tr>
            ))}
          </Table>
        </Card>
      ) : <Loading error={sms.error} />)}
    </>
  );
}
