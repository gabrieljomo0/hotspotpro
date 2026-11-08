"use client";

// While an agent's dashboard is on screen, everything in this tab acts as
// that agent — vouchers and packages are "created by" them, the wallet is
// theirs, permissions are theirs. When the tab leaves the agent portal the
// previous identity (normally the admin) is put back.
//
// The restore is deferred by one tick so that moving between two agent
// pages (one unmounts, the next mounts straight away) doesn't restore and
// re-apply, and doesn't lose track of who was acting originally.

import { useEffect } from "react";

import { useDashboard } from "@/components/dashboard/context/DashboardContext";

let portalDepth = 0;
let originalActingId: string | null = null;
let restoreTimer: ReturnType<typeof setTimeout> | null = null;

export function useActAsAgent(agentId: string | null) {
  const { currentAgentId, actAsAgent } = useDashboard();

  useEffect(() => {
    if (!agentId) return;

    if (restoreTimer) {
      clearTimeout(restoreTimer);
      restoreTimer = null;
    }
    if (portalDepth === 0 && originalActingId === null) {
      originalActingId = currentAgentId;
    }
    portalDepth += 1;
    actAsAgent(agentId);

    return () => {
      portalDepth -= 1;
      if (portalDepth === 0) {
        restoreTimer = setTimeout(() => {
          if (originalActingId !== null) actAsAgent(originalActingId);
          originalActingId = null;
          restoreTimer = null;
        }, 0);
      }
    };
    // Only re-run when the agent being shown changes — not every time the
    // acting identity we just set flows back through currentAgentId.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [agentId]);
}
