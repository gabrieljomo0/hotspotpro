"use client";

import { useState } from "react";
import Link from "next/link";
import { Wifi, Plus, Search, Router as RouterIcon, Building2, Ban } from "lucide-react";

import { useDashboard } from "@/components/dashboard/context/DashboardContext";
import { BackLink } from "@/components/dashboard/shared/BackLink";
import { EditAccessPointModal } from "@/components/dashboard/accesspoints/EditAccessPointModal";
import { askConfirm } from "@/components/dashboard/shared/askConfirm";

export default function AccessPointsPage() {
  const { accessPoints, routers, businessLocations, deleteAccessPoint } = useDashboard();
  const [query, setQuery] = useState("");

  const visible = accessPoints.filter((ap) => {
    if (!query) return true;
    const q = query.toLowerCase();
    return (
      ap.name.toLowerCase().includes(q) ||
      ap.macAddress.toLowerCase().includes(q) ||
      ap.ipAddress.toLowerCase().includes(q)
    );
  });

  const [editingApId, setEditingApId] = useState<string | null>(null);

  function handleDelete(id: string, name: string) {
    askConfirm(`Remove access point "${name}"?`).then((ok) => {
      if (ok) deleteAccessPoint(id);
    })
  }

  return (
    <section className="w-full">
      <BackLink />
      <div className="mb-6 flex flex-wrap items-start justify-between gap-4">
        <div>
          <h2 className="mb-1 flex items-center gap-2 text-3xl font-bold tracking-tight md:text-4xl">
            <Wifi className="text-blue-500" size={30} />
            Access Points
          </h2>
          <p className="max-w-2xl text-sm text-[#737373] md:text-base">
            WiFi access points on your network. Connect one on its own, or
            link it to a router or site — a router isn&apos;t required.
          </p>
        </div>
        <Link
          href="/dashboards/configuration/access-points/create"
          className="inline-flex items-center gap-2 rounded-xl bg-blue-500 px-4 py-2.5 text-sm font-bold text-white hover:bg-blue-600"
        >
          <Plus size={16} />
          Add Access Point
        </Link>
      </div>

      <article className="overflow-hidden rounded-2xl border border-[#e6e6e6] bg-white shadow-[0_8px_24px_rgba(26,26,26,0.06)]">
        <div className="border-b border-[#e6e6e6] px-5 py-4">
          <div className="relative sm:max-w-xs">
            <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-[#a3a3a3]" />
            <input
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder="Search by name, MAC or IP"
              className="h-10 w-full rounded-lg border border-[#e6e6e6] bg-white pl-8 pr-3 text-sm outline-none focus:border-blue-500"
            />
          </div>
        </div>

        {visible.length === 0 ? (
          <div className="p-10 text-center">
            <Wifi size={28} className="mx-auto mb-3 text-blue-300" />
            <p className="text-sm font-semibold text-[#1a1a1a]">
              {accessPoints.length === 0 ? "No access points yet" : "No access points match your search"}
            </p>
            {accessPoints.length === 0 && (
              <p className="mt-1 text-xs text-[#a3a3a3]">
                Add one to get started — it works with or without a router.
              </p>
            )}
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead className="bg-[#ffffff] text-xs text-[#737373]">
                <tr>
                  <th className="px-4 py-4 font-semibold">Name</th>
                  <th className="px-4 py-4 font-semibold">MAC / IP</th>
                  <th className="px-4 py-4 font-semibold">Model</th>
                  <th className="px-4 py-4 font-semibold">Site</th>
                  <th className="px-4 py-4 font-semibold">Router</th>
                  <th className="px-4 py-4 font-semibold">Status</th>
                  <th className="px-4 py-4 font-semibold">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#f4f4f4]">
                {visible.map((ap) => {
                  const site = businessLocations.find((s) => s.id === ap.siteId);
                  const linkedRouter = routers.find((r) => r.ip === ap.routerIp);
                  return (
                    <tr key={ap.id} className="hover:bg-[#ffffff]">
                      <td className="px-4 py-4">
                        <div className="flex items-center gap-2.5">
                          <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-blue-100 text-blue-600">
                            <Wifi size={15} />
                          </span>
                          <span className="font-semibold text-[#1a1a1a]">{ap.name}</span>
                        </div>
                      </td>
                      <td className="px-4 py-4 text-xs text-[#525252]">
                        <p className="font-mono">{ap.macAddress}</p>
                        <p className="font-mono text-[#a3a3a3]">{ap.ipAddress}</p>
                      </td>
                      <td className="px-4 py-4 text-[#525252]">{ap.model || "—"}</td>
                      <td className="px-4 py-4">
                        {site ? (
                          <span className="inline-flex items-center gap-1 rounded-full bg-blue-100 px-2.5 py-1 text-xs font-semibold text-blue-700">
                            <Building2 size={11} />
                            {site.name}
                          </span>
                        ) : (
                          <span className="text-xs text-[#a3a3a3]">—</span>
                        )}
                      </td>
                      <td className="px-4 py-4">
                        {linkedRouter ? (
                          <span className="inline-flex items-center gap-1 rounded-full bg-blue-100 px-2.5 py-1 text-xs font-semibold text-blue-700">
                            <RouterIcon size={11} />
                            {linkedRouter.name.split(" (")[0]}
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 rounded-full bg-slate-100 px-2.5 py-1 text-xs font-semibold text-slate-600">
                            <Ban size={11} />
                            Standalone
                          </span>
                        )}
                      </td>
                      <td className="px-4 py-4">
                        <span
                          className={`rounded-full px-2.5 py-1 text-xs font-bold ${
                            ap.status === "Online" ? "bg-emerald-100 text-emerald-700" : "bg-red-100 text-red-700"
                          }`}
                        >
                          {ap.status}
                        </span>
                      </td>
                      <td className="px-4 py-4">
                        <div className="flex items-center gap-3 text-xs font-bold">
                          <button
                            type="button"
                            data-testid="ap-edit"
                            onClick={() => setEditingApId(ap.id)}
                            className="text-[#1a1a1a] hover:text-[#111111]"
                          >
                            Edit
                          </button>
                          <button
                            type="button"
                            onClick={() => handleDelete(ap.id, ap.name)}
                            className="text-red-500 hover:text-red-600"
                          >
                            Delete
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </article>
      {editingApId && <EditAccessPointModal apId={editingApId} onClose={() => setEditingApId(null)} />}
    </section>
  );
}
