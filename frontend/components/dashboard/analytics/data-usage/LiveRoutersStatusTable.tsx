"use client";

import { useEffect, useState } from "react";
import { Radio, Cpu, MemoryStick } from "lucide-react";

import type { RouterInfo } from "@/components/dashboard/data/dashboard-data";

export function LiveRoutersStatusTable({
  routers,
  routerEnabled,
}: {
  routers: RouterInfo[];
  routerEnabled: Record<string, boolean>;
}) {
  const [tick, setTick] = useState(0);

  useEffect(() => {
    const interval = window.setInterval(() => setTick((t) => t + 1), 2000);
    return () => window.clearInterval(interval);
  }, []);

  return (
    <div className="p-5">
      <div className="mb-4 flex items-center gap-2">
        <span className="relative flex h-2.5 w-2.5">
          <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-red-400 opacity-75" />
          <span className="relative inline-flex h-2.5 w-2.5 rounded-full bg-red-500" />
        </span>
        <p className="text-sm font-bold text-[#0f172a]">
          Live Data Status — All Connected Routers
        </p>
        <span className="flex items-center gap-1 text-xs text-[#94a3b8]">
          <Radio size={12} />
          Updates every 2 seconds
        </span>
      </div>

      <div className="overflow-x-auto rounded-xl bg-white">
        <table className="w-full text-left text-sm">
          <thead className="bg-[#ffffff] text-xs text-[#64748b]">
            <tr>
              <th className="px-4 py-2.5 font-semibold">Router</th>
              <th className="px-4 py-2.5 font-semibold">Status</th>
              <th className="px-4 py-2.5 font-semibold">Clients</th>
              <th className="px-4 py-2.5 font-semibold">Throughput</th>
              <th className="px-4 py-2.5 font-semibold">CPU</th>
              <th className="px-4 py-2.5 font-semibold">Memory</th>
            </tr>
          </thead>
          <tbody>
            {routers.map((router, index) => {
              const online = routerEnabled[router.ip];
              const seed = index * 97 + tick * 13;
              const clients = online
                ? Math.max(0, router.clients + ((seed % 7) - 3))
                : 0;
              const throughput = online
                ? Math.max(0, Math.round((router.clients * 4 + (seed % 40)) * 10) / 10)
                : 0;
              const cpuPct = online
                ? Math.min(99, Math.max(3, router.cpu + ((seed % 15) - 7)))
                : 0;
              const memoryPct = online
                ? Math.min(99, Math.max(5, router.memory + ((seed % 11) - 5)))
                : 0;

              return (
                <tr key={router.ip} className="border-t border-[#f1f5f9]">
                  <td className="px-4 py-2.5 font-semibold text-[#0f172a]">
                    {router.name.split(" (")[0]}
                  </td>
                  <td className="px-4 py-2.5">
                    <span
                      className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-semibold ${
                        online
                          ? "bg-emerald-100 text-emerald-700"
                          : "bg-red-100 text-red-700"
                      }`}
                    >
                      <span
                        className={`h-1.5 w-1.5 rounded-full ${
                          online ? "bg-emerald-500" : "bg-red-500"
                        }`}
                      />
                      {online ? "Online" : "Offline"}
                    </span>
                  </td>
                  <td className="px-4 py-2.5 text-[#475569]">{clients}</td>
                  <td className="px-4 py-2.5 text-[#475569]">
                    {throughput} Mbps
                  </td>
                  <td className="px-4 py-2.5">
                    <span className="inline-flex items-center gap-1 text-[#475569]">
                      <Cpu size={12} className="text-[#94a3b8]" />
                      {cpuPct}%
                    </span>
                  </td>
                  <td className="px-4 py-2.5">
                    <span className="inline-flex items-center gap-1 text-[#475569]">
                      <MemoryStick size={12} className="text-[#94a3b8]" />
                      {memoryPct}%
                    </span>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}
