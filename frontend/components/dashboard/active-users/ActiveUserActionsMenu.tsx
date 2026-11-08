"use client";

import Link from "next/link";

import { DropdownMenuPortal } from "../shared/DropdownMenuPortal";
import { useUserRoutes, type UserAction } from "./userRoutes";

export function ActiveUserActionsMenu({
  userId,
  anchorRect,
  onClose,
}: {
  userId: string;
  anchorRect: DOMRect | null;
  onClose: () => void;
}) {
  const routes = useUserRoutes();
  const can = routes.can;
  const href = (action?: UserAction) => routes.href(userId, action);
  const linkClass =
    "flex w-full px-4 py-2.5 text-sm text-[#525252] hover:bg-[#f4f4f4]";

  const allItems: Array<{ action: UserAction; label: string; className?: string; group: number }> = [
    { action: "details", label: "Session Details", group: 0 },
    { action: "extend-access", label: "Extend Access Time", group: 0 },
    { action: "topup-data", label: "Top Up Data", group: 0 },
    { action: "change-package", label: "Change Package", group: 0 },
    { action: "reset-password", label: "Reset Voucher Password", group: 0 },
    { action: "copy-login", label: "Copy Login Details", group: 0 },
    { action: "pause", label: "Pause / Resume Connection", className: "text-amber-600 hover:bg-amber-50", group: 1 },
    { action: "disconnect", label: "Disconnect / Reconnect", className: "text-red-600 hover:bg-red-50", group: 1 },
    { action: "block", label: "Block / Unblock User", className: "text-red-600 hover:bg-red-50", group: 1 },
    { action: "delete", label: "Delete User", className: "font-semibold text-red-600 hover:bg-red-50", group: 2 },
  ];
  const items = allItems.filter((item) => can(item.action));

  return (
    <DropdownMenuPortal anchorRect={anchorRect} onClose={onClose} width={224}>
      {items.map((item, index) => (
        <div key={item.action}>
          {index > 0 && items[index - 1].group !== item.group && <div className="my-2 border-t border-[#f4f4f4]" />}
          <Link
            href={href(item.action)}
            className={item.className ? `flex w-full px-4 py-2.5 text-sm ${item.className}` : linkClass}
            onClick={onClose}
          >
            {item.label}
          </Link>
        </div>
      ))}
    </DropdownMenuPortal>
  );
}
