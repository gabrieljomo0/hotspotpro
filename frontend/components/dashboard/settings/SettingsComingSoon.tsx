export function SettingsComingSoon({ tabLabel }: { tabLabel: string }) {
  return (
    <div className="rounded-2xl border border-[#e2e8f0] bg-white p-10 text-center shadow-[0_8px_24px_rgba(37,99,235,0.06)]">
      <p className="text-lg font-bold text-[#0f172a]">{tabLabel} settings</p>
      <p className="mt-2 text-sm text-[#64748b]">
        This section is coming soon. General Settings is fully configurable
        today.
      </p>
    </div>
  );
}
