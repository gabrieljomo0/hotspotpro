"use client";

import { Download, Share, X } from "lucide-react";
import { useEffect, useState } from "react";

type BeforeInstallPromptEvent = Event & {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed" }>;
};

const DISMISS_KEY = "hotspotpro:pwa-banner-dismissed";

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

function useInstallPrompt() {
  const [deferred, setDeferred] = useState<BeforeInstallPromptEvent | null>(null);
  const [installed, setInstalled] = useState(false);
  const [iosTip, setIosTip] = useState(false);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    if (isStandalone()) {
      setInstalled(true);
      setReady(true);
      return;
    }
    setIosTip(isIosSafari());
    setReady(true);

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

  async function install() {
    if (!deferred) return false;
    await deferred.prompt();
    const choice = await deferred.userChoice;
    if (choice.outcome === "accepted") {
      setDeferred(null);
      setInstalled(true);
      return true;
    }
    return false;
  }

  return { deferred, installed, iosTip, ready, install };
}

/** Compact install control for login / header. */
export function InstallAppButton({ className = "" }: { className?: string }) {
  const { deferred, installed, iosTip, ready, install } = useInstallPrompt();
  const [showHelp, setShowHelp] = useState(false);

  if (!ready || installed) return null;

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

  return (
    <>
      <button
        type="button"
        onClick={async () => {
          if (deferred) {
            await install();
            return;
          }
          setShowHelp(true);
        }}
        className={
          className ||
          "inline-flex w-full items-center justify-center gap-2 rounded-lg bg-[#1a1a1a] px-4 py-2.5 text-sm font-semibold text-white hover:bg-[#111111]"
        }
      >
        <Download size={16} />
        Install app
      </button>
      {showHelp && !deferred ? <InstallHelpSheet onClose={() => setShowHelp(false)} /> : null}
    </>
  );
}

/** Fixed bottom prompt — always visible until installed (dismiss only hides for this browser tab session). */
export function InstallAppBanner() {
  const { deferred, installed, iosTip, ready, install } = useInstallPrompt();
  const [dismissed, setDismissed] = useState(false);
  const [showHelp, setShowHelp] = useState(false);
  const [onPortal, setOnPortal] = useState(false);

  useEffect(() => {
    try {
      setDismissed(sessionStorage.getItem(DISMISS_KEY) === "1");
    } catch {
      setDismissed(false);
    }
    setOnPortal(window.location.pathname.startsWith("/portal"));
  }, []);

  if (!ready || installed || dismissed || onPortal) return null;

  function dismiss() {
    setDismissed(true);
    try {
      sessionStorage.setItem(DISMISS_KEY, "1");
    } catch {
      /* ignore */
    }
  }

  return (
    <>
      <div
        data-testid="pwa-install-banner"
        className="fixed inset-x-0 bottom-0 z-[240] border-t border-[#e6e6e6] bg-white p-3 shadow-[0_-8px_30px_rgba(0,0,0,0.12)] sm:p-4"
      >
        <div className="mx-auto flex max-w-3xl items-center gap-3">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src="/icons/icon-192.png" alt="" className="h-12 w-12 shrink-0 rounded-xl" width={48} height={48} />
          <div className="min-w-0 flex-1">
            <p className="text-sm font-bold text-[#1a1a1a]">Install HotspotPro</p>
            <p className="text-xs text-[#737373]">
              {iosTip
                ? "Add the app icon to your Home Screen for one-tap access."
                : "Add to your phone home screen or computer desktop."}
            </p>
          </div>
          <button
            type="button"
            onClick={async () => {
              if (iosTip) {
                setShowHelp(true);
                return;
              }
              if (deferred) {
                const ok = await install();
                if (ok) dismiss();
                return;
              }
              setShowHelp(true);
            }}
            className="shrink-0 rounded-xl bg-[#1a1a1a] px-4 py-2.5 text-sm font-bold text-white hover:bg-[#111111]"
          >
            Install
          </button>
          <button
            type="button"
            aria-label="Dismiss"
            onClick={dismiss}
            className="shrink-0 rounded-lg p-2 text-[#737373] hover:bg-[#f4f4f4]"
          >
            <X size={18} />
          </button>
        </div>
      </div>
      {showHelp ? <InstallHelpSheet ios={iosTip} onClose={() => setShowHelp(false)} /> : null}
    </>
  );
}

function InstallHelpSheet({ ios = false, onClose }: { ios?: boolean; onClose: () => void }) {
  return (
    <div className="fixed inset-0 z-[250] flex items-end justify-center bg-black/40 p-4 sm:items-center">
      <button type="button" aria-label="Close" className="absolute inset-0 cursor-default" onClick={onClose} />
      <div className="relative z-10 w-full max-w-md rounded-2xl bg-white p-5 shadow-2xl">
        <div className="mb-3 flex items-center justify-between">
          <h2 className="text-base font-bold text-[#1a1a1a]">Add HotspotPro icon</h2>
          <button type="button" onClick={onClose} className="rounded-lg p-1.5 text-[#737373] hover:bg-[#f4f4f4]">
            <X size={18} />
          </button>
        </div>
        {ios ? (
          <ol className="list-decimal space-y-2 pl-5 text-sm text-[#525252]">
            <li>
              Tap the <strong className="text-[#1a1a1a]">Share</strong> button in Safari.
            </li>
            <li>
              Choose <strong className="text-[#1a1a1a]">Add to Home Screen</strong>.
            </li>
            <li>Tap Add — HotspotPro appears with your other apps.</li>
          </ol>
        ) : (
          <ol className="list-decimal space-y-2 pl-5 text-sm text-[#525252]">
            <li>
              Open this site in <strong className="text-[#1a1a1a]">Chrome</strong> or Edge.
            </li>
            <li>
              Tap the browser menu <strong className="text-[#1a1a1a]">⋮</strong> (phone) or the install icon in the
              address bar (computer).
            </li>
            <li>
              Choose <strong className="text-[#1a1a1a]">Install app</strong> /{" "}
              <strong className="text-[#1a1a1a]">Add to Home screen</strong>.
            </li>
          </ol>
        )}
        <button
          type="button"
          onClick={onClose}
          className="mt-5 w-full rounded-xl bg-[#1a1a1a] px-4 py-3 text-sm font-bold text-white"
        >
          Got it
        </button>
      </div>
    </div>
  );
}
