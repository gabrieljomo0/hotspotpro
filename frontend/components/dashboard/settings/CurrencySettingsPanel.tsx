"use client";

import { useState } from "react";
import { Globe2 } from "lucide-react";

import { useDashboard } from "../context/DashboardContext";
import {
  CURRENCIES,
  currencyInfo,
  detectCurrency,
  isCurrencyCode,
  setCurrencySettings,
  useCurrencySettings,
} from "../shared/currency";

// Settings → Currency. The admin can pick the currency by hand ("manual" —
// it then stays put), or let it follow where they sign in from ("auto").
export function CurrencySettingsPanel() {
  const { showToast } = useDashboard();
  const settings = useCurrencySettings();
  const [checking, setChecking] = useState(false);
  const current = currencyInfo(settings.code);

  async function detectNow() {
    setChecking(true);
    const result = await detectCurrency();
    setChecking(false);
    if (result.source === "default") {
      showToast("Couldn't tell where you are — currency left as it is.");
      return;
    }
    setCurrencySettings({ code: result.code, mode: "auto" });
    showToast(`Currency set to ${currencyInfo(result.code).name} from your location.`);
  }

  return (
    <section
      data-testid="currency-settings"
      className="mt-6 rounded-2xl border border-[#e6e6e6] bg-white p-5 shadow-[0_8px_24px_rgba(26,26,26,0.06)] md:p-6"
    >
      <div className="flex items-start gap-3">
        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-blue-50 text-[#1a1a1a]">
          <Globe2 size={20} />
        </div>
        <div>
          <h3 className="text-lg font-bold text-[#1a1a1a]">Currency</h3>
          <p className="mt-1 text-sm text-[#737373]">
            Every amount in HotspotPro — revenue, prices, wallets, printouts — uses this currency.
            It starts as Ghana cedis (GH₵).
          </p>
        </div>
      </div>

      <div className="mt-5 grid gap-4 md:grid-cols-2">
        <label className="block">
          <span className="mb-1.5 block text-xs font-bold uppercase tracking-wide text-[#737373]">
            Currency
          </span>
          <select
            data-testid="currency-select"
            value={settings.code}
            onChange={(event) => {
              if (!isCurrencyCode(event.target.value)) return;
              setCurrencySettings({ code: event.target.value, mode: "manual" });
              showToast(`Currency set to ${currencyInfo(event.target.value).name}.`);
            }}
            className="h-11 w-full rounded-xl border border-[#e6e6e6] bg-white px-3.5 text-sm outline-none focus:border-[#1a1a1a]"
          >
            {CURRENCIES.map((entry) => (
              <option key={entry.code} value={entry.code}>
                {entry.symbol} — {entry.name} ({entry.code})
              </option>
            ))}
          </select>
        </label>

        <div>
          <span className="mb-1.5 block text-xs font-bold uppercase tracking-wide text-[#737373]">
            Choice
          </span>
          <label className="flex h-11 cursor-pointer items-center gap-2 text-sm font-semibold text-[#525252]">
            <input
              type="checkbox"
              data-testid="currency-auto"
              checked={settings.mode === "auto"}
              onChange={(event) =>
                setCurrencySettings({ code: settings.code, mode: event.target.checked ? "auto" : "manual" })
              }
              className="h-4 w-4 accent-[#1a1a1a]"
            />
            Check my location when I sign in
          </label>
        </div>
      </div>

      <div className="mt-4 flex flex-wrap items-center gap-3">
        <button
          type="button"
          data-testid="currency-detect"
          onClick={detectNow}
          disabled={checking}
          className="rounded-xl border border-[#e6e6e6] bg-white px-4 py-2.5 text-sm font-semibold text-[#525252] hover:bg-[#ffffff] disabled:opacity-60"
        >
          {checking ? "Checking…" : "Use my current location"}
        </button>
        <span className="text-sm text-[#737373]">
          Showing <strong className="text-[#1a1a1a]">{current.symbol}</strong> ({current.name})
        </span>
      </div>

      <ul className="mt-4 space-y-1.5 rounded-xl bg-[#ffffff] p-4 text-xs leading-5 text-[#737373]">
        <li>
          Changing currency only changes the label — amounts are <strong>not converted</strong> with an
          exchange rate. Re-price your packages if you switch.
        </li>
        <li>
          Location is worked out from your internet address using a third-party lookup service (your IP
          address is sent to it). If that is unavailable, your browser&apos;s time zone is used when it names
          a specific country; otherwise cedis are kept.
        </li>
      </ul>
    </section>
  );
}
