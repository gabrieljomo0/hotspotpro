"use client";

// The popup for generating a new batch of vouchers: package, batch
// reference, code format/length/prefix, quantity, and a giveaway toggle.
// If the selected package's agent has wallet-funding turned on, this
// shows a hint about the balance capping how many they can generate.
//
// Presets: pick a saved one at the top to instantly fill the form, or
// flip "Save these settings as a preset" to store this exact setup for
// next time — both happen right here, in one submit, no extra screen.
// Pushing a freshly-created batch to agents lives on the batch page
// itself (any time after creation), not in this form.

import { sym, localizeAmountString } from "@/components/dashboard/shared/currency";
import { useState, useEffect, type FormEvent } from "react";
import Link from "next/link";
import { X, Sparkles, Wallet, Building2, Plus } from "lucide-react";

import { useDashboard } from "../context/DashboardContext";
import type { VoucherCodeFormat } from "../shared/types";

export function GenerateVouchersModal({
  open,
  onClose,
  onGenerated,
  initialPresetId,
  actingAgentId,
}: {
  open: boolean;
  onClose: () => void;
  onGenerated: (batchId: string) => void;
  // The agent portal passes its own agent so the batch, wallet and any
  // saved preset are attributed to them, not to whoever the admin
  // dashboard currently has selected. Omitted = the current agent.
  actingAgentId?: string;
  // When set, the form pre-fills from this preset the moment the modal
  // opens — used by the Presets page's "Generate" button.
  initialPresetId?: string;
}) {
  const {
    packages: allPackages,
    generateVoucherBatch,
    currentAgent: contextAgent,
    getMaxAffordableVouchers,
    routers,
    businessLocations,
    agents,
    voucherPresets,
    saveVoucherPreset,
  } = useDashboard();

  const currentAgent =
    (actingAgentId ? agents.find((a) => a.id === actingAgentId) : undefined) ?? contextAgent;

  // Admin can generate from any package. An agent only gets what they
  // may sell: packages on their router, all-site packages, or ones admin
  // pushed to them — never the rest of the account's catalogue.
  const packages = currentAgent.isDefault
    ? allPackages
    : allPackages.filter(
        (p) =>
          p.status === "Active" &&
          (p.applyToAllSites ||
            (currentAgent.routerIp !== null && p.routerIps.includes(currentAgent.routerIp)) ||
            p.pushedToAgentIds.includes(currentAgent.id)),
      );

  const isLockedToDefaultPackage = currentAgent.dashboardMode === "voucherCreator" && !!currentAgent.defaultPackageName;
  const [packageName, setPackageName] = useState(
    isLockedToDefaultPackage ? currentAgent.defaultPackageName! : packages[0]?.name ?? "",
  );
  const [reference, setReference] = useState("");
  const [loginMethod, setLoginMethod] = useState<"code" | "credentials">("code");
  const [codeFormat, setCodeFormat] = useState<VoucherCodeFormat>("uppercase");
  const [codeLength, setCodeLength] = useState(6);
  const [quantity, setQuantity] = useState(60);
  const [prefix, setPrefix] = useState("");
  const [note, setNote] = useState("");
  const [isGiveaway, setIsGiveaway] = useState(false);
  const [routerIps, setRouterIps] = useState<string[]>(
    packages[0]?.routerIps.length ? packages[0].routerIps : routers[0] ? [routers[0].ip] : [],
  );
  const [routersTouchedManually, setRoutersTouchedManually] = useState(false);
  const [selectedPresetId, setSelectedPresetId] = useState("");
  const [saveAsPreset, setSaveAsPreset] = useState(false);
  const [presetName, setPresetName] = useState("");

  function applyPreset(presetId: string) {
    setSelectedPresetId(presetId);
    if (!presetId) return;
    const preset = voucherPresets.find((p) => p.id === presetId);
    if (!preset) return;
    setPackageName(preset.packageName);
    setQuantity(preset.quantity);
    setCodeFormat(preset.codeFormat);
    setCodeLength(preset.codeLength);
    setPrefix(preset.prefix);
    setLoginMethod(preset.loginMethod);
    setIsGiveaway(preset.isGiveaway);
    if (preset.routerIps.length > 0) {
      setRouterIps(preset.routerIps);
      setRoutersTouchedManually(true);
    }
  }

  useEffect(() => {
    if (open && initialPresetId) {
      applyPreset(initialPresetId);
    }
    // Only re-run when the modal opens or the requested preset changes —
    // not on every keystroke inside the form.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, initialPresetId]);

  const selectedPackage = packages.find((p) => p.name === packageName);
  const selectedPackageSite = selectedPackage?.applySiteId
    ? businessLocations.find((s) => s.id === selectedPackage.applySiteId)
    : null;

  const sites = businessLocations.map((site) => ({
    site,
    siteRouters: routers.filter((r) => r.siteId === site.id),
  }));
  const unassignedRouters = routers.filter((r) => !businessLocations.some((s) => s.id === r.siteId));

  function handlePackageChange(name: string) {
    setPackageName(name);
    if (routersTouchedManually) return;
    const pkg = packages.find((p) => p.name === name);
    if (pkg && pkg.routerIps.length > 0) {
      setRouterIps(pkg.routerIps);
    }
  }

  function toggleRouter(ip: string) {
    setRoutersTouchedManually(true);
    setRouterIps((current) =>
      current.includes(ip) ? current.filter((r) => r !== ip) : [...current, ip],
    );
  }

  function toggleSite(siteRouterIps: string[]) {
    setRoutersTouchedManually(true);
    const allSelected = siteRouterIps.every((ip) => routerIps.includes(ip));
    setRouterIps((current) =>
      allSelected
        ? current.filter((ip) => !siteRouterIps.includes(ip))
        : [...new Set([...current, ...siteRouterIps])],
    );
  }

  if (!open) return null;

  const maxAffordable = packageName
    ? getMaxAffordableVouchers(currentAgent.id, packageName)
    : null;

  // An agent belongs to ONE router, assigned by admin — so an agent never
  // picks a router/site or any of the batch details. They choose a package
  // and a quantity; everything else is fixed for them.
  const isAgentMode = !currentAgent.isDefault;
  const effectiveRouterIps = isAgentMode
    ? currentAgent.routerIp
      ? [currentAgent.routerIp]
      : []
    : routerIps;
  const agentRouterName = isAgentMode
    ? routers.find((r) => r.ip === currentAgent.routerIp)?.name.split(" (")[0] ?? null
    : null;

  function handleSubmit(event: FormEvent) {
    event.preventDefault();
    if (!packageName || effectiveRouterIps.length === 0) return;

    const batch = generateVoucherBatch({
      packageName,
      reference,
      quantity: Math.max(1, Math.min(500, quantity)),
      codeFormat,
      codeLength,
      prefix: prefix.slice(0, 1),
      note,
      isGiveaway,
      routerIps: effectiveRouterIps,
      assignedAgentIds: [],
      loginMethod,
      actingAgentId: currentAgent.id,
    });

    if (!batch) return;

    if (saveAsPreset && presetName.trim()) {
      saveVoucherPreset({
        name: presetName.trim(),
        packageName,
        quantity,
        codeFormat,
        codeLength,
        prefix,
        loginMethod,
        isGiveaway,
        routerIps: effectiveRouterIps,
      }, currentAgent.id);
    }

    setReference("");
    setNote("");
    setPrefix("");
    setIsGiveaway(false);
    setSaveAsPreset(false);
    setPresetName("");
    onGenerated(batch.id);
  }

  return (
    <div className="fixed inset-0 z-[220] flex items-center justify-center bg-slate-950/50 p-4">
      <button
        type="button"
        aria-label="Close"
        className="absolute inset-0"
        onClick={onClose}
      />

      <div className="relative z-10 max-h-[90vh] w-full max-w-xl overflow-y-auto rounded-2xl bg-white shadow-2xl">
        <div className="sticky top-0 flex items-center justify-between border-b border-[#f1f5f9] bg-white px-6 py-5">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-[#2563eb] text-white">
              <Sparkles size={18} />
            </div>
            <div>
              <h2 className="text-base font-bold text-[#0f172a]">
                Generate Vouchers
              </h2>
              <p className="text-xs text-[#64748b]">
                {isAgentMode
                  ? "Pick a package and how many vouchers you need."
                  : "Create the batch here. You'll choose a print design next."}
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg p-1.5 text-[#64748b] hover:bg-[#ffffff]"
          >
            <X size={18} />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-5 px-6 py-6">
          <label className="block">
            <div className="mb-2 flex items-center justify-between gap-2">
              <span className="text-sm font-semibold text-[#475569]">
                Package <span className="text-red-500">*</span>
              </span>
              {!isLockedToDefaultPackage &&
                (currentAgent.isDefault || currentAgent.permissions["packages.create"] === "Allowed") && (
                <Link
                  href={currentAgent.isDefault ? "/dashboards/packages/create" : `/agent-portal/${currentAgent.id}/packages/create`}
                  className="inline-flex items-center gap-1 text-xs font-bold text-emerald-600 hover:underline"
                >
                  <Plus size={12} />
                  Create Package
                </Link>
              )}
            </div>
            {packages.length === 0 ? (
              <div className="rounded-xl border-2 border-dashed border-amber-300 bg-amber-50 px-4 py-3 text-sm">
                <p className="font-semibold text-amber-800">
                  {currentAgent.isDefault ? "No packages yet." : "No packages available to you yet."}
                </p>
                <p className="mt-1 text-xs text-amber-700">
                  {currentAgent.isDefault || currentAgent.permissions["packages.create"] === "Allowed"
                    ? "Create one using the link above — its site/router will auto-fill here after."
                    : "Ask admin to push a package to you — you'll be able to generate from it straight away."}
                </p>
              </div>
            ) : isLockedToDefaultPackage ? (
              <div className="flex items-center justify-between gap-2 rounded-xl border-2 border-emerald-300 bg-white px-4 py-3">
                <span className="text-sm font-bold text-emerald-800">{packageName}</span>
                <span className="rounded-full bg-emerald-600 px-2 py-0.5 text-[10px] font-bold text-white">
                  Your default package
                </span>
              </div>
            ) : (
              <>
                <select
                  required
                  value={packageName}
                  onChange={(event) => handlePackageChange(event.target.value)}
                  className="h-11 w-full rounded-xl border-2 border-emerald-300 bg-white px-3 text-sm outline-none focus:border-emerald-500"
                >
                  <option value="" disabled>
                    Select an option
                  </option>
                  {packages.map((pkg) => (
                    <option key={pkg.id} value={pkg.name}>
                      {pkg.name} · {localizeAmountString(pkg.price)}
                    </option>
                  ))}
                </select>
                {selectedPackage && (
                  <p className="mt-1 text-xs text-emerald-700">
                    Router{selectedPackage.routerIps.length === 1 ? "" : "s"} auto-filled below
                    {selectedPackageSite ? ` (${selectedPackageSite.name})` : selectedPackage.applyToAllSites ? " (all sites)" : ""}.
                  </p>
                )}
                {currentAgent.requiresWalletFunding && (
                  <p className="mt-2 flex items-center gap-1.5 text-xs font-semibold text-amber-700">
                    <Wallet size={13} />
                    {maxAffordable !== null
                      ? `Your wallet (${sym()} ${currentAgent.walletBalance.toLocaleString()}) covers up to ${maxAffordable} of this voucher.`
                      : "Your wallet balance limits how many vouchers you can generate."}
                  </p>
                )}
              </>
            )}
          </label>

          {!isAgentMode && (
          <div className="block">
            <span className="mb-2 block text-sm font-semibold text-[#475569]">
              How customers log in <span className="text-red-500">*</span>
            </span>
            <div className="grid gap-2 sm:grid-cols-2">
              <button
                type="button"
                onClick={() => setLoginMethod("code")}
                className={`rounded-xl border-2 p-3 text-left transition ${
                  loginMethod === "code" ? "border-[#2563eb] bg-[#f1f5f9]" : "border-[#e2e8f0] bg-white hover:bg-[#ffffff]"
                }`}
              >
                <p className="text-sm font-bold text-[#0f172a]">Single Code</p>
                <p className="text-xs text-[#64748b]">One code to type in and connect.</p>
              </button>
              <button
                type="button"
                onClick={() => setLoginMethod("credentials")}
                className={`rounded-xl border-2 p-3 text-left transition ${
                  loginMethod === "credentials" ? "border-[#2563eb] bg-[#f1f5f9]" : "border-[#e2e8f0] bg-white hover:bg-[#ffffff]"
                }`}
              >
                <p className="text-sm font-bold text-[#0f172a]">Username &amp; Password</p>
                <p className="text-xs text-[#64748b]">Two fields, like a PPPoE login.</p>
              </button>
            </div>
          </div>
          )}

          <div className={`grid gap-4 ${isAgentMode ? "" : "sm:grid-cols-2"}`}>
            {!isAgentMode && (
            <label className="block">
              <span className="mb-2 block text-sm font-semibold text-[#475569]">
                Batch Reference
              </span>
              <input
                value={reference}
                onChange={(event) => setReference(event.target.value)}
                placeholder="Generated automatically when empty"
                className="h-11 w-full rounded-xl border border-[#e2e8f0] bg-white px-3 text-sm outline-none focus:border-[#2563eb]"
              />
            </label>
            )}

            {!isAgentMode && (
            <label className="block">
              <span className="mb-2 block text-sm font-semibold text-[#475569]">
                Prefix
              </span>
              <input
                value={prefix}
                onChange={(event) => setPrefix(event.target.value)}
                maxLength={1}
                placeholder="None"
                className="h-11 w-full rounded-xl border border-[#e2e8f0] bg-white px-3 text-sm outline-none focus:border-[#2563eb]"
              />
              <span className="mt-1 block text-xs text-[#94a3b8]">
                Optional. 1 letter max.
              </span>
            </label>
            )}

            {!isAgentMode && (
            <label className="block">
              <span className="mb-2 block text-sm font-semibold text-[#475569]">
                Code Format <span className="text-red-500">*</span>
              </span>
              <select
                value={codeFormat}
                onChange={(event) =>
                  setCodeFormat(event.target.value as VoucherCodeFormat)
                }
                className="h-11 w-full rounded-xl border border-[#e2e8f0] bg-white px-3 text-sm outline-none focus:border-[#2563eb]"
              >
                <option value="uppercase">Uppercase (A-Z, 0-9)</option>
                <option value="lowercase">Lowercase (a-z, 0-9)</option>
                <option value="mixed">Mixed Case (a-zA-Z, 0-9)</option>
                <option value="numeric">Numeric only (0-9)</option>
              </select>
            </label>
            )}

            {!isAgentMode && (
            <label className="block">
              <span className="mb-2 block text-sm font-semibold text-[#475569]">
                Code Length <span className="text-red-500">*</span>
              </span>
              <select
                value={codeLength}
                onChange={(event) => setCodeLength(Number(event.target.value))}
                className="h-11 w-full rounded-xl border border-[#e2e8f0] bg-white px-3 text-sm outline-none focus:border-[#2563eb]"
              >
                {[4, 5, 6, 7, 8].map((len) => (
                  <option key={len} value={len}>
                    {len} characters
                  </option>
                ))}
              </select>
              <span className="mt-1 block text-xs text-[#94a3b8]">
                Longer codes are harder to guess.
              </span>
            </label>
            )}

            <label className="block">
              <span className="mb-2 block text-sm font-semibold text-[#475569]">
                Quantity <span className="text-red-500">*</span>
              </span>
              <input
                type="number"
                required
                min={1}
                max={500}
                value={quantity}
                onChange={(event) => setQuantity(Number(event.target.value))}
                className="h-11 w-full rounded-xl border border-[#e2e8f0] bg-white px-3 text-sm outline-none focus:border-[#2563eb]"
              />
              <span className="mt-1 block text-xs text-[#94a3b8]">
                {isAgentMode
                  ? agentRouterName
                    ? `Created for your router: ${agentRouterName}.`
                    : "Up to 500 per batch."
                  : "Up to 500 per batch."}
              </span>
            </label>
          </div>

          {!isAgentMode && (
          <label className="block">
            <span className="mb-2 block text-sm font-semibold text-[#475569]">
              Batch Note
            </span>
            <textarea
              value={note}
              onChange={(event) => setNote(event.target.value)}
              rows={2}
              placeholder="Optional message printed by..."
              className="w-full rounded-xl border border-[#e2e8f0] bg-white px-3 py-2.5 text-sm outline-none focus:border-[#2563eb]"
            />
          </label>
          )}

          {!isAgentMode && (
            <>
          <div className="block">
            <div className="mb-2 flex items-center justify-between">
              <span className="text-sm font-semibold text-[#475569]">
                Site &amp; Routers <span className="text-red-500">*</span>
              </span>
              {agents.length > 1 && (
                <div className="flex gap-3 text-xs font-semibold text-[#2563eb]">
                  <button type="button" onClick={() => setRouterIps(routers.map((r) => r.ip))} className="hover:underline">
                    Select all
                  </button>
                </div>
              )}
            </div>

            {agents.length <= 1 ? (
              <div className="rounded-xl border border-[#e2e8f0] bg-[#ffffff] p-2.5">
                {routerIps.length > 0 ? (
                  <p className="text-xs text-[#475569]">
                    Using your router{routerIps.length === 1 ? "" : "s"}:{" "}
                    <span className="font-semibold text-[#0f172a]">
                      {routerIps
                        .map((ip) => routers.find((r) => r.ip === ip)?.name.split(" (")[0] ?? ip)
                        .join(", ")}
                    </span>
                  </p>
                ) : (
                  <p className="text-xs text-[#94a3b8]">No router available yet — add one first.</p>
                )}
              </div>
            ) : (
            <div className="max-h-48 space-y-2 overflow-y-auto rounded-xl border border-[#e2e8f0] bg-white p-2.5">
              {sites.map(({ site, siteRouters }) => {
                const allSelected = siteRouters.length > 0 && siteRouters.every((r) => routerIps.includes(r.ip));
                return (
                  <div key={site.id} className="rounded-lg border border-[#f1f5f9] p-2">
                    <div className="mb-1 flex items-center justify-between gap-2">
                      <span className="flex items-center gap-1.5 text-[11px] font-bold uppercase tracking-wide text-[#475569]">
                        <Building2 size={11} />
                        {site.name}
                      </span>
                      {siteRouters.length > 0 && (
                        <button
                          type="button"
                          onClick={() => toggleSite(siteRouters.map((r) => r.ip))}
                          className="text-[10px] font-semibold text-[#2563eb] hover:underline"
                        >
                          {allSelected ? "Unselect site" : "Select whole site"}
                        </button>
                      )}
                    </div>
                    {siteRouters.length === 0 ? (
                      <p className="px-1 text-xs text-[#94a3b8]">No routers here yet.</p>
                    ) : (
                      <div className="grid gap-1 sm:grid-cols-2">
                        {siteRouters.map((r) => (
                          <label key={r.ip} className="flex items-center gap-2 rounded px-1.5 py-1 text-xs text-[#475569] hover:bg-[#ffffff]">
                            <input
                              type="checkbox"
                              checked={routerIps.includes(r.ip)}
                              onChange={() => toggleRouter(r.ip)}
                              className="h-3.5 w-3.5 rounded border-[#e2e8f0] accent-[#2563eb]"
                            />
                            {r.name.split(" (")[0]}
                          </label>
                        ))}
                      </div>
                    )}
                  </div>
                );
              })}
              {unassignedRouters.length > 0 && (
                <div className="rounded-lg border border-[#f1f5f9] p-2">
                  <span className="mb-1 block text-[11px] font-bold uppercase tracking-wide text-[#475569]">
                    No site assigned
                  </span>
                  <div className="grid gap-1 sm:grid-cols-2">
                    {unassignedRouters.map((r) => (
                      <label key={r.ip} className="flex items-center gap-2 rounded px-1.5 py-1 text-xs text-[#475569] hover:bg-[#ffffff]">
                        <input
                          type="checkbox"
                          checked={routerIps.includes(r.ip)}
                          onChange={() => toggleRouter(r.ip)}
                          className="h-3.5 w-3.5 rounded border-[#e2e8f0] accent-[#2563eb]"
                        />
                        {r.name.split(" (")[0]}
                      </label>
                    ))}
                  </div>
                </div>
              )}
              {routers.length === 0 && <p className="text-xs text-[#94a3b8]">No routers available yet.</p>}
            </div>
            )}
            {routerIps.length === 0 && (
              <span className="mt-1 block text-xs text-red-600">Select at least one router.</span>
            )}
          </div>

          <label className="flex items-center justify-between rounded-xl border border-[#f1f5f9] bg-[#ffffff] px-4 py-3">
            <div>
              <span className="text-sm font-semibold text-[#475569]">
                Mark as Giveaway
              </span>
              <p className="text-xs text-[#94a3b8]">
                Giveaway vouchers are excluded from revenue.
              </p>
            </div>
            <button
              type="button"
              onClick={() => setIsGiveaway((current) => !current)}
              className={`relative h-6 w-11 shrink-0 rounded-full transition ${
                isGiveaway ? "bg-emerald-500" : "bg-[#e2e8f0]"
              }`}
            >
              <span
                className={`absolute top-0.5 h-5 w-5 rounded-full bg-white shadow transition-transform ${
                  isGiveaway ? "translate-x-5" : "translate-x-0.5"
                }`}
              />
            </button>
          </label>
            </>
          )}

          {(currentAgent.isDefault || currentAgent.permissions["voucher.presets"] === "Allowed") && (
          <div className="rounded-xl border-2 border-blue-200 bg-white p-4">
            <label className="flex items-center justify-between">
              <div>
                <span className="text-sm font-semibold text-[#475569]">
                  Save these settings as a preset
                </span>
                <p className="text-xs text-[#64748b]">
                  Reuse this exact package, quantity, code format and router selection next time.
                </p>
              </div>
              <button
                type="button"
                onClick={() => setSaveAsPreset((current) => !current)}
                className={`relative h-6 w-11 shrink-0 rounded-full transition ${
                  saveAsPreset ? "bg-blue-500" : "bg-[#e2e8f0]"
                }`}
              >
                <span
                  className={`absolute top-0.5 h-5 w-5 rounded-full bg-white shadow transition-transform ${
                    saveAsPreset ? "translate-x-5" : "translate-x-0.5"
                  }`}
                />
              </button>
            </label>
            {saveAsPreset && (
              <input
                autoFocus
                value={presetName}
                onChange={(event) => setPresetName(event.target.value)}
                placeholder={`e.g. "${packageName || "Package"} — ${quantity} codes"`}
                className="mt-3 h-11 w-full rounded-xl border border-blue-200 bg-white px-3 text-sm outline-none focus:border-blue-500"
              />
            )}
          </div>
          )}

          {isAgentMode && !currentAgent.routerIp && (
            <p className="rounded-xl border border-amber-300 bg-white px-4 py-3 text-sm text-amber-800">
              Your admin hasn&apos;t assigned you a router yet, so vouchers can&apos;t be created. Ask them to assign
              one.
            </p>
          )}

          <div className="flex gap-3">
            <button
              type="submit"
              disabled={effectiveRouterIps.length === 0 || !packageName || (maxAffordable !== null && maxAffordable <= 0)}
              className="flex-1 rounded-xl bg-amber-500 px-5 py-3 text-sm font-bold text-white  hover:bg-amber-600 disabled:cursor-not-allowed disabled:opacity-50"
            >
              Generate Vouchers
            </button>
            <button
              type="button"
              onClick={onClose}
              className="rounded-xl border border-[#e2e8f0] bg-white px-5 py-3 text-sm font-bold text-[#475569] hover:bg-[#ffffff]"
            >
              Cancel
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
