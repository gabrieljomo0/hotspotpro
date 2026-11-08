"use client";

// Old address for editing a user. It now shows the same pop-up over the users
// list, so links and bookmarks keep working.

import { use } from "react";
import { useRouter } from "next/navigation";

import { EditSystemUserModal } from "@/components/dashboard/settings/EditSystemUserModal";

export default function EditSystemUserRoute({ params }: { params: Promise<{ userId: string }> }) {
  const { userId } = use(params);
  const navigate = useRouter();
  return <EditSystemUserModal userId={userId} onClose={() => navigate.push("/dashboards/settings/users")} />;
}
