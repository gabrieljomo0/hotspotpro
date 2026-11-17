"use client";

/** Apply / Save bar that only shows while the form has unsaved changes. */
export function DirtyApplyBar({
  dirty,
  applying,
  disabled,
  onApply,
  applyLabel = "Apply",
  saveLabel = "Save",
  hint = "Apply pushes these settings to the router so they take effect.",
  testId = "dirty-apply-bar",
}: {
  dirty: boolean;
  applying?: boolean;
  disabled?: boolean;
  onApply: () => void | Promise<void>;
  applyLabel?: string;
  saveLabel?: string;
  hint?: string;
  testId?: string;
}) {
  if (!dirty) return null;
  return (
    <div
      data-testid={testId}
      className="sticky bottom-3 z-20 flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-[#1a1a1a] bg-white p-4 shadow-[0_12px_40px_rgba(26,26,26,0.14)]"
    >
      <p className="text-sm text-[#525252]">{hint}</p>
      <div className="flex flex-wrap gap-2">
        <button
          type="button"
          data-testid={`${testId}-apply`}
          disabled={disabled || applying}
          onClick={() => void onApply()}
          className="rounded-xl bg-[#1a1a1a] px-5 py-2.5 text-sm font-bold text-white hover:bg-[#111111] disabled:cursor-not-allowed disabled:opacity-50"
        >
          {applying ? "Applying…" : applyLabel}
        </button>
        <button
          type="button"
          data-testid={`${testId}-save`}
          disabled={disabled || applying}
          onClick={() => void onApply()}
          className="rounded-xl border border-[#1a1a1a] bg-white px-5 py-2.5 text-sm font-bold text-[#1a1a1a] hover:bg-[#f4f4f4] disabled:cursor-not-allowed disabled:opacity-50"
        >
          {saveLabel}
        </button>
      </div>
    </div>
  );
}
