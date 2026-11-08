"use client";

import { use } from "react";
import { useRouter } from "next/navigation";

import { useUserRoutes } from "@/components/dashboard/active-users/userRoutes";
import { useDashboard } from "@/components/dashboard/context/DashboardContext";
import {
  ActionPageLayout,
  NotFoundCard,
} from "@/components/dashboard/shared/ActionPageLayout";

export default function BlockUserPage({
  params,
}: {
  params: Promise<{ userId: string }>;
}) {
  const { userId } = use(params);
  const decodedUserId = decodeURIComponent(userId);
  const router = useRouter();
  const routes = useUserRoutes();
  const { findUser, getConnectionState, toggleBlockUser } = useDashboard();

  const user = findUser(decodedUserId);

  if (!user) {
    return <NotFoundCard />;
  }

  const state = getConnectionState(decodedUserId);

  function handleConfirm() {
    toggleBlockUser(decodedUserId);
    router.push(routes.listHref);
  }

  return (
    <ActionPageLayout
      eyebrow="Connection control"
      title={state.blocked ? "Unblock this user?" : "Block this user?"}
      subtitle={`${user.phone || user.voucherUsername} · currently ${
        state.blocked ? "blocked" : "not blocked"
      }`}
    >
      <p className="text-sm leading-6 text-[#64748b]">
        {state.blocked
          ? "The user will be allowed to connect and authenticate again."
          : "The user will be blocked and disconnected. They will not regain access until unblocked."}
      </p>

      <button
        type="button"
        onClick={handleConfirm}
        className={`mt-6 w-full rounded-xl px-5 py-3 text-sm font-semibold text-white sm:w-auto ${
          state.blocked
            ? "bg-emerald-600 hover:bg-emerald-700"
            : "bg-red-600 hover:bg-red-700"
        }`}
      >
        {state.blocked ? "Yes, Unblock User" : "Yes, Block User"}
      </button>
    </ActionPageLayout>
  );
}
