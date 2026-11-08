import { Radio, FlaskConical } from "lucide-react";

export function DataSourceBadge({ live = false }: { live?: boolean }) {
  if (live) {
    return (
      <span className="inline-flex items-center gap-1 rounded-full bg-emerald-100 px-2 py-0.5 text-[10px] font-bold text-emerald-700">
        <Radio size={10} />
        Live
      </span>
    );
  }

  return (
    <span className="inline-flex items-center gap-1 rounded-full bg-slate-100 px-2 py-0.5 text-[10px] font-bold text-slate-500">
      <FlaskConical size={10} />
      Simulated
    </span>
  );
}
