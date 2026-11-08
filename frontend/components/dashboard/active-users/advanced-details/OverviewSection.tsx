"use client";

import { Smartphone, Wifi, Router as RouterIcon, Clock3, Printer } from "lucide-react";
import type { MouseEvent } from "react";

import { ActiveUserActionsMenu } from "../ActiveUserActionsMenu";

export function OverviewSection({
  deviceType,
  macAddress,
  routerName,
  currentStatus,
  userId,
  openUserAction,
  menuRect,
  onOpenActions,
  onCloseActions,
  onPrint,
}: {
  deviceType: string;
  macAddress: string;
  routerName: string;
  currentStatus: string;
  userId: string;
  openUserAction: string | null;
  menuRect: DOMRect | null;
  onOpenActions: (event: React.MouseEvent<HTMLElement>) => void;
  onCloseActions: () => void;
  onPrint: () => void;
}) {
  return (
    <div id="overview" className="mb-6 flex items-start justify-between gap-3 scroll-mt-20">
      <div className="grid flex-1 grid-cols-2 gap-3 sm:grid-cols-4">
        <div className="rounded-xl border border-blue-200 bg-white p-4">
          <Smartphone size={18} className="text-[#1a1a1a]" />
          <p className="mt-2 text-xs text-[#737373]">Device</p>
          <p className="text-sm font-bold text-[#1a1a1a]">{deviceType}</p>
        </div>
        <div className="rounded-xl border border-blue-200 bg-blue-50 p-4">
          <Wifi size={18} className="text-[#1a1a1a]" />
          <p className="mt-2 text-xs text-[#737373]">MAC Address</p>
          <p className="text-sm font-bold text-[#1a1a1a]">{macAddress}</p>
        </div>
        <div className="rounded-xl border border-blue-200 bg-white p-4">
          <RouterIcon size={18} className="text-blue-600" />
          <p className="mt-2 text-xs text-[#737373]">Connected Router</p>
          <p className="text-sm font-bold text-[#1a1a1a]">{routerName}</p>
        </div>
        <div className="rounded-xl border border-emerald-200 bg-white p-4">
          <Clock3 size={18} className="text-emerald-600" />
          <p className="mt-2 text-xs text-[#737373]">Current Status</p>
          <p className="text-sm font-bold text-[#1a1a1a]">{currentStatus}</p>
        </div>
      </div>

      <div className="flex shrink-0 items-start gap-2 print:hidden">
        <button
          type="button"
          onClick={onPrint}
          className="rounded-xl border border-[#e6e6e6] bg-white px-4 py-3 text-sm font-semibold text-[#525252] hover:bg-[#f4f4f4]"
          aria-label="Print this report"
          title="Print this report"
        >
          <Printer size={16} />
        </button>

        <div className="relative">
          <button
            type="button"
            onClick={onOpenActions}
            className="rounded-xl border border-[#e6e6e6] bg-white px-4 py-3 text-sm font-semibold text-[#525252] hover:bg-[#f4f4f4]"
          >
            Actions
          </button>

          {openUserAction === userId && (
            <ActiveUserActionsMenu
              userId={userId}
              anchorRect={menuRect}
              onClose={onCloseActions}
            />
          )}
        </div>
      </div>
    </div>
  );
}
