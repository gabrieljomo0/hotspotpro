"use client";

import { useEffect, useState } from "react";
import { Download, Upload, Cpu, MemoryStick, Router as RouterIcon } from "lucide-react";

import type { RouterInfo } from "@/components/dashboard/data/dashboard-data";

type LiveRow = {
  ip: string;
  name: string;
  downloadMbps: number;
  uploadMbps: number;
  cpuPct: number;
  memoryPct: number;
};

export function PerRouterLivePanel({
  routers,
  routerEnabled,
}: {
  routers: RouterInfo[];
  routerEnabled: Record<string, boolean>;
}) {
  const [rows, setRows] = useState<LiveRow[]>(() =>
    routers.map((router) => ({
      ip: router.ip,
      name: router.name.split(" (")[0],
      downloadMbps: 0,
      uploadMbps: 0,
      cpuPct: router.cpu,
      memoryPct: router.memory,
    })),
  );

  useEffect(() => {
    const interval = window.setInterval(() => {
      setRows(
        routers.map((router) => {
          const online = routerEnabled[router.ip];
          const baseDown = 20 + router.clients * 3;
          const baseUp = 6 + router.clients * 1.1;

          return {
            ip: router.ip,
            name: router.name.split(" (")[0],
            downloadMbps: online
              ? Number(
                  Math.max(2, baseDown + (Math.random() - 0.5) * baseDown * 0.4).toFixed(1),
                )
              : 0,
            uploadMbps: online
              ? Number(
                  Math.max(1, baseUp + (Math.random() - 0.5) * baseUp * 0.4).toFixed(1),
                )
              : 0,
            cpuPct: online
              ? Math.min(99, Math.max(3, Math.round(router.cpu + (Math.random() - 0.5) * 15)))
              : 0,
            memoryPct: online
              ? Math.min(99, Math.max(5, Math.round(router.memory + (Math.random() - 0.5) * 10)))
              : 0,
          };
        }),
      );
    }, 2000);

    return () => window.clearInterval(interval);
  }, [routers, routerEnabled]);

  return (
    <div className="rounded-xl border border-red-200 bg-red-50 p-5">
      <div className="mb-4 flex items-center gap-2">
        <span className="relative flex h-2.5 w-2.5">
          <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-red-400 opacity-75" />
          <span className="relative inline-flex h-2.5 w-2.5 rounded-full bg-red-500" />
        </span>
        <p className="text-sm font-bold text-[#0f172a]">
          Live Data Usage — Per Router
        </p>
        <span className="text-xs text-[#94a3b8]">
          Updates every 2 seconds
        </span>
      </div>

      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {rows.map((row) => {
          const online = routerEnabled[row.ip];

          return (
            <div key={row.ip} className="rounded-lg bg-white p-4">
              <div className="mb-3 flex items-center justify-between">
                <span className="flex items-center gap-1.5 text-sm font-bold text-[#0f172a]">
                  <RouterIcon size={14} className="text-blue-600" />
                  {row.name}
                </span>
                <span
                  className={`rounded-full px-2 py-0.5 text-[10px] font-bold ${
                    online
                      ? "bg-emerald-100 text-emerald-700"
                      : "bg-red-100 text-red-700"
                  }`}
                >
                  {online ? "Online" : "Offline"}
                </span>
              </div>

              <div className="grid grid-cols-2 gap-2 text-xs">
                <div className="flex items-center gap-1.5 text-[#64748b]">
                  <Download size={12} />
                  Down: <strong className="text-[#0f172a]">{row.downloadMbps} Mbps</strong>
                </div>
                <div className="flex items-center gap-1.5 text-[#64748b]">
                  <Upload size={12} />
                  Up: <strong className="text-[#0f172a]">{row.uploadMbps} Mbps</strong>
                </div>
                <div className="flex items-center gap-1.5 text-[#64748b]">
                  <Cpu size={12} />
                  CPU: <strong className="text-[#0f172a]">{row.cpuPct}%</strong>
                </div>
                <div className="flex items-center gap-1.5 text-[#64748b]">
                  <MemoryStick size={12} />
                  RAM: <strong className="text-[#0f172a]">{row.memoryPct}%</strong>
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
