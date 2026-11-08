"use client";

// Mounted once in the dashboard shell: opens the Edit router pop-up when any
// menu asks for it (see openEditRouter).

import { useEffect, useState } from "react";

import { useDashboard } from "@/components/dashboard/context/DashboardContext";
import { EDIT_ROUTER_EVENT, type EditRouterMode } from "@/components/dashboard/shared/editEvents";
import { EditRouterModal } from "./EditRouterModal";
import { EditRouterNameModal } from "./EditRouterNameModal";

export function RouterEditHost() {
  const { routers } = useDashboard();
  const [open, setOpen] = useState<{ ip: string; mode: EditRouterMode } | null>(null);

  useEffect(() => {
    function onOpen(event: Event) {
      setOpen((event as CustomEvent<{ ip: string; mode: EditRouterMode }>).detail);
    }
    window.addEventListener(EDIT_ROUTER_EVENT, onOpen);
    return () => window.removeEventListener(EDIT_ROUTER_EVENT, onOpen);
  }, []);

  const router = open ? routers.find((r) => r.ip === open.ip) : undefined;
  if (!open || !router) return null;
  const close = () => setOpen(null);
  return open.mode === "identity" ? (
    <EditRouterNameModal key={router.ip} router={router} onClose={close} />
  ) : (
    <EditRouterModal key={router.ip} router={router} onClose={close} />
  );
}
