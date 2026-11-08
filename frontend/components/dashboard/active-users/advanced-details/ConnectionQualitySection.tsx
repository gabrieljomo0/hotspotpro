import { SignalHigh } from "lucide-react";

export function ConnectionQualitySection({
  signalPct,
  latencyMs,
  packetLossPct,
  rating,
}: {
  signalPct: number;
  latencyMs: number;
  packetLossPct: number;
  rating: string;
}) {
  return (
    <div className="mb-6 rounded-xl border border-blue-200 bg-white p-5">
      <p className="mb-3 flex items-center gap-2 text-sm font-bold text-[#1a1a1a]">
        <SignalHigh size={18} className="text-[#1a1a1a]" />
        Connection Quality
      </p>
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        <div className="rounded-lg bg-[#ffffff] px-3 py-2.5">
          <p className="text-[11px] text-[#737373]">Signal Strength</p>
          <p className="text-sm font-bold text-[#1a1a1a]">{signalPct}%</p>
        </div>
        <div className="rounded-lg bg-[#ffffff] px-3 py-2.5">
          <p className="text-[11px] text-[#737373]">Latency</p>
          <p className="text-sm font-bold text-[#1a1a1a]">{latencyMs} ms</p>
        </div>
        <div className="rounded-lg bg-[#ffffff] px-3 py-2.5">
          <p className="text-[11px] text-[#737373]">Packet Loss</p>
          <p className="text-sm font-bold text-[#1a1a1a]">
            {packetLossPct}%
          </p>
        </div>
        <div className="rounded-lg bg-[#ffffff] px-3 py-2.5">
          <p className="text-[11px] text-[#737373]">Overall</p>
          <p
            className={`text-sm font-bold ${
              rating === "Excellent"
                ? "text-emerald-600"
                : rating === "Good"
                  ? "text-amber-600"
                  : "text-red-600"
            }`}
          >
            {rating}
          </p>
        </div>
      </div>
    </div>
  );
}
