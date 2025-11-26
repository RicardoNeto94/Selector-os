"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import "../globals.css";

export default function DashboardLayout({ children }) {
  const [logoSmall, setLogoSmall] = useState(false);
  const pathname = usePathname();

  useEffect(() => {
    const timer = setTimeout(() => setLogoSmall(true), 300);
    return () => clearTimeout(timer);
  }, []);

  // Utility for active link highlighting
  const isActive = (href) => pathname.startsWith(href);

  return (
    <div className="flex h-screen overflow-hidden bg-gray-50">

      {/* SIDEBAR */}
      <aside className="w-64 bg-white border-r shadow-sm flex flex-col px-6 py-8 space-y-8">

        {/* Logo (static inside sidebar) */}
        <div className="text-2xl font-bold">
          <span className="text-black">Selector</span>
          <span className="text-green-500">OS</span>
        </div>

        {/* Navigation */}
        <nav className="flex flex-col space-y-1 text-gray-700">

          <SidebarLink href="/dashboard" active={isActive("/dashboard")}>
            Dashboard
          </SidebarLink>

          <SidebarLink href="/dashboard/menu" active={isActive("/dashboard/menu")}>
            Menus
          </SidebarLink>

          <SidebarLink href="/dashboard/dishes" active={isActive("/dashboard/dishes")}>
            Dishes
          </SidebarLink>

          <SidebarLink href="/dashboard/allergens" active={isActive("/dashboard/allergens")}>
            Allergens
          </SidebarLink>

          <div className="border-t pt-3 mt-4" />

          <SidebarLink href="/dashboard/settings" active={isActive("/dashboard/settings")}>
            Settings
          </SidebarLink>

          <SidebarLink href="/dashboard/billing" active={isActive("/dashboard/billing")}>
            Billing
          </SidebarLink>

          <SidebarLink href="/logout" active={false} danger>
            Log out
          </SidebarLink>

        </nav>
      </aside>

      {/* MAIN */}
      <div className="flex-1 flex flex-col">

        {/* TOP BAR WITH ANIMATED LOGO */}
        <header className="h-16 border-b bg-white flex items-center px-6 relative overflow-hidden">

          <div
            className={`transition-all duration-700 font-bold fixed ${
              logoSmall
                ? "text-xl top-4 left-72 opacity-100"
                : "text-5xl inset-0 flex items-center justify-center opacity-100"
            }`}
            style={{ pointerEvents: "none" }}
          >
            Selector<span className="text-green-500">OS</span>
          </div>
        </header>

        {/* HORIZONTAL NAV */}
        <div className="border-b flex space-x-6 overflow-x-auto px-6 py-3 bg-white text-sm sticky top-16 z-10 shadow-sm">

          <TopTab href="/dashboard" active={isActive("/dashboard")}>
            Overview
          </TopTab>
          <TopTab href="/dashboard/menu" active={isActive("/dashboard/menu")}>
            Menu
          </TopTab>
          <TopTab href="/dashboard/dishes" active={isActive("/dashboard/dishes")}>
            Dishes
          </TopTab>
          <TopTab href="/dashboard/allergens" active={isActive("/dashboard/allergens")}>
            Allergens
          </TopTab>
          <TopTab href="/dashboard/settings" active={isActive("/dashboard/settings")}>
            Settings
          </TopTab>

        </div>

        {/* CONTENT */}
        <main className="flex-1 overflow-y-auto px-10 py-8">
          {children}
        </main>
      </div>
    </div>
  );
}

/* ----------------- COMPONENTS ------------------ */

function SidebarLink({ href, active, children, danger }) {
  return (
    <Link
      href={href}
      className={`
        px-3 py-2 rounded-md text-sm transition-all
        ${active ? "bg-green-100 text-green-700 font-medium" : "hover:bg-gray-100"}
        ${danger ? "text-red-500 hover:bg-red-50" : ""}
      `}
    >
      {children}
    </Link>
  );
}

function TopTab({ href, active, children }) {
  return (
    <Link
      href={href}
      className={`
        pb-2 border-b-2 transition-all
        ${active ? "border-green-500 text-green-600 font-medium" : "border-transparent text-gray-600 hover:text-black"}
      `}
    >
      {children}
    </Link>
  );
}
