"use client";

// The "Clean-up" sub-tab under a router's Hotspot section: prune inactive
// users, wipe expired vouchers, and clear remembered-device cookies, all on
// their own schedule for THIS router. Edits are a draft until Save.

import { useEffect, useState } from "react";
import { Check, Play } from "lucide-react";

import { useDashboard } from "@/components/dashboard/context/DashboardContext";
import type { RouterInfo } from "@/components/dashboard/data/dashboard-data";
import { Toggle } from "@/components/dashboard/settings/SettingsFormControls";
import { askConfirm } from "@/components/dashboard/shared/askConfirm";
import { cookieCount, expiredVouchersFor, inactiveUsers, staleCookies, type RouterCleanupSettings } from "../routerCleanup";

function DaysInput({ id, value, onChange, disabled }: { id: string; value: number; onChange: (n: number) => void; disabled?: boolean }) {
  return (
    <span className="inline-flex items-center gap-2">
      <input
        data-testid={id}
        type="number"
        min={1}
        max={365}
        disabled={disabled}
        value={Number.isFinite(value) ? value : ""}
        onChange={(e) => onChange(Math.max(1, Math.min(365, Math.floor(Number(e.target.value) || 1))))}
        className="h-10 w-20 rounded-lg border border-[#d4d4d4] bg-white px-2 text-center text-sm text-[#2563eb] outline-none focus:border-[#2563eb] disabled:bg-[#f4f4f4] disabled:text-[#a3a3a3]"
      />
      <span className="text-sm text-[#525252]">days</span>
    </span>
  );
}

function Row({
  testId,
  title,
  blurb,
  on,
  onToggle,
  children,
  preview,
}: {
  testId: string;
  title: string;
  blurb: string;
  on: boolean;
  onToggle: () => void;
  children: React.ReactNode;
  preview: string;
}) {
  return (
    <div data-testid={testId} className="rounded-xl border border-[#e6e6e6] p-4">
      <div className="flex items-start gap-3">
        <span data-testid={`${testId}-switch`} className="pt-0.5">
          <Toggle checked={on} onChange={onToggle} />
        </span>
        <div className="min-w-0 flex-1">
          <p className="text-sm font-bold text-[#2563eb]">{title}</p>
          <p className="text-xs text-[#737373]">{blurb}</p>
          {on && (
            <div className="mt-3 flex flex-wrap items-center gap-3">
              {children}
              <span data-testid={`${testId}-preview`} className="rounded-md bg-[#f4f4f4] px-2.5 py-1 text-xs font-semibold text-[#525252]">
                {preview}
              </span>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

export function CleanupTab({ router }: { router: Pick<RouterInfo, "ip" | "name"> }) {
  const { getRouterCleanup, updateRouterCleanup, runRouterCleanup, routerCleanup, users, vouchers, voucherBatches, agents, showToast } = useDashboard();
  const saved = getRouterCleanup(router.ip);
  const [draft, setDraft] = useState<RouterCleanupSettings>(saved);
  // Saved settings load just after the first render.
  useEffect(() => {
    setDraft(getRouterCleanup(router.ip));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [router.ip, routerCleanup]);

  const dirty = JSON.stringify({ ...draft, lastRunMs: 0 }) !== JSON.stringify({ ...saved, lastRunMs: 0 });
  const set = (u: Partial<RouterCleanupSettings>) => setDraft((d) => ({ ...d, ...u }));
  const routerOf = (v: { agentId: string }) => agents.find((a) => a.id === v.agentId)?.routerIp ?? null;

  const inactive = inactiveUsers(users, router.ip, draft.pruneAfterDays).length;
  const expired = expiredVouchersFor(vouchers, voucherBatches, router.ip, draft.vouchersAfterDays, routerOf).length;
  const stale = staleCookies(users, router.ip, draft.cookiesAfterDays).length;
  const plural = (n: number, word: string) => `${n} ${word}${n === 1 ? "" : "s"}`;

  async function runNow() {
    const ok = await askConfirm(
      "Run clean-up now? This permanently removes what matches your settings on this router: inactive users, expired vouchers and old cookies, for the switches that are on.",
      "Run clean-up",
    );
    if (!ok) return;
    const r = runRouterCleanup(router.ip);
    showToast(`Clean-up done: removed ${plural(r.users, "inactive user")} and ${plural(r.vouchers, "expired voucher")}, cleared ${plural(r.cookies, "cookie")}.`);
  }

  const last = saved.lastRunMs ? new Date(saved.lastRunMs).toLocaleString("en-GB", { day: "2-digit", month: "short", hour: "2-digit", minute: "2-digit" }) : "Never";

  return (
    <article data-testid="cleanup-tab" className="rounded-2xl border border-[#e6e6e6] bg-white p-6 md:p-8">
      <h3 className="text-lg font-bold text-[#2563eb]">Clean-up</h3>
      <p className="mb-6 text-sm text-[#737373]">
        Keep {router.name.split(" (")[0]} tidy automatically. Each switch below is off until you turn it on, and the clean-up runs once a day at the time you choose.
      </p>

      <div className="space-y-4">
        <Row
          testId="cleanup-prune"
          title="Prune inactive users"
          blurb="Remove voucher users who are offline and have not been seen for a while."
          on={draft.pruneEnabled}
          onToggle={() => set({ pruneEnabled: !draft.pruneEnabled })}
          preview={`${plural(inactive, "user")} would be removed now`}
        >
          <span className="text-sm text-[#525252]">Inactive for</span>
          <DaysInput id="cleanup-prune-days" value={draft.pruneAfterDays} onChange={(n) => set({ pruneAfterDays: n })} />
        </Row>

        <Row
          testId="cleanup-vouchers"
          title="Wipe expired vouchers"
          blurb="Delete vouchers on this router that have expired."
          on={draft.vouchersEnabled}
          onToggle={() => set({ vouchersEnabled: !draft.vouchersEnabled })}
          preview={`${plural(expired, "voucher")} would be wiped now`}
        >
          <span className="text-sm text-[#525252]">Expired for at least</span>
          <DaysInput id="cleanup-vouchers-days" value={draft.vouchersAfterDays} onChange={(n) => set({ vouchersAfterDays: n })} />
        </Row>

        <Row
          testId="cleanup-cookies"
          title="Clear remembered-device cookies"
          blurb="Devices that were remembered for auto-reconnect have to log in again once their cookie is this old."
          on={draft.cookiesEnabled}
          onToggle={() => set({ cookiesEnabled: !draft.cookiesEnabled })}
          preview={`${plural(stale, "cookie")} would be cleared now (${cookieCount(users, router.ip)} stored)`}
        >
          <span className="text-sm text-[#525252]">Older than</span>
          <DaysInput id="cleanup-cookies-days" value={draft.cookiesAfterDays} onChange={(n) => set({ cookiesAfterDays: n })} />
        </Row>

        <div className="rounded-xl bg-[#f4f4f4] p-4">
          <label className="flex flex-wrap items-center gap-3">
            <span className="text-sm font-bold text-[#2563eb]">Run every day at</span>
            <input
              data-testid="cleanup-time"
              type="time"
              value={draft.runAt}
              onChange={(e) => set({ runAt: e.target.value || "03:00" })}
              className="h-10 rounded-lg border border-[#d4d4d4] bg-white px-3 text-sm text-[#2563eb] outline-none focus:border-[#2563eb]"
            />
            <span className="text-xs text-[#737373]">A quiet hour is best. Last run: <strong data-testid="cleanup-last">{last}</strong></span>
          </label>
        </div>
      </div>

      <div className="mt-6 flex flex-wrap items-center justify-between gap-3">
        <button
          type="button"
          data-testid="cleanup-run"
          onClick={runNow}
          className="inline-flex h-11 items-center gap-2 rounded-xl border border-[#d4d4d4] bg-white px-4 text-sm font-bold text-[#2563eb] hover:bg-[#f4f4f4]"
        >
          <Play size={15} /> Run clean-up now
        </button>
        <div className="flex items-center gap-3">
          {dirty && <span className="text-xs font-semibold text-[#1d4ed8]">Unsaved changes</span>}
          <button
            type="button"
            data-testid="cleanup-save"
            onClick={() => updateRouterCleanup(router.ip, { ...draft, lastRunMs: saved.lastRunMs })}
            className="inline-flex h-11 items-center gap-2 rounded-xl bg-[#2563eb] px-6 text-sm font-bold text-white hover:bg-[#1d4ed8]"
          >
            <Check size={16} /> Save clean-up settings
          </button>
        </div>
      </div>
    </article>
  );
}
