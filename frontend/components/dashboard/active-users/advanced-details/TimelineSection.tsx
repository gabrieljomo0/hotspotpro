import type { TimelineSegment } from "./helpers";

export function TimelineSection({
  segments,
}: {
  segments: TimelineSegment[];
}) {
  return (
    <div id="timeline" className="mb-6 rounded-xl border border-emerald-200 bg-white p-5 scroll-mt-20">
      <p className="mb-3 text-sm font-bold text-[#0f172a]">
        Today&apos;s Online / Offline Timeline
      </p>

      <div className="flex justify-between text-[11px] text-[#94a3b8]">
        <span>{segments[0]?.startLabel}</span>
        <span>{segments[segments.length - 1]?.endLabel}</span>
      </div>

      <div className="mt-1.5 flex h-6 w-full overflow-hidden rounded-full">
        {segments.map((segment, index) => (
          <div
            key={`${segment.startMinute}-${index}`}
            className="group relative h-full"
            style={{
              flexGrow:
                segment.status === "Offline"
                  ? Math.max(3, segment.endMinute - segment.startMinute)
                  : segment.endMinute - segment.startMinute,
              flexBasis: 0,
            }}
          >
            <div
              className={`h-full w-full ${
                segment.status === "Online" ? "bg-emerald-500" : "bg-red-500"
              } ${index > 0 ? "border-l border-white/50" : ""}`}
            />

            <div className="pointer-events-none absolute bottom-full left-1/2 z-10 mb-2 hidden w-max max-w-[180px] -translate-x-1/2 rounded-lg border border-[#e2e8f0] bg-white px-3 py-2 text-xs shadow-lg group-hover:block">
              <p className="font-bold text-[#0f172a]">
                {segment.startLabel} – {segment.endLabel}
              </p>
              <p
                className={
                  segment.status === "Online"
                    ? "text-emerald-600"
                    : "text-red-600"
                }
              >
                {segment.status} · {segment.durationLabel}
              </p>
              {segment.status === "Online" && (
                <p className="text-[#64748b]">
                  Data used: {segment.dataMb} MB
                </p>
              )}
            </div>
          </div>
        ))}
      </div>

      <div className="mt-3 flex gap-4 text-xs">
        <span className="inline-flex items-center gap-1.5 text-[#475569]">
          <span className="h-2.5 w-2.5 rounded-full bg-emerald-500" />
          Online
        </span>
        <span className="inline-flex items-center gap-1.5 text-[#475569]">
          <span className="h-2.5 w-2.5 rounded-full bg-red-500" />
          Offline (even brief drops of a few seconds show up)
        </span>
        <span className="ml-auto text-[#94a3b8]">
          Hover any point on the line for the exact time
        </span>
      </div>
    </div>
  );
}
