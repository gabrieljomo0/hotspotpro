"use client";

import { use, useState } from "react";
import { useRouter } from "next/navigation";

import { useUserRoutes } from "@/components/dashboard/active-users/userRoutes";
import { useDashboard } from "@/components/dashboard/context/DashboardContext";
import {
  ActionPageLayout,
  NotFoundCard,
} from "@/components/dashboard/shared/ActionPageLayout";

const PRESETS = [0.5, 1, 2, 5, 10];

export default function TopUpDataPage({
  params,
}: {
  params: Promise<{ userId: string }>;
}) {
  const { userId } = use(params);
  const decodedUserId = decodeURIComponent(userId);
  const router = useRouter();
  const routes = useUserRoutes();
  const { findUser, topUpUserData } = useDashboard();
  const [selected, setSelected] = useState(PRESETS[1]);
  const [customGb, setCustomGb] = useState("");

  const user = findUser(decodedUserId);

  if (!user) {
    return <NotFoundCard />;
  }

  const amount = customGb ? Number(customGb) : selected;

  function handleConfirm() {
    if (!amount || amount <= 0) return;
    topUpUserData(decodedUserId, amount);
    router.push(routes.listHref);
  }

  return (
    <ActionPageLayout
      eyebrow="Top up data"
      title={user.phone || user.voucherUsername}
      subtitle={`Current data left: ${user.dataLeft}`}
    >
      <p className="mb-4 text-sm text-[#64748b]">
        Manually add data to this user&apos;s remaining allowance — useful
        for goodwill top-ups or fixing a billing issue, without waiting for
        them to buy a new voucher.
      </p>

      <div className="grid grid-cols-3 gap-2 sm:grid-cols-5">
        {PRESETS.map((option) => (
          <button
            type="button"
            key={option}
            onClick={() => {
              setSelected(option);
              setCustomGb("");
            }}
            className={`rounded-xl border px-3 py-2.5 text-sm font-semibold transition ${
              !customGb && selected === option
                ? "border-[#2563eb] bg-[#f1f5f9] text-[#2563eb]"
                : "border-[#e2e8f0] text-[#475569] hover:bg-[#ffffff]"
            }`}
          >
            +{option} GB
          </button>
        ))}
      </div>

      <label className="mt-4 block max-w-xs">
        <span className="mb-2 block text-sm font-semibold text-[#475569]">
          Or enter a custom amount (GB)
        </span>
        <input
          type="number"
          min={0.1}
          step={0.1}
          value={customGb}
          onChange={(event) => setCustomGb(event.target.value)}
          placeholder="e.g. 3.5"
          className="h-11 w-full rounded-xl border border-[#e2e8f0] bg-white px-3 text-sm outline-none focus:border-[#2563eb]"
        />
      </label>

      <button
        type="button"
        onClick={handleConfirm}
        disabled={!amount || amount <= 0}
        className="mt-6 w-full rounded-xl bg-[#2563eb] px-5 py-3 text-sm font-semibold text-white hover:bg-[#1d4ed8] disabled:cursor-not-allowed disabled:bg-[#e2e8f0] disabled:text-[#94a3b8] sm:w-auto"
      >
        Add {amount || 0} GB
      </button>
    </ActionPageLayout>
  );
}
