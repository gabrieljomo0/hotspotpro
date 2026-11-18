"use client";

import { Download, Share } from "lucide-react";
import { useEffect, useState } from "react";

type BeforeInstallPromptEvent = Event & {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed" }>;
};

function isStandalone() {
  if (typeof window === "undefined") return false;
  return (
    window.matchMedia("(display-mode: standalone)").matches ||
    ("standalone" in navigator && (navigator as Navigator & { standalone?: boolean }).standalone === true)
  );
}

function isIosSafari() {
  if (typeof navigator === "undefined") return false;
  const ua = navigator.userAgent;
  const ios = /iPad|iPhone|iPod/.test(ua) || (navigator.platform === "MacIntel" && navigator.maxTouchPoints > 1);
  const webkit = /WebKit/.test(ua);
  const notChrome = !/CriOS|FxiOS|EdgiOS/.test(ua);
  return ios && webkit && notChrome;
}

/** Chrome / Edge install control — also shows iPhone “Add to Home Screen” tip. */
export function InstallAppButton({ className = "" }: { className?: string }) {
  const [deferred, setDeferred] = useState<BeforeInstallPromptEvent | null>(null);
  const [installed, setInstalled] = useState(false);
  const [iosTip, setIosTip] = useState(false);

  useEffect(() => {
    if (isStandalone()) {
      setInstalled(true);
      return;
    }
    setIosTip(isIosSafari());

    function onPrompt(event: Event) {
      event.preventDefault();
      setDeferred(event as BeforeInstallPromptEvent);
    }
    function onInstalled() {
      setInstalled(true);
      setDeferred(null);
    }
    window.addEventListener("beforeinstallprompt", onPrompt);
    window.addEventListener("appinstalled", onInstalled);
    return () => {
      window.removeEventListener("beforeinstallprompt", onPrompt);
      window.removeEventListener("appinstalled", onInstalled);
    };
  }, []);

  if (installed) return null;

  if (deferred) {
    return (
      <button
        type="button"
        onClick={async () => {
          await deferred.prompt();
          const choice = await deferred.userChoice;
          if (choice.outcome === "accepted") setDeferred(null);
        }}
        className={
          className ||
          "inline-flex w-full items-center justify-center gap-2 rounded-lg border border-[#e6e6e6] bg-[#f7f7f7] px-4 py-2.5 text-sm font-semibold text-[#1a1a1a] hover:bg-[#efefef]"
        }
      >
        <Download size={16} />
        Install HotspotPro app
      </button>
    );
  }

  if (iosTip) {
    return (
      <p className="flex items-start gap-2 rounded-lg border border-[#e6e6e6] bg-[#f7f7f7] px-3 py-2.5 text-xs leading-relaxed text-[#525252]">
        <Share size={14} className="mt-0.5 shrink-0" />
        <span>
          Install on this iPhone: tap <strong className="text-[#1a1a1a]">Share</strong>, then{" "}
          <strong className="text-[#1a1a1a]">Add to Home Screen</strong>.
        </span>
      </p>
    );
  }

  return null;
}
