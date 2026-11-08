"use client";

// Popup for setting notification contacts specific to one router. Leaving
// both fields empty means it falls back to the account-level contacts.
import { useState } from "react";
import { createPortal } from "react-dom";
import { X } from "lucide-react";

import { useDashboard } from "@/components/dashboard/context/DashboardContext";
import type { RouterInfo } from "@/components/dashboard/data/dashboard-data";

export function NotificationContactsModal({
  router,
  onClose,
}: {
  router: RouterInfo;
  onClose: () => void;
}) {
  const { updateRouterNotificationContacts } = useDashboard();
  const [phones, setPhones] = useState(router.notificationPhones.join(", "));
  const [emails, setEmails] = useState(router.notificationEmails.join(", "));

  function save() {
    const phoneList = phones.split(",").map((s) => s.trim()).filter(Boolean);
    const emailList = emails.split(",").map((s) => s.trim()).filter(Boolean);
    updateRouterNotificationContacts(router.ip, phoneList, emailList);
    onClose();
  }

  return createPortal(
    <div className="fixed inset-0 z-[500] flex items-center justify-center bg-slate-950/50 p-4">
      <div className="w-full max-w-md rounded-2xl bg-white p-6 shadow-2xl">
        <div className="mb-4 flex items-center justify-between">
          <h3 className="text-lg font-bold text-[#0f172a]">Notification Contacts: {router.name}</h3>
          <button type="button" onClick={onClose} className="rounded-lg p-1.5 text-[#64748b] hover:bg-[#ffffff]">
            <X size={18} />
          </button>
        </div>
        <p className="mb-4 text-sm text-[#64748b]">
          These contacts are used only for this router. Leave both fields
          empty to use the account-level notification contacts.
        </p>
        <label className="mb-4 block">
          <span className="mb-2 block text-sm font-semibold text-[#475569]">Notification Phone Numbers</span>
          <input value={phones} onChange={(e) => setPhones(e.target.value)} placeholder="Add phone numbers for this router" className="h-11 w-full rounded-xl border border-[#e2e8f0] px-3 text-sm outline-none focus:border-[#2563eb]" />
          <span className="mt-1 block text-xs text-[#94a3b8]">Receives online/offline SMS alerts for this router.</span>
        </label>
        <label className="mb-5 block">
          <span className="mb-2 block text-sm font-semibold text-[#475569]">Notification Emails</span>
          <input value={emails} onChange={(e) => setEmails(e.target.value)} placeholder="Add email addresses for this router" className="h-11 w-full rounded-xl border border-[#e2e8f0] px-3 text-sm outline-none focus:border-[#2563eb]" />
          <span className="mt-1 block text-xs text-[#94a3b8]">Receives online/offline emails and captive portal issue emails.</span>
        </label>
        <div className="flex gap-3">
          <button type="button" onClick={save} className="rounded-xl bg-[#2563eb] px-5 py-3 text-sm font-bold text-white hover:bg-[#1d4ed8]">
            Save Contacts
          </button>
          <button type="button" onClick={onClose} className="rounded-xl border border-[#e2e8f0] bg-white px-5 py-3 text-sm font-bold text-[#475569] hover:bg-[#ffffff]">
            Cancel
          </button>
        </div>
      </div>
    </div>,
    document.body,
  );
}
