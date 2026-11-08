"use client";

import { use, useState } from "react";
import { useRouter } from "next/navigation";

import { useUserRoutes } from "@/components/dashboard/active-users/userRoutes";
import { useDashboard } from "@/components/dashboard/context/DashboardContext";
import {
  ActionPageLayout,
  NotFoundCard,
} from "@/components/dashboard/shared/ActionPageLayout";

const QUICK_OPTIONS = ["1 Hour", "3 Hours", "6 Hours", "12 Hours", "24 Hours"];
const UNITS = ["Minutes", "Hours", "Days"];

export default function ExtendAccessPage({
  params,
}: {
  params: Promise<{ userId: string }>;
}) {
  const { userId } = use(params);
  const decodedUserId = decodeURIComponent(userId);
  const router = useRouter();
  const routes = useUserRoutes();
  const { findUser, extendUserAccess } = useDashboard();

  const [customValue, setCustomValue] = useState("");
  const [customUnit, setCustomUnit] = useState("Hours");

  const user = findUser(decodedUserId);

  if (!user) {
    return <NotFoundCard />;
  }

  function applyExtension(label: string) {
    extendUserAccess(decodedUserId, label);
    router.push(routes.listHref);
  }

  function handleCustomSubmit() {
    const amount = Number(customValue);
    if (!amount || amount <= 0) return;
    applyExtension(`${amount} ${customUnit}`);
  }

  return (
    <ActionPageLayout
      eyebrow="Extend access time"
      title={user.phone || user.voucherUsername}
      subtitle={`Current time left: ${user.timeLeft}`}
    >
      <p className="mb-3 text-sm font-semibold text-[#475569]">Quick options</p>
      <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
        {QUICK_OPTIONS.map((option) => (
          <button
            type="button"
            key={option}
            onClick={() => applyExtension(option)}
            className="rounded-xl border border-[#e2e8f0] px-3 py-2.5 text-sm font-semibold text-[#475569] transition hover:border-[#2563eb] hover:bg-[#f1f5f9] hover:text-[#2563eb]"
          >
            +{option}
          </button>
        ))}
      </div>

      <p className="mb-3 mt-6 text-sm font-semibold text-[#475569]">
        Or specify a custom amount
      </p>
      <div className="flex flex-wrap items-end gap-3">
        <label className="block">
          <span className="mb-1.5 block text-xs font-semibold text-[#64748b]">Amount</span>
          <input
            type="number"
            min={1}
            value={customValue}
            onChange={(event) => setCustomValue(event.target.value)}
            placeholder="e.g. 45"
            className="h-11 w-32 rounded-xl border border-[#e2e8f0] bg-white px-3 text-sm outline-none focus:border-[#2563eb]"
          />
        </label>
        <label className="block">
          <span className="mb-1.5 block text-xs font-semibold text-[#64748b]">Unit</span>
          <select
            value={customUnit}
            onChange={(event) => setCustomUnit(event.target.value)}
            className="h-11 rounded-xl border border-[#e2e8f0] bg-white px-3 text-sm outline-none focus:border-[#2563eb]"
          >
            {UNITS.map((unit) => (
              <option key={unit} value={unit}>
                {unit}
              </option>
            ))}
          </select>
        </label>
        <button
          type="button"
          onClick={handleCustomSubmit}
          disabled={!customValue || Number(customValue) <= 0}
          className="h-11 rounded-xl bg-[#2563eb] px-5 text-sm font-semibold text-white hover:bg-[#1d4ed8] disabled:cursor-not-allowed disabled:bg-[#e2e8f0] disabled:text-[#94a3b8]"
        >
          Apply
        </button>
      </div>
    </ActionPageLayout>
  );
}
