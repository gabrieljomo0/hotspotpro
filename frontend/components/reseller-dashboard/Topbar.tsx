"use client";

import { Bell, ChevronDown, Menu, Router, Search } from "lucide-react";

export function Topbar({
 onOpenSidebar,
}: {
 onOpenSidebar: () => void;
}) {
 return (
  <header className="sticky top-0 z-30 flex h-16 items-center border-b border-[#e2e8f0] bg-white/95 px-4 backdrop-blur ">
   <button
    type="button"
    onClick={onOpenSidebar}
    className="mr-3 rounded-lg p-2 hover:bg-[#f1f5f9] lg:hidden"
    aria-label="Open sidebar"
   >
    <Menu size={22} />
   </button>

   <div className="relative hidden w-full max-w-[330px] md:block">
    <Search
     size={17}
     className="absolute left-3 top-1/2 -translate-y-1/2 text-[#94a3b8]"
    />

    <input
     type="search"
     placeholder="Search anything..."
     className="h-10 w-full rounded-lg border border-[#e2e8f0] bg-[#ffffff] pl-10 pr-20 text-sm outline-none focus:border-[#2563eb] "
    />

    <span className="absolute right-2 top-1/2 -translate-y-1/2 rounded border border-[#e2e8f0] bg-white px-2 py-1 text-[10px] text-[#64748b] dark:border-slate-600 ">
     CTRL + K
    </span>
   </div>

   <div className="ml-auto flex items-center gap-3">
    <button
     type="button"
     className="hidden min-w-[190px] items-center gap-3 rounded-lg border border-[#e2e8f0] px-4 py-2 text-sm font-semibold md:flex"
    >
     <Router
      size={18}
      className="text-[#2563eb]"
     />

     <span className="flex-1 text-left">
      Main Branch
     </span>

     <ChevronDown size={15} />
    </button>

    <button
     type="button"
     className="relative rounded-lg p-2 hover:bg-[#f1f5f9] "
     aria-label="Notifications"
    >
     <Bell size={20} />

     <span className="absolute right-0 top-0 flex h-4 min-w-4 items-center justify-center rounded-full bg-[#fff4f4]0 px-1 text-[9px] font-bold text-white">
      5
     </span>
    </button>

    <button
     type="button"
     className="flex items-center gap-3 rounded-lg p-1.5 hover:bg-[#ffffff] "
    >
     <div className="flex h-9 w-9 items-center justify-center rounded-full bg-[#f1f5f9] font-bold text-[#0f172a]">
      EM
     </div>

     <div className="hidden text-left sm:block">
      <p className="text-sm font-semibold">
       Emm
      </p>

      <p className="text-xs text-[#64748b] ">
       Reseller
      </p>
     </div>

     <ChevronDown size={15} />
    </button>
   </div>
  </header>
 );
}
