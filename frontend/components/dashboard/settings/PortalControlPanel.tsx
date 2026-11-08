"use client";

import {
  Wifi,
  RadioTower,
  Gift,
  Store,
  UserPlus2,
  MessageSquare,
} from "lucide-react";

import { useDashboard } from "../context/DashboardContext";
import type { PortalControls } from "../shared/types";

const TOGGLES: Array<{
  key: keyof PortalControls;
  label: string;
  description: string;
  icon: typeof Wifi;
}> = [
  {
    key: "hotspotEnabled",
    label: "Hotspot Access",
    description: "Allow customers to buy and use Hotspot vouchers/packages.",
    icon: Wifi,
  },
  {
    key: "pppoeEnabled",
    label: "PPPoE Subscriptions",
    description: "Allow customers to subscribe over PPPoE.",
    icon: RadioTower,
  },
  {
    key: "voucherSalesEnabled",
    label: "Voucher Sales",
    description: "Allow new vouchers to be generated and sold.",
    icon: Gift,
  },
  {
    key: "resellerPortalEnabled",
    label: "Reseller Portal",
    description: "Allow resellers to log in and manage their own customers.",
    icon: Store,
  },
  {
    key: "customerSelfRegistration",
    label: "Customer Self-Registration",
    description: "Let new customers create their own account on the portal.",
    icon: UserPlus2,
  },
  {
    key: "smsNotifications",
    label: "SMS Notifications",
    description: "Send automatic SMS receipts and expiry reminders.",
    icon: MessageSquare,
  },
];

export function PortalControlPanel() {
  const { portalControls, updatePortalControls } = useDashboard();

  return (
    <article className="mt-6 rounded-2xl border border-[#e2e8f0] bg-white p-6 shadow-[0_8px_24px_rgba(37,99,235,0.06)] md:p-8">
      <h3 className="text-lg font-bold text-[#0f172a]">Portal Control</h3>
      <p className="mt-1 text-sm text-[#64748b]">
        Turn entire features of your customer portal on or off — full control
        over what your business currently offers.
      </p>

      <div className="mt-6 grid gap-3 sm:grid-cols-2">
        {TOGGLES.map((toggle) => {
          const Icon = toggle.icon;
          const enabled = portalControls[toggle.key];

          return (
            <div
              key={toggle.key}
              className="flex items-start justify-between gap-4 rounded-xl border border-[#e2e8f0] p-4"
            >
              <div className="flex items-start gap-3">
                <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-[#f1f5f9] text-[#2563eb]">
                  <Icon size={17} />
                </div>
                <div>
                  <p className="text-sm font-semibold text-[#475569]">
                    {toggle.label}
                  </p>
                  <p className="mt-1 text-xs leading-5 text-[#94a3b8]">
                    {toggle.description}
                  </p>
                </div>
              </div>

              <button
                type="button"
                onClick={() =>
                  updatePortalControls({ [toggle.key]: !enabled })
                }
                className={`relative h-7 w-12 shrink-0 rounded-full transition-colors ${
                  enabled ? "bg-emerald-500" : "bg-[#e2e8f0]"
                }`}
                aria-label={`Toggle ${toggle.label}`}
                aria-pressed={enabled}
              >
                <span
                  className={`absolute top-1 h-5 w-5 rounded-full bg-white shadow transition-transform ${
                    enabled ? "translate-x-6" : "translate-x-1"
                  }`}
                />
              </button>
            </div>
          );
        })}
      </div>
    </article>
  );
}
