"use client";

import Link from "next/link";
import { LayoutTemplate, ArrowRight, Palette, Users2 } from "lucide-react";

import { useDashboard } from "../context/DashboardContext";
import { MasterPortalSettings } from "./MasterPortalSettings";

export function CaptivePortalSettingsPanel() {
  const { routers } = useDashboard();

  return (
    <div className="space-y-6">
    <MasterPortalSettings section="portal" />
    <article className="rounded-2xl border border-[#e6e6e6] bg-white p-6 shadow-[0_8px_24px_rgba(26,26,26,0.06)] md:p-8">
      <div className="mb-6 flex items-center gap-3">
        <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-blue-100 text-blue-600">
          <LayoutTemplate size={20} />
        </div>
        <div>
          <h3 className="text-lg font-bold text-[#1a1a1a]">Captive Portal</h3>
          <p className="text-sm text-[#737373]">
            All hotspot and captive portal design lives under each router now, not here.
          </p>
        </div>
      </div>

      <div className="mb-6 rounded-xl border border-blue-200 bg-white p-5">
        <p className="text-sm leading-6 text-[#525252]">
          Network settings, template, colors, customer-experience options,
          and ads/free-trial are all configured from a single{" "}
          <strong>Hotspot Configuration</strong> tab on each router&apos;s
          own page. Routers that share the same business/site automatically
          share this same setup — set it once, and every router in that
          business inherits it.
        </p>
      </div>

      <div className="mb-6 grid gap-4 sm:grid-cols-2">
        <div className="flex items-start gap-3 rounded-xl border border-[#f4f4f4] p-4">
          <Palette size={18} className="mt-0.5 shrink-0 text-[#1a1a1a]" />
          <div>
            <p className="text-sm font-bold text-[#1a1a1a]">Template &amp; Design</p>
            <p className="text-xs text-[#737373]">Pick a template, override colors, fonts, logo, and background per business.</p>
          </div>
        </div>
        <div className="flex items-start gap-3 rounded-xl border border-[#f4f4f4] p-4">
          <Users2 size={18} className="mt-0.5 shrink-0 text-[#1a1a1a]" />
          <div>
            <p className="text-sm font-bold text-[#1a1a1a]">Customer Experience</p>
            <p className="text-xs text-[#737373]">Control what customers see and do on that business&apos;s login page.</p>
          </div>
        </div>
      </div>

      <Link
        href={routers[0] ? `/dashboards/configuration/routers/${encodeURIComponent(routers[0].ip)}?tab=captive-portal` : "/dashboards/configuration/routers"}
        className="inline-flex items-center gap-2 rounded-xl bg-[#1a1a1a] px-5 py-3 text-sm font-bold text-white hover:bg-[#111111]"
      >
        Go to Hotspot Configuration
        <ArrowRight size={15} />
      </Link>
    </article>
    </div>
  );
}
