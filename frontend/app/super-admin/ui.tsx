"use client";

// Small shared pieces for the super admin screens (same look as the rest of the app: solid
// white cards, slate text, one blue).

import { useCallback, useEffect, useState, type ReactNode } from "react";

export async function api<T = Record<string, unknown>>(url: string, init?: RequestInit): Promise<T> {
  const response = await fetch(url, {
    ...init,
    headers: { "Content-Type": "application/json", ...(init?.headers ?? {}) },
    cache: "no-store",
  });
  const data = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error((data as { message?: string }).message ?? `Request failed (${response.status})`);
  return data as T;
}

/** Loads a URL, and again every `everyMs` (default: 15 s) so the numbers stay current. */
export function useApi<T>(url: string, everyMs = 15000) {
  const [data, setData] = useState<T | null>(null);
  const [error, setError] = useState<string | null>(null);
  const load = useCallback(async () => {
    try {
      setData(await api<T>(url));
      setError(null);
    } catch (e) {
      setError((e as Error).message);
    }
  }, [url]);
  useEffect(() => {
    void load();
    if (!everyMs) return;
    const timer = setInterval(() => {
      if (document.visibilityState === "visible") void load();
    }, everyMs);
    return () => clearInterval(timer);
  }, [load, everyMs]);
  return { data, error, reload: load };
}

const SYMBOL: Record<string, string> = { GHS: "GH₵", "GH₵": "GH₵" };
export function money(map: Record<string, number> | undefined) {
  const entries = Object.entries(map ?? {});
  if (entries.length === 0) return "GH₵ 0.00";
  return entries
    .map(([cur, amount]) => `${SYMBOL[cur] ?? cur} ${amount.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`)
    .join(" + ");
}
export function bytes(n: number | undefined) {
  const v = n ?? 0;
  if (v >= 1024 ** 4) return `${(v / 1024 ** 4).toFixed(2)} TB`;
  if (v >= 1024 ** 3) return `${(v / 1024 ** 3).toFixed(2)} GB`;
  if (v >= 1024 ** 2) return `${(v / 1024 ** 2).toFixed(1)} MB`;
  return `${Math.round(v / 1024)} KB`;
}
export function when(iso: string | null | undefined) {
  if (!iso) return "—";
  const d = new Date(iso);
  return Number.isNaN(d.getTime()) ? "—" : d.toLocaleString([], { dateStyle: "medium", timeStyle: "short" });
}
export function ago(iso: string | null | undefined) {
  if (!iso) return "never";
  const s = Math.max(0, (Date.now() - Date.parse(iso)) / 1000);
  if (s < 60) return "just now";
  if (s < 3600) return `${Math.floor(s / 60)} min ago`;
  if (s < 86400) return `${Math.floor(s / 3600)} h ago`;
  return `${Math.floor(s / 86400)} d ago`;
}

export function Card({ title, subtitle, action, children }: { title?: string; subtitle?: string; action?: ReactNode; children: ReactNode }) {
  return (
    <section className="mb-6 overflow-hidden rounded-2xl border border-[#e6e6e6] bg-white shadow-[0_8px_24px_rgba(26,26,26,0.06)]">
      {(title || action) && (
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-[#e6e6e6] px-5 py-4">
          <div>
            {title && <h2 className="text-lg font-bold text-[#1a1a1a]">{title}</h2>}
            {subtitle && <p className="text-sm text-[#737373]">{subtitle}</p>}
          </div>
          {action}
        </div>
      )}
      {children}
    </section>
  );
}

export function Stat({ label, value, hint }: { label: string; value: ReactNode; hint?: ReactNode }) {
  return (
    <div className="rounded-2xl border border-[#e6e6e6] bg-white p-5 shadow-[0_8px_24px_rgba(26,26,26,0.06)] transition-all duration-300 hover:-translate-y-1 hover:shadow-lg">
      <p className="text-sm font-medium text-[#737373]">{label}</p>
      <p className="mt-1 text-2xl font-bold text-[#1a1a1a]">{value}</p>
      {hint && <p className="mt-1 text-xs text-[#a3a3a3]">{hint}</p>}
    </div>
  );
}

export function Badge({ tone, children }: { tone: "green" | "red" | "amber" | "blue" | "grey"; children: ReactNode }) {
  const style = {
    green: "bg-emerald-100 text-emerald-700",
    red: "bg-red-100 text-red-700",
    amber: "bg-amber-100 text-amber-700",
    blue: "bg-blue-100 text-blue-700",
    grey: "bg-slate-100 text-slate-600",
  }[tone];
  return <span className={`inline-block whitespace-nowrap rounded-full px-2.5 py-1 text-xs font-semibold ${style}`}>{children}</span>;
}

export function Table({ head, children, empty }: { head: string[]; children: ReactNode; empty?: string }) {
  return (
    <div className="overflow-x-auto">
      <table className="w-full min-w-[640px] text-left text-sm">
        <thead className="bg-[#f7f7f7] text-xs text-[#737373]">
          <tr>{head.map((h) => <th key={h} className="px-5 py-3 font-semibold">{h}</th>)}</tr>
        </thead>
        <tbody>{children}</tbody>
      </table>
      {empty && <p className="px-5 py-8 text-sm text-[#737373]">{empty}</p>}
    </div>
  );
}
export const Td = ({ children, className = "" }: { children: ReactNode; className?: string }) => (
  <td className={`border-t border-[#f4f4f4] px-5 py-3 text-[#525252] ${className}`}>{children}</td>
);

export function Loading({ error }: { error: string | null }) {
  return <p className={`py-10 text-center text-sm ${error ? "text-[#1a1a1a]" : "text-[#737373]"}`}>{error ?? "Loading…"}</p>;
}

export const inputClass =
  "w-full rounded-lg border border-[#d4d4d4] bg-white px-3 py-2.5 text-sm text-[#1a1a1a] outline-none focus:border-[#1a1a1a]";
export const primaryButton =
  "rounded-lg bg-[#1a1a1a] px-4 py-2.5 text-sm font-bold text-white hover:bg-[#111111] disabled:opacity-50";
export const quietButton =
  "rounded-lg border border-[#d4d4d4] bg-white px-4 py-2.5 text-sm font-bold text-[#525252] hover:bg-[#f4f4f4] disabled:opacity-50";
export const dangerButton =
  "rounded-lg border border-red-200 bg-white px-4 py-2.5 text-sm font-bold text-red-600 hover:bg-red-50 disabled:opacity-50";
