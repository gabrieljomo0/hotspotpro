// Feed of things that actually happened on this router — recent voucher
// batches this agent generated/received, plus users worth flagging
// (expiring soon, blocked) — built from real context data.
import { Ticket, UserRound, LockKeyhole } from "lucide-react";

import type { ActiveUser } from "../dashboard/data/dashboard-data";
import type { VoucherBatch } from "../dashboard/shared/types";
import { getUserId } from "../dashboard/active-users/userLinks";

export function RecentEvents({
  scopedUsers,
  recentBatches,
}: {
  scopedUsers: ActiveUser[];
  recentBatches: VoucherBatch[];
}) {
  const expiring = scopedUsers.filter((u) => u.status === "Expiring Soon").slice(0, 2);
  const blocked = scopedUsers.filter((u) => u.status === "Blocked").slice(0, 2);

  const events = [
    ...recentBatches.slice(0, 3).map((batch) => ({
      key: `batch-${batch.id}`,
      title: `Generated ${batch.count} voucher(s) — ${batch.packageName}`,
      subtitle: `Batch ${batch.reference}`,
      time: batch.createdAt,
      icon: Ticket,
      iconClass: "bg-[#f4f4f4] text-[#1a1a1a]",
    })),
    ...expiring.map((u) => ({
      key: `expiring-${getUserId(u)}`,
      title: `${u.phone}'s package is expiring soon`,
      subtitle: `${u.package} · ${u.timeLeft} left`,
      time: "",
      icon: UserRound,
      iconClass: "bg-[#f4f4f4] text-[#1a1a1a]",
    })),
    ...blocked.map((u) => ({
      key: `blocked-${getUserId(u)}`,
      title: `${u.phone} is currently blocked`,
      subtitle: u.package,
      time: "",
      icon: LockKeyhole,
      iconClass: "bg-[#f3f1ec] text-[#1a1a1a]",
    })),
  ];

  return (
    <article className="rounded-2xl bg-white p-6 shadow-sm">
      <h3 className="font-bold">Recent Events</h3>

      <div className="mt-5 space-y-4">
        {events.length === 0 ? (
          <p className="text-sm text-[#a3a3a3]">Nothing to show yet.</p>
        ) : (
          events.map((event) => {
            const Icon = event.icon;
            return (
              <div key={event.key} className="flex items-start gap-3">
                <div className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-full ${event.iconClass}`}>
                  <Icon size={15} />
                </div>
                <div className="min-w-0 flex-1">
                  <p className="text-xs font-semibold">{event.title}</p>
                  <p className="mt-1 truncate text-[11px] text-[#737373]">{event.subtitle}</p>
                </div>
                {event.time && <span className="whitespace-nowrap text-[11px] text-[#737373]">{event.time}</span>}
              </div>
            );
          })
        )}
      </div>
    </article>
  );
}
