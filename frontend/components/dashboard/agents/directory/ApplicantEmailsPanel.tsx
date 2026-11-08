"use client";

import { useState } from "react";
import { ExternalLink, Mail } from "lucide-react";

import { useDashboard } from "../../context/DashboardContext";
import { gmailComposeUrl } from "../agentEmails";

// The emails written for applicants and agents (congratulations + sign-in
// details). No mail server is connected, so each one waits here until you
// send it — "Open in Gmail" opens Gmail with everything filled in.
export function ApplicantEmailsPanel() {
  const { agentEmails, markAgentEmailOpened, showToast } = useDashboard();
  const [open, setOpen] = useState<string | null>(null);
  const waiting = agentEmails.filter((email) => !email.openedAt).length;

  return (
    <article
      data-testid="applicant-emails"
      className="mt-5 overflow-hidden rounded-2xl border border-[#e2e8f0] bg-white shadow-[0_8px_24px_rgba(37,99,235,0.06)]"
    >
      <div className="flex flex-wrap items-center justify-between gap-2 border-b border-[#f1f5f9] px-5 py-4">
        <div className="flex items-center gap-2.5">
          <Mail size={17} className="text-[#2563eb]" />
          <h3 className="text-sm font-bold text-[#0f172a]">Emails to applicants</h3>
          <span className="rounded-full bg-amber-100 px-2 py-0.5 text-[11px] font-bold text-amber-700" data-testid="emails-waiting">
            {waiting} to send
          </span>
        </div>
        <p className="text-xs text-[#64748b]">
          Written for you when someone applies or is approved. Gmail isn&apos;t connected, so you send each one with a click.
        </p>
      </div>

      {agentEmails.length === 0 ? (
        <p className="px-5 py-6 text-sm text-[#94a3b8]" data-testid="emails-empty">
          No emails yet. When an applicant applies, or you approve an application, their congratulations email with
          sign-in details appears here.
        </p>
      ) : (
        <ul className="divide-y divide-[#f1f5f9]">
          {agentEmails.slice(0, 20).map((email) => (
            <li key={email.id} className="px-5 py-3.5" data-testid="email-row">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <div>
                  <p className="text-sm font-semibold text-[#0f172a]">{email.subject}</p>
                  <p className="text-xs text-[#64748b]">
                    To {email.to} · {email.createdAt}
                    {email.openedAt && <span className="ml-1 font-semibold text-emerald-700">· opened in Gmail {email.openedAt}</span>}
                  </p>
                </div>
                <div className="flex gap-2">
                  <button
                    type="button"
                    onClick={() => setOpen(open === email.id ? null : email.id)}
                    className="rounded-lg border border-[#e2e8f0] bg-white px-3 py-1.5 text-xs font-semibold text-[#475569] hover:bg-[#ffffff]"
                  >
                    {open === email.id ? "Hide" : "Preview"}
                  </button>
                  <a
                    href={gmailComposeUrl(email)}
                    target="_blank"
                    rel="noopener noreferrer"
                    data-testid="open-gmail"
                    onClick={() => {
                      markAgentEmailOpened(email.id);
                      showToast(`Gmail opened for ${email.agentName} — press Send there.`);
                    }}
                    className="inline-flex items-center gap-1.5 rounded-lg bg-[#2563eb] px-3 py-1.5 text-xs font-bold text-white hover:bg-[#1d4ed8]"
                  >
                    Open in Gmail <ExternalLink size={12} />
                  </a>
                </div>
              </div>
              {open === email.id && (
                <pre data-testid="email-body" className="mt-3 whitespace-pre-wrap rounded-xl bg-[#ffffff] p-4 font-sans text-xs leading-5 text-[#475569]">
                  {email.body}
                </pre>
              )}
            </li>
          ))}
        </ul>
      )}
    </article>
  );
}
