"use client";

// Private notes about an agent. Only you and your team see these.

import { useEffect, useState } from "react";
import { ChevronDown } from "lucide-react";

const MAX = 1000;

export function AgentNotesCard({ notes, onSave }: { notes: string; onSave: (notes: string) => void }) {
  const [open, setOpen] = useState(true);
  const [draft, setDraft] = useState(notes);

  // Follow the saved value when it changes elsewhere.
  useEffect(() => {
    setDraft(notes);
  }, [notes]);

  const dirty = draft.trim() !== notes.trim();
  const tooLong = draft.length > MAX;

  return (
    <article className="overflow-hidden rounded-2xl border border-[#e2e8f0] bg-white" data-testid="agent-notes">
      <button
        type="button"
        onClick={() => setOpen((current) => !current)}
        aria-expanded={open}
        className="flex w-full items-center justify-between px-5 py-4 text-left"
      >
        <span className="text-base font-bold text-[#0f172a]">Notes</span>
        <ChevronDown size={18} className={`text-[#94a3b8] transition ${open ? "rotate-180" : ""}`} />
      </button>
      {open && (
        <div className="border-t border-[#f1f5f9] px-5 py-4">
          <label className="block">
            <span className="mb-1.5 block text-sm font-semibold text-[#475569]">Notes</span>
            <textarea
              rows={4}
              value={draft}
              onChange={(event) => setDraft(event.target.value)}
              placeholder="Additional notes about this agent…"
              aria-label="Agent notes"
              className="w-full rounded-xl border border-[#e2e8f0] bg-white px-3.5 py-2.5 text-sm outline-none focus:border-[#2563eb]"
            />
          </label>
          <div className="mt-1 flex items-center justify-between text-xs">
            <span className={tooLong ? "font-semibold text-red-600" : "text-[#94a3b8]"}>
              {draft.length} / {MAX} · only your team sees this, never the agent
            </span>
          </div>
          <div className="mt-3 flex gap-3">
            <button
              type="button"
              disabled={!dirty || tooLong}
              onClick={() => onSave(draft.trim())}
              className="rounded-xl bg-[#2563eb] px-6 py-2.5 text-sm font-bold text-white hover:bg-[#1d4ed8] disabled:cursor-not-allowed disabled:opacity-50"
            >
              Save changes
            </button>
            <button
              type="button"
              disabled={!dirty}
              onClick={() => setDraft(notes)}
              className="rounded-xl border border-[#e2e8f0] bg-white px-5 py-2.5 text-sm font-semibold text-[#475569] hover:bg-[#ffffff] disabled:opacity-50"
            >
              Cancel
            </button>
          </div>
        </div>
      )}
    </article>
  );
}
