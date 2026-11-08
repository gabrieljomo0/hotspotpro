"use client";

import { sym } from "@/components/dashboard/shared/currency";
import { Banknote, Menu, Wifi, LogOut } from "lucide-react";

import { navigation } from "./mockData";

export function Sidebar({
 mobileOpen,
 desktopCollapsed,
 onClose,
 onToggleDesktop,
}: {
 mobileOpen: boolean;
 desktopCollapsed: boolean;
 onClose: () => void;
 onToggleDesktop: () => void;
}) {
 return (
  <>
   {mobileOpen && (
    <button
     type="button"
     onClick={onClose}
     className="fixed inset-0 z-40 bg-slate-950/60 lg:hidden"
     aria-label="Close sidebar overlay"
    />
   )}

   <aside
    className={`fixed inset-y-0 left-0 z-50 flex w-[228px] flex-col overflow-y-auto border-r border-[#cbd5e1] bg-[#f1f5f9] text-[#0f172a] transition-all duration-300 lg:sticky lg:top-0 lg:h-screen ${
     mobileOpen ? "translate-x-0" : "-translate-x-full"
    } ${
     desktopCollapsed ? "lg:w-[84px]" : "lg:w-[228px]"
    } lg:translate-x-0`}
   >
    <div
     className={`flex min-h-20 shrink-0 items-center px-4 ${
      desktopCollapsed
       ? "lg:justify-center lg:px-2"
       : "justify-between"
     }`}
    >
     {!desktopCollapsed && (
      <div className="flex min-w-0 items-center gap-3">
       <Wifi
        className="h-10 w-10 shrink-0 text-[#2563eb]"
        strokeWidth={3}
       />

       <div className="min-w-0 overflow-hidden whitespace-nowrap">
        <p className="truncate text-xl font-bold">
         Hotspot<span className="text-[#2563eb]">Pro</span>
        </p>

        <p className="text-xs text-[#64748b]">
         Billing System
        </p>
       </div>
      </div>
     )}

     <button
      type="button"
      onClick={() => {
       if (window.innerWidth < 1024) {
        onClose();
       } else {
        onToggleDesktop();
       }
      }}
      className={`flex shrink-0 items-center justify-center bg-transparent p-0 text-[#475569] transition hover:text-[#2563eb] focus:outline-none ${
       desktopCollapsed ? "h-11 w-11" : "h-10 w-10"
      }`}
      aria-label={
       desktopCollapsed ? "Show sidebar" : "Hide sidebar"
      }
      title={
       desktopCollapsed ? "Show sidebar" : "Hide sidebar"
      }
     >
      <Menu
       size={desktopCollapsed ? 28 : 25}
       strokeWidth={2.4}
      />
     </button>
    </div>



    <nav
     className={`flex-1 px-3 py-5 transition-all duration-300 ${
      desktopCollapsed ? "lg:px-2" : ""
     }`}
    >
     {navigation.map((group) => (
      <section
       key={group.heading}
       className="mb-6"
      >
       <p
        className={`mb-2 overflow-hidden whitespace-nowrap px-2 text-[11px] font-semibold uppercase tracking-widest text-[#94a3b8] transition-all duration-300 ${
         desktopCollapsed
          ? "lg:h-0 lg:mb-0 lg:opacity-0"
          : ""
        }`}
       >
        {group.heading}
       </p>

       <div className="space-y-1">
        {group.items.map((item) => {
         const Icon = item.icon;

         return (
          <button
           type="button"
           key={item.label}
           title={
            desktopCollapsed
             ? item.label
             : undefined
           }
           className={`flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-left text-sm transition ${
            item.active
             ? "bg-white font-semibold text-[#2563eb] shadow-sm ring-1 ring-[#cbd5e1]"
             : "text-[#475569] hover:bg-[#f1f5f9] hover:text-[#0f172a]"
           } ${
            desktopCollapsed
             ? "lg:justify-center lg:px-2"
             : ""
           }`}
          >
           <Icon
            size={18}
            className="shrink-0"
           />

           <span
            className={`overflow-hidden whitespace-nowrap transition-all duration-300 ${
             desktopCollapsed
              ? "lg:w-0 lg:opacity-0"
              : "lg:w-auto lg:opacity-100"
            }`}
           >
            {item.label}
           </span>
          </button>
         );
        })}
       </div>
      </section>
     ))}

     <section className="border-t border-[#cbd5e1] pt-5">
      {desktopCollapsed ? (
       <button
        type="button"
        title={`Wallet Balance: ${sym()} 1,245.50`}
        className="hidden w-full items-center justify-center rounded-xl border border-[#cbd5e1] p-3 text-[#2563eb] transition hover:bg-[#f1f5f9] lg:flex"
       >
        <Banknote size={22} />
       </button>
      ) : null}

      <div
       className={`rounded-xl border border-[#cbd5e1] p-4 ${
        desktopCollapsed
         ? "lg:hidden"
         : ""
       }`}
      >
       <div className="flex items-center gap-2 text-sm font-semibold">
        <Banknote
         size={18}
         className="text-[#2563eb]"
        />
        Wallet Balance
       </div>

       <p className="mt-4 text-2xl font-black text-[#059669]">
        {sym()} 1,245.50
       </p>

       <button
        type="button"
        className="mt-4 w-full rounded-lg bg-[#2563eb] px-4 py-3 text-sm font-bold text-white transition hover:bg-[#1d4ed8]"
       >
        Fund Wallet
       </button>
      </div>
     </section>

     <button
      type="button"
      title={
       desktopCollapsed
        ? "Logout"
        : undefined
      }
      className={`mt-6 flex w-full items-center gap-3 border-t border-[#cbd5e1] px-3 pt-6 text-left text-sm font-semibold text-red-400 ${
       desktopCollapsed
        ? "lg:justify-center lg:px-2"
        : ""
      }`}
     >
      <LogOut
       size={18}
       className="shrink-0"
      />

      <span
       className={`overflow-hidden whitespace-nowrap transition-all duration-300 ${
        desktopCollapsed
         ? "lg:w-0 lg:opacity-0"
         : "lg:w-auto lg:opacity-100"
       }`}
      >
       Logout
      </span>
     </button>
    </nav>
   </aside>
  </>
 );
}
