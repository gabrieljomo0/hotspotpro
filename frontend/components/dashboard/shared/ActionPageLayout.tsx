"use client";

import { useRouter } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import type { ReactNode } from "react";

function BackButton({
  backHref,
  backLabel,
}: {
  backHref: string;
  backLabel: string;
}) {
  const router = useRouter();

  function handleBack() {
    if (window.history.length > 1) {
      router.back();
    } else {
      router.push(backHref);
    }
  }

  return (
    <button
      type="button"
      onClick={handleBack}
      className="mb-5 inline-flex items-center gap-2 rounded-xl border border-[#e6e6e6] bg-white px-4 py-2.5 text-sm font-semibold text-[#525252] hover:bg-[#ffffff] print:hidden"
    >
      <ArrowLeft size={16} />
      {backLabel}
    </button>
  );
}

export function ActionPageLayout({
  eyebrow,
  title,
  subtitle,
  backHref = "/dashboards",
  backLabel = "Back",
  wide = false,
  children,
}: {
  eyebrow: string;
  title: string;
  subtitle?: string;
  backHref?: string;
  backLabel?: string;
  wide?: boolean;
  children: ReactNode;
}) {
  return (
    <div className={`mx-auto w-full ${wide ? "max-w-5xl" : "max-w-2xl"}`}>
      <BackButton backHref={backHref} backLabel={backLabel} />

      <section className="rounded-2xl border border-[#e6e6e6] bg-white p-6 shadow-[0_8px_24px_rgba(26,26,26,0.06)] md:p-8">
        <p className="text-xs font-bold uppercase tracking-[0.14em] text-[#1a1a1a]">
          {eyebrow}
        </p>
        <h1 className="mt-2 text-2xl font-black text-[#1a1a1a]">{title}</h1>
        {subtitle && <p className="mt-2 text-sm text-[#737373]">{subtitle}</p>}

        <div className="mt-6">{children}</div>
      </section>
    </div>
  );
}

export function NotFoundCard({
  message = "This item may have been deleted or the link is out of date.",
  backHref = "/dashboards",
}: {
  message?: string;
  backHref?: string;
}) {
  return (
    <div className="mx-auto w-full max-w-2xl">
      <BackButton backHref={backHref} backLabel="Back" />

      <section className="rounded-2xl border border-[#e6e6e6] bg-white p-8 text-center shadow-sm">
        <p className="text-lg font-bold text-[#1a1a1a]">Not found</p>
        <p className="mt-2 text-sm text-[#737373]">{message}</p>
      </section>
    </div>
  );
}
