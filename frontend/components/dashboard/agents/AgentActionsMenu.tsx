"use client";

import Link from "next/link";
import { ExternalLink, Lock } from "lucide-react";

import { copyAgentLoginLink } from "./agentLink";
import { useDashboard } from "../context/DashboardContext";
import { DropdownMenuPortal } from "../shared/DropdownMenuPortal";
import type { AgentProfile } from "../shared/types";
import { askConfirm } from "@/components/dashboard/shared/askConfirm";

export function AgentActionsMenu({
  agent,
  anchorRect,
  onClose,
  onEdit,
}: {
  agent: AgentProfile;
  anchorRect: DOMRect | null;
  onClose: () => void;
  // Opens the Edit window for this agent.
  onEdit: () => void;
}) {
  const {
    setAgentStatus,
    isAgentDashboardLockedForAdmin,
    resetAgentPassword,
    resetAgentPin,
    forceLogoutAgent,
    deleteAgent,
    showToast,
  } = useDashboard();

  const linkClass = "flex w-full items-center px-4 py-2.5 text-sm text-[#475569] hover:bg-[#f1f5f9]";
  const buttonClass = "flex w-full px-4 py-2.5 text-left text-sm text-[#475569] hover:bg-[#f1f5f9]";
  const dashboardLocked = isAgentDashboardLockedForAdmin(agent);

  return (
    <DropdownMenuPortal anchorRect={anchorRect} onClose={onClose} width={250}>
      <Link href={`/dashboards/agents/${agent.id}`} className={linkClass} onClick={onClose}>
        View
      </Link>
      <button
        type="button"
        className={buttonClass}
        onClick={() => {
          onClose();
          onEdit();
        }}
      >
        Edit
      </button>
      {dashboardLocked ? (
        <p className="flex items-center gap-2 px-4 py-2.5 text-sm text-[#94a3b8]">
          <Lock size={14} /> Dashboard locked (permanent access)
        </p>
      ) : (
        <Link
          href={`/agent-portal/${agent.id}`}
          target="_blank"
          rel="noopener noreferrer"
          className={linkClass}
          onClick={onClose}
        >
          Open Agent Dashboard
          <ExternalLink size={13} className="ml-auto opacity-60" />
        </Link>
      )}

      <button
        type="button"
        className={buttonClass}
        data-testid="copy-agent-link"
        onClick={async () => {
          onClose();
          showToast(await copyAgentLoginLink(agent.id, agent.name));
        }}
      >
        Copy login link
      </button>

      <div className="my-2 border-t border-[#f1f5f9]" />

      <button
        type="button"
        className={buttonClass}
        onClick={() => {
          onClose();
          askConfirm(`Reset ${agent.name}'s password? They'll need to set a new one on next login.`).then((ok) => {
            if (ok) resetAgentPassword(agent.id);
          })
        }}
      >
        Reset Password
      </button>
      <button
        type="button"
        className={buttonClass}
        onClick={() => {
          onClose();
          askConfirm(`Reset ${agent.name}'s PIN? A new PIN will be securely issued to them.`).then((ok) => {
            if (ok) resetAgentPin(agent.id);
          })
        }}
      >
        Assign / Reset PIN
      </button>
      <button
        type="button"
        className="flex w-full px-4 py-2.5 text-left text-sm text-amber-600 hover:bg-amber-50"
        onClick={() => {
          onClose();
          askConfirm(`Force logout ${agent.name} from every device? They'll need to sign in again everywhere.`).then((ok) => {
            if (ok) forceLogoutAgent(agent.id);
          })
        }}
      >
        Force Logout (All Devices)
      </button>

      <div className="my-2 border-t border-[#f1f5f9]" />

      {agent.status !== "Active" && (
        <button
          type="button"
          className="flex w-full px-4 py-2.5 text-left text-sm text-emerald-700 hover:bg-emerald-50"
          onClick={() => {
            onClose();
            askConfirm(`Activate ${agent.name}? They'll regain full access and be notified immediately.`).then((ok) => {
              if (ok) setAgentStatus(agent.id, "Active");
            })
          }}
        >
          Activate
        </button>
      )}
      {agent.status === "Active" && !agent.isDefault && (
        <button
          type="button"
          className="flex w-full px-4 py-2.5 text-left text-sm text-amber-700 hover:bg-amber-50"
          onClick={() => {
            onClose();
            askConfirm(`Suspend ${agent.name}? They will lose access immediately and be notified.`).then((ok) => {
              if (ok) setAgentStatus(agent.id, "Suspended");
            })
          }}
        >
          Suspend
        </button>
      )}
      {!agent.isDefault && agent.status !== "Deactivated" && (
        <button
          type="button"
          className="flex w-full px-4 py-2.5 text-left text-sm text-red-600 hover:bg-red-50"
          onClick={() => {
            onClose();
            askConfirm(`Deactivate ${agent.name}? This revokes their access until reactivated.`).then((ok) => {
              if (ok) setAgentStatus(agent.id, "Deactivated");
            })
          }}
        >
          Deactivate
        </button>
      )}

      {!agent.isDefault && (
        <>
          <div className="my-2 border-t border-[#f1f5f9]" />
          <button
            type="button"
            className="flex w-full px-4 py-2.5 text-left text-sm font-semibold text-red-600 hover:bg-red-50"
            onClick={() => {
              onClose();
              askConfirm(`Permanently delete ${agent.name}? This cannot be undone.`).then((ok) => {
                if (ok) deleteAgent(agent.id);
              })
            }}
          >
            Delete Agent
          </button>
        </>
      )}
    </DropdownMenuPortal>
  );
}
