"use client";

import { useRouter } from "next/navigation";
import { ArrowLeft } from "lucide-react";

export function BackLink({
  label = "Back",
  fallbackHref = "/dashboards",
}: {
  label?: string;
  fallbackHref?: string;
}) {
  const router = useRouter();

  function handleBack() {
    if (window.history.length > 1) {
      router.back();
    } else {
      router.push(fallbackHref);
    }
  }

  return (
    <button
      type="button"
      onClick={handleBack}
      className="mb-4 inline-flex items-center gap-2 rounded-xl border border-[#e6e6e6] bg-white px-4 py-2.5 text-sm font-semibold text-[#525252] hover:bg-[#ffffff]"
    >
      <ArrowLeft size={16} />
      {label}
    </button>
  );
}
