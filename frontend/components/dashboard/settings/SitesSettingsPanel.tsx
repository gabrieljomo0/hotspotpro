"use client";

import { useState, type FormEvent } from "react";
import { Link2, Plus, X, Trash2 } from "lucide-react";

import { useDashboard } from "../context/DashboardContext";
import { Field, inputClass } from "./SettingsFormControls";

export function SitesSettingsPanel() {
  const { sitesSettings, addLinkedSite, removeLinkedSite, showToast } = useDashboard();
  const [addOpen, setAddOpen] = useState(false);
  const [linkOpen, setLinkOpen] = useState(false);
  const [siteName, setSiteName] = useState("");
  const [subdomain, setSubdomain] = useState("");
  const [linkSubdomain, setLinkSubdomain] = useState("");

  function handleAddSite(event: FormEvent) {
    event.preventDefault();
    if (!siteName.trim() || !subdomain.trim()) return;
    addLinkedSite(siteName.trim(), subdomain.trim());
    setAddOpen(false);
    setSiteName("");
    setSubdomain("");
  }

  function handleLinkSite(event: FormEvent) {
    event.preventDefault();
    if (!linkSubdomain.trim()) return;
    showToast(`Link request sent for "${linkSubdomain}.hotspotpro.com". You'll need access from that site's owner to confirm.`);
    setLinkOpen(false);
    setLinkSubdomain("");
  }

  return (
    <article className="rounded-2xl border border-[#e6e6e6] bg-white p-6 shadow-[0_8px_24px_rgba(26,26,26,0.06)] md:p-8">
      <h3 className="text-lg font-bold text-[#1a1a1a]">Linked Sites</h3>
      <p className="mb-6 text-sm text-[#737373]">
        Manage your linked hotspot sites. Switch between sites seamlessly without logging in again.
      </p>

      <p className="mb-1 text-sm font-semibold text-[#525252]">Current Site</p>
      <div className="mb-6 rounded-xl border border-[#f4f4f4] bg-[#ffffff] p-4">
        <p className="text-base font-bold text-[#1a1a1a]">{sitesSettings.currentSiteName}</p>
        <p className="text-sm text-[#737373]">{sitesSettings.currentSiteDomain}</p>
      </div>

      <p className="mb-2 text-sm font-semibold text-[#525252]">Linked Sites</p>
      {sitesSettings.linkedSites.length === 0 ? (
        <p className="mb-6 text-sm text-[#a3a3a3]">No linked sites yet. Link an existing site or add a new one.</p>
      ) : (
        <div className="mb-6 space-y-2">
          {sitesSettings.linkedSites.map((site) => (
            <div
              key={site.id}
              className="flex items-center justify-between rounded-xl border border-[#f4f4f4] bg-[#ffffff] px-4 py-3"
            >
              <div>
                <p className="text-sm font-bold text-[#1a1a1a]">{site.name}</p>
                <p className="text-xs text-[#737373]">{site.subdomain}.hotspotpro.com</p>
              </div>
              <button
                type="button"
                onClick={() => removeLinkedSite(site.id)}
                className="rounded-lg p-2 text-red-500 hover:bg-red-50"
                aria-label={`Remove ${site.name}`}
              >
                <Trash2 size={15} />
              </button>
            </div>
          ))}
        </div>
      )}

      <div className="flex flex-wrap gap-3">
        <button
          type="button"
          onClick={() => setLinkOpen(true)}
          className="inline-flex items-center gap-2 rounded-xl bg-emerald-600 px-5 py-3 text-sm font-bold text-white hover:bg-emerald-700"
        >
          <Link2 size={16} /> Link Existing Site
        </button>
        <button
          type="button"
          onClick={() => setAddOpen(true)}
          className="inline-flex items-center gap-2 rounded-xl bg-emerald-600 px-5 py-3 text-sm font-bold text-white hover:bg-emerald-700"
        >
          <Plus size={16} /> Add New Site
        </button>
      </div>

      {addOpen && (
        <div className="fixed inset-0 z-[220] flex items-center justify-center bg-slate-950/50 p-4">
          <button type="button" aria-label="Close" className="absolute inset-0" onClick={() => setAddOpen(false)} />
          <div className="relative z-10 w-full max-w-md rounded-2xl bg-white p-6 shadow-2xl">
            <div className="mb-4 flex items-center justify-between">
              <h3 className="text-lg font-bold text-[#1a1a1a]">Add New Site</h3>
              <button type="button" onClick={() => setAddOpen(false)} className="rounded-lg p-1.5 text-[#737373] hover:bg-[#ffffff]">
                <X size={18} />
              </button>
            </div>
            <form onSubmit={handleAddSite} className="space-y-4">
              <Field label="Site Name" required>
                <input
                  required
                  value={siteName}
                  onChange={(e) => setSiteName(e.target.value)}
                  placeholder="e.g., FastNet Kasubi"
                  className={inputClass}
                />
              </Field>
              <Field label="Subdomain" required hint="Lowercase letters, numbers, and hyphens only. Spaces become hyphens automatically.">
                <div className="flex overflow-hidden rounded-xl border border-[#e6e6e6] focus-within:border-[#1a1a1a]">
                  <input
                    required
                    value={subdomain}
                    onChange={(e) => setSubdomain(e.target.value.toLowerCase().replace(/\s+/g, "-").replace(/[^a-z0-9-]/g, ""))}
                    placeholder="e.g., fastnet-kasubi"
                    className="h-11 w-full px-3 text-sm outline-none"
                  />
                  <span className="flex items-center bg-[#ffffff] px-3 text-xs font-semibold text-[#737373]">.hotspotpro.com</span>
                </div>
              </Field>
              <div className="flex gap-3">
                <button type="submit" className="rounded-xl bg-emerald-500 px-5 py-3 text-sm font-bold text-white hover:bg-emerald-600">
                  Submit
                </button>
                <button type="button" onClick={() => setAddOpen(false)} className="rounded-xl border border-[#e6e6e6] bg-white px-5 py-3 text-sm font-bold text-[#525252] hover:bg-[#ffffff]">
                  Cancel
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {linkOpen && (
        <div className="fixed inset-0 z-[220] flex items-center justify-center bg-slate-950/50 p-4">
          <button type="button" aria-label="Close" className="absolute inset-0" onClick={() => setLinkOpen(false)} />
          <div className="relative z-10 w-full max-w-md rounded-2xl bg-white p-6 shadow-2xl">
            <div className="mb-4 flex items-center justify-between">
              <h3 className="text-lg font-bold text-[#1a1a1a]">Link Existing Site</h3>
              <button type="button" onClick={() => setLinkOpen(false)} className="rounded-lg p-1.5 text-[#737373] hover:bg-[#ffffff]">
                <X size={18} />
              </button>
            </div>
            <form onSubmit={handleLinkSite} className="space-y-4">
              <Field label="Site Subdomain" required hint="Enter the subdomain of the site you want to link to this account.">
                <div className="flex overflow-hidden rounded-xl border border-[#e6e6e6] focus-within:border-[#1a1a1a]">
                  <input
                    required
                    value={linkSubdomain}
                    onChange={(e) => setLinkSubdomain(e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, ""))}
                    placeholder="e.g., fastnet-kasubi"
                    className="h-11 w-full px-3 text-sm outline-none"
                  />
                  <span className="flex items-center bg-[#ffffff] px-3 text-xs font-semibold text-[#737373]">.hotspotpro.com</span>
                </div>
              </Field>
              <div className="flex gap-3">
                <button type="submit" className="rounded-xl bg-emerald-500 px-5 py-3 text-sm font-bold text-white hover:bg-emerald-600">
                  Send Link Request
                </button>
                <button type="button" onClick={() => setLinkOpen(false)} className="rounded-xl border border-[#e6e6e6] bg-white px-5 py-3 text-sm font-bold text-[#525252] hover:bg-[#ffffff]">
                  Cancel
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </article>
  );
}
