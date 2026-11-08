"use client";

// The panel shown on a router's "Hotspot" and "Captive Portal" tabs. It
// used to be one 830-line file with every sub-tab, the live preview, and
// the bulk-apply panel all mixed together. It's now broken into small
// focused pieces under components/dashboard/routers/captive-portal/, so
// changing (say) the Design tab can't accidentally break the Network tab
// or the live preview.
//
// This file's job is just to: hold the shared form state (since every
// sub-tab edits the same underlying settings), and render whichever
// sub-tab is currently selected.

import { useEffect, useState, type ChangeEvent } from "react";
import Link from "next/link";
import { Crown } from "lucide-react";

import { useDashboard } from "../context/DashboardContext";
import type { CaptivePortalConfig } from "../shared/types";
import type { RouterInfo } from "../data/dashboard-data";
import { masterIsOn } from "./masterPortal";

import { LivePreview } from "./captive-portal/LivePreview";
import { NetworkTab } from "./captive-portal/NetworkTab";
import { TemplateTab } from "./captive-portal/TemplateTab";
import { DesignTab } from "./captive-portal/DesignTab";
import { CustomerExperienceTab } from "./captive-portal/CustomerExperienceTab";
import { AdsFreeTrialTab } from "./captive-portal/AdsFreeTrialTab";
import { CleanupTab } from "./captive-portal/CleanupTab";

type SubTab = "Network" | "Template" | "Design" | "Customer Experience" | "Ads & Free Trial" | "Clean-up";
const HOTSPOT_SUB_TABS: SubTab[] = ["Network", "Ads & Free Trial", "Clean-up"];
const PORTAL_SUB_TABS: SubTab[] = ["Template", "Design", "Customer Experience"];

export function RouterCaptivePortalPanel({
  router,
  section,
}: {
  router: RouterInfo;
  // "hotspot" shows Network + Ads & Free Trial; "portal" shows the
  // template/design/customer-experience sub-tabs. Same underlying data
  // either way — this just controls which sub-tabs are offered.
  section: "hotspot" | "portal";
}) {
  const SUB_TABS = section === "hotspot" ? HOTSPOT_SUB_TABS : PORTAL_SUB_TABS;
  const {
    getCaptivePortalConfigForSite,
    updateCaptivePortalConfigForSite,
    businessLocations,
    masterPortal,
  } = useDashboard();
  const locked = masterIsOn(masterPortal, section);

  // This panel only ever shows this router's own site (or, for a router
  // with no site, the router itself). Other sites and sibling routers are
  // not listed here — they live on the Sites pages.
  const selectedSiteId = router.siteId ?? router.ip;
  const defaultSiteId = selectedSiteId;

  const [subTab, setSubTab] = useState<SubTab>(SUB_TABS[0]);
  const [form, setForm] = useState<CaptivePortalConfig>(
    getCaptivePortalConfigForSite(defaultSiteId),
  );

  // Saved sites load just after the first render — reload the form then.
  useEffect(() => {
    setForm(getCaptivePortalConfigForSite(selectedSiteId));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedSiteId, masterPortal]);

  function set<K extends keyof CaptivePortalConfig>(key: K, value: CaptivePortalConfig[K]) {
    setForm((current) => ({ ...current, [key]: value }));
  }

  function handleImageUpload(
    event: ChangeEvent<HTMLInputElement>,
    field: "logoImageDataUrl" | "backgroundImageDataUrl",
  ) {
    const file = event.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = () => {
      if (typeof reader.result === "string") {
        set(field, reader.result);
      }
    };
    reader.readAsDataURL(file);
    event.target.value = "";
  }

  function save() {
    updateCaptivePortalConfigForSite(selectedSiteId, form);
  }

  const businessName = businessLocations.find((s) => s.id === router.siteId)?.name ?? router.name.split(" (")[0];

  return (
    <div className="space-y-5">
      <p className="text-sm text-[#737373]">
        {section === "hotspot"
          ? "Configure the network and free-trial/ads behaviour for"
          : "Design and customize the customer login page for"}{" "}
        <strong data-testid="portal-scope-name" className="text-[#1a1a1a]">{businessName}</strong>.
        The preview on the right updates live as you make changes.
      </p>

      {locked && subTab !== "Clean-up" && (
        <div data-testid="master-lock-banner" className="flex items-start gap-3 rounded-xl border border-[#1a1a1a] bg-white p-4">
          <Crown size={18} className="mt-0.5 shrink-0 text-[#1a1a1a]" />
          <div className="text-sm text-[#525252]">
            <p className="font-bold text-[#1a1a1a]">Controlled by your Master {section === "hotspot" ? "Hotspot" : "Captive Portal"} Settings</p>
            <p>
              These values come from Settings → {section === "hotspot" ? "Hotspot" : "Captive Portal"} and apply to every router, so they can&apos;t be edited here.
              This router&apos;s own settings are kept and come back when the master is switched off.
            </p>
            <Link href={`/dashboards/settings/${section === "hotspot" ? "hotspot" : "captive-portal"}`} className="mt-1 inline-block font-bold text-[#1a1a1a] hover:underline">
              Open master settings
            </Link>
          </div>
        </div>
      )}

      <div className={subTab === "Clean-up" ? "" : "grid gap-6 lg:grid-cols-[1fr_360px]"}>
        <div className="min-w-0 space-y-5">
          <nav className="flex flex-wrap gap-2 border-b border-[#f4f4f4] pb-4">
            {SUB_TABS.map((t) => (
              <button
                key={t}
                type="button"
                onClick={() => setSubTab(t)}
                className={`rounded-lg px-3 py-2 text-sm font-semibold transition ${
                  subTab === t ? "bg-[#f4f4f4] text-[#1a1a1a]" : "text-[#737373] hover:bg-[#ffffff]"
                }`}
              >
                {t}
              </button>
            ))}
          </nav>

          {subTab === "Clean-up" && <CleanupTab router={router} />}
          <fieldset disabled={locked} data-testid="router-portal-fields" className="min-w-0 space-y-5 border-0 p-0 disabled:opacity-70">
          {subTab === "Network" && <NetworkTab router={router} form={form} set={set} masterSsid={locked} />}
          {subTab === "Template" && <TemplateTab router={router} form={form} set={set} />}
          {subTab === "Design" && (
            <DesignTab router={router} form={form} set={set} onImageUpload={handleImageUpload} />
          )}
          {subTab === "Customer Experience" && (
            <CustomerExperienceTab router={router} form={form} set={set} />
          )}
          {subTab === "Ads & Free Trial" && (
            <AdsFreeTrialTab router={router} form={form} set={set} />
          )}
          </fieldset>
        </div>

        {subTab !== "Clean-up" && (
        <div className="lg:sticky lg:top-4 lg:self-start">
          <p className="mb-2 text-center text-xs font-bold uppercase tracking-wide text-[#a3a3a3]">
            Live Preview
          </p>
          <LivePreview config={form} businessName={businessName} />
        </div>
        )}
      </div>

      {subTab !== "Clean-up" && (
      <div className="flex justify-end">
        <button
          type="button"
          onClick={save}
          disabled={locked}
          data-testid="router-portal-save"
          className="rounded-xl bg-[#1a1a1a] px-6 py-3 text-sm font-bold text-white hover:bg-[#111111] disabled:cursor-not-allowed disabled:opacity-50"
        >
          Save Captive Portal Settings
        </button>
      </div>
      )}
    </div>
  );
}
