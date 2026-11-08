"use client";

import { sym, localizeAmountString, localizeAmountsInText } from "@/components/dashboard/shared/currency";
import { use, useState, Suspense } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import {
  Crown,
  Wallet,
  Smartphone,
  ShieldCheck,
  Gauge,
  ClipboardCheck,
  History,
  Ban,
  CheckCircle2,
  RotateCcw,
  MoreVertical,
  Lock,
  ExternalLink,
  XCircle,
  Printer,
  Pencil,
  Wallet2,
  Link2,
} from "lucide-react";

import { useDashboard } from "@/components/dashboard/context/DashboardContext";
import { copyAgentLoginLink } from "@/components/dashboard/agents/agentLink";
import {
  ActionPageLayout,
  NotFoundCard,
} from "@/components/dashboard/shared/ActionPageLayout";
import { DropdownMenuPortal } from "@/components/dashboard/shared/DropdownMenuPortal";
import {
  BASE_AGENT_PERMISSIONS,
  PERMISSION_GROUPS,
  countByState,
} from "@/components/dashboard/agents/permissionSchema";
import type { AgentStatus, AgentPermissions } from "@/components/dashboard/shared/types";
import { PermissionSwitch } from "@/components/dashboard/agents/PermissionSwitch";
import { SaveChangesBar } from "@/components/dashboard/shared/SaveChangesBar";
import { ConfirmDialog } from "@/components/dashboard/shared/ConfirmDialog";
import { AgentStatCards } from "@/components/dashboard/agents/detail/AgentStatCards";
import { AgentNotesCard } from "@/components/dashboard/agents/detail/AgentNotesCard";
import { AgentSalesInsights } from "@/components/dashboard/agents/detail/AgentSalesInsights";
import { AgentCollectionsPanel } from "@/components/dashboard/agents/detail/AgentCollectionsPanel";
import { RecordCollectionModal } from "@/components/dashboard/agents/detail/RecordCollectionModal";
import { ReprintVouchersModal } from "@/components/dashboard/agents/detail/ReprintVouchersModal";
import { EditAgentModal } from "@/components/dashboard/agents/detail/EditAgentModal";
import { ApplicationDetails } from "@/components/dashboard/agents/application/ApplicationDetails";
import { AgentSettingsPanel } from "@/components/dashboard/agents/detail/AgentSettingsPanel";
import { askConfirm } from "@/components/dashboard/shared/askConfirm";
import {
  agentLedger,
  agentStats,
  agentStock,
  breakdownByBatch,
  breakdownByPackage,
  breakdownByRouter,
  recentSales,
  unsoldVouchers,
} from "@/components/dashboard/agents/agentLedger";

const TABS = [
  "Overview", "Application", "Portal Access", "Activity", "Sales", "Collections", "Wallet", "Commission",
  "Devices", "Settings", "Permissions", "Limits", "Approvals",
];

const STATUS_COLOR: Record<AgentStatus, string> = {
  Active: "bg-emerald-100 text-emerald-700",
  Suspended: "bg-amber-100 text-amber-700",
  Pending: "bg-blue-100 text-blue-700",
  Deactivated: "bg-red-100 text-red-700",
};

function AgentProfileInner({ agentId }: { agentId: string }) {
  const searchParams = useSearchParams();
  const {
    findAgent,
    agents,
    routers,
    activityLog,
    approvalRequests,
    decideApproval,
    setAgentCommissionRate,
    setAgentMaxResaleMarkup,
    maxAgentCommissionPercent,
    vouchers,
    voucherBatches,
    applicationFiles,
    agentCollections,
    deleteAgentCollection,
    updateAgentAdminDetails,
    setAgentStatus,
    resetAgentPassword,
    resetAgentPin,
    forceLogoutAgent,
    adjustAgentWallet,
    toggleWalletFundingRequirement,
    setAgentDeviceStatus,
    dispatchAgentAccess,
    revokeAgentAccess,
    setDefaultAgentLogin,
    setAgentPortalAccess,
    isAgentDashboardLockedForAdmin,
    updateAgentRouter,
    updateAgentPermissions,
    applyAgentDashboardMode,
    toggleAgentWalletTopUp,
    packages,
    showToast,
  } = useDashboard();

  const initialTab = searchParams.get("tab");
  const tabFromParam = TABS.find(
    (t) => t.toLowerCase().replace(/[^a-z]/g, "") === (initialTab ?? "").toLowerCase(),
  );
  const agent = findAgent(agentId);

  const [activeTab, setActiveTab] = useState(tabFromParam ?? "Overview");
  // The pop-up windows and confirmations opened from the header buttons.
  const [modal, setModal] = useState<null | "collect" | "reprint" | "edit">(null);
  const [confirm, setConfirm] = useState<null | "suspend" | "activate">(null);
  const [walletAmount, setWalletAmount] = useState("");
  const [moreMenuOpen, setMoreMenuOpen] = useState(false);
  const [moreMenuRect, setMoreMenuRect] = useState<DOMRect | null>(null);
  const [walletNote, setWalletNote] = useState("");
  const [rejectReason, setRejectReason] = useState("");
  const [commissionDraft, setCommissionDraft] = useState<string | null>(null);
  const [markupDraft, setMarkupDraft] = useState<string | null>(null);
  const [pendingAccessType, setPendingAccessType] = useState<"Permanent" | "Temporary">(
    agent?.accessType ?? "Temporary",
  );
  const [pendingAllowAdminAccess, setPendingAllowAdminAccess] = useState(
    agent?.allowAdminAccess ?? true,
  );
  const [pendingRouterIp, setPendingRouterIp] = useState(agent?.routerIp ?? "");
  const [activePermGroupKey, setActivePermGroupKey] = useState(PERMISSION_GROUPS[0].key);
  const [permDraft, setPermDraft] = useState<AgentPermissions | null>(null);

  if (!agent) {
    return <NotFoundCard message="This agent may have been removed." backHref="/dashboards/agents" />;
  }

  const admin = agents.find((a) => a.id === agent.assignedAdminId);
  const assignedRouter = routers.find((r) => r.ip === agent.routerIp);
  const dashboardLocked = isAgentDashboardLockedForAdmin(agent);
  const agentVouchers = vouchers.filter((v) => v.agentId === agent.id);
  const priceByPackage = Object.fromEntries(
    packages.map((pkg) => [pkg.name, Number(pkg.price.replace(/[^0-9.]/g, "")) || 0]),
  );

  // Stock, sales and settlement for this agent: vouchers they generated
  // (paid for from their wallet) plus stock you gave them.
  const stock = agentStock(agent.id, vouchers, voucherBatches);
  const stats = agentStats(stock, voucherBatches, agent.id, priceByPackage);
  const agentOwnCollections = agentCollections.filter((collection) => collection.agentId === agent.id);
  const ledger = agentLedger(stock, agentOwnCollections, priceByPackage);
  const byPackage = breakdownByPackage(stock, voucherBatches, priceByPackage);
  const byBatch = breakdownByBatch(stock, voucherBatches, priceByPackage);
  const byRouter = breakdownByRouter(stock, voucherBatches, routers, priceByPackage);
  const recent = recentSales(stock, priceByPackage);
  const unsold = unsoldVouchers(stock);
  const knownBatchIds = new Set(voucherBatches.map((batch) => batch.id));
  const unattributedSold = stock.held.filter(
    (v) => v.status === "Used" && (!v.batchId || !knownBatchIds.has(v.batchId)),
  ).length;
  const givenCodes = new Set(stock.given.map((v) => v.code));

  const agentActivity = activityLog.filter((entry) =>
    entry.message.includes(agent.name),
  );
  const agentApprovals = approvalRequests.filter((r) => r.agentId === agent.id);
  const pendingNewAgentRequest = approvalRequests.find(
    (r) => r.type === "New Agent" && r.agentId === agent.id && (r.status === "Pending" || r.status === "Under Review"),
  );

  return (
    <ActionPageLayout
      eyebrow="Agent profile"
      title={agent.name}
      subtitle={`${agent.agentCode} · ${agent.role} · ${agent.status}`}
      backHref="/dashboards/agents"
      backLabel="Back to Agent Directory"
      wide
    >
      <div className="mb-6 flex flex-wrap items-center gap-3">
        <div className="flex h-14 w-14 items-center justify-center rounded-full bg-[#f4f4f4] text-[#1a1a1a]">
          <Crown size={24} />
        </div>
        <div>
          <p className="text-lg font-black text-[#1a1a1a]">{agent.name}</p>
          <p className="text-xs text-[#737373]">{agent.email} · @{agent.username}</p>
        </div>
        <span className={`ml-auto rounded-full px-3 py-1.5 text-xs font-bold ${STATUS_COLOR[agent.status as AgentStatus]}`}>
          {agent.status}
        </span>
      </div>

      <div className="mb-4 flex flex-wrap items-center gap-2">
        {pendingNewAgentRequest && (
          <button
            type="button"
            data-testid="header-approve"
            onClick={() => setActiveTab("Approvals")}
            className="inline-flex items-center gap-1.5 rounded-lg bg-[#1a1a1a] px-3 py-2 text-xs font-bold text-white hover:bg-[#111111]"
          >
            <CheckCircle2 size={13} />
            Approve agent
          </button>
        )}
        <Link
          href={`/agent-portal/${agent.id}`}
          target="_blank"
          rel="noopener noreferrer"
          title="Opens the agent's own dashboard in a separate tab"
          className="inline-flex items-center gap-1.5 rounded-lg bg-[#1a1a1a] px-3 py-2 text-xs font-bold text-white hover:bg-[#111111]"
        >
          Open Agent Dashboard
          <ExternalLink size={12} />
        </Link>

        {!agent.isDefault && (
          <button
            type="button"
            onClick={() => setModal("collect")}
            className="inline-flex items-center gap-1.5 rounded-lg bg-[#1a1a1a] px-3 py-2 text-xs font-bold text-white hover:bg-[#111111]"
          >
            <Wallet2 size={13} />
            Record Collection
          </button>
        )}
        <button
          type="button"
          data-testid="agent-copy-link"
          onClick={async () => showToast(await copyAgentLoginLink(agent.id, agent.name))}
          className="inline-flex items-center gap-1.5 rounded-lg bg-[#1a1a1a] px-3 py-2 text-xs font-bold text-white hover:bg-[#111111]"
        >
          <Link2 size={13} />
          Copy login link
        </button>
        <button
          type="button"
          onClick={() => setModal("reprint")}
          className="inline-flex items-center gap-1.5 rounded-lg bg-[#1a1a1a] px-3 py-2 text-xs font-bold text-white hover:bg-[#111111]"
        >
          <Printer size={13} />
          Reprint Vouchers
        </button>

        <div className="relative">
          <button
            type="button"
            data-testid="more-actions"
            onClick={(event) => {
              const rect = (event.currentTarget as HTMLElement).getBoundingClientRect();
              setMoreMenuRect(rect);
              setMoreMenuOpen((current) => !current);
            }}
            className="inline-flex items-center gap-1.5 rounded-lg bg-[#1a1a1a] px-3 py-2 text-xs font-bold text-white hover:bg-[#111111]"
          >
            <MoreVertical size={13} />
            More Actions
          </button>

          {moreMenuOpen && (
            <DropdownMenuPortal
              anchorRect={moreMenuRect}
              onClose={() => setMoreMenuOpen(false)}
              width={220}
            >
              <button
                type="button"
                data-testid="menu-edit"
                onClick={() => {
                  setMoreMenuOpen(false);
                  setModal("edit");
                }}
                className="flex w-full items-center gap-2 px-4 py-2.5 text-left text-sm text-[#525252] hover:bg-[#f4f4f4]"
              >
                <Pencil size={13} />
                Edit
              </button>
              <button
                type="button"
                onClick={() => {
                  setMoreMenuOpen(false);
                  askConfirm(`Reset ${agent.name}'s password? They'll need to set a new one on next login.`).then((ok) => {
                    if (ok) resetAgentPassword(agent.id);
                  })
                }}
                className="flex w-full px-4 py-2.5 text-left text-sm text-[#525252] hover:bg-[#f4f4f4]"
              >
                Reset Password
              </button>
              <button
                type="button"
                onClick={() => {
                  setMoreMenuOpen(false);
                  askConfirm(`Reset ${agent.name}'s PIN? A new PIN will be securely issued to them.`).then((ok) => {
                    if (ok) resetAgentPin(agent.id);
                  })
                }}
                className="flex w-full px-4 py-2.5 text-left text-sm text-[#525252] hover:bg-[#f4f4f4]"
              >
                Reset PIN
              </button>
              <button
                type="button"
                onClick={() => {
                  setMoreMenuOpen(false);
                  askConfirm(`Force logout ${agent.name} from every device? They'll need to sign in again everywhere.`).then((ok) => {
                    if (ok) forceLogoutAgent(agent.id);
                  })
                }}
                className="flex w-full px-4 py-2.5 text-left text-sm text-[#525252] hover:bg-[#f4f4f4]"
              >
                Force Logout (All Devices)
              </button>
              {!agent.isDefault && agent.status !== "Pending" && <div className="my-2 border-t border-[#f4f4f4]" />}
              {agent.status === "Active" && !agent.isDefault && (
                <button
                  type="button"
                  data-testid="menu-suspend"
                  onClick={() => {
                    setMoreMenuOpen(false);
                    setConfirm("suspend");
                  }}
                  className="flex w-full px-4 py-2.5 text-left text-sm font-semibold text-[#525252] hover:bg-[#f4f4f4]"
                >
                  Suspend Agent
                </button>
              )}
              {!agent.isDefault && (agent.status === "Suspended" || agent.status === "Deactivated") && (
                <button
                  type="button"
                  data-testid="menu-activate"
                  onClick={() => {
                    setMoreMenuOpen(false);
                    setConfirm("activate");
                  }}
                  className="flex w-full px-4 py-2.5 text-left text-sm font-semibold text-[#525252] hover:bg-[#f4f4f4]"
                >
                  Activate Agent
                </button>
              )}
            </DropdownMenuPortal>
          )}
        </div>
      </div>

      <nav className="mb-6 flex flex-wrap gap-2 border-b border-[#f4f4f4] pb-4">
        {TABS.map((tab) => (
          <button
            type="button"
            key={tab}
            onClick={() => setActiveTab(tab)}
            className={`rounded-lg px-3 py-2 text-xs font-semibold transition ${
              activeTab === tab
                ? "bg-[#f4f4f4] text-[#1a1a1a]"
                : "text-[#737373] hover:bg-[#ffffff]"
            }`}
          >
            {tab}
          </button>
        ))}
      </nav>

      {activeTab === "Overview" && (
        <div className="space-y-6">
          <AgentStatCards stats={stats} />

          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <div className="rounded-xl border border-blue-200 bg-white p-4">
              <p className="text-xs text-[#737373]">Assigned Admin</p>
              <p className="text-sm font-bold text-[#1a1a1a]">{admin?.name ?? "—"}</p>
            </div>
            <div className="rounded-xl border border-blue-200 bg-white p-4">
              <p className="text-xs text-[#737373]">Assigned Router</p>
              <p className="text-sm font-bold text-[#1a1a1a]">
                {assignedRouter ? assignedRouter.name.split(" (")[0] : "Not assigned"}
              </p>
            </div>
            <div className="rounded-xl border border-emerald-200 bg-white p-4">
              <p className="text-xs text-[#737373]">Last Login</p>
              <p className="text-sm font-bold text-[#1a1a1a]">{agent.lastLogin}</p>
            </div>
            <div className="rounded-xl border border-blue-200 bg-white p-4">
              <p className="text-xs text-[#737373]">Vouchers Generated</p>
              <p className="text-sm font-bold text-[#1a1a1a]">{agentVouchers.length}</p>
            </div>
            <div className="rounded-xl border border-amber-200 bg-white p-4">
              <p className="text-xs text-[#737373]">Since</p>
              <p className="text-sm font-bold text-[#1a1a1a]">{agent.createdAt}</p>
            </div>
          </div>

          <AgentNotesCard
            notes={agent.notes ?? ""}
            onSave={(notes) =>
              updateAgentAdminDetails(agent.id, {
                name: agent.name,
                phone: agent.phone ?? "",
                location: agent.location ?? "",
                notes,
              })
            }
          />
        </div>
      )}

      {activeTab === "Application" && (() => {
        const pendingRequest = approvalRequests.find(
          (r) => r.type === "New Agent" && r.agentId === agent.id && (r.status === "Pending" || r.status === "Under Review"),
        );
        const decidedRequest = approvalRequests.find((r) => r.type === "New Agent" && r.agentId === agent.id && r.decidedAt);
        return (
          <div className="space-y-6">
            {agent.appliedViaPortal ? (
              <p className="text-sm text-[#737373]">
                Applied through the reseller sign-up link on the captive portal. Review everything below before
                approving — once approved they can log in and start working from their dashboard.
              </p>
            ) : (
              <p className="text-sm text-[#737373]">This agent was added directly by an admin, not through a portal application.</p>
            )}

            <ApplicationDetails
              agent={agent}
              everyone={agents}
              files={applicationFiles[agent.id]}
              appliedFrom={assignedRouter ? assignedRouter.name.split(" (")[0] : null}
            />

            {pendingRequest ? (
              <article className="overflow-hidden rounded-2xl border-2 border-amber-300 bg-white">
                <div className="border-b border-amber-200 px-5 py-3">
                  <p className="text-sm font-bold text-amber-800">Awaiting your decision</p>
                  <p className="text-xs text-amber-700">Submitted {pendingRequest.createdAt}</p>
                </div>
                <div className="space-y-3 p-5">
                  <input
                    value={rejectReason}
                    onChange={(event) => setRejectReason(event.target.value)}
                    placeholder="Reason (shown if you reject — optional)"
                    className="h-10 w-full rounded-lg border border-[#e6e6e6] bg-white px-3 text-sm outline-none focus:border-[#1a1a1a]"
                  />
                  <div className="flex flex-wrap gap-2">
                    <button
                      type="button"
                      onClick={() => decideApproval(pendingRequest.id, "Approved", rejectReason)}
                      className="inline-flex items-center gap-1.5 rounded-lg bg-emerald-600 px-4 py-2.5 text-sm font-bold text-white hover:bg-emerald-700"
                    >
                      <CheckCircle2 size={14} />
                      Approve Agent
                    </button>
                    <button
                      type="button"
                      onClick={() => decideApproval(pendingRequest.id, "Rejected", rejectReason)}
                      className="inline-flex items-center gap-1.5 rounded-lg border border-red-200 bg-white px-4 py-2.5 text-sm font-bold text-red-600 hover:bg-red-50"
                    >
                      <XCircle size={14} />
                      Reject Application
                    </button>
                  </div>
                </div>
              </article>
            ) : decidedRequest ? (
              <article
                className={`rounded-2xl border-2 px-5 py-4 ${
                  decidedRequest.status === "Approved" ? "border-emerald-300 bg-emerald-50" : "border-red-300 bg-red-50"
                }`}
              >
                <p className={`text-sm font-bold ${decidedRequest.status === "Approved" ? "text-emerald-800" : "text-red-800"}`}>
                  {decidedRequest.status} by {decidedRequest.decidedBy} on {decidedRequest.decidedAt}
                </p>
                {decidedRequest.reason && (
                  <p className="mt-1 text-xs italic text-[#737373]">&quot;{decidedRequest.reason}&quot;</p>
                )}
              </article>
            ) : null}
          </div>
        );
      })()}

      {activeTab === "Portal Access" && (
        <div className="space-y-6">
          <div className="rounded-xl border border-[#f4f4f4] bg-[#ffffff] p-4">
            <p className="mb-1 text-sm font-bold text-[#1a1a1a]">Current Status</p>
            {agent.accessType ? (
              <div className="flex flex-wrap items-center gap-2">
                <span
                  className={`rounded-full px-2.5 py-1 text-xs font-semibold ${
                    agent.accessType === "Permanent"
                      ? "bg-emerald-100 text-emerald-700"
                      : "bg-blue-100 text-blue-700"
                  }`}
                >
                  {agent.accessType}
                </span>
                <span className="text-xs text-[#737373]">Dispatched {agent.accessDispatchedAt}</span>
                {dashboardLocked && (
                  <span className="inline-flex items-center gap-1 rounded-full bg-amber-100 px-2.5 py-1 text-xs font-semibold text-amber-700">
                    Admin access locked
                  </span>
                )}
              </div>
            ) : (
              <p className="text-sm text-[#a3a3a3]">Not dispatched yet — this agent cannot log in to the agent portal.</p>
            )}
            {dashboardLocked && (
              <p className="mt-2 text-xs text-amber-700">
                Access was dispatched as Permanent without admin/installer access. You cannot open this agent&apos;s
                dashboard until you revoke access or re-dispatch with admin access allowed.
              </p>
            )}
          </div>

          <div
            data-testid="agent-dashboard-access"
            className="flex items-center justify-between gap-4 rounded-2xl border border-[#f3f1ec] bg-white p-5"
          >
            <div>
              <p className="text-base font-bold text-[#1a1a1a]">Allow Agent Dashboard</p>
              <p className="text-sm text-[#737373]">
                Let {agent.name} open their own agent dashboard. Turn it off to lock them out.
              </p>
            </div>
            <button
              type="button"
              role="switch"
              aria-checked={agent.portalAccessEnabled !== false}
              data-testid="agent-dashboard-access-switch"
              onClick={() => setAgentPortalAccess(agent.id, agent.portalAccessEnabled === false)}
              className={`relative h-6 w-11 shrink-0 rounded-full transition ${agent.portalAccessEnabled !== false ? "bg-[#1a1a1a]" : "bg-[#d4d4d4]"}`}
            >
              <span
                className={`absolute top-0.5 h-5 w-5 rounded-full bg-white shadow transition-transform ${agent.portalAccessEnabled !== false ? "translate-x-5" : "translate-x-0.5"}`}
              />
            </button>
          </div>

          {agent.isDefault && (
            <div data-testid="admin-agent-login" className="flex items-center justify-between gap-4 rounded-xl border border-[#f4f4f4] p-4">
              <div>
                <p className="text-sm font-bold text-[#1a1a1a]">Allow sign-in with the admin agent&apos;s login details</p>
                <p className="text-xs text-[#737373]">
                  Off by default. While it is off, nobody can sign in with this agent&apos;s email and password
                  (you can still open its dashboard from here).
                </p>
              </div>
              <button
                type="button"
                role="switch"
                aria-checked={!!agent.portalLoginEnabled}
                data-testid="admin-agent-login-switch"
                onClick={() => setDefaultAgentLogin(agent.id, !agent.portalLoginEnabled)}
                className={`relative h-6 w-11 shrink-0 rounded-full transition ${agent.portalLoginEnabled ? "bg-[#1a1a1a]" : "bg-[#d4d4d4]"}`}
              >
                <span
                  className={`absolute top-0.5 h-5 w-5 rounded-full bg-white shadow transition-transform ${agent.portalLoginEnabled ? "translate-x-5" : "translate-x-0.5"}`}
                />
              </button>
            </div>
          )}

          <div>
            <span className="mb-2 block text-sm font-semibold text-[#525252]">
              Assigned Router / MikroTik <span className="text-red-500">*</span>
            </span>
            <select
              value={pendingRouterIp}
              onChange={(event) => {
                setPendingRouterIp(event.target.value);
                updateAgentRouter(agent.id, event.target.value);
              }}
              className="h-11 w-full max-w-md rounded-xl border border-[#e6e6e6] bg-white px-3 text-sm outline-none focus:border-[#1a1a1a]"
            >
              <option value="" disabled>
                Select a router
              </option>
              {routers.map((router) => (
                <option key={router.ip} value={router.ip}>
                  {router.name.split(" (")[0]}
                </option>
              ))}
            </select>
            <p className="mt-1 text-xs text-[#a3a3a3]">
              Every agent must be assigned to a specific router. Vouchers and sessions they manage are scoped to
              this router.
            </p>
          </div>

          <div className="rounded-xl border border-[#f4f4f4] p-4">
            <p className="mb-3 text-sm font-bold text-[#1a1a1a]">Dispatch Access</p>

            <div className="mb-4 grid grid-cols-2 gap-3">
              <button
                type="button"
                onClick={() => setPendingAccessType("Permanent")}
                className={`rounded-xl border-2 p-3 text-left ${
                  pendingAccessType === "Permanent" ? "border-[#1a1a1a] bg-[#f4f4f4]" : "border-[#e6e6e6] bg-white"
                }`}
              >
                <p className="text-sm font-bold text-[#1a1a1a]">Permanent</p>
                <p className="text-xs text-[#a3a3a3]">Full handover. Admin access depends on the option below.</p>
              </button>
              <button
                type="button"
                onClick={() => setPendingAccessType("Temporary")}
                className={`rounded-xl border-2 p-3 text-left ${
                  pendingAccessType === "Temporary" ? "border-[#1a1a1a] bg-[#f4f4f4]" : "border-[#e6e6e6] bg-white"
                }`}
              >
                <p className="text-sm font-bold text-[#1a1a1a]">Temporary</p>
                <p className="text-xs text-[#a3a3a3]">Same access, just a label — revoke it manually anytime.</p>
              </button>
            </div>

            <label className="mb-4 flex items-start gap-3 rounded-xl border border-[#e6e6e6] bg-[#ffffff] p-3">
              <input
                type="checkbox"
                checked={pendingAllowAdminAccess}
                onChange={(event) => setPendingAllowAdminAccess(event.target.checked)}
                className="mt-0.5 h-4 w-4 rounded border-[#e6e6e6] accent-[#1a1a1a]"
              />
              <span>
                <span className="block text-sm font-semibold text-[#525252]">Allow Admin / Installer Access</span>
                <span className="block text-xs text-[#a3a3a3]">
                  If enabled, you can still open this agent&apos;s dashboard at any time, even after Permanent
                  access is dispatched. If disabled and access is Permanent, you will lose access to their
                  dashboard once dispatched.
                </span>
              </span>
            </label>

            {pendingAccessType === "Permanent" && !pendingAllowAdminAccess && (
              <p className="mb-4 rounded-xl border border-amber-200 bg-white p-3 text-xs text-amber-800">
                ⚠ You will lose access to {agent.name}&apos;s dashboard once dispatched this way.
              </p>
            )}

            <div className="flex flex-wrap gap-3">
              <button
                type="button"
                onClick={() => {
                  askConfirm(
                    `Dispatch ${pendingAccessType.toLowerCase()} agent-portal access to ${agent.name}?` +
                      (pendingAccessType === "Permanent" && !pendingAllowAdminAccess
                        ? " You will lose access to their dashboard."
                        : ""),
                  ).then((ok) => {
                    if (ok) dispatchAgentAccess(agent.id, pendingAccessType, pendingAllowAdminAccess);
                  });
                }}
                className="rounded-xl bg-emerald-600 px-5 py-3 text-sm font-bold text-white hover:bg-emerald-700"
              >
                Dispatch Access
              </button>
              {agent.status === "Active" && !agent.isDefault && (
                <button
                  type="button"
                  onClick={() => {
                    askConfirm(`Revoke ${agent.name}'s agent-portal access? They'll be locked out immediately.`).then((ok) => {
                      if (ok) revokeAgentAccess(agent.id);
                    })
                  }}
                  className="rounded-xl border border-amber-200 bg-white px-5 py-3 text-sm font-bold text-amber-700 hover:bg-amber-100"
                >
                  Revoke Access
                </button>
              )}
              {!dashboardLocked && (
                <Link
                  href={`/agent-portal/${agent.id}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  title="Opens the agent's own dashboard in a separate tab"
                  className="inline-flex items-center gap-2 rounded-xl border border-[#e6e6e6] bg-white px-5 py-3 text-sm font-bold text-[#525252] hover:bg-[#ffffff]"
                >
                  Open Agent Dashboard
                  <ExternalLink size={14} />
                </Link>
              )}
            </div>
          </div>
        </div>
      )}

      {activeTab === "Activity" && (
        <div className="space-y-2">
          {agentActivity.length === 0 ? (
            <p className="text-sm text-[#a3a3a3]">No recorded activity yet.</p>
          ) : (
            agentActivity.map((entry) => (
              <div key={entry.id} className="flex items-center gap-3 rounded-lg border border-[#f4f4f4] px-4 py-2.5">
                <History size={14} className="shrink-0 text-[#a3a3a3]" />
                <div>
                  <p className="text-sm text-[#1a1a1a]">{entry.message}</p>
                  <p className="text-xs text-[#a3a3a3]">{entry.timestamp} · {entry.category}</p>
                </div>
              </div>
            ))
          )}
        </div>
      )}

      {activeTab === "Sales" && (
        <div className="space-y-5">
          <AgentSalesInsights
            byPackage={byPackage}
            byBatch={byBatch}
            byRouter={byRouter}
            recent={recent}
            unattributedSold={unattributedSold}
          />

          <article className="overflow-hidden rounded-2xl border border-[#e6e6e6] bg-white" data-testid="all-vouchers">
            <div className="border-b border-[#f4f4f4] px-5 py-4">
              <h3 className="text-base font-bold text-[#1a1a1a]">All Vouchers ({stock.held.length})</h3>
              <p className="text-xs text-[#737373]">
                Everything this agent can sell — vouchers they generated and stock you gave them.
              </p>
            </div>
            <table className="w-full text-left text-sm">
              <thead className="bg-[#ffffff] text-xs text-[#737373]">
                <tr>
                  <th className="px-5 py-3 font-semibold">Code</th>
                  <th className="px-5 py-3 font-semibold">Package</th>
                  <th className="px-5 py-3 font-semibold">Price</th>
                  <th className="px-5 py-3 font-semibold">Source</th>
                  <th className="px-5 py-3 font-semibold">Sale Type</th>
                  <th className="px-5 py-3 font-semibold">Status</th>
                  <th className="px-5 py-3 font-semibold">Generated</th>
                </tr>
              </thead>
              <tbody>
                {stock.held.length === 0 && (
                  <tr>
                    <td colSpan={7} className="px-5 py-8 text-center text-[#a3a3a3]">
                      This agent doesn&apos;t have any vouchers yet.
                    </td>
                  </tr>
                )}
                {stock.held.map((voucher) => (
                  <tr key={voucher.code} className="border-t border-[#f4f4f4]">
                    <td className="px-5 py-3 font-mono text-[#1a1a1a]">{voucher.code}</td>
                    <td className="px-5 py-3 text-[#525252]">{voucher.packageName}</td>
                    <td className="px-5 py-3 text-[#525252]">{sym()} {(priceByPackage[voucher.packageName] ?? 0).toFixed(2)}</td>
                    <td className="px-5 py-3 text-[#737373]">{givenCodes.has(voucher.code) ? "Given by you" : "Generated by agent"}</td>
                    <td className="px-5 py-3 text-[#525252]">{voucher.saleType}</td>
                    <td className="px-5 py-3">
                      <span
                        className={`rounded-full px-2.5 py-1 text-xs font-semibold ${
                          voucher.status === "Available"
                            ? "bg-emerald-100 text-emerald-700"
                            : voucher.status === "Used"
                              ? "bg-slate-200 text-slate-700"
                              : "bg-red-100 text-red-700"
                        }`}
                      >
                        {voucher.status}
                      </span>
                    </td>
                    <td className="px-5 py-3 text-[#737373]">{voucher.generatedAt}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </article>
        </div>
      )}

      {activeTab === "Collections" && (
        <AgentCollectionsPanel
          agentName={agent.name}
          ledger={ledger}
          collections={agentOwnCollections}
          sharedVouchers={stock.sharedCount}
          hasGivenStock={stock.given.length > 0}
          onRecord={() => setModal("collect")}
          onDelete={deleteAgentCollection}
        />
      )}

      {activeTab === "Wallet" && (
        <div className="space-y-5">
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="rounded-xl border border-emerald-200 bg-white p-4">
              <Wallet size={16} className="text-emerald-600" />
              <p className="mt-2 text-xs text-[#737373]">Wallet Balance</p>
              <p className="text-xl font-black text-[#1a1a1a]">{sym()} {agent.walletBalance.toLocaleString()}</p>
            </div>
            <div className="rounded-xl border border-amber-200 bg-white p-4">
              <p className="text-xs text-[#737373]">Pending Commission</p>
              <p className="text-xl font-black text-[#1a1a1a]">{sym()} {agent.pendingCommission.toLocaleString()}</p>
            </div>
          </div>

          {!agent.isDefault && (
            <label className="flex items-start justify-between gap-3 rounded-xl border border-[#f4f4f4] bg-[#ffffff] px-4 py-3">
              <div>
                <span className="text-sm font-semibold text-[#525252]">
                  Require Wallet Funding Before Generating Vouchers
                </span>
                <p className="text-xs text-[#a3a3a3]">
                  When on, the number of vouchers this agent can create is
                  capped by their wallet balance ÷ the package price. Turn
                  off to give them free rein without loading money first.
                </p>
              </div>
              <button
                type="button"
                onClick={() => toggleWalletFundingRequirement(agent.id)}
                className={`relative h-6 w-11 shrink-0 rounded-full transition ${
                  agent.requiresWalletFunding ? "bg-emerald-500" : "bg-[#e6e6e6]"
                }`}
              >
                <span
                  className={`absolute top-0.5 h-5 w-5 rounded-full bg-white shadow transition-transform ${
                    agent.requiresWalletFunding ? "translate-x-5" : "translate-x-0.5"
                  }`}
                />
              </button>
            </label>
          )}

          <div className="rounded-xl border border-[#f4f4f4] p-4">
            <p className="mb-3 text-sm font-bold text-[#1a1a1a]">Adjust Balance</p>
            <div className="flex flex-wrap items-end gap-3">
              <label className="block">
                <span className="mb-1 block text-xs font-semibold text-[#737373]">Amount ({sym()}, use - for debit)</span>
                <input
                  type="number"
                  value={walletAmount}
                  onChange={(e) => setWalletAmount(e.target.value)}
                  className="h-10 w-40 rounded-lg border border-[#e6e6e6] px-3 text-sm outline-none focus:border-[#1a1a1a]"
                />
              </label>
              <label className="block">
                <span className="mb-1 block text-xs font-semibold text-[#737373]">Note</span>
                <input
                  value={walletNote}
                  onChange={(e) => setWalletNote(e.target.value)}
                  placeholder="Reason for adjustment"
                  className="h-10 w-56 rounded-lg border border-[#e6e6e6] px-3 text-sm outline-none focus:border-[#1a1a1a]"
                />
              </label>
              <button
                type="button"
                onClick={() => {
                  const amount = Number(walletAmount);
                  if (!amount) return;
                  adjustAgentWallet(agent.id, amount, walletNote || "Manual adjustment");
                  setWalletAmount("");
                  setWalletNote("");
                }}
                className="h-10 rounded-lg bg-[#1a1a1a] px-4 text-sm font-bold text-white hover:bg-[#111111]"
              >
                Apply
              </button>
            </div>
          </div>
        </div>
      )}

      {activeTab === "Commission" && (
        <div className="space-y-5">
          <div className="grid gap-4 sm:grid-cols-3">
            <div className="rounded-xl border border-[#f4f4f4] p-4">
              <p className="text-xs text-[#737373]">Rate</p>
              <p className="text-xl font-black text-[#1a1a1a]">{agent.commissionRatePercent}%</p>
            </div>
            <div className="rounded-xl border border-[#f4f4f4] p-4">
              <p className="text-xs text-[#737373]">Earned (all-time)</p>
              <p className="text-xl font-black text-[#1a1a1a]">{sym()} {agent.earnedCommission.toLocaleString()}</p>
            </div>
            <div className="rounded-xl border border-[#f4f4f4] p-4">
              <p className="text-xs text-[#737373]">Pending</p>
              <p className="text-xl font-black text-[#1a1a1a]">{sym()} {agent.pendingCommission.toLocaleString()}</p>
            </div>
          </div>

          <article className="overflow-hidden rounded-2xl border-2 border-blue-200 bg-white">
            <div className="border-b border-blue-200 px-5 py-3">
              <p className="text-sm font-bold text-[#1a1a1a]">Wallet Top-Up Commission Bonus</p>
              <p className="text-xs text-[#737373]">
                When this agent tops up their wallet, this rate is added as bonus value on top of what they
                actually pay in — e.g. at 15%, a {sym()}20 deposit credits {sym()}23. Requires the &quot;Get commission
                bonus value when topping up their wallet&quot; permission to actually apply; the rate alone does
                nothing without it. Platform maximum right now: <strong>{maxAgentCommissionPercent}%</strong>.
              </p>
            </div>
            <div className="flex flex-wrap items-end gap-3 p-5">
              <label className="block">
                <span className="mb-1.5 block text-xs font-semibold text-[#525252]">Commission rate</span>
                <div className="flex items-center gap-2">
                  <input
                    type="number"
                    min={0}
                    max={maxAgentCommissionPercent}
                    value={commissionDraft ?? String(agent.commissionRatePercent)}
                    onChange={(event) => setCommissionDraft(event.target.value)}
                    className="h-10 w-24 rounded-lg border border-[#e6e6e6] bg-white px-3 text-sm outline-none focus:border-[#1a1a1a]"
                  />
                  <span className="text-sm font-semibold text-[#737373]">%</span>
                </div>
              </label>
              <button
                type="button"
                disabled={commissionDraft === null || Number(commissionDraft) === agent.commissionRatePercent}
                onClick={() => {
                  setAgentCommissionRate(agent.id, Number(commissionDraft));
                  setCommissionDraft(null);
                }}
                className="rounded-lg bg-blue-600 px-4 py-2.5 text-xs font-bold text-white hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-50"
              >
                Save Rate
              </button>
              {commissionDraft !== null && Number(commissionDraft) > maxAgentCommissionPercent && (
                <p className="w-full text-xs font-semibold text-red-600">
                  Can&apos;t exceed the platform maximum of {maxAgentCommissionPercent}%.
                </p>
              )}
            </div>
          </article>

          <article className="overflow-hidden rounded-2xl border-2 border-amber-200 bg-white">
            <div className="border-b border-amber-200 px-5 py-3">
              <p className="text-sm font-bold text-[#1a1a1a]">Max Resale Markup</p>
              <p className="text-xs text-[#737373]">
                The most this agent may charge a customer above a package&apos;s base price when reselling it (their
                &quot;Agent price&quot;). Leave empty for no limit. They&apos;re shown this rule on their dashboard
                after approval.
              </p>
            </div>
            <div className="flex flex-wrap items-end gap-3 p-5">
              <label className="block">
                <span className="mb-1.5 block text-xs font-semibold text-[#525252]">Maximum markup</span>
                <div className="flex items-center gap-2">
                  <input
                    type="number"
                    min={0}
                    value={markupDraft ?? (agent.maxResaleMarkupPercent === null ? "" : String(agent.maxResaleMarkupPercent))}
                    onChange={(event) => setMarkupDraft(event.target.value)}
                    placeholder="No limit"
                    className="h-10 w-28 rounded-lg border border-[#e6e6e6] bg-white px-3 text-sm outline-none focus:border-amber-500"
                  />
                  <span className="text-sm font-semibold text-[#737373]">%</span>
                </div>
              </label>
              <button
                type="button"
                disabled={
                  markupDraft === null ||
                  (markupDraft.trim() === "" ? agent.maxResaleMarkupPercent === null : Number(markupDraft) === agent.maxResaleMarkupPercent)
                }
                onClick={() => {
                  setAgentMaxResaleMarkup(agent.id, markupDraft?.trim() === "" ? null : Number(markupDraft));
                  setMarkupDraft(null);
                }}
                className="rounded-lg bg-amber-500 px-4 py-2.5 text-xs font-bold text-white hover:bg-amber-600 disabled:cursor-not-allowed disabled:opacity-50"
              >
                Save Limit
              </button>
              <span className="w-full text-xs text-[#a3a3a3]">
                Current: {agent.maxResaleMarkupPercent === null ? "No limit set" : `${agent.maxResaleMarkupPercent}% maximum`}
              </span>
            </div>
          </article>
        </div>
      )}

      {activeTab === "Devices" && (
        <div className="space-y-2">
          {agent.devices.length === 0 ? (
            <p className="text-sm text-[#a3a3a3]">No devices registered yet.</p>
          ) : (
            agent.devices.map((device) => (
              <div key={device.id} className="flex items-center justify-between rounded-xl border border-[#f4f4f4] p-4">
                <div className="flex items-center gap-3">
                  <Smartphone size={16} className="text-[#737373]" />
                  <div>
                    <p className="text-sm font-semibold text-[#1a1a1a]">{device.deviceName}</p>
                    <p className="text-xs text-[#a3a3a3]">{device.browser} · Last active {device.lastActive}</p>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <span className={`rounded-full px-2.5 py-1 text-xs font-semibold ${
                    device.status === "Active" ? "bg-emerald-100 text-emerald-700" : "bg-red-100 text-red-700"
                  }`}>
                    {device.status}
                  </span>
                  <button
                    type="button"
                    onClick={() =>
                      setAgentDeviceStatus(agent.id, device.id, device.status === "Active" ? "Blocked" : "Active")
                    }
                    className="rounded-lg border border-[#e6e6e6] bg-white p-2 text-[#525252] hover:bg-[#ffffff]"
                  >
                    {device.status === "Active" ? <Ban size={14} /> : <CheckCircle2 size={14} />}
                  </button>
                </div>
              </div>
            ))
          )}
        </div>
      )}

      {activeTab === "Settings" && <AgentSettingsPanel agent={agent} />}

      {activeTab === "Permissions" && (() => {
        const activePermGroup = PERMISSION_GROUPS.find((g) => g.key === activePermGroupKey) ?? PERMISSION_GROUPS[0];
        const midpoint = Math.ceil(activePermGroup.permissions.length / 2);
        const leftColumn = activePermGroup.permissions.slice(0, midpoint);
        const rightColumn = activePermGroup.permissions.slice(midpoint);
        const savedPermissions = agent!.permissions;
        const displayedPermissions = permDraft ?? savedPermissions;
        const changedKeys = permDraft
          ? Object.keys(permDraft).filter((key) => permDraft[key] !== savedPermissions[key])
          : [];

        function togglePermission(permissionKey: string) {
          if (BASE_AGENT_PERMISSIONS.includes(permissionKey)) return;
          const current = displayedPermissions[permissionKey] ?? "Denied";
          setPermDraft({
            ...displayedPermissions,
            [permissionKey]: current === "Allowed" ? "Denied" : "Allowed",
          });
        }

        function renderPermCheckbox(permission: { key: string; label: string }) {
          const isBase = BASE_AGENT_PERMISSIONS.includes(permission.key);
          return (
            <PermissionSwitch
              key={permission.key}
              label={permission.label}
              allowed={isBase || displayedPermissions[permission.key] === "Allowed"}
              locked={isBase}
              testId={`perm-${permission.key}`}
              onToggle={() => togglePermission(permission.key)}
            />
          );
        }

        // One switch for "this agent runs their users like the admin does".
        const FULL_USER_KEYS = ["users.view", "users.edit", "users.block", "users.viewSessions", "users.terminateOwn", "users.terminateOther"];
        const fullUserControl = FULL_USER_KEYS.every((key) => displayedPermissions[key] === "Allowed");
        function toggleFullUserControl() {
          const next: AgentPermissions = { ...displayedPermissions };
          FULL_USER_KEYS.forEach((key) => {
            if (!BASE_AGENT_PERMISSIONS.includes(key)) next[key] = fullUserControl ? "Denied" : "Allowed";
          });
          setPermDraft(next);
        }

        return (
          <div className="space-y-3">
            {/* Dashboard Mode — the 3 default presets an admin can hand
                this agent, plus wallet top-up, which is independent of
                which mode they're in. Locked for the account owner's own
                record so the admin can never accidentally restrict their
                own full access. */}
            <article className="rounded-2xl border-2 border-blue-200 bg-white p-5">
              <p className="mb-1 text-sm font-bold text-[#1a1a1a]">Dashboard Mode</p>
              {agent.isDefault ? (
                <p className="mb-4 flex items-center gap-1.5 text-xs font-semibold text-blue-700">
                  <Lock size={12} />
                  This is the account owner — always full, unrestricted access on both the admin dashboard and
                  their own agent dashboard. Locked so it can never be accidentally weakened.
                </p>
              ) : (
                <>
                  <p className="mb-4 text-xs text-[#737373]">
                    Pick one of three defaults — each sets this agent&apos;s whole
                    permission set at once. Choose &quot;Custom&quot; to fine-tune
                    everything yourself in the checklist below.
                  </p>

                  <div className="mb-4 grid gap-2 sm:grid-cols-3">
                    <button
                      type="button"
                      onClick={() => { setPermDraft(null); applyAgentDashboardMode(agent.id, "viewOnly"); }}
                      className={`rounded-xl border-2 p-3 text-left transition ${
                        agent.dashboardMode === "viewOnly" ? "border-slate-400 bg-white" : "border-blue-100 bg-white hover:bg-white"
                      }`}
                    >
                      <p className="text-sm font-bold text-[#1a1a1a]">Viewer Only</p>
                      <p className="text-xs text-[#737373]">Can look, can&apos;t create or edit anything.</p>
                    </button>
                    <button
                      type="button"
                      onClick={() => { setPermDraft(null); applyAgentDashboardMode(agent.id, "voucherCreator", agent.defaultPackageName ?? packages[0]?.name ?? null); }}
                      className={`rounded-xl border-2 p-3 text-left transition ${
                        agent.dashboardMode === "voucherCreator" ? "border-emerald-400 bg-white" : "border-blue-100 bg-white hover:bg-white"
                      }`}
                    >
                      <p className="text-sm font-bold text-[#1a1a1a]">Voucher Creator</p>
                      <p className="text-xs text-[#737373]">Sells vouchers from one fixed default package only.</p>
                    </button>
                    <button
                      type="button"
                      onClick={() => { setPermDraft(null); applyAgentDashboardMode(agent.id, "custom"); }}
                      className={`rounded-xl border-2 p-3 text-left transition ${
                        agent.dashboardMode === "custom" ? "border-blue-400 bg-white" : "border-blue-100 bg-white hover:bg-white"
                      }`}
                    >
                      <p className="text-sm font-bold text-[#1a1a1a]">Custom</p>
                      <p className="text-xs text-[#737373]">Whatever you allow below — full management is possible.</p>
                    </button>
                  </div>

                  {agent.dashboardMode === "voucherCreator" && (
                    <label className="mb-4 block max-w-xs">
                      <span className="mb-1.5 block text-xs font-semibold text-[#525252]">Default package</span>
                      <select
                        value={agent.defaultPackageName ?? ""}
                        onChange={(event) => applyAgentDashboardMode(agent.id, "voucherCreator", event.target.value)}
                        className="h-11 w-full rounded-xl border border-emerald-300 bg-white px-3 text-sm outline-none focus:border-emerald-500"
                      >
                        <option value="" disabled>
                          Select a package
                        </option>
                        {packages.map((pkg) => (
                          <option key={pkg.id} value={pkg.name}>
                            {pkg.name} · {localizeAmountString(pkg.price)}
                          </option>
                        ))}
                      </select>
                      <span className="mt-1 block text-xs text-[#a3a3a3]">
                        This is the only package {agent.name} can sell vouchers from.
                      </span>
                    </label>
                  )}
                </>
              )}

              <div className="flex items-center justify-between gap-3 rounded-xl border border-blue-200 bg-white p-4">
                <div>
                  <p className="text-sm font-bold text-[#1a1a1a]">Allow Wallet Top-Up</p>
                  <p className="text-xs text-[#737373]">
                    Lets {agent.name} add money to their own wallet — for any of the three modes above.
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => toggleAgentWalletTopUp(agent.id)}
                  className={`relative h-6 w-11 shrink-0 rounded-full transition ${
                    agent.allowWalletTopUp ? "bg-emerald-500" : "bg-[#e6e6e6]"
                  }`}
                >
                  <span
                    className={`absolute top-0.5 h-5 w-5 rounded-full bg-white shadow transition-transform ${
                      agent.allowWalletTopUp ? "translate-x-5" : "translate-x-0.5"
                    }`}
                  />
                </button>
              </div>
            </article>

            {agent.isDefault ? (
              <article className="flex items-center gap-3 rounded-2xl border border-blue-200 bg-white p-5">
                <Lock size={18} className="shrink-0 text-blue-600" />
                <p className="text-sm text-[#525252]">
                  All {Object.keys(displayedPermissions).length} permissions are allowed for the account owner,
                  every module — this can&apos;t be edited here so the main admin dashboard always keeps full
                  access to everything, no matter what.
                </p>
              </article>
            ) : (
              <>
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <p className="text-sm text-[#737373]">
                    {countByState(displayedPermissions, "Allowed")} of {Object.keys(displayedPermissions).length} permissions allowed.
                  </p>
                  <Link
                    href="/dashboards/agents/permissions"
                    className="text-sm font-semibold text-[#1a1a1a] hover:underline"
                  >
                    Edit default role permissions →
                  </Link>
                </div>

                <article className="overflow-hidden rounded-2xl border border-[#e6e6e6] bg-white">
                  <div className="flex flex-wrap gap-1 border-b border-[#e6e6e6] px-3 pt-3">
                    {PERMISSION_GROUPS.map((group) => {
                      const groupAllowed = group.permissions.filter((p) => displayedPermissions[p.key] === "Allowed").length;
                      return (
                        <button
                          key={group.key}
                          type="button"
                          onClick={() => setActivePermGroupKey(group.key)}
                          className={`rounded-t-lg px-3 py-2 text-left text-xs font-semibold transition ${
                            activePermGroupKey === group.key
                              ? "border-b-2 border-emerald-500 text-emerald-600"
                              : "text-[#737373] hover:text-[#525252]"
                          }`}
                        >
                          {group.label}
                          <span className="ml-1 font-normal opacity-70">
                            {groupAllowed}/{group.permissions.length}
                          </span>
                        </button>
                      );
                    })}
                  </div>
                  <div className="p-5">
                    {activePermGroup.key === "users" && (
                      <div className="mb-3 rounded-xl border border-[#e6e6e6] bg-[#ffffff] px-4">
                        <PermissionSwitch
                          strong
                          label="Full control over users (same as admin)"
                          allowed={fullUserControl}
                          testId="perm-full-user-control"
                          onToggle={toggleFullUserControl}
                        />
                      </div>
                    )}
                    <div className="grid gap-x-8 sm:grid-cols-2">
                      <div className="divide-y divide-[#f4f4f4]">{leftColumn.map(renderPermCheckbox)}</div>
                      <div className="divide-y divide-[#f4f4f4]">{rightColumn.map(renderPermCheckbox)}</div>
                    </div>
                  </div>
                </article>

                <SaveChangesBar
                  dirty={changedKeys.length > 0}
                  changeCount={changedKeys.length}
                  onSave={() => {
                    updateAgentPermissions(agent!.id, { ...savedPermissions, ...permDraft });
                    setPermDraft(null);
                  }}
                  onDiscard={() => setPermDraft(null)}
                  confirmMessage={`This updates ${agent!.name}'s permissions directly — they'll immediately gain or lose access to the ${changedKeys.length} permission${changedKeys.length === 1 ? "" : "s"} you changed.`}
                />
              </>
            )}
          </div>
        );
      })()}

      {activeTab === "Limits" && (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {Object.entries(agent.limits).map(([key, value]) => (
            <div key={key} className="rounded-xl border border-[#f4f4f4] p-4">
              <p className="text-xs capitalize text-[#737373]">
                {key.replace(/([A-Z])/g, " $1")}
              </p>
              <p className="text-lg font-black text-[#1a1a1a]">{value}</p>
            </div>
          ))}
          <a
            href="/dashboards/agents/limits"
            className="inline-flex items-center text-sm font-semibold text-[#1a1a1a] hover:underline"
          >
            Edit limits →
          </a>
        </div>
      )}

      {activeTab === "Approvals" && (
        <div className="space-y-2" data-testid="approvals-tab">
          {agentApprovals.length === 0 ? (
            <p className="text-sm text-[#a3a3a3]">No approval requests for this agent.</p>
          ) : (
            agentApprovals.map((request) => {
              const waiting = request.status === "Pending" || request.status === "Under Review";
              return (
                <div key={request.id} className="rounded-lg border border-[#f4f4f4] px-4 py-3" data-testid="approval-item">
                  <p className="text-sm font-semibold text-[#1a1a1a]">{request.type} — {request.status}</p>
                  <p className="text-xs text-[#737373]">{localizeAmountsInText(request.summary)}</p>
                  {request.reason && !waiting && <p className="mt-1 text-xs text-[#737373]">Note: {request.reason}</p>}
                  {waiting && (
                    <div className="mt-3 flex flex-wrap items-center gap-2">
                      <input
                        value={rejectReason}
                        onChange={(event) => setRejectReason(event.target.value)}
                        placeholder="Reason (shown if you reject — optional)"
                        className="h-9 min-w-[220px] flex-1 rounded-lg border border-[#e6e6e6] bg-white px-3 text-sm outline-none focus:border-[#1a1a1a]"
                      />
                      <button
                        type="button"
                        data-testid="approval-approve"
                        onClick={() => decideApproval(request.id, "Approved", rejectReason)}
                        className="inline-flex items-center gap-1.5 rounded-lg bg-[#1a1a1a] px-3 py-2 text-xs font-bold text-white hover:bg-[#111111]"
                      >
                        <CheckCircle2 size={13} />
                        Approve
                      </button>
                      <button
                        type="button"
                        data-testid="approval-reject"
                        onClick={() => decideApproval(request.id, "Rejected", rejectReason)}
                        className="rounded-lg border border-[#e6e6e6] bg-white px-3 py-2 text-xs font-bold text-[#525252] hover:bg-[#ffffff]"
                      >
                        Reject
                      </button>
                    </div>
                  )}
                </div>
              );
            })
          )}
        </div>
      )}


      {modal === "collect" && (
        <RecordCollectionModal
          agentId={agent.id}
          agentName={agent.name}
          currentBalance={ledger.balance}
          onClose={() => setModal(null)}
        />
      )}
      {modal === "reprint" && (
        <ReprintVouchersModal agentId={agent.id} agentName={agent.name} unsold={unsold} onClose={() => setModal(null)} />
      )}
      {modal === "edit" && <EditAgentModal agent={agent} onClose={() => setModal(null)} />}

      <ConfirmDialog
        open={confirm === "suspend"}
        title="Suspend this agent?"
        subtitle={agent.name}
        confirmLabel="Yes, suspend agent"
        points={[
          `${agent.name} loses access to the agent portal straight away and is told by message.`,
          "If they try to sign in they're told to contact you to get their access back.",
          "Their vouchers, sales, collections and wallet are all kept exactly as they are.",
          "You can activate them again any time from More Actions.",
        ]}
        onCancel={() => setConfirm(null)}
        onConfirm={() => {
          setAgentStatus(agent.id, "Suspended");
          setConfirm(null);
        }}
      />
      <ConfirmDialog
        open={confirm === "activate"}
        title="Activate this agent?"
        subtitle={agent.name}
        confirmLabel="Yes, activate agent"
        points={[
          `${agent.name} gets their access back and is told straight away.`,
          "Everything they had — vouchers, sales, collections — is as they left it.",
        ]}
        onCancel={() => setConfirm(null)}
        onConfirm={() => {
          setAgentStatus(agent.id, "Active");
          setConfirm(null);
        }}
      />
    </ActionPageLayout>
  );
}

export default function AgentProfilePage({
  params,
}: {
  params: Promise<{ agentId: string }>;
}) {
  const { agentId } = use(params);
  return (
    <Suspense fallback={null}>
      <AgentProfileInner agentId={agentId} />
    </Suspense>
  );
}
