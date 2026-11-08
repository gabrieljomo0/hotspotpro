"use client";

// This router's Internet Users tab: a simple list of every customer
// currently connected, linking through to their full details page.
import Link from "next/link";
import { Users } from "lucide-react";

import { getUserId, userActionHref } from "@/components/dashboard/active-users/userLinks";
import type { ActiveUser } from "@/components/dashboard/data/dashboard-data";

export function InternetUsersTab({ connectedUsers }: { connectedUsers: ActiveUser[] }) {
  return (
    <article className="rounded-2xl border border-[#d4d4d4] bg-white p-5 shadow-[0_8px_24px_rgba(26,26,26,0.06)]">
      <p className="mb-3 flex items-center gap-2 text-sm font-bold text-[#1a1a1a]">
        <Users size={16} className="text-[#1a1a1a]" />
        Connected Users ({connectedUsers.length})
      </p>
      {connectedUsers.length === 0 ? (
        <p className="text-sm text-[#a3a3a3]">No active users on this router right now.</p>
      ) : (
        <div className="space-y-2">
          {connectedUsers.map((user) => {
            const userId = getUserId(user);
            return (
              <Link
                key={userId}
                href={userActionHref(userId, "advanced-details")}
                className="flex items-center justify-between rounded-lg bg-[#ffffff] px-4 py-2.5 text-sm hover:bg-[#f4f4f4]"
              >
                <span className="font-semibold text-[#1a1a1a]">{user.phone || user.voucherUsername}</span>
                <span className="text-xs text-[#737373]">{user.package}</span>
              </Link>
            );
          })}
        </div>
      )}
    </article>
  );
}
