"use client";

import { MoreVertical, Package, Router, Search, Users } from "lucide-react";

import { liveUsers } from "./mockData";
import { statusClass } from "./statusClass";

export function LiveUsersTable() {
 return (
  <article className="overflow-hidden rounded-2xl border border-[#e2e8f0] bg-white shadow-[0_8px_24px_rgba(37,99,235,0.06)] ">
   <div className="flex flex-col gap-4 border-b border-[#e2e8f0] p-4 xl:flex-row xl:items-center">
    <div className="flex items-center gap-3">
     <h3 className="font-bold">
      Live Users (Now)
     </h3>

     <span className="rounded-md bg-emerald-100 px-2 py-1 text-xs font-semibold text-emerald-700">
      487 Online
     </span>
    </div>

    <div className="ml-auto flex w-full gap-3 xl:w-auto">
     <div className="relative flex-1 xl:w-[300px]">
      <Search
       size={16}
       className="absolute left-3 top-1/2 -translate-y-1/2 text-[#94a3b8]"
      />

      <input
       type="search"
       placeholder="Search by user, IP or MAC..."
       className="h-10 w-full rounded-lg border border-[#e2e8f0] pl-10 pr-4 text-sm outline-none focus:border-[#2563eb] "
      />
     </div>

     <button
      type="button"
      className="rounded-lg border border-[#e2e8f0] px-4 text-sm font-semibold "
     >
      Filters
     </button>
    </div>
   </div>

   <div className="overflow-x-auto">
    <table className="w-full min-w-[1050px] text-left text-xs">
     <thead className="bg-[#ffffff] text-[#64748b] ">
      <tr>
       <th className="px-4 py-3">
        User / Phone
       </th>
       <th className="px-4 py-3">
        IP Address
       </th>
       <th className="px-4 py-3">
        Router
       </th>
       <th className="px-4 py-3">
        Login Time
       </th>
       <th className="px-4 py-3">
        Duration
       </th>
       <th className="px-4 py-3">
        Data Used
       </th>
       <th className="px-4 py-3">
        Status
       </th>
       <th className="px-4 py-3">
        Package / Voucher
       </th>
       <th className="px-4 py-3">
        Action
       </th>
      </tr>
     </thead>

     <tbody>
      {liveUsers.map((user) => (
       <tr
        key={user.phone}
        className="border-t border-slate-100 hover:bg-[#f1f5f9] "
       >
        <td className="px-4 py-3 font-semibold">
         <span
          className={`mr-3 inline-block h-2 w-2 rounded-full ${
           user.status === "Online"
            ? "bg-emerald-500"
            : user.status === "Idle"
             ? "bg-blue-500"
             : user.status === "Expiring Soon"
              ? "bg-amber-500"
              : user.status === "Blocked"
               ? "bg-[#fff4f4]0"
               : "bg-slate-400"
          }`}
         />

         {user.phone}
        </td>

        <td className="px-4 py-3">
         {user.ip}
        </td>

        <td className="px-4 py-3">
         {user.router}
        </td>

        <td className="px-4 py-3">
         {user.login}
        </td>

        <td
         className={`px-4 py-3 ${
          user.status ===
          "Expiring Soon"
           ? "font-semibold text-amber-600"
           : ""
         }`}
        >
         {user.duration}
        </td>

        <td className="px-4 py-3">
         {user.data}
        </td>

        <td className="px-4 py-3">
         <span
          className={`rounded-md px-2 py-1 font-semibold ${statusClass(
           user.status,
          )}`}
         >
          {user.status}
         </span>
        </td>

        <td className="px-4 py-3">
         {user.package}
        </td>

        <td className="px-4 py-3">
         <div className="flex items-center gap-2">
          {user.status ===
          "Blocked" ? (
           <button
            type="button"
            className="rounded-md bg-blue-100 px-2 py-1 font-semibold text-[#2563eb]"
           >
            Unblock
           </button>
          ) : user.status ===
            "Disconnected" ||
           user.status ===
            "Expired" ? (
           <span>—</span>
          ) : (
           <button
            type="button"
            className="rounded-md bg-[#fff4f4] px-2 py-1 font-semibold text-[#dc2626]"
           >
            Disconnect
           </button>
          )}

          <button
           type="button"
           className="rounded-md border border-[#e2e8f0] p-1.5 "
          >
           <MoreVertical size={15} />
          </button>
         </div>
        </td>
       </tr>
      ))}
     </tbody>
    </table>
   </div>

   <div className="flex items-center justify-between border-t border-[#e2e8f0] px-4 py-3 text-xs ">
    <p className="text-[#64748b] ">
     Showing 1 to 6 of 487 users
    </p>

    <button
     type="button"
     className="font-semibold text-[#2563eb] dark:text-[#60a5fa]"
    >
     View all users →
    </button>
   </div>
  </article>
 );
}

