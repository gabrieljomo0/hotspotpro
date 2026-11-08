"use client";

import { use, useState } from "react";
import { Copy, CheckCircle2 } from "lucide-react";

import { useDashboard } from "@/components/dashboard/context/DashboardContext";
import {
  ActionPageLayout,
  NotFoundCard,
} from "@/components/dashboard/shared/ActionPageLayout";

export default function CopyLoginPage({
  params,
}: {
  params: Promise<{ userId: string }>;
}) {
  const { userId } = use(params);
  const decodedUserId = decodeURIComponent(userId);
  const { findUser } = useDashboard();
  const [copied, setCopied] = useState(false);

  const user = findUser(decodedUserId);

  if (!user) {
    return <NotFoundCard />;
  }

  async function handleCopy() {
    if (!user) return;
    const text = `Username: ${user.voucherUsername}\nPassword: ${user.voucherPassword}\nPhone: ${user.phone || "Not provided"}`;

    try {
      await navigator.clipboard.writeText(text);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 2000);
    } catch {
      // clipboard permissions unavailable — the credentials are still shown below
    }
  }

  return (
    <ActionPageLayout
      eyebrow="Login details"
      title={user.phone || user.voucherUsername}
      subtitle="Copy this user's login credentials to share with them."
    >
      <div className="space-y-3">
        <div className="flex items-center justify-between rounded-xl border border-[#f4f4f4] px-4 py-3">
          <span className="text-xs text-[#737373]">Username</span>
          <span className="font-mono text-sm font-semibold text-[#1a1a1a]">
            {user.voucherUsername}
          </span>
        </div>
        <div className="flex items-center justify-between rounded-xl border border-[#f4f4f4] px-4 py-3">
          <span className="text-xs text-[#737373]">Password</span>
          <span className="font-mono text-sm font-semibold text-[#1a1a1a]">
            {user.voucherPassword}
          </span>
        </div>
        <div className="flex items-center justify-between rounded-xl border border-[#f4f4f4] px-4 py-3">
          <span className="text-xs text-[#737373]">Phone</span>
          <span className="text-sm font-semibold text-[#1a1a1a]">
            {user.phone || "Not provided"}
          </span>
        </div>
      </div>

      <button
        type="button"
        onClick={handleCopy}
        className={`mt-6 inline-flex w-full items-center justify-center gap-2 rounded-xl px-5 py-3 text-sm font-semibold text-white sm:w-auto ${
          copied ? "bg-emerald-600" : "bg-[#1a1a1a] hover:bg-[#111111]"
        }`}
      >
        {copied ? <CheckCircle2 size={18} /> : <Copy size={18} />}
        {copied ? "Copied!" : "Copy Login Details"}
      </button>
    </ActionPageLayout>
  );
}
