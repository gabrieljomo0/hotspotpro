"use client";

// One permission as a plain on/off switch: Allowed or Not allowed.

export function PermissionSwitch({
  label,
  allowed,
  locked = false,
  onToggle,
  testId,
  strong = false,
}: {
  label: string;
  allowed: boolean;
  locked?: boolean;
  onToggle: () => void;
  testId?: string;
  strong?: boolean;
}) {
  return (
    <div className="flex items-center justify-between gap-3 py-2">
      <span className={`text-sm ${strong ? "font-bold text-[#0f172a]" : "text-[#475569]"}`}>
        {label}
        {locked && (
          <span className="ml-2 rounded bg-[#f1f5f9] px-1.5 py-0.5 text-[10px] font-bold uppercase text-[#94a3b8]">
            Default
          </span>
        )}
      </span>
      <button
        type="button"
        role="switch"
        aria-checked={allowed}
        aria-label={label}
        data-testid={testId}
        disabled={locked}
        onClick={onToggle}
        className="flex shrink-0 items-center gap-2 disabled:cursor-not-allowed disabled:opacity-60"
      >
        <span className={`w-20 text-right text-xs font-semibold ${allowed ? "text-emerald-700" : "text-[#94a3b8]"}`}>
          {allowed ? "Allowed" : "Not allowed"}
        </span>
        <span className={`relative h-5 w-9 rounded-full ${allowed ? "bg-emerald-600" : "bg-[#cbd5e1]"}`}>
          <span
            className={`absolute top-0.5 h-4 w-4 rounded-full bg-white shadow ${allowed ? "left-[18px]" : "left-0.5"}`}
          />
        </span>
      </button>
    </div>
  );
}
