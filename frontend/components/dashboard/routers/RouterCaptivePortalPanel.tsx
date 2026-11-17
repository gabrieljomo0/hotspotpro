"use client";

// Captive portal / hotspot settings for one router. Apply & Save only appear
// after the owner changes something; they disappear once settings are pushed.

import { useEffect, useMemo, useState, type ChangeEvent } from "react";
import Link from "next/link";
import { Crown } from "lucide-react";

import { useDashboard } from "../context/DashboardContext";
import type { CaptivePortalConfig } from "../shared/types";
import type { RouterInfo } from "../data/dashboard-data";
import { masterIsOn } from "./masterPortal";
import { DirtyApplyBar } from "../shared/DirtyApplyBar";
import { queueRouterAction } from "../context/queueRouterAction";

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

function sameConfig(a: CaptivePortalConfig, b: CaptivePortalConfig) {
  return JSON.stringify(a) === JSON.stringify(b);
}

export function RouterCaptivePortalPanel({
  router,
  section,
}: {
  router: RouterInfo;
  section: "hotspot" | "portal";
}) {
  const SUB_TABS = section === "hotspot" ? HOTSPOT_SUB_TABS : PORTAL_SUB_TABS;
  const {
    getCaptivePortalConfigForSite,
    updateCaptivePortalConfigForSite,
    businessLocations,
    masterPortal,
    showToast,
  } = useDashboard();
  const locked = masterIsOn(masterPortal, section);

  const selectedSiteId = router.siteId ?? router.ip;
  const [subTab, setSubTab] = useState<SubTab>(SUB_TABS[0]);
  const [saved, setSaved] = useState<CaptivePortalConfig>(() => getCaptivePortalConfigForSite(selectedSiteId));
  const [form, setForm] = useState<CaptivePortalConfig>(saved);
  const [applying, setApplying] = useState(false);

  useEffect(() => {
    const next = getCaptivePortalConfigForSite(selectedSiteId);
    setSaved(next);
    setForm(next);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedSiteId, masterPortal]);

  const dirty = useMemo(() => !sameConfig(form, saved), [form, saved]);

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

  async function applyAndSave() {
    if (locked || !dirty) return;
    setApplying(true);
    try {
      updateCaptivePortalConfigForSite(selectedSiteId, form);
      // Push login pages, WiFi bridge, walled garden, and vouchers so WiFi opens the captive portal.
      queueRouterAction(router.ip, "sync-files");
      queueRouterAction(router.ip, "wifi");
      queueRouterAction(router.ip, "walled-garden");
      queueRouterAction(router.ip, "sync-vouchers");
      setSaved(form);
      showToast("Settings saved. WiFi will open the voucher login page within about 3 seconds.");
    } finally {
      setApplying(false);
    }
  }

  const businessName = businessLocations.find((s) => s.id === router.siteId)?.name ?? router.name.split(" (")[0];

  return (
    <div className="space-y-5">
      <p className="text-sm text-[#737373]">
        {section === "hotspot"
          ? "Configure the network and free-trial/ads behaviour for"
          : "Design and customize the customer login page for"}{" "}
        <strong data-testid="portal-scope-name" className="text-[#1a1a1a]">{businessName}</strong>.
        The preview on the right updates live as you make changes. Apply appears only after you change something.
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

      {section === "portal" && (
        <article className="rounded-2xl border border-[#e6e6e6] bg-white p-6 shadow-[0_8px_24px_rgba(26,26,26,0.06)]">
          <h3 className="text-lg font-bold text-[#1a1a1a]">Login</h3>
          <p className="mb-4 text-sm text-[#737373]">Choose what a customer types on the WiFi page. Apply to send the change to the router.</p>
          <div className="grid gap-3 sm:grid-cols-2">
            {([
              ["PIN Only", "One login", "Voucher code only"],
              ["Username & Password", "Two logins", "Username and password"],
            ] as const).map(([id, title, detail]) => {
              const selected = form.authMethod === id;
              return (
                <button
                  key={id}
                  type="button"
                  disabled={locked}
                  onClick={() => set("authMethod", id)}
                  className={`rounded-xl border-2 p-4 text-left disabled:cursor-not-allowed ${selected ? "border-[#1a1a1a] bg-[#f4f4f4]" : "border-[#e6e6e6]"}`}
                >
                  <span className="text-sm font-bold text-[#1a1a1a]">{title}{selected ? " · in use" : ""}</span>
                  <span className="mt-1 block text-xs text-[#737373]">{detail}</span>
                </button>
              );
            })}
          </div>
        </article>
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
        <DirtyApplyBar
          dirty={dirty}
          applying={applying}
          disabled={locked}
          onApply={applyAndSave}
          applyLabel="Apply"
          saveLabel="Save"
          hint="You have unsaved changes. Apply or Save pushes them to this router so voucher login and WiFi update."
          testId="router-portal-save"
        />
      )}
    </div>
  );
}
