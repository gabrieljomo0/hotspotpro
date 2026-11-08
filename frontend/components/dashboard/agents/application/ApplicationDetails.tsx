"use client";

// Everything an applicant entered on the captive-portal form, laid out for an
// admin to check: who they are, how to reach them, their ID and selfie (as
// pictures you can enlarge), and a checklist of what looks right and what
// needs a second look.

import { useState } from "react";
import { CheckCircle2, Circle, XCircle } from "lucide-react";

import type { AgentProfile } from "../../shared/types";
import { reviewApplication, type ApplicationFiles } from "./applicationReview";

function Field({ label, value, mono }: { label: string; value: string | null | undefined; mono?: boolean }) {
  return (
    <div>
      <dt className="text-xs text-[#a3a3a3]">{label}</dt>
      <dd className={`text-sm font-semibold text-[#1a1a1a] ${mono ? "font-mono" : ""}`}>
        {value && value.trim() !== "" ? value : <span className="font-normal text-[#a3a3a3]">Not provided</span>}
      </dd>
    </div>
  );
}

function Photo({
  label,
  fileName,
  image,
  onZoom,
}: {
  label: string;
  fileName: string | null;
  image?: string;
  onZoom: (src: string, label: string) => void;
}) {
  return (
    <figure className="rounded-xl border border-[#f4f4f4] p-3" data-testid={`photo-${label.toLowerCase().replace(/[^a-z]+/g, "-")}`}>
      <figcaption className="mb-2 text-xs font-semibold text-[#525252]">{label}</figcaption>
      {image ? (
        <button
          type="button"
          onClick={() => onZoom(image, label)}
          className="block w-full overflow-hidden rounded-lg border border-[#e6e6e6]"
          aria-label={`Enlarge ${label}`}
        >
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={image} alt={label} className="h-36 w-full object-cover" />
        </button>
      ) : fileName ? (
        <div className="flex h-36 flex-col items-center justify-center rounded-lg bg-[#f7f7f7] px-3 text-center">
          <p className="text-xs font-semibold text-amber-700">Picture not available</p>
          <p className="mt-1 break-all text-[11px] text-[#a3a3a3]">Only the file name was kept: {fileName}</p>
        </div>
      ) : (
        <div className="flex h-36 items-center justify-center rounded-lg bg-red-50 text-xs font-semibold text-red-700">
          Not submitted
        </div>
      )}
    </figure>
  );
}

export function ApplicationDetails({
  agent,
  everyone,
  files,
  appliedFrom,
}: {
  agent: AgentProfile;
  everyone: AgentProfile[];
  files?: ApplicationFiles;
  // The router/site name they applied from, if known.
  appliedFrom?: string | null;
}) {
  const [zoom, setZoom] = useState<{ src: string; label: string } | null>(null);
  const review = reviewApplication(agent, everyone);

  return (
    <div className="space-y-5" data-testid="application-details">
      <section className="rounded-xl border border-[#e6e6e6] bg-white">
        <div className="border-b border-[#f4f4f4] bg-[#ffffff] px-5 py-3">
          <p className="text-sm font-bold text-[#1a1a1a]">Personal & contact details</p>
        </div>
        <dl className="grid gap-4 p-5 sm:grid-cols-2">
          <Field label="Full name" value={agent.name} />
          <Field label="Username (chosen by the applicant)" value={agent.username} mono />
          <Field label="Email" value={agent.email} />
          <Field label="Phone" value={agent.phone} />
          <Field label="WhatsApp" value={agent.whatsapp} />
          <Field label="Location or area" value={agent.location} />
        </dl>
      </section>

      <section className="rounded-xl border border-[#e6e6e6] bg-white">
        <div className="border-b border-[#f4f4f4] bg-[#ffffff] px-5 py-3">
          <p className="text-sm font-bold text-[#1a1a1a]">Identity — compare the face to the ID</p>
        </div>
        <div className="grid gap-3 p-5 sm:grid-cols-3">
          <Photo label="ID card — front" fileName={agent.idFrontFileName} image={files?.idFront} onZoom={(src, label) => setZoom({ src, label })} />
          <Photo label="ID card — back" fileName={agent.idBackFileName} image={files?.idBack} onZoom={(src, label) => setZoom({ src, label })} />
          <Photo label="Selfie" fileName={agent.faceCaptureFileName} image={files?.face} onZoom={(src, label) => setZoom({ src, label })} />
        </div>
      </section>

      <section className="rounded-xl border border-[#e6e6e6] bg-white">
        <div className="border-b border-[#f4f4f4] bg-[#ffffff] px-5 py-3">
          <p className="text-sm font-bold text-[#1a1a1a]">Application</p>
        </div>
        <dl className="grid gap-4 p-5 sm:grid-cols-2">
          <Field label="Applied on" value={agent.createdAt} />
          <Field label="Applied through" value={agent.appliedViaPortal ? "The captive portal sign-up form" : "Added by an admin"} />
          <Field label="Applied from" value={appliedFrom ?? undefined} />
          <Field label="Agent code" value={agent.agentCode} mono />
          <Field label="Password" value="Chosen by the applicant — hidden" />
        </dl>
      </section>

      <section className="rounded-xl border border-[#e6e6e6] bg-white" data-testid="verification-checklist">
        <div className="flex items-center justify-between border-b border-[#f4f4f4] bg-[#ffffff] px-5 py-3">
          <p className="text-sm font-bold text-[#1a1a1a]">Verification checklist</p>
          <span
            data-testid="checks-summary"
            className={`rounded-full px-3 py-1 text-xs font-bold ${
              review.passed === review.total ? "bg-emerald-100 text-emerald-700" : "bg-amber-100 text-amber-700"
            }`}
          >
            {review.passed} of {review.total} checks passed
          </span>
        </div>
        <ul className="divide-y divide-[#f4f4f4]">
          {review.checks.map((check) => (
            <li key={check.key} data-testid={`check-${check.key}`} data-ok={check.ok} className="flex items-start gap-3 px-5 py-2.5 text-sm">
              {check.ok ? (
                <CheckCircle2 size={16} className="mt-0.5 shrink-0 text-emerald-600" />
              ) : (
                <XCircle size={16} className="mt-0.5 shrink-0 text-red-500" />
              )}
              <div>
                <p className={check.ok ? "text-[#525252]" : "font-semibold text-[#1a1a1a]"}>{check.label}</p>
                {!check.ok && <p className="text-xs text-red-600">{check.note}</p>}
              </div>
            </li>
          ))}
        </ul>
        <p className="flex items-center gap-2 border-t border-[#f4f4f4] px-5 py-3 text-xs text-[#a3a3a3]">
          <Circle size={10} />
          The checklist is a guide. Looking at the ID and selfie yourself is still the real check.
        </p>
      </section>

      {zoom && (
        <div
          role="dialog"
          aria-label={`${zoom.label} enlarged`}
          className="fixed inset-0 z-[90] flex items-center justify-center bg-black/80 p-6"
          onClick={() => setZoom(null)}
        >
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={zoom.src} alt={zoom.label} className="max-h-full max-w-full rounded-lg" />
          <button
            type="button"
            aria-label="Close picture"
            className="absolute right-5 top-5 rounded-full bg-white px-3 py-1.5 text-sm font-semibold text-[#1a1a1a]"
            onClick={() => setZoom(null)}
          >
            Close
          </button>
        </div>
      )}
    </div>
  );
}
