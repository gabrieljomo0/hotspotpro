"use client";

import { createPortal } from "react-dom";
import { useEffect, useState } from "react";
import Link from "next/link";
import { X, Search, ChevronRight, Users } from "lucide-react";

import { useDashboard } from "../context/DashboardContext";
import { getUserId } from "./userLinks";
import { useUserRoutes } from "./userRoutes";

export function ActiveUsersDrawer({
  currentUserId,
  open,
  onClose,
}: {
  currentUserId: string;
  open: boolean;
  onClose: () => void;
}) {
  const { users: allUsers, getConnectionState } = useDashboard();
  const routes = useUserRoutes();
  const users = routes.scopeUsers(allUsers);
  const [query, setQuery] = useState("");
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    if (!open) {
      setQuery("");
    }
  }, [open]);

  if (!mounted) {
    return null;
  }

  const filteredUsers = users.filter((user) => {
    const label = (user.phone || user.voucherUsername).toLowerCase();
    return label.includes(query.toLowerCase());
  });

  return createPortal(
    <>
      {open && (
        <button
          type="button"
          aria-label="Close active users panel"
          onClick={onClose}
          className="fixed inset-0 z-[220] bg-slate-950/50"
        />
      )}

      <aside
        className={`fixed inset-y-0 right-0 z-[230] flex h-full w-full max-w-sm flex-col border-l border-[#e2e8f0] bg-white shadow-2xl transition-transform duration-300 ${
          open ? "translate-x-0" : "translate-x-full"
        }`}
      >
        <div className="flex items-center justify-between border-b border-[#e2e8f0] px-5 py-4">
          <div className="flex items-center gap-2">
            <Users size={18} className="text-[#2563eb]" />
            <h2 className="text-base font-bold text-[#0f172a]">
              Active Users ({users.length})
            </h2>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg p-1.5 text-[#64748b] hover:bg-[#ffffff]"
            aria-label="Close"
          >
            <X size={18} />
          </button>
        </div>

        <div className="border-b border-[#f1f5f9] px-5 py-3">
          <div className="relative">
            <Search
              size={16}
              className="absolute left-3 top-1/2 -translate-y-1/2 text-[#94a3b8]"
            />
            <input
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder="Search by phone or username..."
              className="h-10 w-full rounded-lg border border-[#e2e8f0] bg-[#ffffff] pl-9 pr-3 text-sm outline-none focus:border-[#2563eb] focus:bg-white"
            />
          </div>
        </div>

        <div className="flex-1 overflow-y-auto">
          {filteredUsers.length === 0 ? (
            <p className="px-5 py-8 text-center text-sm text-[#94a3b8]">
              No users match &quot;{query}&quot;.
            </p>
          ) : (
            <ul className="divide-y divide-[#f1f5f9]">
              {filteredUsers.map((user) => {
                const userId = getUserId(user);
                const isCurrent = userId === currentUserId;
                const state = getConnectionState(userId);
                const status = state.blocked
                  ? "Blocked"
                  : state.disconnected
                    ? "Disconnected"
                    : state.paused
                      ? "Paused"
                      : "Online";
                const dotClass =
                  status === "Online"
                    ? "bg-emerald-500"
                    : status === "Paused"
                      ? "bg-amber-500"
                      : status === "Disconnected"
                        ? "bg-slate-400"
                        : "bg-red-500";

                return (
                  <li key={userId}>
                    <Link
                      href={routes.href(userId, "details")}
                      onClick={onClose}
                      className={`flex items-center justify-between gap-3 px-5 py-3 transition ${
                        isCurrent
                          ? "bg-[#f1f5f9]"
                          : "hover:bg-[#ffffff]"
                      }`}
                    >
                      <div className="flex items-center gap-3">
                        <span className={`h-2 w-2 rounded-full ${dotClass}`} />
                        <div>
                          <p className="text-sm font-semibold text-[#0f172a]">
                            {user.phone || user.voucherUsername}
                            {isCurrent && (
                              <span className="ml-2 rounded-full bg-[#2563eb] px-2 py-0.5 text-[10px] font-bold text-white">
                                Viewing
                              </span>
                            )}
                          </p>
                          <p className="text-xs text-[#64748b]">
                            {user.package} · {status}
                          </p>
                        </div>
                      </div>
                      {!isCurrent && (
                        <ChevronRight size={16} className="text-[#94a3b8]" />
                      )}
                    </Link>
                  </li>
                );
              })}
            </ul>
          )}
        </div>
      </aside>
    </>,
    document.body,
  );
}
