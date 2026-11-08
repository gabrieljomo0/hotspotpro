"use client";

// Shown only to the platform's super admin inside the normal dashboard:
//  - while "viewing as" a business: a blue bar saying whose data this is, with a way back;
//  - otherwise nothing (the way in to the platform area is the footer link on the landing page).

import { useEffect, useState } from "react";
import { Eye } from "lucide-react";

import { purgeLocalCache } from "@/components/dashboard/context/localCache";

type Me = { super?: boolean; viewing?: { id: string; name: string } | null };

export function SuperAdminBar() {
  const [me, setMe] = useState<Me | null>(null);

  useEffect(() => {
    fetch("/api/auth/me", { cache: "no-store" })
      .then((r) => (r.ok ? r.json() : null))
      .then((data) => setMe(data))
      .catch(() => undefined);
  }, []);

  async function exit() {
    try {
      await fetch("/api/super/view", { method: "DELETE" });
    } catch {
      // go back regardless
    }
    purgeLocalCache();
    window.location.assign("/super-admin");
  }

  if (!me?.super) return null;

  if (me.viewing) {
    return (
      <div className="sticky top-0 z-[60] flex flex-wrap items-center justify-center gap-3 bg-[#2563eb] px-4 py-2 text-sm font-semibold text-white">
        <span className="flex items-center gap-2"><Eye size={16} /> Super admin view: you are inside <strong>{me.viewing.name}</strong> with full access. Changes you make are saved to this business.</span>
        <button type="button" onClick={exit} className="rounded-md bg-white px-3 py-1 text-xs font-bold text-[#2563eb] hover:bg-[#f1f5f9]">
          Back to platform admin
        </button>
      </div>
    );
  }

  return null;
}
