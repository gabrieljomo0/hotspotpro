"use client";

// "Master settings" card, shown on Settings → Hotspot and Settings →
// Captive Portal. While its switch is on, these values replace what every
// router has saved for itself (the router pages show them locked).

import { useEffect, useState, type ChangeEvent } from "react";
import { Check, Crown } from "lucide-react";

import { useDashboard } from "../context/DashboardContext";
import type { CaptivePortalConfig } from "../shared/types";
import { HOTSPOT_KEYS, PORTAL_KEYS, masterIsOn, type MasterSection } from "../routers/masterPortal";
import { LivePreview } from "../routers/captive-portal/LivePreview";
import { NetworkTab } from "../routers/captive-portal/NetworkTab";
import { TemplateTab } from "../routers/captive-portal/TemplateTab";
import { DesignTab } from "../routers/captive-portal/DesignTab";
import { CustomerExperienceTab } from "../routers/captive-portal/CustomerExperienceTab";
import { AdsFreeTrialTab } from "../routers/captive-portal/AdsFreeTrialTab";
import { Toggle } from "./SettingsFormControls";

type SubTab = "Network" | "Ads & Free Trial" | "Template" | "Design" | "Customer Experience";
const TABS: Record<MasterSection, SubTab[]> = {
  hotspot: ["Network", "Ads & Free Trial"],
  portal: ["Template", "Design", "Customer Experience"],
};
const KEYS = { hotspot: HOTSPOT_KEYS, portal: PORTAL_KEYS } as const;
const COPY = {
  hotspot: {
    title: "Master Hotspot Settings",
    on: "Overriding every router's Hotspot tab",
    blurb: "WiFi name and password, speed limit, timeouts, default throttle, ads and free trial.",
    tab: "Hotspot",
  },
  portal: {
    title: "Master Captive Portal Settings",
    on: "Overriding every router's Captive Portal tab",
    blurb: "Template, colours, logo, language, login method and what customers see on the login page.",
    tab: "Captive Portal",
  },
} as const;

export function MasterPortalSettings({ section }: { section: MasterSection }) {
  const { masterPortal, setMasterPortal, routers, getCaptivePortalConfig, showToast, logActivity } = useDashboard();
  const [draft, setDraft] = useState(masterPortal);
  const [subTab, setSubTab] = useState<SubTab>(TABS[section][0]);
  const [copyFrom, setCopyFrom] = useState("");
  // Saved settings load just after the first render.
  useEffect(() => {
    setDraft(masterPortal);
  }, [masterPortal]);
  const text = COPY[section];
  const on = masterIsOn(draft, section);
  const savedOn = masterIsOn(masterPortal, section);
  const dirty = JSON.stringify(draft) !== JSON.stringify(masterPortal);

  function set<K extends keyof CaptivePortalConfig>(key: K, value: CaptivePortalConfig[K]) {
    setDraft((d) => ({ ...d, config: { ...d.config, [key]: value } }));
  }
  function toggle() {
    setDraft((d) => (section === "hotspot" ? { ...d, hotspotOverride: !d.hotspotOverride } : { ...d, portalOverride: !d.portalOverride }));
  }
  function handleImageUpload(event: ChangeEvent<HTMLInputElement>, field: "logoImageDataUrl" | "backgroundImageDataUrl") {
    const file = event.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => typeof reader.result === "string" && set(field, reader.result);
    reader.readAsDataURL(file);
    event.target.value = "";
  }
  function copyFromRouter() {
    if (!copyFrom) return;
    const source = getCaptivePortalConfig(copyFrom);
    setDraft((d) => ({ ...d, config: { ...d.config, ...Object.fromEntries(KEYS[section].map((k) => [k, source[k]])) } }));
    showToast("Copied that router's settings into the master form. Save to apply.");
  }
  function save() {
    setMasterPortal(draft);
    const now = masterIsOn(draft, section);
    showToast(now ? `${text.title} saved. Every router now follows them.` : `${text.title} are off. Routers use their own settings again.`);
    logActivity("Settings", `${now ? "Saved and switched on" : "Switched off"} ${text.title.toLowerCase()}.`);
  }

  const fakeRouter = { name: "every router" };
  const businessName = draft.config.businessNameOverride || "Your business";

  return (
    <article data-testid={`master-${section}`} className="rounded-2xl bg-white p-6 md:p-8">
      <div className="mb-5 flex flex-wrap items-start justify-between gap-4">
        <div className="flex items-start gap-3">
          <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-[#1a1a1a] text-white">
            <Crown size={20} />
          </span>
          <div>
            <h3 className="text-lg font-bold text-[#1a1a1a]">{text.title}</h3>
            <p className="text-sm text-[#737373]">{text.blurb}</p>
          </div>
        </div>
        <span
          data-testid={`master-${section}-status`}
          className={`rounded-md px-2.5 py-1 text-xs font-bold ${savedOn ? "bg-[#1a1a1a] text-white" : "bg-[#e6e6e6] text-[#525252]"}`}
        >
          {savedOn ? "ON — overriding routers" : "OFF"}
        </span>
      </div>

      <div className="rounded-xl border border-[#e6e6e6] p-4">
        <div className="flex items-center gap-3">
          <span data-testid={`master-${section}-switch`}>
            <Toggle checked={on} onChange={toggle} />
          </span>
          <span className="text-sm font-bold text-[#1a1a1a]">Override all routers</span>
        </div>
        <p className="mt-2 text-xs text-[#737373]">
          When on, the settings below replace what every router has saved on its <strong>{text.tab}</strong> tab, and those tabs become read-only.
          Each router keeps its own values underneath, so turning this off brings them straight back.
        </p>
      </div>

      {on && (
        <div className="mt-5 space-y-5">
          <div className="flex flex-wrap items-center gap-2 rounded-xl bg-[#f4f4f4] p-3">
            <span className="text-sm font-semibold text-[#525252]">Start from a router:</span>
            <select
              data-testid={`master-${section}-copy`}
              value={copyFrom}
              onChange={(e) => setCopyFrom(e.target.value)}
              className="h-10 rounded-lg border border-[#d4d4d4] bg-white px-3 text-sm text-[#1a1a1a] outline-none focus:border-[#1a1a1a]"
            >
              <option value="">Choose a router…</option>
              {routers.map((r) => (
                <option key={r.ip} value={r.ip}>
                  {r.name.split(" (")[0]}
                </option>
              ))}
            </select>
            <button
              type="button"
              disabled={!copyFrom}
              onClick={copyFromRouter}
              className="h-10 rounded-lg border border-[#d4d4d4] bg-white px-3 text-sm font-bold text-[#1a1a1a] hover:bg-[#e6e6e6] disabled:opacity-50"
            >
              Copy its settings
            </button>
          </div>

          <div className={section === "portal" ? "grid gap-6 lg:grid-cols-[1fr_360px]" : ""}>
            <div className="space-y-5">
              <nav className="flex flex-wrap gap-2 border-b border-[#f4f4f4] pb-4">
                {TABS[section].map((t) => (
                  <button
                    key={t}
                    type="button"
                    onClick={() => setSubTab(t)}
                    className={`rounded-lg px-3 py-2 text-sm font-semibold transition ${subTab === t ? "bg-[#f4f4f4] text-[#1a1a1a]" : "text-[#737373] hover:bg-[#f4f4f4]"}`}
                  >
                    {t}
                  </button>
                ))}
              </nav>
              {subTab === "Network" && <NetworkTab router={fakeRouter} form={draft.config} set={set} masterSsid />}
              {subTab === "Ads & Free Trial" && <AdsFreeTrialTab router={fakeRouter} form={draft.config} set={set} />}
              {subTab === "Template" && <TemplateTab router={fakeRouter} form={draft.config} set={set} />}
              {subTab === "Design" && <DesignTab router={fakeRouter} form={draft.config} set={set} onImageUpload={handleImageUpload} />}
              {subTab === "Customer Experience" && <CustomerExperienceTab router={fakeRouter} form={draft.config} set={set} />}
            </div>
            {section === "portal" && (
              <div className="lg:sticky lg:top-4 lg:self-start">
                <p className="mb-2 text-center text-xs font-bold uppercase tracking-wide text-[#a3a3a3]">Live Preview</p>
                <LivePreview config={draft.config} businessName={businessName} />
              </div>
            )}
          </div>
        </div>
      )}

      <div className="mt-6 flex items-center justify-end gap-3">
        {dirty && <span data-testid={`master-${section}-dirty`} className="text-xs font-semibold text-[#111111]">Unsaved changes</span>}
        <button
          type="button"
          data-testid={`master-${section}-save`}
          onClick={save}
          className="inline-flex h-11 items-center gap-2 rounded-xl bg-[#1a1a1a] px-6 text-sm font-bold text-white hover:bg-[#111111]"
        >
          <Check size={16} /> Save master settings
        </button>
      </div>
    </article>
  );
}
