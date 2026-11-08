"use client";

// Support tickets and SMS records for the agent portal (and the admin's
// view of escalated tickets). Saved in the browser like the rest of the app
// (usePersistedState), so an agent's tab and the admin's tab stay in step.
//
// No SMS gateway is connected, so a "sent" message is recorded in the
// history but not actually delivered — the pages say so.

import { usePersistedState } from "../dashboard/context/usePersistedState";

export type TicketStatus = "Open" | "In Progress" | "Escalated" | "Closed";
export type TicketCategory = "Connection" | "Payment" | "Voucher" | "Speed" | "Other";
export const TICKET_CATEGORIES: TicketCategory[] = ["Connection", "Payment", "Voucher", "Speed", "Other"];

export type TicketMessage = { id: string; from: "customer" | "agent" | "admin"; text: string; atMs: number };

export type SupportTicket = {
  id: string;
  agentId: string;
  customerPhone: string;
  subject: string;
  category: TicketCategory;
  status: TicketStatus;
  createdAtMs: number;
  updatedAtMs: number;
  messages: TicketMessage[];
  // Made-up example tickets, so a new agent can see how this page works.
  sample?: boolean;
};

export type SmsRecord = {
  id: string;
  agentId: string;
  to: string;
  text: string;
  atMs: number;
  kind: "manual" | "voucher";
};

export type SmsTemplate = { id: string; name: string; text: string };

export const DEFAULT_SMS_TEMPLATES: SmsTemplate[] = [
  { id: "welcome", name: "Welcome", text: "Hello! Thanks for choosing us. Need help connecting? Reply to this number." },
  { id: "expiry", name: "Expiry reminder", text: "Your internet package is about to expire. Visit us or buy a new voucher to stay connected." },
  { id: "thanks", name: "Thank you", text: "Thank you for your purchase. Enjoy your internet!" },
];

let counter = 0;
export function newId(prefix: string) {
  counter += 1;
  return `${prefix}-${Date.now().toString(36)}${counter}`;
}

export function useTickets() {
  const [tickets, setTickets] = usePersistedState<SupportTicket[]>("agentTickets", []);

  function addTicket(input: { agentId: string; customerPhone: string; subject: string; category: TicketCategory; message: string; from?: "agent" | "customer" }) {
    const now = Date.now();
    const ticket: SupportTicket = {
      id: newId("tkt"),
      agentId: input.agentId,
      customerPhone: input.customerPhone,
      subject: input.subject,
      category: input.category,
      status: "Open",
      createdAtMs: now,
      updatedAtMs: now,
      messages: [{ id: newId("m"), from: input.from ?? "agent", text: input.message, atMs: now }],
    };
    setTickets((current) => [ticket, ...current]);
    return ticket;
  }

  function patch(id: string, change: (t: SupportTicket) => SupportTicket) {
    setTickets((current) => current.map((t) => (t.id === id ? { ...change(t), updatedAtMs: Date.now() } : t)));
  }

  function reply(id: string, from: "agent" | "admin", text: string) {
    patch(id, (t) => ({
      ...t,
      status: t.status === "Open" ? "In Progress" : t.status,
      messages: [...t.messages, { id: newId("m"), from, text, atMs: Date.now() }],
    }));
  }
  const setStatus = (id: string, status: TicketStatus) => patch(id, (t) => ({ ...t, status }));

  function addSamples(agentId: string, phones: string[]) {
    const now = Date.now();
    const p = (i: number) => phones[i % Math.max(phones.length, 1)] ?? `024000000${i}`;
    const make = (i: number, subject: string, category: TicketCategory, text: string, ageHours: number, status: TicketStatus): SupportTicket => ({
      id: newId("tkt"),
      agentId,
      customerPhone: p(i),
      subject,
      category,
      status,
      createdAtMs: now - ageHours * 3600000,
      updatedAtMs: now - ageHours * 3600000,
      messages: [{ id: newId("m"), from: "customer", text, atMs: now - ageHours * 3600000 }],
      sample: true,
    });
    setTickets((current) => [
      make(0, "Voucher says invalid", "Voucher", "I bought a voucher this morning but it says the code is invalid.", 2, "Open"),
      make(1, "Internet very slow tonight", "Speed", "Pages take forever to load since evening.", 6, "Open"),
      make(2, "Paid by MoMo but no package", "Payment", "I sent the money but my package has not started.", 26, "Open"),
      ...current,
    ]);
  }
  const clearSamples = (agentId: string) => setTickets((current) => current.filter((t) => !(t.sample && t.agentId === agentId)));

  return { tickets, addTicket, reply, setStatus, addSamples, clearSamples };
}

export function useSmsLog() {
  const [log, setLog] = usePersistedState<SmsRecord[]>("agentSmsLog", []);
  const [templates, setTemplates] = usePersistedState<Record<string, SmsTemplate[]>>("agentSmsTemplates", {});

  function record(agentId: string, to: string, text: string) {
    setLog((current) => [{ id: newId("sms"), agentId, to, text, atMs: Date.now(), kind: "manual" }, ...current]);
  }
  const templatesFor = (agentId: string) => templates[agentId] ?? DEFAULT_SMS_TEMPLATES;
  const saveTemplates = (agentId: string, next: SmsTemplate[]) => setTemplates((current) => ({ ...current, [agentId]: next }));

  return { log, record, templatesFor, saveTemplates };
}

export function validatePhone(value: string): string | null {
  const digits = value.replace(/[^\d]/g, "");
  if (digits.length < 9 || digits.length > 13) return "Enter a valid phone number.";
  return null;
}

export const SMS_MAX = 160;
