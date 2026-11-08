"use client";

import { useState, type FormEvent } from "react";
import { UserPlus2 } from "lucide-react";

import { BackLink } from "@/components/dashboard/shared/BackLink";

type Lead = {
  id: string;
  name: string;
  phone: string;
  interest: string;
  status: "New" | "Contacted" | "Converted" | "Lost";
};

const INITIAL_LEADS: Lead[] = [
  { id: "l1", name: "Nana Yeboah", phone: "024 555 0192", interest: "Monthly Plan", status: "New" },
  { id: "l2", name: "Abena Kufuor", phone: "055 812 3344", interest: "PPPoE Fiber", status: "Contacted" },
  { id: "l3", name: "Kojo Antwi", phone: "020 447 8821", interest: "Weekly Plan", status: "Converted" },
];

const STATUS_COLORS: Record<Lead["status"], string> = {
  New: "bg-blue-100 text-blue-700",
  Contacted: "bg-amber-100 text-amber-700",
  Converted: "bg-emerald-100 text-emerald-700",
  Lost: "bg-red-100 text-red-700",
};

export default function LeadsPage() {
  const [leads, setLeads] = useState<Lead[]>(INITIAL_LEADS);
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [interest, setInterest] = useState("");

  function handleAdd(event: FormEvent) {
    event.preventDefault();
    if (!name.trim() || !phone.trim()) return;

    setLeads((current) => [
      { id: `l-${Date.now()}`, name: name.trim(), phone: phone.trim(), interest: interest.trim() || "Not specified", status: "New" },
      ...current,
    ]);
    setName("");
    setPhone("");
    setInterest("");
  }

  function updateStatus(id: string, status: Lead["status"]) {
    setLeads((current) =>
      current.map((lead) => (lead.id === id ? { ...lead, status } : lead)),
    );
  }

  return (
    <section className="w-full">
      <BackLink />
      <h2 className="mb-1 flex items-center gap-2 text-3xl font-bold tracking-tight md:text-4xl">
        <UserPlus2 className="text-[#2563eb]" size={30} />
        Leads
      </h2>
      <p className="mb-6 max-w-2xl text-sm text-[#64748b] md:text-base">
        Prospective customers who haven&apos;t bought yet ({leads.length}{" "}
        total).
      </p>

      <div className="grid gap-5 lg:grid-cols-[1fr_2fr]">
        <article className="rounded-2xl border border-[#e2e8f0] bg-white p-5 shadow-[0_8px_24px_rgba(37,99,235,0.06)]">
          <h3 className="mb-4 text-base font-bold">Add Lead</h3>
          <form onSubmit={handleAdd} className="space-y-4">
            <label className="block">
              <span className="mb-2 block text-sm font-semibold text-[#475569]">
                Name
              </span>
              <input
                value={name}
                onChange={(event) => setName(event.target.value)}
                className="h-11 w-full rounded-xl border border-[#e2e8f0] bg-white px-3 text-sm outline-none focus:border-[#2563eb]"
              />
            </label>
            <label className="block">
              <span className="mb-2 block text-sm font-semibold text-[#475569]">
                Phone
              </span>
              <input
                value={phone}
                onChange={(event) => setPhone(event.target.value)}
                className="h-11 w-full rounded-xl border border-[#e2e8f0] bg-white px-3 text-sm outline-none focus:border-[#2563eb]"
              />
            </label>
            <label className="block">
              <span className="mb-2 block text-sm font-semibold text-[#475569]">
                Interested In
              </span>
              <input
                value={interest}
                onChange={(event) => setInterest(event.target.value)}
                placeholder="e.g. Monthly Plan"
                className="h-11 w-full rounded-xl border border-[#e2e8f0] bg-white px-3 text-sm outline-none focus:border-[#2563eb]"
              />
            </label>
            <button
              type="submit"
              className="w-full rounded-xl bg-[#2563eb] px-5 py-3 text-sm font-bold text-white hover:bg-[#1d4ed8]"
            >
              Add Lead
            </button>
          </form>
        </article>

        <article className="overflow-hidden rounded-2xl border border-[#e2e8f0] bg-white shadow-[0_8px_24px_rgba(37,99,235,0.06)]">
          <table className="w-full text-left text-sm">
            <thead className="bg-[#ffffff] text-xs text-[#64748b]">
              <tr>
                <th className="px-5 py-3 font-semibold">Name</th>
                <th className="px-5 py-3 font-semibold">Phone</th>
                <th className="px-5 py-3 font-semibold">Interested In</th>
                <th className="px-5 py-3 font-semibold">Status</th>
              </tr>
            </thead>
            <tbody>
              {leads.map((lead) => (
                <tr key={lead.id} className="border-t border-[#f1f5f9]">
                  <td className="px-5 py-3 font-semibold text-[#0f172a]">
                    {lead.name}
                  </td>
                  <td className="px-5 py-3 text-[#475569]">{lead.phone}</td>
                  <td className="px-5 py-3 text-[#475569]">{lead.interest}</td>
                  <td className="px-5 py-3">
                    <select
                      value={lead.status}
                      onChange={(event) =>
                        updateStatus(lead.id, event.target.value as Lead["status"])
                      }
                      className={`rounded-full border-0 px-2.5 py-1 text-xs font-semibold outline-none ${STATUS_COLORS[lead.status as Lead["status"]]}`}
                    >
                      {(["New", "Contacted", "Converted", "Lost"] as Lead["status"][]).map(
                        (status) => (
                          <option key={status} value={status}>
                            {status}
                          </option>
                        ),
                      )}
                    </select>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </article>
      </div>
    </section>
  );
}
