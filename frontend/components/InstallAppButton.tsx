"use client";

import { Download, Share, X } from "lucide-react";
import { useEffect, useState } from "react";

type BeforeInstallPromptEvent = Event & {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed" }>;
};

const DISMISS_KEY = "hotspotpro:pwa-button-dismissed";

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

/**
 * Install app control — fixed at the bottom of the site only.
 * Users can install or close (X). Closing hides it until they clear site data.
 */
export function InstallAppButton({ className = "" }: { className?: string }) {
  const { deferred, installed, iosTip, ready, install } = useInstallPrompt();
  const [showHelp, setShowHelp] = useState(false);
  const [dismissed, setDismissed] = useState(false);

  useEffect(() => {
    try {
      setDismissed(localStorage.getItem(DISMISS_KEY) === "1");
    } catch {
      setDismissed(false);
    }
  }, []);

  if (!ready || installed || dismissed) return null;

  function dismiss() {
    setDismissed(true);
    try {
      localStorage.setItem(DISMISS_KEY, "1");
    } catch {
      /* ignore */
    }
  }

  return (
    <>
      <div
        data-testid="install-app-bar"
        className={
          className ||
          "fixed inset-x-0 bottom-0 z-[200] border-t border-[#e6e6e6] bg-white/95 p-3 shadow-[0_-8px_24px_rgba(26,26,26,0.08)] backdrop-blur print:hidden"
        }
      >
        <div className="mx-auto flex max-w-lg items-center gap-2">
          <button
            type="button"
            onClick={async () => {
              if (iosTip) {
                setShowHelp(true);
                return;
              }
              if (deferred) {
                await install();
                return;
              }
              setShowHelp(true);
            }}
            className="inline-flex flex-1 items-center justify-center gap-2 rounded-lg bg-[#1a1a1a] px-4 py-2.5 text-sm font-semibold text-white hover:bg-[#111111]"
          >
            {iosTip ? <Share size={16} /> : <Download size={16} />}
            Install app
          </button>
          <button
            type="button"
            aria-label="Hide install"
            onClick={dismiss}
            className="shrink-0 rounded-lg border border-[#e6e6e6] p-2.5 text-[#737373] hover:bg-[#f4f4f4]"
          >
            <X size={16} />
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
