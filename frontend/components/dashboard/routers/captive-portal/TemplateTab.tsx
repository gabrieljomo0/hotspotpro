"use client";

// The "Template" sub-tab: a gallery of the 4 available captive portal
// designs. Clicking one just calls `set("template", ...)` — the parent
// panel owns the actual form state.

import { Wifi, Check } from "lucide-react";

import type { CaptivePortalConfig } from "@/components/dashboard/shared/types";
import type { RouterInfo } from "@/components/dashboard/data/dashboard-data";
import { TEMPLATES } from "./constants";

export function TemplateTab({
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
      <h3 className="text-lg font-bold text-[#2563eb]">Template Gallery</h3>
      <p className="mb-6 text-sm text-[#737373]">
        Choose a fixed, tested design for {router.name.split(" (")[0]}&apos;s customer login page.
        Classic is the fully-built experience; Dark, Ocean Blue, and
        Sunset are the same layout in a different color scheme — the
        preview and Portal Design tab reflect whichever one you pick.
      </p>
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {TEMPLATES.map((tpl) => {
          const active = form.template === tpl.key;
          return (
            <button
              key={tpl.key}
              type="button"
              onClick={() => set("template", tpl.key)}
              className={`relative overflow-hidden rounded-2xl border-2 text-left transition ${
                active ? "border-[#2563eb] ring-2 ring-[#e6e6e6]" : "border-[#e6e6e6] hover:border-[#d4d4d4]"
              }`}
            >
              <div className={`flex h-24 items-center justify-center text-white ${tpl.color}`}>
                <Wifi size={28} />
              </div>
              {tpl.isNew && (
                <span className="absolute left-2 top-2 rounded-full bg-[#2563eb] px-2 py-0.5 text-[10px] font-bold text-white">
                  DEFAULT
                </span>
              )}
              {active && (
                <span className="absolute right-2 top-2 flex h-6 w-6 items-center justify-center rounded-full bg-[#2563eb] text-white">
                  <Check size={14} />
                </span>
              )}
              <div className="p-3">
                <p className="text-sm font-bold text-[#2563eb]">{tpl.key}</p>
                <p className="text-xs text-[#a3a3a3]">{tpl.description}</p>
              </div>
            </button>
          );
        })}
      </div>
    </article>
  );
}
