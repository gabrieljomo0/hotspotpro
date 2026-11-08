"use client";

import { use } from "react";
import { useRouter } from "next/navigation";

import { useUserRoutes } from "@/components/dashboard/active-users/userRoutes";
import { useDashboard } from "@/components/dashboard/context/DashboardContext";
import {
  ActionPageLayout,
  NotFoundCard,
} from "@/components/dashboard/shared/ActionPageLayout";

export default function DisconnectUserPage({
  params,
}: {
  params: Promise<{ userId: string }>;
}) {
  const { userId } = use(params);
  const decodedUserId = decodeURIComponent(userId);
  const router = useRouter();
  const routes = useUserRoutes();
  const { findUser, getConnectionState, toggleDisconnectUser } =
    useDashboard();

  const user = findUser(decodedUserId);

  if (!user) {
    return <NotFoundCard />;
  }

  const state = getConnectionState(decodedUserId);

  function handleConfirm() {
    toggleDisconnectUser(decodedUserId);
    router.push(routes.listHref);
  }

  return (
    <ActionPageLayout
      eyebrow="Connection control"
      title={
        state.disconnected ? "Reconnect this user?" : "Disconnect this user?"
      }
      subtitle={`${user.phone || user.voucherUsername} · currently ${
        state.disconnected ? "disconnected" : "connected"
      }`}
    >
      <p className="text-sm leading-6 text-[#64748b]">
        {state.disconnected
          ? "The user will be allowed to reconnect to the network."
          : "The user will be disconnected from their current WiFi session and may need to log in again."}
      </p>

      <button
        type="button"
        onClick={handleConfirm}
        className={`mt-6 w-full rounded-xl px-5 py-3 text-sm font-semibold text-white sm:w-auto ${
          state.disconnected
            ? "bg-emerald-600 hover:bg-emerald-700"
            : "bg-red-600 hover:bg-red-700"
        }`}
      >
        {state.disconnected ? "Yes, Reconnect User" : "Yes, Disconnect User"}
      </button>
    </ActionPageLayout>
  );
}
