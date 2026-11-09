"use client";

import { localizeAmountString } from "@/components/dashboard/shared/currency";
import { useState, useEffect, type FormEvent } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import { ChevronRight, Building2, Plus } from "lucide-react";

import { useDashboard } from "@/components/dashboard/context/DashboardContext";
import { ConnectedAgentBanner } from "@/components/dashboard/agents/ConnectedAgentBanner";
import type { VoucherCodeFormat, VoucherCountFrom, VoucherLimitBy } from "@/components/dashboard/shared/types";
import { VoucherAllowanceFields } from "@/components/dashboard/vouchers/VoucherAllowanceFields";

export default function CreateVoucherPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { packages, generateVoucherBatch, routers, businessLocations, currentAgent, voucherPresets, saveVoucherPreset } =
    useDashboard();

  const isLockedToDefaultPackage = currentAgent.dashboardMode === "voucherCreator" && !!currentAgent.defaultPackageName;
  const [packageName, setPackageName] = useState(isLockedToDefaultPackage ? currentAgent.defaultPackageName! : "");
  const [quantity, setQuantity] = useState(1);
  const [prefix, setPrefix] = useState("");
  const [codeLength, setCodeLength] = useState(4);
  const [codeFormat, setCodeFormat] = useState<VoucherCodeFormat>(
    "uppercase",
  );
  const [reference, setReference] = useState("");
  const [loginMethod, setLoginMethod] = useState<"code" | "credentials">("code");
  const [limitBy, setLimitBy] = useState<VoucherLimitBy>("both");
  const [countFrom, setCountFrom] = useState<VoucherCountFrom>("signin");
  const [isGiveaway, setIsGiveaway] = useState(false);
  const [sendNotification, setSendNotification] = useState(false);
  const [notifyPhone, setNotifyPhone] = useState("");
  const [routerIps, setRouterIps] = useState<string[]>(() => {
    if (isLockedToDefaultPackage) {
      const pkg = packages.find((p) => p.name === currentAgent.defaultPackageName);
      if (pkg && pkg.routerIps.length > 0) return pkg.routerIps;
    }
    // Only one router on the whole account: use it. Otherwise it is picked below.
    return routers.length === 1 ? [routers[0].ip] : [];
  });
  const [siteKey, setSiteKey] = useState("");
  const [routersTouchedManually, setRoutersTouchedManually] = useState(false);
  const [selectedPresetId, setSelectedPresetId] = useState("");
  const [saveAsPreset, setSaveAsPreset] = useState(false);
  const [presetName, setPresetName] = useState("");

  const selectedPackage = packages.find((p) => p.name === packageName);
  // A universal package (no router chosen when it was made) can go on any
  // router. A package made for specific routers only offers those routers.
  const isUniversal = !!selectedPackage?.applyToAllSites;
  const pickable =
    selectedPackage && !isUniversal && selectedPackage.routerIps.length > 0
      ? routers.filter((r) => selectedPackage.routerIps.includes(r.ip))
      : routers;

  const selectedPackageSite = selectedPackage?.applySiteId
    ? businessLocations.find((s) => s.id === selectedPackage.applySiteId)
    : null;

  // Group routers by their site so the picker can show "Site name" as a
  // header with that site's routers checkable underneath, plus a
  // select-all for the whole site in one click.
  const sites = businessLocations.map((site) => ({
    site,
    siteRouters: pickable.filter((r) => r.siteId === site.id),
  }));
  const unassignedRouters = pickable.filter((r) => !businessLocations.some((s) => s.id === r.siteId));

  // Sites that actually have routers (plus routers with no site). The picker
  // only ever offers these, and skips choices that have nothing to choose.
  const groups = [
    ...sites.filter((g) => g.siteRouters.length > 0).map((g) => ({ key: g.site.id, name: g.site.name, groupRouters: g.siteRouters })),
    ...(unassignedRouters.length > 0 ? [{ key: "__none__", name: "No site assigned", groupRouters: unassignedRouters }] : []),
  ];
  const touchedGroups = groups.filter((g) => g.groupRouters.some((r) => routerIps.includes(r.ip)));
  const activeKey = siteKey || (touchedGroups.length > 1 ? "__all__" : touchedGroups[0]?.key ?? groups[0]?.key ?? "");
  const activeGroup = groups.find((g) => g.key === activeKey);
  const onlyOneRouter = pickable.length === 1;

  function chooseSite(key: string) {
    setSiteKey(key);
    setRoutersTouchedManually(true);
    if (key === "__all__") {
      setRouterIps(pickable.map((r) => r.ip));
      return;
    }
    const group = groups.find((g) => g.key === key);
    // One router in the site: pick it for them. Several: they choose.
    setRouterIps(group && group.groupRouters.length === 1 ? [group.groupRouters[0].ip] : []);
  }

  // Routers load a moment after the page opens. If nothing is picked yet and
  // there is nothing to choose between, pick the router automatically.
  useEffect(() => {
    if (routersTouchedManually || routerIps.length > 0 || siteKey) return;
    if (pickable.length === 1) setRouterIps([pickable[0].ip]);
    else if (groups.length === 1 && groups[0].groupRouters.length === 1) setRouterIps([groups[0].groupRouters[0].ip]);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [routers, businessLocations, selectedPackage?.id]);

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
    setLimitBy(preset.limitBy ?? "both");
    setCountFrom(preset.countFrom ?? "signin");
    setIsGiveaway(preset.isGiveaway);
    if (preset.routerIps.length > 0) {
      setSiteKey("");
      setRouterIps(preset.routerIps);
      setRoutersTouchedManually(true);
    }
  }

  useEffect(() => {
    const presetId = searchParams.get("preset");
    if (presetId) applyPreset(presetId);
    // Only run once on mount when arriving with a preset in the URL.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  function handlePackageChange(name: string) {
    setPackageName(name);
    // Infer the router/site straight from the package — that's already
    // where it's sold — instead of making the admin pick it again. If
    // they've already hand-adjusted the router selection, don't stomp on
    // their choice when just re-checking the package.
    const pkg = packages.find((p) => p.name === name);
    if (pkg?.applyToAllSites) {
      // Universal package: any router works, so the router is chosen here.
      if (!routersTouchedManually) {
        setSiteKey("");
        setRouterIps(routers.length === 1 ? [routers[0].ip] : []);
      }
      return;
    }
    if (routersTouchedManually) {
      // Keep their pick, but only routers this package is actually on.
      if (pkg && pkg.routerIps.length > 0) setRouterIps((current) => current.filter((ip) => pkg.routerIps.includes(ip)));
      return;
    }
    if (pkg && pkg.routerIps.length > 0) {
      setSiteKey("");
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

  function createBatch() {
    if (!packageName || routerIps.length === 0) return null;

    const batch = generateVoucherBatch({
      packageName,
      reference,
      quantity: Math.max(1, quantity),
      codeFormat,
      codeLength,
      prefix: prefix.slice(0, 1),
      note: sendNotification && notifyPhone ? `Notify: ${notifyPhone}` : "",
      isGiveaway,
      routerIps,
      assignedAgentIds: [],
      loginMethod,
      limitBy,
      countFrom,
    });

    if (batch && saveAsPreset && presetName.trim()) {
      saveVoucherPreset({
        name: presetName.trim(),
        packageName,
        quantity,
        codeFormat,
        codeLength,
        prefix,
        loginMethod,
        limitBy,
        countFrom,
        isGiveaway,
        routerIps,
      });
    }

    return batch;
  }

  function handleCreate(event: FormEvent) {
    event.preventDefault();
    const batch = createBatch();
    if (!batch) return;
    router.push(`/dashboards/vouchers/batch/${batch.id}`);
  }

  function handleCreateAndCreateAnother(event: FormEvent) {
    event.preventDefault();
    const batch = createBatch();
    if (!batch) return;
    // Reset only the identity fields, keep the settings for the next one
    setReference("");
    setSaveAsPreset(false);
    setPresetName("");
  }

  return (
    <section className="mx-auto w-full max-w-3xl">
      <div className="mb-4 flex items-center gap-1.5 text-xs text-[#a3a3a3]">
        <Link href="/dashboards/vouchers" className="hover:text-[#1a1a1a]">
          Vouchers
        </Link>
        <ChevronRight size={12} />
        <span className="text-[#525252]">Create</span>
      </div>

      <h1 className="mb-6 text-3xl font-black text-[#1a1a1a] md:text-4xl">
        Generate Vouchers
      </h1>

      <ConnectedAgentBanner />

      <form className="space-y-6 rounded-2xl border border-[#e6e6e6] bg-white p-6 shadow-[0_8px_24px_rgba(26,26,26,0.06)] md:p-8">
        <div className="block">
          <span className="mb-2 block text-sm font-semibold text-[#525252]">
            How customers log in <span className="text-red-500">*</span>
          </span>
          <div className="grid gap-2 sm:grid-cols-2">
            <button
              type="button"
              onClick={() => setLoginMethod("code")}
              className={`rounded-xl border-2 p-3 text-left transition ${
                loginMethod === "code" ? "border-[#1a1a1a] bg-[#f4f4f4]" : "border-[#e6e6e6] bg-white hover:bg-[#ffffff]"
              }`}
            >
              <p className="text-sm font-bold text-[#1a1a1a]">Single Code</p>
              <p className="text-xs text-[#737373]">One code to type in and connect.</p>
            </button>
            <button
              type="button"
              onClick={() => setLoginMethod("credentials")}
              className={`rounded-xl border-2 p-3 text-left transition ${
                loginMethod === "credentials" ? "border-[#1a1a1a] bg-[#f4f4f4]" : "border-[#e6e6e6] bg-white hover:bg-[#ffffff]"
              }`}
            >
              <p className="text-sm font-bold text-[#1a1a1a]">Username &amp; Password</p>
              <p className="text-xs text-[#737373]">Two fields, like a PPPoE login.</p>
            </button>
          </div>
        </div>

        <VoucherAllowanceFields
          limitBy={limitBy}
          countFrom={countFrom}
          hasData={!!packages.find((pkg) => pkg.name === packageName)?.fupValue}
          onLimitBy={setLimitBy}
          onCountFrom={setCountFrom}
        />

        <div className="grid gap-6 sm:grid-cols-2">
          <label className="block">
            <div className="mb-2 flex items-center justify-between gap-2">
              <span className="text-sm font-semibold text-[#525252]">
                Package <span className="text-red-500">*</span>
              </span>
              {!isLockedToDefaultPackage && (
                <Link
                  href="/dashboards/packages/create"
                  className="inline-flex items-center gap-1 text-xs font-bold text-emerald-600 hover:underline"
                >
                  <Plus size={12} />
                  Create Package
                </Link>
              )}
            </div>
            {packages.length === 0 ? (
              <div className="rounded-xl border-2 border-dashed border-amber-300 bg-amber-50 px-4 py-3 text-sm">
                <p className="font-semibold text-amber-800">You haven&apos;t created a package yet.</p>
                <p className="mt-1 text-xs text-amber-700">
                  Vouchers are sold from a package, so create one first using the link above — its
                  site/router will then auto-fill here every time.
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
                {selectedPackage ? (
                  <span className="mt-1 block text-xs text-emerald-700">
                    {isUniversal
                      ? "Universal package: it works on any router. Choose the router below."
                      : `Router${selectedPackage.routerIps.length === 1 ? "" : "s"} auto-filled below from this package${selectedPackageSite ? ` (${selectedPackageSite.name})` : ""}.`}
                  </span>
                ) : (
                  <span className="mt-1 block text-xs text-[#a3a3a3]">
                    Select a package for this voucher.
                  </span>
                )}
              </>
            )}
          </label>

          <label className="block">
            <span className="mb-2 block text-sm font-semibold text-[#525252]">
              Number of Vouchers <span className="text-red-500">*</span>
            </span>
            <input
              type="number"
              required
              min={1}
              max={500}
              value={quantity}
              onChange={(event) => setQuantity(Number(event.target.value))}
              className="h-11 w-full rounded-xl border border-[#e6e6e6] bg-white px-3 text-sm outline-none focus:border-[#1a1a1a]"
            />
          </label>

          <label className="block">
            <span className="mb-2 block text-sm font-semibold text-[#525252]">
              Voucher Prefix
            </span>
            <input
              value={prefix}
              onChange={(event) => setPrefix(event.target.value)}
              maxLength={1}
              placeholder="None"
              className="h-11 w-full rounded-xl border border-[#e6e6e6] bg-white px-3 text-sm outline-none focus:border-[#1a1a1a]"
            />
            <span className="mt-1 block text-xs text-[#a3a3a3]">
              Optional. 1 letter max.
            </span>
          </label>

          <label className="block">
            <span className="mb-2 block text-sm font-semibold text-[#525252]">
              Voucher Code Length <span className="text-red-500">*</span>
            </span>
            <select
              value={codeLength}
              onChange={(event) => setCodeLength(Number(event.target.value))}
              className="h-11 w-full rounded-xl border border-[#e6e6e6] bg-white px-3 text-sm outline-none focus:border-[#1a1a1a]"
            >
              {Array.from({ length: 5 }, (_, i) => i + 4).map((len) => (
                <option key={len} value={len}>
                  {len} characters
                </option>
              ))}
            </select>
            <span className="mt-1 block text-xs text-[#a3a3a3]">
              Between 4–8 characters (includes prefix).
            </span>
          </label>

          <label className="block">
            <span className="mb-2 block text-sm font-semibold text-[#525252]">
              Voucher Code Format <span className="text-red-500">*</span>
            </span>
            <select
              value={codeFormat}
              onChange={(event) =>
                setCodeFormat(event.target.value as VoucherCodeFormat)
              }
              className="h-11 w-full rounded-xl border border-[#e6e6e6] bg-white px-3 text-sm outline-none focus:border-[#1a1a1a]"
            >
              <option value="uppercase">Uppercase (A-Z, 0-9)</option>
              <option value="lowercase">Lowercase (a-z, 0-9)</option>
              <option value="mixed">Mixed Case (a-zA-Z, 0-9)</option>
              <option value="numeric">Numeric only (0-9)</option>
            </select>
          </label>

          <label className="block">
            <span className="mb-2 block text-sm font-semibold text-[#525252]">
              Batch Reference
            </span>
            <input
              value={reference}
              onChange={(event) => setReference(event.target.value)}
              placeholder="Auto-generated if empty"
              className="h-11 w-full rounded-xl border border-[#e6e6e6] bg-white px-3 text-sm outline-none focus:border-[#1a1a1a]"
            />
            <span className="mt-1 block text-xs text-[#a3a3a3]">
              Optional custom batch reference (e.g., &quot;Ben-Week1&quot;).
            </span>
          </label>
        </div>

        <div className="block" data-testid="voucher-router-picker">
          <span className="mb-2 block text-sm font-semibold text-[#525252]">
            Site &amp; Router <span className="text-red-500">*</span>
          </span>

          {pickable.length === 0 ? (
            <p className="rounded-xl border border-[#e6e6e6] bg-[#ffffff] p-3 text-sm text-[#a3a3a3]">
              No router available yet — add one first.
            </p>
          ) : onlyOneRouter ? (
            <div data-testid="router-auto" className="rounded-xl border border-[#e6e6e6] bg-[#ffffff] p-3 text-sm text-[#525252]">
              Router selected automatically:{" "}
              <span className="font-semibold text-[#1a1a1a]">{pickable[0].name.split(" (")[0]}</span>
              {groups[0] && groups[0].key !== "__none__" && <span className="text-[#737373]"> · {groups[0].name}</span>}
              <p className="mt-1 text-xs text-[#a3a3a3]">Only one router is available here, so there is nothing to choose.</p>
            </div>
          ) : (
            <div className="space-y-3 rounded-xl border border-[#e6e6e6] bg-white p-3">
              {groups.length > 1 && (
                <label className="block">
                  <span className="mb-1 block text-xs font-semibold text-[#737373]">Site</span>
                  <select
                    data-testid="voucher-site"
                    value={activeKey}
                    onChange={(event) => chooseSite(event.target.value)}
                    className="h-11 w-full rounded-xl border border-[#d4d4d4] bg-white px-3 text-sm outline-none focus:border-[#1a1a1a]"
                  >
                    {groups.map((g) => (
                      <option key={g.key} value={g.key}>
                        {g.name} ({g.groupRouters.length} router{g.groupRouters.length === 1 ? "" : "s"})
                      </option>
                    ))}
                    <option value="__all__">All sites (every router)</option>
                  </select>
                </label>
              )}

              {activeKey === "__all__" ? (
                <p data-testid="router-all" className="text-sm text-[#525252]">
                  These vouchers will work on <span className="font-semibold text-[#1a1a1a]">all {pickable.length} routers</span>.
                </p>
              ) : activeGroup && activeGroup.groupRouters.length === 1 ? (
                <p data-testid="router-auto" className="text-sm text-[#525252]">
                  Router selected automatically:{" "}
                  <span className="font-semibold text-[#1a1a1a]">{activeGroup.groupRouters[0].name.split(" (")[0]}</span>
                  <span className="block text-xs text-[#a3a3a3]">{activeGroup.name} has only this router.</span>
                </p>
              ) : activeGroup ? (
                <div data-testid="router-choose">
                  <div className="mb-1.5 flex items-center justify-between">
                    <span className="flex items-center gap-1.5 text-xs font-bold uppercase tracking-wide text-[#525252]">
                      <Building2 size={12} />
                      {activeGroup.name} · choose router
                    </span>
                    <button
                      type="button"
                      data-testid="select-site-routers"
                      onClick={() => toggleSite(activeGroup.groupRouters.map((r) => r.ip))}
                      className="text-[11px] font-semibold text-[#1a1a1a] hover:underline"
                    >
                      {activeGroup.groupRouters.every((r) => routerIps.includes(r.ip)) ? "Unselect all" : "Select all in this site"}
                    </button>
                  </div>
                  <div className="grid gap-1.5 sm:grid-cols-2">
                    {activeGroup.groupRouters.map((r) => (
                      <label key={r.ip} className="flex items-center gap-2 rounded-lg px-2 py-1.5 text-sm text-[#525252] hover:bg-[#f4f4f4]">
                        <input
                          type="checkbox"
                          data-testid="voucher-router"
                          checked={routerIps.includes(r.ip)}
                          onChange={() => toggleRouter(r.ip)}
                          className="h-4 w-4 rounded border-[#e6e6e6] accent-[#1a1a1a]"
                        />
                        {r.name.split(" (")[0]}
                      </label>
                    ))}
                  </div>
                </div>
              ) : null}
            </div>
          )}
          {routerIps.length === 0 && pickable.length > 0 && (
            <span data-testid="router-required" className="mt-1 block text-xs text-red-600">Select at least one router.</span>
          )}
        </div>

        <div className="grid gap-4 sm:grid-cols-2">
          <label className="flex items-start justify-between gap-3 rounded-xl border border-[#f4f4f4] bg-[#ffffff] px-4 py-3">
            <div>
              <span className="text-sm font-semibold text-[#525252]">
                Giveaway
              </span>
              <p className="text-xs text-[#a3a3a3]">
                Mark as giveaway (not counted as revenue).
              </p>
            </div>
            <button
              type="button"
              onClick={() => setIsGiveaway((current) => !current)}
              className={`relative h-6 w-11 shrink-0 rounded-full transition ${
                isGiveaway ? "bg-emerald-500" : "bg-[#e6e6e6]"
              }`}
            >
              <span
                className={`absolute top-0.5 h-5 w-5 rounded-full bg-white shadow transition-transform ${
                  isGiveaway ? "translate-x-5" : "translate-x-0.5"
                }`}
              />
            </button>
          </label>

          <label className="flex items-start justify-between gap-3 rounded-xl border border-[#f4f4f4] bg-[#ffffff] px-4 py-3">
            <div>
              <span className="text-sm font-semibold text-[#525252]">
                Send Notification
              </span>
              <p className="text-xs text-[#a3a3a3]">
                Send this voucher via SMS or WhatsApp.
              </p>
            </div>
            <button
              type="button"
              onClick={() => setSendNotification((current) => !current)}
              className={`relative h-6 w-11 shrink-0 rounded-full transition ${
                sendNotification ? "bg-emerald-500" : "bg-[#e6e6e6]"
              }`}
            >
              <span
                className={`absolute top-0.5 h-5 w-5 rounded-full bg-white shadow transition-transform ${
                  sendNotification ? "translate-x-5" : "translate-x-0.5"
                }`}
              />
            </button>
          </label>
        </div>

        {sendNotification && (
          <label className="block">
            <span className="mb-2 block text-sm font-semibold text-[#525252]">
              Recipient phone number
            </span>
            <input
              value={notifyPhone}
              onChange={(event) => setNotifyPhone(event.target.value)}
              placeholder="e.g. 024 123 4567"
              className="h-11 w-full max-w-xs rounded-xl border border-[#e6e6e6] bg-white px-3 text-sm outline-none focus:border-[#1a1a1a]"
            />
          </label>
        )}

        {(currentAgent.isDefault || currentAgent.permissions["voucher.presets"] === "Allowed") && (
        <div className="rounded-xl border-2 border-blue-200 bg-white p-4">
          <label className="flex items-center justify-between">
            <div>
              <span className="text-sm font-semibold text-[#525252]">
                Save these settings as a preset
              </span>
              <p className="text-xs text-[#737373]">
                Reuse this exact package, quantity, code format and router selection next time.
              </p>
            </div>
            <button
              type="button"
              onClick={() => setSaveAsPreset((current) => !current)}
              className={`relative h-6 w-11 shrink-0 rounded-full transition ${
                saveAsPreset ? "bg-blue-500" : "bg-[#e6e6e6]"
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

        <div className="flex flex-wrap gap-3 border-t border-[#f4f4f4] pt-6">
          <button
            type="submit"
            onClick={handleCreate}
            disabled={routerIps.length === 0}
            className="rounded-xl bg-emerald-600 px-6 py-3 text-sm font-bold text-white  hover:bg-emerald-700 disabled:cursor-not-allowed disabled:opacity-50"
          >
            Create
          </button>
          <button
            type="button"
            onClick={handleCreateAndCreateAnother}
            disabled={routerIps.length === 0}
            className="rounded-xl border border-[#e6e6e6] bg-white px-6 py-3 text-sm font-bold text-[#525252] hover:bg-[#ffffff] disabled:cursor-not-allowed disabled:opacity-50"
          >
            Create &amp; create another
          </button>
          <Link
            href="/dashboards/vouchers"
            className="rounded-xl border border-[#e6e6e6] bg-white px-6 py-3 text-sm font-bold text-[#525252] hover:bg-[#ffffff]"
          >
            Cancel
          </Link>
        </div>
      </form>
    </section>
  );
}
