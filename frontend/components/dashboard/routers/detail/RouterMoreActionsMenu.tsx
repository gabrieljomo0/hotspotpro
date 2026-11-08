"use client";

// The "More Actions" dropdown on a router's page. Every action that changes
// something on the router asks for confirmation first (via the onConfirm
// callback passed in) — this menu never fires an action directly itself.

import { openEditRouter } from "@/components/dashboard/shared/editEvents";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Radio, Bell, Download, Clock3, Cpu, ShieldCheck, Lock, RefreshCcw, Power, KeyRound, Pencil, Trash2, PauseCircle, PlayCircle, PlugZap, Unplug } from "lucide-react";

import { useDashboard } from "@/components/dashboard/context/DashboardContext";
import { DropdownMenuPortal } from "@/components/dashboard/shared/DropdownMenuPortal";
import type { RouterInfo } from "@/components/dashboard/data/dashboard-data";

export function RouterMoreActionsMenu({
  router,
  anchorRect,
  onClose,
  onGoToMultiWan,
  onOpenNotifications,
  onConfirm,
}: {
  router: RouterInfo;
  anchorRect: DOMRect | null;
  onClose: () => void;
  onGoToMultiWan: () => void;
  onOpenNotifications: () => void;
  // Shows a confirmation popup; only runs `action` if the person confirms.
  onConfirm: (title: string, message: string, action: () => void) => void;
}) {
  const { startRouterTask, downloadRouterFile, deleteRouter } = useDashboard();
  const navigate = useRouter();
  const isCut = router.status === "Offline" || !!router.disconnected;

  return (
    <DropdownMenuPortal anchorRect={anchorRect} onClose={onClose} width={260}>

      <Link
        href={`/dashboards/configuration/routers/${router.ip}?tab=multiwan`}
        onClick={() => { onClose(); onGoToMultiWan(); }}
        className="flex w-full items-center gap-2 px-4 py-2.5 text-sm text-[#475569] hover:bg-[#f1f5f9]"
      >
        <Radio size={14} /> Configure Multi-WAN
      </Link>
      <button
        type="button"
        onClick={() => { onClose(); onOpenNotifications(); }}
        className="flex w-full items-center gap-2 px-4 py-2.5 text-left text-sm text-[#2563eb] hover:bg-[#f1f5f9]"
      >
        <Bell size={14} /> Notification Contacts
      </button>
      <button
        type="button"
        onClick={() => { onClose(); startRouterTask("sync-files", router.ip); }}
        className="flex w-full items-center gap-2 px-4 py-2.5 text-left text-sm text-[#475569] hover:bg-[#f1f5f9]"
      >
        <Download size={14} /> Sync hotspot files
      </button>
      <button
        type="button"
        onClick={() => { onClose(); startRouterTask("sync-time", router.ip); }}
        className="flex w-full items-center gap-2 px-4 py-2.5 text-left text-sm text-[#475569] hover:bg-[#f1f5f9]"
      >
        <Clock3 size={14} /> Sync Router Time
      </button>
      <button
        type="button"
        onClick={() => { onClose(); startRouterTask("snmp", router.ip); }}
        className="flex w-full items-center gap-2 px-4 py-2.5 text-left text-sm text-[#475569] hover:bg-[#f1f5f9]"
      >
        <Cpu size={14} /> Configure SNMP
      </button>
      <button
        type="button"
        onClick={() => { onClose(); startRouterTask("walled-garden", router.ip); }}
        className="flex w-full items-center gap-2 px-4 py-2.5 text-left text-sm text-[#475569] hover:bg-[#f1f5f9]"
      >
        <ShieldCheck size={14} /> Configure Walled Garden
      </button>
      <button
        type="button"
        onClick={() => { onClose(); startRouterTask("harden", router.ip); }}
        className="flex w-full items-center gap-2 px-4 py-2.5 text-left text-sm text-[#475569] hover:bg-[#f1f5f9]"
      >
        <Lock size={14} /> Harden Services
      </button>
      <button
        type="button"
        onClick={() => { onClose(); startRouterTask("winbox", router.ip); }}
        className="flex w-full items-center gap-2 px-4 py-2.5 text-left text-sm text-[#475569] hover:bg-[#f1f5f9]"
      >
        <RefreshCcw size={14} /> Regenerate winbox
      </button>
      <button
        type="button"
        onClick={() => { onClose(); downloadRouterFile(router.ip, "wireguard-config"); }}
        className="flex w-full items-center gap-2 px-4 py-2.5 text-left text-sm text-[#475569] hover:bg-[#f1f5f9]"
      >
        <Download size={14} /> Download WireGuard Config
      </button>
      <button
        type="button"
        onClick={() => { onClose(); downloadRouterFile(router.ip, "provision-script"); }}
        className="flex w-full items-center gap-2 px-4 py-2.5 text-left text-sm text-[#475569] hover:bg-[#f1f5f9]"
      >
        <Download size={14} /> Download Provision Script
      </button>

      <div className="my-2 border-t border-[#f1f5f9]" />

      <button
        type="button"
        onClick={() => { onClose(); startRouterTask("reboot", router.ip); }}
        className="flex w-full items-center gap-2 px-4 py-2.5 text-left text-sm text-red-600 hover:bg-red-50"
      >
        <Power size={14} /> Reboot Router
      </button>
      <button
        type="button"
        onClick={() => { onClose(); startRouterTask("update-script", router.ip); }}
        className="flex w-full items-center gap-2 px-4 py-2.5 text-left text-sm text-[#475569] hover:bg-[#f1f5f9]"
      >
        <KeyRound size={14} /> Update Script
      </button>
      <button
        type="button"
        onClick={() => { onClose(); startRouterTask("api-credentials", router.ip); }}
        className="flex w-full items-center gap-2 px-4 py-2.5 text-left text-sm text-[#475569] hover:bg-[#f1f5f9]"
      >
        <KeyRound size={14} /> Regenerate API credentials
      </button>
      <button
        type="button"
        data-testid="router-edit"
        onClick={() => { onClose(); openEditRouter(router.ip); }}
        className="flex w-full items-center gap-2 px-4 py-2.5 text-left text-sm text-[#475569] hover:bg-[#f1f5f9]"
      >
        <Pencil size={14} /> Edit details
      </button>
      <button
        type="button"
        onClick={() => { onClose(); onConfirm("Delete Router", `Permanently delete ${router.name}? This cannot be undone.`, () => {
          deleteRouter(router.ip);
          navigate.push("/dashboards/configuration/routers");
        }); }}
        className="flex w-full items-center gap-2 px-4 py-2.5 text-left text-sm font-semibold text-red-600 hover:bg-red-50"
      >
        <Trash2 size={14} /> Delete
      </button>

      <div className="my-2 border-t border-[#f1f5f9]" />

      <button
        type="button"
        onClick={() => { onClose(); startRouterTask(router.paused ? "resume" : "pause", router.ip); }}
        className="flex w-full items-center gap-2 px-4 py-2.5 text-left text-sm text-[#475569] hover:bg-[#f1f5f9]"
      >
        {router.paused ? (
          <>
            <PlayCircle size={14} className="text-[#2563eb]" /> Resume Connection
          </>
        ) : (
          <>
            <PauseCircle size={14} className="text-[#2563eb]" /> Pause Connection
          </>
        )}
      </button>
      {/* Disconnect cuts the internet of the whole router; Reconnect restores it. */}
      <button
        type="button"
        data-testid="router-disconnect-toggle"
        onClick={() => {
          onClose();
          startRouterTask(isCut ? "reconnect" : "disconnect", router.ip);
        }}
        className={`flex w-full items-center gap-2 px-4 py-2.5 text-left text-sm hover:bg-[#f1f5f9] ${isCut ? "text-[#475569]" : "font-semibold text-red-600 hover:bg-red-50"}`}
      >
        {isCut ? (
          <>
            <PlugZap size={14} className="text-[#2563eb]" /> Reconnect
          </>
        ) : (
          <>
            <Unplug size={14} /> Disconnect
          </>
        )}
      </button>
    </DropdownMenuPortal>
  );
}
