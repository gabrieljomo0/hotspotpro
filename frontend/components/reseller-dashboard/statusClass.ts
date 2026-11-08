// Maps a live-user status string to its badge color classes.

export function statusClass(status: string) {
 if (status === "Online") {
  return "bg-[#f3f1ec] text-[#1a1a1a] ";
 }

 if (status === "Idle") {
  return "bg-[#f4f4f4] text-[#525252] dark:text-[#525252]";
 }

 if (status === "Expiring Soon") {
  return "bg-[#f3f1ec] text-[#1a1a1a] ";
 }

 if (status === "Blocked") {
  return "bg-[#f3f1ec] text-[#1a1a1a] ";
 }

 return "bg-[#f4f4f4] text-[#737373] ";
}

/* -------------------------------------------------------------------------- */
/*                 SIDEBAR                  */
/* -------------------------------------------------------------------------- */

