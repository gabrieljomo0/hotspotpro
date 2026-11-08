"use client";

// A short "just give me a package" form for agents: name, price, how long it
// lasts and (optionally) a data limit. Everything else uses sensible defaults,
// and the router is the one the admin assigned — the agent never picks one.

import { useState, type FormEvent } from "react";
import { Zap, X } from "lucide-react";

import { sym } from "@/components/dashboard/shared/currency";
import { DEFAULT_FORM } from "@/components/dashboard/packages/PackageForm";
import type { RouterInfo } from "@/components/dashboard/data/dashboard-data";
import type {
  AgentProfile,
  BusinessLocation,
  PackageDurationUnit,
  PackageInput,
} from "@/components/dashboard/shared/types";

const UNITS: PackageDurationUnit[] = ["Minutes", "Hours", "Days", "Weeks", "Months"];
export const QUICK_DEFAULT_SPEED_MBPS = 5;

const inputClass =
  "h-11 w-full rounded-xl border border-[#d4d4d4] bg-white px-3 text-sm outline-none focus:border-[#1a1a1a]";

export function buildQuickPackage(
  agent: AgentProfile,
  routers: RouterInfo[],
  fields: { name: string; price: string; durationValue: string; durationUnit: PackageDurationUnit; dataGb: string },
): { input?: PackageInput; error?: string } {
  const name = fields.name.trim();
  const price = Number(fields.price);
  const duration = Number(fields.durationValue);
  const data = fields.dataGb.trim() === "" ? null : Number(fields.dataGb);
  if (!agent.routerIp) return { error: "Your admin hasn't assigned you a router yet." };
  if (!name) return { error: "Give the package a name." };
  if (fields.price.trim() === "" || !Number.isFinite(price) || price < 0) return { error: "Enter a valid price." };
  if (!Number.isInteger(duration) || duration < 1) return { error: "Duration must be a whole number, 1 or more." };
  if (data !== null && (!Number.isFinite(data) || data <= 0)) return { error: "Data limit must be more than 0, or left empty for unlimited." };

  const siteId = routers.find((r) => r.ip === agent.routerIp)?.siteId ?? null;
  return {
    input: {
      ...DEFAULT_FORM,
      name,
      price: String(price),
      durationValue: duration,
      durationUnit: fields.durationUnit,
      uploadMbps: QUICK_DEFAULT_SPEED_MBPS,
      downloadMbps: QUICK_DEFAULT_SPEED_MBPS,
      fupValue: data,
      fupUnit: "GB",
      routerIps: [agent.routerIp],
      applySiteId: siteId,
      applyToAllSites: false,
    },
  };
}

export function QuickCreatePackageModal({
  agent,
  routers,
  onClose,
  onCreate,
}: {
  agent: AgentProfile;
  routers: RouterInfo[];
  businessLocations?: BusinessLocation[];
  onClose: () => void;
  onCreate: (input: PackageInput) => void;
}) {
  const [name, setName] = useState("");
  const [price, setPrice] = useState("");
  const [durationValue, setDurationValue] = useState("1");
  const [durationUnit, setDurationUnit] = useState<PackageDurationUnit>("Days");
  const [dataGb, setDataGb] = useState("");
  const [error, setError] = useState<string | null>(null);

  function submit(event: FormEvent) {
    event.preventDefault();
    const result = buildQuickPackage(agent, routers, { name, price, durationValue, durationUnit, dataGb });
    if (result.error || !result.input) {
      setError(result.error ?? "Something is missing.");
      return;
    }
    onCreate(result.input);
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-[#1a1a1a] p-4" data-testid="quick-create-modal">
      <form onSubmit={submit} className="w-full max-w-md rounded-2xl bg-white p-6 shadow-xl">
        <div className="mb-4 flex items-start justify-between gap-3">
          <div>
            <h2 className="flex items-center gap-2 text-lg font-black text-[#1a1a1a]">
              <Zap size={18} className="text-[#1a1a1a]" />
              Quick Create Package
            </h2>
            <p className="mt-1 text-xs text-[#737373]">
              Just the basics. It&apos;s set up on your router automatically.
            </p>
          </div>
          <button type="button" onClick={onClose} aria-label="Close" className="text-[#a3a3a3] hover:text-[#525252]">
            <X size={18} />
          </button>
        </div>

        <div className="space-y-4">
          <label className="block">
            <span className="mb-1 block text-sm font-semibold text-[#525252]">Package name</span>
            <input
              data-testid="quick-name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Eg. 1 Day Unlimited"
              className={inputClass}
              autoFocus
            />
          </label>
          <label className="block">
            <span className="mb-1 block text-sm font-semibold text-[#525252]">Price ({sym()})</span>
            <input
              data-testid="quick-price"
              inputMode="decimal"
              value={price}
              onChange={(e) => setPrice(e.target.value)}
              placeholder="5"
              className={inputClass}
            />
          </label>
          <div className="grid grid-cols-2 gap-3">
            <label className="block">
              <span className="mb-1 block text-sm font-semibold text-[#525252]">Lasts</span>
              <input
                data-testid="quick-duration"
                inputMode="numeric"
                value={durationValue}
                onChange={(e) => setDurationValue(e.target.value)}
                className={inputClass}
              />
            </label>
            <label className="block">
              <span className="mb-1 block text-sm font-semibold text-[#525252]">Unit</span>
              <select
                data-testid="quick-unit"
                value={durationUnit}
                onChange={(e) => setDurationUnit(e.target.value as PackageDurationUnit)}
                className={inputClass}
              >
                {UNITS.map((u) => (
                  <option key={u} value={u}>
                    {u}
                  </option>
                ))}
              </select>
            </label>
          </div>
          <label className="block">
            <span className="mb-1 block text-sm font-semibold text-[#525252]">
              Data limit (GB) <span className="font-normal text-[#a3a3a3]">— optional, empty = unlimited</span>
            </span>
            <input
              data-testid="quick-data"
              inputMode="decimal"
              value={dataGb}
              onChange={(e) => setDataGb(e.target.value)}
              placeholder="Unlimited"
              className={inputClass}
            />
          </label>
        </div>

        <p className="mt-3 text-[11px] text-[#a3a3a3]">
          Speed is set to {QUICK_DEFAULT_SPEED_MBPS} Mbps and 1 device; you can adjust these later with Edit if you
          have permission, or use the full Create Package form for more options.
        </p>

        {error && (
          <p data-testid="quick-error" className="mt-3 text-sm font-semibold text-red-600">
            {error}
          </p>
        )}

        <div className="mt-5 flex justify-end gap-2">
          <button
            type="button"
            onClick={onClose}
            className="rounded-xl px-4 py-2.5 text-sm font-semibold text-[#525252] hover:bg-[#f7f7f7]"
          >
            Cancel
          </button>
          <button
            type="submit"
            data-testid="quick-submit"
            className="rounded-xl bg-[#1a1a1a] px-4 py-2.5 text-sm font-bold text-white hover:bg-[#111111]"
          >
            Create
          </button>
        </div>
      </form>
    </div>
  );
}
