"use client";

import { KeyRound, ShieldAlert } from "lucide-react";

import { useDashboard } from "@/components/dashboard/context/DashboardContext";
import { BackLink } from "@/components/dashboard/shared/BackLink";

export default function PinSecurityPage() {
  const { agents, resetAgentPassword, resetAgentPin, forceLogoutAgent } =
    useDashboard();

  return (
    <section className="w-full">
      <BackLink />
      <h2 className="mb-1 text-3xl font-bold tracking-tight md:text-4xl">
        PIN &amp; Security
      </h2>
      <p className="mb-6 max-w-2xl text-sm text-[#737373] md:text-base">
        PINs and passwords are hashed and never shown in plaintext after
        assignment. Resets here securely issue new credentials without
        revealing the old ones.
      </p>


      <div className="mb-6 flex items-start gap-3 rounded-2xl border border-blue-200 bg-white p-4">
        <ShieldAlert size={18} className="mt-0.5 shrink-0 text-blue-600" />
        <p className="text-sm text-blue-900">
          Failed login attempts are rate-limited automatically. Every reset,
          lockout, and force-logout below is written to the Activity &amp;
          Audit log with who initiated it and when.
        </p>
      </div>

      <article className="overflow-hidden rounded-2xl border border-[#e6e6e6] bg-white shadow-[0_8px_24px_rgba(26,26,26,0.06)]">
        <table className="w-full text-left text-sm">
          <thead className="bg-[#ffffff] text-xs text-[#737373]">
            <tr>
              <th className="px-5 py-3 font-semibold">Agent</th>
              <th className="px-5 py-3 font-semibold">Username</th>
              <th className="px-5 py-3 font-semibold">Last Login</th>
              <th className="px-5 py-3 text-center font-semibold">Actions</th>
            </tr>
          </thead>
          <tbody>
            {agents.map((agent) => (
              <tr key={agent.id} className="border-t border-[#f4f4f4]">
                <td className="px-5 py-3 font-semibold text-[#1a1a1a]">{agent.name}</td>
                <td className="px-5 py-3 font-mono text-[#525252]">{agent.username}</td>
                <td className="px-5 py-3 text-[#737373]">{agent.lastLogin}</td>
                <td className="px-5 py-3">
                  <div className="flex items-center justify-center gap-2">
                    <button
                      type="button"
                      onClick={() => resetAgentPassword(agent.id)}
                      className="inline-flex items-center gap-1.5 rounded-lg border border-[#e6e6e6] bg-white px-3 py-2 text-xs font-semibold text-[#525252] hover:bg-[#ffffff]"
                    >
                      <KeyRound size={13} />
                      Reset Password
                    </button>
                    <button
                      type="button"
                      onClick={() => resetAgentPin(agent.id)}
                      className="rounded-lg border border-[#e6e6e6] bg-white px-3 py-2 text-xs font-semibold text-[#525252] hover:bg-[#ffffff]"
                    >
                      Reset PIN
                    </button>
                    <button
                      type="button"
                      onClick={() => forceLogoutAgent(agent.id)}
                      className="rounded-lg border border-amber-200 bg-white px-3 py-2 text-xs font-semibold text-amber-600 hover:bg-amber-50"
                    >
                      Force Logout
                    </button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </article>
    </section>
  );
}
