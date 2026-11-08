"use client";

// Advanced details used to be a separate page. Everything is now on the one
// session page, so old links and bookmarks are sent there.

import { use, useEffect } from "react";
import { useRouter } from "next/navigation";

export default function AdvancedDetailsRedirect({
  params,
}: {
  params: Promise<{ userId: string }>;
}) {
  const { userId } = use(params);
  const router = useRouter();

  useEffect(() => {
    router.replace(`/dashboards/active-users/${userId}`);
  }, [router, userId]);

  return null;
}
