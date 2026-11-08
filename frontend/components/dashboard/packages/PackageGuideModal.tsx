"use client";

import { X, Info, Zap, Clock3, Smartphone, BarChart3, Flame, CalendarClock, CheckCircle2 } from "lucide-react";

const SETTINGS = [
  {
    icon: Zap,
    title: "Download & Upload Speed",
    body: "Type the speed as upload/download in one box. For example, 5M/10M means 5 Mbps upload and 10 Mbps download. Leave it empty to give the package the best speed available.",
    tip: "Start with lower speeds for basic plans and higher speeds for premium plans.",
  },
  {
    icon: Clock3,
    title: "Duration / Validity",
    body: "How long the package is valid after activation. Can be set in minutes, hours, days, weeks, or months.",
    tip: "Examples: 2 hours for cafe WiFi, 1 day for daily plans, 30 days for monthly subscriptions.",
  },
  {
    icon: Smartphone,
    title: "Device Limit",
    body: "Maximum number of devices that can use the same voucher/account simultaneously.",
    tip: "Set to 1 for individual plans, 2–5 for family/business plans.",
  },
  {
    icon: BarChart3,
    title: "Fair Usage Policy (FUP)",
    body: "Sets the total data allowance for the package. When it is used up, internet access stops. Leave empty for unlimited data.",
    tip: "Examples: 1024 MB = 1 GB, 5120 MB = 5 GB, empty = unlimited.",
  },
];

const ADVANCED = [
  {
    icon: Flame,
    title: "Burst Speed",
    body: "Allows temporary speed boost when user starts downloading. Great for perceived performance improvement.",
  },
  {
    icon: CalendarClock,
    title: "Schedule",
    body: "Limit package availability to specific times/days. Perfect for night-time or weekend-only packages.",
  },
];

const BEST_PRACTICES = [
  'Create tiered packages (Basic, Standard, Premium) to cater to different customer needs.',
  'Use descriptive names that customers can easily understand (e.g., "Fast Daily" instead of "PKG-001").',
  "Consider offering a free trial package to attract new customers.",
  'Set the "Featured" flag on your best-value package to highlight it on the captive portal.',
];

export function PackageGuideModal({
  open,
  onClose,
}: {
  open: boolean;
  onClose: () => void;
}) {
  if (!open) return null;

  return (
    <div className="fixed inset-0 z-[220] flex items-center justify-center bg-slate-950/50 p-4">
      <button
        type="button"
        aria-label="Close"
        className="absolute inset-0"
        onClick={onClose}
      />

      <div className="relative z-10 max-h-[90vh] w-full max-w-xl overflow-y-auto rounded-2xl bg-white shadow-2xl">
        <div className="sticky top-0 flex items-center justify-between border-b border-[#f4f4f4] bg-white px-6 py-5">
          <div>
            <h2 className="text-base font-bold text-[#1a1a1a]">
              Package Guide
            </h2>
            <p className="text-xs text-[#737373]">
              Learn how to create and configure packages effectively.
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

        <div className="space-y-5 px-6 py-6">
          <div className="flex gap-3 rounded-xl border border-blue-200 bg-white p-4">
            <Info size={18} className="shrink-0 text-blue-600" />
            <div>
              <p className="text-sm font-bold text-[#1a1a1a]">
                What are Packages?
              </p>
              <p className="mt-1 text-sm text-blue-800">
                Packages define the internet plans you offer to customers.
                Each package specifies speed limits, duration, pricing, and
                other settings that control the user&apos;s internet
                experience.
              </p>
            </div>
          </div>

          <div>
            <p className="mb-3 text-sm font-bold text-[#1a1a1a]">
              Key Settings Explained
            </p>
            <div className="space-y-3">
              {SETTINGS.map((setting) => {
                const Icon = setting.icon;
                return (
                  <div
                    key={setting.title}
                    className="rounded-xl border border-[#f4f4f4] bg-[#ffffff] p-4"
                  >
                    <p className="flex items-center gap-2 text-sm font-bold text-[#1a1a1a]">
                      <Icon size={15} className="text-[#1a1a1a]" />
                      {setting.title}
                    </p>
                    <p className="mt-1.5 text-sm text-[#525252]">
                      {setting.body}
                    </p>
                    <p className="mt-1.5 text-xs italic text-[#a3a3a3]">
                      Tip: {setting.tip}
                    </p>
                  </div>
                );
              })}
            </div>
          </div>

          <div>
            <p className="mb-3 text-sm font-bold text-[#1a1a1a]">
              Advanced Features
            </p>
            <div className="grid gap-3 sm:grid-cols-2">
              {ADVANCED.map((feature) => {
                const Icon = feature.icon;
                return (
                  <div
                    key={feature.title}
                    className="rounded-xl border border-[#f4f4f4] bg-[#ffffff] p-4"
                  >
                    <p className="flex items-center gap-2 text-sm font-bold text-[#1a1a1a]">
                      <Icon size={15} className="text-red-500" />
                      {feature.title}
                    </p>
                    <p className="mt-1.5 text-sm text-[#525252]">
                      {feature.body}
                    </p>
                  </div>
                );
              })}
            </div>
          </div>

          <div className="rounded-xl border border-[#f4f4f4] bg-[#ffffff] p-4">
            <p className="mb-2 text-sm font-bold text-[#1a1a1a]">
              Best Practices
            </p>
            <ul className="space-y-1.5">
              {BEST_PRACTICES.map((item) => (
                <li
                  key={item}
                  className="flex items-start gap-2 text-sm text-[#525252]"
                >
                  <CheckCircle2
                    size={15}
                    className="mt-0.5 shrink-0 text-emerald-500"
                  />
                  {item}
                </li>
              ))}
            </ul>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="w-full rounded-xl border border-[#e6e6e6] bg-white px-5 py-3 text-sm font-bold text-[#525252] hover:bg-[#ffffff]"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
}
