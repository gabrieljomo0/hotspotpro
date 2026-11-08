"use client";

import { localizeAmountString } from "@/components/dashboard/shared/currency";
import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import {
  ArrowLeft,
  Bookmark,
  Sparkles,
  Pencil,
  Trash2,
  Check,
  X,
  Building2,
  UserCheck,
  MoreVertical,
  Plus,
} from "lucide-react";

import { useDashboard } from "@/components/dashboard/context/DashboardContext";
import { DropdownMenuPortal } from "@/components/dashboard/shared/DropdownMenuPortal";
import { DeletePresetDialog } from "@/components/dashboard/vouchers/DeletePresetDialog";
import type { VoucherCodeFormat, VoucherLoginMethod } from "@/components/dashboard/shared/types";

export default function VoucherPresetsPage() {
  const router = useRouter();
  const { voucherPresets, deleteVoucherPreset, updateVoucherPreset, saveVoucherPreset, pushVoucherPresetToAgents, removeVoucherPresetPush, generateVoucherBatch, routers, businessLocations, agents, packages } = useDashboard();

  const [pushPanelId, setPushPanelId] = useState<string | null>(null);
  const [pushAgentIds, setPushAgentIds] = useState<string[]>([]);
  // Agents can't open presets without the voucher.presets permission, so
  // by default a push also switches it on for whoever is missing it.
  const [grantAccess, setGrantAccess] = useState(true);
  const [openMenuId, setOpenMenuId] = useState<string | null>(null);
  const [menuRect, setMenuRect] = useState<DOMRect | null>(null);
  const [creatingNew, setCreatingNew] = useState(false);
  const [deleteTargetId, setDeleteTargetId] = useState<string | null>(null);

  function openMenu(presetId: string, event: React.MouseEvent<HTMLElement>) {
    setMenuRect((event.currentTarget as HTMLElement).getBoundingClientRect());
    setOpenMenuId((current) => (current === presetId ? null : presetId));
  }

  function closeMenu() {
    setOpenMenuId(null);
  }

  function openPushPanel(presetId: string) {
    setPushPanelId(pushPanelId === presetId ? null : presetId);
    setPushAgentIds([]);
    setGrantAccess(true);
  }

  function togglePushAgent(agentId: string) {
    setPushAgentIds((current) =>
      current.includes(agentId) ? current.filter((id) => id !== agentId) : [...current, agentId],
    );
  }

  function confirmPush(presetId: string) {
    if (pushAgentIds.length === 0) return;
    pushVoucherPresetToAgents(presetId, pushAgentIds, grantAccess);
    setPushPanelId(null);
    setPushAgentIds([]);
  }

  // Opens the confirmation pop-up — nothing is deleted until it's confirmed there.
  function handleDelete(presetId: string) {
    closeMenu();
    setDeleteTargetId(presetId);
  }

  function confirmDelete() {
    if (deleteTargetId) deleteVoucherPreset(deleteTargetId);
    setDeleteTargetId(null);
  }

  const [editingId, setEditingId] = useState<string | null>(null);

  // Edit form state — only populated while a preset is being edited.
  const [editName, setEditName] = useState("");
  const [editPackageName, setEditPackageName] = useState("");
  const [editQuantity, setEditQuantity] = useState(60);
  const [editCodeFormat, setEditCodeFormat] = useState<VoucherCodeFormat>("uppercase");
  const [editCodeLength, setEditCodeLength] = useState(6);
  const [editPrefix, setEditPrefix] = useState("");
  const [editLoginMethod, setEditLoginMethod] = useState<VoucherLoginMethod>("code");
  const [editIsGiveaway, setEditIsGiveaway] = useState(false);
  const [editRouterIps, setEditRouterIps] = useState<string[]>([]);

  function startEdit(presetId: string) {
    const preset = voucherPresets.find((p) => p.id === presetId);
    if (!preset) return;
    setEditingId(presetId);
    setEditName(preset.name);
    setEditPackageName(preset.packageName);
    setEditQuantity(preset.quantity);
    setEditCodeFormat(preset.codeFormat);
    setEditCodeLength(preset.codeLength);
    setEditPrefix(preset.prefix);
    setEditLoginMethod(preset.loginMethod);
    setEditIsGiveaway(preset.isGiveaway);
    setEditRouterIps(preset.routerIps);
  }

  function cancelEdit() {
    setEditingId(null);
  }

  function saveEdit() {
    if (!editingId || !editName.trim()) return;
    updateVoucherPreset(editingId, {
      name: editName.trim(),
      packageName: editPackageName,
      quantity: editQuantity,
      codeFormat: editCodeFormat,
      codeLength: editCodeLength,
      prefix: editPrefix,
      loginMethod: editLoginMethod,
      isGiveaway: editIsGiveaway,
      routerIps: editRouterIps,
    });
    setEditingId(null);
  }

  function startCreate() {
    setEditingId(null);
    setEditName("");
    setEditPackageName(packages[0]?.name ?? "");
    setEditQuantity(60);
    setEditCodeFormat("uppercase");
    setEditCodeLength(6);
    setEditPrefix("");
    setEditLoginMethod("code");
    setEditIsGiveaway(false);
    setEditRouterIps(packages[0]?.routerIps ?? []);
    setCreatingNew(true);
  }

  function cancelCreate() {
    setCreatingNew(false);
  }

  function submitCreate() {
    if (!editName.trim() || !editPackageName || editRouterIps.length === 0) return;
    saveVoucherPreset({
      name: editName.trim(),
      packageName: editPackageName,
      quantity: editQuantity,
      codeFormat: editCodeFormat,
      codeLength: editCodeLength,
      prefix: editPrefix,
      loginMethod: editLoginMethod,
      isGiveaway: editIsGiveaway,
      routerIps: editRouterIps,
    });
    setCreatingNew(false);
  }

  function toggleEditRouter(ip: string) {
    setEditRouterIps((current) =>
      current.includes(ip) ? current.filter((r) => r !== ip) : [...current, ip],
    );
  }

  function handleGenerate(presetId: string) {
    const preset = voucherPresets.find((p) => p.id === presetId);
    if (!preset) return;
    const batch = generateVoucherBatch({
      packageName: preset.packageName,
      reference: "",
      quantity: preset.quantity,
      codeFormat: preset.codeFormat,
      codeLength: preset.codeLength,
      prefix: preset.prefix,
      note: "",
      isGiveaway: preset.isGiveaway,
      routerIps: preset.routerIps,
      assignedAgentIds: [],
      loginMethod: preset.loginMethod,
    });
    if (!batch) return;
    router.push(`/dashboards/vouchers/batch/${batch.id}`);
  }

  return (
    <section className="mx-auto w-full max-w-4xl">
      <Link
        href="/dashboards/vouchers"
        className="mb-5 inline-flex items-center gap-2 rounded-xl border border-[#e2e8f0] bg-white px-4 py-2.5 text-sm font-semibold text-[#475569] hover:bg-[#ffffff]"
      >
        <ArrowLeft size={16} />
        Back to Vouchers
      </Link>

      <div className="mb-6 flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="flex items-center gap-2 text-2xl font-black text-[#0f172a] md:text-3xl">
            <Bookmark className="text-blue-500" size={26} />
            Voucher Presets
          </h1>
          <p className="mt-1 text-sm text-[#64748b]">
            Saved voucher-generation setups. Generate straight from one, or edit/delete it here.
          </p>
        </div>
        {!creatingNew && (
          <button
            type="button"
            onClick={startCreate}
            disabled={packages.length === 0}
            className="inline-flex items-center gap-2 rounded-xl bg-blue-500 px-4 py-2.5 text-sm font-bold text-white hover:bg-blue-600 disabled:cursor-not-allowed disabled:opacity-50"
          >
            <Plus size={16} />
            Create New Preset
          </button>
        )}
      </div>

      {creatingNew && (
        <article className="mb-4 overflow-hidden rounded-2xl border-2 border-blue-300 bg-white shadow-[0_8px_24px_rgba(37,99,235,0.06)]">
          <div className="border-b border-blue-200 bg-blue-100 px-5 py-4">
            <p className="text-sm font-bold text-[#0f172a]">Create New Preset</p>
            <p className="text-xs text-[#64748b]">Set it up once, then generate from it any time.</p>
          </div>
          <div className="space-y-4 p-5">
            <div className="grid gap-3 sm:grid-cols-2">
              <label className="block">
                <span className="mb-1.5 block text-xs font-semibold text-[#475569]">Preset name</span>
                <input
                  autoFocus
                  value={editName}
                  onChange={(event) => setEditName(event.target.value)}
                  placeholder='e.g. "5GH Quick Batch"'
                  className="h-10 w-full rounded-xl border border-[#e2e8f0] bg-white px-3 text-sm outline-none focus:border-blue-500"
                />
              </label>
              <label className="block">
                <span className="mb-1.5 block text-xs font-semibold text-[#475569]">Package</span>
                <select
                  value={editPackageName}
                  onChange={(event) => {
                    setEditPackageName(event.target.value);
                    const pkg = packages.find((p) => p.name === event.target.value);
                    if (pkg && pkg.routerIps.length > 0) setEditRouterIps(pkg.routerIps);
                  }}
                  className="h-10 w-full rounded-xl border border-[#e2e8f0] bg-white px-3 text-sm outline-none focus:border-blue-500"
                >
                  {packages.map((pkg) => (
                    <option key={pkg.id} value={pkg.name}>
                      {pkg.name} · {localizeAmountString(pkg.price)}
                    </option>
                  ))}
                </select>
              </label>
            </div>

            <div className="grid gap-3 sm:grid-cols-2">
              <label className="block">
                <span className="mb-1.5 block text-xs font-semibold text-[#475569]">Quantity</span>
                <input
                  type="number"
                  min={1}
                  max={500}
                  value={editQuantity}
                  onChange={(event) => setEditQuantity(Number(event.target.value))}
                  className="h-10 w-full rounded-xl border border-[#e2e8f0] bg-white px-3 text-sm outline-none focus:border-blue-500"
                />
              </label>
              <label className="block">
                <span className="mb-1.5 block text-xs font-semibold text-[#475569]">Prefix</span>
                <input
                  value={editPrefix}
                  maxLength={1}
                  onChange={(event) => setEditPrefix(event.target.value)}
                  className="h-10 w-full rounded-xl border border-[#e2e8f0] bg-white px-3 text-sm outline-none focus:border-blue-500"
                />
              </label>
              <label className="block">
                <span className="mb-1.5 block text-xs font-semibold text-[#475569]">Code Format</span>
                <select
                  value={editCodeFormat}
                  onChange={(event) => setEditCodeFormat(event.target.value as VoucherCodeFormat)}
                  className="h-10 w-full rounded-xl border border-[#e2e8f0] bg-white px-3 text-sm outline-none focus:border-blue-500"
                >
                  <option value="uppercase">Uppercase (A-Z, 0-9)</option>
                  <option value="lowercase">Lowercase (a-z, 0-9)</option>
                  <option value="mixed">Mixed Case</option>
                  <option value="numeric">Numeric only</option>
                </select>
              </label>
              <label className="block">
                <span className="mb-1.5 block text-xs font-semibold text-[#475569]">Code Length</span>
                <select
                  value={editCodeLength}
                  onChange={(event) => setEditCodeLength(Number(event.target.value))}
                  className="h-10 w-full rounded-xl border border-[#e2e8f0] bg-white px-3 text-sm outline-none focus:border-blue-500"
                >
                  {[4, 5, 6, 7, 8].map((len) => (
                    <option key={len} value={len}>
                      {len} characters
                    </option>
                  ))}
                </select>
              </label>
            </div>

            <div className="block">
              <span className="mb-1.5 block text-xs font-semibold text-[#475569]">How customers log in</span>
              <div className="grid gap-2 sm:grid-cols-2">
                <button
                  type="button"
                  onClick={() => setEditLoginMethod("code")}
                  className={`rounded-xl border-2 p-2.5 text-left text-sm transition ${
                    editLoginMethod === "code" ? "border-blue-500 bg-white" : "border-[#e2e8f0] bg-white"
                  }`}
                >
                  Single Code
                </button>
                <button
                  type="button"
                  onClick={() => setEditLoginMethod("credentials")}
                  className={`rounded-xl border-2 p-2.5 text-left text-sm transition ${
                    editLoginMethod === "credentials" ? "border-blue-500 bg-white" : "border-[#e2e8f0] bg-white"
                  }`}
                >
                  Username &amp; Password
                </button>
              </div>
            </div>

            <div className="block">
              <span className="mb-1.5 block text-xs font-semibold text-[#475569]">Routers</span>
              <div className="max-h-36 space-y-2 overflow-y-auto rounded-xl border border-[#e2e8f0] bg-white p-2.5">
                {businessLocations.map((site) => {
                  const siteRouters = routers.filter((r) => r.siteId === site.id);
                  if (siteRouters.length === 0) return null;
                  return (
                    <div key={site.id} className="rounded-lg border border-[#f1f5f9] p-2">
                      <span className="mb-1 flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-wide text-[#475569]">
                        <Building2 size={10} />
                        {site.name}
                      </span>
                      <div className="grid gap-1 sm:grid-cols-2">
                        {siteRouters.map((r) => (
                          <label key={r.ip} className="flex items-center gap-2 rounded px-1.5 py-1 text-xs text-[#475569] hover:bg-[#ffffff]">
                            <input
                              type="checkbox"
                              checked={editRouterIps.includes(r.ip)}
                              onChange={() => toggleEditRouter(r.ip)}
                              className="h-3.5 w-3.5 rounded border-[#e2e8f0] accent-blue-500"
                            />
                            {r.name.split(" (")[0]}
                          </label>
                        ))}
                      </div>
                    </div>
                  );
                })}
              </div>
              {editRouterIps.length === 0 && (
                <span className="mt-1 block text-xs text-red-600">Select at least one router.</span>
              )}
            </div>

            <label className="flex items-center gap-2 text-sm text-[#475569]">
              <input
                type="checkbox"
                checked={editIsGiveaway}
                onChange={(event) => setEditIsGiveaway(event.target.checked)}
                className="h-4 w-4 rounded border-[#e2e8f0] accent-blue-500"
              />
              Mark as Giveaway
            </label>

            <div className="flex gap-2 border-t border-blue-200 pt-4">
              <button
                type="button"
                onClick={submitCreate}
                disabled={!editName.trim() || editRouterIps.length === 0}
                className="inline-flex items-center gap-1.5 rounded-xl bg-blue-500 px-4 py-2.5 text-sm font-bold text-white hover:bg-blue-600 disabled:cursor-not-allowed disabled:opacity-50"
              >
                <Check size={14} />
                Create Preset
              </button>
              <button
                type="button"
                onClick={cancelCreate}
                className="inline-flex items-center gap-1.5 rounded-xl border border-[#e2e8f0] bg-white px-4 py-2.5 text-sm font-bold text-[#475569] hover:bg-[#ffffff]"
              >
                <X size={14} />
                Cancel
              </button>
            </div>
          </div>
        </article>
      )}

      {voucherPresets.length === 0 && !creatingNew ? (
        <div className="rounded-2xl border border-dashed border-[#e2e8f0] bg-white p-10 text-center text-sm text-[#94a3b8]">
          No presets saved yet.{" "}
          {packages.length > 0 ? (
            <button type="button" onClick={startCreate} className="font-semibold text-blue-600 hover:underline">
              Create your first one →
            </button>
          ) : (
            <>
              A preset needs a package to build on.{" "}
              <Link href="/dashboards/packages/create" className="font-semibold text-blue-600 hover:underline">
                Create a package first →
              </Link>
            </>
          )}
        </div>
      ) : voucherPresets.length > 0 ? (
        <div className="space-y-4">
          {voucherPresets.map((preset) => {
            const isEditing = editingId === preset.id;
            return (
              <article
                key={preset.id}
                className="overflow-hidden rounded-2xl border border-[#e2e8f0] bg-white shadow-[0_8px_24px_rgba(37,99,235,0.06)]"
              >
                {!isEditing ? (
                  <div>
                  <div className="flex flex-wrap items-center justify-between gap-3 p-5">
                    <div>
                      <p className="text-base font-bold text-[#0f172a]">{preset.name}</p>
                      <p className="mt-1 flex flex-wrap gap-x-3 gap-y-1 text-xs text-[#64748b]">
                        <span>{preset.packageName}</span>
                        <span>· {preset.quantity} codes</span>
                        <span>· {preset.codeFormat}, {preset.codeLength} chars</span>
                        <span>· {preset.loginMethod === "credentials" ? "Username & Password" : "Single Code"}</span>
                        {preset.isGiveaway && <span>· Giveaway</span>}
                      </p>
                      <p className="mt-1 text-xs text-[#94a3b8]">
                        Saved {preset.createdAt}
                        {preset.pushedToAgentIds.length > 0 && (
                          <span className="ml-2 rounded-full bg-amber-100 px-2 py-0.5 font-semibold text-amber-700">
                            Pushed to {preset.pushedToAgentIds.length} agent{preset.pushedToAgentIds.length === 1 ? "" : "s"}
                          </span>
                        )}
                      </p>
                    </div>
                    <div className="flex items-center gap-2">
                      <button
                        type="button"
                        onClick={() => handleGenerate(preset.id)}
                        className="inline-flex items-center gap-1.5 rounded-xl bg-emerald-500 px-4 py-2.5 text-sm font-bold text-white hover:bg-emerald-600"
                      >
                        <Sparkles size={14} />
                        Generate
                      </button>
                      <button
                        type="button"
                        onClick={() => openPushPanel(preset.id)}
                        className="inline-flex items-center gap-1.5 rounded-xl border border-amber-300 bg-white px-4 py-2.5 text-sm font-bold text-amber-700 hover:bg-amber-100"
                      >
                        <UserCheck size={14} />
                        Push to Agents
                      </button>
                      <button
                        type="button"
                        onClick={(event) => openMenu(preset.id, event)}
                        className="rounded-xl border border-[#e2e8f0] bg-white p-2.5 text-[#64748b] hover:bg-[#ffffff]"
                        aria-label="More actions"
                      >
                        <MoreVertical size={16} />
                      </button>
                      {openMenuId === preset.id && (
                        <DropdownMenuPortal anchorRect={menuRect} onClose={closeMenu} width={180}>
                          <button
                            type="button"
                            onClick={() => {
                              closeMenu();
                              startEdit(preset.id);
                            }}
                            className="flex w-full items-center gap-2.5 px-4 py-2.5 text-left text-sm text-[#475569] hover:bg-[#f1f5f9]"
                          >
                            <Pencil size={14} /> Edit
                          </button>
                          <button
                            type="button"
                            onClick={() => handleDelete(preset.id)}
                            className="flex w-full items-center gap-2.5 px-4 py-2.5 text-left text-sm font-semibold text-red-600 hover:bg-red-50"
                          >
                            <Trash2 size={14} /> Delete
                          </button>
                        </DropdownMenuPortal>
                      )}
                    </div>
                  </div>

                  {pushPanelId === preset.id &&
                    (() => {
                      const hasAccess = (a: (typeof agents)[number]) =>
                        a.permissions["voucher.presets"] === "Allowed";
                      const eligibleAgents = agents.filter(
                        (a) => a.routerIp && preset.routerIps.includes(a.routerIp) && !a.isDefault,
                      );
                      const pushedAgents = agents.filter((a) => preset.pushedToAgentIds.includes(a.id));
                      const selectedLacking = eligibleAgents.filter(
                        (a) => pushAgentIds.includes(a.id) && !hasAccess(a),
                      );
                      return (
                        <div className="border-t border-amber-200 bg-amber-50 p-5">
                          {pushedAgents.length > 0 && (
                            <div className="mb-4">
                              <p className="mb-2 text-xs font-semibold text-[#475569]">Currently pushed to</p>
                              <div className="flex flex-wrap gap-2">
                                {pushedAgents.map((a) => (
                                  <span
                                    key={a.id}
                                    className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-bold ${
                                      hasAccess(a) ? "bg-emerald-100 text-emerald-700" : "bg-red-100 text-red-700"
                                    }`}
                                    title={
                                      hasAccess(a)
                                        ? "Can open this preset from their dashboard"
                                        : "Pushed, but can't see it — no preset access yet. Push again to grant it."
                                    }
                                  >
                                    {a.name}
                                    {!hasAccess(a) && <span className="font-semibold">· no access</span>}
                                    <button
                                      type="button"
                                      onClick={() => removeVoucherPresetPush(preset.id, a.id)}
                                      className="opacity-70 hover:opacity-100"
                                      title="Remove this preset from them"
                                    >
                                      ×
                                    </button>
                                  </span>
                                ))}
                              </div>
                            </div>
                          )}

                          {eligibleAgents.length === 0 ? (
                            <p className="text-sm text-[#94a3b8]">
                              No agents are linked to this preset&apos;s router(s) yet.
                            </p>
                          ) : (
                            <>
                              <p className="mb-3 text-xs text-[#64748b]">
                                Agents on this preset&apos;s router(s) — pushing lets them generate with these exact
                                settings from their own dashboard.
                              </p>
                              <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
                                {eligibleAgents.map((agent) => {
                                  const alreadyPushed = preset.pushedToAgentIds.includes(agent.id);
                                  const isSelected = pushAgentIds.includes(agent.id);
                                  return (
                                    <label
                                      key={agent.id}
                                      className={`flex items-center gap-2 rounded-xl border-2 px-3 py-2 text-sm transition ${
                                        isSelected ? "border-amber-400 bg-white" : "border-transparent bg-white hover:bg-amber-50"
                                      }`}
                                    >
                                      <input
                                        type="checkbox"
                                        checked={isSelected}
                                        onChange={() => togglePushAgent(agent.id)}
                                        className="h-4 w-4 rounded border-amber-300 accent-amber-600"
                                      />
                                      <span className="min-w-0 flex-1 truncate text-[#475569]">{agent.name}</span>
                                      {alreadyPushed && (
                                        <span className="shrink-0 rounded-full bg-emerald-100 px-2 py-0.5 text-[10px] font-bold text-emerald-700">
                                          Pushed
                                        </span>
                                      )}
                                      {!hasAccess(agent) && (
                                        <span className="shrink-0 rounded-full bg-red-100 px-2 py-0.5 text-[10px] font-bold text-red-700">
                                          No preset access
                                        </span>
                                      )}
                                    </label>
                                  );
                                })}
                              </div>

                              {selectedLacking.length > 0 && (
                                <label className="mt-3 flex items-start gap-2 rounded-xl border border-amber-300 bg-white p-3 text-xs text-[#475569]">
                                  <input
                                    type="checkbox"
                                    checked={grantAccess}
                                    onChange={(event) => setGrantAccess(event.target.checked)}
                                    className="mt-0.5 h-4 w-4 rounded border-amber-300 accent-amber-600"
                                  />
                                  <span>
                                    <strong>
                                      {selectedLacking.length} selected agent{selectedLacking.length === 1 ? "" : "s"} can&apos;t
                                      open presets yet
                                    </strong>{" "}
                                    ({selectedLacking.map((a) => a.name).join(", ")}). Also turn on &quot;Create, save
                                    &amp; use voucher presets&quot; for them, otherwise they won&apos;t see this preset.
                                  </span>
                                </label>
                              )}

                              <button
                                type="button"
                                onClick={() => confirmPush(preset.id)}
                                disabled={pushAgentIds.length === 0}
                                className="mt-3 inline-flex items-center gap-1.5 rounded-xl bg-amber-500 px-4 py-2.5 text-sm font-bold text-white hover:bg-amber-600 disabled:cursor-not-allowed disabled:opacity-50"
                              >
                                <UserCheck size={14} />
                                Push to {pushAgentIds.length || ""} Selected
                              </button>
                            </>
                          )}
                        </div>
                      );
                    })()}
                  </div>
                ) : (
                  <div className="space-y-4 bg-blue-50 p-5">
                    <label className="block">
                      <span className="mb-1.5 block text-xs font-semibold text-[#475569]">Preset name</span>
                      <input
                        value={editName}
                        onChange={(event) => setEditName(event.target.value)}
                        className="h-10 w-full rounded-xl border border-[#e2e8f0] bg-white px-3 text-sm outline-none focus:border-blue-500"
                      />
                    </label>

                    <div className="grid gap-3 sm:grid-cols-2">
                      <label className="block">
                        <span className="mb-1.5 block text-xs font-semibold text-[#475569]">Quantity</span>
                        <input
                          type="number"
                          min={1}
                          max={500}
                          value={editQuantity}
                          onChange={(event) => setEditQuantity(Number(event.target.value))}
                          className="h-10 w-full rounded-xl border border-[#e2e8f0] bg-white px-3 text-sm outline-none focus:border-blue-500"
                        />
                      </label>
                      <label className="block">
                        <span className="mb-1.5 block text-xs font-semibold text-[#475569]">Prefix</span>
                        <input
                          value={editPrefix}
                          maxLength={1}
                          onChange={(event) => setEditPrefix(event.target.value)}
                          className="h-10 w-full rounded-xl border border-[#e2e8f0] bg-white px-3 text-sm outline-none focus:border-blue-500"
                        />
                      </label>
                      <label className="block">
                        <span className="mb-1.5 block text-xs font-semibold text-[#475569]">Code Format</span>
                        <select
                          value={editCodeFormat}
                          onChange={(event) => setEditCodeFormat(event.target.value as VoucherCodeFormat)}
                          className="h-10 w-full rounded-xl border border-[#e2e8f0] bg-white px-3 text-sm outline-none focus:border-blue-500"
                        >
                          <option value="uppercase">Uppercase (A-Z, 0-9)</option>
                          <option value="lowercase">Lowercase (a-z, 0-9)</option>
                          <option value="mixed">Mixed Case</option>
                          <option value="numeric">Numeric only</option>
                        </select>
                      </label>
                      <label className="block">
                        <span className="mb-1.5 block text-xs font-semibold text-[#475569]">Code Length</span>
                        <select
                          value={editCodeLength}
                          onChange={(event) => setEditCodeLength(Number(event.target.value))}
                          className="h-10 w-full rounded-xl border border-[#e2e8f0] bg-white px-3 text-sm outline-none focus:border-blue-500"
                        >
                          {[4, 5, 6, 7, 8].map((len) => (
                            <option key={len} value={len}>
                              {len} characters
                            </option>
                          ))}
                        </select>
                      </label>
                    </div>

                    <div className="block">
                      <span className="mb-1.5 block text-xs font-semibold text-[#475569]">How customers log in</span>
                      <div className="grid gap-2 sm:grid-cols-2">
                        <button
                          type="button"
                          onClick={() => setEditLoginMethod("code")}
                          className={`rounded-xl border-2 p-2.5 text-left text-sm transition ${
                            editLoginMethod === "code" ? "border-blue-500 bg-white" : "border-[#e2e8f0] bg-white"
                          }`}
                        >
                          Single Code
                        </button>
                        <button
                          type="button"
                          onClick={() => setEditLoginMethod("credentials")}
                          className={`rounded-xl border-2 p-2.5 text-left text-sm transition ${
                            editLoginMethod === "credentials" ? "border-blue-500 bg-white" : "border-[#e2e8f0] bg-white"
                          }`}
                        >
                          Username &amp; Password
                        </button>
                      </div>
                    </div>

                    <div className="block">
                      <span className="mb-1.5 block text-xs font-semibold text-[#475569]">Routers</span>
                      <div className="max-h-36 space-y-2 overflow-y-auto rounded-xl border border-[#e2e8f0] bg-white p-2.5">
                        {businessLocations.map((site) => {
                          const siteRouters = routers.filter((r) => r.siteId === site.id);
                          if (siteRouters.length === 0) return null;
                          return (
                            <div key={site.id} className="rounded-lg border border-[#f1f5f9] p-2">
                              <span className="mb-1 flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-wide text-[#475569]">
                                <Building2 size={10} />
                                {site.name}
                              </span>
                              <div className="grid gap-1 sm:grid-cols-2">
                                {siteRouters.map((r) => (
                                  <label key={r.ip} className="flex items-center gap-2 rounded px-1.5 py-1 text-xs text-[#475569] hover:bg-[#ffffff]">
                                    <input
                                      type="checkbox"
                                      checked={editRouterIps.includes(r.ip)}
                                      onChange={() => toggleEditRouter(r.ip)}
                                      className="h-3.5 w-3.5 rounded border-[#e2e8f0] accent-blue-500"
                                    />
                                    {r.name.split(" (")[0]}
                                  </label>
                                ))}
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    </div>

                    <label className="flex items-center gap-2 text-sm text-[#475569]">
                      <input
                        type="checkbox"
                        checked={editIsGiveaway}
                        onChange={(event) => setEditIsGiveaway(event.target.checked)}
                        className="h-4 w-4 rounded border-[#e2e8f0] accent-blue-500"
                      />
                      Mark as Giveaway
                    </label>

                    <div className="flex gap-2 border-t border-blue-100 pt-4">
                      <button
                        type="button"
                        onClick={saveEdit}
                        disabled={!editName.trim()}
                        className="inline-flex items-center gap-1.5 rounded-xl bg-blue-500 px-4 py-2.5 text-sm font-bold text-white hover:bg-blue-600 disabled:cursor-not-allowed disabled:opacity-50"
                      >
                        <Check size={14} />
                        Save Changes
                      </button>
                      <button
                        type="button"
                        onClick={cancelEdit}
                        className="inline-flex items-center gap-1.5 rounded-xl border border-[#e2e8f0] bg-white px-4 py-2.5 text-sm font-bold text-[#475569] hover:bg-[#ffffff]"
                      >
                        <X size={14} />
                        Cancel
                      </button>
                    </div>
                  </div>
                )}
              </article>
            );
          })}
        </div>
      ) : null}

      {(() => {
        const target = voucherPresets.find((p) => p.id === deleteTargetId) ?? null;
        return (
          <DeletePresetDialog
            preset={target}
            audience="admin"
            sharedCount={target?.pushedToAgentIds.length ?? 0}
            sharedNames={agents.filter((a) => target?.pushedToAgentIds.includes(a.id)).map((a) => a.name)}
            onCancel={() => setDeleteTargetId(null)}
            onConfirm={confirmDelete}
          />
        );
      })()}
    </section>
  );
}
