"use client";

// The "Design" sub-tab: color overrides, logo size/upload, font, language,
// business name override, custom login method, and background image.

import type { ChangeEvent } from "react";
import { X, Upload } from "lucide-react";

import type { CaptivePortalConfig } from "@/components/dashboard/shared/types";
import type { RouterInfo } from "@/components/dashboard/data/dashboard-data";
import { Field, inputClass } from "@/components/dashboard/settings/SettingsFormControls";
import { FONTS, LANGUAGES } from "./constants";

export function DesignTab({
  router,
  form,
  set,
  onImageUpload,
}: {
  router: Pick<RouterInfo, "name">;
  form: CaptivePortalConfig;
  set: <K extends keyof CaptivePortalConfig>(key: K, value: CaptivePortalConfig[K]) => void;
  onImageUpload: (event: ChangeEvent<HTMLInputElement>, field: "logoImageDataUrl" | "backgroundImageDataUrl") => void;
}) {
  return (
    <article className="rounded-2xl border border-[#e6e6e6] bg-white p-6 shadow-[0_8px_24px_rgba(26,26,26,0.06)] md:p-8">
      <h3 className="text-lg font-bold text-[#1a1a1a]">Portal Design</h3>
      <p className="mb-6 text-sm text-[#737373]">
        Adjust the branding and appearance of {router.name.split(" (")[0]}&apos;s customer login page.
      </p>
      <div className="grid gap-5 md:grid-cols-2">
        <Field label="Primary colour override" hint="Leave empty to use the selected template colour.">
          <div className="flex items-center gap-2 rounded-xl border border-[#e6e6e6] bg-white px-3">
            <input
              value={form.primaryColorOverride}
              onChange={(e) => set("primaryColorOverride", e.target.value)}
              placeholder="#1a1a1a"
              className="h-11 w-full text-sm outline-none"
            />
            <input
              type="color"
              value={form.primaryColorOverride || "#1a1a1a"}
              onChange={(e) => set("primaryColorOverride", e.target.value)}
              className="h-6 w-6 shrink-0 cursor-pointer rounded border-0 bg-transparent"
            />
          </div>
        </Field>
        <Field label="Secondary colour override" hint="Leave empty to use the selected template colour.">
          <div className="flex items-center gap-2 rounded-xl border border-[#e6e6e6] bg-white px-3">
            <input
              value={form.secondaryColorOverride}
              onChange={(e) => set("secondaryColorOverride", e.target.value)}
              placeholder="#111111"
              className="h-11 w-full text-sm outline-none"
            />
            <input
              type="color"
              value={form.secondaryColorOverride || "#111111"}
              onChange={(e) => set("secondaryColorOverride", e.target.value)}
              className="h-6 w-6 shrink-0 cursor-pointer rounded border-0 bg-transparent"
            />
          </div>
        </Field>
        <Field label="Logo size" hint="Leave empty to use the template default. Range 40–120px.">
          <div className="flex overflow-hidden rounded-xl border border-[#e6e6e6] focus-within:border-[#1a1a1a]">
            <input
              type="number"
              min={40}
              max={120}
              value={form.logoSizePx ?? ""}
              onChange={(e) => set("logoSizePx", e.target.value ? Number(e.target.value) : null)}
              className="h-11 w-full px-3 text-sm outline-none"
            />
            <span className="flex items-center bg-[#ffffff] px-3 text-xs font-semibold text-[#737373]">px</span>
          </div>
        </Field>
        <Field label="Portal font">
          <select value={form.portalFont} onChange={(e) => set("portalFont", e.target.value)} className={inputClass}>
            {FONTS.map((f) => (
              <option key={f}>{f}</option>
            ))}
          </select>
        </Field>
        <Field label="Portal language">
          <select value={form.portalLanguage} onChange={(e) => set("portalLanguage", e.target.value)} className={inputClass}>
            {LANGUAGES.map((l) => (
              <option key={l}>{l}</option>
            ))}
          </select>
        </Field>
        <Field label="Business name" hint="Overrides your account name on this router's login page.">
          <input
            value={form.businessNameOverride}
            onChange={(e) => set("businessNameOverride", e.target.value)}
            placeholder="e.g., Kasoa Branch WiFi"
            className={inputClass}
          />
        </Field>
        <Field label="Logo text" hint="Short initials or text shown in the logo circle (leave empty to use the business name's initials).">
          <input
            value={form.logoText}
            onChange={(e) => set("logoText", e.target.value)}
            placeholder="e.g., KB"
            maxLength={4}
            className={inputClass}
          />
        </Field>
        <Field label="Login method" required>
          <select
            value={form.authMethod}
            onChange={(e) => set("authMethod", e.target.value as CaptivePortalConfig["authMethod"])}
            className={inputClass}
          >
            <option value="Username & Password">Username &amp; Password</option>
            <option value="PIN Only">PIN Only</option>
          </select>
        </Field>
      </div>

      <div className="mt-5 grid gap-5 md:grid-cols-2">
        <div>
          <span className="mb-2 block text-sm font-semibold text-[#525252]">Custom logo</span>
          {form.logoImageDataUrl ? (
            <div className="flex items-center gap-3 rounded-xl border border-[#e6e6e6] bg-[#ffffff] p-3">
              <img src={form.logoImageDataUrl} alt="Logo preview" className="h-12 w-12 rounded-full object-cover" />
              <div className="flex-1 text-xs text-[#737373]">Custom logo active</div>
              <button
                type="button"
                onClick={() => set("logoImageDataUrl", "")}
                className="rounded-lg p-1.5 text-red-500 hover:bg-red-50"
                aria-label="Remove logo"
              >
                <X size={14} />
              </button>
            </div>
          ) : (
            <label className="flex cursor-pointer items-center justify-center gap-2 rounded-xl border-2 border-dashed border-[#e6e6e6] bg-[#ffffff] p-6 text-center text-sm text-[#a3a3a3] hover:border-[#1a1a1a] hover:bg-[#f4f4f4]/40">
              <Upload size={15} />
              <span>
                Upload your logo or <span className="font-bold text-[#1a1a1a]">Browse</span>
              </span>
              <input
                type="file"
                accept="image/*"
                className="hidden"
                onChange={(e) => onImageUpload(e, "logoImageDataUrl")}
              />
            </label>
          )}
          <span className="mt-1 block text-xs text-[#a3a3a3]">
            Shown instead of your initials. JPG or PNG, keep it small for fast loading.
          </span>
        </div>

        <div>
          <span className="mb-2 block text-sm font-semibold text-[#525252]">Portal background</span>
          {form.backgroundImageDataUrl ? (
            <div className="flex items-center gap-3 rounded-xl border border-[#e6e6e6] bg-[#ffffff] p-3">
              <img src={form.backgroundImageDataUrl} alt="Background preview" className="h-12 w-12 rounded-lg object-cover" />
              <div className="flex-1 text-xs text-[#737373]">Custom background active</div>
              <button
                type="button"
                onClick={() => set("backgroundImageDataUrl", "")}
                className="rounded-lg p-1.5 text-red-500 hover:bg-red-50"
                aria-label="Remove background"
              >
                <X size={14} />
              </button>
            </div>
          ) : (
            <label className="flex cursor-pointer items-center justify-center gap-2 rounded-xl border-2 border-dashed border-[#e6e6e6] bg-[#ffffff] p-6 text-center text-sm text-[#a3a3a3] hover:border-[#1a1a1a] hover:bg-[#f4f4f4]/40">
              <Upload size={15} />
              <span>
                Drag &amp; Drop or <span className="font-bold text-[#1a1a1a]">Browse</span>
              </span>
              <input
                type="file"
                accept="image/*"
                className="hidden"
                onChange={(e) => onImageUpload(e, "backgroundImageDataUrl")}
              />
            </label>
          )}
          <span className="mt-1 block text-xs text-[#a3a3a3]">
            Optional JPG or PNG, maximum 500 KB. Keep it light for fast portal loading.
          </span>
        </div>
      </div>
    </article>
  );
}
