// Given a status word like "Online" or "Blocked", this returns the matching
// Tailwind background/text color classes for a small badge. Used anywhere a
// user's connection status needs to be shown as a colored pill.
export function statusClass(status: string) {
  if (status === "Online") {
    return "bg-[#f4f4f4] text-[#1a1a1a] ";
  }

  if (status === "Idle") {
    return "bg-[#f4f4f4] text-[#525252] dark:text-[#333333]";
  }

  if (status === "Expiring Soon") {
    return "bg-[#f4f4f4] text-[#1a1a1a] ";
  }

  if (status === "Blocked") {
    return "bg-red-100 text-red-700";
  }

  if (status === "Paused") {
    return "bg-amber-100 text-amber-800";
  }

  if (status === "Disconnected") {
    return "bg-slate-100 text-slate-600";
  }

  // Covers "Expired" and anything else not listed above.
  return "bg-[#f4f4f4] text-[#1a1a1a] ";
}
