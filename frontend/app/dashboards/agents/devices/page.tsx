"use client";

import { Smartphone, Ban, CheckCircle2 } from "lucide-react";

import { useDashboard } from "@/components/dashboard/context/DashboardContext";
import { BackLink } from "@/components/dashboard/shared/BackLink";

export default function DevicesPage() {
  const { agents, setAgentDeviceStatus, forceLogoutAgent } = useDashboard();

  const allDevices = agents.flatMap((agent) =>
    agent.devices.map((device) => ({ agent, device })),
  );

  return (
    <section className="w-full">
      <BackLink />
      <h2 className="mb-1 text-3xl font-bold tracking-tight md:text-4xl">
        Devices
      </h2>
      <p className="mb-6 max-w-2xl text-sm text-[#737373] md:text-base">
        Every device registered by an agent, across your whole network (
        {allDevices.length} total).
      </p>


      <article className="overflow-hidden rounded-2xl border border-[#e6e6e6] bg-white shadow-[0_8px_24px_rgba(26,26,26,0.06)]">
        {allDevices.length === 0 ? (
          <p className="px-5 py-10 text-center text-sm text-[#a3a3a3]">
            No devices registered yet.
          </p>
        ) : (
          <table className="w-full text-left text-sm">
            <thead className="bg-[#ffffff] text-xs text-[#737373]">
              <tr>
                <th className="px-5 py-3 font-semibold">Agent</th>
                <th className="px-5 py-3 font-semibold">Device</th>
                <th className="px-5 py-3 font-semibold">Browser</th>
                <th className="px-5 py-3 font-semibold">Last Active</th>
                <th className="px-5 py-3 font-semibold">Status</th>
                <th className="px-5 py-3 text-center font-semibold">Actions</th>
              </tr>
            </thead>
            <tbody>
              {allDevices.map(({ agent, device }: { agent: (typeof agents)[number]; device: (typeof agents)[number]["devices"][number] }) => (
                <tr key={device.id} className="border-t border-[#f4f4f4]">
                  <td className="px-5 py-3 font-semibold text-[#1a1a1a]">{agent.name}</td>
                  <td className="px-5 py-3 text-[#525252]">
                    <span className="inline-flex items-center gap-1.5">
                      <Smartphone size={13} className="text-[#a3a3a3]" />
                      {device.deviceName}
                    </span>
                  </td>
                  <td className="px-5 py-3 text-[#737373]">{device.browser}</td>
                  <td className="px-5 py-3 text-[#737373]">{device.lastActive}</td>
                  <td className="px-5 py-3">
                    <span
                      className={`rounded-full px-2.5 py-1 text-xs font-semibold ${
                        device.status === "Active"
                          ? "bg-emerald-100 text-emerald-700"
                          : "bg-red-100 text-red-700"
                      }`}
                    >
                      {device.status}
                    </span>
                  </td>
                  <td className="px-5 py-3 text-center">
                    <div className="flex items-center justify-center gap-1">
                      <button
                        type="button"
                        onClick={() =>
                          setAgentDeviceStatus(
                            agent.id,
                            device.id,
                            device.status === "Active" ? "Blocked" : "Active",
                          )
                        }
                        className="rounded-lg border border-[#e6e6e6] p-2 text-[#525252] hover:bg-[#f4f4f4]"
                        title={device.status === "Active" ? "Block device" : "Unblock device"}
                      >
                        {device.status === "Active" ? <Ban size={14} /> : <CheckCircle2 size={14} />}
                      </button>
                      <button
                        type="button"
                        onClick={() => forceLogoutAgent(agent.id)}
                        className="rounded-lg border border-[#e6e6e6] px-2.5 py-2 text-xs font-semibold text-amber-600 hover:bg-amber-50"
                      >
                        Force Logout
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </article>
    </section>
  );
}
