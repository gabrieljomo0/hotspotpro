"use client";

import { useState, type FormEvent } from "react";
import { Link2, Trash2 } from "lucide-react";

import { BackLink } from "@/components/dashboard/shared/BackLink";
import { UsersNavTabs } from "@/components/dashboard/active-users/UsersNavTabs";

type IpBinding = {
  id: string;
  macAddress: string;
  ipAddress: string;
  deviceName: string;
};

const INITIAL_BINDINGS: IpBinding[] = [
  { id: "b1", macAddress: "AA:15:BB:CC:47:DD", ipAddress: "192.168.88.101", deviceName: "Front Desk PC" },
  { id: "b2", macAddress: "F2:9C:3D:1A:88:0E", ipAddress: "192.168.88.102", deviceName: "Office Printer" },
];

export default function IpBindingsPage() {
  const [bindings, setBindings] = useState<IpBinding[]>(INITIAL_BINDINGS);
  const [mac, setMac] = useState("");
  const [ip, setIp] = useState("");
  const [name, setName] = useState("");

  function handleAdd(event: FormEvent) {
    event.preventDefault();
    if (!mac.trim() || !ip.trim()) return;

    setBindings((current) => [
      { id: `b-${Date.now()}`, macAddress: mac.trim(), ipAddress: ip.trim(), deviceName: name.trim() || "Unnamed device" },
      ...current,
    ]);
    setMac("");
    setIp("");
    setName("");
  }

  function handleRemove(id: string) {
    setBindings((current) => current.filter((b) => b.id !== id));
  }

  return (
    <section className="w-full">
      <BackLink />
      <h2 className="mb-1 flex items-center gap-2 text-3xl font-bold tracking-tight md:text-4xl">
        <Link2 className="text-[#1a1a1a]" size={30} />
        IP Bindings
      </h2>
      <p className="mb-6 max-w-2xl text-sm text-[#737373] md:text-base">
        Reserve a fixed IP address for a specific device by binding it to its
        MAC address ({bindings.length} bindings).
      </p>

      <UsersNavTabs />

      <div className="grid gap-5 lg:grid-cols-[1fr_2fr]">
        <article className="rounded-2xl border border-[#e6e6e6] bg-white p-5 shadow-[0_8px_24px_rgba(26,26,26,0.06)]">
          <h3 className="mb-4 text-base font-bold">Add Binding</h3>
          <form onSubmit={handleAdd} className="space-y-4">
            <label className="block">
              <span className="mb-2 block text-sm font-semibold text-[#525252]">
                MAC Address
              </span>
              <input
                value={mac}
                onChange={(event) => setMac(event.target.value)}
                placeholder="AA:BB:CC:DD:EE:FF"
                className="h-11 w-full rounded-xl border border-[#e6e6e6] bg-white px-3 font-mono text-sm outline-none focus:border-[#1a1a1a]"
              />
            </label>
            <label className="block">
              <span className="mb-2 block text-sm font-semibold text-[#525252]">
                IP Address
              </span>
              <input
                value={ip}
                onChange={(event) => setIp(event.target.value)}
                placeholder="192.168.88.100"
                className="h-11 w-full rounded-xl border border-[#e6e6e6] bg-white px-3 font-mono text-sm outline-none focus:border-[#1a1a1a]"
              />
            </label>
            <label className="block">
              <span className="mb-2 block text-sm font-semibold text-[#525252]">
                Device Name
              </span>
              <input
                value={name}
                onChange={(event) => setName(event.target.value)}
                placeholder="e.g. Front Desk PC"
                className="h-11 w-full rounded-xl border border-[#e6e6e6] bg-white px-3 text-sm outline-none focus:border-[#1a1a1a]"
              />
            </label>
            <button
              type="submit"
              className="w-full rounded-xl bg-[#1a1a1a] px-5 py-3 text-sm font-bold text-white hover:bg-[#111111]"
            >
              Add Binding
            </button>
          </form>
        </article>

        <article className="overflow-hidden rounded-2xl border border-[#e6e6e6] bg-white shadow-[0_8px_24px_rgba(26,26,26,0.06)]">
          <table className="w-full text-left text-sm">
            <thead className="bg-[#ffffff] text-xs text-[#737373]">
              <tr>
                <th className="px-5 py-3 font-semibold">Device</th>
                <th className="px-5 py-3 font-semibold">MAC Address</th>
                <th className="px-5 py-3 font-semibold">IP Address</th>
                <th className="px-5 py-3 text-center font-semibold">Remove</th>
              </tr>
            </thead>
            <tbody>
              {bindings.length === 0 && (
                <tr>
                  <td colSpan={4} className="px-5 py-8 text-center text-[#a3a3a3]">
                    No bindings yet.
                  </td>
                </tr>
              )}
              {bindings.map((binding) => (
                <tr key={binding.id} className="border-t border-[#f4f4f4]">
                  <td className="px-5 py-3 font-semibold text-[#1a1a1a]">
                    {binding.deviceName}
                  </td>
                  <td className="px-5 py-3 font-mono text-[#525252]">
                    {binding.macAddress}
                  </td>
                  <td className="px-5 py-3 font-mono text-[#1a1a1a]">
                    {binding.ipAddress}
                  </td>
                  <td className="px-5 py-3 text-center">
                    <button
                      type="button"
                      onClick={() => handleRemove(binding.id)}
                      className="rounded-lg p-2 text-red-500 hover:bg-red-50"
                      aria-label="Remove binding"
                    >
                      <Trash2 size={15} />
                    </button>
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
