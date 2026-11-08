"use client";

// "Availability & Visibility" of the package form. A plain settings card
// with a segmented control for status, a toggle row for Featured, and a
// stepper for display order — then a light preview card underneath
// showing how the package looks to a customer, instead of a separate
// dark sidebar panel.
//
// Every control still writes to the same PackageInput keys as before:
// status, featured and displayOrder.

import { hasLeadingSymbol, localizeAmountString, sym } from "@/components/dashboard/shared/currency";
import type { ReactNode } from "react";
import { Eye, EyeOff, Ban, Star, Smartphone } from "lucide-react";

import type { PackageInput, PackageStatus } from "../shared/types";

type UpdateField = <K extends keyof PackageInput>(key: K, value: PackageInput[K]) => void;

const STATUS_OPTIONS: {
  value: PackageStatus;
  title: string;
  blurb: string;
  icon: typeof Eye;
  activeClass: string;
}[] = [
  {
    value: "Active",
    title: "Active",
    blurb: "Shown on the portal and ready to sell.",
    icon: Eye,
    activeClass: "bg-emerald-500 text-white",
  },
  {
    value: "Hidden",
    title: "Hidden",
    blurb: "Not on the portal, but vouchers made from it still work.",
    icon: EyeOff,
    activeClass: "bg-amber-500 text-white",
  },
  {
    value: "Disabled",
    title: "Disabled",
    blurb: "Completely off — nobody can buy or use it.",
    icon: Ban,
    activeClass: "bg-red-500 text-white",
  },
];

function priceText(price: string) {
  const trimmed = price.trim();
  if (!trimmed) return `${sym()} —`;
  return hasLeadingSymbol(trimmed) ? localizeAmountString(trimmed) : `${sym()} ${trimmed}`;
}

function Chip({ children }: { children: ReactNode }) {
  return (
    <span className="rounded-full bg-[#f1f5f9] px-2.5 py-1 text-[11px] font-semibold text-[#475569]">{children}</span>
  );
}

// What a customer would see for this package, driven entirely by the form.
function PackagePreview({ form }: { form: PackageInput }) {
  const hidden = form.status === "Hidden";
  const disabled = form.status === "Disabled";
  const perks = [
    form.hotspotEnabled && "Hotspot",
    form.pppoeEnabled && "PPPoE",
    form.burstEnabled && "Burst",
    form.scheduleEnabled && "Scheduled",
  ].filter(Boolean) as string[];

  return (
    <div
      data-testid="package-preview"
      className={`relative mx-auto w-full max-w-xs overflow-hidden rounded-2xl border-2 border-[#0f172a] bg-white text-[#0f172a] transition ${
        disabled ? "opacity-60 grayscale" : hidden ? "opacity-80" : ""
      }`}
    >
      {(hidden || disabled) && (
        <p
          role="status"
          data-testid="preview-status-note"
          className={`px-4 py-2 text-[11px] font-bold ${disabled ? "bg-red-100 text-red-800" : "bg-amber-100 text-amber-800"}`}
        >
          {disabled ? "Disabled · completely off" : "Hidden · not shown on the portal"}
        </p>
      )}

      <div className="relative p-5">
        {form.featured && (
          <span
            data-testid="preview-popular"
            className="absolute right-0 top-0 inline-flex items-center gap-1 rounded-bl-xl bg-amber-400 px-3 py-1.5 text-[11px] font-black uppercase tracking-wide text-amber-950"
          >
            <Star size={11} fill="currentColor" />
            Popular
          </span>
        )}
        <p className="pr-16 text-base font-black" data-testid="preview-name">
          {form.name.trim() || "Untitled package"}
        </p>
        <p className="mt-1 text-2xl font-black text-[#2563eb]" data-testid="preview-price">
          {priceText(form.price)}
        </p>
        <p className="mt-2 text-xs text-[#64748b]" data-testid="preview-meta">
          {form.durationValue} {form.durationUnit} · {form.downloadMbps > 0 ? `↓ ${form.downloadMbps} / ↑ ${form.uploadMbps} Mbps` : "Best speed"} ·{" "}
          {form.devices} device{form.devices === 1 ? "" : "s"}
        </p>
        {perks.length > 0 && (
          <div className="mt-3 flex flex-wrap gap-1.5" data-testid="preview-perks">
            {perks.map((perk) => (
              <Chip key={perk}>{perk}</Chip>
            ))}
          </div>
        )}
        <div className="mt-4 rounded-xl bg-[#0f172a] px-4 py-2.5 text-center text-sm font-bold text-white">
          Get this package
        </div>
      </div>
    </div>
  );
}

export function PackageStorefront({ form, update }: { form: PackageInput; update: UpdateField }) {
  return (
    <section
      aria-labelledby="package-storefront-title"
      className="overflow-hidden rounded-2xl border border-[#e2e8f0] bg-white shadow-[0_8px_24px_rgba(37,99,235,0.06)]"
    >
      <div className="border-b border-[#e2e8f0] px-5 py-4">
        <h3 id="package-storefront-title" className="text-base font-bold text-[#0f172a]">
          Availability &amp; Visibility
        </h3>
        <p className="text-xs text-[#64748b]">Choose who can see this package and where it appears.</p>
      </div>

      <div className="grid gap-6 p-5 lg:grid-cols-[1fr_260px]">
        <div className="space-y-6">
          <div>
            <p id="package-availability-label" className="mb-2 text-sm font-semibold text-[#475569]">
              Package availability <span className="text-red-500">*</span>
            </p>
            <div
              role="radiogroup"
              aria-labelledby="package-availability-label"
              className="flex flex-wrap gap-2 rounded-xl bg-[#f1f5f9] p-1.5"
            >
              {STATUS_OPTIONS.map((option) => {
                const selected = form.status === option.value;
                const Icon = option.icon;
                return (
                  <button
                    key={option.value}
                    type="button"
                    role="radio"
                    aria-checked={selected}
                    onClick={() => update("status", option.value)}
                    className={`flex flex-1 items-center justify-center gap-1.5 rounded-lg px-3 py-2 text-xs font-bold transition ${
                      selected ? option.activeClass + " shadow-sm" : "text-[#64748b] hover:bg-white"
                    }`}
                  >
                    <Icon size={13} />
                    {option.title}
                  </button>
                );
              })}
            </div>
            <p className="mt-2 text-xs text-[#94a3b8]">
              {STATUS_OPTIONS.find((o) => o.value === form.status)?.blurb}
            </p>
          </div>

          <label className="flex items-center justify-between gap-3 rounded-xl border border-[#f1f5f9] bg-[#ffffff] px-4 py-3">
            <span className="flex items-center gap-3">
              <span
                className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-lg ${
                  form.featured ? "bg-amber-100 text-amber-600" : "bg-white text-[#94a3b8] ring-1 ring-[#e2e8f0]"
                }`}
              >
                <Star size={16} fill={form.featured ? "currentColor" : "none"} />
              </span>
              <span className="min-w-0">
                <span className="block text-sm font-semibold text-[#0f172a]">Feature this package</span>
                <span className="block text-xs text-[#64748b]">
                  Lists it first on the captive portal with a &quot;Popular&quot; badge.
                </span>
              </span>
            </span>
            <button
              type="button"
              role="switch"
              aria-checked={form.featured}
              onClick={() => update("featured", !form.featured)}
              className={`relative h-6 w-11 shrink-0 rounded-full transition ${
                form.featured ? "bg-amber-500" : "bg-[#e2e8f0]"
              }`}
            >
              <span
                className={`absolute top-0.5 h-5 w-5 rounded-full bg-white shadow transition-transform ${
                  form.featured ? "translate-x-5" : "translate-x-0.5"
                }`}
              />
            </button>
          </label>

          <div>
            <p id="package-order-label" className="mb-1.5 text-sm font-semibold text-[#475569]">
              Display order
            </p>
            <div className="flex flex-wrap items-center gap-3">
              <div className="inline-flex items-center overflow-hidden rounded-xl border border-[#e2e8f0]">
                <button
                  type="button"
                  aria-label="Decrease display order"
                  onClick={() => update("displayOrder", form.displayOrder - 1)}
                  className="h-10 w-10 text-lg font-bold text-[#475569] hover:bg-[#ffffff]"
                >
                  −
                </button>
                <input
                  type="number"
                  aria-labelledby="package-order-label"
                  value={form.displayOrder}
                  onChange={(event) => update("displayOrder", Number(event.target.value))}
                  className="h-10 w-16 border-x border-[#e2e8f0] text-center text-sm font-bold text-[#0f172a] outline-none [appearance:textfield] [&::-webkit-inner-spin-button]:appearance-none [&::-webkit-outer-spin-button]:appearance-none"
                />
                <button
                  type="button"
                  aria-label="Increase display order"
                  onClick={() => update("displayOrder", form.displayOrder + 1)}
                  className="h-10 w-10 text-lg font-bold text-[#475569] hover:bg-[#ffffff]"
                >
                  +
                </button>
              </div>
              <p className="max-w-[16rem] text-xs text-[#94a3b8]">
                Optional tie-breaker when packages cost the same. Cheapest usually shows first.
              </p>
            </div>
          </div>
        </div>

        <div className="rounded-2xl border border-dashed border-[#e2e8f0] bg-[#ffffff] p-4">
          <p className="mb-3 flex items-center gap-1.5 text-[11px] font-bold uppercase tracking-wide text-[#94a3b8]">
            <Smartphone size={12} />
            How customers will see it
          </p>
          <PackagePreview form={form} />
          <p className="mt-3 text-center text-xs text-[#94a3b8]" data-testid="preview-caption">
            {form.status === "Active"
              ? form.featured
                ? "Listed first, ahead of the cheaper packages."
                : `Listed by price · order ${form.displayOrder}.`
              : form.status === "Hidden"
                ? "Not listed — but vouchers already made from it still work."
                : "Not listed and can't be used."}
          </p>
        </div>
      </div>
    </section>
  );
}
