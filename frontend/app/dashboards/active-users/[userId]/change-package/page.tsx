"use client";

import { use, useState } from "react";
import { useRouter } from "next/navigation";

import { useUserRoutes } from "@/components/dashboard/active-users/userRoutes";
import { useDashboard } from "@/components/dashboard/context/DashboardContext";
import {
  ActionPageLayout,
  NotFoundCard,
} from "@/components/dashboard/shared/ActionPageLayout";
import { localizeAmountString } from "@/components/dashboard/shared/currency";

export default function ChangePackagePage({
  params,
}: {
  params: Promise<{ userId: string }>;
}) {
  const { userId } = use(params);
  const decodedUserId = decodeURIComponent(userId);
  const router = useRouter();
  const routes = useUserRoutes();
  const { findUser, changeUserPackage, packages } = useDashboard();

  const user = findUser(decodedUserId);
  const packageOptions = packages.filter((p) => p.status === "Active" || p.status === "Hidden");
  const [selected, setSelected] = useState(user?.package ?? packageOptions[0]?.name ?? "");

  if (!user) {
    return <NotFoundCard />;
  }

  function handleConfirm() {
    if (!selected) return;
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
        {packageOptions.length === 0 ? (
          <p className="rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800">
            No packages available. Create one under Packages first.
          </p>
        ) : (
          packageOptions.map((pkg) => (
            <button
              type="button"
              key={pkg.id}
              onClick={() => setSelected(pkg.name)}
              className={`flex w-full items-center justify-between rounded-xl border px-4 py-3 text-left text-sm font-semibold transition ${
                selected === pkg.name
                  ? "border-[#1a1a1a] bg-[#f4f4f4] text-[#1a1a1a]"
                  : "border-[#e6e6e6] text-[#525252] hover:bg-[#ffffff]"
              }`}
            >
              <span>
                {pkg.name}
                <span className="ml-2 text-xs font-medium text-[#737373]">
                  {localizeAmountString(pkg.price)} · {pkg.validity}
                </span>
              </span>
              {selected === pkg.name && <span aria-hidden="true">✓</span>}
            </button>
          ))
        )}
      </div>

      <button
        type="button"
        disabled={selected === user.package}
        onClick={handleConfirm}
        className="mt-6 w-full rounded-xl bg-[#1a1a1a] px-5 py-3 text-sm font-semibold text-white hover:bg-[#111111] disabled:cursor-not-allowed disabled:opacity-50 sm:w-auto"
      >
        Confirm Change
      </button>
    </ActionPageLayout>
  );
}
