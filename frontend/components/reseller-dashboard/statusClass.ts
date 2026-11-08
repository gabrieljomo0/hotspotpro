// Maps a live-user status string to its badge color classes.

export function statusClass(status: string) {
 if (status === "Online") {
  return "bg-[#e9fbf3] text-[#0f9f6e] ";
 }

 if (status === "Idle") {
  return "bg-[#f1f5f9] text-[#475569] dark:text-[#475569]";
 }

 if (status === "Expiring Soon") {
  return "bg-[#fff5e8] text-[#d97706] ";
 }

 if (status === "Blocked") {
  return "bg-[#fff0f0] text-[#dc2626] ";
 }

 return "bg-[#f1f5f9] text-[#64748b] ";
}

/* -------------------------------------------------------------------------- */
/*                 SIDEBAR                  */
/* -------------------------------------------------------------------------- */

