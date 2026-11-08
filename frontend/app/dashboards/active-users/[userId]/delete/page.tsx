"use client";

import { use } from "react";
import { useRouter } from "next/navigation";

import { useUserRoutes } from "@/components/dashboard/active-users/userRoutes";
import { useDashboard } from "@/components/dashboard/context/DashboardContext";
import {
  ActionPageLayout,
  NotFoundCard,
} from "@/components/dashboard/shared/ActionPageLayout";

export default function DeleteUserPage({
  params,
}: {
  params: Promise<{ userId: string }>;
}) {
  const { userId } = use(params);
  const decodedUserId = decodeURIComponent(userId);
  const router = useRouter();
  const routes = useUserRoutes();
  const { findUser, deleteUser } = useDashboard();

  const user = findUser(decodedUserId);

  if (!user) {
    return <NotFoundCard />;
  }

  function handleConfirm() {
    deleteUser(decodedUserId);
    router.push(routes.listHref);
  }

  return (
    <ActionPageLayout
      eyebrow="Delete user"
      title="Delete this user?"
      subtitle={`You are about to permanently delete "${
        user.phone || user.voucherUsername
      }". This removes their voucher access and cannot be undone.`}
    >
      <button
        type="button"
        onClick={handleConfirm}
        className="w-full rounded-xl bg-red-600 px-5 py-3 text-sm font-semibold text-white hover:bg-red-700 sm:w-auto"
      >
        Yes, Delete User
      </button>
    </ActionPageLayout>
  );
}
