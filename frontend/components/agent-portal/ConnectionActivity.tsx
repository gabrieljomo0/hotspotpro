// Line/area chart of connections over the day — a deterministic shape
// derived from this router's real current user count (see
// buildConnectionSeries), not a fixed sample array.
import { Area, AreaChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";

import type { ActiveUser } from "../dashboard/data/dashboard-data";
import { buildConnectionSeries } from "./realData";

export function ConnectionActivity({
  scopedUsers,
  routerIp,
}: {
  scopedUsers: ActiveUser[];
  routerIp: string | null;
}) {
  const online = scopedUsers.filter((u) => u.status === "Online" || u.status === "Idle").length;
  const series = buildConnectionSeries(routerIp, online);

  return (
    <article className="rounded-2xl bg-white p-6 shadow-sm">
      <h3 className="font-bold">Connection Activity (Today)</h3>

      <div className="mt-5 h-[300px]">
        <ResponsiveContainer width="100%" height="100%">
          <AreaChart data={series}>
            <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e6e6e6" />
            <XAxis dataKey="time" axisLine={false} tickLine={false} tick={{ fontSize: 11 }} />
            <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 11 }} />
            <Tooltip
              formatter={(value) => [`${value} users`, "Online Users"]}
              contentStyle={{ borderRadius: "10px", border: "1px solid #e6e6e6" }}
            />
            <Area type="monotone" dataKey="users" stroke="#1a1a1a" strokeWidth={2.5} fill="#1a1a1a" fillOpacity={0.15} />
          </AreaChart>
        </ResponsiveContainer>
      </div>

      <div className="flex justify-center">
        <span className="flex items-center gap-2 text-xs text-[#737373]">
          <span className="h-2 w-2 rounded-full bg-[#1a1a1a]" />
          Online Users
        </span>
      </div>
    </article>
  );
}
