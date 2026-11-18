"use client";

import { useEffect } from "react";

/** Registers the service worker so Chrome / Edge / Android can install HotspotPro. */
export function PwaRegister() {
  useEffect(() => {
    if (typeof window === "undefined" || !("serviceWorker" in navigator)) return;
    const ready = () => {
      navigator.serviceWorker.register("/sw.js").catch(() => {
        /* install still works once SW is reachable; ignore transient failures */
      });
    };
    if (document.readyState === "complete") ready();
    else window.addEventListener("load", ready, { once: true });
  }, []);

  return null;
}
