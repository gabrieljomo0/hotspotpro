"use client";

// Mounted once in the dashboard shell: opens the Reprovision paste modal when
// any menu asks for it (see openReprovisionScript).

import { useEffect, useState } from "react";

import { useDashboard } from "@/components/dashboard/context/DashboardContext";
import { REPROVISION_SCRIPT_EVENT } from "@/components/dashboard/shared/editEvents";
import { ReprovisionScriptModal } from "./ReprovisionScriptModal";

export function ReprovisionScriptHost() {
  const { routers } = useDashboard();
  const [ip, setIp] = useState<string | null>(null);

  useEffect(() => {
    function onOpen(event: Event) {
      setIp((event as CustomEvent<{ ip: string }>).detail.ip);
    }
    window.addEventListener(REPROVISION_SCRIPT_EVENT, onOpen);
    return () => window.removeEventListener(REPROVISION_SCRIPT_EVENT, onOpen);
  }, []);

  const router = ip ? routers.find((r) => r.ip === ip) : undefined;
  if (!ip || !router) return null;
  return <ReprovisionScriptModal key={router.ip} router={router} onClose={() => setIp(null)} />;
}
