"use client";

// "Edit Identity": changes the router's name and nothing else.

import { useState, type FormEvent } from "react";

import { useDashboard } from "@/components/dashboard/context/DashboardContext";
import type { RouterInfo } from "@/components/dashboard/data/dashboard-data";
import { ModalFrame } from "@/components/dashboard/agents/detail/ModalFrame";

export function EditRouterNameModal({ router, onClose }: { router: RouterInfo; onClose: () => void }) {
  const { updateRouterDetails } = useDashboard();
  const [name, setName] = useState(router.name);
  const [touched, setTouched] = useState(false);

  const problem = name.trim() === "" ? "A router needs a name." : null;

  function handleSubmit(event: FormEvent) {
    event.preventDefault();
    setTouched(true);
    if (problem) return;
    if (name.trim() !== router.name) updateRouterDetails(router.ip, { name: name.trim() });
    onClose();
  }

  return (
    <ModalFrame title="Edit Identity" subtitle="Change the router name" onClose={onClose} widthClass="max-w-md" testId="edit-router-name-modal">
      <form onSubmit={handleSubmit} className="space-y-4" noValidate>
        <label className="block">
          <span className="mb-1.5 block text-sm font-semibold text-[#525252]">
            Router name <span className="text-red-500">*</span>
          </span>
          <input
            autoFocus
            data-testid="router-name-input"
            value={name}
            onChange={(event) => setName(event.target.value)}
            onFocus={(event) => event.currentTarget.select()}
            className={`h-11 w-full rounded-xl border bg-white px-3.5 text-sm outline-none focus:border-[#1a1a1a] ${
              touched && problem ? "border-red-400" : "border-[#e6e6e6]"
            }`}
          />
          {touched && problem && <span className="mt-1 block text-xs font-semibold text-red-600">{problem}</span>}
        </label>
        <div className="flex gap-3">
          <button type="submit" data-testid="router-name-save" className="rounded-xl bg-[#1a1a1a] px-6 py-3 text-sm font-bold text-white hover:bg-[#111111]">
            Save name
          </button>
          <button type="button" onClick={onClose} className="rounded-xl border border-[#e6e6e6] bg-white px-6 py-3 text-sm font-bold text-[#525252] hover:bg-[#f4f4f4]">
            Cancel
          </button>
        </div>
      </form>
    </ModalFrame>
  );
}
