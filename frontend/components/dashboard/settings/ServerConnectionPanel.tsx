"use client";

// Settings → Payments (bottom): what the server needs from the outside world —
// the address Hubtel calls back, the RADIUS details routers use — plus the
// latest online payments. Reads /api/payments/info and /api/payments (admin).

import { useCallback, useEffect, useState } from "react";
import { Check, Copy, RefreshCw } from "lucide-react";

type Info = {
  paymentMode: "hubtel" | "sandbox" | "off";
  hubtelCallbackUrl: string;
  radius: { host: string; authPort: number; acctPort: number; secret: string };
};
type Payment = {
  id: string; status: "pending" | "paid" | "failed" | "expired"; amount: number; packageName: string;
  phone: string; gateway: string; voucherCode?: string; createdAt: string; failureReason?: string;
};

const MODE_TEXT: Record<Info["paymentMode"], string> = {
  hubtel: "Live — customers are charged through Hubtel.",
  sandbox: "Test mode — payments are pretend (no money moves). Fill in Hubtel details above and switch Sandbox mode off to go live.",
  off: "Off — customers can't pay online until Hubtel is set up.",
};

function CopyRow({ label, value }: { label: string; value: string }) {
  const [copied, setCopied] = useState(false);
  return (
    <div className="flex items-center justify-between gap-3 border-b border-[#f1f5f9] py-3 last:border-0">
      <div className="min-w-0">
        <p className="text-xs font-semibold text-[#64748b]">{label}</p>
        <p className="mt-0.5 break-all font-mono text-sm text-[#0f172a]">{value}</p>
      </div>
      <button
        type="button"
        onClick={() => {
          navigator.clipboard?.writeText(value).catch(() => undefined);
          setCopied(true);
          window.setTimeout(() => setCopied(false), 1500);
        }}
        className="flex shrink-0 items-center gap-1.5 rounded-lg border border-[#cbd5e1] bg-white px-3 py-1.5 text-xs font-bold text-[#475569] hover:bg-[#f1f5f9]"
      >
        {copied ? <Check size={14} /> : <Copy size={14} />}
        {copied ? "Copied" : "Copy"}
      </button>
    </div>
  );
}

export function ServerConnectionPanel() {
  const [info, setInfo] = useState<Info | null>(null);
  const [payments, setPayments] = useState<Payment[]>([]);
  const [failed, setFailed] = useState(false);

  const load = useCallback(async () => {
    try {
      const [a, b] = await Promise.all([fetch("/api/payments/info"), fetch("/api/payments?limit=10")]);
      if (!a.ok || !b.ok) throw new Error("not available");
      setInfo((await a.json()) as Info);
      setPayments(((await b.json()) as { payments: Payment[] }).payments);
      setFailed(false);
    } catch {
      setFailed(true);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  if (failed) {
    return (
      <section data-testid="server-panel" className="mt-6 rounded-2xl bg-white p-6">
        <h3 className="text-base font-bold text-[#0f172a]">Server connection</h3>
        <p className="mt-2 text-sm text-[#64748b]">Not available — start the HotspotPro server and sign in as admin to see the callback address, RADIUS details and recent payments.</p>
      </section>
    );
  }
  if (!info) return null;

  const badge = info.paymentMode === "hubtel" ? "bg-[#f1f5f9] text-[#1d4ed8]" : info.paymentMode === "sandbox" ? "bg-[#f1f5f9] text-[#475569]" : "bg-[#fef2f2] text-[#b91c1c]";

  return (
    <section data-testid="server-panel" className="mt-6 rounded-2xl bg-white p-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h3 className="text-base font-bold text-[#0f172a]">Server connection</h3>
        <span data-testid="pay-mode" className={`rounded-full px-3 py-1 text-xs font-bold ${badge}`}>
          {info.paymentMode === "hubtel" ? "Live payments" : info.paymentMode === "sandbox" ? "Test mode" : "Payments off"}
        </span>
      </div>
      <p className="mt-1 text-sm text-[#64748b]">{MODE_TEXT[info.paymentMode]}</p>

      <div className="mt-4">
        <CopyRow label="Hubtel callback address (sent with every payment automatically)" value={info.hubtelCallbackUrl} />
        <CopyRow label="RADIUS server for routers" value={`${info.radius.host}  ·  auth UDP ${info.radius.authPort}  ·  accounting UDP ${info.radius.acctPort}`} />
        <CopyRow label="RADIUS shared secret (already in each router's setup script)" value={info.radius.secret} />
      </div>

      <div className="mt-6 flex items-center justify-between">
        <h4 className="text-sm font-bold text-[#0f172a]">Latest online payments</h4>
        <button type="button" onClick={() => void load()} className="flex items-center gap-1.5 text-xs font-bold text-[#2563eb] hover:text-[#1d4ed8]">
          <RefreshCw size={13} /> Refresh
        </button>
      </div>
      {payments.length === 0 ? (
        <p className="mt-2 text-sm text-[#64748b]">No online payments yet.</p>
      ) : (
        <div className="mt-2 overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead>
              <tr className="text-xs text-[#64748b]">
                <th className="py-2 pr-4 font-semibold">Reference</th>
                <th className="py-2 pr-4 font-semibold">Package</th>
                <th className="py-2 pr-4 font-semibold">Amount</th>
                <th className="py-2 pr-4 font-semibold">Status</th>
                <th className="py-2 font-semibold">Voucher</th>
              </tr>
            </thead>
            <tbody>
              {payments.map((p) => (
                <tr key={p.id} data-testid="payment-row" className="border-t border-[#f1f5f9]">
                  <td className="py-2 pr-4 font-mono text-xs text-[#475569]">{p.id}</td>
                  <td className="py-2 pr-4 text-[#0f172a]">{p.packageName}</td>
                  <td className="py-2 pr-4 text-[#0f172a]">{p.amount.toFixed(2)}</td>
                  <td className="py-2 pr-4 font-semibold text-[#0f172a]" title={p.failureReason}>{p.status}{p.gateway === "sandbox" ? " (test)" : ""}</td>
                  <td className="py-2 font-mono text-xs text-[#475569]">{p.voucherCode ?? "—"}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </section>
  );
}
