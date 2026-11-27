"use client";

// Mounted once in the dashboard shell: paste mode opens the WinBox script modal;
// auto mode queues Full Provision on the router (progress + auto-close on success).

import { useEffect, useState } from "react";

import { useDashboard } from "@/components/dashboard/context/DashboardContext";
import { REPROVISION_SCRIPT_EVENT, type ReprovisionOpenMode } from "@/components/dashboard/shared/editEvents";
import { ReprovisionScriptModal } from "./ReprovisionScriptModal";

export function ReprovisionScriptHost() {
  const { routers, startRouterTask, showToast } = useDashboard();
  const [ip, setIp] = useState<string | null>(null);
  const [mode, setMode] = useState<ReprovisionOpenMode>("paste");

  useEffect(() => {
    function onOpen(event: Event) {
      const detail = (event as CustomEvent<{ ip: string; mode?: ReprovisionOpenMode }>).detail;
      const nextMode = detail.mode === "paste" ? "paste" : "auto";
      if (nextMode === "auto") {
        // No "Running… Done" page — run the task; RouterTaskHost shows progress and closes on success.
        startRouterTask("full-provision", detail.ip);
        showToast("Reprovision started. The router will update on the next check-in.");
        setIp(null);
        return;
      }
      setIp(detail.ip);
      setMode("paste");
    }
    window.addEventListener(REPROVISION_SCRIPT_EVENT, onOpen);
    return () => window.removeEventListener(REPROVISION_SCRIPT_EVENT, onOpen);
  }, [startRouterTask, showToast]);

  const router = ip ? routers.find((r) => r.ip === ip) : undefined;
  if (!ip || !router || mode !== "paste") return null;
  return (
    <ReprovisionScriptModal
      key={`${router.ip}-paste`}
      router={router}
      mode="paste"
      onClose={() => setIp(null)}
    />
  );
}
