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
    return "bg-[#f3f1ec] text-[#1a1a1a] ";
  }

  // Covers "Disconnected", "Expired", and anything else not listed above.
  return "bg-[#f4f4f4] text-[#1a1a1a] ";
}
