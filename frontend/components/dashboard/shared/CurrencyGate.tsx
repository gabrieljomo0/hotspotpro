"use client";

import { useEffect, useState } from "react";
import { Globe2 } from "lucide-react";

import {
  currencyInfo,
  detectCurrency,
  getCurrencySettings,
  setCurrencySettings,
  type DetectionResult,
} from "./currency";

const MARKER = "hotspotpro:currencyCheck";

// Runs once right after the admin signs in (the login page leaves a marker).
// If the currency is on "auto" and where the admin is signing in from points
// to a different currency than the one in use, it asks before switching —
// switching only changes the label on amounts, it never converts them, so it
// must never happen silently.
export function CurrencyGate() {
  const [found, setFound] = useState<DetectionResult | null>(null);

  useEffect(() => {
    let cancelled = false;
    let pending = false;
    try {
      // Read it now but only clear it once the check has finished, so a
      // double-run of this effect (React strict mode) still sees it.
      pending = window.sessionStorage.getItem(MARKER) === "1";
    } catch {
      pending = false;
    }
    if (!pending) return;

    const { mode, code } = getCurrencySettings();
    const clearMarker = () => {
      try {
        window.sessionStorage.removeItem(MARKER);
      } catch {
        // Nothing to clear.
      }
    };
    if (mode === "manual") {
      clearMarker();
      return;
    }

    void detectCurrency().then((result) => {
      if (cancelled) return;
      clearMarker();
      // Only a real signal can propose a change; "default" never does.
      if (result.source !== "default" && result.code !== code) setFound(result);
    });
    return () => {
      cancelled = true;
    };
  }, []);

  if (!found) return null;

  const next = currencyInfo(found.code);
  const current = currencyInfo(getCurrencySettings().code);
  const place = found.countryName ? `in ${found.countryName}` : "in a different country";

  return (
    <div className="fixed inset-0 z-[110] flex items-center justify-center bg-slate-950/60 p-4">
      <section
        data-testid="currency-prompt"
        role="dialog"
        aria-modal="true"
        className="w-full max-w-md rounded-2xl border border-[#e2e8f0] bg-white p-6 shadow-2xl"
      >
        <div className="flex h-12 w-12 items-center justify-center rounded-full bg-blue-100 text-[#2563eb]">
          <Globe2 size={23} />
        </div>
        <h3 className="mt-4 text-xl font-black text-[#0f172a]">
          Switch to {next.name} ({next.symbol})?
        </h3>
        <p className="mt-2 text-sm leading-6 text-[#64748b]">
          You&apos;re signing in {place}. Amounts are currently shown in {current.name} (
          {current.symbol}). Switching changes the currency label everywhere — it does{" "}
          <strong>not</strong> convert any amounts.
        </p>
        <div className="mt-6 flex flex-col gap-2 sm:flex-row">
          <button
            type="button"
            data-testid="currency-switch"
            onClick={() => {
              setCurrencySettings({ code: found.code, mode: "auto" });
              setFound(null);
            }}
            className="flex-1 rounded-xl bg-[#2563eb] px-4 py-3 text-sm font-bold text-white hover:bg-[#1d4ed8]"
          >
            Switch to {next.symbol}
          </button>
          <button
            type="button"
            data-testid="currency-keep"
            onClick={() => {
              // "Keep" is a deliberate choice, so stop asking on every sign-in.
              setCurrencySettings({ code: current.code, mode: "manual" });
              setFound(null);
            }}
            className="flex-1 rounded-xl border border-[#e2e8f0] bg-white px-4 py-3 text-sm font-semibold text-[#475569] hover:bg-[#ffffff]"
          >
            Keep {current.symbol}
          </button>
        </div>
      </section>
    </div>
  );
}
