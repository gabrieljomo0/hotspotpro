"use client";

import { useState, type ReactNode } from "react";

import { Badge, Card, Loading, api, useApi } from "../ui";

type Info = {
  settings: { signupOpen: boolean };
  system: {
    version: string; node: string; uptimeSeconds: number; production: boolean; dataDir: string; backendPort: string; publicUrl: string | null;
    setupCodeSet: boolean; radius: "off" | { authPort: number; acctPort: number }; businesses: number;
  };
};

const row = (label: string, value: ReactNode) => (
  <div className="flex flex-wrap justify-between gap-2 border-t border-[#f4f4f4] px-5 py-3 text-sm first:border-t-0">
    <span className="text-[#737373]">{label}</span>
    <span className="font-semibold text-[#1a1a1a]">{value}</span>
  </div>
);

export default function SettingsPage() {
  const { data, error, reload } = useApi<Info>("/api/super/settings", 0);
  const [busy, setBusy] = useState(false);
  if (!data) return <Loading error={error} />;
  const { settings, system } = data;

  async function toggleSignup() {
    setBusy(true);
    try {
      await api("/api/super/settings", { method: "PATCH", body: JSON.stringify({ signupOpen: !settings.signupOpen }) });
      await reload();
    } finally {
      setBusy(false);
    }
  }
  const h = Math.floor(system.uptimeSeconds / 3600), m = Math.floor((system.uptimeSeconds % 3600) / 60);

  return (
    <>
      <h1 className="mb-1 text-3xl font-bold tracking-tight">Platform settings</h1>
      <p className="mb-6 text-sm text-[#737373]">Controls for the whole site.</p>

      <Card title="Public sign-up" subtitle="When on, anyone can create their own business account from the login page. When off, only you can add businesses.">
        <div className="flex items-center justify-between gap-4 px-5 py-4">
          <p className="text-sm text-[#525252]">New businesses may register: <Badge tone={settings.signupOpen ? "green" : "red"}>{settings.signupOpen ? "ON" : "OFF"}</Badge></p>
          <button type="button" role="switch" aria-checked={settings.signupOpen} disabled={busy} onClick={toggleSignup} aria-label="Public sign-up" className={`relative h-6 w-11 shrink-0 rounded-full transition ${settings.signupOpen ? "bg-[#1a1a1a]" : "bg-[#d4d4d4]"}`}>
            <span className={`absolute top-0.5 h-5 w-5 rounded-full bg-white shadow transition-all ${settings.signupOpen ? "left-[22px]" : "left-0.5"}`} />
          </button>
        </div>
      </Card>

      <Card title="This server">
        {row("Businesses", system.businesses)}
        {row("Mode", system.production ? "Production (live)" : "Development / testing")}
        {row("Public address", system.publicUrl ?? "Not set (HOTSPOTPRO_PUBLIC_URL)")}
        {row("Backend port", system.backendPort)}
        {row("RADIUS", system.radius === "off" ? "Off" : `UDP ${system.radius.authPort} (logins) and ${system.radius.acctPort} (usage)`)}
        {row("Setup code for the first account", system.setupCodeSet ? "Set" : "Not set")}
        {row("Data folder", <span className="font-mono text-xs">{system.dataDir}</span>)}
        {row("Node.js", system.node)}
        {row("Running for", `${h} h ${m} min`)}
      </Card>

      <Card title="Good to know">
        <ul className="list-disc space-y-2 px-9 py-4 text-sm text-[#525252]">
          <li>Each business&apos;s data is kept completely separate. Use <strong>Open its dashboard</strong> on a business page to see and change anything it can.</li>
          <li>Back up the data folder above regularly: it holds every business&apos;s data.</li>
          <li>Suspending a business locks out its owner, agents and customers&apos; portal; its routers keep their current state.</li>
        </ul>
      </Card>
    </>
  );
}
