"use client";

// The "Customer Experience" sub-tab: a set of toggles controlling what
// shows up on the customer's login page, plus a few related text fields.

import type { CaptivePortalConfig } from "@/components/dashboard/shared/types";
import type { RouterInfo } from "@/components/dashboard/data/dashboard-data";
import { ToggleRow, Field, inputClass, textareaClass } from "@/components/dashboard/settings/SettingsFormControls";

export function CustomerExperienceTab({
  router,
  form,
  set,
}: {
  router: Pick<RouterInfo, "name">;
  form: CaptivePortalConfig;
  set: <K extends keyof CaptivePortalConfig>(key: K, value: CaptivePortalConfig[K]) => void;
}) {
  return (
    <article className="rounded-2xl border border-[#e6e6e6] bg-white p-6 shadow-[0_8px_24px_rgba(26,26,26,0.06)] md:p-8">
      <h3 className="text-lg font-bold text-[#2563eb]">Customer Experience</h3>
      <p className="mb-6 text-sm text-[#737373]">
        Control what customers can see and do on {router.name.split(" (")[0]}&apos;s captive portal.
      </p>
      <div className="grid gap-5 md:grid-cols-2">
        <ToggleRow title="Show packages" checked={form.showPackages} onChange={() => set("showPackages", !form.showPackages)} />
        <ToggleRow title="Allow online purchases" checked={form.allowOnlinePurchases} onChange={() => set("allowOnlinePurchases", !form.allowOnlinePurchases)} />
        <ToggleRow title="Show package device limits" checked={form.showPackageDeviceLimits} onChange={() => set("showPackageDeviceLimits", !form.showPackageDeviceLimits)} />
        <ToggleRow
          title="Show package time"
          hint='Prints how long each package lasts under its name, e.g. "1 Hour".'
          checked={form.showPackageTime}
          onChange={() => set("showPackageTime", !form.showPackageTime)}
        />
        <ToggleRow title="Show device MAC" checked={form.showDeviceMac} onChange={() => set("showDeviceMac", !form.showDeviceMac)} />
        <ToggleRow title="Buy for TV or another device" checked={form.buyForOtherDevice} onChange={() => set("buyForOtherDevice", !form.buyForOtherDevice)} />
        <ToggleRow title="Show feedback button" checked={form.showFeedbackButton} onChange={() => set("showFeedbackButton", !form.showFeedbackButton)} />
        <ToggleRow
          title="Buy online vouchers"
          hint="Lets customers purchase a voucher directly on this login page."
          checked={form.showBuyOnlineVouchers}
          onChange={() => set("showBuyOnlineVouchers", !form.showBuyOnlineVouchers)}
        />
        <ToggleRow
          title="Apply for reseller"
          hint="Shows the reseller/agent application link on this login page."
          checked={form.showResellerApplication}
          onChange={() => set("showResellerApplication", !form.showResellerApplication)}
        />
      </div>

      <div className="mt-5 grid gap-5 md:grid-cols-2">
        <Field label="Redirect URL after login">
          <input
            value={form.redirectUrlAfterLogin}
            onChange={(e) => set("redirectUrlAfterLogin", e.target.value)}
            placeholder="https://example.com"
            className={inputClass}
          />
        </Field>
        <Field label="Phone collection on voucher activation" required>
          <select
            value={form.phoneCollectionOnActivation}
            onChange={(e) => set("phoneCollectionOnActivation", e.target.value as CaptivePortalConfig["phoneCollectionOnActivation"])}
            className={inputClass}
          >
            <option>Off</option>
            <option>Optional</option>
            <option>Required</option>
          </select>
        </Field>
      </div>

      <div className="mt-5">
        <Field label="Physical voucher location">
          <textarea
            value={form.physicalVoucherLocation}
            onChange={(e) => set("physicalVoucherLocation", e.target.value)}
            placeholder="e.g., Buy vouchers at the reception desk"
            rows={2}
            className={textareaClass}
          />
        </Field>
      </div>
    </article>
  );
}
