"use client";

// This is a specific router's own page (System Information, Hotspot,
// Captive Portal, Reports, Internet Users, Assigned Agents, Multi-WAN tabs).
// It used to be one 876-line file with every tab's markup, the actions
// menu, and two modals all mixed together. It's now broken into small
// focused pieces under components/dashboard/routers/detail/, so editing
// one tab (say, adding a field to Multi-WAN) can't accidentally break
// another tab or the actions menu.
//
// This file's job is just to: load the router, work out which tab is
// active, and render the right piece for it.

import { use, useEffect, useState, Suspense } from "react";
import { useSearchParams } from "next/navigation";
import Link from "next/link";
import dynamic from "next/dynamic";
import { MoreVertical, Settings2, Loader2 } from "lucide-react";

import { useDashboard } from "@/components/dashboard/context/DashboardContext";
import { NotFoundCard } from "@/components/dashboard/shared/ActionPageLayout";
import { agentsAssignedToRouter } from "@/components/dashboard/agents/routerAgents";
import { RouterCaptivePortalPanel } from "@/components/dashboard/routers/RouterCaptivePortalPanel";
import { hashString } from "@/components/dashboard/active-users/advanced-details/helpers";
import { getUserId } from "@/components/dashboard/active-users/userLinks";

import { SystemInformationTab } from "@/components/dashboard/routers/detail/SystemInformationTab";
import { ReportsTab } from "@/components/dashboard/routers/detail/ReportsTab";
import { RouterConnectionBanner } from "@/components/dashboard/routers/detail/RouterConnectionBanner";
import { RouterUsageStrip } from "@/components/dashboard/routers/detail/RouterUsageStrip";
import { DataUsageTab } from "@/components/dashboard/routers/detail/DataUsageTab";
import { InternetUsersTab } from "@/components/dashboard/routers/detail/InternetUsersTab";
import { AccessPointsTab } from "@/components/dashboard/routers/detail/AccessPointsTab";
import { MultiWanTab } from "@/components/dashboard/routers/detail/MultiWanTab";
import { AdvancedTab } from "@/components/dashboard/routers/detail/AdvancedTab";
import { RouterMoreActionsMenu } from "@/components/dashboard/routers/detail/RouterMoreActionsMenu";
import { ReprovisionPastePanel } from "@/components/dashboard/routers/detail/ReprovisionPastePanel";
import { RouterConfirmDialog, type ConfirmDialogState } from "@/components/dashboard/routers/detail/RouterConfirmDialog";
import { useRouterControl } from "@/components/dashboard/routers/useRouterControl";
import { routerLiveStatus } from "@/components/dashboard/routers/routerLiveStatus";

// A rarely-opened settings popup — loaded only when actually needed.
const NotificationContactsModal = dynamic(
  () => import("@/components/dashboard/routers/detail/NotificationContactsModal").then((m) => m.NotificationContactsModal),
  { ssr: false },
);

const TABS = ["System Information", "Hotspot", "Captive Portal", "Data Usage", "Reports", "Internet Users", "Assigned Agents", "Multi-WAN", "Advanced"] as const;
type Tab = (typeof TABS)[number];

function RouterDetailPageInner({
  params,
}: {
  params: Promise<{ routerIp: string }>;
}) {
  const { routerIp } = use(params);
  const decodedIp = decodeURIComponent(routerIp);
  const searchParams = useSearchParams();

  const { routers, routerEnabled, agents, users, startRouterTask, businessLocations } = useDashboard();
  const { control } = useRouterControl(decodedIp, 5000);
  const router = routers.find((r) => r.ip === decodedIp);

  const setupDone = searchParams.get("setup") === "done";
  const [tab, setTab] = useState<Tab>(
    searchParams.get("tab") === "captive-portal"
      ? "Captive Portal"
      : searchParams.get("tab") === "hotspot"
        ? "Hotspot"
        : searchParams.get("tab") === "data-usage"
          ? "Data Usage"
          : searchParams.get("tab") === "multiwan"
            ? "Multi-WAN"
            : "System Information",
  );
  const [setupNotice, setSetupNotice] = useState(setupDone);
  const [giveUp, setGiveUp] = useState(false);
  const site = router?.siteId ? businessLocations.find((s) => s.id === router.siteId) : undefined;
  const [moreOpen, setMoreOpen] = useState(false);
  const [moreRect, setMoreRect] = useState<DOMRect | null>(null);
  const [confirmDialog, setConfirmDialog] = useState<ConfirmDialogState>(null);
  const [notifModalOpen, setNotifModalOpen] = useState(false);

  useEffect(() => {
    if (router || !setupDone) return;
    const timer = window.setTimeout(() => setGiveUp(true), 12000);
    return () => window.clearTimeout(timer);
  }, [router, setupDone]);

  if (!router) {
    if (setupDone && !giveUp) {
      return (
        <div className="flex min-h-[60vh] flex-col items-center justify-center gap-3 text-center">
          <Loader2 className="h-9 w-9 animate-spin text-[#1a1a1a]" />
          <p className="text-sm font-bold text-[#1a1a1a]">Router connected successfully.</p>
          <p className="text-sm text-[#737373]">Opening the captive portal settings…</p>
        </div>
      );
    }
    return (
      <div className="p-6">
        <NotFoundCard message="This router may have been removed." backHref="/dashboards/configuration/routers" />
      </div>
    );
  }

  const live = routerLiveStatus(router, control[router.ip], routerEnabled);
  const isEnabled = live === "Online";

  // A rough "who's connected to this router" and "which agents work here"
  // list, based on a consistent hash of each user/agent — see the shared
  // hashString helper for why this looks random but isn't.
  const connectedUsers = users.filter((user) => {
    const seed = hashString(getUserId(user));
    return routers[seed % routers.length]?.ip === router.ip;
  });
  const assignedAgents = agentsAssignedToRouter(agents, router.ip);

  function confirmAnd(title: string, message: string, action: () => void) {
    setConfirmDialog({ title, message, onConfirm: action });
  }

  return (
    <section className="w-full">
      <Link
        href="/dashboards/configuration/routers"
        className="mb-4 inline-flex items-center gap-2 rounded-xl border border-[#e6e6e6] bg-white px-4 py-2.5 text-sm font-semibold text-[#525252] hover:bg-[#ffffff]"
      >
        ← Back to Routers
      </Link>

      <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <h1 className="text-2xl font-black text-[#1a1a1a] md:text-3xl">{router.name}</h1>
          <span className={`rounded-full px-3 py-1 text-xs font-bold ${isEnabled ? "bg-[#f4f4f4] text-[#111111]" : "bg-red-100 text-red-700"}`}>
            {live}
          </span>
          {site && (
            <Link
              href={`/dashboards/configuration/sites/${encodeURIComponent(site.id)}`}
              data-testid="router-site-link"
              className="rounded-full bg-[#f4f4f4] px-3 py-1 text-xs font-bold text-[#1a1a1a] hover:bg-white"
            >
              {site.name}
            </Link>
          )}
        </div>

        <div className="flex gap-2">
          <button
            type="button"
            data-testid="full-provision"
            onClick={() => startRouterTask("full-provision", router.ip)}
            className="inline-flex items-center gap-2 rounded-xl bg-[#1a1a1a] px-4 py-2.5 text-sm font-bold text-white hover:bg-[#111111]"
          >
            <Settings2 size={15} />
            Full Provision
          </button>

          <div className="relative">
            <button
              type="button"
              onClick={(event) => {
                setMoreRect((event.currentTarget as HTMLElement).getBoundingClientRect());
                setMoreOpen((current) => !current);
              }}
              className="inline-flex items-center gap-2 rounded-xl bg-[#1a1a1a] px-4 py-2.5 text-sm font-bold text-white hover:bg-[#1a1a1a]"
            >
              <MoreVertical size={15} />
              More Actions
            </button>

            {moreOpen && (
              <RouterMoreActionsMenu
                router={router}
                anchorRect={moreRect}
                onClose={() => setMoreOpen(false)}
                onGoToMultiWan={() => setTab("Multi-WAN")}
                onOpenNotifications={() => setNotifModalOpen(true)}
                onConfirm={confirmAnd}
              />
            )}
          </div>
        </div>
      </div>

      {setupNotice && (
        <div data-testid="setup-success" className="mb-6 flex flex-wrap items-start justify-between gap-3 rounded-xl bg-[#f4f4f4] p-4">
          <div>
            <p className="text-sm font-bold text-[#1a1a1a]">Router connected successfully. Thank you for using our system.</p>
            <p className="mt-1 text-sm text-[#1a1a1a]">Set up the captive portal below. This is the login page customers see when they join the WiFi.</p>
          </div>
          <button
            type="button"
            onClick={() => setSetupNotice(false)}
            className="rounded-lg border border-[#1a1a1a] bg-white px-3 py-1.5 text-xs font-bold text-[#1a1a1a] hover:bg-white"
          >
            Dismiss
          </button>
        </div>
      )}

      <RouterConnectionBanner router={router} onReconnect={() => startRouterTask("reconnect", router.ip)} />

      {tab !== "Data Usage" && <RouterUsageStrip routerIp={router.ip} onOpen={() => setTab("Data Usage")} />}

      <nav className="mb-6 flex flex-wrap gap-2 border-b border-[#f4f4f4] pb-4">
        {TABS.map((t) => (
          <button
            key={t}
            type="button"
            onClick={() => setTab(t)}
            className={`rounded-lg px-3 py-2 text-sm font-semibold transition ${
              tab === t ? "bg-[#f4f4f4] text-[#1a1a1a]" : "text-[#737373] hover:bg-[#ffffff]"
            }`}
          >
            {t}
          </button>
        ))}
      </nav>

      {tab === "System Information" && (
        <div className="space-y-6">
          <SystemInformationTab router={router} isEnabled={isEnabled} connectedUserCount={router.clients ?? connectedUsers.length} />
          <ReprovisionPastePanel router={router} />
        </div>
      )}

      {tab === "Hotspot" && (
        <div className="space-y-6">
          <ReprovisionPastePanel router={router} />
          <RouterCaptivePortalPanel router={router} section="hotspot" />
        </div>
      )}
      {tab === "Captive Portal" && <RouterCaptivePortalPanel router={router} section="portal" />}

      {tab === "Data Usage" && <DataUsageTab router={router} />}

      {tab === "Reports" && <ReportsTab routerIp={router.ip} />}

      {tab === "Internet Users" && <InternetUsersTab names={router.liveUsers ?? []} />}

      {tab === "Assigned Agents" && <AccessPointsTab assignedAgents={assignedAgents} />}

      {tab === "Multi-WAN" && <MultiWanTab router={router} />}

      {tab === "Advanced" && <AdvancedTab router={router} />}

      <RouterConfirmDialog dialog={confirmDialog} onCancel={() => setConfirmDialog(null)} />

      {notifModalOpen && (
        <NotificationContactsModal router={router} onClose={() => setNotifModalOpen(false)} />
      )}
    </section>
  );
}

export default function RouterDetailPage({
  params,
}: {
  params: Promise<{ routerIp: string }>;
}) {
  return (
    <Suspense
      fallback={
        <div className="flex min-h-[60vh] items-center justify-center">
          <Loader2 className="h-9 w-9 animate-spin text-[#1a1a1a]" />
        </div>
      }
    >
      <RouterDetailPageInner params={params} />
    </Suspense>
  );
}
