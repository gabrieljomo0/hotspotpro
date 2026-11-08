"use client";

// Configuration → PPPoE. Where PPPoE is set up: which routers run a PPPoE
// server (and on what network), which packages are sold over PPPoE, and
// whether customers can register themselves. Subscribers live under
// Active Users → PPPoE Users.

import Link from "next/link";
import { useState } from "react";
import { Check, Package as PackageIcon, RadioTower, Router as RouterIcon, UserPlus, Users } from "lucide-react";

import { useDashboard } from "@/components/dashboard/context/DashboardContext";
import { BackLink } from "@/components/dashboard/shared/BackLink";
import { localizeAmountString } from "@/components/dashboard/shared/currency";

const NETWORK_PATTERN = /^(\d{1,3})\.(\d{1,3})\.(\d{1,3})\.(\d{1,3})\/(\d{1,2})$/;

function validNetwork(value: string) {
  const m = NETWORK_PATTERN.exec(value.trim());
  if (!m) return false;
  const octets = m.slice(1, 5).map(Number);
  const bits = Number(m[5]);
  return octets.every((o) => o <= 255) && bits >= 8 && bits <= 30;
}

function Switch({ on, onClick, label }: { on: boolean; onClick: () => void; label: string }) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={on}
      aria-label={label}
      onClick={onClick}
      className={`relative h-6 w-11 shrink-0 rounded-full transition ${on ? "bg-[#1a1a1a]" : "bg-[#d4d4d4]"}`}
    >
      <span className={`absolute top-0.5 h-5 w-5 rounded-full bg-white shadow transition-all ${on ? "left-[22px]" : "left-0.5"}`} />
    </button>
  );
}

export default function PppoeConfigurationPage() {
  const { routers, packages, hotspotPolicySettings, updateHotspotPolicySettings, updateRouterDetails } = useDashboard();
  const [drafts, setDrafts] = useState<Record<string, string>>({});

  const pppoeRouters = routers.filter((router) => router.pppoeEnabled);
  const pppoePackages = packages.filter((pkg) => pkg.pppoeEnabled);
  const activePackages = pppoePackages.filter((pkg) => pkg.status === "Active");

  function networkOf(ip: string, saved: string) {
    return drafts[ip] ?? saved;
  }

  return (
    <section className="w-full">
      <BackLink />
      <h2 className="mb-1 flex items-center gap-2 text-3xl font-bold tracking-tight md:text-4xl">
        <RadioTower className="text-[#1a1a1a]" size={30} />
        PPPoE
      </h2>
      <p className="mb-6 max-w-2xl text-sm text-[#737373] md:text-base">
        Set up wired PPPoE internet (fiber / DSL) for subscribers: choose the routers that run it, the packages
        sold over it, and whether customers can register online.
      </p>

      <div className="mb-6 grid gap-4 sm:grid-cols-3">
        {[
          { label: "Routers running PPPoE", value: `${pppoeRouters.length} of ${routers.length}`, icon: RouterIcon },
          { label: "PPPoE packages", value: `${activePackages.length} active`, icon: PackageIcon },
          { label: "Subscribers", value: "View list", icon: Users, href: "/dashboards/users/pppoe" },
        ].map((card) => {
          const Icon = card.icon;
          const body = (
            <>
              <Icon size={18} className="text-[#1a1a1a]" />
              <p className="mt-3 text-xs font-semibold text-[#737373]">{card.label}</p>
              <p className="mt-1 text-xl font-bold text-[#1a1a1a]">{card.value}</p>
            </>
          );
          return card.href ? (
            <Link key={card.label} href={card.href} className="rounded-2xl border border-[#e6e6e6] bg-white p-5 hover:border-[#1a1a1a]">
              {body}
            </Link>
          ) : (
            <div key={card.label} className="rounded-2xl border border-[#e6e6e6] bg-white p-5">
              {body}
            </div>
          );
        })}
      </div>

      {/* PPPoE servers */}
      <article className="mb-6 overflow-hidden rounded-2xl border border-[#e6e6e6] bg-white">
        <div className="border-b border-[#e6e6e6] px-5 py-4">
          <h3 className="text-lg font-bold text-[#1a1a1a]">PPPoE servers</h3>
          <p className="text-sm text-[#737373]">
            Turn PPPoE on for a router and pick the address range its subscribers get. A router picks up changes the
            next time its setup script runs (open the router and use <strong>Update Script</strong> in its actions menu).
          </p>
        </div>

        {routers.length === 0 ? (
          <p className="px-5 py-8 text-sm text-[#737373]">
            No routers yet.{" "}
            <Link href="/dashboards/configuration/routers/create" className="font-semibold text-[#1a1a1a]">
              Add a router
            </Link>{" "}
            to set up PPPoE.
          </p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[640px] text-left text-sm">
              <thead className="bg-[#f7f7f7] text-xs text-[#737373]">
                <tr>
                  <th className="px-5 py-3 font-semibold">Router</th>
                  <th className="px-5 py-3 font-semibold">Status</th>
                  <th className="px-5 py-3 font-semibold">PPPoE network</th>
                  <th className="px-5 py-3 text-right font-semibold">PPPoE</th>
                </tr>
              </thead>
              <tbody>
                {routers.map((router) => {
                  const draft = networkOf(router.ip, router.pppoeNetwork);
                  const dirty = draft !== router.pppoeNetwork;
                  const valid = validNetwork(draft);
                  return (
                    <tr key={router.ip} className="border-t border-[#f4f4f4]">
                      <td className="px-5 py-3">
                        <Link href={`/dashboards/configuration/routers/${router.ip}`} className="font-semibold text-[#1a1a1a] hover:text-[#1a1a1a]">
                          {router.name}
                        </Link>
                        <p className="font-mono text-xs text-[#a3a3a3]">{router.ip}</p>
                      </td>
                      <td className="px-5 py-3">
                        <span
                          className={`rounded-full px-2.5 py-1 text-xs font-semibold ${
                            router.status === "Online" ? "bg-emerald-100 text-emerald-700" : "bg-slate-100 text-slate-600"
                          }`}
                        >
                          {router.status}
                        </span>
                      </td>
                      <td className="px-5 py-3">
                        <div className="flex items-center gap-2">
                          <input
                            value={draft}
                            disabled={!router.pppoeEnabled}
                            onChange={(event) => setDrafts((current) => ({ ...current, [router.ip]: event.target.value }))}
                            aria-label={`PPPoE network for ${router.name}`}
                            className={`w-44 rounded-lg border px-3 py-2 font-mono text-xs outline-none focus:border-[#1a1a1a] disabled:bg-[#f7f7f7] disabled:text-[#a3a3a3] ${
                              dirty && !valid ? "border-[#1a1a1a]" : "border-[#d4d4d4]"
                            }`}
                          />
                          {dirty && (
                            <button
                              type="button"
                              disabled={!valid}
                              onClick={() => {
                                updateRouterDetails(router.ip, { pppoeNetwork: draft.trim() });
                                setDrafts((current) => {
                                  const next = { ...current };
                                  delete next[router.ip];
                                  return next;
                                });
                              }}
                              className="inline-flex items-center gap-1 rounded-lg bg-[#1a1a1a] px-3 py-2 text-xs font-bold text-white hover:bg-[#111111] disabled:opacity-40"
                            >
                              <Check size={13} /> Save
                            </button>
                          )}
                        </div>
                        {dirty && !valid && <p className="mt-1 text-xs text-[#1a1a1a]">Use a network like 192.168.91.0/24.</p>}
                      </td>
                      <td className="px-5 py-3">
                        <div className="flex justify-end">
                          <Switch
                            on={router.pppoeEnabled}
                            label={`PPPoE on ${router.name}`}
                            onClick={() => updateRouterDetails(router.ip, { pppoeEnabled: !router.pppoeEnabled })}
                          />
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </article>

      {/* PPPoE packages */}
      <article className="mb-6 overflow-hidden rounded-2xl border border-[#e6e6e6] bg-white">
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-[#e6e6e6] px-5 py-4">
          <div>
            <h3 className="text-lg font-bold text-[#1a1a1a]">PPPoE packages</h3>
            <p className="text-sm text-[#737373]">Packages with PPPoE switched on. Edit one to change its speed or price.</p>
          </div>
          <Link href="/dashboards/packages" className="rounded-lg border border-[#d4d4d4] px-3 py-2 text-xs font-bold text-[#525252] hover:bg-[#f4f4f4]">
            Manage packages
          </Link>
        </div>
        {pppoePackages.length === 0 ? (
          <p className="px-5 py-8 text-sm text-[#737373]">
            No package is sold over PPPoE yet. Create or edit a package and turn on <strong>PPPoE</strong>.
          </p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[560px] text-left text-sm">
              <thead className="bg-[#f7f7f7] text-xs text-[#737373]">
                <tr>
                  <th className="px-5 py-3 font-semibold">Package</th>
                  <th className="px-5 py-3 font-semibold">Speed (down / up)</th>
                  <th className="px-5 py-3 font-semibold">Validity</th>
                  <th className="px-5 py-3 font-semibold">Price</th>
                  <th className="px-5 py-3 font-semibold">Status</th>
                </tr>
              </thead>
              <tbody>
                {pppoePackages.map((pkg) => (
                  <tr key={pkg.id} className="border-t border-[#f4f4f4]">
                    <td className="px-5 py-3 font-semibold text-[#1a1a1a]">{pkg.name}</td>
                    <td className="px-5 py-3 text-[#525252]">{pkg.downloadMbps} / {pkg.uploadMbps} Mbps</td>
                    <td className="px-5 py-3 text-[#525252]">{pkg.validity}</td>
                    <td className="px-5 py-3 text-[#525252]">{localizeAmountString(pkg.price)}</td>
                    <td className="px-5 py-3">
                      <span className={`rounded-full px-2.5 py-1 text-xs font-semibold ${pkg.status === "Active" ? "bg-emerald-100 text-emerald-700" : "bg-slate-100 text-slate-600"}`}>
                        {pkg.status}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </article>

      {/* Self-registration */}
      <article className="rounded-2xl border border-[#e6e6e6] bg-white p-5">
        <div className="flex items-start justify-between gap-4">
          <div className="flex items-start gap-3">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-[#f4f4f4] text-[#1a1a1a]">
              <UserPlus size={18} />
            </div>
            <div>
              <h3 className="text-lg font-bold text-[#1a1a1a]">Customer self-registration</h3>
              <p className="text-sm text-[#737373]">
                Let new customers ask for PPPoE service online. You review each request and activate it yourself.
              </p>
              {hotspotPolicySettings.pppoeSelfRegistrationEnabled && (
                <p className="mt-2 text-xs text-[#737373]">
                  Registration page: <code className="rounded bg-[#f4f4f4] px-1">/pppoe/register</code> on your domain.
                </p>
              )}
            </div>
          </div>
          <Switch
            on={hotspotPolicySettings.pppoeSelfRegistrationEnabled}
            label="PPPoE self-registration"
            onClick={() => updateHotspotPolicySettings({ pppoeSelfRegistrationEnabled: !hotspotPolicySettings.pppoeSelfRegistrationEnabled })}
          />
        </div>
      </article>
    </section>
  );
}
