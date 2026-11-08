"use client";

// Account-wide branding: business name, logo, contact details shown on
// admin-facing surfaces (not the captive portal — that has its own,
// separate logo/branding per router, under each router's Captive Portal tab).

import { useState, type FormEvent } from "react";
import { Check, Copy } from "lucide-react";

import { useDashboard } from "../context/DashboardContext";

export function BrandingForm() {
  const { branding, updateBranding } = useDashboard();
  const [form, setForm] = useState(branding);
  const [copied, setCopied] = useState(false);
  const [logoFileName, setLogoFileName] = useState(branding.logoFileName);

  function handleSubmit(event: FormEvent) {
    event.preventDefault();
    updateBranding({ ...form, logoFileName });
  }

  async function handleCopyPortalLink() {
    try {
      await navigator.clipboard.writeText(form.pppoePortalUrl);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 1500);
    } catch {
      // clipboard unavailable
    }
  }

  return (
    <form
      onSubmit={handleSubmit}
      className="rounded-2xl border border-[#e2e8f0] bg-white p-6 shadow-[0_8px_24px_rgba(37,99,235,0.06)] md:p-8"
    >
      <h3 className="text-lg font-bold text-[#0f172a]">Your ISP Branding</h3>
      <p className="mt-1 text-sm text-[#64748b]">
        Configure your WiFi business branding and customer support details for{" "}
        {form.businessName || "your business"}.
      </p>

      <div className="mt-6 grid gap-6 md:grid-cols-2">
        <label className="block">
          <span className="mb-2 block text-sm font-semibold text-[#475569]">
            Your Logo
          </span>
          <label className="flex h-28 cursor-pointer flex-col items-center justify-center rounded-xl border-2 border-dashed border-[#e2e8f0] bg-[#ffffff] text-center text-sm text-[#64748b] hover:border-[#2563eb]">
            {logoFileName ? (
              <span className="font-semibold text-[#2563eb]">
                {logoFileName}
              </span>
            ) : (
              <span>
                Drag &amp; Drop your file or{" "}
                <span className="font-bold text-[#2563eb]">Browse</span>
              </span>
            )}
            <input
              type="file"
              accept="image/png,image/jpeg,image/svg+xml"
              className="hidden"
              onChange={(event) =>
                setLogoFileName(event.target.files?.[0]?.name ?? null)
              }
            />
          </label>
          <p className="mt-2 text-xs text-[#94a3b8]">
            Upload a JPG, PNG, or SVG. Appears on the login page and dashboard
            sidebar.
          </p>
        </label>

        <label className="block">
          <span className="mb-2 block text-sm font-semibold text-[#475569]">
            Your ISP / WiFi Business Name
            <span className="ml-0.5 text-red-500">*</span>
          </span>
          <input
            required
            value={form.businessName}
            onChange={(event) =>
              setForm({ ...form, businessName: event.target.value })
            }
            className="h-11 w-full rounded-xl border border-[#e2e8f0] bg-white px-3 text-sm outline-none focus:border-[#2563eb]"
          />
          <p className="mt-2 text-xs text-[#94a3b8]">
            This name will appear on vouchers, SMS messages, and the captive
            portal.
          </p>
        </label>

        <label className="block">
          <span className="mb-2 block text-sm font-semibold text-[#475569]">
            Brand Color
          </span>
          <div className="flex items-center gap-3">
            <input
              value={form.brandColor}
              onChange={(event) =>
                setForm({ ...form, brandColor: event.target.value })
              }
              className="h-11 w-full rounded-xl border border-[#e2e8f0] bg-white px-3 font-mono text-sm outline-none focus:border-[#2563eb]"
            />
            <span
              className="h-8 w-8 shrink-0 rounded-full border border-[#e2e8f0]"
              style={{ backgroundColor: form.brandColor }}
            />
          </div>
          <p className="mt-2 text-xs text-[#94a3b8]">
            Your brand color for the dashboard.
          </p>
        </label>

        <label className="block">
          <span className="mb-2 block text-sm font-semibold text-[#475569]">
            Customer Support Number
          </span>
          <input
            value={form.supportNumber}
            onChange={(event) =>
              setForm({ ...form, supportNumber: event.target.value })
            }
            className="h-11 w-full rounded-xl border border-[#e2e8f0] bg-white px-3 text-sm outline-none focus:border-[#2563eb]"
          />
          <p className="mt-2 text-xs text-[#94a3b8]">
            Primary number shown on the captive portal.
          </p>
        </label>

        <label className="block">
          <span className="mb-2 block text-sm font-semibold text-[#475569]">
            Second Support Number (Optional)
          </span>
          <input
            value={form.secondSupportNumber}
            onChange={(event) =>
              setForm({ ...form, secondSupportNumber: event.target.value })
            }
            placeholder="+233700000000"
            className="h-11 w-full rounded-xl border border-[#e2e8f0] bg-white px-3 text-sm outline-none placeholder:text-[#cbd5e1] focus:border-[#2563eb]"
          />
          <p className="mt-2 text-xs text-[#94a3b8]">
            Additional number shown on the captive portal.
          </p>
        </label>

        <label className="block">
          <span className="mb-2 block text-sm font-semibold text-[#475569]">
            WhatsApp Support Number
          </span>
          <input
            value={form.whatsappNumber}
            onChange={(event) =>
              setForm({ ...form, whatsappNumber: event.target.value })
            }
            placeholder="+233700000000"
            className="h-11 w-full rounded-xl border border-[#e2e8f0] bg-white px-3 text-sm outline-none placeholder:text-[#cbd5e1] focus:border-[#2563eb]"
          />
          <p className="mt-2 text-xs text-[#94a3b8]">
            Customers can tap this to start a WhatsApp chat.
          </p>
        </label>

        <label className="block">
          <span className="mb-2 block text-sm font-semibold text-[#475569]">
            Your Customer Support Email
          </span>
          <input
            type="email"
            value={form.supportEmail}
            onChange={(event) =>
              setForm({ ...form, supportEmail: event.target.value })
            }
            className="h-11 w-full rounded-xl border border-[#e2e8f0] bg-white px-3 text-sm outline-none focus:border-[#2563eb]"
          />
          <p className="mt-2 text-xs text-[#94a3b8]">
            Your customers can email this address for support.
          </p>
        </label>

        <label className="block">
          <span className="mb-2 block text-sm font-semibold text-[#475569]">
            PPPoE Subscription Portal
          </span>
          <div className="flex items-center gap-2">
            <input
              readOnly
              value={form.pppoePortalUrl}
              className="h-11 w-full rounded-xl border border-[#e2e8f0] bg-[#ffffff] px-3 text-sm text-[#64748b] outline-none"
            />
            <button
              type="button"
              onClick={handleCopyPortalLink}
              className={`inline-flex h-11 shrink-0 items-center gap-1.5 rounded-xl px-4 text-sm font-bold text-white ${
                copied ? "bg-emerald-600" : "bg-emerald-500 hover:bg-emerald-600"
              }`}
            >
              {copied ? <Check size={16} /> : <Copy size={16} />}
              {copied ? "Copied" : "Copy"}
            </button>
          </div>
          <p className="mt-2 text-xs text-[#94a3b8]">
            Share this link with PPPoE customers to self-renew their
            subscriptions.
          </p>
        </label>
      </div>

      <div className="mt-8 flex justify-end">
        <button
          type="submit"
          className="rounded-xl bg-[#2563eb] px-6 py-3 text-sm font-bold text-white hover:bg-[#1d4ed8]"
        >
          Save Changes
        </button>
      </div>
    </form>
  );
}
