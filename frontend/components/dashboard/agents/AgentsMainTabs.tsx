"use client";

import { Users, ClipboardList } from "lucide-react";

export type AgentsMainTab = "all" | "applications";

export const AGENTS_MAIN_TABS: AgentsMainTab[] = ["all", "applications"];

// Reads a ?tab= value (from a link or bookmark) safely. Tabs that no longer
// exist (Create New Agent, Overview, Revenue, Agent Settings) land on All
// Agents, where their content now lives; "create" also opens the Add agent
// window, which is what it became. "messages" (SMS & Email) moved to Settings.
export function parseAgentsTab(value: string | null): AgentsMainTab {
  return AGENTS_MAIN_TABS.includes(value as AgentsMainTab) ? (value as AgentsMainTab) : "all";
}

// SMS & Email used to be a tab here; it is now under Settings.
export const SMS_EMAIL_PATH = "/dashboards/settings/sms-email";
export function wasMessagesTab(tabValue: string | null) {
  return tabValue === "messages";
}

export function opensAddAgent(tabValue: string | null, addValue: string | null) {
  return tabValue === "create" || addValue === "1";
}

export function AgentsMainTabs({
  active,
  onChange,
  applicationsCount,
}: {
  active: AgentsMainTab;
  onChange: (tab: AgentsMainTab) => void;
  applicationsCount: number;
}) {
  const tabs: Array<{ key: AgentsMainTab; label: string; icon: typeof Users }> = [
    { key: "all", label: "All Agents", icon: Users },
    { key: "applications", label: "Agent Applications", icon: ClipboardList },
  ];

  return (
    <nav className="mb-6 flex flex-wrap gap-2 border-b border-[#f4f4f4] pb-4">
      {tabs.map((tab) => {
        const Icon = tab.icon;
        const isActive = active === tab.key;

        return (
          <button
            type="button"
            key={tab.key}
            onClick={() => onChange(tab.key)}
            className={`inline-flex items-center gap-1.5 rounded-lg px-3 py-2 text-sm font-semibold transition ${
              isActive
                ? "bg-[#f4f4f4] text-[#1a1a1a]"
                : "text-[#737373] hover:bg-[#ffffff] hover:text-[#525252]"
            }`}
          >
            <Icon size={15} />
            {tab.label}
            {tab.key === "applications" && applicationsCount > 0 && (
              <span className="rounded-full bg-amber-500 px-1.5 py-0.5 text-[10px] font-bold text-white">
                {applicationsCount}
              </span>
            )}
          </button>
        );
      })}
    </nav>
  );
}
