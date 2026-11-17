"use client";

// In-site router console: work on a remote router from the browser without
// installing WinBox. Commands go through the check-in (~3s). When the router
// has a public path, also open MikroTik WebFig in a new tab.

import { useCallback, useEffect, useState } from "react";
import { ExternalLink, Send, Terminal, X } from "lucide-react";

import type { RouterInfo } from "@/components/dashboard/data/dashboard-data";

type Job = {
  id: string;
  at: string;
  script: string;
  by: string;
  status: "queued" | "sent" | "ok" | "failed";
  finishedAt?: string;
};

const QUICK: { label: string; script: string }[] = [
  { label: "Identity & version", script: ':put ([/system identity get name] . " — " . [/system resource get version])' },
  { label: "CPU & memory", script: ':put ("CPU " . [/system resource get cpu-load] . "%  free " . [/system resource get free-memory])' },
  { label: "Active hotspot users", script: ":put [:len [/ip hotspot active find]]" },
  { label: "Interfaces", script: "/interface print without-paging" },
  { label: "IP addresses", script: "/ip address print without-paging" },
  { label: "Hotspot status", script: "/ip hotspot print without-paging" },
];

function webfigUrl(router: RouterInfo): string | null {
  const remoteOn = router.remoteAccessEnabled !== false && router.remoteAccessHold !== true;
  if (!remoteOn) return null;
  if (router.winboxReach === "direct" && router.winboxAddress) {
    const host = router.winboxAddress.replace(/:8291$/, "").trim();
    if (!host) return null;
    return `http://${host}/`;
  }
  if (router.winboxReach === "relay" || router.wireguardConfig) {
    return "http://192.168.216.1/";
  }
  return null;
}

export function BrowserRouterConsole({
  router,
  open,
  onClose,
}: {
  router: RouterInfo;
  open: boolean;
  onClose: () => void;
}) {
  const [script, setScript] = useState("");
  const [jobs, setJobs] = useState<Job[]>([]);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const fig = webfigUrl(router);

  const load = useCallback(async () => {
    try {
      const res = await fetch(`/api/routers/jobs?ip=${encodeURIComponent(router.ip)}`, { cache: "no-store" });
      if (res.ok) setJobs(((await res.json()) as { jobs: Job[] }).jobs.slice(0, 12));
    } catch {
      /* ignore */
    }
  }, [router.ip]);

  useEffect(() => {
    if (!open) return;
    void load();
    const timer = window.setInterval(() => void load(), 3000);
    return () => window.clearInterval(timer);
  }, [open, load]);

  useEffect(() => {
    if (!open) return;
    function onKey(event: KeyboardEvent) {
      if (event.key === "Escape") onClose();
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, onClose]);

  async function send(text = script) {
    const body = text.trim();
    if (!body) return;
    setBusy(true);
    setError("");
    try {
      const res = await fetch("/api/routers/jobs", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ip: router.ip, script: body }),
      });
      const data = (await res.json().catch(() => ({}))) as { message?: string };
      if (!res.ok) setError(data.message ?? "Could not send the command.");
      else {
        setScript("");
        await load();
      }
    } finally {
      setBusy(false);
    }
  }

  if (!open) return null;

  return (
    <div
      data-testid="browser-router-console"
      className="fixed inset-0 z-50 flex items-end justify-center bg-black/40 p-3 sm:items-center"
      role="dialog"
      aria-modal="true"
      aria-label={`Browser console for ${router.name}`}
    >
      <div className="flex max-h-[92vh] w-full max-w-3xl flex-col overflow-hidden rounded-2xl border border-[#e6e6e6] bg-white shadow-[0_24px_80px_rgba(26,26,26,0.28)]">
        <header className="flex items-start justify-between gap-3 border-b border-[#e6e6e6] px-5 py-4">
          <div>
            <h2 className="flex items-center gap-2 text-base font-bold text-[#1a1a1a]">
              <Terminal size={16} /> Open in browser — {router.name}
            </h2>
            <p className="mt-1 text-sm text-[#737373]">
              Work on this site from HotspotPro without installing WinBox. Commands reach the router in about 3 seconds.
            </p>
          </div>
          <button type="button" onClick={onClose} className="rounded-lg p-2 text-[#737373] hover:bg-[#f4f4f4]" aria-label="Close">
            <X size={18} />
          </button>
        </header>

        <div className="space-y-4 overflow-y-auto px-5 py-4">
          {fig && (
            <div className="rounded-xl border border-[#e6e6e6] bg-[#fafafa] p-4">
              <p className="text-sm font-semibold text-[#1a1a1a]">MikroTik WebFig (full UI in the browser)</p>
              <p className="mt-1 text-xs text-[#737373]">
                {router.winboxReach === "direct"
                  ? "This router has a public path. Opens MikroTik’s built-in web panel — no WinBox app."
                  : "Uses the WireGuard tunnel address. Turn the tunnel on first, then open WebFig."}
              </p>
              <button
                type="button"
                data-testid="open-webfig"
                onClick={() => window.open(fig, "_blank", "noopener,noreferrer")}
                className="mt-3 inline-flex items-center gap-2 rounded-xl bg-[#1a1a1a] px-4 py-2.5 text-sm font-bold text-white hover:bg-[#111111]"
              >
                <ExternalLink size={15} /> Open WebFig in browser
              </button>
            </div>
          )}

          <div>
            <p className="text-sm font-semibold text-[#1a1a1a]">Site console (works even without WinBox or WebFig)</p>
            <p className="mt-1 text-xs text-[#737373]">
              Send RouterOS commands from this page. They run on the live router at this location.
            </p>
            <div className="mt-3 flex flex-wrap gap-2">
              {QUICK.map((item) => (
                <button
                  key={item.label}
                  type="button"
                  onClick={() => void send(item.script)}
                  className="rounded-lg border border-[#e6e6e6] px-2.5 py-1 text-xs font-semibold text-[#525252] hover:bg-[#f7f7f7]"
                >
                  {item.label}
                </button>
              ))}
            </div>
            <textarea
              data-testid="browser-console-script"
              value={script}
              onChange={(event) => setScript(event.target.value)}
              rows={4}
              spellCheck={false}
              placeholder={"/ip hotspot active print without-paging"}
              className="mt-3 w-full rounded-xl border border-[#e6e6e6] bg-[#1a1a1a] p-3 font-mono text-xs text-white outline-none focus:border-[#1a1a1a]"
            />
            {error && <p className="mt-2 text-xs font-semibold text-[#1a1a1a]">{error}</p>}
            <button
              type="button"
              disabled={busy || !script.trim()}
              onClick={() => void send()}
              className="mt-3 inline-flex items-center gap-2 rounded-xl bg-[#1a1a1a] px-4 py-2.5 text-sm font-bold text-white hover:bg-[#111111] disabled:opacity-50"
            >
              <Send size={14} /> Send to router
            </button>
          </div>

          <div>
            <p className="mb-2 text-xs font-bold uppercase tracking-wide text-[#a3a3a3]">Recent commands</p>
            <ul className="space-y-2">
              {jobs.length === 0 && <li className="text-sm text-[#a3a3a3]">No commands yet.</li>}
              {jobs.map((job) => (
                <li key={job.id} className="rounded-xl border border-[#f4f4f4] px-3 py-2">
                  <div className="flex items-center justify-between gap-2">
                    <span className="text-[11px] font-semibold uppercase text-[#737373]">{job.status}</span>
                    <span className="text-[11px] text-[#a3a3a3]">{new Date(job.at).toLocaleTimeString()}</span>
                  </div>
                  <pre className="mt-1 overflow-x-auto whitespace-pre-wrap font-mono text-[11px] text-[#1a1a1a]">{job.script}</pre>
                </li>
              ))}
            </ul>
          </div>
        </div>
      </div>
    </div>
  );
}

/** Button that opens the in-browser router console. */
export function OpenBrowserConsoleButton({
  router,
  className = "inline-flex items-center gap-2 rounded-xl bg-[#1a1a1a] px-4 py-2.5 text-sm font-bold text-white hover:bg-[#111111]",
}: {
  router: RouterInfo;
  className?: string;
}) {
  const [open, setOpen] = useState(false);
  return (
    <>
      <button type="button" data-testid="open-browser-console" onClick={() => setOpen(true)} className={className}>
        <Terminal size={15} /> Open in browser
      </button>
      <BrowserRouterConsole router={router} open={open} onClose={() => setOpen(false)} />
    </>
  );
}
