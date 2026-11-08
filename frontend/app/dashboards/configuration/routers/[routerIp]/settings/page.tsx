"use client";

// Old address for editing a router. It now opens the same pop-up over the
// router's own page, so links and bookmarks keep working.

import { use, useEffect } from "react";
import { useRouter } from "next/navigation";

import { openEditRouter } from "@/components/dashboard/shared/editEvents";

export default function EditRouterRedirect({ params }: { params: Promise<{ routerIp: string }> }) {
  const { routerIp } = use(params);
  const navigate = useRouter();
  useEffect(() => {
    navigate.replace(`/dashboards/configuration/routers/${routerIp}`);
    const timer = window.setTimeout(() => openEditRouter(decodeURIComponent(routerIp)), 150);
    return () => window.clearTimeout(timer);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [routerIp]);
  return null;
}
