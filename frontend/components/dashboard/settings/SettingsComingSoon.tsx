export function SettingsComingSoon({ tabLabel }: { tabLabel: string }) {
  return (
    <div className="rounded-2xl border border-[#e6e6e6] bg-white p-10 text-center shadow-[0_8px_24px_rgba(26,26,26,0.06)]">
      <p className="text-lg font-bold text-[#1a1a1a]">{tabLabel} settings</p>
      <p className="mt-2 text-sm text-[#737373]">
        This section is coming soon. General Settings is fully configurable
        today.
      </p>
    </div>
  );
}
