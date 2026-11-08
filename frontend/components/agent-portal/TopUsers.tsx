// Ranked list of the top 5 data users on this router — real numbers.
import type { ActiveUser } from "../dashboard/data/dashboard-data";
import { topUsersByData } from "./realData";

export function TopUsers({ scopedUsers }: { scopedUsers: ActiveUser[] }) {
  const users = topUsersByData(scopedUsers);

  return (
    <article className="rounded-2xl bg-white p-6 shadow-sm">
      <h3 className="font-bold">Top Users by Data Usage</h3>

      <div className="mt-5 space-y-4">
        {users.length === 0 ? (
          <p className="text-sm text-[#94a3b8]">No users on this router yet.</p>
        ) : (
          users.map((user, index) => (
            <div key={user.phone} className="grid grid-cols-[28px_1fr_auto] items-center gap-3 text-sm">
              <span className="flex h-7 w-7 items-center justify-center rounded-full bg-[#f1f5f9] text-xs font-semibold text-[#2563eb]">
                {index + 1}
              </span>
              <span className="font-semibold">{user.phone}</span>
              <span className="font-bold">{user.usage}</span>
            </div>
          ))
        )}
      </div>
    </article>
  );
}
