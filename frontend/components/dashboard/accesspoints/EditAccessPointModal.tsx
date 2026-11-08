"use client";

// Edit an access point in a pop-up, so you stay on the list.

import { useState, type FormEvent } from "react";

import { useDashboard } from "@/components/dashboard/context/DashboardContext";
import { ModalFrame } from "@/components/dashboard/agents/detail/ModalFrame";

export function EditAccessPointModal({ apId, onClose }: { apId: string; onClose: () => void }) {
  const { findAccessPoint, updateAccessPoint, routers, businessLocations, showToast } = useDashboard();
  const ap = findAccessPoint(apId);

  const [name, setName] = useState(ap?.name ?? "");
  const [macAddress, setMacAddress] = useState(ap?.macAddress ?? "");
  const [ipAddress, setIpAddress] = useState(ap?.ipAddress ?? "");
  const [model, setModel] = useState(ap?.model ?? "");
  const [siteId, setSiteId] = useState(ap?.siteId ?? "");
  const [routerIp, setRouterIp] = useState(ap?.routerIp ?? "");

  if (!ap) return null;

  const routersForSite = siteId ? routers.filter((r) => r.siteId === siteId) : routers;

  function handleSubmit(event: FormEvent) {
    event.preventDefault();
    if (!name.trim() || !macAddress.trim() || !ipAddress.trim()) {
      showToast("Name, MAC address and IP address are required.");
      return;
    }
    updateAccessPoint(apId, {
      name: name.trim(),
      macAddress: macAddress.trim(),
      ipAddress: ipAddress.trim(),
      model: model.trim(),
      siteId: siteId || null,
      routerIp: routerIp || null,
    });
    onClose();
  }

  return (
    <ModalFrame title="Edit Access Point" subtitle={ap.name} onClose={onClose} widthClass="max-w-2xl" testId="edit-ap-modal">
      <form onSubmit={handleSubmit} className="space-y-5">
        <div className="grid gap-5 rounded-xl bg-white p-5 sm:grid-cols-2">
          <label className="block sm:col-span-2">
            <span className="mb-2 block text-sm font-semibold text-[#525252]">
              Name <span className="text-red-500">*</span>
            </span>
            <input
              required
              value={name}
              onChange={(event) => setName(event.target.value)}
              className="h-11 w-full rounded-xl border border-[#e6e6e6] bg-white px-3 text-sm outline-none focus:border-[#1a1a1a]"
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
              className="h-11 w-full rounded-xl border border-[#e6e6e6] bg-white px-3 font-mono text-sm outline-none focus:border-[#1a1a1a]"
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
              className="h-11 w-full rounded-xl border border-[#e6e6e6] bg-white px-3 font-mono text-sm outline-none focus:border-[#1a1a1a]"
            />
          </label>

          <label className="block sm:col-span-2">
            <span className="mb-2 block text-sm font-semibold text-[#525252]">Model</span>
            <input
              value={model}
              onChange={(event) => setModel(event.target.value)}
              className="h-11 w-full rounded-xl border border-[#e6e6e6] bg-white px-3 text-sm outline-none focus:border-[#1a1a1a]"
            />
          </label>
        </div>

        <div className="rounded-xl bg-white p-5">
          <p className="mb-1 text-sm font-bold text-[#1a1a1a]">Site &amp; Router (optional)</p>
          <p className="mb-4 text-xs text-[#a3a3a3]">
            Both are optional. Set the router back to &quot;No router&quot;
            to disconnect it and run this access point standalone.
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
                className="h-11 w-full rounded-xl border border-[#e6e6e6] bg-white px-3 text-sm outline-none focus:border-[#1a1a1a]"
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
                className="h-11 w-full rounded-xl border border-[#e6e6e6] bg-white px-3 text-sm outline-none focus:border-[#1a1a1a]"
              >
                <option value="">No router — standalone</option>
                {routersForSite.map((r) => (
                  <option key={r.ip} value={r.ip}>
                    {r.name.split(" (")[0]}
                  </option>
                ))}
              </select>
            </label>
          </div>
        </div>

        <div className="flex flex-wrap gap-3 border-t border-[#e6e6e6] pt-4">
          <button type="submit" data-testid="edit-ap-save" className="rounded-xl bg-[#1a1a1a] px-6 py-3 text-sm font-bold text-white hover:bg-[#111111]">
            Save Changes
          </button>
          <button type="button" onClick={onClose} className="rounded-xl border border-[#e6e6e6] bg-white px-6 py-3 text-sm font-bold text-[#525252] hover:bg-[#f4f4f4]">
            Cancel
          </button>
        </div>
      </form>
    </ModalFrame>
  );
}
