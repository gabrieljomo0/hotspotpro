"use client";

import { Fragment, useEffect, type ReactNode } from "react";

import { loadCurrencySettings, useCurrencySettings } from "./currency";

// Loads the saved currency once the page is in the browser, and re-mounts
// everything below whenever the currency changes — so every amount, chart
// label and printout picks up the new symbol without each one having to
// subscribe on its own.
export function CurrencyBoundary({ children }: { children: ReactNode }) {
  const { code } = useCurrencySettings();

  useEffect(() => {
    loadCurrencySettings();
  }, []);

  return <Fragment key={code}>{children}</Fragment>;
}
