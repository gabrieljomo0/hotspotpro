"use client";

// Edit a router's identity and connection details in a pop-up, so you never
// leave the page you are on.

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Eye, EyeOff } from "lucide-react";

import { useDashboard } from "@/components/dashboard/context/DashboardContext";
import type { RouterInfo } from "@/components/dashboard/data/dashboard-data";
import { askConfirm } from "@/components/dashboard/shared/askConfirm";
import { ModalFrame } from "@/components/dashboard/agents/detail/ModalFrame";

export function EditRouterModal({ router, onClose }: { router: RouterInfo; onClose: () => void }) {
  const navRouter = useRouter();
  const { updateRouterDetails, deleteRouter } = useDashboard();

  const [showApiPassword, setShowApiPassword] = useState(false);
  const [showLegacyPassword, setShowLegacyPassword] = useState(false);

  const [form, setForm] = useState(() => ({
    name: router.name,
    ip: router.ip.startsWith("pending-") ? "" : router.ip,
    port: router.port ?? 8728,
    apiUsername: router.apiUsername ?? "",
    apiPassword: router.apiPassword ?? "",
    legacyUsername: router.legacyUsername ?? "",
    legacyPassword: router.legacyPassword ?? "",
    status: router.status ?? "",
    description: router.description ?? "",
    lastConnectedAt: router.lastConnectedAt ?? "",
    lastError: router.lastError ?? "",
    isDefault: router.isDefault ?? false,
    bypassModeEnabled: router.bypassModeEnabled ?? false,
  }));

  function handleSave() {
    if (!form.name.trim()) return;
    updateRouterDetails(router.ip, {
      name: form.name.trim(),
      port: form.port,
      apiUsername: form.apiUsername,
      apiPassword: form.apiPassword,
      legacyUsername: form.legacyUsername,
      legacyPassword: form.legacyPassword,
      description: form.description,
      isDefault: form.isDefault,
      bypassModeEnabled: form.bypassModeEnabled,
    });
    onClose();
  }

  function handleDelete() {
    askConfirm(`Permanently delete ${router.name}? This cannot be undone.`, "Delete router").then((ok) => {
      if (!ok) return;
      deleteRouter(router.ip);
      onClose();
      navRouter.push("/dashboards/configuration/routers");
    });
  }

  return (
    <ModalFrame title="Edit MikroTik" subtitle={router.name} onClose={onClose} widthClass="max-w-3xl" testId="edit-router-modal">
      <div className="space-y-5">
        <div className="grid gap-4 sm:grid-cols-2">
          <label className="block">
            <span className="mb-2 block text-sm font-semibold text-[#525252]">MikroTik Identity *</span>
            <input value={form.name} onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))} className="h-11 w-full rounded-xl border border-[#e6e6e6] px-3 text-sm outline-none focus:border-[#1a1a1a]" />
          </label>
          <label className="block">
            <span className="mb-2 block text-sm font-semibold text-[#525252]">Ip address</span>
            <input value={form.ip} placeholder="Learned automatically during provisioning" onChange={(e) => setForm((f) => ({ ...f, ip: e.target.value }))} className="h-11 w-full rounded-xl border border-[#e6e6e6] px-3 text-sm outline-none focus:border-[#1a1a1a]" />
          </label>
          <label className="block">
            <span className="mb-2 block text-sm font-semibold text-[#525252]">Port</span>
            <input type="number" value={form.port} onChange={(e) => setForm((f) => ({ ...f, port: Number(e.target.value) }))} className="h-11 w-full rounded-xl border border-[#e6e6e6] px-3 text-sm outline-none focus:border-[#1a1a1a]" />
          </label>
          <label className="block">
            <span className="mb-2 block text-sm font-semibold text-[#525252]">API Username</span>
            <input value={form.apiUsername} onChange={(e) => setForm((f) => ({ ...f, apiUsername: e.target.value }))} className="h-11 w-full rounded-xl border border-[#e6e6e6] px-3 text-sm outline-none focus:border-[#1a1a1a]" />
          </label>
          <label className="block">
            <span className="mb-2 block text-sm font-semibold text-[#525252]">API Password</span>
            <div className="flex overflow-hidden rounded-xl border border-[#e6e6e6] focus-within:border-[#1a1a1a]">
              <input type={showApiPassword ? "text" : "password"} value={form.apiPassword} onChange={(e) => setForm((f) => ({ ...f, apiPassword: e.target.value }))} className="h-11 w-full px-3 text-sm outline-none" />
              <button type="button" onClick={() => setShowApiPassword((c) => !c)} className="flex items-center px-3 text-[#a3a3a3]">
                {showApiPassword ? <EyeOff size={15} /> : <Eye size={15} />}
              </button>
            </div>
          </label>
          <label className="block">
            <span className="mb-2 block text-sm font-semibold text-[#525252]">Legacy Username</span>
            <input value={form.legacyUsername} onChange={(e) => setForm((f) => ({ ...f, legacyUsername: e.target.value }))} className="h-11 w-full rounded-xl border border-[#e6e6e6] px-3 text-sm outline-none focus:border-[#1a1a1a]" />
          </label>
          <label className="block">
            <span className="mb-2 block text-sm font-semibold text-[#525252]">Legacy Password</span>
            <div className="flex overflow-hidden rounded-xl border border-[#e6e6e6] focus-within:border-[#1a1a1a]">
              <input type={showLegacyPassword ? "text" : "password"} value={form.legacyPassword} onChange={(e) => setForm((f) => ({ ...f, legacyPassword: e.target.value }))} className="h-11 w-full px-3 text-sm outline-none" />
              <button type="button" onClick={() => setShowLegacyPassword((c) => !c)} className="flex items-center px-3 text-[#a3a3a3]">
                {showLegacyPassword ? <EyeOff size={15} /> : <Eye size={15} />}
              </button>
            </div>
          </label>
          <label className="block">
            <span className="mb-2 block text-sm font-semibold text-[#525252]">Status</span>
            <input value={form.status} disabled className="h-11 w-full rounded-xl border border-[#e6e6e6] bg-[#ffffff] px-3 text-sm text-[#a3a3a3] outline-none" />
          </label>
        </div>

        <label className="block">
          <span className="mb-2 block text-sm font-semibold text-[#525252]">Description</span>
          <textarea value={form.description} onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))} rows={2} className="w-full rounded-xl border border-[#e6e6e6] px-3 py-2.5 text-sm outline-none focus:border-[#1a1a1a]" />
        </label>

        <label className="block">
          <span className="mb-2 block text-sm font-semibold text-[#525252]">Last connected at</span>
          <input value={form.lastConnectedAt} disabled className="h-11 w-full rounded-xl border border-[#e6e6e6] bg-[#ffffff] px-3 text-sm text-[#a3a3a3] outline-none" />
        </label>

        <label className="block">
          <span className="mb-2 block text-sm font-semibold text-[#525252]">Last error</span>
          <textarea value={form.lastError} disabled rows={2} className="w-full rounded-xl border border-[#e6e6e6] bg-[#ffffff] px-3 py-2.5 text-sm text-[#a3a3a3] outline-none" />
        </label>

        <label className="flex items-center gap-3">
          <button
            type="button"
            onClick={() => setForm((f) => ({ ...f, isDefault: !f.isDefault }))}
            className={`relative h-6 w-11 shrink-0 rounded-full transition ${form.isDefault ? "bg-[#1a1a1a]" : "bg-[#e6e6e6]"}`}
          >
            <span className={`absolute top-0.5 h-5 w-5 rounded-full bg-white shadow transition-transform ${form.isDefault ? "translate-x-5" : "translate-x-0.5"}`} />
          </button>
          <span className="text-sm font-semibold text-[#525252]">Is default *</span>
        </label>

        <article className="rounded-2xl border border-[#f4f4f4] bg-[#ffffff] p-5">
          <h3 className="text-base font-bold text-[#1a1a1a]">Connection Mode</h3>
          <p className="mb-4 text-xs text-[#a3a3a3]">Choose how this router connects to the billing server</p>

          <div className="rounded-xl bg-white p-4 text-xs text-[#737373]">
            <p className="mb-1"><strong className="text-[#525252]">Standard Mode:</strong> Recommended for most routers.</p>
            <p className="mb-1"><strong className="text-[#525252]">Alternative Mode:</strong> Use only when instructed by support.</p>
            <p>Changing this setting may require re-provisioning the router.</p>
          </div>

          <label className="mt-4 flex items-center gap-3">
            <button
              type="button"
              onClick={() => setForm((f) => ({ ...f, bypassModeEnabled: !f.bypassModeEnabled }))}
              className={`relative h-6 w-11 shrink-0 rounded-full transition ${form.bypassModeEnabled ? "bg-[#1a1a1a]" : "bg-[#e6e6e6]"}`}
            >
              <span className={`absolute top-0.5 h-5 w-5 rounded-full bg-white shadow transition-transform ${form.bypassModeEnabled ? "translate-x-5" : "translate-x-0.5"}`} />
            </button>
            <span className="text-sm font-semibold text-[#525252]">Enable Bypass Mode</span>
          </label>
          <p className="mt-1 text-xs text-[#a3a3a3]">Only enable this when instructed by support.</p>

          {form.bypassModeEnabled && (
            <div className="mt-3 rounded-xl border border-[#e6e6e6] bg-white p-3">
              <p className="text-sm font-bold text-[#1a1a1a]">Bypass Mode Enabled</p>
              <p className="text-xs text-[#a3a3a3]">This router will use an alternative connectivity profile after re-provisioning.</p>
            </div>
          )}
        </article>

        <div className="flex flex-wrap items-center justify-between gap-3 border-t border-[#e6e6e6] pt-4">
          <div className="flex gap-3">
            <button type="button" data-testid="edit-router-save" onClick={handleSave} className="rounded-xl bg-[#1a1a1a] px-6 py-3 text-sm font-bold text-white hover:bg-[#111111]">
              Save changes
            </button>
            <button type="button" onClick={onClose} className="rounded-xl border border-[#e6e6e6] bg-white px-6 py-3 text-sm font-bold text-[#525252] hover:bg-[#f4f4f4]">
              Cancel
            </button>
          </div>
          <button type="button" onClick={handleDelete} className="rounded-xl bg-[#1a1a1a] px-4 py-3 text-sm font-bold text-white hover:bg-[#111111]">
            Delete router
          </button>
        </div>
      </div>
    </ModalFrame>
  );
}
