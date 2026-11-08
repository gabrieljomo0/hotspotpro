"use client";

// The full package creation/editing form — used both by "Create Package"
// and by "Edit" on an existing package (the same form, just pre-filled).
// It's split into 5 sections: Basic Config, Speed & Performance, Pricing &
// Devices, Advanced Features (PackageCapabilities) and Availability &
// Visibility (PackageStorefront, with a live preview).
// The parent page passes in an initial value and an onSubmit callback —
// this component doesn't talk to the shared dashboard state directly.

import { localizeAmountString, sym } from "@/components/dashboard/shared/currency";
import { useEffect, useState, type FormEvent } from "react";
import { Building2, Settings2, Gauge, Wallet } from "lucide-react";

import type {
  PackageInput,
  PackageDurationUnit,
  BusinessLocation,
  AgentProfile,
} from "../shared/types";
import type { RouterInfo } from "../data/dashboard-data";
import { PackageCapabilities } from "./PackageCapabilities";
import { parseSpeed, speedLabel, speedToText } from "./speedInput";
import { PackageStorefront } from "./PackageStorefront";

const DURATION_UNITS: PackageDurationUnit[] = [
  "Minutes",
  "Hours",
  "Days",
  "Weeks",
  "Months",
];

export const DEFAULT_FORM: PackageInput = {
  name: "",
  description: "",
  durationValue: 1,
  durationUnit: "Days",
  uploadMbps: 10,
  downloadMbps: 10,
  fupValue: null,
  fupUnit: "GB",
  throttleEnabled: false,
  throttleAtValue: null,
  throttleAtUnit: "GB",
  throttleSpeedMbps: 1,
  price: "",
  devices: 1,
  freeTrial: false,
  burstEnabled: false,
  scheduleEnabled: false,
  pppoeEnabled: false,
  hotspotEnabled: true,
  agentResellingEnabled: false,
  agentPrice: "",
  status: "Active",
  featured: false,
  displayOrder: 0,
  routerIps: [],
  applySiteId: null,
  applyToAllSites: false,
  applyToAllAgents: false,
};

const TOGGLE_COLORS: Record<string, { on: string }> = {
  emerald: { on: "bg-emerald-500" },
  orange: { on: "bg-amber-500" },
  blue: { on: "bg-blue-500" },
  teal: { on: "bg-blue-500" },
  cyan: { on: "bg-blue-500" },
  violet: { on: "bg-blue-500" },
  amber: { on: "bg-amber-500" },
  pink: { on: "bg-blue-500" },
};

function Switch({
  checked,
  onChange,
  color = "emerald",
}: {
  checked: boolean;
  onChange: () => void;
  color?: keyof typeof TOGGLE_COLORS;
}) {
  const onColor = TOGGLE_COLORS[color].on;
  return (
    <button
      type="button"
      onClick={onChange}
      className={`relative h-6 w-11 shrink-0 rounded-full transition ${
        checked ? onColor : "bg-[#e2e8f0]"
      }`}
    >
      <span
        className={`absolute top-0.5 h-5 w-5 rounded-full bg-white shadow transition-transform ${
          checked ? "translate-x-5" : "translate-x-0.5"
        }`}
      />
    </button>
  );
}

function SectionHeader({
  icon: Icon,
  title,
  subtitle,
  color,
}: {
  icon: typeof Building2;
  title: string;
  subtitle: string;
  color: string;
}) {
  return (
    <div className="mb-5 flex items-start gap-3">
      <span className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-xl text-white ${color}`}>
        <Icon size={18} />
      </span>
      <div>
        <h3 className="text-base font-bold text-[#0f172a]">{title}</h3>
        <p className="text-xs text-[#64748b]">{subtitle}</p>
      </div>
    </div>
  );
}

export function PackageForm({
  initialValues,
  submitLabel,
  onSubmit,
  onSubmitAndCreateAnother,
  routers,
  businessLocations,
  actingAgent,
}: {
  initialValues?: Partial<PackageInput>;
  submitLabel: string;
  onSubmit: (input: PackageInput) => void;
  onSubmitAndCreateAnother?: (input: PackageInput) => void;
  routers: RouterInfo[];
  businessLocations: BusinessLocation[];
  // Passed only from the agent portal, so "Agent price" can be capped
  // against their resale markup limit. Omitted on the admin side, where
  // no cap applies.
  actingAgent?: AgentProfile;
}) {
  // An agent never picks a router or site: they sell on the router the admin
  // put them on, so their packages are tied to that router automatically.
  const agentRouterIp = actingAgent?.routerIp ?? null;
  const agentSiteId = agentRouterIp ? routers.find((r) => r.ip === agentRouterIp)?.siteId ?? null : null;

  const [form, setForm] = useState<PackageInput>(() => {
    const initialSiteId = initialValues?.applySiteId ?? businessLocations[0]?.id ?? "";
    const siteRouters = routers.filter((r) => r.siteId === initialSiteId).map((r) => r.ip);
    return {
      ...DEFAULT_FORM,
      routerIps: initialValues?.routerIps ?? (siteRouters.length > 0 ? siteRouters : routers[0] ? [routers[0].ip] : []),
      ...initialValues,
      ...(actingAgent ? { routerIps: agentRouterIp ? [agentRouterIp] : [] } : {}),
      // Saved prices carry the symbol they were saved with — show them in
      // the currency that is active now.
      ...(initialValues?.price ? { price: localizeAmountString(initialValues.price) } : {}),
    };
  });
  const [speedText, setSpeedText] = useState(() => speedToText(form.uploadMbps, form.downloadMbps));
  const parsedSpeed = parseSpeed(speedText);
  const speedError = "error" in parsedSpeed ? parsedSpeed.error : "";
  // Keep the box in step when the form is reset (e.g. "create another").
  useEffect(() => {
    if (!speedError && (parsedSpeed as { uploadMbps: number; downloadMbps: number }).uploadMbps !== form.uploadMbps) {
      setSpeedText(speedToText(form.uploadMbps, form.downloadMbps));
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [form.uploadMbps, form.downloadMbps]);
  const [devicesText, setDevicesText] = useState(() => String(form.devices ?? 1));
  // Keep the box in step when the form is reset (e.g. "create another").
  useEffect(() => {
    if (devicesText !== "" && Number(devicesText) !== form.devices) setDevicesText(String(form.devices));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [form.devices]);
  const [selectedSiteId, setSelectedSiteId] = useState(
    initialValues?.applySiteId ?? businessLocations[0]?.id ?? "",
  );
  // "router": hand-pick from one site. "all": every router, every site —
  // lets one package be sold anywhere, including sites created later.
  const [applyScope, setApplyScope] = useState<"router" | "all">(
    initialValues?.applyToAllSites ? "all" : "router",
  );

  const siteRouters = routers.filter((r) => r.siteId === selectedSiteId);
  const siteRouterIps = siteRouters.map((r) => r.ip);
  const allRouterIps = routers.map((r) => r.ip);

  function update<K extends keyof PackageInput>(key: K, value: PackageInput[K]) {
    setForm((current) => ({ ...current, [key]: value }));
  }

  function toggleRouter(ip: string) {
    setForm((current) => ({
      ...current,
      routerIps: current.routerIps.includes(ip)
        ? current.routerIps.filter((r) => r !== ip)
        : [...current.routerIps, ip],
    }));
  }

  function handleSiteChange(siteId: string) {
    setSelectedSiteId(siteId);
    // Selecting a different site starts you off with every router under
    // it checked — the friendly default — and you can then deselect any
    // you don't want.
    const newSiteRouterIps = routers.filter((r) => r.siteId === siteId).map((r) => r.ip);
    update("routerIps", newSiteRouterIps);
  }

  function handleScopeChange(scope: "router" | "all") {
    setApplyScope(scope);
    if (scope === "all") {
      update("routerIps", allRouterIps);
    } else {
      update("routerIps", siteRouterIps.length > 0 ? siteRouterIps : routers[0] ? [routers[0].ip] : []);
    }
  }

  function resolveScopedInput(): PackageInput {
    if (actingAgent) {
      return {
        ...form,
        routerIps: agentRouterIp ? [agentRouterIp] : [],
        applySiteId: agentSiteId,
        applyToAllSites: false,
      };
    }
    if (applyScope === "all") {
      return { ...form, routerIps: allRouterIps, applySiteId: null, applyToAllSites: true };
    }
    return {
      ...form,
      applySiteId: businessLocations.length > 0 ? selectedSiteId || null : null,
      applyToAllSites: false,
    };
  }

  // Mirrors the same check shown live in PackageCapabilities -- kept
  // here too so a capped agent literally cannot submit an over-the-cap
  // price, not just see a warning about it.
  function isAgentPriceOverCap(input: PackageInput): boolean {
    if (!actingAgent || actingAgent.maxResaleMarkupPercent === null) return false;
    if (input.agentPrice.trim() === "") return false;
    const basePrice = Number(input.price.replace(/[^0-9.]/g, "")) || 0;
    const capAmount = basePrice * (1 + actingAgent.maxResaleMarkupPercent / 100);
    const entered = Number(input.agentPrice);
    return !Number.isNaN(entered) && entered > capAmount;
  }

  function handleSubmit(event: FormEvent) {
    event.preventDefault();
    const finalInput = resolveScopedInput();
    if (finalInput.routerIps.length === 0) return;
    if (isAgentPriceOverCap(finalInput) || speedError) return;
    onSubmit(finalInput);
  }

  function handleSubmitAndCreateAnother(event: FormEvent) {
    event.preventDefault();
    const finalInput = resolveScopedInput();
    if (finalInput.routerIps.length === 0) return;
    if (isAgentPriceOverCap(finalInput) || speedError) return;
    onSubmitAndCreateAnother?.(finalInput);
    const resetSiteId = businessLocations[0]?.id ?? "";
    const resetRouterIps = actingAgent
      ? agentRouterIp
        ? [agentRouterIp]
        : []
      : routers.filter((r) => r.siteId === resetSiteId).map((r) => r.ip);
    setForm({
      ...DEFAULT_FORM,
      routerIps: resetRouterIps.length > 0 ? resetRouterIps : !actingAgent && routers[0] ? [routers[0].ip] : [],
    });
    setSelectedSiteId(resetSiteId);
    setApplyScope("router");
  }

  const hasValidTargets = form.routerIps.length > 0;
  const priceOverCap = isAgentPriceOverCap(form);

  return (
    <form onSubmit={handleSubmit} className="space-y-5">
      {/* Basic Configuration */}
      <section className="rounded-2xl border-2 border-blue-100 bg-blue-50 p-6 shadow-[0_8px_24px_rgba(37,99,235,0.06)] md:p-8">
        <SectionHeader
          icon={Settings2}
          title="Basic Configuration"
          subtitle="Define the package basic settings."
          color="bg-blue-500"
        />

        <div className="space-y-5">
          <label className="block">
            <span className="mb-2 block text-sm font-semibold text-[#475569]">
              Name of package <span className="text-red-500">*</span>
            </span>
            <input
              required
              value={form.name}
              onChange={(event) => update("name", event.target.value)}
              placeholder="Eg. Basic, Standard, Premium or Platinum"
              className="h-11 w-full rounded-xl border border-[#e2e8f0] bg-white px-3 text-sm outline-none focus:border-[#2563eb]"
            />
          </label>

          {actingAgent ? (
            <div
              data-testid="agent-router-note"
              className={`rounded-xl border p-3 text-xs ${
                agentRouterIp ? "border-blue-100 bg-blue-50 text-[#475569]" : "border-red-200 bg-red-50 text-red-700"
              }`}
            >
              {agentRouterIp
                ? "This package is automatically set up on the router your admin assigned to you — you don't need to choose a router or site."
                : "Your admin hasn't assigned you a router yet, so you can't create a package. Ask them to assign one."}
            </div>
          ) : (
            <>
          <div className="rounded-2xl border-2 border-blue-200 bg-white p-4">
            <div className="mb-3 flex items-center gap-2">
              <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-blue-500 text-white">
                <Building2 size={16} />
              </span>
              <span className="text-sm font-bold text-[#0f172a]">
                Site / Business &amp; Routers <span className="text-red-500">*</span>
              </span>
            </div>

            <div className="mb-4 grid gap-2 sm:grid-cols-2">
              <button
                type="button"
                onClick={() => handleScopeChange("router")}
                className={`rounded-xl border-2 p-3 text-left transition ${
                  applyScope === "router" ? "border-blue-400 bg-white" : "border-blue-100 bg-white hover:bg-white"
                }`}
              >
                <p className="text-sm font-bold text-[#0f172a]">Specific site / routers</p>
                <p className="text-xs text-[#64748b]">Pick one site, then its routers.</p>
              </button>
              <button
                type="button"
                onClick={() => handleScopeChange("all")}
                className={`rounded-xl border-2 p-3 text-left transition ${
                  applyScope === "all" ? "border-blue-400 bg-white" : "border-blue-100 bg-white hover:bg-white"
                }`}
              >
                <p className="text-sm font-bold text-[#0f172a]">Universal (any router)</p>
                <p className="text-xs text-[#64748b]">
                  No router to choose now. Pick the router when you create vouchers. Also covers routers added later.
                </p>
              </button>
            </div>

            <label className="mb-4 flex cursor-pointer items-start gap-3 rounded-xl border-2 border-blue-100 bg-white p-3 hover:bg-white">
              <input
                type="checkbox"
                data-testid="apply-all-agents"
                checked={Boolean(form.applyToAllAgents)}
                onChange={(event) => update("applyToAllAgents", event.target.checked)}
                className="mt-0.5 h-4 w-4 accent-blue-500"
              />
              <span>
                <span className="block text-sm font-bold text-[#0f172a]">All agents</span>
                <span className="block text-xs text-[#64748b]">
                  Every agent can sell this package whichever router they&apos;re on — including agents you add later.
                </span>
              </span>
            </label>

            {applyScope === "all" ? (
              <div className="rounded-xl border border-blue-200 bg-white p-3 text-xs text-[#475569]">
                <span data-testid="universal-note">
                  This is a universal package. It can be used on any router, so you don&apos;t pick one here. When you
                  create vouchers, choose the router (or site) they should work on. It automatically covers
                  routers and sites you add later.
                </span>
              </div>
            ) : businessLocations.length === 0 ? (
              <>
                <p className="mb-2 text-xs text-[#64748b]">
                  No sites configured yet, so pick routers directly.
                </p>
                <div className="mb-2 flex items-center justify-between">
                  <span className="text-xs font-semibold text-[#475569]">Routers / MikroTiks</span>
                  <div className="flex gap-3 text-xs font-semibold text-blue-600">
                    <button type="button" onClick={() => update("routerIps", routers.map((r) => r.ip))} className="hover:underline">
                      Select all
                    </button>
                    <button type="button" onClick={() => update("routerIps", [])} className="hover:underline">
                      Clear
                    </button>
                  </div>
                </div>
                <div className="grid gap-2 rounded-xl border border-blue-200 bg-white p-3 sm:grid-cols-2">
                  {routers.map((router) => (
                    <label
                      key={router.ip}
                      className="flex items-center gap-2 rounded-lg px-2 py-1.5 text-sm text-[#475569] hover:bg-blue-50"
                    >
                      <input
                        type="checkbox"
                        checked={form.routerIps.includes(router.ip)}
                        onChange={() => toggleRouter(router.ip)}
                        className="h-4 w-4 rounded border-blue-300 accent-blue-600"
                      />
                      {router.name.split(" (")[0]}
                    </label>
                  ))}
                  {routers.length === 0 && (
                    <p className="text-sm text-[#94a3b8]">No routers available yet — add one first.</p>
                  )}
                </div>
              </>
            ) : (
              <>
                <label className="mb-3 block">
                  <span className="mb-1.5 block text-xs font-semibold text-[#475569]">
                    1. Choose the site / business
                  </span>
                  <select
                    value={selectedSiteId}
                    onChange={(event) => handleSiteChange(event.target.value)}
                    className="h-11 w-full rounded-xl border-2 border-blue-300 bg-white px-3 text-sm font-semibold text-[#0f172a] outline-none focus:border-blue-500"
                  >
                    {businessLocations.map((site) => (
                      <option key={site.id} value={site.id}>
                        {site.name}
                      </option>
                    ))}
                  </select>
                </label>

                <div className="mb-2 flex items-center justify-between">
                  <span className="text-xs font-semibold text-[#475569]">
                    2. Choose the routers under{" "}
                    {businessLocations.find((s) => s.id === selectedSiteId)?.name ?? "this site"}
                  </span>
                  <div className="flex gap-3 text-xs font-semibold text-blue-600">
                    <button type="button" onClick={() => update("routerIps", siteRouterIps)} className="hover:underline">
                      Select all
                    </button>
                    <button type="button" onClick={() => update("routerIps", [])} className="hover:underline">
                      Clear
                    </button>
                  </div>
                </div>

                {siteRouters.length === 0 ? (
                  <div className="rounded-xl border border-dashed border-blue-300 bg-white p-3 text-xs text-[#64748b]">
                    This site has no routers yet — add one first, or choose a different site.
                  </div>
                ) : (
                  <div className="grid gap-2 rounded-xl border border-blue-200 bg-white p-3 sm:grid-cols-2">
                    {siteRouters.map((router) => (
                      <label
                        key={router.ip}
                        className="flex items-center gap-2 rounded-lg px-2 py-1.5 text-sm text-[#475569] hover:bg-blue-50"
                      >
                        <input
                          type="checkbox"
                          checked={form.routerIps.includes(router.ip)}
                          onChange={() => toggleRouter(router.ip)}
                          className="h-4 w-4 rounded border-blue-300 accent-blue-600"
                        />
                        {router.name.split(" (")[0]}
                      </label>
                    ))}
                  </div>
                )}

                <p className="mt-2 text-xs font-semibold text-blue-700">
                  {form.routerIps.length === 0
                    ? "No routers selected yet."
                    : form.routerIps.length === siteRouterIps.length && siteRouterIps.length > 0
                      ? `Applied to the whole site — all ${siteRouterIps.length} router${siteRouterIps.length === 1 ? "" : "s"}.`
                      : `Applied to ${form.routerIps.length} of ${siteRouterIps.length} routers on this site.`}
                </p>
              </>
            )}
            {form.routerIps.length === 0 && (
              <span className="mt-1 block text-xs text-red-600">Select at least one router.</span>
            )}
            <span className="mt-2 block text-xs text-[#64748b]">
              Every package must belong to at least one router. Customers on
              routers not selected here won&apos;t see this package.
            </span>
          </div>
            </>
          )}

          <div className="grid gap-4 sm:grid-cols-2">
            <label className="block">
              <span className="mb-2 block text-sm font-semibold text-[#475569]">
                Duration <span className="text-red-500">*</span>
              </span>
              <input
                required
                type="number"
                min={1}
                value={form.durationValue}
                onChange={(event) =>
                  update("durationValue", Number(event.target.value))
                }
                className="h-11 w-full rounded-xl border border-[#e2e8f0] bg-white px-3 text-sm outline-none focus:border-[#2563eb]"
              />
            </label>

            <label className="block">
              <span className="mb-2 block text-sm font-semibold text-[#475569]">
                Unit <span className="text-red-500">*</span>
              </span>
              <select
                value={form.durationUnit}
                onChange={(event) =>
                  update("durationUnit", event.target.value as PackageDurationUnit)
                }
                className="h-11 w-full rounded-xl border border-[#e2e8f0] bg-white px-3 text-sm outline-none focus:border-[#2563eb]"
              >
                {DURATION_UNITS.map((unit) => (
                  <option key={unit} value={unit}>
                    {unit}
                  </option>
                ))}
              </select>
            </label>
          </div>

          <label className="block">
            <span className="mb-2 block text-sm font-semibold text-[#475569]">
              Description
            </span>
            <textarea
              value={form.description}
              onChange={(event) => update("description", event.target.value)}
              rows={2}
              placeholder="Optional description for this package"
              className="w-full rounded-xl border border-[#e2e8f0] bg-white px-3 py-2.5 text-sm outline-none focus:border-[#2563eb]"
            />
          </label>
        </div>
      </section>

      {/* Speed & Performance */}
      <section className="rounded-2xl border-2 border-blue-100 bg-blue-50 p-6 shadow-[0_8px_24px_rgba(37,99,235,0.06)] md:p-8">
        <SectionHeader
          icon={Gauge}
          title="Speed & Performance"
          subtitle="Configure speeds, limits and performance settings."
          color="bg-blue-500"
        />

        <div className="grid gap-4 sm:grid-cols-2">
          <div className="block sm:col-span-2" data-testid="speed-field">
            <span className="mb-2 block text-sm font-semibold text-[#475569]">Speed (upload / download)</span>
            <input
              data-testid="speed-input"
              value={speedText}
              onChange={(event) => {
                const text = event.target.value;
                setSpeedText(text);
                const parsed = parseSpeed(text);
                if (!("error" in parsed)) {
                  update("uploadMbps", parsed.uploadMbps);
                  update("downloadMbps", parsed.downloadMbps);
                }
              }}
              placeholder="10M/10M"
              className={`h-11 w-full rounded-xl border bg-white px-3 font-mono text-sm outline-none focus:border-[#2563eb] ${
                speedError ? "border-[#b91c1c]" : "border-[#e2e8f0]"
              }`}
            />
            <p className="mt-1 text-xs text-[#94a3b8]">
              Write it as upload/download, e.g. <span className="font-mono">10M/10M</span> or{" "}
              <span className="font-mono">5M/20M</span>. Leave it empty to give the package the best speed available.
            </p>
            {speedError ? (
              <p data-testid="speed-error" className="mt-2 rounded-lg bg-[#fef2f2] p-2.5 text-xs font-semibold text-[#b91c1c]">
                {speedError}
              </p>
            ) : (
              <p
                data-testid="speed-note"
                className="mt-2 inline-flex rounded-lg bg-[#f1f5f9] px-2.5 py-1 text-xs font-bold text-[#1d4ed8]"
              >
                {form.uploadMbps > 0
                  ? `Upload ${speedLabel(form.uploadMbps)} · Download ${speedLabel(form.downloadMbps)}`
                  : "Best speed — no speed limit on this package."}
              </p>
            )}
          </div>

          <div className="block sm:col-span-2" data-testid="data-policy">
            <span className="mb-2 block text-sm font-semibold text-[#475569]">Data Policy</span>
            <div className="grid gap-3 sm:grid-cols-[1fr_140px]">
              <input
                type="number"
                min={0}
                step="any"
                data-testid="data-cap-input"
                value={form.fupValue ?? ""}
                onChange={(event) => {
                  const text = event.target.value;
                  const amount = Number(text);
                  // Empty (or 0) means no cap: the package is unlimited.
                  update("fupValue", text === "" || !(amount > 0) ? null : amount);
                }}
                placeholder="Unlimited — leave empty, or enter an amount e.g. 10"
                className="h-11 w-full rounded-xl border border-[#e2e8f0] bg-white px-3 text-sm outline-none focus:border-[#2563eb]"
              />
              <select
                data-testid="data-cap-unit"
                value={form.fupUnit}
                onChange={(event) => update("fupUnit", event.target.value as "MB" | "GB")}
                disabled={form.fupValue === null}
                className="h-11 w-full rounded-xl border border-[#e2e8f0] bg-white px-3 text-sm outline-none focus:border-[#2563eb] disabled:bg-[#f1f5f9] disabled:text-[#94a3b8]"
              >
                <option value="MB">MB</option>
                <option value="GB">GB</option>
              </select>
            </div>
            <p className="mt-2 text-xs text-[#94a3b8]" data-testid="data-policy-help">
              <strong className="text-[#475569]">Empty</strong> = unlimited data.{" "}
              <strong className="text-[#475569]">Enter a number</strong> = the package is limited to that amount of data.
            </p>
            <p
              data-testid="data-policy-note"
              className={`mt-2 inline-flex rounded-lg px-2.5 py-1 text-xs font-bold ${
                form.fupValue === null ? "bg-[#f1f5f9] text-[#1d4ed8]" : "bg-[#fffbeb] text-[#92400e]"
              }`}
            >
              {form.fupValue === null
                ? "Unlimited — no data cap, speed limits above still apply."
                : `Data cap: ${form.fupValue} ${form.fupUnit} — internet access stops once it is used up.`}
            </p>
          </div>
        </div>

        <div className="mt-5 rounded-xl border border-[#f1f5f9] bg-[#ffffff] p-4">
          <label className="mb-4 flex items-center justify-between gap-3">
            <div>
              <span className="text-sm font-bold text-[#0f172a]">Throttle instead of cutting off</span>
              <p className="text-xs text-[#94a3b8]">
                Once a user on this package reaches the data amount below,
                slow them down instead of stopping their access entirely.
                This applies to every voucher generated from this package.
              </p>
            </div>
            <button
              type="button"
              onClick={() => update("throttleEnabled", !form.throttleEnabled)}
              className={`relative h-6 w-11 shrink-0 rounded-full transition ${
                form.throttleEnabled ? "bg-amber-500" : "bg-[#e2e8f0]"
              }`}
            >
              <span
                className={`absolute top-0.5 h-5 w-5 rounded-full bg-white shadow transition-transform ${
                  form.throttleEnabled ? "translate-x-5" : "translate-x-0.5"
                }`}
              />
            </button>
          </label>

          {form.throttleEnabled && (
            <div className="grid gap-4 sm:grid-cols-3">
              <label className="block">
                <span className="mb-2 block text-xs font-semibold text-[#475569]">Throttle at</span>
                <input
                  type="number"
                  min={0}
                  value={form.throttleAtValue ?? ""}
                  onChange={(event) =>
                    update(
                      "throttleAtValue",
                      event.target.value === "" ? null : Number(event.target.value),
                    )
                  }
                  placeholder="e.g. 5"
                  className="h-11 w-full rounded-xl border border-[#e2e8f0] bg-white px-3 text-sm outline-none focus:border-[#2563eb]"
                />
              </label>
              <label className="block">
                <span className="mb-2 block text-xs font-semibold text-[#475569]">Unit</span>
                <select
                  value={form.throttleAtUnit}
                  onChange={(event) => update("throttleAtUnit", event.target.value as "MB" | "GB")}
                  className="h-11 w-full rounded-xl border border-[#e2e8f0] bg-white px-3 text-sm outline-none focus:border-[#2563eb]"
                >
                  <option value="MB">MB</option>
                  <option value="GB">GB</option>
                </select>
              </label>
              <label className="block">
                <span className="mb-2 block text-xs font-semibold text-[#475569]">Throttled speed (Mbps)</span>
                <input
                  type="number"
                  min={0.5}
                  step={0.5}
                  value={form.throttleSpeedMbps}
                  onChange={(event) => update("throttleSpeedMbps", Number(event.target.value))}
                  className="h-11 w-full rounded-xl border border-[#e2e8f0] bg-white px-3 text-sm outline-none focus:border-[#2563eb]"
                />
              </label>
              <p className="text-xs text-[#94a3b8] sm:col-span-3">
                E.g. "Throttle at 5 GB, speed 1 Mbps" — the user keeps
                browsing after 5 GB, just much slower, instead of being
                disconnected. Leave this off and the Data Cap above still
                works as a hard cutoff.
              </p>
            </div>
          )}
        </div>
      </section>

      {/* Pricing & Devices */}
      <section className="rounded-2xl border-2 border-emerald-100 bg-emerald-50 p-6 shadow-[0_8px_24px_rgba(37,99,235,0.06)] md:p-8">
        <SectionHeader
          icon={Wallet}
          title="Pricing & Devices"
          subtitle="Set package pricing and device limits."
          color="bg-emerald-500"
        />

        <label className="mb-5 flex items-start justify-between gap-3 rounded-xl border border-[#f1f5f9] bg-[#ffffff] px-4 py-3">
          <div>
            <span className="text-sm font-semibold text-[#475569]">
              Free Trial Package
            </span>
            <p className="text-xs text-[#94a3b8]">
              Only one active free trial is allowed. Enabling this sets the
              price to 0.
            </p>
          </div>
          <Switch
            checked={form.freeTrial}
            color="pink"
            onChange={() => {
              const next = !form.freeTrial;
              update("freeTrial", next);
              if (next) update("price", `${sym()} 0.00`);
            }}
          />
        </label>

        <div className="grid gap-4 sm:grid-cols-2">
          <label className="block">
            <span className="mb-2 block text-sm font-semibold text-[#475569]">
              Price of the package <span className="text-red-500">*</span>
            </span>
            <div className="flex overflow-hidden rounded-xl border border-[#e2e8f0] focus-within:border-[#2563eb]">
              <span className="flex items-center bg-[#ffffff] px-3 text-xs font-semibold text-[#64748b]">
                {sym()}
              </span>
              <input
                required
                disabled={form.freeTrial}
                value={form.price}
                onChange={(event) => update("price", event.target.value)}
                placeholder={sym()}
                className="h-11 w-full px-3 text-sm outline-none disabled:bg-[#ffffff] disabled:text-[#94a3b8]"
              />
            </div>
            <span className="mt-1 block text-xs text-[#94a3b8]">
              Enter the package price.
            </span>
          </label>

          <label className="block">
            <span className="mb-2 block text-sm font-semibold text-[#475569]">
              Devices <span className="text-red-500">*</span>
            </span>
            <input
              type="number"
              min={1}
              step={1}
              data-testid="devices-input"
              value={devicesText}
              onChange={(event) => {
                // Free typing: wipe it and type any number. Empty or invalid
                // counts as the default of 1 device.
                const text = event.target.value;
                setDevicesText(text);
                const amount = Math.floor(Number(text));
                update("devices", amount >= 1 ? amount : 1);
              }}
              onBlur={() => setDevicesText(String(form.devices))}
              placeholder="1"
              className="h-11 w-full rounded-xl border border-[#e2e8f0] bg-white px-3 text-sm outline-none focus:border-[#2563eb]"
            />
            <span className="mt-1 block text-xs text-[#94a3b8]">
              Devices one user can connect at the same time. Default is 1 — clear it and type the number you want.
            </span>
          </label>
        </div>
      </section>

      {/* Advanced Features — plain toggles, single section */}
      <PackageCapabilities form={form} update={update} actingAgent={actingAgent} />

      {/* Availability & Visibility — controls beside a live customer preview */}
      <PackageStorefront form={form} update={update} />

      <div className="flex flex-wrap gap-3 rounded-2xl border-2 border-dashed border-[#e2e8f0] bg-[#ffffff] p-5">
        <button
          type="submit"
          disabled={!hasValidTargets || priceOverCap || !!speedError}
          className="rounded-full bg-emerald-600 px-7 py-3 text-sm font-bold text-white  transition hover:-translate-y-0.5 hover:bg-emerald-700 disabled:cursor-not-allowed disabled:opacity-50 disabled:hover:translate-y-0"
        >
          {submitLabel}
        </button>
        {onSubmitAndCreateAnother && (
          <button
            type="button"
            onClick={handleSubmitAndCreateAnother}
            disabled={!hasValidTargets || priceOverCap || !!speedError}
            className="rounded-full border-2 border-blue-400 bg-white px-7 py-3 text-sm font-bold text-blue-600 transition hover:bg-blue-50 disabled:cursor-not-allowed disabled:opacity-50"
          >
            Create &amp; create another
          </button>
        )}
      </div>
    </form>
  );
}
