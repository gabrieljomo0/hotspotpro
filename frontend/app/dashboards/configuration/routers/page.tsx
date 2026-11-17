"use client";

import { useState, type FormEvent, type MouseEvent } from "react";
import { createPortal } from "react-dom";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { PlayCircle, Plus, Search, MoreVertical, X } from "lucide-react";

import { useDashboard } from "@/components/dashboard/context/DashboardContext";
import { BackLink } from "@/components/dashboard/shared/BackLink";
import { RouterActionsMenu } from "@/components/dashboard/routers/RouterActionsMenu";
import { ConnectionBadge } from "@/components/dashboard/routers/ConnectionBadge";
import { useRouterControl } from "@/components/dashboard/routers/useRouterControl";
import { isRouterLiveOnline, routerLiveStatus } from "@/components/dashboard/routers/routerLiveStatus";

type StatusFilter = "All" | "Online" | "Offline" | "Pending" | "Error";

export default function RoutersPage() {
  const navigate = useRouter();
  const {
    routers,
    routerEnabled,
    showToast,
    addBusinessLocation,
    toggleRemoteAccess,
    openRouterAction,
    openRouterActions,
    closeAllActionMenus,
  } = useDashboard();
  const { control } = useRouterControl();

  const [statusFilter, setStatusFilter] = useState<StatusFilter>("All");
  const [query, setQuery] = useState("");
  const [addSiteOpen, setAddSiteOpen] = useState(false);
  const [siteName, setSiteName] = useState("");
  const [subdomain, setSubdomain] = useState("");
  const [deviceChooserOpen, setDeviceChooserOpen] = useState(false);
  const [menuRect, setMenuRect] = useState<DOMRect | null>(null);

  const onlineCount = routers.filter((r) => isRouterLiveOnline(r, control[r.ip], routerEnabled)).length;
  const offlineCount = routers.length - onlineCount;
  const pendingCount = routers.filter((r) => r.provisioningStatus === "Pending").length;
  const errorCount = routers.filter((r) => !!r.lastError).length;

  const visibleRouters = routers.filter((router) => {
    const isOnline = isRouterLiveOnline(router, control[router.ip], routerEnabled);
    const matchesStatus =
      statusFilter === "All" ||
      (statusFilter === "Online" && isOnline) ||
      (statusFilter === "Offline" && !isOnline) ||
      (statusFilter === "Pending" && router.provisioningStatus === "Pending") ||
      (statusFilter === "Error" && !!router.lastError);
    const matchesQuery = !query || router.name.toLowerCase().includes(query.toLowerCase());
    return matchesStatus && matchesQuery;
  });

  function handleCreateSite(event: FormEvent) {
    event.preventDefault();
    if (!siteName.trim() || !subdomain.trim()) return;
    const site = addBusinessLocation(siteName.trim());
    showToast(`Site "${site.name}" created at ${subdomain}.hotspotpro.com.`);
    setAddSiteOpen(false);
    setSiteName("");
    setSubdomain("");
    // Open the new site straight away so a router can be added to it.
    navigate.push(`/dashboards/configuration/sites/${encodeURIComponent(site.id)}?new=1`);
  }

  function handleOpenMenu(ip: string, event: React.MouseEvent<HTMLElement>) {
    setMenuRect((event.currentTarget as HTMLElement).getBoundingClientRect());
    openRouterActions(ip);
  }

  function handleChooseDevice(kind: "MikroTik" | "Ruijie") {
    setDeviceChooserOpen(false);
    if (kind === "Ruijie") {
      showToast("Ruijie support is coming soon — MikroTik is fully supported today.");
      return;
    }
    navigate.push("/dashboards/configuration/routers/create");
  }

  return (
    <section className="w-full">
      <BackLink />
      <div className="mb-6 flex flex-wrap items-start justify-between gap-4">
        <div>
          <h2 className="mb-1 text-3xl font-bold tracking-tight md:text-4xl">Routers</h2>
          <p className="max-w-2xl text-sm text-[#737373] md:text-base">
            {routers.length} router{routers.length === 1 ? "" : "s"} on your account · {onlineCount} online, {offlineCount} offline.
          </p>
        </div>

        <div className="flex flex-wrap gap-2">
          <button
            type="button"
            onClick={() => showToast("Tutorial video coming soon.")}
            className="inline-flex items-center gap-2 rounded-xl border border-[#e6e6e6] bg-white px-4 py-2.5 text-sm font-semibold text-[#525252] hover:bg-[#ffffff]"
          >
            <PlayCircle size={16} />
            Watch Tutorial
          </button>
          <button
            type="button"
            onClick={() => setAddSiteOpen(true)}
            className="inline-flex items-center gap-2 rounded-xl border border-[#e6e6e6] bg-white px-4 py-2.5 text-sm font-semibold text-[#525252] hover:bg-[#ffffff]"
          >
            <Plus size={16} />
            Add New Site
          </button>
          <button
            type="button"
            onClick={() => setDeviceChooserOpen(true)}
            className="inline-flex items-center gap-2 rounded-xl bg-[#1a1a1a] px-4 py-2.5 text-sm font-bold text-white hover:bg-[#111111]"
          >
            <Plus size={16} />
            Add Router
          </button>
        </div>
      </div>

      <article className="overflow-hidden rounded-2xl border border-[#e6e6e6] bg-white shadow-[0_8px_24px_rgba(26,26,26,0.06)]">
        <div className="flex flex-wrap items-center gap-3 border-b border-[#e6e6e6] px-5 py-4">
          <div className="flex gap-1.5">
            {(["All", "Online", "Offline", "Pending", "Error"] as StatusFilter[]).map((status) => (
              <button
                type="button"
                key={status}
                onClick={() => setStatusFilter(status)}
                className={`rounded-lg px-3 py-2 text-xs font-semibold transition ${
                  statusFilter === status
                    ? "bg-[#f4f4f4] text-[#1a1a1a]"
                    : "text-[#737373] hover:bg-[#ffffff]"
                }`}
              >
                {status}
                <span className="ml-1.5 opacity-70">
                  {status === "All"
                    ? routers.length
                    : status === "Online"
                      ? onlineCount
                      : status === "Offline"
                        ? offlineCount
                        : status === "Pending"
                          ? pendingCount
                          : errorCount}
                </span>
              </button>
            ))}
          </div>

          <div className="relative ml-auto">
            <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-[#a3a3a3]" />
            <input
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder="Search routers..."
              className="h-10 w-60 rounded-lg border border-[#e6e6e6] bg-white pl-8 pr-3 text-sm outline-none focus:border-[#1a1a1a]"
            />
          </div>
        </div>

        <div>
          <table className="w-full table-fixed text-left text-sm">
            <thead className="bg-[#ffffff] text-xs text-[#737373]">
              <tr>
                <th className="px-4 py-4 font-semibold">Router</th>
                <th className="hidden px-4 py-4 font-semibold sm:table-cell">Provisioning</th>
                <th className="hidden px-4 py-4 font-semibold md:table-cell">CPU</th>
                <th className="hidden px-4 py-4 font-semibold md:table-cell">Memory</th>
                <th className="px-4 py-4 font-semibold">Status</th>
                <th className="hidden px-4 py-4 font-semibold lg:table-cell">Connection</th>
                <th className="hidden px-4 py-4 font-semibold xl:table-cell">Remote Access</th>
                <th className="hidden px-4 py-4 font-semibold xl:table-cell">WinBox Address</th>
                <th className="px-4 py-4 text-center font-semibold">Actions</th>
              </tr>
            </thead>
            <tbody>
              {visibleRouters.length === 0 && (
                <tr>
                  <td colSpan={9} className="px-5 py-10 text-center text-[#a3a3a3]">
                    {routers.length === 0
                      ? "No router is connected yet. When the setup command finishes on the router, it shows up here as connected."
                      : "No routers match this filter."}
                  </td>
                </tr>
              )}
              {visibleRouters.map((router) => {
                const live = routerLiveStatus(router, control[router.ip], routerEnabled);
                const isOnline = live === "Online";
                const detailHref = `/dashboards/configuration/routers/${router.ip}`;

                return (
                  <tr
                    key={router.ip}
                    onClick={() => navigate.push(detailHref)}
                    className="cursor-pointer border-t border-[#f4f4f4] hover:bg-[#ffffff]"
                  >
                    <td className="px-4 py-4">
                      <span className="truncate font-semibold text-[#1a1a1a]">{router.name}</span>
                      <ConnectionBadge router={router} control={control[router.ip]} />
                      {router.lastError && (
                        <p className="mt-0.5 truncate text-xs text-red-600">{router.lastError}</p>
                      )}
                    </td>
                    <td className="hidden px-4 py-4 sm:table-cell">
                      <span
                        className={`rounded-full px-2.5 py-1 text-xs font-semibold ${
                          router.provisioningStatus === "Provisioned"
                            ? "bg-[#f4f4f4] text-[#111111]"
                            : router.provisioningStatus === "Pending"
                              ? "bg-[#f4f4f4] text-[#111111]"
                              : "bg-slate-200 text-slate-700"
                        }`}
                      >
                        {router.provisioningStatus}
                      </span>
                    </td>
                    <td className="hidden px-4 py-4 font-semibold text-[#111111] md:table-cell">{router.cpu}%</td>
                    <td className="hidden px-4 py-4 font-semibold text-[#111111] md:table-cell">{router.memory}%</td>
                    <td className="px-4 py-4">
                      <span
                        className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-semibold ${
                          isOnline ? "bg-[#f4f4f4] text-[#111111]" : "bg-red-100 text-red-700"
                        }`}
                      >
                        <span className={`h-1.5 w-1.5 rounded-full ${isOnline ? "bg-[#1a1a1a]" : "bg-red-500"}`} />
                        {live}
                      </span>
                    </td>
                    <td className="hidden px-4 py-4 lg:table-cell">
                      <span className="inline-flex items-center gap-1 rounded-full bg-[#f4f4f4] px-2.5 py-1 text-xs font-bold text-[#111111]">
                        ✨ {router.connectionMode}
                      </span>
                    </td>
                    <td className="hidden px-4 py-4 xl:table-cell" onClick={(event) => event.stopPropagation()}>
                      <button
                        type="button"
                        onClick={() => toggleRemoteAccess(router.ip)}
                        aria-pressed={router.remoteAccessEnabled}
                        className={`inline-flex items-center gap-2 rounded-full px-3.5 py-2 text-xs font-bold shadow-sm transition ${
                          router.remoteAccessEnabled
                            ? "bg-[#1a1a1a] text-white hover:bg-[#1a1a1a]"
                            : "bg-slate-300 text-slate-700 hover:bg-slate-400"
                        }`}
                      >
                        <span
                          className={`flex h-4 w-8 items-center rounded-full p-0.5 transition ${
                            router.remoteAccessEnabled ? "justify-end bg-[#111111]" : "justify-start bg-white"
                          }`}
                        >
                          <span className="h-3 w-3 rounded-full bg-white shadow" />
                        </span>
                        {router.remoteAccessEnabled ? "ON" : "OFF"}
                      </button>
                    </td>
                    <td className="hidden truncate px-4 py-4 font-mono text-xs text-[#1a1a1a] xl:table-cell">
                      {router.remoteAccessEnabled ? router.winboxAddress || "assigning…" : "—"}
                    </td>
                    <td className="px-4 py-4 text-center" onClick={(event) => event.stopPropagation()}>
                      <button
                        type="button"
                        onClick={(event) => handleOpenMenu(router.ip, event)}
                        className="rounded-lg border border-[#e6e6e6] p-2 text-[#525252] hover:bg-[#f4f4f4]"
                        aria-label="Router actions"
                      >
                        <MoreVertical size={16} />
                      </button>

                      {openRouterAction === router.ip && (
                        <RouterActionsMenu
                          router={router}
                          anchorRect={menuRect}
                          onClose={closeAllActionMenus}
                        />
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>

        <div className="border-t border-[#e6e6e6] px-5 py-3 text-sm text-[#737373]">
          Showing {visibleRouters.length} result{visibleRouters.length === 1 ? "" : "s"}
        </div>
      </article>

      {deviceChooserOpen &&
        createPortal(
          <div className="fixed inset-0 z-[500] flex items-center justify-center bg-slate-950/50 p-4">
            <button type="button" aria-label="Close" className="absolute inset-0" onClick={() => setDeviceChooserOpen(false)} />
            <div className="relative z-10 w-full max-w-md rounded-2xl bg-white p-6 shadow-2xl">
              <div className="mb-1 flex items-center justify-between">
                <h3 className="text-lg font-bold text-[#1a1a1a]">Device Configuration</h3>
                <button type="button" onClick={() => setDeviceChooserOpen(false)} className="rounded-lg p-1.5 text-[#737373] hover:bg-[#ffffff]">
                  <X size={18} />
                </button>
              </div>
              <p className="mb-5 text-sm text-[#737373]">Choose the type of device you want to connect.</p>
              <div className="grid grid-cols-2 gap-3">
                <button
                  type="button"
                  onClick={() => handleChooseDevice("MikroTik")}
                  className="flex flex-col items-center gap-2 rounded-xl border-2 border-[#e6e6e6] p-5 text-center hover:border-[#1a1a1a] hover:bg-[#ffffff]"
                >
                  <span className="flex h-10 w-10 items-center justify-center rounded-lg bg-[#f4f4f4] text-sm font-black text-[#111111]">
                    MT
                  </span>
                  <span className="text-sm font-bold text-[#1a1a1a]">MikroTik</span>
                </button>
                <button
                  type="button"
                  onClick={() => handleChooseDevice("Ruijie")}
                  className="flex flex-col items-center gap-2 rounded-xl border-2 border-[#e6e6e6] p-5 text-center hover:border-[#1a1a1a] hover:bg-[#ffffff]"
                >
                  <span className="flex h-10 w-10 items-center justify-center rounded-lg bg-[#f4f4f4] text-sm font-black text-[#111111]">
                    R
                  </span>
                  <span className="text-sm font-bold text-[#1a1a1a]">Ruijie</span>
                  <span className="text-[10px] font-semibold text-[#a3a3a3]">Coming soon</span>
                </button>
              </div>
            </div>
          </div>,
          document.body,
        )}

      {addSiteOpen &&
        createPortal(
          <div className="fixed inset-0 z-[500] flex items-center justify-center bg-slate-950/50 p-4">
            <button type="button" aria-label="Close" className="absolute inset-0" onClick={() => setAddSiteOpen(false)} />
            <div className="relative z-10 w-full max-w-md rounded-2xl bg-white p-6 shadow-2xl">
              <div className="mb-4 flex items-center justify-between">
                <h3 className="text-lg font-bold text-[#1a1a1a]">Add New Site</h3>
                <button type="button" onClick={() => setAddSiteOpen(false)} className="rounded-lg p-1.5 text-[#737373] hover:bg-[#ffffff]">
                  <X size={18} />
                </button>
              </div>
              <p className="mb-4 text-sm text-[#737373]">
                Create another hotspot site under your account, then add a
                router there.
              </p>
              <form onSubmit={handleCreateSite} data-testid="add-site-form" className="space-y-4">
                <label className="block">
                  <span className="mb-2 block text-sm font-semibold text-[#525252]">
                    Site Name <span className="text-red-500">*</span>
                  </span>
                  <input
                    required
                    value={siteName}
                    onChange={(event) => setSiteName(event.target.value)}
                    placeholder="e.g., FastNet Kasubi"
                    className="h-11 w-full rounded-xl border border-[#e6e6e6] bg-white px-3 text-sm outline-none focus:border-[#1a1a1a]"
                  />
                </label>
                <label className="block">
                  <span className="mb-2 block text-sm font-semibold text-[#525252]">
                    Subdomain <span className="text-red-500">*</span>
                  </span>
                  <div className="flex overflow-hidden rounded-xl border border-[#e6e6e6] focus-within:border-[#1a1a1a]">
                    <input
                      required
                      value={subdomain}
                      onChange={(event) => setSubdomain(event.target.value.toLowerCase().replace(/[^a-z0-9-]/g, "-"))}
                      placeholder="e.g., fastnet-kasubi"
                      className="h-11 w-full px-3 text-sm outline-none"
                    />
                    <span className="flex items-center bg-[#ffffff] px-3 text-xs font-semibold text-[#737373]">
                      .hotspotpro.com
                    </span>
                  </div>
                </label>
                <div className="flex gap-3">
                  <button type="submit" className="rounded-xl bg-[#1a1a1a] px-5 py-3 text-sm font-bold text-white hover:bg-[#111111]">
                    Create Site
                  </button>
                  <button type="button" onClick={() => setAddSiteOpen(false)} className="rounded-xl border border-[#e6e6e6] bg-white px-5 py-3 text-sm font-bold text-[#525252] hover:bg-[#ffffff]">
                    Cancel
                  </button>
                </div>
              </form>
            </div>
          </div>,
          document.body,
        )}
    </section>
  );
}
