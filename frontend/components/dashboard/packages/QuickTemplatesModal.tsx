"use client";

import { localizeAmountString } from "@/components/dashboard/shared/currency";
import { X, Zap, Sparkles, Wifi, Sun, Gift, Moon } from "lucide-react";

import { PACKAGE_TEMPLATES, type PackageTemplate } from "./packageTemplates";

const ICONS: Record<string, typeof Wifi> = {
  "2-hours": Wifi,
  daily: Sun,
  weekly: Zap,
  monthly: Zap,
  "free-trial": Gift,
  "night-owl": Moon,
};

function TemplateCard({
  template,
  onUse,
}: {
  template: PackageTemplate;
  onUse: () => void;
}) {
  const Icon = ICONS[template.key] ?? Wifi;

  return (
    <article
      className={`rounded-2xl border-2 bg-white p-5 ${
        template.recommended ? "border-blue-400" : "border-[#f4f4f4]"
      }`}
    >
      <div className="mb-2 flex items-start justify-between">
        <div className="flex items-center gap-2">
          <Icon size={16} className="text-[#737373]" />
          <div>
            <p className="font-bold text-[#1a1a1a]">{template.name}</p>
            <p className="text-[11px] text-[#a3a3a3]">
              Hotspot{template.scheduled ? " · Scheduled" : ""}
            </p>
          </div>
        </div>
        {template.badge && (
          <span
            className={`shrink-0 rounded-full px-2.5 py-1 text-[10px] font-bold ${template.badgeColor}`}
          >
            {template.badge}
          </span>
        )}
      </div>

      <p className="mb-4 text-xs text-[#737373]">{template.description}</p>

      <div className="mb-4 space-y-2">
        <div className="rounded-lg bg-[#ffffff] px-3 py-2">
          <p className="text-[10px] text-[#a3a3a3]">Speed</p>
          <p className="text-sm font-bold text-[#1a1a1a]">
            {template.input.downloadMbps}M / {template.input.uploadMbps}M
          </p>
        </div>
        <div className="rounded-lg bg-[#ffffff] px-3 py-2">
          <p className="text-[10px] text-[#a3a3a3]">Duration</p>
          <p className="text-sm font-bold text-[#1a1a1a]">
            {template.input.durationValue} {template.input.durationUnit}
          </p>
        </div>
        <div className="rounded-lg bg-[#ffffff] px-3 py-2">
          <p className="text-[10px] text-[#a3a3a3]">Price</p>
          <p className="text-sm font-bold text-[#1a1a1a]">
            {template.input.freeTrial ? "Free" : localizeAmountString(template.input.price)}
          </p>
        </div>
        <div className="rounded-lg bg-[#ffffff] px-3 py-2">
          <p className="text-[10px] text-[#a3a3a3]">Devices</p>
          <p className="text-sm font-bold text-[#1a1a1a]">
            {template.input.devices}
          </p>
        </div>
      </div>

      <button
        type="button"
        onClick={onUse}
        className={`w-full rounded-xl px-4 py-2.5 text-sm font-bold text-white ${
          template.recommended
            ? "bg-emerald-600 hover:bg-emerald-700"
            : "bg-amber-500 hover:bg-amber-600"
        }`}
      >
        Use Template
      </button>
    </article>
  );
}

export function QuickTemplatesModal({
  open,
  onClose,
  onUseTemplate,
}: {
  open: boolean;
  onClose: () => void;
  onUseTemplate: (template: PackageTemplate) => void;
}) {
  if (!open) return null;

  const quickStart = PACKAGE_TEMPLATES.filter((t) => t.group === "quick-start");
  const special = PACKAGE_TEMPLATES.filter((t) => t.group === "special");

  return (
    <div className="fixed inset-0 z-[220] flex items-center justify-center bg-slate-950/50 p-4">
      <button
        type="button"
        aria-label="Close"
        className="absolute inset-0"
        onClick={onClose}
      />

      <div className="relative z-10 max-h-[90vh] w-full max-w-3xl overflow-y-auto rounded-2xl bg-white shadow-2xl">
        <div className="sticky top-0 flex items-center justify-between border-b border-[#f4f4f4] bg-white px-6 py-5">
          <div>
            <h2 className="text-base font-bold text-[#1a1a1a]">
              Package Templates
            </h2>
            <p className="text-xs text-[#737373]">
              Choose from pre-configured package templates to get started
              quickly.
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg p-1.5 text-[#737373] hover:bg-[#ffffff]"
          >
            <X size={18} />
          </button>
        </div>

        <div className="space-y-6 px-6 py-6">
          <div>
            <p className="mb-3 flex items-center gap-1.5 text-sm font-bold text-[#1a1a1a]">
              <Zap size={14} className="text-amber-500" />
              Quick Start Templates
            </p>
            <div className="grid gap-4 sm:grid-cols-2">
              {quickStart.map((template) => (
                <TemplateCard
                  key={template.key}
                  template={template}
                  onUse={() => onUseTemplate(template)}
                />
              ))}
            </div>
          </div>

          <div>
            <p className="mb-3 flex items-center gap-1.5 text-sm font-bold text-[#1a1a1a]">
              <Sparkles size={14} className="text-blue-500" />
              Special Templates
            </p>
            <div className="grid gap-4 sm:grid-cols-2">
              {special.map((template) => (
                <TemplateCard
                  key={template.key}
                  template={template}
                  onUse={() => onUseTemplate(template)}
                />
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
