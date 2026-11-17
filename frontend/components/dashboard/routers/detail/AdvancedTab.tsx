"use client";

// Advanced setup: send any RouterOS command to this router from the site.
// The router already calls the server every 3 seconds, so the command is picked up on its next call
// (from anywhere, behind any modem, no ports opened on the router) and the router reports back whether it worked.

import { useCallback, useEffect, useState } from "react";
import { AlertTriangle, Send, Terminal } from "lucide-react";

import type { RouterInfo } from "@/components/dashboard/data/dashboard-data";

type Job = { id: string; at: string; script: string; by: string; status: "queued" | "sent" | "ok" | "failed"; finishedAt?: string };
type Control = { lastCheckInAt: string | null; enforced: boolean; lostSignal: boolean; hasToken: boolean };

const RISKY = /(reset-configuration|\/system\s+reset|user\s+(remove|disable|set)|\/ip\s+service\s+(set|disable)|\/ip\s+firewall\s+(filter|raw|nat)\s+(remove|set|disable)|interface\s+.*(remove|disable)|\/system\s+(shutdown|reboot))/i;

const PRESETS: { label: string; text: string }[] = [
  { label: "Show router identity and version", text: ":log info ([/system identity get name] . \" - RouterOS \" . [/system resource get version])" },
  { label: "Set router name", text: "/system identity set name=MyRouter" },
  { label: "Set time zone to Ghana (GMT)", text: "/system clock set time-zone-name=Africa/Accra" },
  { label: "Limit WinBox to your own LAN", text: "/ip service set winbox address=192.168.0.0/16,10.0.0.0/8" },
  { label: "Reboot the router", text: "/system reboot" },
];

const statusText: Record<Job["status"], string> = { queued: "Waiting for the router", sent: "Sent, running", ok: "Ran OK", failed: "Router reported an error" };
const statusClass: Record<Job["status"], string> = {
  queued: "bg-[#f4f4f4] text-[#525252]", sent: "bg-[#f3f1ec] text-[#111111]", ok: "bg-[#f3f1ec] text-[#111111]", failed: "bg-[#f3f1ec] text-[#1a1a1a]",
};

export function AdvancedTab({ router }: { router: RouterInfo }) {
  const [script, setScript] = useState("");
  const [jobs, setJobs] = useState<Job[]>([]);
  const [control, setControl] = useState<Control | null>(null);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const [confirmRisky, setConfirmRisky] = useState(false);

  const load = useCallback(async () => {
    try {
      const [j, c] = await Promise.all([
        fetch(`/api/routers/jobs?ip=${encodeURIComponent(router.ip)}`, { cache: "no-store" }),
        fetch(`/api/routers/control?ip=${encodeURIComponent(router.ip)}`, { cache: "no-store" }),
      ]);
      if (j.ok) setJobs(((await j.json()) as { jobs: Job[] }).jobs);
      else setError(((await j.json().catch(() => ({}))) as { message?: string }).message ?? "Could not load commands.");
      if (c.ok) setControl((await c.json()) as Control);
    } catch {
      setError("Could not reach the server.");
    }
  }, [router.ip]);

  useEffect(() => {
    void load();
    const timer = setInterval(() => void load(), 3000);
    return () => clearInterval(timer);
  }, [load]);

  const risky = RISKY.test(script);

  async function send() {
    setError("");
    if (risky && !confirmRisky) { setConfirmRisky(true); return; }
    setBusy(true);
    try {
      const response = await fetch("/api/routers/jobs", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ ip: router.ip, script }) });
      const data = (await response.json().catch(() => ({}))) as { message?: string };
      if (!response.ok) setError(data.message ?? "Could not queue the command.");
      else { setScript(""); setConfirmRisky(false); await load(); }
    } finally {
      setBusy(false);
    }
  }

  const online = control?.enforced;

  return (
    <div data-testid="advanced-tab" className="space-y-5">
      <section className="rounded-2xl border border-[#e6e6e6] bg-white p-5">
        <h3 className="flex items-center gap-2 text-base font-bold text-[#1a1a1a]"><Terminal size={16} /> Advanced setup (RouterOS commands)</h3>
        <p className="mt-1 text-sm text-[#737373]">
          Change anything on this router from here. Commands are picked up by the router on its next check-in (~3 seconds), from anywhere
          (no ports need opening on the router), run once, and the router reports whether each one worked. Commands run with full
          rights, so a wrong one can lock you out: test on a spare router first.
        </p>
        <p className="mt-2 text-xs font-semibold">
          {control === null ? <span className="text-[#a3a3a3]">Checking the router&apos;s connection…</span>
            : !control.hasToken ? <span className="text-[#1a1a1a]">This router has no setup link yet, so it cannot receive commands. Add it with the Add router page.</span>
            : online ? <span className="text-[#111111]">Router is in contact (last check-in {control.lastCheckInAt ? new Date(control.lastCheckInAt).toLocaleTimeString() : "—"}). Commands arrive within about 3 seconds.</span>
            : <span className="text-[#111111]">The router has not checked in recently. Commands will wait and run when it is back online.</span>}
        </p>

        <div className="mt-4 flex flex-wrap gap-2">
          {PRESETS.map((p) => (
            <button key={p.label} type="button" onClick={() => { setScript(p.text); setConfirmRisky(false); }} className="rounded-lg border border-[#e6e6e6] px-2.5 py-1 text-xs font-semibold text-[#525252] hover:bg-[#f7f7f7]">{p.label}</button>
          ))}
        </div>

        <textarea
          data-testid="advanced-script"
          value={script}
          onChange={(e) => { setScript(e.target.value); setConfirmRisky(false); }}
          rows={6}
          spellCheck={false}
          placeholder={"One RouterOS command per line, for example:\n/ip hotspot profile set hotspotpro idle-timeout=10m"}
          className="mt-3 w-full rounded-xl border border-[#e6e6e6] bg-[#1a1a1a] p-3 font-mono text-xs text-white outline-none focus:border-[#1a1a1a]"
        />

        {risky && (
          <p className="mt-2 flex items-start gap-2 rounded-lg border border-[#f3f1ec] bg-[#f3f1ec] p-3 text-xs font-semibold text-[#111111]">
            <AlertTriangle size={14} className="mt-0.5 shrink-0" />
            This looks like a command that can cut the router off (reset, users, services, firewall, interfaces or reboot). Check it carefully{confirmRisky ? " — press Send again to confirm" : ""}.
          </p>
        )}
        {error && <p className="mt-2 text-xs font-semibold text-[#1a1a1a]">{error}</p>}

        <button type="button" disabled={busy || !script.trim()} onClick={send} className="mt-3 inline-flex items-center gap-2 rounded-xl bg-[#1a1a1a] px-4 py-2.5 text-sm font-bold text-white hover:bg-[#111111] disabled:opacity-50">
          <Send size={14} /> {confirmRisky ? "Yes, send it" : "Send to router"}
        </button>
      </section>

      <section className="rounded-2xl border border-[#e6e6e6] bg-white p-5">
        <h3 className="text-base font-bold text-[#1a1a1a]">Recent commands</h3>
        {jobs.length === 0 ? (
          <p className="mt-2 text-sm text-[#a3a3a3]">Nothing sent yet.</p>
        ) : (
          <ul className="mt-3 space-y-3">
            {jobs.map((job) => (
              <li key={job.id} className="rounded-xl border border-[#f4f4f4] p-3">
                <div className="flex flex-wrap items-center justify-between gap-2 text-xs text-[#737373]">
                  <span>{new Date(job.at).toLocaleString()} · {job.by}</span>
                  <span className={`rounded-full px-2 py-0.5 font-bold ${statusClass[job.status]}`}>{statusText[job.status]}</span>
                </div>
                <pre className="mt-2 max-h-32 overflow-auto whitespace-pre-wrap break-all rounded-lg bg-[#f7f7f7] p-2 font-mono text-xs text-[#1a1a1a]">{job.script}</pre>
              </li>
            ))}
          </ul>
        )}
        <p className="mt-3 text-xs text-[#a3a3a3]">&quot;Router reported an error&quot; means a line failed on the router; its log (System → Log) shows which and why.</p>
      </section>
    </div>
  );
}
