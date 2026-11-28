"use client";

// The "More Actions" dropdown on a router's page. Every action that changes
// something on the router asks for confirmation first (via the onConfirm
// callback passed in) — this menu never fires an action directly itself.

import { openEditRouter, openReprovisionScript } from "@/components/dashboard/shared/editEvents";
import Link from "next/link";
import { Radio, Bell, Download, Clock3, Cpu, ShieldCheck, Lock, RefreshCcw, Power, KeyRound, Pencil, Trash2, PauseCircle, PlayCircle, PlugZap, Unplug, Monitor } from "lucide-react";

import { useDashboard } from "@/components/dashboard/context/DashboardContext";
import { DropdownMenuPortal } from "@/components/dashboard/shared/DropdownMenuPortal";
import type { RouterInfo } from "@/components/dashboard/data/dashboard-data";

export function RouterMoreActionsMenu({
  router,
  anchorRect,
  onClose,
  onGoToMultiWan,
  onOpenNotifications,
}: {
  router: RouterInfo;
  anchorRect: DOMRect | null;
  onClose: () => void;
  onGoToMultiWan: () => void;
  onOpenNotifications: () => void;
}) {
  const { startRouterTask, downloadRouterFile, toggleRemoteAccess, requestConfirmAction } = useDashboard();
  const isCut = router.status === "Offline" || !!router.disconnected;

  return (
    <DropdownMenuPortal anchorRect={anchorRect} onClose={onClose} width={260}>

      <button
        type="button"
        onClick={() => { onClose(); toggleRemoteAccess(router.ip, true); }}
        className="flex w-full items-center gap-2 px-4 py-2.5 text-left text-sm font-semibold text-[#1a1a1a] hover:bg-[#f4f4f4]"
      >
        <Monitor size={14} /> {router.remoteAccessEnabled ? "Remote access is on" : "Enable remote access"}
      </button>
      <Link
        href={`/dashboards/configuration/routers/${router.ip}?tab=multiwan`}
        onClick={() => { onClose(); onGoToMultiWan(); }}
        className="flex w-full items-center gap-2 px-4 py-2.5 text-sm text-[#525252] hover:bg-[#f4f4f4]"
      >
        <Radio size={14} /> Configure Multi-WAN
      </Link>
      <button
        type="button"
        onClick={() => { onClose(); onOpenNotifications(); }}
        className="flex w-full items-center gap-2 px-4 py-2.5 text-left text-sm text-[#1a1a1a] hover:bg-[#f4f4f4]"
      >
        <Bell size={14} /> Notification Contacts
      </button>
      {/* One Reprovision: runs on the router if it is checking in, otherwise shows the paste script. */}
      <button
        type="button"
        data-testid="reprovision-more"
        onClick={() => { onClose(); openReprovisionScript(router.ip); }}
        className="flex w-full items-center gap-2 px-4 py-2.5 text-left text-sm font-semibold text-[#1a1a1a] hover:bg-[#f4f4f4]"
      >
        <RefreshCcw size={14} /> Reprovision
      </button>
      <button
        type="button"
        onClick={() => { onClose(); startRouterTask("sync-files", router.ip); }}
        className="flex w-full items-center gap-2 px-4 py-2.5 text-left text-sm text-[#525252] hover:bg-[#f4f4f4]"
      >
        <Download size={14} /> Sync hotspot files
      </button>
      <button
        type="button"
        onClick={() => { onClose(); startRouterTask("sync-time", router.ip); }}
        className="flex w-full items-center gap-2 px-4 py-2.5 text-left text-sm text-[#525252] hover:bg-[#f4f4f4]"
      >
        <Clock3 size={14} /> Sync Router Time
      </button>
      <button
        type="button"
        onClick={() => { onClose(); startRouterTask("snmp", router.ip); }}
        className="flex w-full items-center gap-2 px-4 py-2.5 text-left text-sm text-[#525252] hover:bg-[#f4f4f4]"
      >
        <Cpu size={14} /> Configure SNMP
      </button>
      <button
        type="button"
        onClick={() => { onClose(); startRouterTask("walled-garden", router.ip); }}
        className="flex w-full items-center gap-2 px-4 py-2.5 text-left text-sm text-[#525252] hover:bg-[#f4f4f4]"
      >
        <ShieldCheck size={14} /> Configure Walled Garden
      </button>
      <button
        type="button"
        onClick={() => { onClose(); startRouterTask("harden", router.ip); }}
        className="flex w-full items-center gap-2 px-4 py-2.5 text-left text-sm text-[#525252] hover:bg-[#f4f4f4]"
      >
        <Lock size={14} /> Harden Services
      </button>
      <button
        type="button"
        onClick={() => { onClose(); startRouterTask("winbox", router.ip); }}
        className="flex w-full items-center gap-2 px-4 py-2.5 text-left text-sm text-[#525252] hover:bg-[#f4f4f4]"
      >
        <RefreshCcw size={14} /> Refresh WinBox
      </button>
      <button
        type="button"
        onClick={() => { onClose(); downloadRouterFile(router.ip, "winbox-config"); }}
        className="flex w-full items-center gap-2 px-4 py-2.5 text-left text-sm text-[#525252] hover:bg-[#f4f4f4]"
      >
        <Download size={14} /> Download wb.config
      </button>
      <button
        type="button"
        onClick={() => { onClose(); downloadRouterFile(router.ip, "provision-script"); }}
        className="flex w-full items-center gap-2 px-4 py-2.5 text-left text-sm text-[#525252] hover:bg-[#f4f4f4]"
      >
        <Download size={14} /> Download Provision Script
      </button>

      <div className="my-2 border-t border-[#f4f4f4]" />

      <button
        type="button"
        onClick={() => { onClose(); startRouterTask("reboot", router.ip); }}
        className="flex w-full items-center gap-2 px-4 py-2.5 text-left text-sm text-red-600 hover:bg-red-50"
      >
        <Power size={14} /> Reboot Router
      </button>
      <button
        type="button"
        onClick={() => { onClose(); startRouterTask("api-credentials", router.ip); }}
        className="flex w-full items-center gap-2 px-4 py-2.5 text-left text-sm text-[#525252] hover:bg-[#f4f4f4]"
      >
        <KeyRound size={14} /> Regenerate API credentials
      </button>
      <button
        type="button"
        data-testid="router-edit"
        onClick={() => { onClose(); openEditRouter(router.ip); }}
        className="flex w-full items-center gap-2 px-4 py-2.5 text-left text-sm text-[#525252] hover:bg-[#f4f4f4]"
      >
        <Pencil size={14} /> Edit details
      </button>
      <button
        type="button"
        data-testid="router-delete-more"
        onClick={() => {
          onClose();
          requestConfirmAction({
            type: "remove-router",
            routerIp: router.ip,
            routerName: router.name,
          });
        }}
        className="flex w-full items-center gap-2 px-4 py-2.5 text-left text-sm font-semibold text-red-600 hover:bg-red-50"
      >
        <Trash2 size={14} /> Delete
      </button>

      <div className="my-2 border-t border-[#f4f4f4]" />

      <button
        type="button"
        onClick={() => { onClose(); startRouterTask(router.paused ? "resume" : "pause", router.ip); }}
        className="flex w-full items-center gap-2 px-4 py-2.5 text-left text-sm text-[#525252] hover:bg-[#f4f4f4]"
      >
        {router.paused ? (
          <>
            <PlayCircle size={14} className="text-[#1a1a1a]" /> Resume Connection
          </>
        ) : (
          <>
            <PauseCircle size={14} className="text-[#1a1a1a]" /> Pause Connection
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
        className={`flex w-full items-center gap-2 px-4 py-2.5 text-left text-sm hover:bg-[#f4f4f4] ${isCut ? "text-[#525252]" : "font-semibold text-red-600 hover:bg-red-50"}`}
      >
        {isCut ? (
          <>
            <PlugZap size={14} className="text-[#1a1a1a]" /> Reconnect
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
