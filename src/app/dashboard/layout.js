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
        `}
      >
        {/* Collapse toggle */}
        <button
          onClick={() => setCollapsed(!collapsed)}
          className="
            absolute -right-4 top-8 
            w-8 h-8 
            bg-white 
            shadow-md 
            rounded-full 
            flex items-center justify-center 
            hover:bg-gray-100 
            transition
          "
        >
          {collapsed ? "›" : "‹"}
        </button>

        {/* Main nav */}
        <nav className="space-y-6">
          <div className="space-y-2">
            <SidebarItem href="/dashboard" collapsed={collapsed}>
              <span className="text-lg">🏠</span>
              {!collapsed && <span>Dashboard</span>}
            </SidebarItem>

            <SidebarItem href="/dashboard/menu" collapsed={collapsed}>
              <span>🍽️</span>
              {!collapsed && <span>Menus</span>}
            </SidebarItem>

            <SidebarItem href="/dashboard/dishes" collapsed={collapsed}>
              <span>🥢</span>
              {!collapsed && <span>Dishes</span>}
            </SidebarItem>

            <SidebarItem href="/dashboard/allergens" collapsed={collapsed}>
              <span>⚠️</span>
              {!collapsed && <span>Allergens</span>}
            </SidebarItem>
          </div>

          <div className="pt-6 border-t space-y-2">
            <SidebarItem href="/dashboard/settings" collapsed={collapsed}>
              <span>⚙️</span>
              {!collapsed && <span>Settings</span>}
            </SidebarItem>

            <SidebarItem href="/dashboard/billing" collapsed={collapsed}>
              <span>💳</span>
              {!collapsed && <span>Billing</span>}
            </SidebarItem>

            <SidebarItem href="/logout" collapsed={collapsed} danger>
              <span>⤫</span>
              {!collapsed && <span>Log out</span>}
            </SidebarItem>
          </div>
        </nav>
      </aside>

      {/* MAIN AREA */}
      <div className="flex-1 flex flex-col">

        {/* Top bar */}
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

        {/* Horizontal tabs */}
        <div className="border-b bg-white/60 backdrop-blur-md flex space-x-6 px-6 py-4 text-sm">
          <Tab href="/dashboard" label="Overview" />
          <Tab href="/dashboard/menu" label="Menu" />
          <Tab href="/dashboard/dishes" label="Dishes" />
          <Tab href="/dashboard/allergens" label="Allergens" />
          <Tab href="/dashboard/settings" label="Settings" />
        </div>

        {/* Page content */}
        <main className="flex-1 overflow-y-auto px-12 py-10 page-fade">
          {children}
        </main>
      </div>
    </div>
  );
}

/* Sidebar item with active highlight */
function SidebarItem({ href, collapsed, danger, children }) {
  const pathname = usePathname();
  const active = pathname === href;

  return (
    <Link
      href={href}
      className={`
        sidebar-item flex items-center gap-3 text-sm
        ${danger ? "text-red-500 hover:text-red-600" : "text-gray-700 hover:text-green-600"}
        ${active && !danger ? "sidebar-item-active" : ""}
        ${collapsed ? "justify-center" : ""}
      `}
    >
      {children}
    </Link>
  );
}

/* Top tabs using current pathname */
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
      {active && (
        <span className="absolute left-0 right-0 bottom-0 h-[2px] bg-green-500 rounded-full"></span>
      )}
    </Link>
  );
}
