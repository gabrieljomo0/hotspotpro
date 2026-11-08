// Donut chart + legend of Online/Idle/Blocked breakdown — computed from
// the real scoped users, not a fixed sample array.
import { Cell, Pie, PieChart, ResponsiveContainer } from "recharts";

import type { ActiveUser } from "../dashboard/data/dashboard-data";
import { statusBreakdown } from "./realData";

export function UsersByStatus({ scopedUsers }: { scopedUsers: ActiveUser[] }) {
  const data = statusBreakdown(scopedUsers);

  return (
    <article className="rounded-2xl bg-white p-6 shadow-sm">
      <h3 className="font-bold">Users by Status</h3>

      {data.length === 0 ? (
        <p className="mt-5 text-sm text-[#a3a3a3]">No users on this router yet.</p>
      ) : (
        <div className="mt-5 grid items-center gap-5 sm:grid-cols-[1fr_1.15fr]">
          <div className="relative h-[220px]">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie data={data} dataKey="value" innerRadius={65} outerRadius={90} paddingAngle={1}>
                  {data.map((item) => (
                    <Cell key={item.name} fill={item.color} />
                  ))}
                </Pie>
              </PieChart>
            </ResponsiveContainer>

            <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center">
              <p className="text-2xl font-black">{scopedUsers.length}</p>
              <p className="text-xs text-[#737373]">Total Users</p>
            </div>
          </div>

          <div className="space-y-3">
            {data.map((item) => (
              <div key={item.name} className="grid grid-cols-[12px_1fr_auto] items-center gap-2 text-xs">
                <span className="h-2.5 w-2.5 rounded-full" style={{ backgroundColor: item.color }} />
                <span>{item.name}</span>
                <span className="font-semibold">
                  {item.value} <span className="font-normal text-[#737373]">({item.percentage})</span>
                </span>
              </div>
            ))}
          </div>
        </div>
      )}
    </article>
  );
}
