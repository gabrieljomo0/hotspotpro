"use client";

// The agent's version of "Generate Vouchers": pick a package, say how many,
// done. An agent belongs to one router/site — set by admin — so there is no
// router or site to choose, and every technical setting (code format,
// length, login type, prefix, reference) uses sensible defaults. The full
// form stays with the admin.
//
// "Create Package" only appears if admin has allowed the agent to create
// packages; otherwise they work with what they were given.

import { sym, localizeAmountString } from "@/components/dashboard/shared/currency";
import { useState, type FormEvent } from "react";
import Link from "next/link";
import { X, Sparkles, Wallet, Plus, Router as RouterIcon, ShieldAlert } from "lucide-react";

import { useDashboard } from "@/components/dashboard/context/DashboardContext";
import { REQUIRE_COMPLETE_PROFILE_FOR_VOUCHERS, getSellablePackages, isAgentProfileComplete, missingProfileFields } from "@/components/dashboard/agents/agentPackages";
import { settingsOf, validateCustomCredentials } from "@/components/dashboard/agents/agentSettings";
import type { AgentProfile, VoucherCountFrom, VoucherLimitBy } from "@/components/dashboard/shared/types";
import { VoucherAllowanceFields } from "@/components/dashboard/vouchers/VoucherAllowanceFields";
import { loginMethodForRouterIps, loginMethodLabel } from "@/components/dashboard/vouchers/voucherLoginFromPortal";
import {
  VOUCHER_BATCH_DEFAULT,
  VOUCHER_BATCH_MAX,
  parseVoucherQuantityInput,
  resolveVoucherQuantity,
} from "@/components/dashboard/vouchers/voucherQuantity";

export function AgentGenerateVouchersModal({
  open,
  agent,
  onClose,
  onGenerated,
}: {
  open: boolean;
  agent: AgentProfile;
  onClose: () => void;
  onGenerated: (batchId: string) => void;
}) {
  const { packages, routers, vouchers, generateVoucherBatch, getMaxAffordableVouchers, getCaptivePortalConfig } = useDashboard();

  const [chosenPackage, setChosenPackage] = useState("");
  const [limitBy, setLimitBy] = useState<VoucherLimitBy>("both");
  const [countFrom, setCountFrom] = useState<VoucherCountFrom>("signin");
  const [quantity, setQuantity] = useState<number | "">(VOUCHER_BATCH_DEFAULT);
  // Optional, and only for a single voucher — see "canCustomize" below.
  const [customCode, setCustomCode] = useState("");
  const [customPassword, setCustomPassword] = useState("");

  if (!open) return null;

  // The post-approval verification gate — being Active only means admin
  // approved the application. Selling still needs everything below filled
  // in, whether that happened at application time or later on their own.
  if (REQUIRE_COMPLETE_PROFILE_FOR_VOUCHERS && !isAgentProfileComplete(agent)) {
    return (
      <div className="fixed inset-0 z-[220] flex items-center justify-center bg-slate-950/50 p-4">
        <button type="button" aria-label="Close" className="absolute inset-0 cursor-default" onClick={onClose} />
        <div className="relative z-10 w-full max-w-md overflow-hidden rounded-2xl bg-white shadow-2xl">
          <div className="flex items-center justify-between border-b border-[#f4f4f4] px-6 py-5">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-[#f4f4f4] text-[#1a1a1a]">
                <ShieldAlert size={18} />
              </div>
              <h2 className="text-base font-bold text-[#1a1a1a]">Finish Your Profile First</h2>
            </div>
            <button type="button" onClick={onClose} className="rounded-lg p-1.5 text-[#737373] hover:bg-[#f7f7f7]">
              <X size={18} />
            </button>
          </div>
          <div className="space-y-4 px-6 py-6">
            <p className="text-sm text-[#525252]">
              Before you can generate or sell vouchers, finish the verification items below on your profile page.
            </p>
            <ul className="space-y-1.5">
              {missingProfileFields(agent).map((field) => (
                <li key={field} className="rounded-lg bg-[#f4f4f4] px-3 py-2 text-xs font-semibold text-[#1a1a1a]">
                  {field}
                </li>
              ))}
            </ul>
            <Link
              href={`/agent-portal/${agent.id}/profile`}
              onClick={onClose}
              className="block w-full rounded-xl bg-[#1a1a1a] px-5 py-3 text-center text-sm font-bold text-white hover:bg-[#111111]"
            >
              Complete My Profile
            </Link>
          </div>
        </div>
      </div>
    );
  }

  const sellable = getSellablePackages(packages, agent);
  // A "voucher creator" agent is locked to the package admin picked for them.
  const lockedPackage = agent.dashboardMode === "voucherCreator" ? agent.defaultPackageName : null;
  const packageName = lockedPackage ?? (sellable.some((p) => p.name === chosenPackage) ? chosenPackage : sellable[0]?.name ?? "");
  const selected = packages.find((p) => p.name === packageName);

  const canCreatePackage = agent.permissions["packages.create"] === "Allowed";
  const router = routers.find((r) => r.ip === agent.routerIp);
  const routerName = router ? router.name.split(" (")[0] : null;

  const maxAffordable =
    packageName && agent.requiresWalletFunding ? getMaxAffordableVouchers(agent.id, packageName) : null;
  const resolvedQuantity = resolveVoucherQuantity(quantity);
  const overWallet = maxAffordable !== null && resolvedQuantity > maxAffordable;
  const quantityValid = resolvedQuantity >= 1 && resolvedQuantity <= VOUCHER_BATCH_MAX;

  const blocker =
    agent.routerIp === null
      ? "You haven't been assigned a router yet — ask admin to assign one."
      : !packageName
        ? null
        : overWallet
          ? maxAffordable === 0
            ? "Your wallet doesn't cover this package. Top up to continue."
            : `Your wallet only covers ${maxAffordable} of this package. Lower the quantity or top up.`
          : null;

  // Agents may set their own username/password for ONE voucher, but only if
  // the organization has allowed it (on their Settings tab).
  const agentSettings = settingsOf(agent);
  const canCustomize = agentSettings.allowCustomVoucherCredentials && resolvedQuantity === 1;
  const customCheck = canCustomize
    ? validateCustomCredentials(customCode, customPassword, vouchers.map((voucher) => voucher.code))
    : ({ ok: true } as const);

  const portalLogin = agent.routerIp
    ? loginMethodForRouterIps([agent.routerIp], getCaptivePortalConfig)
    : ({ ok: false, message: "No router assigned." } as const);
  const loginMethod = portalLogin.ok ? portalLogin.loginMethod : "code";
  const canSubmit =
    !!packageName && quantityValid && agent.routerIp !== null && !overWallet && customCheck.ok && portalLogin.ok;

  function handleSubmit(event: FormEvent) {
    event.preventDefault();
    if (!canSubmit || agent.routerIp === null || !portalLogin.ok) return;

    const batch = generateVoucherBatch({
      packageName,
      reference: "",
      quantity: resolvedQuantity,
      codeFormat: "uppercase",
      codeLength: 6,
      prefix: "",
      note: "",
      isGiveaway: false,
      routerIps: [agent.routerIp],
      assignedAgentIds: [],
      loginMethod,
      limitBy,
      countFrom,
      actingAgentId: agent.id,
      ...(canCustomize ? { customCode, customPassword } : {}),
    });

    if (batch) {
      setCustomCode("");
      setCustomPassword("");
      onGenerated(batch.id);
    }
  }

  return (
    <div className="fixed inset-0 z-[220] flex items-center justify-center bg-slate-950/50 p-4">
      <button type="button" aria-label="Close" className="absolute inset-0 cursor-default" onClick={onClose} />

      <div className="relative z-10 max-h-[90vh] w-full max-w-md overflow-y-auto rounded-2xl bg-white shadow-2xl">
        <div className="flex items-center justify-between border-b border-[#f4f4f4] px-6 py-5">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-[#1a1a1a] text-white">
              <Sparkles size={18} />
            </div>
            <div>
              <h2 className="text-base font-bold text-[#1a1a1a]">Generate Vouchers</h2>
              <p className="text-xs text-[#737373]">Choose a package and how many you need.</p>
            </div>
          </div>
          <button type="button" onClick={onClose} className="rounded-lg p-1.5 text-[#737373] hover:bg-[#f7f7f7]">
            <X size={18} />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-5 px-6 py-6">
          {portalLogin.ok && (
            <p className="rounded-xl border border-[#e6e6e6] bg-[#fafafa] px-3 py-2 text-xs text-[#525252]">
              Login format: <span className="font-bold text-[#1a1a1a]">{loginMethodLabel(loginMethod)}</span> (from this router’s captive portal)
            </p>
          )}
          <div className="block">
            <div className="mb-2 flex items-center justify-between gap-2">
              <span className="text-sm font-semibold text-[#525252]">
                Package <span className="text-red-500">*</span>
              </span>
              {canCreatePackage && !lockedPackage && (
                <Link
                  href={`/agent-portal/${agent.id}/packages/create`}
                  className="inline-flex items-center gap-1 text-xs font-bold text-[#1a1a1a] hover:underline"
                >
                  <Plus size={12} />
                  Create Package
                </Link>
              )}
            </div>

            {lockedPackage ? (
              <div className="flex items-center justify-between gap-2 rounded-xl border-2 bg-white px-4 py-3">
                <span className="text-sm font-bold text-[#1a1a1a]">{lockedPackage}</span>
                <span className="rounded-full bg-[#1a1a1a] px-2 py-0.5 text-[10px] font-bold text-white">
                  Your package
                </span>
              </div>
            ) : sellable.length === 0 ? (
              <div className="rounded-xl border-2 bg-[#f4f4f4] px-4 py-3 text-sm">
                <p className="font-semibold text-[#1a1a1a]">No packages available to you yet.</p>
                <p className="mt-1 text-xs text-[#1a1a1a]">
                  {canCreatePackage
                    ? "Create one using the link above."
                    : "Ask admin to push a package to you — you'll be able to generate from it straight away."}
                </p>
              </div>
            ) : (
              <select
                value={packageName}
                onChange={(event) => setChosenPackage(event.target.value)}
                className="h-11 w-full rounded-xl border-2 border-[#d4d4d4] bg-white px-3 text-sm outline-none focus:border-[#d4d4d4]"
              >
                {sellable.map((pkg) => (
                  <option key={pkg.id} value={pkg.name}>
                    {pkg.name} · {localizeAmountString(pkg.price)}
                  </option>
                ))}
              </select>
            )}
          </div>

          <VoucherAllowanceFields
            limitBy={limitBy}
            countFrom={countFrom}
            hasData={!!selected?.fupValue}
            onLimitBy={setLimitBy}
            onCountFrom={setCountFrom}
          />

          <label className="block">
            <span className="mb-2 block text-sm font-semibold text-[#525252]">
              Quantity <span className="text-red-500">*</span>
            </span>
            <input
              type="number"
              inputMode="numeric"
              min={1}
              max={VOUCHER_BATCH_MAX}
              value={quantity === "" ? "" : quantity}
              onChange={(event) => setQuantity(parseVoucherQuantityInput(event.target.value))}
              onBlur={() => {
                if (quantity === "") setQuantity(VOUCHER_BATCH_DEFAULT);
                else setQuantity(resolveVoucherQuantity(quantity));
              }}
              className="h-11 w-full rounded-xl border border-[#d4d4d4] bg-white px-3 text-sm outline-none focus:border-[#1a1a1a]"
            />
            <span className="mt-1 block text-xs text-[#a3a3a3]">
              Default {VOUCHER_BATCH_DEFAULT} if empty. Up to {VOUCHER_BATCH_MAX} per batch.
            </span>
          </label>

          {agent.requiresWalletFunding && selected && (
            <p className="flex items-start gap-1.5 text-xs font-semibold text-[#1a1a1a]">
              <Wallet size={13} className="mt-0.5 shrink-0" />
              {maxAffordable !== null
                ? `Your wallet (${sym()} ${agent.walletBalance.toLocaleString()}) covers up to ${maxAffordable} of this package.`
                : "Your wallet balance limits how many you can generate."}
            </p>
          )}

          {canCustomize && (
            <div className="space-y-3 rounded-xl border-[#f4f4f4] bg-[#f7f7f7] p-4" data-testid="custom-credentials">
              <div>
                <p className="text-sm font-semibold text-[#525252]">Custom login (optional)</p>
                <p className="text-xs text-[#a3a3a3]">
                  Leave both empty to get an automatic code. Set a password and the voucher logs in with username +
                  password.
                </p>
              </div>
              <label className="block">
                <span className="mb-1 block text-xs font-semibold text-[#525252]">Username</span>
                <input
                  value={customCode}
                  onChange={(event) => setCustomCode(event.target.value)}
                  aria-label="Custom username"
                  autoComplete="off"
                  className="h-10 w-full rounded-lg border border-[#d4d4d4] bg-white px-3 text-sm outline-none focus:border-[#1a1a1a]"
                />
              </label>
              <label className="block">
                <span className="mb-1 block text-xs font-semibold text-[#525252]">Password</span>
                <input
                  value={customPassword}
                  onChange={(event) => setCustomPassword(event.target.value)}
                  aria-label="Custom password"
                  autoComplete="off"
                  className="h-10 w-full rounded-lg border border-[#d4d4d4] bg-white px-3 text-sm outline-none focus:border-[#1a1a1a]"
                />
              </label>
              {!customCheck.ok && <p className="text-xs font-semibold text-red-600">{customCheck.error}</p>}
            </div>
          )}

          {blocker && <p className="text-xs font-semibold text-red-600">{blocker}</p>}

          {routerName && (
            <p className="flex items-center gap-1.5 text-xs text-[#a3a3a3]">
              <RouterIcon size={12} />
              These vouchers will work on{" "}
              {agentSettings.allowViewAssignedRouters ? routerName : "your assigned router"}.
            </p>
          )}

          <div className="flex gap-3">
            <button
              type="submit"
              disabled={!canSubmit}
              className="flex-1 rounded-xl bg-[#1a1a1a] px-5 py-3 text-sm font-bold text-white hover:bg-[#111111] disabled:cursor-not-allowed disabled:opacity-50"
            >
              Generate Vouchers
            </button>
            <button
              type="button"
              onClick={onClose}
              className="rounded-xl bg-[#f4f4f4] px-5 py-3 text-sm font-bold text-[#525252] hover:bg-[#f7f7f7]"
            >
              Cancel
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
