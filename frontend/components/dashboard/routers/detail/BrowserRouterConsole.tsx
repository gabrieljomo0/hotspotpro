"use client";

// In-site router console: work on a remote router from the browser without
// installing WinBox. Commands go through the check-in. When the router has a
// public path, also open MikroTik WebFig. For NAT/CGNAT, download WireGuard
// then use WinBox / WebFig at 192.168.216.1 on this laptop.

import { useCallback, useEffect, useState } from "react";
import { Copy, Download, ExternalLink, Send, Terminal, X } from "lucide-react";

import type { RouterInfo } from "@/components/dashboard/data/dashboard-data";
import { downloadWireguardTunnel } from "@/components/dashboard/routers/autoRemoteWinbox";

type Job = {
  id: string;
  at: string;
  script: string;
  by: string;
  status: "queued" | "sent" | "ok" | "failed";
  finishedAt?: string;
  output?: string;
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
  return null;
}

function winboxConnectAddress(router: RouterInfo): string {
  if (router.winboxReach === "direct" && router.winboxAddress) return router.winboxAddress;
  if (router.winboxReach === "relay" || router.wireguardConfig) return "192.168.216.1";
  return router.winboxAddress || "192.168.88.1";
}

async function copyText(text: string) {
  try {
    await navigator.clipboard.writeText(text);
    return true;
  } catch {
    return false;
  }
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
  const [note, setNote] = useState("");
  const fig = webfigUrl(router);
  const address = winboxConnectAddress(router);
  const relay = router.winboxReach === "relay" || (!!router.wireguardConfig && router.winboxReach !== "direct");
  const remoteOn = router.remoteAccessEnabled !== false && router.remoteAccessHold !== true;

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
    const timer = window.setInterval(() => void load(), 2500);
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
    setNote("");
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
        setNote("Sent. Waiting for the router check-in (usually a few seconds)…");
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
              Send commands from this site (works behind any NAT). For full WinBox/WebFig on your laptop, use the address below.
            </p>
          </div>
          <button type="button" onClick={onClose} className="rounded-lg p-2 text-[#737373] hover:bg-[#f4f4f4]" aria-label="Close">
            <X size={18} />
          </button>
        </header>

        <div className="space-y-4 overflow-y-auto px-5 py-4">
          <div className="rounded-xl border border-[#e6e6e6] bg-[#fafafa] p-4">
            <p className="text-sm font-semibold text-[#1a1a1a]">WinBox on this laptop</p>
            <p className="mt-1 text-xs text-[#737373]">
              {relay
                ? "This router is behind NAT. Download WireGuard, turn the tunnel on, then open WinBox to 192.168.216.1."
                : remoteOn
                  ? "Paste this address into WinBox on your laptop (port 8291)."
                  : "Enable Remote WinBox Access first, then refresh this page."}
            </p>
            <div className="mt-3 flex flex-wrap items-center gap-2">
              <code className="rounded-lg bg-white px-3 py-2 font-mono text-sm text-[#1a1a1a]">{address}</code>
              <button
                type="button"
                onClick={async () => {
                  const ok = await copyText(address);
                  setNote(ok ? `Copied ${address}` : "Could not copy — select the address manually.");
                }}
                className="inline-flex items-center gap-1.5 rounded-xl border border-[#e6e6e6] bg-white px-3 py-2 text-xs font-bold text-[#1a1a1a] hover:bg-[#f4f4f4]"
              >
                <Copy size={14} /> Copy
              </button>
              {relay && router.wireguardConfig ? (
                <button
                  type="button"
                  onClick={() => {
                    downloadWireguardTunnel(router.name, router.wireguardConfig || "");
                    setNote("WireGuard file downloaded. Import it, activate the tunnel, then WinBox → 192.168.216.1");
                  }}
                  className="inline-flex items-center gap-1.5 rounded-xl bg-[#1a1a1a] px-3 py-2 text-xs font-bold text-white hover:bg-[#111111]"
                >
                  <Download size={14} /> Download WireGuard
                </button>
              ) : null}
              {fig ? (
                <button
                  type="button"
                  data-testid="open-webfig"
                  onClick={() => window.open(fig, "_blank", "noopener,noreferrer")}
                  className="inline-flex items-center gap-1.5 rounded-xl bg-[#1a1a1a] px-3 py-2 text-xs font-bold text-white hover:bg-[#111111]"
                >
                  <ExternalLink size={14} /> Open WebFig
                </button>
              ) : null}
            </div>
          </div>

          <div>
            <p className="text-sm font-semibold text-[#1a1a1a]">Site console</p>
            <p className="mt-1 text-xs text-[#737373]">
              Runs on the live router through HotspotPro check-in. Output appears below when the router replies.
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
            {error && <p className="mt-2 text-xs font-semibold text-red-700">{error}</p>}
            {note && !error && <p className="mt-2 text-xs font-semibold text-[#067647]">{note}</p>}
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
              {jobs.length === 0 && <li className="text-sm text-[#a3a3a3]">No commands yet. Try “Identity & version”.</li>}
              {jobs.map((job) => (
                <li key={job.id} className="rounded-xl border border-[#f4f4f4] px-3 py-2">
                  <div className="flex items-center justify-between gap-2">
                    <span className="text-[11px] font-semibold uppercase text-[#737373]">{job.status}</span>
                    <span className="text-[11px] text-[#a3a3a3]">{new Date(job.at).toLocaleTimeString()}</span>
                  </div>
                  <pre className="mt-1 overflow-x-auto whitespace-pre-wrap font-mono text-[11px] text-[#1a1a1a]">{job.script}</pre>
                  {job.output ? (
                    <pre className="mt-2 max-h-48 overflow-auto whitespace-pre-wrap rounded-lg bg-[#1a1a1a] p-2 font-mono text-[11px] text-[#bbf7d0]">
                      {job.output}
                    </pre>
                  ) : job.status === "queued" || job.status === "sent" ? (
                    <p className="mt-1 text-[11px] text-[#a3a3a3]">Waiting for router…</p>
                  ) : null}
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
