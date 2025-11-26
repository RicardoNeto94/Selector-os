"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import "../../styles/globals.css";

export default function DashboardLayout({ children }) {
  const [logoSmall, setLogoSmall] = useState(false);
  const [collapsed, setCollapsed] = useState(false);

  useEffect(() => {
    const timer = setTimeout(() => setLogoSmall(true), 350);
    return () => clearTimeout(timer);
  }, []);

  return (
    <div className="flex h-screen w-screen overflow-hidden bg-gray-50">

      {/* SIDEBAR */}
      <aside
        className={`
          relative
          ${collapsed ? "w-20" : "w-64"}
          bg-white/80 
          backdrop-blur-xl 
          border-r 
          px-4 
          py-8 
          flex 
          flex-col 
          justify-between 
          transition-all 
          duration-300
          z-40
        `}
      >
        {/* Collapse toggle */}
        <button
          onClick={() => setCollapsed(!collapsed)}
          className="
            absolute top-8 
            -right-3
            w-9 h-9 
            bg-white 
            shadow-lg 
            rounded-full 
            flex items-center justify-center 
            text-gray-600
            hover:bg-gray-100 
            transition-all
            z-50
          "
        >
          <span className="text-lg">{collapsed ? "›" : "‹"}</span>
        </button>

        {/* Nav */}
        <nav className="space-y-6">
          <div className="space-y-2">
            <SidebarItem href="/dashboard" collapsed={collapsed}>
              🏠
              {!collapsed && <span>Dashboard</span>}
            </SidebarItem>

            <SidebarItem href="/dashboard/menu" collapsed={collapsed}>
              🍽️
              {!collapsed && <span>Menus</span>}
            </SidebarItem>

            <SidebarItem href="/dashboard/dishes" collapsed={collapsed}>
              🥢
              {!collapsed && <span>Dishes</span>}
            </SidebarItem>

            <SidebarItem href="/dashboard/allergen" collapsed={collapsed}>
              ⚠️
              {!collapsed && <span>Allergen</span>}
            </SidebarItem>
          </div>

          <div className="pt-6 border-t space-y-2">
            <SidebarItem href="/dashboard/settings" collapsed={collapsed}>
              ⚙️
              {!collapsed && <span>Settings</span>}
            </SidebarItem>

            <SidebarItem href="/dashboard/billing" collapsed={collapsed}>
              💳
              {!collapsed && <span>Billing</span>}
            </SidebarItem>

            <SidebarItem href="/logout" collapsed={collapsed} danger>
              ⤫
              {!collapsed && <span>Log out</span>}
            </SidebarItem>
          </div>
        </nav>
      </aside>

      {/* MAIN AREA */}
      <div className="flex-1 flex flex-col">
        <header className="h-16 border-b flex items-center px-6 relative bg-white">
          <div
            className={`
              transition-all duration-500 font-bold
              ${logoSmall
                ? "text-xl text-green-600 absolute left-6"
                : "text-4xl mx-auto"}
            `}
          >
            Selector<span className="text-green-500">OS</span>
          </div>
        </header>

        <div className="border-b bg-white/60 backdrop-blur-md flex space-x-6 px-6 py-4 text-sm">
          <Tab href="/dashboard" label="Overview" />
          <Tab href="/dashboard/menu" label="Menu" />
          <Tab href="/dashboard/dishes" label="Dishes" />
          <Tab href="/dashboard/allergens" label="Allergens" />
          <Tab href="/dashboard/settings" label="Settings" />
        </div>

        <main className="flex-1 overflow-y-auto px-12 py-10 page-fade">
          {children}
        </main>
      </div>
    </div>
  );
}

/* Sidebar item */
function SidebarItem({ href, collapsed, danger, children }) {
  const pathname = usePathname();
  const active = pathname === href;

  return (
    <Link
      href={href}
      className={`
        flex items-center 
        ${collapsed ? "justify-center" : "justify-between"}
        group
        sidebar-item 
        text-sm
        rounded-xl
        px-3 py-2
        transition
        ${danger ? "text-red-500 hover:text-red-600" : "text-gray-700 hover:text-green-600"}
        ${active && !danger ? "sidebar-item-active" : ""}
      `}
    >
      <div className={`flex items-center gap-3 ${collapsed ? "justify-center" : ""}`}>
        <span className="text-xl">{children[0]}</span>
        {!collapsed && <span className="text-sm">{children[1]}</span>}
      </div>

      {!collapsed && !danger && (
        <span
          className="
            w-7 h-7 
            flex items-center justify-center
            rounded-full 
            bg-gray-100 
            text-gray-500 
            text-xs
            opacity-0 group-hover:opacity-100
            translate-x-1 group-hover:translate-x-0
            transition-all 
          "
        >
          ❯
        </span>
      )}
    </Link>
  );
}

/* Tabs */
function Tab({ href, label }) {
  const pathname = usePathname();
  const active = pathname === href;

  return (
    <Link
      href={href}
      className={`
        relative pb-2 transition 
        ${active ? "text-green-600 font-semibold" : "text-gray-600 hover:text-gray-900"}
      `}
    >
      {label}
      {active && <span className="absolute left-0 right-0 bottom-0 h-[2px] bg-green-500 rounded-full"></span>}
    </Link>
  );
}
