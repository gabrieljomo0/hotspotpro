"use client";

import Link from "next/link";
import { Eye, Power, Monitor, RefreshCcw, Pencil, Trash2, Bell, KeyRound, FolderSync, Clock3, FileCode2, PauseCircle, PlayCircle, PlugZap, Unplug } from "lucide-react";

import { openEditRouter } from "../shared/editEvents";
import { DropdownMenuPortal } from "../shared/DropdownMenuPortal";
import { useDashboard } from "../context/DashboardContext";
import type { RouterInfo } from "../data/dashboard-data";

/**
 * Single source of truth for the router row-actions menu.
 * Used by both the Routers list page and the Network Status card so the
 * two surfaces never drift apart again.
 */
export function RouterActionsMenu({
  router,
  anchorRect,
  onClose,
}: {
  router: RouterInfo;
  anchorRect: DOMRect | null;
  onClose: () => void;
}) {
  const {
    startRouterTask,
    requestConfirmAction,
    toggleRemoteAccess,
  } = useDashboard();

  const isCut = router.status === "Offline" || !!router.disconnected;
  const detailHref = `/dashboards/configuration/routers/${encodeURIComponent(router.ip)}`;
  const itemClass =
    "flex w-full items-center gap-2.5 px-4 py-2.5 text-left text-sm text-[#525252] hover:bg-[#f4f4f4]";
  const linkClass =
    "flex w-full items-center gap-2.5 px-4 py-2.5 text-sm text-[#525252] hover:bg-[#f4f4f4]";

  function run(action: () => void) {
    action();
    onClose();
  }

  function handleRemoteWinbox() {
    toggleRemoteAccess(router.ip, true);
    onClose();
  }

  function handleEditIdentity() {
    onClose();
    openEditRouter(router.ip, "identity");
  }

  return (
    <DropdownMenuPortal anchorRect={anchorRect} onClose={onClose} width={220}>
      <Link href={detailHref} className={linkClass} onClick={onClose}>
        <Eye size={14} className="text-[#1a1a1a]" /> View
      </Link>


      <button
        type="button"
        className={itemClass}
        onClick={() => run(() => startRouterTask("reboot", router.ip))}
      >
        <Power size={14} className="text-[#1a1a1a]" /> Reboot
      </button>

      <button type="button" className={itemClass} onClick={handleRemoteWinbox}>
        <Monitor size={14} className="text-[#1a1a1a]" /> {router.remoteAccessEnabled ? "Remote WinBox is on" : "Enable remote access"}
      </button>

      <button
        type="button"
        className={itemClass}
        onClick={() => run(() => startRouterTask("full-provision", router.ip))}
      >
        <RefreshCcw size={14} className="text-[#1a1a1a]" /> Reprovision router
      </button>

      <button type="button" data-testid="router-edit-identity" className={itemClass} onClick={handleEditIdentity}>
        <Pencil size={14} className="text-[#1a1a1a]" /> Edit Identity
      </button>

      <div className="my-2 border-t border-[#f4f4f4]" />

      <Link href={`${detailHref}?action=notifications`} className={linkClass} onClick={onClose}>
        <Bell size={14} className="text-[#1a1a1a]" /> Notification Contacts
      </Link>

      <button
        type="button"
        className={itemClass}
        onClick={() => run(() => startRouterTask("winbox", router.ip))}
      >
        <KeyRound size={14} className="text-[#1a1a1a]" /> Regenerate winbox
      </button>

      <button
        type="button"
        className={itemClass}
        onClick={() => run(() => startRouterTask("sync-files", router.ip))}
      >
        <FolderSync size={14} className="text-[#1a1a1a]" /> Sync hotspot files
      </button>

      <button
        type="button"
        className={itemClass}
        onClick={() => run(() => startRouterTask("sync-time", router.ip))}
      >
        <Clock3 size={14} className="text-[#1a1a1a]" /> Sync Router Time
      </button>

      <button
        type="button"
        className={itemClass}
        onClick={() => run(() => startRouterTask("update-script", router.ip))}
      >
        <FileCode2 size={14} className="text-[#1a1a1a]" /> Update Script
      </button>

      <div className="my-2 border-t border-[#f4f4f4]" />

      <button
        type="button"
        className="flex w-full items-center gap-2.5 px-4 py-2.5 text-left text-sm font-semibold text-red-600 hover:bg-red-50"
        onClick={() => {
          requestConfirmAction({
            type: "remove-router",
            routerIp: router.ip,
            routerName: router.name,
          });
          onClose();
        }}
      >
        <Trash2 size={14} /> Delete
      </button>

      <div className="my-2 border-t border-[#f4f4f4]" />

      <button
        type="button"
        className={itemClass}
        onClick={() => run(() => startRouterTask(router.paused ? "resume" : "pause", router.ip))}
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
        className={isCut ? itemClass : "flex w-full items-center gap-2.5 px-4 py-2.5 text-left text-sm font-semibold text-red-600 hover:bg-red-50"}
        onClick={() => run(() => startRouterTask(isCut ? "reconnect" : "disconnect", router.ip))}
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
