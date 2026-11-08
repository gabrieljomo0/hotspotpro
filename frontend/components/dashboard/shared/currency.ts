// One place that decides which currency the whole app shows.
//
// Cedis (GH₵) are the default. The admin's location can switch it at
// sign-in (see CurrencyGate) and the admin can also pick one by hand in
// Settings → Currency.
//
// IMPORTANT: changing the currency only changes the LABEL on amounts. It
// does not convert them with an exchange rate — a GH₵ 5 package becomes
// "₦ 5", not "₦ 55". That is stated in the Settings screen too.
//
// The choice lives outside React so plain helpers (`sym()`, `money()`) can
// be used anywhere — in templates, tooltips, printouts — and the app re-
// mounts (CurrencyBoundary) whenever it changes so nothing shows a stale
// symbol. Symbols must never contain digits or dots: price strings such as
// "GH₵ 5.00" are parsed back into numbers by stripping everything that is
// not 0-9 or ".".

import { useSyncExternalStore } from "react";

export type CurrencyCode =
  | "GHS"
  | "NGN"
  | "KES"
  | "ZAR"
  | "UGX"
  | "TZS"
  | "XOF"
  | "EGP"
  | "GBP"
  | "EUR"
  | "USD";

export type CurrencyInfo = { code: CurrencyCode; symbol: string; name: string };

export const DEFAULT_CURRENCY: CurrencyCode = "GHS";

export const CURRENCIES: CurrencyInfo[] = [
  { code: "GHS", symbol: "GH₵", name: "Ghana cedi" },
  { code: "NGN", symbol: "₦", name: "Nigerian naira" },
  { code: "KES", symbol: "KSh", name: "Kenyan shilling" },
  { code: "ZAR", symbol: "R", name: "South African rand" },
  { code: "UGX", symbol: "USh", name: "Ugandan shilling" },
  { code: "TZS", symbol: "TSh", name: "Tanzanian shilling" },
  { code: "XOF", symbol: "CFA", name: "West African CFA franc" },
  { code: "EGP", symbol: "E£", name: "Egyptian pound" },
  { code: "GBP", symbol: "£", name: "British pound" },
  { code: "EUR", symbol: "€", name: "Euro" },
  { code: "USD", symbol: "US$", name: "US dollar" },
];

export function currencyInfo(code: string | null | undefined): CurrencyInfo {
  return (
    CURRENCIES.find((entry) => entry.code === code) ??
    CURRENCIES.find((entry) => entry.code === DEFAULT_CURRENCY)!
  );
}

export function isCurrencyCode(value: unknown): value is CurrencyCode {
  return CURRENCIES.some((entry) => entry.code === value);
}

// ---- Country → currency ------------------------------------------------

const COUNTRY_CURRENCY: Record<string, CurrencyCode> = {
  GH: "GHS",
  NG: "NGN",
  KE: "KES",
  ZA: "ZAR",
  UG: "UGX",
  TZ: "TZS",
  EG: "EGP",
  GB: "GBP",
  US: "USD",
  // CFA franc zone (West Africa)
  BJ: "XOF",
  BF: "XOF",
  CI: "XOF",
  GW: "XOF",
  ML: "XOF",
  NE: "XOF",
  SN: "XOF",
  TG: "XOF",
  // Euro area
  AT: "EUR",
  BE: "EUR",
  CY: "EUR",
  DE: "EUR",
  EE: "EUR",
  ES: "EUR",
  FI: "EUR",
  FR: "EUR",
  GR: "EUR",
  HR: "EUR",
  IE: "EUR",
  IT: "EUR",
  LT: "EUR",
  LU: "EUR",
  LV: "EUR",
  MT: "EUR",
  NL: "EUR",
  PT: "EUR",
  SI: "EUR",
  SK: "EUR",
};

export function currencyForCountry(
  countryCode: string | null | undefined,
): CurrencyCode | null {
  if (!countryCode) return null;
  return COUNTRY_CURRENCY[countryCode.trim().toUpperCase()] ?? null;
}

// ---- Active currency store --------------------------------------------

export type CurrencyMode = "auto" | "manual";
export type CurrencySettings = { code: CurrencyCode; mode: CurrencyMode };

const STORAGE_KEY = "hotspotpro:v2:currency";

const DEFAULT_SETTINGS: CurrencySettings = {
  code: DEFAULT_CURRENCY,
  mode: "auto",
};

let settings: CurrencySettings = DEFAULT_SETTINGS;
let loaded = false;
const listeners = new Set<() => void>();

function notify() {
  listeners.forEach((listener) => listener());
}

function parseSettings(raw: string | null): CurrencySettings | null {
  if (!raw) return null;
  try {
    const parsed = JSON.parse(raw) as Partial<CurrencySettings>;
    if (!isCurrencyCode(parsed.code)) return null;
    return {
      code: parsed.code,
      mode: parsed.mode === "manual" ? "manual" : "auto",
    };
  } catch {
    return null;
  }
}

// Reads the saved choice (browser only). Safe to call repeatedly.
export function loadCurrencySettings() {
  if (typeof window === "undefined") return;
  try {
    const saved = parseSettings(window.localStorage.getItem(STORAGE_KEY));
    loaded = true;
    if (saved && (saved.code !== settings.code || saved.mode !== settings.mode)) {
      settings = saved;
      notify();
    }
  } catch {
    loaded = true;
  }
}

export function currencyLoaded() {
  return loaded;
}

export function getCurrencySettings(): CurrencySettings {
  return settings;
}

export function setCurrencySettings(next: CurrencySettings) {
  const changed = next.code !== settings.code || next.mode !== settings.mode;
  settings = { code: next.code, mode: next.mode };
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(settings));
  } catch {
    // Storage blocked — the choice still applies for this visit.
  }
  if (changed) notify();
}

// Follow a change made in another tab (the admin switching currency).
if (typeof window !== "undefined") {
  window.addEventListener("storage", (event) => {
    if (event.storageArea !== window.localStorage || event.key !== STORAGE_KEY) {
      return;
    }
    const saved = parseSettings(event.newValue);
    if (saved && (saved.code !== settings.code || saved.mode !== settings.mode)) {
      settings = saved;
      notify();
    }
  });
}

function subscribe(listener: () => void) {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}

// React hook: re-renders when the currency changes.
export function useCurrencySettings(): CurrencySettings {
  return useSyncExternalStore(subscribe, getCurrencySettings, () => DEFAULT_SETTINGS);
}

export function useActiveCurrency(): CurrencyInfo {
  return currencyInfo(useCurrencySettings().code);
}

// ---- Formatting helpers (usable anywhere) ------------------------------

export function activeCurrency(): CurrencyInfo {
  return currencyInfo(settings.code);
}

// The current symbol, e.g. "GH₵".
export function sym(): string {
  return activeCurrency().symbol;
}

// 1234.5 → "GH₵ 1,234.50" (always two decimals unless `decimals` says so).
export function money(
  amount: number,
  options: { decimals?: number; code?: CurrencyCode } = {},
): string {
  const info = options.code ? currencyInfo(options.code) : activeCurrency();
  const decimals = options.decimals ?? 2;
  const safe = Number.isFinite(amount) ? amount : 0;
  return `${info.symbol} ${safe.toLocaleString("en-US", {
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
  })}`;
}

// Same, but without forcing decimals (whole numbers stay whole).
export function moneyShort(amount: number): string {
  const safe = Number.isFinite(amount) ? amount : 0;
  return `${sym()} ${safe.toLocaleString("en-US", { maximumFractionDigits: 2 })}`;
}

const SYMBOLS_LONGEST_FIRST = [...CURRENCIES]
  .map((entry) => entry.symbol)
  .sort((a, b) => b.length - a.length);

function escapeRegExp(text: string) {
  return text.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

const LEADING_SYMBOL = new RegExp(
  `^\\s*(?:${SYMBOLS_LONGEST_FIRST.map(escapeRegExp).join("|")})(?=\\s*[0-9])`,
);

export function hasLeadingSymbol(text: string): boolean {
  return LEADING_SYMBOL.test(text);
}

// Stored price text such as "GH₵ 5.00" carries the symbol it was saved
// with. This swaps a leading known symbol for the active one, so the same
// stored text reads correctly whichever currency is active. Text without a
// leading symbol (e.g. "Free") is returned untouched.
export function localizeAmountString(text: string): string {
  if (!text) return text;
  const match = LEADING_SYMBOL.exec(text);
  if (!match) return text;
  return `${sym()} ${text.slice(match[0].length).trimStart()}`;
}

const SYMBOL_BEFORE_NUMBER = new RegExp(
  `(?<![A-Za-z0-9])(?:${SYMBOLS_LONGEST_FIRST.map(escapeRegExp).join("|")})(?=\\s*[0-9])`,
  "g",
);

// Same idea for a sentence: "Refund of GH₵ 45.00 …" → the active symbol in
// front of every amount in the text.
export function localizeAmountsInText(text: string): string {
  return text.replace(SYMBOL_BEFORE_NUMBER, () => sym());
}

// ---- Detecting the admin's location ------------------------------------

export type DetectionResult = {
  code: CurrencyCode;
  // Where the answer came from, for the confirmation message.
  source: "location" | "timezone" | "default";
  countryName?: string;
};

// Time zones that name a place unambiguously. Plain "UTC", "Etc/*" and
// "Atlantic/Reykjavik" (which Windows uses for UTC+0, i.e. Ghana too) are
// deliberately NOT here — they say nothing reliable about the country.
const TIMEZONE_CURRENCY: Record<string, { code: CurrencyCode; country: string }> = {
  "Africa/Accra": { code: "GHS", country: "Ghana" },
  "Africa/Lagos": { code: "NGN", country: "Nigeria" },
  "Africa/Nairobi": { code: "KES", country: "Kenya" },
  "Africa/Johannesburg": { code: "ZAR", country: "South Africa" },
  "Africa/Kampala": { code: "UGX", country: "Uganda" },
  "Africa/Dar_es_Salaam": { code: "TZS", country: "Tanzania" },
  "Africa/Cairo": { code: "EGP", country: "Egypt" },
  "Africa/Dakar": { code: "XOF", country: "Senegal" },
  "Europe/London": { code: "GBP", country: "the United Kingdom" },
  "Europe/Paris": { code: "EUR", country: "France" },
  "Europe/Berlin": { code: "EUR", country: "Germany" },
  "America/New_York": { code: "USD", country: "the United States" },
  "America/Chicago": { code: "USD", country: "the United States" },
  "America/Denver": { code: "USD", country: "the United States" },
  "America/Los_Angeles": { code: "USD", country: "the United States" },
};

export function detectFromTimezone(timeZone: string | undefined): DetectionResult {
  const hit = timeZone ? TIMEZONE_CURRENCY[timeZone] : undefined;
  if (hit) {
    return { code: hit.code, source: "timezone", countryName: hit.country };
  }
  return { code: DEFAULT_CURRENCY, source: "default" };
}

const GEO_URL = "https://ipapi.co/json/";
const GEO_TIMEOUT_MS = 4000;

// Works out which currency suits where the admin is signing in from.
//   1. The network address, looked up with a third-party geolocation
//      service (so the admin's IP address is sent to that service).
//   2. If that fails or is blocked: the browser's time zone, but only when
//      it names a specific country.
//   3. Otherwise: cedis.
export async function detectCurrency(): Promise<DetectionResult> {
  let timeZone: string | undefined;
  try {
    timeZone = Intl.DateTimeFormat().resolvedOptions().timeZone;
  } catch {
    timeZone = undefined;
  }

  try {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), GEO_TIMEOUT_MS);
    const response = await fetch(GEO_URL, { signal: controller.signal });
    clearTimeout(timer);
    if (response.ok) {
      const data = (await response.json()) as {
        country_code?: string;
        country_name?: string;
        currency?: string;
      };
      const fromCountry = currencyForCountry(data.country_code);
      const fromApi = isCurrencyCode(data.currency) ? data.currency : null;
      const code = fromCountry ?? fromApi;
      if (code) {
        return { code, source: "location", countryName: data.country_name };
      }
    }
  } catch {
    // Offline, blocked or timed out — fall through to the time zone.
  }

  return detectFromTimezone(timeZone);
}
