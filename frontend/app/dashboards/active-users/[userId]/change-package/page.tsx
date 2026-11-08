"use client";

import { use, useState } from "react";
import { useRouter } from "next/navigation";

import { useUserRoutes } from "@/components/dashboard/active-users/userRoutes";
import { useDashboard } from "@/components/dashboard/context/DashboardContext";
import {
  ActionPageLayout,
  NotFoundCard,
} from "@/components/dashboard/shared/ActionPageLayout";

const PACKAGE_OPTIONS = [
  "Daily Plan",
  "Weekly Plan",
  "Monthly Plan",
  "Direct Voucher",
];

export default function ChangePackagePage({
  params,
}: {
  params: Promise<{ userId: string }>;
}) {
  const { userId } = use(params);
  const decodedUserId = decodeURIComponent(userId);
  const router = useRouter();
  const routes = useUserRoutes();
  const { findUser, changeUserPackage } = useDashboard();

  const user = findUser(decodedUserId);
  const [selected, setSelected] = useState(user?.package ?? PACKAGE_OPTIONS[0]);

  if (!user) {
    return <NotFoundCard />;
  }

  function handleConfirm() {
    changeUserPackage(decodedUserId, selected);
    router.push(routes.listHref);
  }

  return (
    <ActionPageLayout
      eyebrow="Change package"
      title={user.phone || user.voucherUsername}
      subtitle={`Current package: ${user.package}`}
    >
      <div className="space-y-2">
        {PACKAGE_OPTIONS.map((option) => (
          <button
            type="button"
            key={option}
            onClick={() => setSelected(option)}
            className={`flex w-full items-center justify-between rounded-xl border px-4 py-3 text-left text-sm font-semibold transition ${
              selected === option
                ? "border-[#2563eb] bg-[#f1f5f9] text-[#2563eb]"
                : "border-[#e2e8f0] text-[#475569] hover:bg-[#ffffff]"
            }`}
          >
            {option}
            {selected === option && <span aria-hidden="true">✓</span>}
          </button>
        ))}
      </div>

      <button
        type="button"
        disabled={selected === user.package}
        onClick={handleConfirm}
        className="mt-6 w-full rounded-xl bg-[#2563eb] px-5 py-3 text-sm font-semibold text-white hover:bg-[#1d4ed8] disabled:cursor-not-allowed disabled:opacity-50 sm:w-auto"
      >
        Confirm Change
      </button>
    </ActionPageLayout>
  );
}
