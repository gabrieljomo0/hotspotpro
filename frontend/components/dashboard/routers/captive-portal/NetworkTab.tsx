"use client";

// The "Network" sub-tab under a router's Hotspot section: the WiFi network
// name/password customers connect to, plus bandwidth and timeout settings.
// `form`/`set` are passed down from the parent panel, which owns all the
// actual data — this component just renders the fields for this one tab.

import { useDashboard } from "@/components/dashboard/context/DashboardContext";
import type { CaptivePortalConfig } from "@/components/dashboard/shared/types";
import type { RouterInfo } from "@/components/dashboard/data/dashboard-data";
import { Field, inputClass } from "@/components/dashboard/settings/SettingsFormControls";

export function NetworkTab({
  router,
  form,
  set,
  masterSsid = false,
}: {
  // true when these values are the account-wide master ones: the SSID then
  // comes from the form, not from the account-wide hotspot SSID.
  masterSsid?: boolean;
  router: Pick<RouterInfo, "name">;
  form: CaptivePortalConfig;
  set: <K extends keyof CaptivePortalConfig>(key: K, value: CaptivePortalConfig[K]) => void;
}) {
  const { hotspotSettings, updateHotspotSettings } = useDashboard();
  const sharedSsid = hotspotSettings.ssidStrategy === "same" && !masterSsid;

  return (
    <article className="rounded-2xl border border-[#e6e6e6] bg-white p-6 shadow-[0_8px_24px_rgba(26,26,26,0.06)] md:p-8">
      <h3 className="text-lg font-bold text-[#1a1a1a]">Hotspot Network</h3>
      <p className="mb-6 text-sm text-[#737373]">
        The WiFi network customers connect to on {router.name.split(" (")[0]}.
      </p>

      <div className="grid gap-5 md:grid-cols-2">
        <Field
          label="Network name (SSID)"
          hint={
            sharedSsid
              ? "The WiFi name is set account-wide in Settings → Hotspot."
              : "The WiFi name customers see when they connect."
          }
        >
          <input
            value={sharedSsid ? hotspotSettings.ssid : form.ssid}
            onChange={(e) =>
              sharedSsid
                ? updateHotspotSettings({ ssid: e.target.value })
                : set("ssid", e.target.value)
            }
            className={inputClass}
          />
        </Field>
        <Field label="WiFi password">
          <input
            value={form.wifiPassword}
            onChange={(e) => set("wifiPassword", e.target.value)}
            className={`${inputClass} font-mono`}
          />
        </Field>
        <Field label="Default bandwidth limit (down/up)" hint="e.g. 10M/5M">
          <input
            value={form.bandwidthLimit}
            onChange={(e) => set("bandwidthLimit", e.target.value)}
            className={inputClass}
          />
        </Field>
        <Field label="Session timeout" hint="e.g. 24h">
          <input
            value={form.sessionTimeout}
            onChange={(e) => set("sessionTimeout", e.target.value)}
            className={inputClass}
          />
        </Field>
        <Field label="Idle timeout" hint="e.g. 10m">
          <input
            value={form.idleTimeout}
            onChange={(e) => set("idleTimeout", e.target.value)}
            className={inputClass}
          />
        </Field>
      </div>

      <div className="mt-6 rounded-xl border border-[#f4f4f4] bg-[#ffffff] p-4">
        <label className="mb-4 flex items-center justify-between gap-3">
          <div>
            <span className="text-sm font-bold text-[#1a1a1a]">Default data throttle</span>
            <p className="text-xs text-[#a3a3a3]">
              Applies to any package that doesn't set its own
              throttle rule. A package's own
              throttle setting (under Packages) always takes priority
              over this default.
            </p>
          </div>
          <button
            type="button"
            onClick={() => set("defaultThrottleEnabled", !form.defaultThrottleEnabled)}
            className={`relative h-6 w-11 shrink-0 rounded-full transition ${
              form.defaultThrottleEnabled ? "bg-[#1a1a1a]" : "bg-[#e6e6e6]"
            }`}
          >
            <span
              className={`absolute top-0.5 h-5 w-5 rounded-full bg-white shadow transition-transform ${
                form.defaultThrottleEnabled ? "translate-x-5" : "translate-x-0.5"
              }`}
            />
          </button>
        </label>

        {form.defaultThrottleEnabled && (
          <div className="grid gap-4 sm:grid-cols-3">
            <label className="block">
              <span className="mb-2 block text-xs font-semibold text-[#525252]">Throttle at</span>
              <input
                type="number"
                min={0}
                value={form.defaultThrottleAtValue ?? ""}
                onChange={(e) =>
                  set(
                    "defaultThrottleAtValue",
                    e.target.value === "" ? null : Number(e.target.value),
                  )
                }
                placeholder="e.g. 10"
                className="h-11 w-full rounded-xl border border-[#e6e6e6] bg-white px-3 text-sm outline-none focus:border-[#1a1a1a]"
              />
            </label>
            <label className="block">
              <span className="mb-2 block text-xs font-semibold text-[#525252]">Unit</span>
              <select
                value={form.defaultThrottleAtUnit}
                onChange={(e) => set("defaultThrottleAtUnit", e.target.value as "MB" | "GB")}
                className="h-11 w-full rounded-xl border border-[#e6e6e6] bg-white px-3 text-sm outline-none focus:border-[#1a1a1a]"
              >
                <option value="MB">MB</option>
                <option value="GB">GB</option>
              </select>
            </label>
            <label className="block">
              <span className="mb-2 block text-xs font-semibold text-[#525252]">Throttled speed (Mbps)</span>
              <input
                type="number"
                min={0.5}
                step={0.5}
                value={form.defaultThrottleSpeedMbps}
                onChange={(e) => set("defaultThrottleSpeedMbps", Number(e.target.value))}
                className="h-11 w-full rounded-xl border border-[#e6e6e6] bg-white px-3 text-sm outline-none focus:border-[#1a1a1a]"
              />
            </label>
          </div>
        )}
      </div>
    </article>
  );
}
