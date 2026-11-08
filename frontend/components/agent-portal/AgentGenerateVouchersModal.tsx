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
import type { AgentProfile } from "@/components/dashboard/shared/types";

const MAX_PER_BATCH = 500;

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
  const { packages, routers, vouchers, generateVoucherBatch, getMaxAffordableVouchers } = useDashboard();

  const [chosenPackage, setChosenPackage] = useState("");
  const [quantity, setQuantity] = useState(50);
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
          <div className="flex items-center justify-between border-b border-[#f1f5f9] px-6 py-5">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-[#f1f5f9] text-[#2563eb]">
                <ShieldAlert size={18} />
              </div>
              <h2 className="text-base font-bold text-[#0f172a]">Finish Your Profile First</h2>
            </div>
            <button type="button" onClick={onClose} className="rounded-lg p-1.5 text-[#64748b] hover:bg-[#f8fafc]">
              <X size={18} />
            </button>
          </div>
          <div className="space-y-4 px-6 py-6">
            <p className="text-sm text-[#475569]">
              Before you can generate or sell vouchers, finish the verification items below on your profile page.
            </p>
            <ul className="space-y-1.5">
              {missingProfileFields(agent).map((field) => (
                <li key={field} className="rounded-lg bg-[#f1f5f9] px-3 py-2 text-xs font-semibold text-[#2563eb]">
                  {field}
                </li>
              ))}
            </ul>
            <Link
              href={`/agent-portal/${agent.id}/profile`}
              onClick={onClose}
              className="block w-full rounded-xl bg-[#2563eb] px-5 py-3 text-center text-sm font-bold text-white hover:bg-[#1d4ed8]"
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
  const overWallet = maxAffordable !== null && quantity > maxAffordable;
  const quantityValid = Number.isInteger(quantity) && quantity >= 1 && quantity <= MAX_PER_BATCH;

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
  const canCustomize = agentSettings.allowCustomVoucherCredentials && quantity === 1;
  const customCheck = canCustomize
    ? validateCustomCredentials(customCode, customPassword, vouchers.map((voucher) => voucher.code))
    : ({ ok: true } as const);

  const canSubmit = !!packageName && quantityValid && agent.routerIp !== null && !overWallet && customCheck.ok;

  function handleSubmit(event: FormEvent) {
    event.preventDefault();
    if (!canSubmit || agent.routerIp === null) return;

    const batch = generateVoucherBatch({
      packageName,
      reference: "",
      quantity,
      codeFormat: "uppercase",
      codeLength: 6,
      prefix: "",
      note: "",
      isGiveaway: false,
      routerIps: [agent.routerIp],
      assignedAgentIds: [],
      loginMethod: "code",
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

      <div className="relative z-10 w-full max-w-md overflow-hidden rounded-2xl bg-white shadow-2xl">
        <div className="flex items-center justify-between border-b border-[#f1f5f9] px-6 py-5">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-[#2563eb] text-white">
              <Sparkles size={18} />
            </div>
            <div>
              <h2 className="text-base font-bold text-[#0f172a]">Generate Vouchers</h2>
              <p className="text-xs text-[#64748b]">Choose a package and how many you need.</p>
            </div>
          </div>
          <button type="button" onClick={onClose} className="rounded-lg p-1.5 text-[#64748b] hover:bg-[#f8fafc]">
            <X size={18} />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-5 px-6 py-6">
          <div className="block">
            <div className="mb-2 flex items-center justify-between gap-2">
              <span className="text-sm font-semibold text-[#475569]">
                Package <span className="text-red-500">*</span>
              </span>
              {canCreatePackage && !lockedPackage && (
                <Link
                  href={`/agent-portal/${agent.id}/packages/create`}
                  className="inline-flex items-center gap-1 text-xs font-bold text-[#2563eb] hover:underline"
                >
                  <Plus size={12} />
                  Create Package
                </Link>
              )}
            </div>

            {lockedPackage ? (
              <div className="flex items-center justify-between gap-2 rounded-xl border-2 bg-white px-4 py-3">
                <span className="text-sm font-bold text-[#2563eb]">{lockedPackage}</span>
                <span className="rounded-full bg-[#2563eb] px-2 py-0.5 text-[10px] font-bold text-white">
                  Your package
                </span>
              </div>
            ) : sellable.length === 0 ? (
              <div className="rounded-xl border-2 bg-[#f1f5f9] px-4 py-3 text-sm">
                <p className="font-semibold text-[#2563eb]">No packages available to you yet.</p>
                <p className="mt-1 text-xs text-[#2563eb]">
                  {canCreatePackage
                    ? "Create one using the link above."
                    : "Ask admin to push a package to you — you'll be able to generate from it straight away."}
                </p>
              </div>
            ) : (
              <select
                value={packageName}
                onChange={(event) => setChosenPackage(event.target.value)}
                className="h-11 w-full rounded-xl border-2 border-[#cbd5e1] bg-white px-3 text-sm outline-none focus:border-[#cbd5e1]"
              >
                {sellable.map((pkg) => (
                  <option key={pkg.id} value={pkg.name}>
                    {pkg.name} · {localizeAmountString(pkg.price)}
                  </option>
                ))}
              </select>
            )}
          </div>

          <label className="block">
            <span className="mb-2 block text-sm font-semibold text-[#475569]">
              Quantity <span className="text-red-500">*</span>
            </span>
            <input
              type="number"
              required
              min={1}
              max={MAX_PER_BATCH}
              value={Number.isNaN(quantity) ? "" : quantity}
              onChange={(event) => setQuantity(event.target.value === "" ? NaN : Number(event.target.value))}
              className="h-11 w-full rounded-xl border border-[#cbd5e1] bg-white px-3 text-sm outline-none focus:border-[#2563eb]"
            />
            <span className="mt-1 block text-xs text-[#94a3b8]">Up to {MAX_PER_BATCH} per batch.</span>
          </label>

          {agent.requiresWalletFunding && selected && (
            <p className="flex items-start gap-1.5 text-xs font-semibold text-[#2563eb]">
              <Wallet size={13} className="mt-0.5 shrink-0" />
              {maxAffordable !== null
                ? `Your wallet (${sym()} ${agent.walletBalance.toLocaleString()}) covers up to ${maxAffordable} of this package.`
                : "Your wallet balance limits how many you can generate."}
            </p>
          )}

          {canCustomize && (
            <div className="space-y-3 rounded-xl border-[#f1f5f9] bg-[#f8fafc] p-4" data-testid="custom-credentials">
              <div>
                <p className="text-sm font-semibold text-[#475569]">Custom login (optional)</p>
                <p className="text-xs text-[#94a3b8]">
                  Leave both empty to get an automatic code. Set a password and the voucher logs in with username +
                  password.
                </p>
              </div>
              <label className="block">
                <span className="mb-1 block text-xs font-semibold text-[#475569]">Username</span>
                <input
                  value={customCode}
                  onChange={(event) => setCustomCode(event.target.value)}
                  aria-label="Custom username"
                  autoComplete="off"
                  className="h-10 w-full rounded-lg border border-[#cbd5e1] bg-white px-3 text-sm outline-none focus:border-[#2563eb]"
                />
              </label>
              <label className="block">
                <span className="mb-1 block text-xs font-semibold text-[#475569]">Password</span>
                <input
                  value={customPassword}
                  onChange={(event) => setCustomPassword(event.target.value)}
                  aria-label="Custom password"
                  autoComplete="off"
                  className="h-10 w-full rounded-lg border border-[#cbd5e1] bg-white px-3 text-sm outline-none focus:border-[#2563eb]"
                />
              </label>
              {!customCheck.ok && <p className="text-xs font-semibold text-red-600">{customCheck.error}</p>}
            </div>
          )}

          {blocker && <p className="text-xs font-semibold text-red-600">{blocker}</p>}

          {routerName && (
            <p className="flex items-center gap-1.5 text-xs text-[#94a3b8]">
              <RouterIcon size={12} />
              These vouchers will work on{" "}
              {agentSettings.allowViewAssignedRouters ? routerName : "your assigned router"}.
            </p>
          )}

          <div className="flex gap-3">
            <button
              type="submit"
              disabled={!canSubmit}
              className="flex-1 rounded-xl bg-[#2563eb] px-5 py-3 text-sm font-bold text-white hover:bg-[#1d4ed8] disabled:cursor-not-allowed disabled:opacity-50"
            >
              Generate Vouchers
            </button>
            <button
              type="button"
              onClick={onClose}
              className="rounded-xl bg-[#f1f5f9] px-5 py-3 text-sm font-bold text-[#475569] hover:bg-[#f8fafc]"
            >
              Cancel
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
