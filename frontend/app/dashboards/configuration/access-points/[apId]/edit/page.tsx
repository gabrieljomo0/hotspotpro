"use client";

// Old address for editing an access point. It now shows the same pop-up over
// the access points list, so links and bookmarks keep working.

import { use } from "react";
import { useRouter } from "next/navigation";

import { EditAccessPointModal } from "@/components/dashboard/accesspoints/EditAccessPointModal";

export default function EditAccessPointRoute({ params }: { params: Promise<{ apId: string }> }) {
  const { apId } = use(params);
  const navigate = useRouter();
  return <EditAccessPointModal apId={apId} onClose={() => navigate.push("/dashboards/configuration/access-points")} />;
}
