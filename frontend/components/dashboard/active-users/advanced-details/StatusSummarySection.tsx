import { Wifi, Clock3, WifiOff } from "lucide-react";

import { minutesToLabel } from "./helpers";

const COLOR_MAP = {
  online: { bg: "#10b98120", fg: "#10b981", border: "border-emerald-200", cardBg: "bg-emerald-50", Icon: Wifi },
  idle: { bg: "#2563eb20", fg: "#2563eb", border: "border-blue-200", cardBg: "bg-blue-50", Icon: Clock3 },
  offline: { bg: "#94a3b820", fg: "#94a3b8", border: "border-slate-200", cardBg: "bg-slate-50", Icon: WifiOff },
};

export function StatusSummarySection({
  summary,
}: {
  summary: Array<{
    label: string;
    minutes: number;
    colorKey: "online" | "idle" | "offline";
  }>;
}) {
  return (
    <div id="status" className="mb-6 scroll-mt-20">
      <p className="mb-3 text-sm font-bold text-[#0f172a]">
        How this user spent their time today
      </p>
      <div className="grid gap-3 sm:grid-cols-3">
        {summary.map((entry) => {
          const { bg, fg, Icon, border, cardBg } = COLOR_MAP[entry.colorKey];
          return (
            <div
              key={entry.label}
              className={`flex items-center gap-3 rounded-xl border ${border} ${cardBg} p-4`}
            >
              <div
                className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full"
                style={{ backgroundColor: bg, color: fg }}
              >
                <Icon size={18} />
              </div>
              <div>
                <p className="text-sm font-bold text-[#0f172a]">
                  {entry.label}
                </p>
                <p className="text-xs text-[#64748b]">
                  {minutesToLabel(entry.minutes)} today
                </p>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
