"use client";

import { use } from "react";
import { useRouter } from "next/navigation";

import { useUserRoutes } from "@/components/dashboard/active-users/userRoutes";
import { useDashboard } from "@/components/dashboard/context/DashboardContext";
import {
  ActionPageLayout,
  NotFoundCard,
} from "@/components/dashboard/shared/ActionPageLayout";

export default function PauseUserPage({
  params,
}: {
  params: Promise<{ userId: string }>;
}) {
  const { userId } = use(params);
  const decodedUserId = decodeURIComponent(userId);
  const router = useRouter();
  const routes = useUserRoutes();
  const { findUser, getConnectionState, togglePauseUser } = useDashboard();

  const user = findUser(decodedUserId);

  if (!user) {
    return <NotFoundCard />;
  }

  const state = getConnectionState(decodedUserId);

  function handleConfirm() {
    togglePauseUser(decodedUserId);
    router.push(routes.listHref);
  }

  return (
    <ActionPageLayout
      eyebrow="Connection control"
      title={state.paused ? "Resume this connection?" : "Pause this connection?"}
      subtitle={`${user.phone || user.voucherUsername} · currently ${
        state.paused ? "paused" : "active"
      }`}
    >
      <p className="text-sm leading-6 text-[#64748b]">
        {state.paused
          ? "The user will regain internet access immediately."
          : "The user will temporarily lose internet access until the connection is resumed."}
      </p>

      <button
        type="button"
        onClick={handleConfirm}
        className={`mt-6 w-full rounded-xl px-5 py-3 text-sm font-semibold text-white sm:w-auto ${
          state.paused
            ? "bg-emerald-600 hover:bg-emerald-700"
            : "bg-amber-600 hover:bg-amber-700"
        }`}
      >
        {state.paused ? "Yes, Resume Connection" : "Yes, Pause Connection"}
      </button>
    </ActionPageLayout>
  );
}
