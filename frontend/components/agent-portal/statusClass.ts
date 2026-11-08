// Given a status word like "Online" or "Blocked", this returns the matching
// Tailwind background/text color classes for a small badge. Used anywhere a
// user's connection status needs to be shown as a colored pill.
export function statusClass(status: string) {
  if (status === "Online") {
    return "bg-[#f1f5f9] text-[#2563eb] ";
  }

  if (status === "Idle") {
    return "bg-[#f1f5f9] text-[#475569] dark:text-[#334155]";
  }

  if (status === "Expiring Soon") {
    return "bg-[#f1f5f9] text-[#2563eb] ";
  }

  if (status === "Blocked") {
    return "bg-[#fef2f2] text-[#b91c1c] ";
  }

  // Covers "Disconnected", "Expired", and anything else not listed above.
  return "bg-[#f1f5f9] text-[#2563eb] ";
}
