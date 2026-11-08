"use client";

// "How big is this network?" — picks the hotspot address range from the
// number of people using it at once. Left: a ladder of four sizes. Right: the
// address plan that results (network, router address, DHCP pool, capacity),
// with an editor to type your own address if you need to.

import { Network, RotateCcw, SlidersHorizontal } from "lucide-react";

import {
  PEAK_PLANS,
  enoughFor,
  parseLanIp,
  planFor,
  type PeakChoice,
} from "./hotspotSizing";

const TIER_BLURB: Record<PeakChoice, string> = {
  "200": "Café, shop, small office",
  "500": "Hotel, school block, big venue",
  "1000": "Large hotel, mall, estate",
  "1000+": "Campus or whole town",
};

// Bar length per tier (share of the biggest tier, on a log-ish scale so the
// small tiers are still visible).
const TIER_BAR: Record<PeakChoice, number> = { "200": 22, "500": 42, "1000": 64, "1000+": 100 };

function Row({ label, value, testId }: { label: string; value: string; testId?: string }) {
  return (
    <div className="flex items-baseline justify-between gap-3 border-b border-[#333333] py-2.5 last:border-b-0">
      <dt className="text-xs font-semibold uppercase tracking-wide text-[#a3a3a3]">{label}</dt>
      <dd data-testid={testId} className="text-right font-mono text-sm font-semibold text-white">
        {value}
      </dd>
    </div>
  );
}

export function HotspotSizingPanel({
  peak,
  onPeak,
  lanIp,
  onLanIp,
  customizing,
  onCustomizing,
}: {
  peak: PeakChoice;
  onPeak: (peak: PeakChoice) => void;
  lanIp: string;
  onLanIp: (value: string) => void;
  customizing: boolean;
  onCustomizing: (open: boolean) => void;
}) {
  const plan = planFor(peak);
  const effective = lanIp.trim() || plan.lanIp;
  const parsed = parseLanIp(effective);
  const error = "error" in parsed ? parsed.error : "";
  const tooSmall = !("error" in parsed) && !enoughFor(parsed.usableHosts, plan);

  // The editor shows the address as four boxes and a size.
  const pieces = effective.split(/[./]/);
  const octets = [pieces[0] ?? "", pieces[1] ?? "", pieces[2] ?? "", pieces[3] ?? ""];
  const prefix = pieces[4] ?? "24";
  function setPart(index: number, value: string) {
    const next = [...octets];
    next[index] = value.replace(/\D/g, "").slice(0, 3);
    onLanIp(`${next.join(".")}/${prefix}`);
  }
  function setPrefix(value: string) {
    onLanIp(`${octets.join(".")}/${value}`);
  }

  return (
    <div data-testid="hotspot-sizing" className="mt-5 border-t border-[#e6e6e6] pt-5">
      <div className="mb-4 flex items-center gap-2">
        <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-[#1a1a1a] text-white">
          <Network size={16} />
        </span>
        <div>
          <p className="text-sm font-bold text-[#1a1a1a]">Network size</p>
          <p className="text-xs text-[#737373]">Pick how many people will be online at the same time.</p>
        </div>
      </div>

      <div className="grid gap-5 lg:grid-cols-[1fr_1fr]">
        {/* Left: the size ladder */}
        <div role="radiogroup" aria-label="Users at peak" className="space-y-2">
          {PEAK_PLANS.map((tier) => {
            const active = peak === tier.id;
            return (
              <button
                key={tier.id}
                type="button"
                role="radio"
                aria-checked={active}
                data-testid={`peak-${tier.id}`}
                aria-pressed={active}
                onClick={() => onPeak(tier.id)}
                className={`w-full rounded-xl border-2 p-3 text-left ${
                  active ? "border-[#1a1a1a] bg-[#f4f4f4]" : "border-[#e6e6e6] bg-white hover:border-[#a3a3a3]"
                }`}
              >
                <div className="flex items-center gap-3">
                  <span
                    className={`flex h-5 w-5 shrink-0 items-center justify-center rounded-full border-2 ${
                      active ? "border-[#1a1a1a]" : "border-[#d4d4d4]"
                    }`}
                  >
                    {active && <span className="h-2.5 w-2.5 rounded-full bg-[#1a1a1a]" />}
                  </span>
                  <div className="min-w-0 flex-1">
                    <p className={`text-sm font-bold ${active ? "text-[#111111]" : "text-[#1a1a1a]"}`}>{tier.label}</p>
                    <p className="text-xs text-[#737373]">{TIER_BLURB[tier.id]}</p>
                  </div>
                  <span className="shrink-0 font-mono text-xs font-semibold text-[#525252]">/{tier.lanIp.split("/")[1]}</span>
                </div>
                <div className="mt-2.5 h-1.5 w-full rounded-full bg-[#e6e6e6]">
                  <div
                    className={`h-1.5 rounded-full ${active ? "bg-[#1a1a1a]" : "bg-[#a3a3a3]"}`}
                    style={{ width: `${TIER_BAR[tier.id]}%` }}
                  />
                </div>
              </button>
            );
          })}
        </div>

        {/* Right: the resulting address plan */}
        <div className="flex flex-col rounded-xl bg-[#1a1a1a] p-4">
          <p className="mb-1 text-xs font-bold uppercase tracking-wide text-[#a3a3a3]">Address plan</p>
          {"error" in parsed ? (
            <p data-testid="hotspot-summary" className="py-6 text-sm font-semibold text-[#f3f1ec]">
              Fix the address below to see the plan.
            </p>
          ) : (
            <dl data-testid="hotspot-summary">
              <Row label="Network" value={parsed.network} />
              <Row label="Router address" value={parsed.ip} />
              <Row label="DHCP pool" value={`${parsed.poolStart} – ${parsed.poolEnd}`} />
              <Row label="Room for" value={`${parsed.usableHosts.toLocaleString()} devices`} />
            </dl>
          )}

          <div className="mt-4">
            {!customizing ? (
              <button
                type="button"
                data-testid="advanced-ip-toggle"
                onClick={() => onCustomizing(true)}
                className="inline-flex items-center gap-2 rounded-lg bg-white px-3 py-2 text-xs font-bold text-[#1a1a1a] hover:bg-[#e6e6e6]"
              >
                <SlidersHorizontal size={14} />
                Set my own address
              </button>
            ) : (
              <div data-testid="advanced-ip" className="rounded-lg bg-[#262626] p-3">
                <div className="mb-2 flex items-center justify-between">
                  <span className="text-xs font-bold text-white">Router address</span>
                  <button
                    type="button"
                    data-testid="use-default-ip"
                    onClick={() => {
                      onLanIp("");
                      onCustomizing(false);
                    }}
                    className="inline-flex items-center gap-1 text-xs font-semibold text-[#f3f1ec] hover:text-white"
                  >
                    <RotateCcw size={12} />
                    Back to recommended
                  </button>
                </div>
                <div className="flex items-center gap-1.5">
                  {octets.map((value, index) => (
                    <div key={index} className="flex items-center gap-1.5">
                      <input
                        data-testid={`lan-octet-${index}`}
                        inputMode="numeric"
                        aria-label={`Address part ${index + 1}`}
                        value={value}
                        onChange={(event) => setPart(index, event.target.value)}
                        className="h-10 w-full min-w-0 rounded-lg border border-[#525252] bg-white px-1 text-center font-mono text-sm font-semibold text-[#1a1a1a] outline-none focus:border-[#1a1a1a]"
                      />
                      {index < 3 && <span className="font-bold text-[#a3a3a3]">.</span>}
                    </div>
                  ))}
                  <span className="px-0.5 font-bold text-[#a3a3a3]">/</span>
                  <select
                    data-testid="lan-prefix"
                    aria-label="Network size"
                    value={prefix}
                    onChange={(event) => setPrefix(event.target.value)}
                    className="h-10 rounded-lg border border-[#525252] bg-white px-1.5 font-mono text-sm font-semibold text-[#1a1a1a] outline-none focus:border-[#1a1a1a]"
                  >
                    {Array.from({ length: 14 }, (_, i) => 16 + i).map((n) => (
                      <option key={n} value={String(n)}>
                        {n}
                      </option>
                    ))}
                  </select>
                </div>
                <p className="mt-2 text-[11px] text-[#a3a3a3]">
                  The router, gateway and DHCP are set up for you from this address.
                </p>
                {error && (
                  <p data-testid="lan-ip-error" className="mt-2 rounded-md bg-[#f3f1ec] p-2 text-xs font-semibold text-[#1a1a1a]">
                    {error}
                  </p>
                )}
                {!error && tooSmall && (
                  <p data-testid="lan-ip-small" className="mt-2 rounded-md bg-[#f3f1ec] p-2 text-xs font-semibold text-[#111111]">
                    Too small for {plan.label.toLowerCase()}. Some users may not get an address at busy times. Use a
                    smaller number after the slash.
                  </p>
                )}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
