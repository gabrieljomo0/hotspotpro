"use client";

import { useState, type FormEvent } from "react";
import { X } from "lucide-react";

import { useDashboard } from "@/components/dashboard/context/DashboardContext";

export function AddSiteModal({
  onClose,
  onCreated,
}: {
  onClose: () => void;
  onCreated?: (siteId: string) => void;
}) {
  const { addBusinessLocation } = useDashboard();
  const [newSiteName, setNewSiteName] = useState("");

  function handleAddSite(event: FormEvent) {
    event.preventDefault();
    if (!newSiteName.trim()) return;
    const site = addBusinessLocation(newSiteName.trim());
    setNewSiteName("");
    onCreated?.(site.id);
    onClose();
  }

  return (
    <div className="fixed inset-0 z-[220] flex items-center justify-center bg-slate-950/50 p-4">
      <button type="button" aria-label="Close" className="absolute inset-0" onClick={onClose} />
      <div className="relative z-10 w-full max-w-md rounded-2xl bg-white p-6 shadow-2xl">
        <div className="mb-4 flex items-center justify-between">
          <h3 className="text-lg font-bold text-[#0f172a]">Add Site</h3>
          <button type="button" onClick={onClose} className="rounded-lg p-1.5 text-[#64748b] hover:bg-[#ffffff]">
            <X size={18} />
          </button>
        </div>
        <form onSubmit={handleAddSite} className="space-y-4">
          <label className="block">
            <span className="mb-1.5 block text-sm font-semibold text-[#475569]">Site / business name</span>
            <input
              required
              value={newSiteName}
              onChange={(event) => setNewSiteName(event.target.value)}
              placeholder="e.g. Accra Mall Branch"
              className="h-11 w-full rounded-xl border border-[#e2e8f0] bg-white px-3 text-sm outline-none focus:border-blue-500"
            />
          </label>
          <div className="flex gap-3">
            <button type="submit" className="rounded-xl bg-blue-500 px-5 py-3 text-sm font-bold text-white hover:bg-blue-600">
              Add Site
            </button>
            <button
              type="button"
              onClick={onClose}
              className="rounded-xl border border-[#e2e8f0] bg-white px-5 py-3 text-sm font-bold text-[#475569] hover:bg-[#ffffff]"
            >
              Cancel
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
