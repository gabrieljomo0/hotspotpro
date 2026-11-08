"use client";

// This router's Internet Users tab: a simple list of every customer
// currently connected, linking through to their full details page.
import { Users } from "lucide-react";

export function InternetUsersTab({ names }: { names: string[] }) {
  return (
    <article className="rounded-2xl border border-[#d4d4d4] bg-white p-5 shadow-[0_8px_24px_rgba(26,26,26,0.06)]">
      <p className="mb-3 flex items-center gap-2 text-sm font-bold text-[#1a1a1a]">
        <Users size={16} className="text-[#1a1a1a]" />
        Connected Users ({names.length})
      </p>
      {names.length === 0 ? (
        <p className="text-sm text-[#a3a3a3]">No one is signed in on this router. The list updates about every 30 seconds.</p>
      ) : (
        <div className="space-y-2">
          {names.map((name) => (
            <div key={name} className="flex items-center justify-between rounded-lg bg-[#ffffff] px-4 py-2.5 text-sm">
              <span className="font-semibold text-[#1a1a1a]">{name}</span>
              <span className="text-xs text-[#737373]">On the router</span>
            </div>
          ))}
        </div>
      )}
    </article>
  );
}
