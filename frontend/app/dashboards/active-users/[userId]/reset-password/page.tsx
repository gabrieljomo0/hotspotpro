"use client";

import { use, useState } from "react";
import { useRouter } from "next/navigation";
import { CheckCircle2 } from "lucide-react";

import { useUserRoutes } from "@/components/dashboard/active-users/userRoutes";
import { useDashboard } from "@/components/dashboard/context/DashboardContext";
import {
  ActionPageLayout,
  NotFoundCard,
} from "@/components/dashboard/shared/ActionPageLayout";

export default function ResetPasswordPage({
  params,
}: {
  params: Promise<{ userId: string }>;
}) {
  const { userId } = use(params);
  const decodedUserId = decodeURIComponent(userId);
  const router = useRouter();
  const routes = useUserRoutes();
  const { findUser, resetUserPassword } = useDashboard();
  const [newPassword, setNewPassword] = useState<string | null>(null);

  const user = findUser(decodedUserId);

  if (!user) {
    return <NotFoundCard />;
  }

  function handleConfirm() {
    const generated = resetUserPassword(decodedUserId);
    setNewPassword(generated);
  }

  if (newPassword) {
    return (
      <ActionPageLayout
        eyebrow="Reset voucher password"
        title={user.phone || user.voucherUsername}
      >
        <div className="rounded-2xl border border-emerald-200 bg-white p-5">
          <div className="flex items-center gap-2 font-black text-emerald-800">
            <CheckCircle2 size={20} />
            Password reset successfully
          </div>
          <p className="mt-3 text-sm text-emerald-700">New password:</p>
          <p className="mt-1 font-mono text-lg font-bold text-emerald-900">
            {newPassword}
          </p>
        </div>

        <button
          type="button"
          onClick={() => router.push(routes.listHref)}
          className="mt-6 w-full rounded-xl bg-[#1a1a1a] px-5 py-3 text-sm font-semibold text-white hover:bg-[#111111] sm:w-auto"
        >
          Done
        </button>
      </ActionPageLayout>
    );
  }

  return (
    <ActionPageLayout
      eyebrow="Reset voucher password"
      title={user.phone || user.voucherUsername}
      subtitle={`This generates a new password for voucher username ${user.voucherUsername}. The current password will stop working immediately.`}
    >
      <button
        type="button"
        onClick={handleConfirm}
        className="w-full rounded-xl bg-[#1a1a1a] px-5 py-3 text-sm font-semibold text-white hover:bg-[#111111] sm:w-auto"
      >
        Yes, Reset Password
      </button>
    </ActionPageLayout>
  );
}
