import Link from "next/link";
import { ArrowLeft } from "lucide-react";

export function ComingSoonCard({
  title,
  description,
  backHref,
  backLabel = "Back",
}: {
  title: string;
  description: string;
  backHref?: string;
  backLabel?: string;
}) {
  return (
    <div>
      {backHref && (
        <Link
          href={backHref}
          className="mb-5 inline-flex items-center gap-2 rounded-xl border border-[#e6e6e6] bg-white px-4 py-2.5 text-sm font-semibold text-[#525252] hover:bg-[#ffffff]"
        >
          <ArrowLeft size={16} />
          {backLabel}
        </Link>
      )}

      <div className="rounded-2xl border border-[#e6e6e6] bg-white p-10 text-center shadow-[0_8px_24px_rgba(26,26,26,0.06)]">
        <p className="text-lg font-bold text-[#1a1a1a]">{title}</p>
        <p className="mx-auto mt-2 max-w-md text-sm text-[#737373]">
          {description}
        </p>
      </div>
    </div>
  );
}
