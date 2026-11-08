"use client";

// The "Ads & Free Trial" sub-tab: whether ads are shown, and the full
// free-trial experience (button text, limits, mode, cooldown, etc).

import type { CaptivePortalConfig } from "@/components/dashboard/shared/types";
import type { RouterInfo } from "@/components/dashboard/data/dashboard-data";
import { ToggleRow, Field, inputClass, textareaClass } from "@/components/dashboard/settings/SettingsFormControls";

export function AdsFreeTrialTab({
  router,
  form,
  set,
}: {
  router: Pick<RouterInfo, "name">;
  form: CaptivePortalConfig;
  set: <K extends keyof CaptivePortalConfig>(key: K, value: CaptivePortalConfig[K]) => void;
}) {
  return (
    <>
      <article className="rounded-2xl border border-[#e2e8f0] bg-white p-6 shadow-[0_8px_24px_rgba(37,99,235,0.06)] md:p-8">
        <h3 className="text-lg font-bold text-[#0f172a]">Advertisements</h3>
        <p className="mb-4 text-sm text-[#64748b]">
          Control advertising shown on {router.name.split(" (")[0]}&apos;s captive portal.
        </p>
        <ToggleRow
          title="Enable advertisements"
          checked={form.adsEnabled}
          onChange={() => set("adsEnabled", !form.adsEnabled)}
        />
      </article>

      <article className="mt-5 rounded-2xl border border-[#e2e8f0] bg-white p-6 shadow-[0_8px_24px_rgba(37,99,235,0.06)] md:p-8">
        <h3 className="text-lg font-bold text-[#0f172a]">Free Trial</h3>
        <p className="mb-6 text-sm text-[#64748b]">
          Configure the captive portal free-trial experience and limits.
        </p>

        <div className="grid gap-5 md:grid-cols-2">
          <ToggleRow title="Enable free trial" checked={form.freeTrialEnabled} onChange={() => set("freeTrialEnabled", !form.freeTrialEnabled)} />
          <ToggleRow
            title="Show when packages are hidden"
            checked={form.showPackages === false}
            onChange={() => set("showPackages", !form.showPackages)}
          />
        </div>

        {form.freeTrialEnabled && (
          <div className="mt-5 grid gap-5 md:grid-cols-2">
            <Field label="Button text">
              <input
                value={form.freeTrialButtonText}
                onChange={(e) => set("freeTrialButtonText", e.target.value)}
                className={inputClass}
              />
            </Field>
            <Field label="Trials per device">
              <input
                type="number"
                min={1}
                value={form.freeTrialsPerDevice}
                onChange={(e) => set("freeTrialsPerDevice", Number(e.target.value))}
                className={inputClass}
              />
            </Field>
            <Field label="Free trial mode">
              <select
                value={form.freeTrialMode}
                onChange={(e) => set("freeTrialMode", e.target.value as CaptivePortalConfig["freeTrialMode"])}
                className={inputClass}
              >
                <option>One click</option>
                <option>Phone verification</option>
              </select>
            </Field>
            <Field label="Button position">
              <select
                value={form.freeTrialButtonPosition}
                onChange={(e) => set("freeTrialButtonPosition", e.target.value as CaptivePortalConfig["freeTrialButtonPosition"])}
                className={inputClass}
              >
                <option>Top</option>
                <option>Bottom</option>
              </select>
            </Field>
            <div className="md:col-span-2">
              <ToggleRow
                title="Allow trial again after a cooldown"
                checked={form.freeTrialCooldownEnabled}
                onChange={() => set("freeTrialCooldownEnabled", !form.freeTrialCooldownEnabled)}
              />
            </div>
            <div className="md:col-span-2">
              <Field label="Permanent-block message">
                <textarea
                  value={form.freeTrialBlockMessage}
                  onChange={(e) => set("freeTrialBlockMessage", e.target.value)}
                  rows={2}
                  className={textareaClass}
                />
              </Field>
            </div>
          </div>
        )}
      </article>
    </>
  );
}
