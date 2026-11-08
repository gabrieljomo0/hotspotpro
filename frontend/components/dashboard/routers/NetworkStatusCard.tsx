"use client";

import { useState } from "react";
import { Router } from "lucide-react";
import Link from "next/link";
import type { MouseEvent } from "react";

import { useDashboard } from "../context/DashboardContext";
import { useDashboardScope } from "../overview/useDashboardScope";
import { PercentageBar } from "../shared/PercentageBar";
import { RouterActionsMenu } from "./RouterActionsMenu";
import { ConnectionBadge } from "./ConnectionBadge";
import { useRouterControl } from "./useRouterControl";

export function NetworkStatusCard({
  expanded = false,
}: {
  expanded?: boolean;
} = {}) {
  const {
    routers: allRouters,
    routerEnabled,
    openRouterAction,
    openRouterActions,
    closeAllActionMenus,
  } = useDashboard();
  const { control } = useRouterControl();

  // The small version on the main dashboard follows the dashboard filter;
  // the full router list always shows every router.
  const { routers: filteredRouters } = useDashboardScope();
  const routers = expanded ? allRouters : filteredRouters;

  const [menuRect, setMenuRect] = useState<DOMRect | null>(null);

  function handleOpenActions(ip: string, event: React.MouseEvent<HTMLElement>) {
    const rect = (event.currentTarget as HTMLElement).getBoundingClientRect();
    setMenuRect(rect);
    openRouterActions(ip);
  }

  const onlineCount = routers.filter((r) => routerEnabled[r.ip]).length;
  const offlineCount = routers.length - onlineCount;

  return (
    <section className="overflow-hidden rounded-2xl border border-[#e2e8f0] bg-white shadow-[0_8px_24px_rgba(37,99,235,0.06)]  ">
      <div className="flex items-center justify-between border-b border-[#e2e8f0] px-5 py-4 ">
        <h3 className="text-base font-bold">Network Status</h3>

        {!expanded && (
          <Link
            href="/dashboards/configuration/routers"
            className="rounded-lg border border-[#e2e8f0] px-3 py-2 text-xs font-semibold text-[#2563eb] transition hover:bg-[#ffffff]"
          >
            View all
          </Link>
        )}
      </div>

      <div className="flex items-center gap-4 border-b border-[#f1f5f9] px-5 py-3 text-xs">
        <span className="inline-flex items-center gap-1.5 font-semibold text-[#2563eb]">
          <span className="h-2 w-2 rounded-full bg-[#2563eb]" />
          {onlineCount} Online
        </span>
        <span className="inline-flex items-center gap-1.5 font-semibold text-red-500">
          <span className="h-2 w-2 rounded-full bg-red-500" />
          {offlineCount} Offline
        </span>
        <span className="text-[#94a3b8]">= {routers.length} total</span>
      </div>

      <div
        className={
          expanded
            ? "overflow-x-auto"
            : "max-h-[420px] min-h-[220px] resize-y overflow-auto"
        }
      >
        <table
          className={
            expanded
              ? "w-full text-left text-sm"
              : "w-full min-w-[1280px] text-left text-sm"
          }
        >
          <thead className="sticky top-0 bg-[#ffffff] text-[#64748b]  ">
            <tr>
              <th className="px-6 py-4 font-semibold">Router</th>
              <th className="px-4 py-4 font-semibold">IP Address</th>
              <th className="px-4 py-4 font-semibold">Status</th>
              <th className="px-4 py-4 font-semibold">Uptime</th>
              <th className="px-4 py-4 font-semibold">Clients</th>
              <th className="px-4 py-4 font-semibold">CPU</th>
              <th className="px-4 py-4 font-semibold">Memory</th>
              <th className="px-4 py-4 font-semibold">Last Seen</th>
              <th className="px-4 py-4 text-center font-semibold">
                Actions
              </th>
            </tr>
          </thead>

          <tbody>
            {routers.map((router) => {
              const online = router.status === "Online";

              return (
                <tr
                  key={router.ip}
                  className="border-t border-[#f1f5f9] transition hover:bg-[#ffffff]  /70"
                >
                  <td className="px-6 py-4 font-semibold">
                    <Link
                      href={`/dashboards/configuration/routers/${encodeURIComponent(router.ip)}`}
                      className="inline-flex items-center gap-3 hover:text-[#2563eb]"
                    >
                      <Router size={19} />
                      {router.name}
                      <ConnectionBadge router={router} control={control[router.ip]} />
                    </Link>
                  </td>

                  <td className="px-4 py-4">{router.ip}</td>

                  <td className="px-4 py-4">
                    <span
                      className={`rounded-full px-3 py-1.5 text-xs font-semibold ${
                        online
                          ? "bg-[#f1f5f9] text-[#2563eb] "
                          : "bg-[#fef2f2] text-[#b91c1c] "
                      }`}
                    >
                      {routerEnabled[router.ip] ? "Online" : "Disabled"}
                    </span>
                  </td>

                  <td className="px-4 py-4 font-medium">{router.uptime}</td>

                  <td className="px-4 py-4">{router.clients}</td>

                  <td className="px-4 py-4">
                    <PercentageBar value={router.cpu} />
                  </td>

                  <td className="px-4 py-4">
                    <PercentageBar value={router.memory} />
                  </td>

                  <td className="px-4 py-4 text-[#64748b]">
                    {router.lastSeen}
                  </td>

                  <td className="px-4 py-4 text-center">
                    <button
                      type="button"
                      onClick={(event) => handleOpenActions(router.ip, event)}
                      className="rounded-lg border border-[#e2e8f0] bg-white px-3 py-2 text-xs font-semibold text-[#475569] hover:bg-[#f1f5f9]"
                    >
                      Actions
                    </button>

                    {openRouterAction === router.ip && (
                      <RouterActionsMenu
                        router={router}
                        anchorRect={menuRect}
                        onClose={closeAllActionMenus}
                      />
                    )}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </section>
  );
}
