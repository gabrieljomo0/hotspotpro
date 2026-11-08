"use client";

import { useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { ChevronRight, Wifi } from "lucide-react";

import { useDashboard } from "@/components/dashboard/context/DashboardContext";

export default function CreateAccessPointPage() {
  const navigate = useRouter();
  const { addAccessPoint, routers, businessLocations, showToast } = useDashboard();

  const [name, setName] = useState("");
  const [macAddress, setMacAddress] = useState("");
  const [ipAddress, setIpAddress] = useState("");
  const [model, setModel] = useState("");
  const [siteId, setSiteId] = useState("");
  // Explicitly defaults to "no router" — connecting an access point never
  // requires one.
  const [routerIp, setRouterIp] = useState("");

  const routersForSite = siteId ? routers.filter((r) => r.siteId === siteId) : routers;

  function handleSubmit(event: FormEvent) {
    event.preventDefault();
    if (!name.trim() || !macAddress.trim() || !ipAddress.trim()) {
      showToast("Name, MAC address and IP address are required.");
      return;
    }
    const ap = addAccessPoint({
      name: name.trim(),
      macAddress: macAddress.trim(),
      ipAddress: ipAddress.trim(),
      model: model.trim(),
      siteId: siteId || null,
      routerIp: routerIp || null,
    });
    if (ap) navigate.push("/dashboards/configuration/access-points");
  }

  return (
    <section className="mx-auto w-full max-w-2xl">
      <nav className="mb-4 flex items-center gap-1.5 text-sm text-[#737373]">
        <Link href="/dashboards/configuration/access-points" className="hover:text-blue-600">
          Access Points
        </Link>
        <ChevronRight size={14} />
        <span className="font-semibold text-[#1a1a1a]">Add</span>
      </nav>
      <h1 className="mb-1 flex items-center gap-2 text-3xl font-black text-[#1a1a1a] md:text-4xl">
        <Wifi className="text-blue-500" size={28} />
        Add Access Point
      </h1>
      <p className="mb-6 text-sm text-[#737373]">
        Connect a WiFi access point directly — you don&apos;t need a router
        set up first. Link it to a router or site later, or leave it
        standalone.
      </p>

      <form onSubmit={handleSubmit} className="space-y-6 rounded-2xl border border-blue-200 bg-blue-50 p-6 md:p-8">
        <div className="grid gap-5 rounded-xl bg-white p-5 sm:grid-cols-2">
          <label className="block sm:col-span-2">
            <span className="mb-2 block text-sm font-semibold text-[#525252]">
              Name <span className="text-red-500">*</span>
            </span>
            <input
              required
              value={name}
              onChange={(event) => setName(event.target.value)}
              placeholder="e.g. Front Desk AP"
              className="h-11 w-full rounded-xl border border-[#e6e6e6] bg-white px-3 text-sm outline-none focus:border-blue-500"
            />
          </label>

          <label className="block">
            <span className="mb-2 block text-sm font-semibold text-[#525252]">
              MAC Address <span className="text-red-500">*</span>
            </span>
            <input
              required
              value={macAddress}
              onChange={(event) => setMacAddress(event.target.value)}
              placeholder="AA:BB:CC:DD:EE:FF"
              className="h-11 w-full rounded-xl border border-[#e6e6e6] bg-white px-3 font-mono text-sm outline-none focus:border-blue-500"
            />
          </label>

          <label className="block">
            <span className="mb-2 block text-sm font-semibold text-[#525252]">
              IP Address <span className="text-red-500">*</span>
            </span>
            <input
              required
              value={ipAddress}
              onChange={(event) => setIpAddress(event.target.value)}
              placeholder="192.168.1.50"
              className="h-11 w-full rounded-xl border border-[#e6e6e6] bg-white px-3 font-mono text-sm outline-none focus:border-blue-500"
            />
          </label>

          <label className="block sm:col-span-2">
            <span className="mb-2 block text-sm font-semibold text-[#525252]">Model</span>
            <input
              value={model}
              onChange={(event) => setModel(event.target.value)}
              placeholder="e.g. TP-Link EAP225"
              className="h-11 w-full rounded-xl border border-[#e6e6e6] bg-white px-3 text-sm outline-none focus:border-blue-500"
            />
          </label>
        </div>

        <div className="rounded-xl bg-white p-5">
          <p className="mb-1 text-sm font-bold text-[#1a1a1a]">Site &amp; Router (optional)</p>
          <p className="mb-4 text-xs text-[#a3a3a3]">
            Both are optional. Leave the router as &quot;No router&quot; to
            connect this access point standalone.
          </p>
          <div className="grid gap-5 sm:grid-cols-2">
            <label className="block">
              <span className="mb-2 block text-sm font-semibold text-[#525252]">Site / Business</span>
              <select
                value={siteId}
                onChange={(event) => {
                  setSiteId(event.target.value);
                  setRouterIp("");
                }}
                className="h-11 w-full rounded-xl border border-[#e6e6e6] bg-white px-3 text-sm outline-none focus:border-blue-500"
              >
                <option value="">No site</option>
                {businessLocations.map((site) => (
                  <option key={site.id} value={site.id}>
                    {site.name}
                  </option>
                ))}
              </select>
            </label>

            <label className="block">
              <span className="mb-2 block text-sm font-semibold text-[#525252]">Router</span>
              <select
                value={routerIp}
                onChange={(event) => setRouterIp(event.target.value)}
                className="h-11 w-full rounded-xl border border-[#e6e6e6] bg-white px-3 text-sm outline-none focus:border-blue-500"
              >
                <option value="">No router — standalone</option>
                {routersForSite.map((r) => (
                  <option key={r.ip} value={r.ip}>
                    {r.name.split(" (")[0]}
                  </option>
                ))}
              </select>
              {routersForSite.length === 0 && siteId && (
                <span className="mt-1 block text-xs text-[#a3a3a3]">
                  This site has no routers yet — that&apos;s fine, it&apos;ll stay standalone.
                </span>
              )}
            </label>
          </div>
        </div>

        <div className="flex flex-wrap gap-3">
          <button
            type="submit"
            className="rounded-xl bg-[#1a1a1a] px-6 py-3 text-sm font-bold text-white  hover:bg-[#111111]"
          >
            Add Access Point
          </button>
          <Link
            href="/dashboards/configuration/access-points"
            className="rounded-xl border border-[#e6e6e6] bg-white px-6 py-3 text-sm font-bold text-[#525252] hover:bg-[#ffffff]"
          >
            Cancel
          </Link>
        </div>
      </form>
    </section>
  );
}
