"use client";

import { localizeAmountString } from "@/components/dashboard/shared/currency";
import { use, useState } from "react";
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
  MoreVertical,
  Plus,
} from "lucide-react";

import { settingsOf } from "@/components/dashboard/agents/agentSettings";
import { useDashboard } from "@/components/dashboard/context/DashboardContext";
import { AgentPortalPage } from "@/components/agent-portal/AgentPortalPage";
import { getSellablePackages } from "@/components/dashboard/agents/agentPackages";
import { DropdownMenuPortal } from "@/components/dashboard/shared/DropdownMenuPortal";
import { DeletePresetDialog } from "@/components/dashboard/vouchers/DeletePresetDialog";
import type { VoucherCodeFormat, VoucherLoginMethod } from "@/components/dashboard/shared/types";

export default function AgentVoucherPresetsPage({
  params,
}: {
  params: Promise<{ agentId: string }>;
}) {
  const { agentId } = use(params);
  const router = useRouter();
  const { voucherPresets, deleteVoucherPreset, updateVoucherPreset, saveVoucherPreset, generateVoucherBatch, packages, routers } = useDashboard();

  const [editingId, setEditingId] = useState<string | null>(null);
  const [editName, setEditName] = useState("");
  const [editQuantity, setEditQuantity] = useState(60);
  const [editCodeFormat, setEditCodeFormat] = useState<VoucherCodeFormat>("uppercase");
  const [editCodeLength, setEditCodeLength] = useState(6);
  const [editPrefix, setEditPrefix] = useState("");
  const [editLoginMethod, setEditLoginMethod] = useState<VoucherLoginMethod>("code");
  const [editIsGiveaway, setEditIsGiveaway] = useState(false);
  const [openMenuId, setOpenMenuId] = useState<string | null>(null);
  const [menuRect, setMenuRect] = useState<DOMRect | null>(null);
  const [creatingNew, setCreatingNew] = useState(false);
  const [deleteTargetId, setDeleteTargetId] = useState<string | null>(null);
  const [newPackageName, setNewPackageName] = useState("");

  function openMenu(presetId: string, event: React.MouseEvent<HTMLElement>) {
    setMenuRect((event.currentTarget as HTMLElement).getBoundingClientRect());
    setOpenMenuId((current) => (current === presetId ? null : presetId));
  }

  function closeMenu() {
    setOpenMenuId(null);
  }

  return (
    <AgentPortalPage
      agentId={agentId}
      permissionKey="voucher.presets"
      featureLabel="Voucher presets"
      render={(agent) => {
        // What this agent can actually use: their own presets, plus
        // anything admin has explicitly pushed to them.
        const usablePresets = voucherPresets.filter(
          (p) => p.ownerAgentId === agent.id || p.pushedToAgentIds.includes(agent.id),
        );

        // Editing/deleting is a separate permission admin has to switch on,
        // and only ever applies to presets the agent made themselves —
        // presets pushed by admin are use-only.
        const canManage = agent.permissions["voucher.presetsManage"] === "Allowed";

        function startEdit(presetId: string) {
          const preset = usablePresets.find((p) => p.id === presetId);
          if (!canManage || !preset || preset.ownerAgentId !== agent.id) return;
          setEditingId(presetId);
          setEditName(preset.name);
          setEditQuantity(preset.quantity);
          setEditCodeFormat(preset.codeFormat);
          setEditCodeLength(preset.codeLength);
          setEditPrefix(preset.prefix);
          setEditLoginMethod(preset.loginMethod);
          setEditIsGiveaway(preset.isGiveaway);
        }

        function saveEdit() {
          const preset = usablePresets.find((p) => p.id === editingId);
          if (!canManage || !editingId || !editName.trim() || !preset || preset.ownerAgentId !== agent.id) return;
          updateVoucherPreset(editingId, {
            name: editName.trim(),
            packageName: preset.packageName,
            quantity: editQuantity,
            codeFormat: editCodeFormat,
            codeLength: editCodeLength,
            prefix: editPrefix,
            loginMethod: editLoginMethod,
            isGiveaway: editIsGiveaway,
            routerIps: preset.routerIps,
          });
          setEditingId(null);
        }

        // Opens the confirmation pop-up — nothing is deleted until it's confirmed there.
        function handleDelete(presetId: string) {
          const preset = usablePresets.find((p) => p.id === presetId);
          if (!canManage || !preset || preset.ownerAgentId !== agent.id) return;
          closeMenu();
          setDeleteTargetId(presetId);
        }

        function confirmDelete() {
          const preset = usablePresets.find((p) => p.id === deleteTargetId);
          if (canManage && preset && preset.ownerAgentId === agent.id) deleteVoucherPreset(preset.id);
          setDeleteTargetId(null);
        }

        // Only what this agent may actually sell: packages on their router,
        // all-site packages, and anything admin pushed to them.
        const sellablePackages = getSellablePackages(packages, agent);
        const agentRouterName = settingsOf(agent).allowViewAssignedRouters
          ? (routers.find((r) => r.ip === agent.routerIp)?.name.split(" (")[0] ?? "your router")
          : "your router";
        const canCreate = sellablePackages.length > 0 && agent.routerIp !== null;

        function startCreate() {
          setEditingId(null);
          setEditName("");
          setNewPackageName(sellablePackages[0]?.name ?? "");
          setEditQuantity(60);
          setEditCodeFormat("uppercase");
          setEditCodeLength(6);
          setEditPrefix("");
          setEditLoginMethod("code");
          setEditIsGiveaway(false);
          setCreatingNew(true);
        }

        function cancelCreate() {
          setCreatingNew(false);
        }

        function submitCreate() {
          if (!editName.trim() || !newPackageName || agent.routerIp === null) return;
          saveVoucherPreset(
            {
              name: editName.trim(),
              packageName: newPackageName,
              quantity: editQuantity,
              codeFormat: editCodeFormat,
              codeLength: editCodeLength,
              prefix: editPrefix,
              loginMethod: editLoginMethod,
              isGiveaway: editIsGiveaway,
              routerIps: [agent.routerIp],
            },
            agent.id,
          );
          setCreatingNew(false);
        }

        function handleGenerate(presetId: string) {
          const preset = usablePresets.find((p) => p.id === presetId);
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
            actingAgentId: agent.id,
          });
          if (!batch) return;
          router.push(`/agent-portal/${agentId}/vouchers/batch/${batch.id}`);
        }

        return (
          <section>
            <Link
              href={`/agent-portal/${agentId}/vouchers`}
              className="mb-5 inline-flex items-center gap-2 rounded-xl bg-[#f4f4f4] px-4 py-2.5 text-sm font-semibold text-[#525252] hover:bg-[#f7f7f7]"
            >
              <ArrowLeft size={16} />
              Back to Vouchers
            </Link>

            <div className="mb-6 flex flex-wrap items-start justify-between gap-3">
              <div>
                <h1 className="flex items-center gap-2 text-2xl font-black text-[#1a1a1a] md:text-3xl">
                  <Bookmark className="text-[#1a1a1a]" size={26} />
                  Voucher Presets
                </h1>
                <p className="mt-1 text-sm text-[#737373]">
                  Your own saved setups, plus anything admin has pushed to you.
                </p>
              </div>
              {!creatingNew && (
                <button
                  type="button"
                  onClick={startCreate}
                  disabled={!canCreate}
                  className="inline-flex items-center gap-2 rounded-xl bg-[#1a1a1a] px-4 py-2.5 text-sm font-bold text-white hover:bg-[#111111] disabled:cursor-not-allowed disabled:opacity-50"
                >
                  <Plus size={16} />
                  Create New Preset
                </button>
              )}
            </div>

            {creatingNew && (
              <article className="mb-4 overflow-hidden rounded-2xl border-2 bg-white shadow-sm">
                <div className="border-b bg-[#f4f4f4] px-5 py-4">
                  <p className="text-sm font-bold text-[#1a1a1a]">Create New Preset</p>
                  <p className="text-xs text-[#737373]">
                    Set it up once, then generate from it any time. It&apos;ll apply to {agentRouterName}.
                  </p>
                </div>
                <div className="space-y-4 p-5">
                  <div className="grid gap-3 sm:grid-cols-2">
                    <label className="block">
                      <span className="mb-1.5 block text-xs font-semibold text-[#525252]">Preset name</span>
                      <input
                        autoFocus
                        value={editName}
                        onChange={(event) => setEditName(event.target.value)}
                        placeholder='e.g. "Daily 50 codes"'
                        className="h-10 w-full rounded-xl border border-[#d4d4d4] bg-white px-3 text-sm outline-none focus:border-[#d4d4d4]"
                      />
                    </label>
                    <label className="block">
                      <span className="mb-1.5 block text-xs font-semibold text-[#525252]">Package</span>
                      <select
                        value={newPackageName}
                        onChange={(event) => setNewPackageName(event.target.value)}
                        className="h-10 w-full rounded-xl border border-[#d4d4d4] bg-white px-3 text-sm outline-none focus:border-[#d4d4d4]"
                      >
                        {sellablePackages.map((pkg) => (
                          <option key={pkg.id} value={pkg.name}>
                            {pkg.name} · {localizeAmountString(pkg.price)}
                          </option>
                        ))}
                      </select>
                    </label>
                    <label className="block">
                      <span className="mb-1.5 block text-xs font-semibold text-[#525252]">Quantity</span>
                      <input
                        type="number"
                        min={1}
                        max={500}
                        value={editQuantity}
                        onChange={(event) => setEditQuantity(Number(event.target.value))}
                        className="h-10 w-full rounded-xl border border-[#d4d4d4] bg-white px-3 text-sm outline-none focus:border-[#d4d4d4]"
                      />
                    </label>
                    <label className="block">
                      <span className="mb-1.5 block text-xs font-semibold text-[#525252]">Prefix</span>
                      <input
                        value={editPrefix}
                        maxLength={1}
                        onChange={(event) => setEditPrefix(event.target.value)}
                        className="h-10 w-full rounded-xl border border-[#d4d4d4] bg-white px-3 text-sm outline-none focus:border-[#d4d4d4]"
                      />
                    </label>
                    <label className="block">
                      <span className="mb-1.5 block text-xs font-semibold text-[#525252]">Code Format</span>
                      <select
                        value={editCodeFormat}
                        onChange={(event) => setEditCodeFormat(event.target.value as VoucherCodeFormat)}
                        className="h-10 w-full rounded-xl border border-[#d4d4d4] bg-white px-3 text-sm outline-none focus:border-[#d4d4d4]"
                      >
                        <option value="uppercase">Uppercase (A-Z, 0-9)</option>
                        <option value="lowercase">Lowercase (a-z, 0-9)</option>
                        <option value="mixed">Mixed Case</option>
                        <option value="numeric">Numeric only</option>
                      </select>
                    </label>
                    <label className="block">
                      <span className="mb-1.5 block text-xs font-semibold text-[#525252]">Code Length</span>
                      <select
                        value={editCodeLength}
                        onChange={(event) => setEditCodeLength(Number(event.target.value))}
                        className="h-10 w-full rounded-xl border border-[#d4d4d4] bg-white px-3 text-sm outline-none focus:border-[#d4d4d4]"
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
                    <span className="mb-1.5 block text-xs font-semibold text-[#525252]">How customers log in</span>
                    <div className="grid gap-2 sm:grid-cols-2">
                      <button
                        type="button"
                        onClick={() => setEditLoginMethod("code")}
                        className={`rounded-xl border-2 p-2.5 text-left text-sm transition ${ editLoginMethod === "code" ? "border-[#e6e6e6] bg-white" : "border-[#e6e6e6] bg-white" }`}
                      >
                        Single Code
                      </button>
                      <button
                        type="button"
                        onClick={() => setEditLoginMethod("credentials")}
                        className={`rounded-xl border-2 p-2.5 text-left text-sm transition ${ editLoginMethod === "credentials" ? "border-[#e6e6e6] bg-white" : "border-[#e6e6e6] bg-white" }`}
                      >
                        Username &amp; Password
                      </button>
                    </div>
                  </div>

                  <label className="flex items-center gap-2 text-sm text-[#525252]">
                    <input
                      type="checkbox"
                      checked={editIsGiveaway}
                      onChange={(event) => setEditIsGiveaway(event.target.checked)}
                      className="h-4 w-4 rounded border-[#e6e6e6] accent-[#1a1a1a]"
                    />
                    Mark as Giveaway
                  </label>

                  <div className="flex gap-2 border-t pt-4">
                    <button
                      type="button"
                      onClick={submitCreate}
                      disabled={!editName.trim() || !newPackageName}
                      className="inline-flex items-center gap-1.5 rounded-xl bg-[#1a1a1a] px-4 py-2.5 text-sm font-bold text-white hover:bg-[#111111] disabled:cursor-not-allowed disabled:opacity-50"
                    >
                      <Check size={14} />
                      Create Preset
                    </button>
                    <button
                      type="button"
                      onClick={cancelCreate}
                      className="inline-flex items-center gap-1.5 rounded-xl bg-[#f4f4f4] px-4 py-2.5 text-sm font-bold text-[#525252] hover:bg-[#f7f7f7]"
                    >
                      <X size={14} />
                      Cancel
                    </button>
                  </div>
                </div>
              </article>
            )}

            {usablePresets.length === 0 && !creatingNew ? (
              <div className="rounded-2xl bg-white p-10 text-center text-sm text-[#a3a3a3]">
                No presets yet.{" "}
                {canCreate ? (
                  <button
                    type="button"
                    onClick={startCreate}
                    className="font-semibold text-[#1a1a1a] hover:underline"
                  >
                    Create your first one →
                  </button>
                ) : (
                  "You'll be able to create one once admin gives you a package to sell — or ask admin to push you a preset."
                )}
              </div>
            ) : usablePresets.length > 0 ? (
              <div className="space-y-4">
                {usablePresets.map((preset) => {
                  const isEditing = editingId === preset.id;
                  const isMine = preset.ownerAgentId === agent.id;
                  return (
                    <article
                      key={preset.id}
                      className="overflow-hidden rounded-2xl bg-white shadow-sm"
                    >
                      {!isEditing ? (
                        <div className="flex flex-wrap items-center justify-between gap-3 p-5">
                          <div>
                            <p className="flex items-center gap-2 text-base font-bold text-[#1a1a1a]">
                              {preset.name}
                              {!isMine && (
                                <span className="rounded-full bg-[#f4f4f4] px-2 py-0.5 text-[10px] font-bold text-[#1a1a1a]">
                                  Pushed by admin
                                </span>
                              )}
                            </p>
                            <p className="mt-1 flex flex-wrap gap-x-3 gap-y-1 text-xs text-[#737373]">
                              <span>{preset.packageName}</span>
                              <span>· {preset.quantity} codes</span>
                              <span>· {preset.codeFormat}, {preset.codeLength} chars</span>
                              <span>· {preset.loginMethod === "credentials" ? "Username & Password" : "Single Code"}</span>
                              {preset.isGiveaway && <span>· Giveaway</span>}
                            </p>
                          </div>
                          <div className="flex items-center gap-2">
                            <button
                              type="button"
                              onClick={() => handleGenerate(preset.id)}
                              className="inline-flex items-center gap-1.5 rounded-xl bg-[#1a1a1a] px-4 py-2.5 text-sm font-bold text-white hover:bg-[#111111]"
                            >
                              <Sparkles size={14} />
                              Generate
                            </button>
                            {isMine && canManage && (
                              <>
                                <button
                                  type="button"
                                  onClick={(event) => openMenu(preset.id, event)}
                                  className="rounded-xl bg-[#f4f4f4] p-2.5 text-[#737373] hover:bg-[#f7f7f7]"
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
                                      className="flex w-full items-center gap-2.5 px-4 py-2.5 text-left text-sm text-[#525252] hover:bg-[#f4f4f4]"
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
                              </>
                            )}
                          </div>
                        </div>
                      ) : (
                        <div className="space-y-4 bg-[#f4f4f4] p-5">
                          <label className="block">
                            <span className="mb-1.5 block text-xs font-semibold text-[#525252]">Preset name</span>
                            <input
                              value={editName}
                              onChange={(event) => setEditName(event.target.value)}
                              className="h-10 w-full rounded-xl border border-[#d4d4d4] bg-white px-3 text-sm outline-none focus:border-[#d4d4d4]"
                            />
                          </label>
                          <div className="grid gap-3 sm:grid-cols-2">
                            <label className="block">
                              <span className="mb-1.5 block text-xs font-semibold text-[#525252]">Quantity</span>
                              <input
                                type="number"
                                min={1}
                                max={500}
                                value={editQuantity}
                                onChange={(event) => setEditQuantity(Number(event.target.value))}
                                className="h-10 w-full rounded-xl border border-[#d4d4d4] bg-white px-3 text-sm outline-none focus:border-[#d4d4d4]"
                              />
                            </label>
                            <label className="block">
                              <span className="mb-1.5 block text-xs font-semibold text-[#525252]">Prefix</span>
                              <input
                                value={editPrefix}
                                maxLength={1}
                                onChange={(event) => setEditPrefix(event.target.value)}
                                className="h-10 w-full rounded-xl border border-[#d4d4d4] bg-white px-3 text-sm outline-none focus:border-[#d4d4d4]"
                              />
                            </label>
                            <label className="block">
                              <span className="mb-1.5 block text-xs font-semibold text-[#525252]">Code Format</span>
                              <select
                                value={editCodeFormat}
                                onChange={(event) => setEditCodeFormat(event.target.value as VoucherCodeFormat)}
                                className="h-10 w-full rounded-xl border border-[#d4d4d4] bg-white px-3 text-sm outline-none focus:border-[#d4d4d4]"
                              >
                                <option value="uppercase">Uppercase (A-Z, 0-9)</option>
                                <option value="lowercase">Lowercase (a-z, 0-9)</option>
                                <option value="mixed">Mixed Case</option>
                                <option value="numeric">Numeric only</option>
                              </select>
                            </label>
                            <label className="block">
                              <span className="mb-1.5 block text-xs font-semibold text-[#525252]">Code Length</span>
                              <select
                                value={editCodeLength}
                                onChange={(event) => setEditCodeLength(Number(event.target.value))}
                                className="h-10 w-full rounded-xl border border-[#d4d4d4] bg-white px-3 text-sm outline-none focus:border-[#d4d4d4]"
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
                            <span className="mb-1.5 block text-xs font-semibold text-[#525252]">How customers log in</span>
                            <div className="grid gap-2 sm:grid-cols-2">
                              <button
                                type="button"
                                onClick={() => setEditLoginMethod("code")}
                                className={`rounded-xl border-2 p-2.5 text-left text-sm transition ${ editLoginMethod === "code" ? "border-[#e6e6e6] bg-white" : "border-[#e6e6e6] bg-white" }`}
                              >
                                Single Code
                              </button>
                              <button
                                type="button"
                                onClick={() => setEditLoginMethod("credentials")}
                                className={`rounded-xl border-2 p-2.5 text-left text-sm transition ${ editLoginMethod === "credentials" ? "border-[#e6e6e6] bg-white" : "border-[#e6e6e6] bg-white" }`}
                              >
                                Username &amp; Password
                              </button>
                            </div>
                          </div>
                          <label className="flex items-center gap-2 text-sm text-[#525252]">
                            <input
                              type="checkbox"
                              checked={editIsGiveaway}
                              onChange={(event) => setEditIsGiveaway(event.target.checked)}
                              className="h-4 w-4 rounded border-[#e6e6e6] accent-[#1a1a1a]"
                            />
                            Mark as Giveaway
                          </label>
                          <div className="flex gap-2 border-t pt-4">
                            <button
                              type="button"
                              onClick={saveEdit}
                              disabled={!editName.trim()}
                              className="inline-flex items-center gap-1.5 rounded-xl bg-[#1a1a1a] px-4 py-2.5 text-sm font-bold text-white hover:bg-[#111111] disabled:cursor-not-allowed disabled:opacity-50"
                            >
                              <Check size={14} />
                              Save Changes
                            </button>
                            <button
                              type="button"
                              onClick={() => setEditingId(null)}
                              className="inline-flex items-center gap-1.5 rounded-xl bg-[#f4f4f4] px-4 py-2.5 text-sm font-bold text-[#525252] hover:bg-[#f7f7f7]"
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
              const target = usablePresets.find((p) => p.id === deleteTargetId) ?? null;
              return (
                <DeletePresetDialog
                  preset={target}
                  audience="agent"
                  sharedCount={target?.pushedToAgentIds.length ?? 0}
                  onCancel={() => setDeleteTargetId(null)}
                  onConfirm={confirmDelete}
                />
              );
            })()}
          </section>
        );
      }}
    />
  );
}
