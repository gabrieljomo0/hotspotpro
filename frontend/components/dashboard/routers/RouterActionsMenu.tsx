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
    showToast,
  } = useDashboard();

  const isCut = router.status === "Offline" || !!router.disconnected;
  const detailHref = `/dashboards/configuration/routers/${encodeURIComponent(router.ip)}`;
  const itemClass =
    "flex w-full items-center gap-2.5 px-4 py-2.5 text-left text-sm text-[#475569] hover:bg-[#f1f5f9]";
  const linkClass =
    "flex w-full items-center gap-2.5 px-4 py-2.5 text-sm text-[#475569] hover:bg-[#f1f5f9]";

  function run(action: () => void) {
    action();
    onClose();
  }

  function handleRemoteWinbox() {
    if (!router.remoteAccessEnabled || !router.winboxAddress) {
      showToast("Enable remote access and provision the router first.");
      onClose();
      return;
    }
    window.open(`https://${router.winboxAddress}`, "_blank", "noopener,noreferrer");
    onClose();
  }

  function handleEditIdentity() {
    onClose();
    openEditRouter(router.ip, "identity");
  }

  return (
    <DropdownMenuPortal anchorRect={anchorRect} onClose={onClose} width={220}>
      <Link href={detailHref} className={linkClass} onClick={onClose}>
        <Eye size={14} className="text-[#2563eb]" /> View
      </Link>


      <button
        type="button"
        className={itemClass}
        onClick={() => run(() => startRouterTask("reboot", router.ip))}
      >
        <Power size={14} className="text-[#2563eb]" /> Reboot
      </button>

      <button type="button" className={itemClass} onClick={handleRemoteWinbox}>
        <Monitor size={14} className="text-[#2563eb]" /> Remote Winbox
      </button>

      <button
        type="button"
        className={itemClass}
        onClick={() => run(() => startRouterTask("full-provision", router.ip))}
      >
        <RefreshCcw size={14} className="text-[#2563eb]" /> Reprovision router
      </button>

      <button type="button" data-testid="router-edit-identity" className={itemClass} onClick={handleEditIdentity}>
        <Pencil size={14} className="text-[#2563eb]" /> Edit Identity
      </button>

      <div className="my-2 border-t border-[#f1f5f9]" />

      <Link href={`${detailHref}?action=notifications`} className={linkClass} onClick={onClose}>
        <Bell size={14} className="text-[#2563eb]" /> Notification Contacts
      </Link>

      <button
        type="button"
        className={itemClass}
        onClick={() => run(() => startRouterTask("winbox", router.ip))}
      >
        <KeyRound size={14} className="text-[#2563eb]" /> Regenerate winbox
      </button>

      <button
        type="button"
        className={itemClass}
        onClick={() => run(() => startRouterTask("sync-files", router.ip))}
      >
        <FolderSync size={14} className="text-[#2563eb]" /> Sync hotspot files
      </button>

      <button
        type="button"
        className={itemClass}
        onClick={() => run(() => startRouterTask("sync-time", router.ip))}
      >
        <Clock3 size={14} className="text-[#2563eb]" /> Sync Router Time
      </button>

      <button
        type="button"
        className={itemClass}
        onClick={() => run(() => startRouterTask("update-script", router.ip))}
      >
        <FileCode2 size={14} className="text-[#2563eb]" /> Update Script
      </button>

      <div className="my-2 border-t border-[#f1f5f9]" />

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

      <div className="my-2 border-t border-[#f1f5f9]" />

      <button
        type="button"
        className={itemClass}
        onClick={() => run(() => startRouterTask(router.paused ? "resume" : "pause", router.ip))}
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
        className={isCut ? itemClass : "flex w-full items-center gap-2.5 px-4 py-2.5 text-left text-sm font-semibold text-red-600 hover:bg-red-50"}
        onClick={() => run(() => startRouterTask(isCut ? "reconnect" : "disconnect", router.ip))}
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
